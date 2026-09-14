# BRIEFING — 2026-09-14T02:19:30Z

## Mission
Survey codebase for R1 (Copywriting De-slop & Authentic Degen Arcade Voice) and R3 (Arcade Cabinet Lobby Restructure & Redundancy Reduction), producing an actionable, detailed handoff report.

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend_copy_lobby_explorer
- Working directory: e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_1
- Original parent: 28fd0035-4964-47c9-93eb-a70dc769d4f9
- Milestone: survey_phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes directly in source code
- Adhere to Teamwork protocol (file handoff + messaging)
- Authoritative requirements derived from `e:\TAPCOIN\.agents\ORIGINAL_REQUEST.md`

## Current Parent
- Conversation ID: 28fd0035-4964-47c9-93eb-a70dc769d4f9
- Updated: 2026-09-14T02:19:30Z

## Investigation State
- **Explored paths**:
  - `src/i18n/strings.ts`: Cataloged all copy, corporate phrasing, placeholders, and TODO notes.
  - `src/app/page.tsx` & `src/app/play/page.tsx`: Analyzed home lobby layout, hero section, mascot presentation, How to Play section redundancy.
  - `src/app/how-to-play/page.tsx`: Analyzed full guide deck and hardcoded copy.
  - `src/components/*`: Checked Nav, Footer, ResultsPanel, TutorialOverlay, GlobalChat, LiveTicker, WalletBadges, WalletButton, WeaponLoadout, GameCanvas.
  - `scripts/smoke-test.mjs`: Found critical smoke test string checks ("$TAP CHOP GAME", "Phantom", "How to Play", "Solana").
- **Key findings**:
  - Direct duplication between `src/app/play/page.tsx` rules section and `/how-to-play`.
  - Stiff corporate AI copy exists in `strings.ts` (lines 11, 87, 129, etc.), `layout.tsx`, `ResultsPanel.tsx`, and `WalletButton.tsx`.
  - Hero lobby can be restructured into an authentic Arcade Battle Station cabinet framing the Ape mascot and controls with CRT scanlines, marquee, and glowing pushbuttons.
  - Smoke test in `scripts/smoke-test.mjs` requires specific substring presence on `/play` and `/how-to-play`.
- **Unexplored areas**: None for R1/R3 scope.

## Key Decisions Made
- Established 1-to-1 mapping of old copy -> authentic Solana degen copy across `strings.ts` and UI files.
- Designed 3-card tactical consolidation ("Chop -> Jump -> Pump") for home page while preserving comprehensive guide on `/how-to-play`.
- Designed Arcade Cabinet framing specs with bezel lights, CRT stage, tactile push buttons, and control cheat sheet.

## Artifact Index
- DISPATCH.md — record of incoming instructions
- progress.md — liveness heartbeat and step tracker
- handoff.md — detailed 5-component report
