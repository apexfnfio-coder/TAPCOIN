## 2026-09-14T02:25:50Z
You are Worker M5 (Procedural 8-Bit Audio & Hurry-Up).
Your working directory is: e:\TAPCOIN\.agents\teamwork_preview_worker_m5
You MUST read the authoritative requirements in: e:\TAPCOIN\.agents\ORIGINAL_REQUEST.md
Read also:
- e:\TAPCOIN\PROJECT.md
- e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_3\handoff.md

Your exclusive write ownership:
- src/lib/sound.ts

Tasks:
1. Implement centralized GainNode routing in src/lib/sound.ts:
   destination <- masterGain <- [bgmGain, sfxGain]
2. Implement zero-asset procedural 16-step retro-chiptune BGM synthesizer:
   - Voice 1: Square lead (arpeggio melody)
   - Voice 2: Triangle bass (walking bassline)
   - Voice 3: Noise percussion (hi-hat bursts & swept kicks)
   - Use Chris Wilson lookahead Web Audio scheduler (100ms lookahead, 25ms tick) for jitter-free timing.
3. Implement dynamic Hurry-Up mode:
   - setHurryUp(accelerate: boolean): dynamically accelerates tempo from 132 BPM to 176 BPM when true without glitching.
4. Implement pentatonic pitch scaling in playGreen(combo?: number):
   - 8-note pentatonic scale [880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32] climbing with consecutive green candles, plus fanfare flourish on combo >= 5.
5. Implement smooth volume control (setVolume, getVolume) and pop-free mute transitions via gain.setTargetAtTime(target, now, 0.03).
6. Run verification commands:
   - npx tsc --noEmit
   - node scripts/test-audit.mjs
7. Update progress.md, write handoff.md with verification results, and send completion message to parent orchestrator.
