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
const PLAYER_HEIGHT = 232;
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
  kind: "mop" | "rat" | "branch";
  x: number;
  y: number;
  speed: number;
  hit: boolean;
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
  private hitStopUntil = 0;
  private layers: { tile: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private trees: Tree[] = [];
  private candles: Candle[] = [];
  private obstacles: Obstacle[] = [];
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

    // Pre-spawn immediate obstacles along the road
    this.spawnObstacle(750);
    this.spawnObstacle(1180);

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

  private spawnObstacle(x: number) {
    const roll = this.rng.next();
    const kind: Obstacle["kind"] = roll < 0.38 ? "rat" : roll < 0.72 ? "mop" : "branch";
    const key = `obstacle-${kind}`;
    const y = kind === "branch" ? GROUND_Y - 110 : GROUND_Y - (kind === "mop" ? 44 : 20);
    const sprite = this.add.image(x, y, key).setDepth(8);
    const targetHeight = kind === "branch" ? 82 : kind === "mop" ? 86 : 46;
    this.fitHeight(sprite, targetHeight);
    if (kind === "branch") {
      sprite.setAngle(this.rng.int(-12, 12));
      this.tweens.add({ targets: sprite, y: y - 8, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (kind === "mop") {
      sprite.setAngle(this.rng.int(-8, 8));
      this.tweens.add({ targets: sprite, angle: sprite.angle + (sprite.angle > 0 ? -5 : 5), duration: 800, yoyo: true, repeat: -1 });
    } else {
      // Rat scurrying motion
      this.tweens.add({ targets: sprite, y: y - 4, duration: 180, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    this.obstacles.push({ sprite, kind, x, y, speed: kind === "rat" ? this.rng.int(35, 65) : 0, hit: false });
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
    this.trees = [];
    this.candles = [];
    this.obstacles = [];
    this.levelTreeCount = 0;
    // Note: this.redHits is intentionally cumulative across the entire run (like greenCount & totalTreeCount)
    // so that client-server score verification matches total penalties.
    this.level = createTapChimpLevel(nextLevelNumber, this.opts, `${this.opts.defaultGameSlug}:${nextLevelNumber}`);
    this.rng = new SeededTapChimpGenerator(`${this.level.seed}:${Date.now()}`);
    this.spawnTree(this.player.x + 360);
    this.spawnTree(this.player.x + 720);
    this.nextTreeX = this.player.x + 1080;
    this.nextCandleAt = this.time.now + 1600;
    this.lastChopAt = this.time.now;
    this.timeLeftMs = this.level.maxDurationSec * 1000;
    this.state = "idle";
    this.setApeTexture("ape-idle");
    this.levelBanner();
    this.spawnObstacle(this.player.x + 650);
    this.spawnObstacle(this.player.x + 1120);
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
      this.spawnTree(this.nextTreeX);
      this.nextTreeX += this.rng.nextTreeSpacing(this.level);
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
      const hitRange = obstacle.kind === "branch" ? 62 : 52;

      // Jumping over ground hazards (rat, mop)
      if (!this.isGrounded && this.player.y < obstacle.sprite.y - 20) {
        continue;
      }

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
        this.floatText(this.player.x, this.player.y - 160, `-${deltaPenalty}`, "#ff6a5c");
        this.tweens.killTweensOf(obstacle.sprite);
        this.tweens.add({ targets: obstacle.sprite, alpha: 0, x: obstacle.sprite.x + (this.player.x < obstacle.sprite.x ? 24 : -24), duration: 180, onComplete: () => obstacle.sprite.destroy() });
        this.time.delayedCall(480, () => { if (this.state === "hit") this.state = "idle"; });
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
