import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { GameBridge, GameOptions } from "./types";

export interface TapGame {
  destroy: () => void;
  quit: () => void;
}

export async function createGame(
  parent: HTMLElement,
  opts: GameOptions,
  bridge: GameBridge
): Promise<TapGame> {
  const phaserModule = await import("phaser");
  const Phaser = phaserModule.default || phaserModule;

  const boot = new BootScene();
  const gameScene = new GameScene();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    transparent: false,
    backgroundColor: 0x06090c,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, transparent: false },
    fps: { target: 60 },
    scene: [boot, gameScene],
  });

  game.registry.set("opts", opts);
  game.registry.set("bridge", bridge);

  return {
    destroy: () => game.destroy(true),
    quit: () => gameScene.quitRun(),
  };
}
