import Phaser from "phaser";
import { createTapChimpLevel, SeededTapChimpGenerator } from "@/modules/games/tap-chimp";
import type { LevelDefinition } from "@/modules/games/core/game.types";
import { GameBridge, GameOptions, RunEndReason, RunResult, touchInput } from "../types";
import { sound } from "@/lib/sound";

const VIEW_W = 1280;
const VIEW_H = 720;
const GROUND_Y = 550;
const CHOP_RANGE = 145;
const BLOCK_DIST = 110;
const PLAYER_HEIGHT = 195;
const TREE_HEIGHT = 440;
const STUMP_HEIGHT = 150;

interface Tree {
  sprite: Phaser.GameObjects.Image;
  x: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

interface Candle {
  sprite: Phaser.GameObjects.Image;
  kind: "green" | "red";
  baseY: number;
  phase: number;
  taken: boolean;
  /** Colorblind-safe glyph text object (▲/✓ or 🔷 for green, ▼/✗ or 🟠 for red) */
  glyph: Phaser.GameObjects.Text | null;
}

interface Obstacle {
  sprite: Phaser.GameObjects.Image;
  kind: "mop" | "rat" | "branch" | "bear";
  x: number;
  y: number;
  speed: number;
  hit: boolean;
}

interface Chasm {
  x1: number;
  x2: number;
  cleared: boolean;
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  private opts!: GameOptions;
  private bridge!: GameBridge;
  private level!: LevelDefinition;
  private rng!: SeededTapChimpGenerator;
  private player!: Phaser.GameObjects.Image;
  private facing: 1 | -1 = 1;
  private state: "idle" | "walk" | "chop" | "hit" | "over" = "idle";
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;

  // Platformer Physics Constants
  private readonly COYOTE_TIME_MS = 100;
  private readonly JUMP_BUFFER_MS = 120;
  private readonly JUMP_VELOCITY = -760;
  private readonly MIN_JUMP_VELOCITY = -260; // Damped velocity for low hops
  private readonly GRAVITY = 1750;

  // Dynamic Physics State
  private playerVy: number = 0;
  private isGrounded: boolean = true;
  private lastGroundedTime = 0;
  private lastJumpPressedTime = 0;
  private wasJumpDown = false;
  private isJumping = false;
  private isFallingInChasm = false;
  private chasmRespawnModal: Phaser.GameObjects.Container | null = null;
  private hitStopUntil = 0;
  private invulnerableUntil = 0;
  private layers: { tile: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private trees: Tree[] = [];
  private candles: Candle[] = [];
  private obstacles: Obstacle[] = [];
  private chasms: Chasm[] = [];
  private nextTreeX = 1000;
  private nextCandleAt = 0;
  private lastChopAt = 0;
  private chopFrame: 1 | 2 = 1;
  private hitUntil = 0;
  private startedAt = 0;
  private timeLeftMs = 0;
  private ended = false;
  private score = 0;
  private totalTreeCount = 0;
  private levelTreeCount = 0;
  private greenCount = 0;
  private redHits = 0;
  private comboCount = 0;
  private comboResetTimer: Phaser.Time.TimerEvent | null = null;
  private isAdvancingLevel = false;
  private showHitStop = true;
  private showParticles = true;
  private showFloatText = true;
  private lastScoreChange = 0;
  private prefersReducedMotion = false;

  constructor() { super("game"); }

  init(data: { opts: GameOptions; bridge: GameBridge }) {
    this.opts = data.opts;
    this.bridge = data.bridge;
    const startLevel = data.opts.initialLevel || 1;
    this.level = createTapChimpLevel(startLevel, data.opts);
    this.rng = new SeededTapChimpGenerator(`${this.level.seed}:${Date.now()}`);
    this.ended = false;
    this.score = 0;
    this.totalTreeCount = 0;
    this.levelTreeCount = 0;
    this.greenCount = 0;
    this.redHits = 0;
    this.comboCount = 0;
    this.layers = [];
    this.trees = [];
    this.candles = [];
    this.obstacles = [];
    this.chasms = [];
    this.invulnerableUntil = 0;
    this.nextTreeX = 1000;
    this.nextCandleAt = 1600;
    this.lastChopAt = 0;
    // Respect prefers-reduced-motion
    this.prefersReducedMotion = !!this.opts.prefersReducedMotion;
    this.showHitStop = !this.opts.prefersReducedMotion;
    this.showParticles = !this.opts.prefersReducedMotion;
    this.showFloatText = !this.opts.prefersReducedMotion;
    this.lastGroundedTime = 0;
    this.lastJumpPressedTime = 0;
    this.wasJumpDown = false;
    this.isJumping = false;
    this.hitStopUntil = 0;
    this.playerVy = 0;
    this.isGrounded = true;
    this.facing = 1;
    this.state = "idle";
    this.hitUntil = 0;
  }

  create() {
    this.add.graphics()
      .setScrollFactor(0)
      .setDepth(-12)
      .fillGradientStyle(0x5ba4e7, 0x5ba4e7, 0xe7f3fb, 0xe7f3fb, 1, 1, 1, 1)
      .fillRect(0, 0, VIEW_W, VIEW_H);

    const addLayer = (key: string, factor: number, y = 0) => {
      const tile = this.add.tileSprite(0, y, VIEW_W, VIEW_H, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-10 + factor);
      tile.setTileScale(1, 1);
      this.layers.push({ tile, factor });
    };

    addLayer("bg-sky", 0, 0);
    addLayer("bg-far", 0.25, 0);
    addLayer("bg-mid", 0.5, 0);
    addLayer("bg-ground", 1, 0);
    addLayer("bg-front", 1.35, 0);

    this.cameras.main.setBounds(-240, 0, 1_000_000, VIEW_H);

    this.player = this.add.image(300, GROUND_Y, "ape-idle").setOrigin(0.5, 1).setDepth(7);
    this.setApeTexture("ape-idle");
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09, -150, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyUp = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);

    // Pre-spawn immediate chasm and obstacles in clearings along the road
    this.spawnChasm(620);
    this.spawnObstacle(920);
    this.spawnObstacle(1450);

    this.startedAt = this.time.now;
    this.timeLeftMs = this.level.maxDurationSec * 1000;
    this.reportHud();
    this.bridge.onReady();

    // Start procedural 8-bit retro arcade BGM
    sound.startBgm();
  }

  private fitHeight(sprite: Phaser.GameObjects.Image, targetHeight: number) {
    if (!sprite.height) return;
    sprite.setScale(targetHeight / sprite.height);
  }

  private spawnTree(x: number) {
    const sprite = this.add.image(x, GROUND_Y + 2, "tree-1").setOrigin(0.5, 1).setDepth(5);
    this.fitHeight(sprite, TREE_HEIGHT);
    this.trees.push({ sprite, x, hp: this.level.treeHp, maxHp: this.level.treeHp, alive: true });
  }

  private spawnCandle(x: number) {
    const kind = this.rng.nextCandleKind(this.level);
    // Red candles spawn closer to ground level so jumping over them is clean and rewarding
    const rawHeight = kind === "red" ? this.rng.int(40, 75) : this.rng.int(60, 125);
    const y = GROUND_Y - rawHeight;
    const sprite = this.add.image(x, y, kind === "green" ? "candle-green" : "candle-red").setDepth(8).setScale(0.45);
    
    // Colorblind mode tint
    if (this.opts.colorblindMode) {
      sprite.setTint(kind === "green" ? 0x38bdf8 : 0xf97316);
    }

    // Phase 1.3: Accessible glyphs inside candle body
    const glyphText = kind === "green" ? "▲" : "▼";
    const glyphColor = this.opts.colorblindMode
      ? (kind === "green" ? "#38bdf8" : "#f97316")
      : (kind === "green" ? "#22c55e" : "#ef4444");

    const glyph = this.add.text(x, y + 2, glyphText, {
      fontFamily: "Arial Black, Arial",
      fontSize: "15px",
      color: glyphColor,
      stroke: "#050907",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);

    // Synchronize candle sprite and glyph bounce
    this.tweens.add({ targets: [sprite, glyph], y: y - 6, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    
    this.candles.push({ sprite, kind, baseY: y, phase: this.rng.nextCandlePhase(), taken: false, glyph });
  }

  /** Colorblind-safe glyph: ▲ for green points, ▼ for red penalty */
  private candleGlyph(kind: "green" | "red"): string {
    if (this.opts.colorblindMode) {
      return kind === "green" ? "🔷" : "🟠";
    }
    return kind === "green" ? "▲" : "▼";
  }

  private spawnChasm(x: number) {
    const width = 180;
    const x1 = x;
    const x2 = x + width;

    // Graphics at depth 3.5 (under player/trees, but blends naturally with ground strata)
    const g = this.add.graphics().setDepth(3.5);

    // 1. Deep Cavern Abyss Void (deep gradient darkness)
    g.fillGradientStyle(0x180f08, 0x180f08, 0x020406, 0x020406, 1, 1, 1, 1);
    g.fillRect(x1 + 4, GROUND_Y - 6, width - 8, 190);

    // 2. Left Jagged Canyon Cliff Wall (earth strata, rocky cliff slope inward)
    g.fillStyle(0x3d2716, 1); // Dark rich topsoil
    g.beginPath();
    g.moveTo(x1 - 8, GROUND_Y - 8);
    g.lineTo(x1 + 12, GROUND_Y - 8);
    g.lineTo(x1 + 8, GROUND_Y + 30);
    g.lineTo(x1 + 18, GROUND_Y + 70);
    g.lineTo(x1 + 12, GROUND_Y + 120);
    g.lineTo(x1 + 6, GROUND_Y + 180);
    g.lineTo(x1 - 10, GROUND_Y + 180);
    g.closePath();
    g.fillPath();

    // Rocky highlight strata on left cliff
    g.fillStyle(0x5a3a20, 1);
    g.beginPath();
    g.moveTo(x1 - 4, GROUND_Y - 6);
    g.lineTo(x1 + 8, GROUND_Y - 6);
    g.lineTo(x1 + 4, GROUND_Y + 25);
    g.lineTo(x1 + 12, GROUND_Y + 55);
    g.lineTo(x1 + 6, GROUND_Y + 90);
    g.lineTo(x1 - 2, GROUND_Y + 90);
    g.closePath();
    g.fillPath();

    // Grass edge hanging over left ledge
    g.fillStyle(0x3e8a2a, 1);
    g.fillRect(x1 - 12, GROUND_Y - 10, 22, 6);
    g.fillStyle(0x2d681c, 1);
    g.fillRect(x1 - 4, GROUND_Y - 4, 10, 8); // Hanging roots

    // 3. Right Jagged Canyon Cliff Wall
    g.fillStyle(0x3d2716, 1);
    g.beginPath();
    g.moveTo(x2 + 8, GROUND_Y - 8);
    g.lineTo(x2 - 12, GROUND_Y - 8);
    g.lineTo(x2 - 8, GROUND_Y + 30);
    g.lineTo(x2 - 16, GROUND_Y + 75);
    g.lineTo(x2 - 10, GROUND_Y + 125);
    g.lineTo(x2 - 6, GROUND_Y + 180);
    g.lineTo(x2 + 10, GROUND_Y + 180);
    g.closePath();
    g.fillPath();

    // Rocky highlight on right cliff
    g.fillStyle(0x5a3a20, 1);
    g.beginPath();
    g.moveTo(x2 + 4, GROUND_Y - 6);
    g.lineTo(x2 - 8, GROUND_Y - 6);
    g.lineTo(x2 - 4, GROUND_Y + 25);
    g.lineTo(x2 - 10, GROUND_Y + 60);
    g.lineTo(x2 - 5, GROUND_Y + 95);
    g.lineTo(x2 + 2, GROUND_Y + 95);
    g.closePath();
    g.fillPath();

    // Grass edge hanging over right ledge
    g.fillStyle(0x3e8a2a, 1);
    g.fillRect(x2 - 10, GROUND_Y - 10, 22, 6);
    g.fillStyle(0x2d681c, 1);
    g.fillRect(x2 - 6, GROUND_Y - 4, 10, 8); // Hanging roots

    // 4. Magma Hazard Underglow at Pit Floor
    g.fillStyle(0xff2200, 0.35);
    g.fillRect(x1 + 18, GROUND_Y + 110, width - 36, 60);
    g.fillStyle(0xff8800, 0.2);
    g.fillRect(x1 + 28, GROUND_Y + 130, width - 56, 40);

    // 5. Pit Spikes & Jagged Stalagmites
    g.fillStyle(0x1a120b, 1);
    for (let sx = x1 + 25; sx < x2 - 25; sx += 24) {
      g.beginPath();
      g.moveTo(sx, GROUND_Y + 175);
      g.lineTo(sx + 12, GROUND_Y + 125);
      g.lineTo(sx + 24, GROUND_Y + 175);
      g.closePath();
      g.fillPath();
    }

    // 6. Hazard Warning Barricade Posts with Diagonal Stripes on turf edge
    // Left post
    g.fillStyle(0x4a2e18, 1);
    g.fillRect(x1 - 18, GROUND_Y - 32, 6, 24);
    // Right post
    g.fillRect(x2 + 12, GROUND_Y - 32, 6, 24);

    // Hazard crossbeams
    g.fillStyle(0xffd000, 0.9);
    g.fillRect(x1 - 22, GROUND_Y - 28, 14, 6);
    g.fillStyle(0x06090c, 0.9);
    g.fillRect(x1 - 18, GROUND_Y - 28, 4, 6);

    g.fillStyle(0xffd000, 0.9);
    g.fillRect(x2 + 8, GROUND_Y - 28, 14, 6);
    g.fillStyle(0x06090c, 0.9);
    g.fillRect(x2 + 12, GROUND_Y - 28, 4, 6);

    // Floating cyber hazard indicator
    const label = this.add.text(x1 + width / 2, GROUND_Y - 34, "⚠ DANGER ⚠", {
      fontFamily: "Arial Black, Arial",
      fontSize: "12px",
      color: "#ffd000",
      stroke: "#06090c",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);

    this.tweens.add({
      targets: label,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.chasms.push({ x1, x2, cleared: false, graphics: g, label });
  }

  private startChasmFall(chasm: Chasm, time: number) {
    if (this.isFallingInChasm) return;
    this.isFallingInChasm = true;
    this.state = "hit";
    this.isGrounded = false;
    this.playerVy = 260; // Accelerate downward
    this.invulnerableUntil = time + 10000; // Protect while in modal

    sound.playHit();
    this.cameras.main.shake(250, 0.015);
    this.redHits += 1;
    this.score = Math.max(0, this.score - 25);
    this.comboCount = 0;
    this.reportHud();

    if (this.showFloatText) {
      this.floatText(this.player.x, GROUND_Y - 60, "FELL INTO CHASM! 💀 -25", "#ef4444");
    }

    // Tumble rotation into abyss
    this.setApeTexture("ape-hit");
    this.tweens.killTweensOf(this.player);
    this.tweens.add({
      targets: this.player,
      angle: 180,
      duration: 480,
      ease: "Cubic.easeIn",
      onComplete: () => {
        if (this.showParticles) {
          this.burst(this.player.x, GROUND_Y + 110, "p-dust", 8, 140);
        }
        this.showChasmRespawnModal(chasm.x1 - 50);
      },
    });
  }

  private showChasmRespawnModal(respawnX: number) {
    if (this.chasmRespawnModal || this.ended) return;

    const modalX = this.player.x;
    const modalY = GROUND_Y - 140;

    const container = this.add.container(modalX, modalY).setDepth(20);

    // Modal Background Panel with Cyber Border
    const bg = this.add.graphics();
    bg.fillStyle(0x06090c, 0.94);
    bg.fillRoundedRect(-170, -75, 340, 150, 16);
    bg.lineStyle(2, 0xff3b30, 0.9);
    bg.strokeRoundedRect(-170, -75, 340, 150, 16);
    bg.lineStyle(1, 0xffd000, 0.4);
    bg.strokeRoundedRect(-166, -71, 332, 142, 12);
    container.add(bg);

    // Warning Header
    const title = this.add.text(0, -50, "⚠ FELL INTO CHASM! ⚠", {
      fontFamily: "Arial Black, Impact, sans-serif",
      fontSize: "17px",
      color: "#ff3b30",
    }).setOrigin(0.5);
    container.add(title);

    // Penalty & Hint
    const sub = this.add.text(0, -24, "-25 PTS · LEAP OVER WITH [SPACE] / [▲]", {
      fontFamily: "Rubik, Arial, sans-serif",
      fontSize: "11px",
      color: "#9DA8B3",
      fontStyle: "bold",
    }).setOrigin(0.5);
    container.add(sub);

    // Respawn Button Background
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffd000, 1);
    btnBg.fillRoundedRect(-110, 4, 220, 38, 10);
    container.add(btnBg);

    // Respawn Button Text
    let secondsLeft = 3;
    const btnText = this.add.text(0, 23, `↺ RESPAWN (${secondsLeft}s)`, {
      fontFamily: "Arial Black, Impact, sans-serif",
      fontSize: "13px",
      color: "#06090c",
    }).setOrigin(0.5);
    container.add(btnText);

    // Interactive Button Hit Area
    const hitArea = this.add.zone(0, 23, 220, 38).setOrigin(0.5).setInteractive({ cursor: "pointer" });
    container.add(hitArea);

    const doRespawn = () => {
      if (!this.chasmRespawnModal) return;
      this.respawnFromChasm(respawnX);
    };

    hitArea.on("pointerdown", doRespawn);

    // Also support keyboard trigger (Space / Up / W / Enter)
    const keyHandler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") {
        window.removeEventListener("keydown", keyHandler);
        doRespawn();
      }
    };
    window.addEventListener("keydown", keyHandler);

    // Auto-countdown timer (3 seconds)
    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          btnText.setText(`↺ RESPAWN (${secondsLeft}s)`);
        } else {
          window.removeEventListener("keydown", keyHandler);
          doRespawn();
        }
      },
    });

    // Pop-in bounce tween
    container.setScale(0.85);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: "Back.easeOut",
    });

    this.chasmRespawnModal = container;
  }

  private respawnFromChasm(respawnX: number) {
    if (this.chasmRespawnModal) {
      this.chasmRespawnModal.destroy();
      this.chasmRespawnModal = null;
    }

    sound.playJump();
    this.isFallingInChasm = false;
    this.player.setAngle(0);
    this.player.x = respawnX;
    this.player.y = GROUND_Y;
    this.playerVy = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.state = "idle";
    this.setApeTexture("ape-idle");
    this.invulnerableUntil = this.time.now + 1800;

    if (this.showParticles) {
      this.burst(respawnX, GROUND_Y - 5, "p-spark", 8, 120);
      this.burst(respawnX, GROUND_Y - 5, "p-dust", 6, 90);
    }

    // Flashing gold invulnerability aura
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.player.setAlpha(1);
      },
    });
  }

  private handleChasmFall(chasm: Chasm, time: number) {
    this.startChasmFall(chasm, time);
  }

  private spawnObstacle(targetX: number) {
    let x = targetX;
    const SAFE_TREE_CLEARANCE = 220;

    // Precision avoidance: Never spawn on or immediately near any living tree trunk
    for (let i = 0; i < 5; i++) {
      const nearTree = this.trees.find((t) => t.alive && Math.abs(t.x - x) < SAFE_TREE_CLEARANCE);
      if (nearTree) {
        x = nearTree.x + SAFE_TREE_CLEARANCE + 40;
      } else {
        break;
      }
    }

    // Never spawn inside a chasm
    const nearChasm = this.chasms.find((c) => x >= c.x1 - 60 && x <= c.x2 + 60);
    if (nearChasm) {
      x = nearChasm.x2 + 90;
    }

    // Never stack on top of another obstacle
    const nearObs = this.obstacles.find((o) => Math.abs(o.x - x) < 160);
    if (nearObs) {
      x = nearObs.x + 180;
    }

    const roll = this.rng.next();
    const kind: Obstacle["kind"] = roll < 0.28 ? "rat" : roll < 0.52 ? "bear" : roll < 0.78 ? "mop" : "branch";
    const key = `obstacle-${kind}`;
    
    // Realistic scale hierarchy: Bear (210px towering beast), Ape (195px), Mop (88px), Branch (68px), Rat (34px small floor critter)
    const targetHeight = kind === "branch" ? 68 : kind === "bear" ? 210 : kind === "mop" ? 88 : 34;
    const actualY = kind === "branch" ? GROUND_Y - 8 : kind === "bear" ? GROUND_Y + 4 : GROUND_Y;

    const sprite = this.add.image(x, actualY, key).setDepth(8).setOrigin(0.5, 1);
    this.fitHeight(sprite, targetHeight);

    if (kind === "branch") {
      sprite.setAngle(this.rng.int(-12, 12));
      this.tweens.add({ targets: sprite, y: actualY - 6, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (kind === "mop") {
      sprite.setAngle(this.rng.int(-8, 8));
      this.tweens.add({ targets: sprite, angle: sprite.angle + (sprite.angle > 0 ? -5 : 5), duration: 800, yoyo: true, repeat: -1 });
    } else if (kind === "rat") {
      // Rat scurrying motion along grass
      this.tweens.add({ targets: sprite, y: actualY - 3, duration: 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (kind === "bear") {
      // Massive Bear prowl motion
      this.tweens.add({ targets: sprite, y: actualY - 6, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    const speed = kind === "rat" ? this.rng.int(40, 70) : kind === "bear" ? this.rng.int(45, 65) : 0;
    this.obstacles.push({ sprite, kind, x, y: actualY, speed, hit: false });
  }

  private targetTree(): Tree | null {
    let best: Tree | null = null;
    let bestD = CHOP_RANGE;
    for (const tree of this.trees) {
      if (!tree.alive) continue;
      const d = Math.abs(tree.x - this.player.x);
      if (d < bestD) { best = tree; bestD = d; }
    }
    return best;
  }

  private treeTextureFor(tree: Tree) {
    const pct = tree.hp / tree.maxHp;
    if (pct > 0.8) return "tree-1";
    if (pct > 0.6) return "tree-2";
    if (pct > 0.4) return "tree-3";
    return "tree-4";
  }

  private setTreeTexture(tree: Tree, key: string, height = TREE_HEIGHT) {
    tree.sprite.setTexture(key);
    this.fitHeight(tree.sprite, height);
  }

  private chop(tree: Tree, now: number) {
    this.lastChopAt = now;
    this.chopFrame = this.chopFrame === 1 ? 2 : 1;
    this.setApeTexture(`ape-chop${this.chopFrame}`);
    this.facing = tree.x >= this.player.x ? 1 : -1;
    this.player.setFlipX(this.facing === -1);

    // Audio cue
    sound.playChop();

    // Screen micro-recoil on chop
    if (!this.prefersReducedMotion) {
      this.cameras.main.shake(45, 0.0022);
    }

    tree.hp -= 1;
    this.tweens.add({
      targets: tree.sprite,
      x: tree.x + (this.facing === 1 ? 6 : -6),
      duration: 40,
      yoyo: true,
      repeat: 1,
      onComplete: () => tree.sprite.setX(tree.x),
    });
    this.burst(tree.x + (this.player.x < tree.x ? -26 : 26), GROUND_Y - 82, "p-chip", 7, 200);
    this.burst(tree.x + (this.player.x < tree.x ? -28 : 28), GROUND_Y - 95, "p-spark", 2, 80);

    if (tree.hp <= 0) {
      tree.alive = false;
      this.setTreeTexture(tree, "tree-5", STUMP_HEIGHT);
      tree.sprite.setY(GROUND_Y + 2);
      this.levelTreeCount += 1;
      this.totalTreeCount += 1;
      const delta = this.opts.pointsPerTree;
      this.lastScoreChange = delta;
      this.score += delta;

      const isLevelClearing = this.levelTreeCount >= this.level.targetTrees;

      if (isLevelClearing) {
        // Dramatic hit-stop on level-clearing tree:
        // Real kinematic freeze: hitStopUntil = now + 150 (pauses motion and timers at top of update())
        this.hitStopUntil = now + 150;

        if (!this.prefersReducedMotion) {
          // Heavy cinematic screen shake
          this.cameras.main.shake(280, 0.012);
          // Solana Bull Green flash (#00FFA3)
          this.cameras.main.flash(180, 0, 255, 163);
        }

        // Celebratory particle explosion (quad burst: p-chip, p-leaf, p-dust, p-spark)
        if (this.showParticles) {
          this.burst(tree.x, GROUND_Y - 55, "p-chip", 24, 420);
          this.burst(tree.x, GROUND_Y - 130, "p-leaf", 16, 260);
          this.burst(tree.x, GROUND_Y - 10, "p-dust", 12, 200);
          this.burst(tree.x, GROUND_Y - 80, "p-spark", 10, 300);
        }

        sound.playLevelUp();

        if (!this.isAdvancingLevel) {
          this.isAdvancingLevel = true;
          this.time.delayedCall(450, () => {
            this.advanceLevel();
          });
        }
      } else {
        // Standard tree fell hit-stop: 40ms
        this.hitStopUntil = now + 40;
        if (!this.prefersReducedMotion) {
          this.cameras.main.shake(120, 0.005);
        }
        if (this.showParticles) {
          this.burst(tree.x, GROUND_Y - 55, "p-chip", 14, 300);
          this.burst(tree.x, GROUND_Y - 130, "p-leaf", 8, 180);
          this.burst(tree.x, GROUND_Y - 10, "p-dust", 6, 120);
        }
      }

      // Haptics
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(isLevelClearing ? [40, 60, 80] : 15);
      }

      // Floating score label
      if (this.showFloatText) {
        this.floatText(tree.x, GROUND_Y - 220, `+${delta}`, "#FFD000");
      }
    } else {
      this.setTreeTexture(tree, this.treeTextureFor(tree));
      if (this.showParticles && this.rng.chance(0.35)) {
        this.burst(tree.x, GROUND_Y - 145, "p-leaf", 2, 110);
      }
    }
  }

  private burst(x: number, y: number, key: string, count: number, speed: number) {
    for (let i = 0; i < count; i += 1) {
      const particle = this.add.image(x, y, key).setDepth(12).setScale(Phaser.Math.FloatBetween(0.5, 1.05));
      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.82, -Math.PI * 0.2);
      const velocity = Phaser.Math.FloatBetween(speed * 0.4, speed);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * velocity,
        y: y + Math.sin(angle) * velocity + 150,
        angle: Phaser.Math.Between(-250, 250),
        alpha: 0,
        duration: Phaser.Math.Between(380, 700),
        ease: "Cubic.easeIn",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const label = this.add.text(x, y, text, { fontFamily: "Arial Black, Arial", fontSize: "28px", color, stroke: "#1a1208", strokeThickness: 5 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: label, y: y - 64, alpha: 0, duration: 760, onComplete: () => label.destroy() });
  }

  private levelBanner() {
    const label = this.add.text(this.player.x, 170, `LEVEL ${this.level.level}`, {
      fontFamily: "Arial Black, Arial", fontSize: "44px", color: "#efe3c8", stroke: "#132016", strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(1).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, y: 205, duration: 200, hold: 700, yoyo: true, onComplete: () => label.destroy() });
  }

  private advanceLevel() {
    if (this.ended) return;
    const nextLevelNumber = this.level.level + 1;
    for (const tree of this.trees) tree.sprite.destroy();
    for (const candle of this.candles) {
      candle.glyph?.destroy();
      candle.sprite.destroy();
    }
    for (const obstacle of this.obstacles) obstacle.sprite.destroy();
    for (const chasm of this.chasms) {
      chasm.graphics.destroy();
      chasm.label.destroy();
    }
    this.trees = [];
    this.candles = [];
    this.obstacles = [];
    this.chasms = [];
    this.levelTreeCount = 0;
    // Note: this.redHits is intentionally cumulative across the entire run (like greenCount & totalTreeCount)
    // so that client-server score verification matches total penalties.
    this.level = createTapChimpLevel(nextLevelNumber, this.opts, `${this.opts.defaultGameSlug}:${nextLevelNumber}`);
    this.rng = new SeededTapChimpGenerator(`${this.level.seed}:${Date.now()}`);
    this.spawnTree(this.player.x + 850);
    this.spawnTree(this.player.x + 1800);
    this.nextTreeX = this.player.x + 2800;
    this.nextCandleAt = this.time.now + 1600;
    this.lastChopAt = this.time.now;
    this.timeLeftMs = this.level.maxDurationSec * 1000;
    this.state = "idle";
    this.setApeTexture("ape-idle");
    this.levelBanner();
    this.spawnChasm(this.player.x + 1300);
    this.spawnObstacle(this.player.x + 480);
    this.spawnObstacle(this.player.x + 2250);
    this.reportHud();
    this.time.delayedCall(450, () => {
      this.isAdvancingLevel = false;
    });
  }

  private collectCandle(candle: Candle) {
    // Destroy existing glyph
    candle.glyph?.destroy();
    candle.glyph = null;
    
    candle.taken = true;
    if (candle.kind === "green") {
      this.greenCount += 1;
      const delta = this.opts.pointsPerGreen;
      this.lastScoreChange = delta;
      this.score += delta;
      
      // Phase 3: Combo counter
      this.comboCount += 1;
      if (this.comboResetTimer) this.comboResetTimer.remove(false);
      this.comboResetTimer = this.time.delayedCall(3000, () => { this.comboCount = 0; });

      // Audio cue with escalating pentatonic combo scale
      sound.playGreen(this.comboCount);
      
      // Phase 3: Haptics (10ms on green)
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
      
      // Phase 3: Floating +10 label with proper color
      if (this.showFloatText) {
        const floatColor = this.opts.colorblindMode ? "#38bdf8" : "#22c55e";
        this.floatText(candle.sprite.x, candle.sprite.y - 24, `+${delta}`, floatColor);
      }
      
      // Phase 3: Particle burst
      if (this.showParticles) {
        this.burst(candle.sprite.x, candle.sprite.y, "p-spark", 5, 120);
      }
      
    } else {
      if (this.time.now < this.hitUntil) { candle.taken = false; return; }
      this.redHits += 1;
      const delta = this.opts.redHitScorePenalty;
      this.lastScoreChange = -delta;
      this.hitUntil = this.time.now + 1200;
      this.timeLeftMs = Math.max(0, this.timeLeftMs - this.opts.redHitPenaltySec * 1000);
      this.score = Math.max(0, this.score - delta);
      this.state = "hit";
      this.setApeTexture("ape-hit");
      
      // Audio cue
      sound.playRed();
      
      // Phase 3: Screen shake on red hit
      if (!this.prefersReducedMotion) {
        this.cameras.main.shake(150, 0.006);
        this.cameras.main.flash(130, 220, 70, 40);
      }
      
      // Phase 3: Floating -25 label with proper red color
      if (this.showFloatText) {
        const floatColor = this.opts.colorblindMode ? "#f97316" : "#ef4444";
        this.floatText(this.player.x, this.player.y - 170, `-${delta}`, floatColor);
      }
      
      // Phase 3: Haptics ([30, 50, 30] on red)
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([30, 50, 30]);
      }
      
      // Reset combo on red hit
      this.comboCount = 0;
      
      this.time.delayedCall(520, () => { if (this.state === "hit") this.state = "idle"; });
    }
    this.tweens.killTweensOf(candle.sprite);
    this.tweens.add({ targets: candle.sprite, alpha: 0, y: candle.sprite.y - 35, duration: 200, onComplete: () => {
      candle.glyph?.destroy();
      candle.sprite.destroy();
    } });
  }

  update(time: number, delta: number) {
    if (this.ended) return;

    // Real arcade hit-stop: freeze movement & timers during hit-stop frames
    if (time < this.hitStopUntil) {
      return;
    }

    this.timeLeftMs = Math.max(0, this.timeLeftMs - delta);
    if (this.timeLeftMs <= 0) return this.endRun("failed");

    // Dynamic Hurry-Up Mode: accelerate chiptune tempo in final 10 seconds
    if (this.timeLeftMs <= 10000) {
      sound.setHurryUp(true);
    } else {
      sound.setHurryUp(false);
    }

    const left = this.cursors.left.isDown || this.keyA.isDown || touchInput.left;
    const right = this.cursors.right.isDown || this.keyD.isDown || touchInput.right;
    const jump = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown || this.keyUp.isDown || touchInput.jump;
    const vx = (right ? 1 : 0) - (left ? 1 : 0);

    // 1. Jump Buffering: detect rising edge
    if (jump && !this.wasJumpDown) {
      this.lastJumpPressedTime = time;
    }

    // 2. Coyote Time & Ground Evaluation
    if (this.player.y >= GROUND_Y) {
      this.player.y = GROUND_Y;
      this.playerVy = 0;
      this.isGrounded = true;
      this.isJumping = false;
      this.lastGroundedTime = time;
    } else {
      this.isGrounded = false;
    }

    // 3. Jump Execution (Buffered Jump + Coyote Time)
    const canCoyoteJump = (time - this.lastGroundedTime <= this.COYOTE_TIME_MS) && !this.isJumping;
    const canJump = (this.isGrounded || canCoyoteJump) && this.state !== "hit";
    const hasBufferedJump = (time - this.lastJumpPressedTime <= this.JUMP_BUFFER_MS);

    if (hasBufferedJump && canJump) {
      this.playerVy = this.JUMP_VELOCITY;
      this.isGrounded = false;
      this.isJumping = true;
      this.lastJumpPressedTime = 0; // Consume jump buffer
      this.lastGroundedTime = 0;    // Invalidate coyote time
      sound.playJump();
      if (this.showParticles) {
        this.burst(this.player.x, GROUND_Y - 5, "p-dust", 4, 90);
      }
    }

    // 4. Variable Jump Height: early jump release cuts vertical speed
    if (!jump && this.wasJumpDown && this.playerVy < this.MIN_JUMP_VELOCITY && this.isJumping) {
      this.playerVy = this.MIN_JUMP_VELOCITY; // Truncate jump for short hops
    }
    this.wasJumpDown = jump;

    // 5. Vertical Physics & Gravity Integration
    if (!this.isGrounded) {
      this.playerVy += this.GRAVITY * (delta / 1000);
      this.player.y += this.playerVy * (delta / 1000);
      if (this.player.y >= GROUND_Y) {
        this.player.y = GROUND_Y;
        this.playerVy = 0;
        this.isGrounded = true;
        this.isJumping = false;
        this.lastGroundedTime = time;
      }
    }

    if (this.state !== "hit" && vx !== 0) {
      const speedMult = this.isGrounded ? 1 : 1.15;
      const nextX = Math.max(90, this.player.x + vx * this.level.playerSpeed * speedMult * (delta / 1000));
      const blocker = this.trees.find((tree) => tree.alive && Math.abs(tree.x - nextX) < BLOCK_DIST && Math.sign(tree.x - this.player.x) === vx);
      if (!blocker) this.player.x = nextX;
      this.facing = vx > 0 ? 1 : -1;
      if (this.state !== "chop") {
        if (this.isGrounded) {
          this.state = "walk";
          this.setApeTexture(Math.floor(time / 150) % 2 === 0 ? "ape-walk1" : "ape-walk2");
        } else {
          this.setApeTexture("ape-walk2");
        }
      }
    } else if (!this.isGrounded && this.state !== "chop" && this.state !== "hit") {
      this.setApeTexture("ape-walk2");
    }

    const target = this.targetTree();
    if (this.state !== "hit" && target) {
      this.state = "chop";
      if (time - this.lastChopAt >= this.level.chopIntervalMs) this.chop(target, time);
    } else if (this.state === "chop") {
      this.state = "idle";
    } else if (this.state === "walk" && vx === 0 && this.isGrounded) {
      this.state = "idle";
    }

    if (this.state === "idle" && this.isGrounded) this.setApeTexture("ape-idle");
    this.player.setAlpha(time < this.hitUntil ? (Math.floor(time / 90) % 2 === 0 ? 0.48 : 1) : 1);

    while (this.nextTreeX < this.player.x + VIEW_W * 1.5 && this.trees.filter((tree) => tree.alive).length < Math.max(4, this.level.targetTrees - this.levelTreeCount + 3)) {
      const treeSpacing = this.rng.nextTreeSpacing(this.level);
      const prevTreeX = this.nextTreeX;
      this.spawnTree(prevTreeX);
      this.nextTreeX += treeSpacing;

      // Spawn a platformer chasm in the corridor between trees
      if (treeSpacing >= 800 && this.rng.chance(0.65)) {
        const chasmX = prevTreeX + Math.floor(treeSpacing * 0.48);
        this.spawnChasm(chasmX);
      }
    }

    if (time > this.nextCandleAt) {
      this.spawnCandle(this.player.x + this.rng.nextCandleOffset());
      this.nextCandleAt = time + this.rng.nextCandleDelayMs(this.level);
    }

    // Controlled obstacle pressure begins gently and scales with level.
    const obstacleInterval = Math.max(1200, 2600 - this.level.level * 55);
    const lastObstacle = this.obstacles.length ? this.obstacles[this.obstacles.length - 1] : null;
    const canSpawnObstacle = !lastObstacle || lastObstacle.x < this.player.x + VIEW_W * 0.72;
    if (canSpawnObstacle && this.rng.chance(delta / obstacleInterval)) {
      this.spawnObstacle(this.player.x + this.rng.int(580, 960));
    }

    for (const candle of this.candles) {
      if (candle.taken) continue;
      const dx = candle.sprite.x - this.player.x;
      const dy = candle.sprite.y - (this.player.y - 70);

      // Leaping over red candles: if player is airborne and feet are above the candle, clear cleanly!
      if (candle.kind === "red") {
        if (!this.isGrounded && this.player.y < candle.sprite.y + 15) {
          continue;
        }
      }

      if (Math.abs(dx) < 48 && Math.abs(dy) < 72) this.collectCandle(candle);
    }

    for (const obstacle of this.obstacles) {
      if (obstacle.speed > 0 && !obstacle.hit) {
        obstacle.x -= obstacle.speed * (delta / 1000);
        obstacle.sprite.setX(obstacle.x);
      }
      if (obstacle.hit || this.state === "hit") continue;
      const dx = obstacle.sprite.x - this.player.x;
      const dy = obstacle.sprite.y - (this.player.y - 55);

      // 1. RAT STOMP MECHANIC: Player jumps onto rat from above
      if (obstacle.kind === "rat" && !this.isGrounded && this.playerVy > 0 && Math.abs(dx) < 55 && this.player.y <= obstacle.sprite.y + 12) {
        obstacle.hit = true;
        this.playerVy = -420; // Platformer rebound bounce
        sound.playJump();
        sound.playGreen(this.comboCount + 1);

        // Stomp particle burst
        if (this.showParticles) {
          this.burst(obstacle.sprite.x, obstacle.sprite.y, "p-dust", 6, 120);
        }

        // Squash tween
        this.tweens.killTweensOf(obstacle.sprite);
        this.tweens.add({
          targets: obstacle.sprite,
          scaleY: 0.15,
          scaleX: 1.4,
          alpha: 0,
          duration: 220,
          ease: "Power2",
          onComplete: () => obstacle.sprite.destroy(),
        });

        // Award green bonus points (+10)
        this.greenCount += 1;
        this.score += this.opts.pointsPerGreen;
        this.lastScoreChange = this.opts.pointsPerGreen;
        this.comboCount += 1;
        if (this.showFloatText) {
          this.floatText(obstacle.sprite.x, obstacle.sprite.y - 35, "+10 STOMP!", "#00FFA3");
        }
        continue;
      }

      // 2. BEAR AXE ATTACK MECHANIC: Player strikes bear with axe
      if (obstacle.kind === "bear") {
        const inChopRange = Math.abs(dx) < 135 && (Math.sign(dx) === this.facing || Math.abs(dx) < 70);
        const isAttacking = this.state === "chop" || inChopRange;

        if (isAttacking && this.state !== "hit") {
          obstacle.hit = true;
          this.state = "chop";
          this.setApeTexture("ape-chop1");
          this.time.delayedCall(80, () => {
            if (this.state === "chop") this.setApeTexture("ape-chop2");
          });

          // Bear defeat impact effects
          sound.playChop();
          sound.playGreen(this.comboCount + 2);
          this.cameras.main.shake(160, 0.006);

          if (this.showParticles) {
            this.burst(obstacle.sprite.x, obstacle.sprite.y - 20, "p-spark", 8, 160);
            this.burst(obstacle.sprite.x, obstacle.sprite.y - 10, "p-chip", 6, 100);
          }

          // Defeat fell animation
          obstacle.sprite.setTint(0xff3b30);
          this.tweens.killTweensOf(obstacle.sprite);
          this.tweens.add({
            targets: obstacle.sprite,
            x: obstacle.sprite.x + (this.facing * 75),
            y: obstacle.sprite.y - 35,
            angle: this.facing * 40,
            alpha: 0,
            duration: 350,
            ease: "Power2",
            onComplete: () => obstacle.sprite.destroy(),
          });

          // Drop 3 green pump candles popping out in an arc (+30 total reward)
          for (let i = -1; i <= 1; i++) {
            const cx = obstacle.sprite.x + i * 42;
            const cy = obstacle.sprite.y - 45;
            const candleSprite = this.add.image(cx, cy, "candle-green").setDepth(6);
            this.fitHeight(candleSprite, 56);
            const glyph = this.add.text(cx, cy - 28, "▲", {
              fontFamily: "Arial Black",
              fontSize: "14px",
              color: "#00FFA3",
            }).setOrigin(0.5).setDepth(7);
            const candle: Candle = {
              sprite: candleSprite,
              kind: "green",
              baseY: cy,
              phase: i * 0.7,
              taken: false,
              glyph,
            };
            this.candles.push(candle);
            this.tweens.add({
              targets: candleSprite,
              y: cy - 40,
              duration: 200,
              yoyo: true,
              ease: "Sine.easeOut",
            });
          }

          this.comboCount += 2;
          if (this.showFloatText) {
            this.floatText(obstacle.sprite.x, obstacle.sprite.y - 75, "BEAR REKT! 🐻💥", "#FFD000");
          }
          this.time.delayedCall(220, () => {
            if (this.state === "chop") this.state = "idle";
          });
          continue;
        }
      }

      // Jumping over ground hazards (rat, mop, bear)
      if (!this.isGrounded && this.player.y < obstacle.sprite.y - (obstacle.kind === "bear" ? 35 : 20)) {
        continue;
      }

      const hitRange = obstacle.kind === "branch" ? 62 : obstacle.kind === "bear" ? 68 : 52;

      if (Math.abs(dx) < hitRange && Math.abs(dy) < 70) {
        obstacle.hit = true;
        this.redHits += 1;
        const deltaPenalty = this.opts.redHitScorePenalty;
        this.lastScoreChange = -deltaPenalty;
        this.timeLeftMs = Math.max(0, this.timeLeftMs - this.opts.redHitPenaltySec * 1000);
        this.score = Math.max(0, this.score - deltaPenalty);
        this.hitUntil = this.time.now + 850;
        this.state = "hit";
        this.setApeTexture("ape-hit");
        
        // Sound cue on hazard hit
        sound.playRed();
        
        // Reset combo streak
        this.comboCount = 0;
        
        this.cameras.main.shake(120, 0.0045);
        const hitLabel = obstacle.kind === "bear" ? `-${deltaPenalty} BEAR CLAW!` : `-${deltaPenalty}`;
        this.floatText(this.player.x, this.player.y - 160, hitLabel, "#ff6a5c");
        this.tweens.killTweensOf(obstacle.sprite);
        this.tweens.add({ targets: obstacle.sprite, alpha: 0, x: obstacle.sprite.x + (this.player.x < obstacle.sprite.x ? 24 : -24), duration: 180, onComplete: () => obstacle.sprite.destroy() });
        this.time.delayedCall(480, () => { if (this.state === "hit") this.state = "idle"; });
      }
    }

    // 3. Platformer Chasm Mechanics: Leap vs Fall
    for (const chasm of this.chasms) {
      const inChasmPit = this.player.x > chasm.x1 + 25 && this.player.x < chasm.x2 - 25;
      if (inChasmPit) {
        // Player is over the chasm pit!
        if (this.isGrounded || this.player.y >= GROUND_Y) {
          this.handleChasmFall(chasm, time);
        }
      } else if (this.player.x >= chasm.x2 && this.player.x < chasm.x2 + 200) {
        // Player cleared the chasm leap!
        if (!chasm.cleared) {
          chasm.cleared = true;
          sound.playJump();
          sound.playGreen(this.comboCount + 1);
          this.greenCount += 1;
          this.score += this.opts.pointsPerGreen;
          this.lastScoreChange = this.opts.pointsPerGreen;
          this.comboCount += 1;
          if (this.showFloatText) {
            this.floatText(chasm.x2 - 40, GROUND_Y - 80, "CLEARED CHASM! 🚀 +10", "#00FFA3");
          }
          this.reportHud();
        }
      }
    }

    for (const layer of this.layers) layer.tile.tilePositionX = this.cameras.main.scrollX * layer.factor;

    this.reportHud();

    const cullX = this.player.x - VIEW_W * 2.5;
    this.trees = this.trees.filter((tree) => {
      if (!tree.alive && tree.x < cullX) { tree.sprite.destroy(); return false; }
      return true;
    });
    this.candles = this.candles.filter((candle) => {
      if (candle.taken) { candle.glyph?.destroy(); return false; }
      if (candle.sprite.x < cullX) { 
        candle.glyph?.destroy();
        candle.sprite.destroy(); 
        return false; 
      }
      return true;
    });
    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.hit || obstacle.sprite.x < cullX) {
        if (obstacle.sprite.active) obstacle.sprite.destroy();
        return false;
      }
      return true;
    });
    this.chasms = this.chasms.filter((c) => {
      if (c.x2 < cullX) {
        c.graphics.destroy();
        c.label.destroy();
        return false;
      }
      return true;
    });
  }

  private reportHud() {
    const target = this.targetTree();
    
    // Score color based on change animation
    let scoreColorClass = "";
    if (this.lastScoreChange > 0) {
      scoreColorClass = "score-positive";
    } else if (this.lastScoreChange < 0) {
      scoreColorClass = "score-negative";
    }
    
    this.bridge.onHud({
      gameSlug: this.level.gameSlug,
      level: this.level.level,
      score: this.score,
      timeLeft: Math.ceil(this.timeLeftMs / 1000),
      trees: this.totalTreeCount,
      targetTrees: this.level.targetTrees,
      progress: this.levelTreeCount,
      green: this.greenCount,
      redHits: this.redHits,
      treeHpPct: target ? target.hp / target.maxHp : null,
      combo: this.comboCount > 0 ? this.comboCount : 0,
      scoreColorClass,
    });
  }

  private endRun(endedBy: RunEndReason) {
    if (this.ended) return;
    this.ended = true;

    // Smoothly fade out procedural BGM on run end
    sound.stopBgm();

    this.state = "over";
    this.player.setAlpha(1);
    this.setApeTexture(endedBy === "quit" ? "ape-down" : "ape-hit");
    const result: RunResult = {
      gameSlug: this.level.gameSlug,
      level: this.level.level,
      targetTrees: this.level.targetTrees,
      progress: this.levelTreeCount,
      score: this.score,
      trees: this.totalTreeCount,
      green: this.greenCount,
      redHits: this.redHits,
      durationMs: Math.round(this.time.now - this.startedAt),
      endedBy,
    };
    this.reportHud();
    this.time.delayedCall(700, () => this.bridge.onEnd(result));
  }

  private setApeTexture(key: string) {
    this.player.setTexture(key);
    this.player.setFlipX(this.facing === -1);
    this.fitHeight(this.player, PLAYER_HEIGHT);
  }

  public quitRun() { this.endRun("quit"); }
}
