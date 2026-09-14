# Project: $TAP Solana Arcade Gaming Platform Polish & De-Slop

## Architecture
The $TAP application is a Next.js 14 full-stack Solana arcade game featuring an embedded Phaser 3 HTML5 canvas engine (`tap-chimp`), Prisma ORM backed by SQLite/PostgreSQL, procedural Web Audio synthesizer, and Tailwind-free vanilla CSS design system.

- **Frontend Shell**: Next.js App Router (`src/app/play/page.tsx`, `src/app/how-to-play/page.tsx`, `src/app/layout.tsx`)
- **Game Engine**: Phaser 3 integration (`src/game/scenes/GameScene.ts`, `src/game/scenes/BootScene.ts`, `src/game/engine.ts`)
- **Audio Subsystem**: In-memory procedural Web Audio synthesis (`src/lib/sound.ts`)
- **Data & APIs**: Next.js route handlers (`src/app/api/chat/route.ts`, `src/app/api/stats/home/route.ts`, `src/app/api/runs/route.ts`)
- **State & i18n**: Centralized strings catalog (`src/i18n/strings.ts`), wallet state (`WalletButton.tsx`), chat drawer (`GlobalChat.tsx`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | declarations.d.ts syntax fix | Fix TS1002 unterminated string literal on line 1 | M1 | Survey 2 |
| 2 | strings.ts de-slop | Replace robotic phrases with authentic Solana degen voice | M1 | Survey 1, ORIGINAL_REQUEST §R1 |
| 3 | Metadata & layout copywriting | Update browser tab title, description, and social copy | M1 | Survey 1, ORIGINAL_REQUEST §R1 |
| 4 | Component & modal copywriting | Eliminate placeholder TODOs and corporate jargon | M1 | Survey 1, ORIGINAL_REQUEST §R1 |
| 5 | Master :root consolidation | Consolidate 4 duplicate :root definitions in globals.css | M2 | Survey 2, ORIGINAL_REQUEST §R2 |
| 6 | Electric Arcade palette | Implement Deep Space Void, Solana Bull Green, Liquidated Red, Electric Gold | M2 | Survey 2, ORIGINAL_REQUEST §R2 |
| 7 | Cyber Panel glassmorphism | Add frosted glassmorphism, crisp neon borders, cyber glow | M2 | Survey 2, ORIGINAL_REQUEST §R2 |
| 8 | Parallax & .px-veil cleanup | Clear murky green veil, restore vivid pixel art and chart grid | M2 | Survey 2, ORIGINAL_REQUEST §R2 |
| 9 | Supporting theme sync | Update BootScene, engine.ts, layout themeColor, ResultsPanel canvas colors | M2 | Survey 2, ORIGINAL_REQUEST §R2 |
| 10 | Arcade Cabinet Hero Station | Frame Ape mascot and controls inside retro-modern cabinet chassis | M3 | Survey 1, ORIGINAL_REQUEST §R3 |
| 11 | CRT scanline mascot stage | Frame Ape mascot with scanline CRT screen, glowing bezels, telemetry | M3 | Survey 1, ORIGINAL_REQUEST §R3 |
| 12 | Tactile arcade pushbuttons | 3D beveled arcade buttons for Practice and Drop In & Chop | M3 | Survey 1, ORIGINAL_REQUEST §R3 |
| 13 | 3 Tactical Rule Cards | Consolidate 5 bloated cards into Chop -> Jump -> Pump | M3 | Survey 1, ORIGINAL_REQUEST §R3 |
| 14 | Deep dive link & /how-to-play | Direct users to full playbook while preserving smoke test anchors | M3 | Survey 1, ORIGINAL_REQUEST §R3 |
| 15 | 100ms Coyote Time | Allow jump execution up to 100ms after stepping off ground/roots | M4 | Survey 2, ORIGINAL_REQUEST §R4 |
| 16 | 120ms Jump Buffering | Queue jump press up to 120ms before landing for instant hop | M4 | Survey 2, ORIGINAL_REQUEST §R4 |
| 17 | Variable Jump Height | Early jump release cuts vertical velocity for quick obstacle hops | M4 | Survey 2, ORIGINAL_REQUEST §R4 |
| 18 | Screen micro-recoil on chop | Add camera shake (45ms, 0.0022) on standard timber chops | M4 | Survey 2, ORIGINAL_REQUEST §R4 |
| 19 | Level-clearing dramatic hit-stop | 150ms kinematic freeze, Bull Green flash, particle explosion, camera shake | M4 | Survey 2, ORIGINAL_REQUEST §R4 |
| 20 | Gain routing hierarchy | Master -> BGM & SFX gain node tree with smooth exponential ramps | M5 | Survey 3, ORIGINAL_REQUEST §R5 |
| 21 | Procedural 8-bit chiptune BGM | Square lead + Triangle bass + Noise percussion lookahead scheduler | M5 | Survey 3, ORIGINAL_REQUEST §R5 |
| 22 | Dynamic Hurry-Up Mode | Tempo acceleration (132 -> 176 BPM) when timeLeftMs <= 10000 | M5 | Survey 3, ORIGINAL_REQUEST §R5 |
| 23 | Pentatonic combo pitch scaling | Escalating 8-note pentatonic scale on green candles with high streak fanfare | M5 | Survey 3, ORIGINAL_REQUEST §R5 |
| 24 | Pop-free volume & mute control | Exponential gain easing eliminating clicks/pops on toggle | M5 | Survey 3, ORIGINAL_REQUEST §R5 |
| 25 | 50-message chat freeze fix | Query orderBy: { createdAt: "desc" }, take: 50 reversed for display | M6 | Survey 3, ORIGINAL_REQUEST §R6 |
| 26 | Chat polling throttling | 15s poll when closed vs 3.5s when open in GlobalChat.tsx | M6 | Survey 3, ORIGINAL_REQUEST §R6 |
| 27 | Live global stats wiring | Fetch /api/stats/home to replace hardcoded 142850 with live aggregate | M6 | Survey 3, ORIGINAL_REQUEST §R6 |
| 28 | E2E Test Suite (Tiers 1-4) | Opaque-box test suite for features, boundaries, combinations, and workflows | M7 / E2E Track | ORIGINAL_REQUEST §Acceptance Criteria |
| 29 | Adversarial Coverage Hardening | White-box stress tests, boundary attacks, and gap elimination (Tier 5) | M7 (Phase 2) | Dual Track Protocol |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Types & Copywriting De-Slop | Fix declarations.d.ts, strings.ts, layout metadata, UI phrasing | none | DONE (Worker: cd1095d3) |
| M2 | Visual & Palette Overhaul | Consolidate :root, Deep Space Void, Bull Green, Liquidated Red, Gold, clean .px-veil | none | DONE (Worker: ec434698) |
| M3 | Arcade Cabinet Lobby Restructure | Arcade chassis hero, Ape CRT stage, 3 tactical cards (Chop->Jump->Pump) | M1, M2 | PLANNED |
| M4 | Platformer Physics & Game Feel | 100ms Coyote time, 120ms jump buffering, variable height, micro-recoil, hit-stop | none | DONE (Worker: 41a157b8) |
| M5 | Procedural 8-Bit Audio & Hurry-Up | Master/BGM gain hierarchy, procedural chiptune synth, hurry-up <= 10s, pentatonic combos | none | DONE (Worker: 8d0bfc64) |
| M6 | Chat Freeze Fix & Live Stats | orderBy desc take 50 reversed, 15s/3.5s throttled poll, /api/stats/home wiring | none | DONE (Worker: c17ffb86) |
| M7 | Final E2E Test Pass & Hardening | Pass 100% E2E test suite (Tiers 1-4) + Adversarial hardening (Tier 5) | M1-M6, TEST_READY | PLANNED |
| E2E | E2E Testing Track | TEST_INFRA.md, Tiers 1-4 test suites in tests/e2e/, TEST_READY.md | none | IN_PROGRESS (Writer: 9f2934c6) |

## Interface Contracts
### `src/i18n/strings.ts` ↔ UI Components (`M1` ↔ `M3`)
- All string constants exported under `strings` object.
- Key properties preserved with upgraded text values: `gameTitle`, `tagline`, `heroSubcopy`, `playNow`, `tryDemo`, `starting`, `endRun`, `greenPoints`, `redPenalty`, `greenTooltip`, `redTooltip`, `newPersonalBest`, `demoBadge`, `demoNotice`, `rewardsBackendNotice`.
- Invariant: `strings.gameTitle` must contain `"$TAP CHOP GAME"` for smoke test compliance.

### `src/app/globals.css` ↔ Layout & Game (`M2` ↔ `M3`, `M4`)
- Authoritative CSS custom properties defined in single `:root`:
  - Colors: `--green: #00FFA3; --red: #FF3B30; --gold: #FFD000; --bg-0: #06090c; --bg-1: #0a0f14; --bg-2: #0e151c; --bg-3: #131c24;`
  - Panels: `--panel: rgba(14, 22, 32, 0.88); --panel-hi: rgba(20, 30, 42, 0.94); --line: rgba(0, 255, 163, 0.16);`
- Game theme color sync:
  - `src/game/engine.ts`: `backgroundColor: 0x06090c`
  - `src/app/layout.tsx`: `themeColor: "#06090c"`

### `src/lib/sound.ts` ↔ `src/game/scenes/GameScene.ts` (`M5` ↔ `M4`)
- Methods available on `sound` singleton:
  - `sound.init()`: resumes or creates AudioContext.
  - `sound.startBgm()`: starts procedural 16-step chiptune synthesizer loop.
  - `sound.stopBgm()`: smoothly fades out BGM.
  - `sound.setHurryUp(accelerate: boolean)`: accelerates tempo from 132 to 176 BPM when `true`.
  - `sound.playGreen(combo?: number)`: plays pentatonic pitch corresponding to `combo` index.
  - `sound.playChop()`, `sound.playJump()`, `sound.playRed()`, `sound.playLevelUp()`, `sound.playClick()`.
  - `sound.toggleMute()`, `sound.isMuted()`, `sound.setVolume(v: number)`.

### `/api/stats/home` ↔ `src/app/play/page.tsx` (`M6` ↔ `M3`)
- Endpoint: `GET /api/stats/home` returns `{ ok: true, data: { totals: { trees: number, players: number, runs: number } } }`.
- Frontend consumes `data.totals.trees` to dynamically populate `globalWeeklyTrees` state.

### `GET /api/chat` ↔ `src/components/GlobalChat.tsx` (`M6`)
- Endpoint returns `{ ok: true, messages: ChatMessage[] }`.
- Backend queries `orderBy: { createdAt: "desc" }, take: 50` and returns `messages.reverse()`.
- Client receives messages sorted chronologically (oldest first, newest last) containing the latest 50 messages.

## Code Layout & Write Ownership
Strict file boundaries for parallel execution:
- **Milestone 1 Worker**: `declarations.d.ts`, `src/i18n/strings.ts`, `src/app/layout.tsx`
- **Milestone 2 Worker**: `src/app/globals.css`, `src/game/engine.ts`, `src/game/scenes/BootScene.ts`
- **Milestone 3 Worker**: `src/app/play/page.tsx`, `src/app/how-to-play/page.tsx`, `src/components/WalletButton.tsx`
- **Milestone 4 Worker**: `src/game/scenes/GameScene.ts`
- **Milestone 5 Worker**: `src/lib/sound.ts`
- **Milestone 6 Worker**: `src/app/api/chat/route.ts`, `src/components/GlobalChat.tsx`
- **E2E Testing Track**: `tests/e2e/*`, `scripts/smoke-test.mjs`, `TEST_INFRA.md`, `TEST_READY.md`
