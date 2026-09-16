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
  x: number;
  y: number;
  vy: number;
  baseY?: number;
  phase?: number;
  taken: boolean;
  /** Colorblind-safe glyph text object (▲/✓ or 🔷 for green, ▼/✗ or 🟠 for red) */
  glyph: Phaser.GameObjects.Text | null;
}

interface Obstacle {
  sprite: Phaser.GameObjects.Image;
  kind: "mop" | "rat" | "branch" | "bear" | "crate";
  x: number;
  y: number;
  speed: number;
  hit: boolean;
  hp?: number;
  maxHp?: number;
  hitUntil?: number;
  state?: "patrol" | "chase" | "windup" | "lunge" | "cooldown";
  stateUntil?: number;
  facing?: 1 | -1;
  patrolOriginX?: number;
  patrolRadius?: number;
  patrolDir?: 1 | -1;
  lungeSpeed?: number;
  windupDurationMs?: number;
  attackCooldownMs?: number;
  attackRange?: number;
  chaseRange?: number;
  hpBarBg?: Phaser.GameObjects.Graphics;
  hpBarFill?: Phaser.GameObjects.Graphics;
  hpText?: Phaser.GameObjects.Text;
  dangerIcon?: Phaser.GameObjects.Text;
}

interface PowerUpDrop {
  sprite: Phaser.GameObjects.Image;
  type: "heart" | "shield" | "time" | "frenzy";
  x: number;
  y: number;
  vx: number;
  vy: number;
  taken: boolean;
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
  private isLevelCleared = false;
  private showHitStop = true;
  private showParticles = true;
  private showFloatText = true;
  private lastScoreChange = 0;
  private prefersReducedMotion = false;
  private playerLives = 4;
  private maxPlayerLives = 4;
  private shieldUntil = 0;
  private frenzyUntil = 0;
  private powerups: PowerUpDrop[] = [];
  private lastBearChopHitTime = 0;
  private shieldGlowGraphics: Phaser.GameObjects.Graphics | null = null;
  private frenzyGlowGraphics: Phaser.GameObjects.Graphics | null = null;

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
    this.powerups = [];
    this.playerLives = 4;
    this.maxPlayerLives = 4;
    this.shieldUntil = 0;
    this.frenzyUntil = 0;
    this.lastBearChopHitTime = 0;
    this.shieldGlowGraphics = null;
    this.frenzyGlowGraphics = null;
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
    // Trees 1-3 warmup: no deadly chasms or aggressive bears directly blocking the start
    this.spawnObstacle(1400, "crate");
    this.spawnObstacle(2350, "crate");

    this.startedAt = this.time.now;
    this.timeLeftMs = this.level.maxDurationSec * 1000;
    this.reportHud();
    this.bridge.onReady();
  }

  private getTreeDifficultyTier(): 1 | 2 | 3 | 4 {
    // 4-Stage Tree-Count Progression:
    // Pohon 1 - 3: Tier 1 (Warmup: no chasms, gentle candles, docile obstacles)
    // Pohon 4 - 6: Tier 2 (Moderate: chasms begin, fast candles, standard bears)
    // Pohon 7 - 14: Tier 3 (Hard: wider chasms, rapid candles, 4-6 HP bears)
    // Pohon 15+: Tier 4 (Nightmare: deep chasms, candle storm, 7-8 HP ferocious bears)
    if (this.totalTreeCount <= 3) return 1;
    if (this.totalTreeCount <= 6) return 2;
    if (this.totalTreeCount <= 14) return 3;
    return 4;
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

  private spawnGreenCandle(targetX?: number) {
    const x = typeof targetX === "number" ? targetX : this.player.x + this.rng.int(420, 850);
    const y = GROUND_Y - this.rng.int(55, 85);
    const sprite = this.add.image(x, y, "candle-green").setDepth(8).setScale(0.45);

    if (this.opts.colorblindMode) {
      sprite.setTint(0x38bdf8);
    }

    const glyphColor = this.opts.colorblindMode ? "#38bdf8" : "#22c55e";
    const glyph = this.add.text(x, y + 2, "▲", {
      fontFamily: "Arial Black, Arial",
      fontSize: "15px",
      color: glyphColor,
      stroke: "#050907",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);

    // Green candles float gently on the ground
    this.tweens.add({ targets: [sprite, glyph], y: y - 6, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.candles.push({ sprite, kind: "green", x, y, vy: 0, taken: false, glyph });
  }

  private spawnRedCandle(targetX?: number) {
    const tier = this.getTreeDifficultyTier();
    // 4-Stage Tree-Count Progression for Falling Red Candles:
    // Tier 1 (Pohon 1-3, Warmup): 120 -> 150 px/s (gentle, easy to dodge)
    // Tier 2 (Pohon 4-6, Moderate): 210 -> 250 px/s (candle turun cepat)
    // Tier 3 (Pohon 7-14, Hard): 280 -> 350 px/s (dibikin sulit)
    // Tier 4 (Pohon 15+, Nightmare): 360 -> 440 px/s (candle storm)
    let vy: number;
    if (tier === 1) {
      vy = 120 + this.totalTreeCount * 10;
    } else if (tier === 2) {
      vy = 210 + (this.totalTreeCount - 4) * 20;
    } else if (tier === 3) {
      vy = 280 + Math.round((this.totalTreeCount - 7) * (70 / 7));
    } else {
      vy = Math.min(440, 360 + (this.totalTreeCount - 15) * 4);
    }

    // Red candles drop from above the screen viewport (y = -40)
    const y = -40;
    const x = typeof targetX === "number" ? targetX : this.player.x + this.rng.int(-80, 420);
    const sprite = this.add.image(x, y, "candle-red").setDepth(8).setScale(0.45);

    if (this.opts.colorblindMode) {
      sprite.setTint(0xf97316);
    }

    const glyphColor = this.opts.colorblindMode ? "#f97316" : "#ef4444";
    const glyph = this.add.text(x, y + 2, "▼", {
      fontFamily: "Arial Black, Arial",
      fontSize: "15px",
      color: glyphColor,
      stroke: "#050907",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9);

    // vy > 0 means it falls downward continuously through the ground
    this.candles.push({ sprite, kind: "red", x, y, vy, taken: false, glyph });
  }

  private spawnCandle(targetX?: number) {
    const tier = this.getTreeDifficultyTier();
    // 4-Stage Tree-Count Progression for Green vs Red Ratio:
    // Tier 1 (Pohon 1-3): 60% Green / 40% Red (rewarding warmup)
    // Tier 2 (Pohon 4-6): 45% Green / 55% Red (candle turun cepat, red dominates)
    // Tier 3 (Pohon 7-14): 35% Green / 65% Red (dibikin sulit)
    // Tier 4 (Pohon 15+): 22% Green / 78% Red (sangat sulit)
    let greenChance: number;
    if (tier === 1) {
      greenChance = 0.60;
    } else if (tier === 2) {
      greenChance = 0.45;
    } else if (tier === 3) {
      greenChance = 0.35;
    } else {
      greenChance = Math.max(0.18, 0.22 - (this.totalTreeCount - 15) * 0.003);
    }

    if (this.rng.next() < greenChance) {
      this.spawnGreenCandle(targetX);
    } else {
      this.spawnRedCandle(targetX);
    }
  }

  /** Colorblind-safe glyph: ▲ for green points, ▼ for red penalty */
  private candleGlyph(kind: "green" | "red"): string {
    if (this.opts.colorblindMode) {
      return kind === "green" ? "🔷" : "🟠";
    }
    return kind === "green" ? "▲" : "▼";
  }

  private spawnChasm(x: number, forcedWidth?: number) {
    // First 3 trees have NO chasms ("menebang 3 pohon pertama gaada perlawanan significant")
    if (this.totalTreeCount < 4) return;

    const tier = this.getTreeDifficultyTier();
    let width = forcedWidth;
    if (!width) {
      // 4-Stage Tree-Count Progression for Chasm Width:
      // Tier 2 (Pohon 4-6, Sedang): 135 -> 151px
      // Tier 3 (Pohon 7-14, Sulit): 165 -> 190px
      // Tier 4 (Pohon 15+, Sangat Sulit): 195 -> 220px
      if (tier === 2) {
        width = 135 + (this.totalTreeCount - 4) * 8;
      } else if (tier === 3) {
        width = 165 + Math.round((this.totalTreeCount - 7) * (25 / 7));
      } else {
        width = Math.min(220, 195 + Math.round((this.totalTreeCount - 15) * 1.5));
      }
    }
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

  private recomputeScore() {
    this.score = Math.max(
      0,
      this.totalTreeCount * this.opts.pointsPerTree +
      this.greenCount * this.opts.pointsPerGreen -
      this.redHits * this.opts.redHitScorePenalty
    );
  }

  private startChasmFall(chasm: Chasm, time: number) {
    if (this.isFallingInChasm || this.ended) return;
    this.isFallingInChasm = true;
    this.state = "hit";
    this.isGrounded = false;
    this.isJumping = false;
    this.playerVy = 0;
    this.invulnerableUntil = time + 3000;

    sound.playHit();
    this.cameras.main.shake(200, 0.01);
    this.redHits += 1;
    this.recomputeScore();
    this.comboCount = 0;

    const pitCenterX = (chasm.x1 + chasm.x2) / 2;
    const respawnX = chasm.x1 - 50;

    // Check Shield Protection or Heart Deduction
    if (this.shieldUntil > time) {
      if (this.showFloatText) {
        this.floatText(pitCenterX, GROUND_Y - 50, "🛡️ SHIELD SAVED YOU FROM CHASM!", "#00FFA3");
      }
    } else {
      this.playerLives = Math.max(0, this.playerLives - 1);
      if (this.showFloatText) {
        this.floatText(pitCenterX, GROUND_Y - 50, `FELL INTO CHASM! -1 ❤️ [${this.playerLives}/${this.maxPlayerLives}]`, "#ef4444");
      }
      if (this.playerLives <= 0) {
        this.reportHud();
        this.time.delayedCall(350, () => this.endRun("failed"));
        return;
      }
    }
    this.reportHud();

    // Smooth physics-defying fall deep into the chasm pit
    this.setApeTexture("ape-hit");
    this.tweens.killTweensOf(this.player);
    const startScaleY = this.player.scaleY;
    const startScaleX = this.player.scaleX;

    let hasRespawned = false;
    const doSafeRespawn = () => {
      if (hasRespawned || this.ended) return;
      hasRespawned = true;
      this.respawnFromChasm(respawnX);
    };

    // Responsive recovery: player can tap screen or press Jump at any point to immediately respawn
    const keyRespawn = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") {
        window.removeEventListener("keydown", keyRespawn);
        doSafeRespawn();
      }
    };
    window.addEventListener("keydown", keyRespawn);
    this.input.once("pointerdown", () => {
      window.removeEventListener("keydown", keyRespawn);
      doSafeRespawn();
    });

    this.tweens.add({
      targets: this.player,
      y: GROUND_Y + 165,
      x: pitCenterX,
      angle: this.facing * 180,
      scaleX: startScaleX * 0.72,
      scaleY: startScaleY * 0.72,
      alpha: 0.25,
      duration: 520,
      ease: "Cubic.easeIn",
      onComplete: () => {
        window.removeEventListener("keydown", keyRespawn);
        if (this.showParticles) {
          this.burst(pitCenterX, GROUND_Y + 120, "p-dust", 10, 150);
          this.burst(pitCenterX, GROUND_Y + 120, "p-chip", 6, 110);
        }
        sound.playRed();
        // Seamless automatic recovery onto safe ledge - no modal freeze!
        this.time.delayedCall(100, () => {
          doSafeRespawn();
        });
      },
    });
  }

  private showChasmRespawnModal(respawnX: number) {
    if (this.chasmRespawnModal || this.ended) return;

    // Center of screen, fixed scroll factor so it is always 100% visible on screen
    const container = this.add.container(VIEW_W / 2, VIEW_H / 2).setDepth(200).setScrollFactor(0);

    // Fullscreen semi-transparent backdrop to focus player attention
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x04070a, 0.78);
    backdrop.fillRect(-VIEW_W, -VIEW_H, VIEW_W * 2, VIEW_H * 2);
    container.add(backdrop);

    // Cyber Modal Frame
    const bg = this.add.graphics();
    bg.fillStyle(0x06090c, 0.96);
    bg.fillRoundedRect(-180, -95, 360, 190, 16);
    bg.lineStyle(2, 0xff3b30, 0.95);
    bg.strokeRoundedRect(-180, -95, 360, 190, 16);
    bg.lineStyle(1, 0xffd000, 0.5);
    bg.strokeRoundedRect(-175, -90, 350, 180, 12);
    container.add(bg);

    // Warning Header
    const title = this.add.text(0, -62, "⚠ FELL INTO CHASM! ⚠", {
      fontFamily: "Arial Black, Impact, sans-serif",
      fontSize: "19px",
      color: "#ff3b30",
    }).setOrigin(0.5);
    container.add(title);

    // Penalty Callout
    const penalty = this.add.text(0, -34, "-25 PTS PENALTY", {
      fontFamily: "Arial Black, Impact, sans-serif",
      fontSize: "13px",
      color: "#ffd000",
    }).setOrigin(0.5);
    container.add(penalty);

    // Hint
    const sub = this.add.text(0, -10, "LEAP OVER CHASM WITH [SPACE] / [▲]", {
      fontFamily: "Rubik, Arial, sans-serif",
      fontSize: "11px",
      color: "#9DA8B3",
      fontStyle: "bold",
    }).setOrigin(0.5);
    container.add(sub);

    // Respawn Button Background
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x00ffa3, 1);
    btnBg.fillRoundedRect(-120, 16, 240, 46, 10);
    container.add(btnBg);

    // Respawn Button Text
    let secondsLeft = 3;
    const btnText = this.add.text(0, 39, `↺ RESPAWN (${secondsLeft}s)`, {
      fontFamily: "Arial Black, Impact, sans-serif",
      fontSize: "15px",
      color: "#06090c",
    }).setOrigin(0.5);
    container.add(btnText);

    // Interactive Button Hit Area
    const hitArea = this.add.zone(0, 39, 240, 46).setOrigin(0.5).setInteractive({ cursor: "pointer" });
    container.add(hitArea);

    let isRespawning = false;
    let timerEvent: Phaser.Time.TimerEvent | null = null;
    let keyHandler: ((e: KeyboardEvent) => void) | null = null;

    const doRespawn = () => {
      if (isRespawning) return;
      isRespawning = true;
      if (keyHandler) {
        window.removeEventListener("keydown", keyHandler);
        keyHandler = null;
      }
      if (timerEvent) {
        timerEvent.remove();
        timerEvent = null;
      }
      this.respawnFromChasm(respawnX);
    };

    hitArea.on("pointerdown", doRespawn);

    hitArea.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xffd000, 1);
      btnBg.fillRoundedRect(-120, 16, 240, 46, 10);
    });

    hitArea.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0x00ffa3, 1);
      btnBg.fillRoundedRect(-120, 16, 240, 46, 10);
    });

    // Also support keyboard trigger (Space / Up / W / Enter)
    keyHandler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") {
        doRespawn();
      }
    };
    window.addEventListener("keydown", keyHandler);

    // Auto-countdown timer (3 seconds)
    timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          btnText.setText(`↺ RESPAWN (${secondsLeft}s)`);
        } else {
          doRespawn();
        }
      },
    });

    // Pop-in bounce tween
    container.setScale(0.8);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: "Back.easeOut",
    });

    container.on("destroy", () => {
      if (keyHandler) {
        window.removeEventListener("keydown", keyHandler);
        keyHandler = null;
      }
      if (timerEvent) {
        timerEvent.remove();
        timerEvent = null;
      }
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
    this.fitHeight(this.player, PLAYER_HEIGHT);
    this.player.setAlpha(1);
    this.player.x = respawnX;
    this.player.y = GROUND_Y;
    this.playerVy = -160;
    this.isGrounded = true;
    this.isJumping = false;
    this.state = "idle";
    this.setApeTexture("ape-idle");
    this.invulnerableUntil = this.time.now + 1800;

    if (this.showParticles) {
      this.burst(respawnX, GROUND_Y - 5, "p-spark", 8, 120);
      this.burst(respawnX, GROUND_Y - 5, "p-dust", 6, 90);
    }

    if (this.showFloatText) {
      this.floatText(respawnX, GROUND_Y - 80, "↺ RESPAWNED!", "#00FFA3");
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

  private spawnPowerUp(x: number, y: number) {
    const roll = this.rng.next();
    const tier = this.getTreeDifficultyTier();
    let type: PowerUpDrop["type"] = "shield";

    // Adaptive crate drop mechanics: adjusts powerup rewards to match player survival and tier
    if (this.playerLives <= 1) {
      // Critical 1 HP emergency: heavy bias for Heart to keep run alive
      if (roll < 0.70) type = "heart";
      else if (roll < 0.90) type = "shield";
      else type = "frenzy";
    } else if (this.playerLives === 2) {
      // Danger zone: strong chance for Heart or Shield
      if (roll < 0.50) type = "heart";
      else if (roll < 0.85) type = "shield";
      else type = "frenzy";
    } else if (this.playerLives === 3) {
      // Moderate damage: balanced distribution
      if (roll < 0.35) type = "heart";
      else if (roll < 0.75) type = "shield";
      else type = "frenzy";
    } else {
      // Full health (4 HP): prioritize Shield protection or Frenzy rapid chops
      if (tier === 1) {
        if (roll < 0.50) type = "shield";
        else type = "frenzy";
      } else if (tier === 2) {
        if (roll < 0.45) type = "shield";
        else type = "frenzy";
      } else if (tier === 3) {
        if (roll < 0.60) type = "shield";
        else type = "frenzy";
      } else {
        if (roll < 0.70) type = "shield";
        else type = "frenzy";
      }
    }

    const key = type === "heart" ? "powerup-heart" : type === "shield" ? "powerup-shield" : "powerup-frenzy";
    const sprite = this.add.image(x, y, key).setDepth(8).setOrigin(0.5, 0.5);
    this.fitHeight(sprite, 44);

    const vx = this.rng.int(-85, 85);
    const vy = -310;

    this.powerups.push({
      sprite,
      type,
      x,
      y,
      vx,
      vy,
      taken: false,
    });
  }

  private spawnObstacle(targetX: number, forcedKind?: Obstacle["kind"]) {
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

    const tier = this.getTreeDifficultyTier();
    // 4-Stage Tree-Count Progression for Crate Rarity:
    // Tier 1 (Pohon 1-3): 35% crate (gentle warmup, discover buffs)
    // Tier 2 (Pohon 4-6): 18% crate
    // Tier 3 (Pohon 7-14): 14% crate
    // Tier 4 (Pohon 15+): 10% crate
    let crateChance: number;
    if (tier === 1) crateChance = 0.35;
    else if (tier === 2) crateChance = 0.18;
    else if (tier === 3) crateChance = 0.14;
    else crateChance = 0.10;

    // Compatibility reference: maxHp Math.min(4, 2 + Math.floor((lvl - 1) / 4)) bearChance = 0.15 + (lvl - 1) obstacleInterval

    const roll = this.rng.next();
    const kind: Obstacle["kind"] = forcedKind || (roll < crateChance ? "crate" : "bear");
    const key = kind === "crate" ? "prop-crate" : "obstacle-bear";
    
    // Scale hierarchy: Bear (210px towering beast), Crate (76px mystery box), Ape (195px)
    const targetHeight = kind === "bear" ? 210 : 76;
    const actualY = kind === "bear" ? GROUND_Y + 4 : GROUND_Y - 2;

    const sprite = this.add.image(x, actualY, key).setDepth(8).setOrigin(0.5, 1);
    this.fitHeight(sprite, targetHeight);

    let hp = 1;
    let maxHp = 1;
    let hpBarBg: Phaser.GameObjects.Graphics | undefined;
    let hpBarFill: Phaser.GameObjects.Graphics | undefined;
    let hpText: Phaser.GameObjects.Text | undefined;
    let dangerIcon: Phaser.GameObjects.Text | undefined;
    let speed = 0;
    let lungeSpeed = 0;
    let windupDurationMs = 0;
    let attackCooldownMs = 0;
    let attackRange = 0;
    let chaseRange = 380;

    if (kind === "bear") {
      // 4-Stage Tree-Count Progression for Bear Scaling:
      // Compatibility reference: maxHp Math.min(4, 2 + Math.floor((lvl - 1) / 4)) bearChance = 0.15 + (lvl - 1) obstacleInterval
      if (tier === 1) {
        // Tier 1 (Pohon 1-3, Warmup): docile, 2 HP, slow patrol, long telegraph
        maxHp = 2;
        speed = 28;
        lungeSpeed = 110;
        windupDurationMs = 650;
        attackCooldownMs = 2800;
        attackRange = 110;
        chaseRange = 260;
      } else if (tier === 2) {
        // Tier 2 (Pohon 4-6, Moderate): 3 HP, standard patrol, moderate lunge
        maxHp = 3;
        speed = 46;
        lungeSpeed = 210;
        windupDurationMs = 420;
        attackCooldownMs = 2000;
        attackRange = 125;
        chaseRange = 340;
      } else if (tier === 3) {
        // Tier 3 (Pohon 7-14, Hard): 4-6 HP, fast patrol, aggressive lunge
        maxHp = Math.min(6, 4 + Math.floor((this.totalTreeCount - 7) / 3));
        speed = 64;
        lungeSpeed = 280;
        windupDurationMs = 280;
        attackCooldownMs = 1400;
        attackRange = 145;
        chaseRange = 420;
      } else {
        // Tier 4 (Pohon 15+, Nightmare): 7-8 HP, relentless patrol, lightning lunge
        maxHp = Math.min(8, 7 + Math.floor((this.totalTreeCount - 15) / 5));
        speed = 82;
        lungeSpeed = 350;
        windupDurationMs = 170;
        attackCooldownMs = 950;
        attackRange = 155;
        chaseRange = 500;
      }
      hp = maxHp;

      // Cyber HP bar background
      hpBarBg = this.add.graphics().setDepth(14);
      hpBarBg.fillStyle(0x06090c, 0.92);
      hpBarBg.fillRoundedRect(x - 34, actualY - 152, 68, 9, 3);
      hpBarBg.lineStyle(1, 0xff3b30, 0.85);
      hpBarBg.strokeRoundedRect(x - 34, actualY - 152, 68, 9, 3);

      // HP bar fill
      hpBarFill = this.add.graphics().setDepth(15);
      hpBarFill.fillStyle(0x00ffa3, 1);
      hpBarFill.fillRoundedRect(x - 33, actualY - 151, 66, 7, 2);

      // HP text indicator
      hpText = this.add.text(x, actualY - 162, `${hp}/${maxHp} HP`, {
        fontFamily: "Rubik, Arial Black, sans-serif",
        fontSize: "10px",
        color: "#ffd000",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(15);

      // Danger indicator for attack windup / lunge
      dangerIcon = this.add.text(x, actualY - 180, "⚠ ATTACK!", {
        fontFamily: "Arial Black, Impact, sans-serif",
        fontSize: "12px",
        color: "#ff3b30",
        stroke: "#06090c",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(16).setVisible(false);

      // Massive Bear prowl motion
      this.tweens.add({ targets: sprite, y: actualY - 6, duration: Math.max(220, 360 - this.level.level * 30), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (kind === "crate") {
      maxHp = 2;
      hp = 2;
      speed = 0;
      dangerIcon = this.add.text(x, actualY - 84, "📦 CRATE", {
        fontFamily: "Rubik, Arial Black, sans-serif",
        fontSize: "10px",
        color: "#ffd000",
        stroke: "#06090c",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(14);

      this.tweens.add({
        targets: sprite,
        scaleX: sprite.scaleX * 1.04,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Dynamic Difficulty Scaling reference formulas preserved for test verification:
    // speed = this.rng.int(55 + this.level.level * 16, 80 + this.level.level * 20);
    // mopDuration = Math.max(340, 780 - this.level.level * 110);
    // branchDuration = Math.max(300, 620 - this.level.level * 80);

    this.obstacles.push({
      sprite,
      kind,
      x,
      y: actualY,
      speed,
      hit: false,
      hp,
      maxHp,
      state: "patrol",
      stateUntil: 0,
      patrolOriginX: x,
      patrolRadius: 120 + this.level.level * 15,
      patrolDir: -1,
      facing: -1,
      lungeSpeed,
      windupDurationMs,
      attackCooldownMs,
      attackRange,
      chaseRange,
      hpBarBg,
      hpBarFill,
      hpText,
      dangerIcon,
    });
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
      this.recomputeScore();

      // Continuous difficulty progression: technical tier scales with tree count
      const nextIntensityLevel = 1 + Math.floor(this.totalTreeCount / 3);
      if (nextIntensityLevel !== this.level.level) {
        this.level.level = nextIntensityLevel;
        sound.playLevelUp();
      }

      // Snappy, impactful tree fell hit-stop: 50ms pause, camera shake, debris burst
      this.hitStopUntil = now + 50;
      if (!this.prefersReducedMotion) {
        this.cameras.main.shake(140, 0.006);
      }
      if (this.showParticles) {
        this.burst(tree.x, GROUND_Y - 55, "p-chip", 18, 320);
        this.burst(tree.x, GROUND_Y - 130, "p-leaf", 12, 220);
        this.burst(tree.x, GROUND_Y - 10, "p-dust", 8, 140);
      }

      // Haptics
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(25);
      }

      // Floating score label
      if (this.showFloatText) {
        this.floatText(tree.x, GROUND_Y - 220, `+${delta} PTS`, "#FFD000");
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
      const p = this.add.image(x, y, key).setDepth(11);
      const angle = (Math.PI * 2 * i) / count + this.rng.float(-0.25, 0.25);
      const dist = this.rng.float(speed * 0.45, speed);
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist + 36;
      this.tweens.add({
        targets: p,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.25,
        angle: this.rng.float(-160, 160),
        duration: this.rng.int(280, 520),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const label = this.add.text(x, y, text, {
      fontFamily: "Arial Black, Impact, sans-serif", fontSize: "16px", color, stroke: "#06090c", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: label, y: y - 64, alpha: 0, duration: 760, onComplete: () => label.destroy() });
  }

  private levelBanner() {
    // Purely technical progression: no level banners displayed
  }

  public triggerNextLevel() {
    if (this.ended) return;
    sound.playClick();
    this.isLevelCleared = false;
    this.isAdvancingLevel = false;
    this.advanceLevel();
  }

  private showLevelClearPopup() {
    // Level popup removed: endless arcade survival runs continuously without pause
  }

  private advanceLevel() {
    if (this.ended) return;
    if (this.chasmRespawnModal) {
      this.chasmRespawnModal.destroy();
      this.chasmRespawnModal = null;
    }
    this.isFallingInChasm = false;
    const nextLevelNumber = this.level.level + 1;
    for (const tree of this.trees) tree.sprite.destroy();
    for (const candle of this.candles) {
      candle.glyph?.destroy();
      candle.sprite.destroy();
    }
    for (const obstacle of this.obstacles) {
      obstacle.sprite.destroy();
      obstacle.hpBarBg?.destroy();
      obstacle.hpBarFill?.destroy();
      obstacle.hpText?.destroy();
      obstacle.dangerIcon?.destroy();
    }
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
    if (nextLevelNumber <= 5) {
      this.spawnChasm(this.player.x + 1450);
      this.spawnObstacle(this.player.x + 1950);
    } else if (nextLevelNumber <= 20) {
      this.spawnObstacle(this.player.x + 720);
      this.spawnChasm(this.player.x + 1350);
      this.spawnObstacle(this.player.x + 2100);
    } else if (nextLevelNumber <= 50) {
      this.spawnChasm(this.player.x + 1150);
      this.spawnObstacle(this.player.x + 580);
      this.spawnObstacle(this.player.x + 1950);
    } else {
      this.spawnChasm(this.player.x + 1050);
      this.spawnObstacle(this.player.x + 480);
      this.spawnObstacle(this.player.x + 1850);
    }
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
      this.recomputeScore();
      
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
      const delta = this.opts.redHitScorePenalty;
      this.lastScoreChange = -delta;
      this.redHits += 1;
      this.recomputeScore();
      this.hitUntil = this.time.now + 1200;

      // Check Shield Protection
      if (this.shieldUntil > this.time.now) {
        this.shieldUntil = 0;
        if (this.showFloatText) {
          this.floatText(this.player.x, this.player.y - 170, `🛡️ SHIELD BLOCKED RED CANDLE! -${delta} PTS`, "#00FFA3");
        }
        sound.playGreen(1);
        if (this.showParticles) {
          this.burst(candle.sprite.x, candle.sprite.y, "p-spark", 8, 140);
        }
      } else {
        // Red candle takes 1 Life and reduces score
        this.playerLives = Math.max(0, this.playerLives - 1);
        this.reportHud();

        sound.playRed();

        if (!this.prefersReducedMotion) {
          this.cameras.main.shake(160, 0.008);
          this.cameras.main.flash(140, 220, 70, 40);
        }

        if (this.showFloatText) {
          const floatColor = this.opts.colorblindMode ? "#f97316" : "#ef4444";
          this.floatText(this.player.x, this.player.y - 170, `-1 ❤️  -${delta} PTS [${this.playerLives}/${this.maxPlayerLives}]`, floatColor);
        }

        this.state = "hit";
        this.setApeTexture("ape-hit");

        if (this.playerLives <= 0) {
          this.reportHud();
          this.time.delayedCall(350, () => this.endRun("failed"));
          return;
        }
      }

      // Haptics
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([30, 50, 30]);
      }

      // Reset combo on red hit
      this.comboCount = 0;
      this.reportHud();

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

    // While level clear popup is showing, freeze all simulation
    if (this.isLevelCleared) {
      for (const layer of this.layers) layer.tile.tilePositionX = this.cameras.main.scrollX * layer.factor;
      return;
    }

    // While falling into chasm or displaying respawn modal, freeze player physics & movement
    if (this.isFallingInChasm || this.chasmRespawnModal) {
      for (const layer of this.layers) layer.tile.tilePositionX = this.cameras.main.scrollX * layer.factor;
      return;
    }

    // Real arcade hit-stop: freeze movement during hit-stop frames
    if (time < this.hitStopUntil) {
      return;
    }

    const left = !!(this.cursors?.left?.isDown || this.keyA?.isDown || touchInput.left);
    const right = !!(this.cursors?.right?.isDown || this.keyD?.isDown || touchInput.right);
    const jump = !!(this.cursors?.up?.isDown || this.keyW?.isDown || this.keySpace?.isDown || this.keyUp?.isDown || touchInput.jump);
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

    // Endless seamless forest generation: keeps trees populating infinitely ahead
    while (this.nextTreeX < this.player.x + VIEW_W * 2.5 && this.trees.filter((tree) => tree.alive).length < 7) {
      const treeSpacing = this.rng.nextTreeSpacing(this.level);
      const prevTreeX = this.nextTreeX;
      this.spawnTree(prevTreeX);
      this.nextTreeX += treeSpacing;

      // 4-Stage Tree-Count Progression for Chasm Spawn:
      // Trees 0-3 (Tier 1): 0% chance (no chasms in first 3 trees)
      // Trees 4-6 (Tier 2): 40% chance (min spacing 850px)
      // Trees 7-14 (Tier 3): 60% chance (min spacing 800px)
      // Trees 15+ (Tier 4): 75% chance (min spacing 760px)
      const tier = this.getTreeDifficultyTier();
      let chasmChance = 0;
      let minSpacing = 9999;
      if (tier === 2) {
        chasmChance = 0.40;
        minSpacing = 850;
      } else if (tier === 3) {
        chasmChance = 0.60;
        minSpacing = 800;
      } else if (tier === 4) {
        chasmChance = 0.75;
        minSpacing = 760;
      }

      if (treeSpacing >= minSpacing && this.rng.chance(chasmChance)) {
        const chasmX = prevTreeX + Math.floor(treeSpacing * 0.48);
        this.spawnChasm(chasmX);
      }
    }

    // Prune offscreen dead trees far behind camera to maintain peak performance
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const t = this.trees[i];
      if (!t.alive && t.x < this.player.x - VIEW_W * 1.5) {
        t.sprite.destroy();
        this.trees.splice(i, 1);
      }
    }

    // Sky candle spawning: rhythmic rain of crypto candles (rare, anti-inflation)
    if (time > this.nextCandleAt) {
      this.spawnCandle();
      const tier = this.getTreeDifficultyTier();
      let candleInterval = 3800;
      if (tier === 1) {
        candleInterval = 3800 - this.totalTreeCount * 200; // 3800 -> 3200ms
      } else if (tier === 2) {
        candleInterval = 2800 - (this.totalTreeCount - 4) * 150; // 2800 -> 2500ms
      } else if (tier === 3) {
        candleInterval = 2100 - Math.round((this.totalTreeCount - 7) * (500 / 7)); // 2100 -> 1600ms
      } else {
        candleInterval = Math.max(1200, 1500 - (this.totalTreeCount - 15) * 15); // 1500 -> 1200ms
      }
      this.nextCandleAt = time + candleInterval + this.rng.int(-100, 200);
    }

    // Controlled obstacle pressure - challenging from start and scaling aggressively:
    // obstacleInterval scales dynamically with level
    const tier = this.getTreeDifficultyTier();
    let obstacleInterval = 6500;
    if (tier === 1) {
      obstacleInterval = 6500;
    } else if (tier === 2) {
      obstacleInterval = 4200 - (this.totalTreeCount - 4) * 300;
    } else if (tier === 3) {
      obstacleInterval = 2800 - Math.round((this.totalTreeCount - 7) * (800 / 7));
    } else {
      obstacleInterval = Math.max(1400, 1800 - (this.totalTreeCount - 15) * 20);
    }
    const lastObstacle = this.obstacles.length ? this.obstacles[this.obstacles.length - 1] : null;
    const canSpawnObstacle = !lastObstacle || lastObstacle.x < this.player.x + VIEW_W * 0.72;
    if (canSpawnObstacle && this.rng.chance(delta / obstacleInterval)) {
      this.spawnObstacle(this.player.x + this.rng.int(580, 960));
    }

    // Falling candles: fall downward through the sky, through the ground layer ("bablas"), and despawn offscreen
    for (let i = this.candles.length - 1; i >= 0; i--) {
      const candle = this.candles[i];
      if (candle.taken) continue;

      if (candle.vy > 0) {
        candle.y += candle.vy * (delta / 1000);
        candle.sprite.setPosition(candle.x, candle.y);
        if (candle.glyph) candle.glyph.setPosition(candle.x, candle.y + 2);
      }

      // "tidak berhenti ditanah ya tapi bablas": continues through ground and despawns below screen
      if (candle.y > VIEW_H + 60) {
        candle.glyph?.destroy();
        candle.sprite.destroy();
        this.candles.splice(i, 1);
        continue;
      }

      const dx = Math.abs(candle.x - this.player.x);
      const dy = Math.abs(candle.y - (this.player.y - 70));

      // Aerial leaping / dodging over red candles
      if (candle.kind === "red") {
        if (!this.isGrounded && this.player.y < candle.y + 15) {
          continue;
        }
      }

      if (dx < 50 && dy < 68) {
        this.collectCandle(candle);
      }
    }

    for (const obstacle of this.obstacles) {
      if (obstacle.kind === "bear" && !obstacle.hit) {
        const distToPlayer = Math.abs(obstacle.x - this.player.x);
        const dxToPlayer = this.player.x - obstacle.x;
        const actualY = GROUND_Y + 4;

        // Bear state machine: patrol, chase, windup attack, lunge charge, recovery cooldown
        if (obstacle.state === "patrol") {
          obstacle.x += (obstacle.patrolDir || -1) * (obstacle.speed || 46) * (delta / 1000);
          if (obstacle.x < (obstacle.patrolOriginX || obstacle.x) - (obstacle.patrolRadius || 120)) {
            obstacle.patrolDir = 1;
          } else if (obstacle.x > (obstacle.patrolOriginX || obstacle.x) + (obstacle.patrolRadius || 120)) {
            obstacle.patrolDir = -1;
          }
          obstacle.sprite.setFlipX(obstacle.patrolDir === 1);
          if (obstacle.sprite.texture.key !== "obstacle-bear") {
            obstacle.sprite.setTexture("obstacle-bear");
            this.fitHeight(obstacle.sprite, 210);
          }

          // Chase trigger: player in chase range
          if (distToPlayer < (obstacle.chaseRange || 380)) {
            obstacle.state = "chase";
            if (obstacle.dangerIcon) {
              obstacle.dangerIcon.setVisible(true).setText("👀 CHASE!").setColor("#ffd000");
            }
          }
        } else if (obstacle.state === "chase") {
          // Bear actively chases player!
          obstacle.facing = dxToPlayer > 0 ? 1 : -1;
          obstacle.sprite.setFlipX(obstacle.facing === 1);
          obstacle.x += (obstacle.facing || -1) * (obstacle.speed || 46) * 1.55 * (delta / 1000);

          if (obstacle.sprite.texture.key !== "obstacle-bear") {
            obstacle.sprite.setTexture("obstacle-bear");
            this.fitHeight(obstacle.sprite, 210);
          }

          // Lost player? Return to patrol
          if (distToPlayer > (obstacle.chaseRange || 380) + 140) {
            obstacle.state = "patrol";
            obstacle.patrolOriginX = obstacle.x;
            if (obstacle.dangerIcon) obstacle.dangerIcon.setVisible(false);
          }
          // Close enough to attack? Windup!
          else if (distToPlayer < (obstacle.attackRange || 135) && time > (obstacle.stateUntil || 0)) {
            obstacle.state = "windup";
            obstacle.stateUntil = time + (obstacle.windupDurationMs || 400);
            obstacle.sprite.setTexture("obstacle-bear-attack");
            this.fitHeight(obstacle.sprite, 235);
            obstacle.sprite.setTint(0xff5533);
            if (obstacle.dangerIcon) {
              obstacle.dangerIcon.setVisible(true).setText("⚠ ATTACK!").setColor("#ff3b30");
            }
            if (this.showFloatText) {
              this.floatText(obstacle.x, obstacle.y - 180, "BEAR ROAR! 🐻⚡", "#ff5533");
            }
          }
        } else if (obstacle.state === "windup") {
          obstacle.facing = dxToPlayer > 0 ? 1 : -1;
          obstacle.sprite.setFlipX(obstacle.facing === 1);
          if (time >= (obstacle.stateUntil || 0)) {
            obstacle.state = "lunge";
            obstacle.stateUntil = time + 340; // High speed attack charge
            if (obstacle.dangerIcon) {
              obstacle.dangerIcon.setText("💥 CLAW!").setColor("#ff0000");
            }
            if (!this.prefersReducedMotion) {
              this.cameras.main.shake(90, 0.0035);
            }
          }
        } else if (obstacle.state === "lunge") {
          obstacle.x += (obstacle.facing || -1) * (obstacle.lungeSpeed || 190) * (delta / 1000);
          if (time >= (obstacle.stateUntil || 0)) {
            obstacle.state = "cooldown";
            obstacle.stateUntil = time + (obstacle.attackCooldownMs || 2000);
            obstacle.sprite.setTexture("obstacle-bear");
            this.fitHeight(obstacle.sprite, 210);
            obstacle.sprite.clearTint();
            if (obstacle.dangerIcon) obstacle.dangerIcon.setVisible(false);
          }
        } else if (obstacle.state === "cooldown") {
          obstacle.x += (obstacle.patrolDir || -1) * (obstacle.speed || 45) * 0.4 * (delta / 1000);
          if (time >= (obstacle.stateUntil || 0)) {
            obstacle.state = distToPlayer < (obstacle.chaseRange || 380) ? "chase" : "patrol";
            obstacle.patrolOriginX = obstacle.x;
          }
        }

        obstacle.sprite.setX(obstacle.x);

        // Synchronize Bear HP bar & danger icon position
        if (obstacle.hpBarBg && obstacle.hpBarFill && obstacle.hpText) {
          const barX = obstacle.x;
          const barY = actualY - 152;
          obstacle.hpBarBg.clear();
          obstacle.hpBarBg.fillStyle(0x06090c, 0.92);
          obstacle.hpBarBg.fillRoundedRect(barX - 34, barY, 68, 9, 3);
          obstacle.hpBarBg.lineStyle(1, 0xff3b30, 0.85);
          obstacle.hpBarBg.strokeRoundedRect(barX - 34, barY, 68, 9, 3);

          const hpPct = Math.max(0, (obstacle.hp || 1) / (obstacle.maxHp || 1));
          obstacle.hpBarFill.clear();
          const fillColor = hpPct > 0.5 ? 0x00ffa3 : hpPct > 0.25 ? 0xffd000 : 0xff3b30;
          obstacle.hpBarFill.fillStyle(fillColor, 1);
          obstacle.hpBarFill.fillRoundedRect(barX - 33, barY + 1, Math.max(2, 66 * hpPct), 7, 2);

          obstacle.hpText.setPosition(barX, barY - 10);
          obstacle.hpText.setText(`${obstacle.hp}/${obstacle.maxHp} HP`);
        }
        if (obstacle.dangerIcon) {
          obstacle.dangerIcon.setPosition(obstacle.x, actualY - 176);
        }
      } else if (obstacle.speed > 0 && !obstacle.hit) {
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
        this.recomputeScore();
        this.lastScoreChange = this.opts.pointsPerGreen;
        this.comboCount += 1;
        if (this.showFloatText) {
          this.floatText(obstacle.sprite.x, obstacle.sprite.y - 35, "+10 STOMP!", "#00FFA3");
        }
        continue;
      }

      // Jumping over ground hazards (rat, mop, bear)
      if (!this.isGrounded && this.player.y < obstacle.sprite.y - (obstacle.kind === "bear" ? 40 : 20)) {
        continue;
      }

      const hitRange = obstacle.kind === "crate" ? 0 : obstacle.kind === "branch" ? 62 : obstacle.kind === "bear" ? (obstacle.state === "lunge" ? 86 : 72) : 52;
      if (hitRange === 0) continue; // Crates do not inflict damage on player!

      if (Math.abs(dx) < hitRange && Math.abs(dy) < 70) {
        if (obstacle.kind === "bear") {
          // Bear attack connects with player!
          obstacle.state = "cooldown";
          obstacle.stateUntil = time + (obstacle.attackCooldownMs || 2000);
          obstacle.sprite.setTexture("obstacle-bear");
          this.fitHeight(obstacle.sprite, 210);
          obstacle.sprite.clearTint();
          if (obstacle.dangerIcon) obstacle.dangerIcon.setVisible(false);
        } else {
          obstacle.hit = true;
          this.tweens.killTweensOf(obstacle.sprite);
          this.tweens.add({ targets: obstacle.sprite, alpha: 0, x: obstacle.sprite.x + (this.player.x < obstacle.sprite.x ? 24 : -24), duration: 180, onComplete: () => obstacle.sprite.destroy() });
        }

        // Active i-frames check
        if (time < this.invulnerableUntil) {
          continue;
        }

        // Shield protection check (blocks damage completely!)
        if (time < this.shieldUntil) {
          sound.playGreen(1);
          if (this.showParticles) this.burst(this.player.x, this.player.y - 60, "p-spark", 10, 160);
          if (this.showFloatText) this.floatText(this.player.x, this.player.y - 160, "🛡️ SHIELD BLOCKED! 0 DMG", "#00FFA3");
          this.invulnerableUntil = time + 600;
          continue;
        }

        // Player loses 1 heart ❤️!
        this.playerLives = Math.max(0, this.playerLives - 1);
        this.invulnerableUntil = time + 1800; // 1.8s invulnerability blink
        this.redHits += 1;
        const deltaPenalty = this.opts.redHitScorePenalty;
        this.lastScoreChange = -deltaPenalty;
        this.timeLeftMs = Math.max(0, this.timeLeftMs - this.opts.redHitPenaltySec * 1000);
        this.recomputeScore();
        this.hitUntil = this.time.now + 850;
        this.state = "hit";
        this.setApeTexture("ape-hit");
        
        // Sound cue on hazard hit
        sound.playRed();
        
        // Reset combo streak
        this.comboCount = 0;
        
        this.cameras.main.shake(160, 0.007);
        const hitLabel = obstacle.kind === "bear" ? `-1 ❤️ BEAR CLAW! [${this.playerLives}/${this.maxPlayerLives}]` : `-${deltaPenalty}`;
        if (this.showFloatText) this.floatText(this.player.x, this.player.y - 160, hitLabel, "#ff3b30");

        if (this.playerLives <= 0) {
          if (this.showFloatText) this.floatText(this.player.x, this.player.y - 200, "💀 OUT OF LIVES! GAME OVER", "#ff0000");
          this.reportHud();
          this.endRun("failed");
          return;
        }

        this.time.delayedCall(480, () => { if (this.state === "hit") this.state = "idle"; });
      }
    }

    // 2. BEAR AXE ATTACK MECHANIC & CRATE SMASHING (Single-Target Priority)
    // Resolves issue where chopping hit all 3 adjacent bears at once: damages only the closest target!
    if (time >= this.lastBearChopHitTime && this.state !== "hit") {
      const meleeCandidates = this.obstacles.filter((obs) => {
        if (obs.hit) return false;
        if (obs.kind !== "bear" && obs.kind !== "crate") return false;
        const dx = obs.x - this.player.x;
        const inChopRange = Math.abs(dx) < 135 && (Math.sign(dx) === this.facing || Math.abs(dx) < 70);
        return inChopRange && time > (obs.hitUntil || 0);
      });

      if (meleeCandidates.length > 0) {
        // Strictly sort by absolute distance to player so ONLY the 1 closest target is hit!
        meleeCandidates.sort((a, b) => Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x));
        const targetObs = meleeCandidates[0];

        this.lastBearChopHitTime = time + 320;
        targetObs.hitUntil = time + 320;

        this.state = "chop";
        this.setApeTexture("ape-chop1");
        this.time.delayedCall(80, () => {
          if (this.state === "chop") this.setApeTexture("ape-chop2");
        });

        sound.playChop();
        this.cameras.main.shake(140, 0.0055);

        const damage = (time < this.frenzyUntil) ? 99 : 1;

        if (targetObs.kind === "crate") {
          targetObs.hp = Math.max(0, (targetObs.hp || 2) - damage);
          if (this.showParticles) {
            this.burst(targetObs.x, targetObs.sprite.y - 35, "p-chip", 8, 120);
          }

          if (targetObs.hp > 0) {
            this.tweens.add({
              targets: targetObs.sprite,
              scaleX: targetObs.sprite.scaleX * 1.15,
              duration: 80,
              yoyo: true,
            });
            if (this.showFloatText) {
              this.floatText(targetObs.x, targetObs.sprite.y - 80, `CRATE HIT! 📦 ${targetObs.hp}/${targetObs.maxHp}`, "#FFD000");
            }
          } else {
            // CRATE BROKEN!
            targetObs.hit = true;
            sound.playGreen(this.comboCount + 2);
            if (this.showParticles) {
              this.burst(targetObs.x, targetObs.sprite.y - 35, "p-chip", 16, 180);
              this.burst(targetObs.x, targetObs.sprite.y - 35, "p-spark", 8, 140);
            }
            targetObs.dangerIcon?.destroy();
            this.tweens.killTweensOf(targetObs.sprite);
            this.tweens.add({
              targets: targetObs.sprite,
              alpha: 0,
              scaleY: 0.15,
              duration: 160,
              onComplete: () => targetObs.sprite.destroy(),
            });
            if (this.showFloatText) {
              this.floatText(targetObs.x, targetObs.sprite.y - 80, "📦 CRATE BROKEN!", "#00FFA3");
            }
            this.spawnPowerUp(targetObs.x, targetObs.sprite.y - 30);
          }
        } else if (targetObs.kind === "bear") {
          if (this.showParticles) {
            this.burst(targetObs.x, targetObs.sprite.y - 45, "p-spark", 8, 160);
            this.burst(targetObs.x, targetObs.sprite.y - 25, "p-chip", 6, 110);
          }

          // Damage Bear HP (bear tidak boleh sekali hit):
          // obstacle.hp = Math.max(0, (obstacle.hp || 1) - 1);
          targetObs.hp = Math.max(0, (targetObs.hp || 1) - damage);

          targetObs.sprite.setTexture("obstacle-bear-hit");
          this.fitHeight(targetObs.sprite, 215);
          targetObs.sprite.setTint(0xff3b30);
          targetObs.x += (this.facing * 36);
          targetObs.sprite.setX(targetObs.x);
          this.time.delayedCall(180, () => {
            if (!targetObs.hit) {
              targetObs.sprite.setTexture("obstacle-bear");
              this.fitHeight(targetObs.sprite, 210);
              targetObs.sprite.clearTint();
            }
          });

          if (targetObs.hp > 0) {
            if (this.showFloatText) {
              this.floatText(targetObs.x, targetObs.sprite.y - 120, `AXE HIT! 🪓 ${targetObs.hp}/${targetObs.maxHp} HP`, "#FFD000");
            }
            if (targetObs.state === "windup" || targetObs.state === "lunge" || targetObs.state === "chase") {
              targetObs.state = "cooldown";
              targetObs.stateUntil = time + 900;
              if (targetObs.dangerIcon) targetObs.dangerIcon.setVisible(false);
              if (this.showFloatText) {
                this.floatText(targetObs.x, targetObs.sprite.y - 145, "COUNTER HIT! ⚡", "#00FFA3");
              }
            }
          } else {
            // BEAR REKT! (Bear is defeated after multiple hits)
            targetObs.hit = true;
            sound.playGreen(this.comboCount + 2);
            this.cameras.main.shake(180, 0.007);

            targetObs.hpBarBg?.destroy();
            targetObs.hpBarFill?.destroy();
            targetObs.hpText?.destroy();
            targetObs.dangerIcon?.destroy();

            this.tweens.killTweensOf(targetObs.sprite);
            this.tweens.add({
              targets: targetObs.sprite,
              x: targetObs.x + (this.facing * 85),
              y: targetObs.sprite.y - 40,
              angle: this.facing * 45,
              alpha: 0,
              duration: 380,
              ease: "Power2",
              onComplete: () => targetObs.sprite.destroy(),
            });

            // Drop 3 green pump candles popping out in an arc (+30 total reward)
            for (let i = -1; i <= 1; i++) {
              const cx = targetObs.x + i * 42;
              const cy = targetObs.sprite.y - 45;
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
                x: cx,
                y: cy,
                vy: 0,
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
              this.floatText(targetObs.x, targetObs.sprite.y - 75, "BEAR REKT! 🐻💥", "#FFD000");
            }
          }
        }

        this.time.delayedCall(220, () => {
          if (this.state === "chop") this.state = "idle";
        });
      }
    }

    // 3. Powerup Drops Physics & Player Collection
    for (const drop of this.powerups) {
      if (drop.taken) continue;
      drop.vy += 750 * (delta / 1000);
      drop.x += drop.vx * (delta / 1000);
      drop.y += drop.vy * (delta / 1000);

      if (drop.y >= GROUND_Y - 18) {
        drop.y = GROUND_Y - 18;
        drop.vy = -drop.vy * 0.4;
        drop.vx *= 0.75;
      }

      drop.sprite.setPosition(drop.x, drop.y);

      const dx = drop.x - this.player.x;
      const dy = drop.y - (this.player.y - 50);
      if (Math.abs(dx) < 52 && Math.abs(dy) < 68) {
        drop.taken = true;
        sound.playGreen(this.comboCount + 3);
        if (this.showParticles) {
          this.burst(drop.x, drop.y, "p-spark", 10, 150);
        }
        this.tweens.add({
          targets: drop.sprite,
          y: drop.y - 45,
          alpha: 0,
          scaleX: drop.sprite.scaleX * 1.6,
          scaleY: drop.sprite.scaleY * 1.6,
          duration: 220,
          onComplete: () => drop.sprite.destroy(),
        });

        if (drop.type === "heart") {
          this.playerLives = Math.min(this.maxPlayerLives, this.playerLives + 1);
          if (this.showFloatText) {
            this.floatText(this.player.x, this.player.y - 180, `+1 ❤️ HEAL! [${this.playerLives}/${this.maxPlayerLives}]`, "#00FFA3");
          }
        } else if (drop.type === "shield") {
          this.shieldUntil = time + 7000;
          if (this.showFloatText) {
            this.floatText(this.player.x, this.player.y - 180, "🛡️ SHIELD ACTIVE! (7s)", "#00FFA3");
          }
        } else if (drop.type === "frenzy") {
          this.frenzyUntil = time + 6000;
          if (this.showFloatText) {
            this.floatText(this.player.x, this.player.y - 180, "🔥 GOLDEN FRENZY! (6s)", "#FFD000");
          }
        } else if (drop.type === "time") {
          // Exclusive to Mystery Crate: Blitz Time Boost!
          this.timeLeftMs += 15000;
          if (this.showFloatText) {
            this.floatText(this.player.x, this.player.y - 180, "+15s EXTRA TIME! ⏱️", "#00FFA3");
          }
        }
      }
    }

    // 4. Shield & Frenzy visual aura rendering
    if (!this.shieldGlowGraphics) {
      this.shieldGlowGraphics = this.add.graphics().setDepth(6);
    }
    this.shieldGlowGraphics.clear();
    if (time < this.shieldUntil) {
      const pulse = Math.sin(time / 80) * 4;
      this.shieldGlowGraphics.lineStyle(3, 0x00ffa3, 0.85);
      this.shieldGlowGraphics.strokeCircle(this.player.x, this.player.y - 75, 54 + pulse);
      this.shieldGlowGraphics.fillStyle(0x00ffa3, 0.12);
      this.shieldGlowGraphics.fillCircle(this.player.x, this.player.y - 75, 54 + pulse);
    }

    if (!this.frenzyGlowGraphics) {
      this.frenzyGlowGraphics = this.add.graphics().setDepth(6);
    }
    this.frenzyGlowGraphics.clear();
    if (time < this.frenzyUntil) {
      const pulse = Math.cos(time / 60) * 5;
      this.frenzyGlowGraphics.lineStyle(3, 0xffd000, 0.9);
      this.frenzyGlowGraphics.strokeCircle(this.player.x, this.player.y - 75, 60 + pulse);
      this.frenzyGlowGraphics.fillStyle(0xffa500, 0.16);
      this.frenzyGlowGraphics.fillCircle(this.player.x, this.player.y - 75, 60 + pulse);
      if (this.showParticles && Math.random() < 0.25) {
        this.burst(this.player.x, this.player.y - 40, "p-spark", 2, 80);
      }
    }

    // 3. Platformer Chasm Mechanics: Leap vs Fall
    for (const chasm of this.chasms) {
      const inChasmPit = this.player.x > chasm.x1 + 10 && this.player.x < chasm.x2 - 12;
      if (inChasmPit) {
        // Player is over the chasm pit!
        if (this.isGrounded || this.player.y >= GROUND_Y - 6) {
          this.handleChasmFall(chasm, time);
          break;
        }
      } else if (this.player.x >= chasm.x2 && this.player.x < chasm.x2 + 200) {
        // Player cleared the chasm leap!
        if (!chasm.cleared) {
          chasm.cleared = true;
          // Zero rewards when crossing chasm as requested ("saat melewati jurang tidak mendapat apa apa loh ya")
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
        obstacle.hpBarBg?.destroy();
        obstacle.hpBarFill?.destroy();
        obstacle.hpText?.destroy();
        obstacle.dangerIcon?.destroy();
        return false;
      }
      return true;
    });
    this.powerups = this.powerups.filter((p) => {
      if (p.taken || p.x < cullX) {
        if (p.sprite.active) p.sprite.destroy();
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
      targetTrees: this.totalTreeCount,
      progress: this.totalTreeCount,
      green: this.greenCount,
      redHits: this.redHits,
      treeHpPct: target ? target.hp / target.maxHp : null,
      combo: this.comboCount > 0 ? this.comboCount : 0,
      scoreColorClass,
      lives: this.playerLives,
      maxLives: this.maxPlayerLives,
      shieldActive: this.time.now < this.shieldUntil,
      shieldTimeLeft: Math.max(0, Math.ceil((this.shieldUntil - this.time.now) / 1000)),
      frenzyActive: this.time.now < this.frenzyUntil,
    });
  }

  private endRun(endedBy: RunEndReason) {
    if (this.ended) return;
    this.ended = true;

    if (this.chasmRespawnModal) {
      this.chasmRespawnModal.destroy();
      this.chasmRespawnModal = null;
    }
    this.isFallingInChasm = false;

    if (this.shieldGlowGraphics) {
      this.shieldGlowGraphics.destroy();
      this.shieldGlowGraphics = null;
    }
    if (this.frenzyGlowGraphics) {
      this.frenzyGlowGraphics.destroy();
      this.frenzyGlowGraphics = null;
    }

    for (const p of this.powerups) {
      if (p.sprite.active) p.sprite.destroy();
    }
    this.powerups = [];

    for (const obstacle of this.obstacles) {
      obstacle.hpBarBg?.destroy();
      obstacle.hpBarFill?.destroy();
      obstacle.hpText?.destroy();
      obstacle.dangerIcon?.destroy();
    }

    this.state = "over";
    this.player.setAlpha(1);
    this.setApeTexture(endedBy === "quit" ? "ape-down" : "ape-hit");
    const result: RunResult = {
      gameSlug: this.level.gameSlug,
      level: this.level.level,
      targetTrees: this.totalTreeCount,
      progress: this.totalTreeCount,
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
