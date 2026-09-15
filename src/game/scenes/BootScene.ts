import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    // ---- loading screen (PNG bundle is heavy — keep the player informed) ----
    const W = 1280;
    const H = 720;
    const barW = 460;
    const barH = 16;
    const barX = (W - barW) / 2;
    const barY = H / 2 + 10;

    this.add.rectangle(W / 2, H / 2, W, H, 0x06090c);

    const label = this.add
      .text(W / 2, H / 2 - 40, "LOADING… 0%", {
        fontFamily: "Arial Black",
        fontSize: "24px",
        color: "#F4F6F8",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H / 2 + 58, "Tip: green candles = bonus, red = danger", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#9DA8B3",
      })
      .setOrigin(0.5);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x0e151c, 1);
    barBg.fillRoundedRect(barX - 3, barY - 3, barW + 6, barH + 6, 8);
    barBg.lineStyle(1, 0x162432, 1);
    barBg.strokeRoundedRect(barX - 3, barY - 3, barW + 6, barH + 6, 8);

    const bar = this.add.graphics();
    this.load.on("progress", (p: number) => {
      bar.clear();
      bar.fillStyle(0xFFD000, 1);
      bar.fillRoundedRect(barX, barY, Math.max(8, barW * p), barH, 6);
      label.setText(`LOADING… ${Math.round(p * 100)}%`);
    });

    // ape states (loaded from PNG)
    this.load.image("ape-idle", "/assets/ape/idle.png");
    this.load.image("ape-walk1", "/assets/ape/walk1.png");
    this.load.image("ape-walk2", "/assets/ape/walk2.png");
    this.load.image("ape-chop1", "/assets/ape/chop1.png");
    this.load.image("ape-chop2", "/assets/ape/chop2.png");
    this.load.image("ape-hit", "/assets/ape/hit.png");
    this.load.image("ape-celebrate", "/assets/ape/celebrate.png");
    this.load.image("ape-down", "/assets/ape/down.png");

    // trees (loaded from PNG)
    for (let i = 1; i <= 5; i++) this.load.image(`tree-${i}`, `/assets/tree/t${i}.png`);

    // candles (PNG assets for consistent browser rendering)
    this.load.image("candle-green", "/assets/candle-green.png");
    this.load.image("candle-red", "/assets/candle-red.png");

    // gameplay obstacles / props / powerups (PNG assets)
    this.load.image("prop-sign", "/assets/props/sign.png");
    this.load.image("obstacle-bear", "/assets/props/bear.png");
    this.load.image("obstacle-bear-attack", "/assets/props/bear-attack.png");
    this.load.image("obstacle-bear-hit", "/assets/props/bear-hit.png");
    this.load.image("prop-crate", "/assets/props/mystery-crate.png");
    this.load.image("powerup-heart", "/assets/props/powerup-heart.png");
    this.load.image("powerup-shield", "/assets/props/powerup-shield.png");
    this.load.image("powerup-frenzy", "/assets/props/powerup-frenzy.png");
    this.load.image("powerup-time", "/assets/props/powerup-time.png");

    // particles (PNG assets)
    this.load.image("p-chip", "/assets/particles/chip.png");
    this.load.image("p-leaf", "/assets/particles/leaf.png");
    this.load.image("p-dust", "/assets/particles/dust.png");
    this.load.image("p-spark", "/assets/particles/spark.png");

    // background layers (loaded from PNG)
    this.load.image("bg-sky", "/assets/bg/sky.png");
    this.load.image("bg-far", "/assets/bg/far.png");
    this.load.image("bg-mid", "/assets/bg/mid.png");
    this.load.image("bg-ground", "/assets/bg/ground.png");
    this.load.image("bg-front", "/assets/bg/front.png");
  }

  create() {
    this.scene.start("game", {
      opts: this.registry.get("opts"),
      bridge: this.registry.get("bridge"),
    });
  }
}
