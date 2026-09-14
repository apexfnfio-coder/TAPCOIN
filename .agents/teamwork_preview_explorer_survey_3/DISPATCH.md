## 2026-09-14T02:19:08Z
You are Explorer Survey 3 (Audio Chat & Stats Explorer).
Your working directory is: e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_3
You MUST read the authoritative requirements in: e:\TAPCOIN\.agents\ORIGINAL_REQUEST.md

Your mission is to survey the codebase specifically for:
- R5: Procedural 8-Bit Audio & Dynamic Hurry-Up Mode
  - Inspect `src/lib/sound.ts` and how audio is invoked in GameScene / UI.
  - Map out the current audio implementation.
  - Design the lightweight procedural retro-chiptune background music (BGM) synthesizer using the Web Audio API (zero extra MBs/assets to download).
  - Plan the dynamic tempo acceleration into Hurry-Up mode when timer <= 10 seconds.
  - Plan pentatonic pitch scaling for combo streaks, sound toggle, and volume control without stutter.
- R6: Chat Freeze Fix & Backend Global Stats Wiring
  - Inspect `src/app/api/chat/route.ts` and `src/components/GlobalChat.tsx`.
  - Investigate the 50-message freeze issue and design the fix: order by `createdAt: 'desc'` with `take: 50`, reversed for display.
  - Plan chat polling throttling: 15s when chat drawer is closed vs 3.5s when open.
  - Inspect `src/app/play/page.tsx` and `/api/stats/home` (or stats route): plan wiring real aggregate trees instead of hardcoded 142850.
- Build & Testing Environment:
  - Inspect package.json, scripts, dev/build commands, test frameworks, and live port 3000 smoke test setups.

Instructions:
1. Update `progress.md` in your working directory with timestamps and steps.
2. Produce a comprehensive, structured handoff report at:
   `e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_3\handoff.md`
   Detailing: exact files, sound synthesis architecture, API queries, database/Prisma schema if any, polling logic, and test harness details.
3. When finished, send a message to orchestrator with your findings and report path.
