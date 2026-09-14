"use client";

import { useEffect, useState } from "react";
import { strings } from "@/i18n/strings";
import { sound } from "@/lib/sound";

interface TutorialOverlayProps {
  onComplete: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: strings.tutorial.step1Title,
      desc: strings.tutorial.step1Desc,
      media: (
        <div className="tutorial-candle-stage">
          <div className="tutorial-glow tutorial-glow-green" />
          <img src="/assets/candle-green.png" alt="Green Candle" className="tutorial-candle-img pulse-float" />
          <div className="tutorial-badge green-badge">▲ +10 PTS</div>
        </div>
      ),
    },
    {
      title: strings.tutorial.step2Title,
      desc: strings.tutorial.step2Desc,
      media: (
        <div className="tutorial-candle-stage">
          <div className="tutorial-glow tutorial-glow-red" />
          <img src="/assets/candle-red.png" alt="Red Candle" className="tutorial-candle-img pulse-float" />
          <div className="tutorial-badge red-badge">▼ −25 PTS & −3s</div>
        </div>
      ),
    },
    {
      title: strings.tutorial.step3Title,
      desc: strings.tutorial.step3Desc,
      media: (
        <div className="tutorial-chart-stage">
          <div className="tutorial-chart-grid" />
          <div className="tutorial-chart-line" />
          <div className="tutorial-ape-preview">
            <img src="/assets/ape/idle.png" alt="$TAP Ape" className="tutorial-ape-img" />
          </div>
          <div className="tutorial-badge gold-badge">∞ INFINITE LEVELS</div>
        </div>
      ),
    },
  ];

  const handleFinish = () => {
    sound.playClick();
    if (typeof window !== "undefined") {
      localStorage.setItem("tap_tutorial_completed", "1");
    }
    onComplete();
  };

  const handleNext = () => {
    sound.playClick();
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleFinish();
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" && step > 0) {
        e.preventDefault();
        setStep((s) => s - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step]);

  const current = steps[step];

  return (
    <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-modal">
        <div className="tutorial-header">
          <div className="tutorial-step-indicator">
            STEP {step + 1} OF {steps.length}
          </div>
          <button
            type="button"
            className="tutorial-close-btn"
            onClick={handleFinish}
            aria-label={strings.tutorial.skip}
          >
            ✕
          </button>
        </div>

        <div className="tutorial-body">
          <div className="tutorial-visual-container">
            {current.media}
          </div>

          <h2 id="tutorial-title" className="tutorial-title">
            {current.title}
          </h2>
          <p className="tutorial-desc">
            {current.desc}
          </p>
        </div>

        <div className="tutorial-footer">
          {/* Progress dots */}
          <div className="tutorial-dots" role="tablist" aria-label="Tutorial steps">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`tutorial-dot ${i === step ? "is-active" : ""}`}
                onClick={() => {
                  sound.playClick();
                  setStep(i);
                }}
                aria-label={`Go to step ${i + 1}`}
                aria-selected={i === step}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="tutorial-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleFinish}
            >
              {strings.tutorial.skip}
            </button>
            <button
              type="button"
              className="btn btn-gold btn-sm glow-cta"
              onClick={handleNext}
            >
              {step < steps.length - 1 ? strings.tutorial.next : strings.tutorial.start}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
