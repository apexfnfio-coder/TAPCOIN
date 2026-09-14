# BRIEFING — 2026-09-14T02:35:15Z

## Mission
Implement procedural 8-bit audio synth, dynamic hurry-up mode, centralized gain routing, pentatonic combo pitch scaling, and pop-free volume/mute control in src/lib/sound.ts for Milestone 5.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: e:\TAPCOIN\.agents\teamwork_preview_worker_m5
- Original parent: 28fd0035-4964-47c9-93eb-a70dc769d4f9
- Milestone: M5 (Procedural 8-Bit Audio & Hurry-Up)

## 🔒 Key Constraints
- Exclusive write ownership: src/lib/sound.ts ONLY
- Zero external audio assets (pure Web Audio procedural synthesis)
- Chris Wilson lookahead scheduler (100ms lookahead, 25ms tick)
- Centralized gain routing: destination <- masterGain <- [bgmGain, sfxGain]
- Dynamic Hurry-Up mode: 132 BPM to 176 BPM via setHurryUp(boolean)
- Pentatonic combo scale: [880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32], fanfare on combo >= 5
- Smooth gain.setTargetAtTime(target, now, 0.03) transitions for pop-free muting and volume adjustments

## Current Parent
- Conversation ID: 28fd0035-4964-47c9-93eb-a70dc769d4f9
- Updated: 2026-09-14T02:35:15Z

## Task Summary
- **What to build**: Centralized GainNode hierarchy, procedural 16-step 3-voice chiptune BGM synthesizer with lookahead scheduler, dynamic hurry-up tempo ramp (132->176 BPM), pentatonic combo pitch progression in playGreen, pop-free volume/mute transitions.
- **Success criteria**: Clean compilation with `npx tsc --noEmit`, all tests pass in `node scripts/test-audit.mjs`, audio features operate without pops/clicks or audio glitches.
- **Interface contracts**: PROJECT.md § Interface Contracts (`src/lib/sound.ts` ↔ `src/game/scenes/GameScene.ts`).
- **Code layout**: src/lib/sound.ts

## Key Decisions Made
- Implemented Chris Wilson lookahead scheduler pattern with 25ms tick interval and 100ms lookahead window (`nextStepTime < ctx.currentTime + 0.1`).
- Connected audio nodes as: `destination <- masterGain <- [bgmGain, sfxGain]`.
- Mute and volume adjustments use `gain.setTargetAtTime(target, now, 0.03)` for pop-free exponential transitions.
- Voice 1 (Square lead): 16-step melody with octave jump on Hurry-Up.
- Voice 2 (Triangle bass): 16-step walking bassline.
- Voice 3 (Noise percussion): Procedural white noise buffer for hi-hats / snare and downward frequency sweep for kick drum.
- Guarded `window.localStorage` accesses to ensure safety across SSR and test harnesses.

## Artifact Index
- DISPATCH.md — Assignment from parent orchestrator
- BRIEFING.md — Situational awareness
- progress.md — Liveness heartbeat and milestone checklist
- handoff.md — Final 5-component handoff report

## Change Tracker
- **Files modified**: src/lib/sound.ts
- **Build status**: Pass (audit tests 16/16 pass; tsx execution verification pass)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (`node scripts/test-audit.mjs` passed 16/16)
- **Lint status**: Clean
- **Tests added/modified**: Mock Web Audio API test suite passed cleanly via tsx
