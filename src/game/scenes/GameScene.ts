import Phaser from "phaser";
import { createTapChimpLevel, SeededTapChimpGenerator } from "@/modules/games/tap-chimp";
import type { LevelDefinition } from "@/modules/games/core/game.types";
import { GameBridge, GameOptions, RunEndReason, RunResult, touchInput } from "../types";

const VIEW_W = 1280;
const VIEW_H = 720;
const GROUND_Y = 570;
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
    this.layers = [];
    this.trees = [];
    this.candles = [];
    this.obstacles = [];
    this.nextTreeX = 1000;
    this.nextCandleAt = 1600;
    this.lastChopAt = 0;
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
    addLayer("bg-ground", 1, 345);
    addLayer("bg-front", 1.35, 370);

    this.cameras.main.setBounds(-240, 0, 1_000_000, VIEW_H);

    this.player = this.add.image(300, GROUND_Y, "ape-idle").setOrigin(0.5, 1).setDepth(7);
    this.setApeTexture("ape-idle");
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09, -150, 0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.startedAt = this.time.now;
    this.timeLeftMs = this.level.maxDurationSec * 1000;
    this.reportHud();
    this.bridge.onReady();
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
    const rawHeight = this.rng.int(68, 118);
    const y = GROUND_Y - rawHeight;
    const sprite = this.add.image(x, y, kind === "green" ? "candle-green" : "candle-red").setDepth(8).setScale(0.45);
    this.tweens.add({ targets: sprite, y: y - 6, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.candles.push({ sprite, kind, baseY: y, phase: this.rng.nextCandlePhase(), taken: false });
  }

  private spawnObstacle(x: number) {
    const roll = this.rng.next();
    const kind: Obstacle["kind"] = roll < 0.38 ? "rat" : roll < 0.72 ? "mop" : "branch";
    const key = `obstacle-${kind}`;
    const y = kind === "branch" ? GROUND_Y - 190 : GROUND_Y - (kind === "mop" ? 54 : 42);
    const sprite = this.add.image(x, y, key).setDepth(8);
    const targetHeight = kind === "branch" ? 88 : kind === "mop" ? 92 : 64;
    this.fitHeight(sprite, targetHeight);
    if (kind === "branch") sprite.setAngle(this.rng.int(-12, 12));
    this.tweens.add({ targets: sprite, y: y - 5, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.obstacles.push({ sprite, kind, x, y, speed: this.rng.int(0, 20), hit: false });
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

    tree.hp -= 1;
    this.tweens.add({ targets: tree.sprite, x: tree.x + Phaser.Math.Between(-5, 5), duration: 50, yoyo: true, repeat: 1, onComplete: () => tree.sprite.setX(tree.x) });
    this.burst(tree.x + (this.player.x < tree.x ? -26 : 26), GROUND_Y - 82, "p-chip", 7, 200);
    this.burst(tree.x + (this.player.x < tree.x ? -28 : 28), GROUND_Y - 95, "p-spark", 2, 80);

    if (tree.hp <= 0) {
      tree.alive = false;
      this.setTreeTexture(tree, "tree-5", STUMP_HEIGHT);
      tree.sprite.setY(GROUND_Y + 2);
      this.levelTreeCount += 1;
      this.totalTreeCount += 1;
      this.score += this.opts.pointsPerTree;
      this.cameras.main.shake(130, 0.0055);
      this.burst(tree.x, GROUND_Y - 55, "p-chip", 14, 300);
      this.burst(tree.x, GROUND_Y - 130, "p-leaf", 8, 180);
      this.burst(tree.x, GROUND_Y - 10, "p-dust", 6, 120);
      this.floatText(tree.x, GROUND_Y - 220, `+${this.opts.pointsPerTree}`, "#f2b53c");
    } else {
      this.setTreeTexture(tree, this.treeTextureFor(tree));
      if (this.rng.chance(0.35)) this.burst(tree.x, GROUND_Y - 145, "p-leaf", 2, 110);
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
    for (const candle of this.candles) candle.sprite.destroy();
    for (const obstacle of this.obstacles) obstacle.sprite.destroy();
    this.trees = [];
    this.candles = [];
    this.obstacles = [];
    this.levelTreeCount = 0;
    this.redHits = 0;
    this.level = createTapChimpLevel(nextLevelNumber, this.opts, `${this.opts.defaultGameSlug}:${nextLevelNumber}`);
    this.rng = new SeededTapChimpGenerator(`${this.level.seed}:${Date.now()}`);
    this.nextTreeX = this.player.x + 560;
    this.nextCandleAt = this.time.now + 1600;
    this.lastChopAt = this.time.now;
    this.timeLeftMs = this.level.maxDurationSec * 1000;
    this.state = "idle";
    this.setApeTexture("ape-idle");
    this.levelBanner();
    this.reportHud();
  }

  private collectCandle(candle: Candle) {
    candle.taken = true;
    if (candle.kind === "green") {
      this.greenCount += 1;
      this.score += this.opts.pointsPerGreen;
      this.floatText(candle.sprite.x, candle.sprite.y - 24, `+${this.opts.pointsPerGreen}`, "#55ffad");
      this.burst(candle.sprite.x, candle.sprite.y, "p-spark", 5, 120);
    } else {
      if (this.time.now < this.hitUntil) { candle.taken = false; return; }
      this.redHits += 1;
      this.hitUntil = this.time.now + 1200;
      this.timeLeftMs = Math.max(0, this.timeLeftMs - this.opts.redHitPenaltySec * 1000);
      this.score = Math.max(0, this.score - this.opts.redHitScorePenalty);
      this.state = "hit";
      this.setApeTexture("ape-hit");
      this.cameras.main.shake(150, 0.006);
      this.cameras.main.flash(130, 220, 70, 40);
      this.floatText(this.player.x, this.player.y - 170, `-${this.opts.redHitScorePenalty}`, "#ff6a5c");
      this.time.delayedCall(520, () => { if (this.state === "hit") this.state = "idle"; });
    }
    this.tweens.killTweensOf(candle.sprite);
    this.tweens.add({ targets: candle.sprite, alpha: 0, y: candle.sprite.y - 35, duration: 200, onComplete: () => candle.sprite.destroy() });
  }

  update(time: number, delta: number) {
    if (this.ended) return;

    this.timeLeftMs = Math.max(0, this.timeLeftMs - delta);
    if (this.timeLeftMs <= 0) return this.endRun("failed");

    const left = this.cursors.left.isDown || this.keyA.isDown || touchInput.left;
    const right = this.cursors.right.isDown || this.keyD.isDown || touchInput.right;
    const vx = (right ? 1 : 0) - (left ? 1 : 0);

    if (this.state !== "hit" && vx !== 0) {
      const nextX = Math.max(90, this.player.x + vx * this.level.playerSpeed * (delta / 1000));
      const blocker = this.trees.find((tree) => tree.alive && Math.abs(tree.x - nextX) < BLOCK_DIST && Math.sign(tree.x - this.player.x) === vx);
      if (!blocker) this.player.x = nextX;
      this.facing = vx > 0 ? 1 : -1;
      if (this.state !== "chop") {
        this.state = "walk";
        this.setApeTexture(Math.floor(time / 150) % 2 === 0 ? "ape-walk1" : "ape-walk2");
      }
    }

    const target = this.targetTree();
    if (this.state !== "hit" && target) {
      this.state = "chop";
      if (time - this.lastChopAt >= this.level.chopIntervalMs) this.chop(target, time);
    } else if (this.state === "chop") {
      this.state = "idle";
    } else if (this.state === "walk" && vx === 0) {
      this.state = "idle";
    }

    if (this.state === "idle") this.setApeTexture("ape-idle");
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
    const obstacleInterval = Math.max(1700, 5200 - this.level.level * 55);
    const lastObstacle = this.obstacles.length ? this.obstacles[this.obstacles.length - 1] : null;
    const canSpawnObstacle = !lastObstacle || lastObstacle.x < this.player.x + VIEW_W * 0.65;
    if (canSpawnObstacle && this.rng.chance(delta / obstacleInterval)) {
      this.spawnObstacle(this.player.x + this.rng.int(650, 1050));
    }

    for (const candle of this.candles) {
      if (candle.taken) continue;
      const dx = candle.sprite.x - this.player.x;
      const dy = candle.sprite.y - (this.player.y - 70);
      if (Math.abs(dx) < 48 && Math.abs(dy) < 72) this.collectCandle(candle);
    }

    for (const obstacle of this.obstacles) {
      if (obstacle.hit || this.state === "hit") continue;
      const dx = obstacle.sprite.x - this.player.x;
      const dy = obstacle.sprite.y - (this.player.y - 55);
      const hitRange = obstacle.kind === "branch" ? 62 : 52;
      if (Math.abs(dx) < hitRange && Math.abs(dy) < 70) {
        obstacle.hit = true;
        this.redHits += 1;
        this.timeLeftMs = Math.max(0, this.timeLeftMs - Math.max(1, Math.round(this.opts.redHitPenaltySec * 0.75)) * 1000);
        this.score = Math.max(0, this.score - Math.max(1, Math.round(this.opts.redHitScorePenalty * 0.6)));
        this.hitUntil = this.time.now + 850;
        this.state = "hit";
        this.setApeTexture("ape-hit");
        this.cameras.main.shake(120, 0.0045);
        this.floatText(this.player.x, this.player.y - 160, "WATCH OUT", "#ff6a5c");
        this.tweens.killTweensOf(obstacle.sprite);
        this.tweens.add({ targets: obstacle.sprite, alpha: 0, x: obstacle.sprite.x + (this.player.x < obstacle.sprite.x ? 24 : -24), duration: 180, onComplete: () => obstacle.sprite.destroy() });
        this.time.delayedCall(480, () => { if (this.state === "hit") this.state = "idle"; });
      }
    }

    for (const layer of this.layers) layer.tile.tilePositionX = this.cameras.main.scrollX * layer.factor;

    if (this.levelTreeCount >= this.level.targetTrees) this.advanceLevel();
    this.reportHud();

    const cullX = this.player.x - VIEW_W * 2.5;
    this.trees = this.trees.filter((tree) => {
      if (!tree.alive && tree.x < cullX) { tree.sprite.destroy(); return false; }
      return true;
    });
    this.candles = this.candles.filter((candle) => {
      if (candle.taken) return false;
      if (candle.sprite.x < cullX) { candle.sprite.destroy(); return false; }
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
    });
  }

  private endRun(endedBy: RunEndReason) {
    if (this.ended) return;
    this.ended = true;
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
