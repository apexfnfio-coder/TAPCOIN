"use client";

import { useEffect, useRef, useState } from "react";
import type { TapGame } from "@/game/engine";
import type { HudState, RunResult, GameOptions } from "@/game/types";
import { touchInput } from "@/game/types";
import { sound } from "@/lib/sound";
import { strings } from "@/i18n/strings";

interface GameCanvasProps {
  opts: GameOptions;
  onEnd: (r: RunResult) => void;
  onQuit: () => void;
  colorblindMode?: boolean;
  isDemo?: boolean;
}

export function GameCanvas({
  opts,
  onEnd,
  onQuit,
  colorblindMode = false,
  isDemo = false,
}: GameCanvasProps) {
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
    combo: 0,
    scoreColorClass: "",
    lives: 4,
    maxLives: 4,
    shieldActive: false,
    shieldTimeLeft: 0,
    frenzyActive: false,
  });

  const [activeControls, setActiveControls] = useState({ left: false, right: false, jump: false });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [dismissedRotatePrompt, setDismissedRotatePrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("tap_dismiss_rotate_prompt") === "1";
    }
    return false;
  });
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  // Animated score lerp (rAF lerp, 300-500ms easing)
  const [displayScore, setDisplayScore] = useState(0);
  const currentScoreRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Detect mobile orientation changes and trigger Phaser scale refresh
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth <= 768;
      setIsPortraitMobile(isPortrait);
    };

    const handleResize = () => {
      checkOrientation();
      if (gameRef.current?.refreshScale) {
        gameRef.current.refreshScale();
      }
      // Re-trigger scale refresh after mobile browser UI (URL bar/navigation) settles
      setTimeout(() => {
        gameRef.current?.refreshScale?.();
      }, 120);
      setTimeout(() => {
        gameRef.current?.refreshScale?.();
      }, 320);
    };

    checkOrientation();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Initialize sound mute state
  useEffect(() => {
    setIsMuted(sound.isMuted());
  }, []);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Smooth lerp for score updates (avoids sudden jumps, disabled on reduced motion)
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayScore(hud.score);
      currentScoreRef.current = hud.score;
      return;
    }

    const target = hud.score;
    const start = currentScoreRef.current;
    if (start === target) return;

    const startTime = performance.now();
    const duration = 350; // 350ms easing

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(start + (target - start) * eased);
      setDisplayScore(val);
      currentScoreRef.current = val;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayScore(target);
        currentScoreRef.current = target;
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hud.score, prefersReducedMotion]);

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
      combo: 0,
      scoreColorClass: "",
      lives: 4,
      maxLives: 4,
      shieldActive: false,
      shieldTimeLeft: 0,
      frenzyActive: false,
    }));
    setDisplayScore(0);
    currentScoreRef.current = 0;

    (async () => {
      const { createGame } = await import("@/game/engine");
      if (!mounted || !hostRef.current) return;

      const gameOptions: GameOptions = {
        ...opts,
        colorblindMode,
        prefersReducedMotion,
      };

      gameRef.current = await createGame(hostRef.current, gameOptions, {
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
      sound.init();
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
      if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        touchInput.jump = true;
        setActiveControls((value) => ({ ...value, jump: true }));
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
      if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        touchInput.jump = false;
        setActiveControls((value) => ({ ...value, jump: false }));
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
      touchInput.jump = false;
    };
  }, [opts, onEnd, colorblindMode, prefersReducedMotion]);

  const quit = () => {
    if (endedRef.current) return;
    sound.playClick();
    gameRef.current?.quit();
  };

  const handleSoundToggle = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const setControl = (side: "left" | "right" | "jump", value: boolean) => {
    sound.init();
    touchInput[side] = value;
    setActiveControls((current) => ({ ...current, [side]: value }));
  };

  return (
    <div className="game-shell">
      <div ref={hostRef} className="game-host" />

      {/* Mobile orientation prompt with dismissible option */}
      {isPortraitMobile && !dismissedRotatePrompt && (
        <div className="rotate-prompt" role="status">
          <button
            type="button"
            className="rp-close-btn"
            onClick={() => {
              sound.playClick();
              try { sessionStorage.setItem("tap_dismiss_rotate_prompt", "1"); } catch {}
              setDismissedRotatePrompt(true);
              setTimeout(() => gameRef.current?.refreshScale?.(), 50);
            }}
            aria-label="Tutup dan tetap main"
          >
            ✕
          </button>
          <div className="rp-device" />
          <div className="rp-title">Rotate Phone for Best View</div>
          <p className="rp-sub">
            $TAP Chop runs best in landscape. You can rotate your phone sideways, or continue playing in portrait mode below.
          </p>
          <button
            type="button"
            className="rp-dismiss-btn"
            onClick={() => {
              sound.playClick();
              try { sessionStorage.setItem("tap_dismiss_rotate_prompt", "1"); } catch {}
              setDismissedRotatePrompt(true);
              setTimeout(() => gameRef.current?.refreshScale?.(), 50);
            }}
          >
            Play in Portrait Mode (Tetap Main) 🎮
          </button>
        </div>
      )}

      <div className="game-hud">
        <div className="hud-top">
          <div className="hud-top-cluster hud-top-left">
            <div className="hud-box hud-lives" title={`Lives: ${hud.lives ?? 4}/${hud.maxLives ?? 4}`}>
              <div className="k">Lives</div>
              <div className="v hud-hearts">
                {Array.from({ length: hud.maxLives ?? 4 }).map((_, i) => (
                  <span key={i} className={`hud-heart ${i < (hud.lives ?? 4) ? "is-alive" : "is-empty"}`}>
                    {i < (hud.lives ?? 4) ? "❤️" : "🤍"}
                  </span>
                ))}
              </div>
            </div>
            <div className="hud-box hud-trees">
              <div className="k">Chopped</div>
              <div className="v cream">{hud.trees} 🌲</div>
            </div>
            {/* Demo Mode badge inside left cluster */}
            {isDemo && (
              <div className="hud-demo-badge" role="status" aria-label="Demo mode active">
                <span className="demo-dot" />
                <span>{strings.demoBadge}</span>
              </div>
            )}
          </div>

          <div className="hud-top-cluster hud-top-center">
            <div className="hud-box hud-score">
              <div className="k">Score</div>
              <div className={`v ${hud.scoreColorClass || ""}`} data-score-value={displayScore}>
                {displayScore.toLocaleString("en-US")}
              </div>
            </div>
            {(hud.shieldActive || hud.frenzyActive) && (
              <div className="hud-buffs-container">
                {hud.shieldActive && (
                  <div className="hud-buff-badge shield-buff pulse-buff">
                    <span>🛡️</span> SHIELD {hud.shieldTimeLeft}s
                  </div>
                )}
                {hud.frenzyActive && (
                  <div className="hud-buff-badge frenzy-buff pulse-buff">
                    <span>🔥</span> FRENZY!
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hud-top-cluster hud-top-right">
            <button
              type="button"
              className="hud-sound-toggle"
              onClick={handleSoundToggle}
              aria-label={isMuted ? strings.soundOff : strings.soundOn}
              title={isMuted ? strings.soundOff : strings.soundOn}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            <button type="button" className="hud-quit" onClick={quit}>
              {strings.endRun}
            </button>
          </div>
        </div>

        {/* Phase 3: Combo counter */}
        {hud.combo && hud.combo > 1 && (
          <div className="hud-combo pulse-combo" aria-label={`Combo: ${hud.combo} chained green candles`}>
            <span className="combo-fire" aria-hidden="true">🔥</span>
            <span className="combo-num">{hud.combo}x</span>
            <span className="combo-txt">STREAK</span>
          </div>
        )}

        {/* Current tree HP bar */}
        {hud.treeHpPct !== null && (
          <div className="hud-tree" aria-label="Current tree health">
            <div className={`hud-treebar ${hud.treeHpPct <= 0.35 ? "red" : ""}`}>
              <i style={{ width: `${Math.max(0, hud.treeHpPct * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Mobile touch controls: Left/Right movement on left, Jump leap on right */}
        <div className="touch-controls">
          <div className="touch-nav-group">
            <button
              type="button"
              className={`touch-btn touch-btn-nav ${activeControls.left ? "is-active" : ""}`}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); setControl("left", true); }}
              onPointerUp={() => setControl("left", false)}
              onPointerCancel={() => setControl("left", false)}
              onPointerLeave={() => setControl("left", false)}
              aria-label="Move left"
            >
              <span className="arr">◀</span>
              <span className="btn-label">LEFT</span>
              <span className="kbd-hint">A</span>
            </button>

            <button
              type="button"
              className={`touch-btn touch-btn-nav ${activeControls.right ? "is-active" : ""}`}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); setControl("right", true); }}
              onPointerUp={() => setControl("right", false)}
              onPointerCancel={() => setControl("right", false)}
              onPointerLeave={() => setControl("right", false)}
              aria-label="Move right"
            >
              <span className="btn-label">RIGHT</span>
              <span className="arr">▶</span>
              <span className="kbd-hint">D</span>
            </button>
          </div>

          <div className="touch-action-group">
            <button
              type="button"
              className={`touch-btn touch-btn-jump ${activeControls.jump ? "is-active" : ""}`}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); setControl("jump", true); }}
              onPointerUp={() => setControl("jump", false)}
              onPointerCancel={() => setControl("jump", false)}
              onPointerLeave={() => setControl("jump", false)}
              aria-label="Jump over red candles and hazards"
            >
              <span className="arr">▲</span>
              <span className="btn-label">JUMP</span>
              <span className="kbd-hint">SPACE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
