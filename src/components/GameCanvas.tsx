"use client";

import { useEffect, useRef, useState } from "react";
import type { TapGame } from "@/game/engine";
import type { HudState, RunResult, GameOptions } from "@/game/types";
import { touchInput } from "@/game/types";

export function GameCanvas({
  opts,
  onEnd,
  onQuit,
}: {
  opts: GameOptions;
  onEnd: (r: RunResult) => void;
  onQuit: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<TapGame | null>(null);
  const endedRef = useRef(false);
  const [hud, setHud] = useState<HudState>({
    gameSlug: opts.defaultGameSlug,
    level: opts.initialLevel || 1,
    score: 0,
    timeLeft: opts.maxLevelDurationSec || opts.maxDurationSec || opts.runDurationSec,
    trees: 0,
    targetTrees: Math.max(1, Math.floor(opts.levelGoalBase || 4)),
    progress: 0,
    green: 0,
    redHits: 0,
    treeHpPct: null,
  });
  const [activeControls, setActiveControls] = useState({ left: false, right: false });

  useEffect(() => {
    let mounted = true;
    endedRef.current = false;
    document.body.dataset.gameActive = "true";

    setHud((current) => ({
      ...current,
      level: opts.initialLevel || 1,
      score: 0,
      trees: 0,
      progress: 0,
      green: 0,
      redHits: 0,
      treeHpPct: null,
    }));

    (async () => {
      const { createGame } = await import("@/game/engine");
      if (!mounted || !hostRef.current) return;
      gameRef.current = await createGame(hostRef.current, opts, {
        onHud: (value) => setHud(value),
        onReady: () => {},
        onEnd: (result) => {
          if (endedRef.current) return;
          endedRef.current = true;
          onEnd(result);
        },
      });
    })();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        event.preventDefault();
        touchInput.left = true;
        setActiveControls((value) => ({ ...value, left: true }));
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        event.preventDefault();
        touchInput.right = true;
        setActiveControls((value) => ({ ...value, right: true }));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        touchInput.left = false;
        setActiveControls((value) => ({ ...value, left: false }));
      }
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        touchInput.right = false;
        setActiveControls((value) => ({ ...value, right: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      mounted = false;
      document.body.dataset.gameActive = "false";
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gameRef.current?.destroy();
      gameRef.current = null;
      touchInput.left = false;
      touchInput.right = false;
    };
  }, [opts.initialLevel, onEnd]);

  const quit = () => {
    if (endedRef.current) return;
    gameRef.current?.quit();
  };

  const secs = hud.timeLeft;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const low = secs <= 10;
  const pct = Math.max(0, Math.min(100, (hud.progress / Math.max(1, hud.targetTrees)) * 100));

  const setControl = (side: "left" | "right", value: boolean) => {
    touchInput[side] = value;
    setActiveControls((current) => ({ ...current, [side]: value }));
  };

  return (
    <div className="game-shell">
      <div ref={hostRef} className="game-host" />

      <div className="rotate-prompt" role="status">
        <div className="rp-device" />
        <div className="rp-title">Rotate your phone</div>
        <p className="rp-sub">$TAP Chimp is built for landscape play. Turn your phone sideways.</p>
      </div>

      <div className="game-hud">
        <div className="hud-top">
          <div className="hud-box hud-level"><div className="k">Level</div><div className="v cream">{hud.level}</div></div>
          <div className="hud-box hud-goal"><div className="k">Trees</div><div className="v cream">{hud.progress}/{hud.targetTrees}</div></div>
          <div className="hud-box hud-score"><div className="k">Score</div><div className="v">{hud.score.toLocaleString()}</div></div>
          <div className="hud-box hud-time"><div className="k">Time</div><div className={`v cream ${low ? "danger-text" : ""}`}>{mm}:{ss}</div></div>
        </div>

        <div className="hud-level-progress" aria-label={`Level progress ${hud.progress} of ${hud.targetTrees}`}>
          <i style={{ width: `${pct}%` }} />
        </div>

        {hud.treeHpPct !== null && (
          <div className="hud-tree" aria-label="Current tree health">
            <div className={`hud-treebar ${hud.treeHpPct <= 0.35 ? "red" : ""}`}>
              <i style={{ width: `${Math.max(0, hud.treeHpPct * 100)}%` }} />
            </div>
          </div>
        )}

        <button className="hud-quit" onClick={quit}>END RUN</button>

        <div className="touch-controls">
          <button
            className={`touch-btn ${activeControls.left ? "is-active" : ""}`}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); setControl("left", true); }}
            onPointerUp={() => setControl("left", false)}
            onPointerCancel={() => setControl("left", false)}
            onPointerLeave={() => setControl("left", false)}
            aria-label="Move left"
          ><span className="arr">◀</span><span className="btn-label">LEFT</span><span className="kbd-hint">A</span></button>

          <button
            className={`touch-btn ${activeControls.right ? "is-active" : ""}`}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); setControl("right", true); }}
            onPointerUp={() => setControl("right", false)}
            onPointerCancel={() => setControl("right", false)}
            onPointerLeave={() => setControl("right", false)}
            aria-label="Move right"
          ><span className="btn-label">RIGHT</span><span className="arr">▶</span><span className="kbd-hint">D</span></button>
        </div>
      </div>
    </div>
  );
}
