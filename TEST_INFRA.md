# $TAP Arcade Platform — End-to-End Test Infrastructure & Methodology

## 1. Test Philosophy & Core Principles

The $TAP Solana Arcade platform requires rock-solid test integrity, deterministic verification, and rigorous prevention of regressions across its frontend shell, Phaser 3 canvas engine, Web Audio synthesis subsystem, and backend API routes.

Our testing architecture adheres to five inviolable tenets:

1. **Opaque-Box & Behavioral Testing**:
   Tests exercise observable behavior, interfaces, DOM output, and HTTP API contracts rather than implementation trivia. Tests answer: *"If this test fails, what user or player capability is broken?"*
2. **Zero-Facade Guarantee**:
   No trivial assertions or dummy assertions that pass regardless of logic state. Every assertion verifies real state mutations, boundary transitions, calculation invariants, or response contracts against authoritative specifications (`ORIGINAL_REQUEST.md` and `PROJECT.md`).
3. **Progressive Testability & Isolation**:
   Every test suite is hermetic and self-contained. Tests set up their required state, do not depend on execution order, and execute reliably against both live server instances (`http://localhost:3000`) and deterministic in-memory behavioral contracts.
4. **Adversarial & Boundary Verification**:
   Exhaustive exploration of extreme inputs: zero-timers, max combo streaks, volume overflow/underflow, malformed chat payloads, out-of-order network responses, and rapid key spamming.
5. **Continuous Verification & Health Auditing**:
   Seamless automation integrated into `scripts/test-audit.mjs`, `scripts/smoke-test.mjs`, and `tests/e2e/runner.mjs`.

---

## 2. 4-Tier Testing Methodology

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Real-World Application Scenarios (E2E User Workflows)│
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Combinations (Pairwise State Matrix)  │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary Value Analysis & Corner Stress Cases        │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (Category-Partitioning R1–R6)      │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Category-Partitioning across R1–R6)
Systematic partitioning of input and output domains into equivalence classes to verify core functional behavior. Every feature in R1 through R6 has a minimum of 5 dedicated test cases:

- **R1: Copywriting De-Slop (Authentic Degen Arcade Voice)**:
  - Verification of punchy crypto gaming slogans (`CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT.`).
  - Elimination of robotic AI phrasing ("without a predefined maximum", "run terminates when your timer drops to zero", "TODO: Actual claim...").
  - Verification of signature Solana mechanics copy (God Candle Surges, Bear Market Dumps, ATH celebrations).
  - Preservation of critical smoke-test anchor invariants (`$TAP CHOP GAME`, `Phantom`).
  - Validation of metadata, titles, modal tooltips, and empty record states.
- **R2: Visual & Palette Tokens**:
  - Verification of single consolidated `:root` CSS custom properties (zero conflicting duplicates).
  - Validation of Electric Arcade tokens: Solana Bull Green (`#00FFA3`), Liquidated Red (`#FF3B30`), Electric Gold (`#FFD000`), Deep Space Void (`#06090c`).
  - Verification of Cyber Panel glassmorphism and crisp neon borders.
  - Verification of `.px-veil` opacity cleanup (unveiling vivid pixel art backdrop and chart grid).
  - Verification of supporting theme color synchronization across `engine.ts` and `layout.tsx`.
- **R3: Arcade Cabinet DOM & Lobby Restructure**:
  - Structural verification of `<section className="arcade-cabinet-station">` and `.cabinet-chassis`.
  - Cabinet Marquee header with glowing bezel LED indicators and pilot ready badges.
  - CRT Scanline Mascot Stage framing the Ape mascot with tactical HUD telemetry.
  - Tactile 3D beveled arcade pushbuttons (`Try Demo` / `DROP IN & CHOP`).
  - Consolidation into 3 crisp tactical cards: Step 1 (Chop Timber) -> Step 2 (Jump Red Dumps) -> Step 3 (Ride God Candles).
- **R4: Platformer Physics Properties**:
  - Coyote Time parameterization (`COYOTE_TIME_MS = 100`).
  - Jump Buffering parameterization (`JUMP_BUFFER_MS = 120`).
  - Variable Jump Height velocity clamping (`MIN_JUMP_VELOCITY = -260`).
  - Screen micro-recoil camera shake (`shake(45, 0.0022)`).
  - Level-clearing dramatic hit-stop kinematic freeze (`hitStopUntil = now + 150` with Solana flash).
- **R5: Procedural 8-Bit Audio Methods**:
  - Web Audio gain hierarchy: `destination <- masterGain <- [bgmGain, sfxGain]`.
  - In-memory procedural 16-step chiptune scheduler (Square lead + Triangle bass + Noise percussion).
  - Dynamic Hurry-Up Mode tempo acceleration (132 BPM to 176 BPM when `timeLeftMs <= 10000`).
  - Pentatonic pitch progression (`playGreen(combo)`) spanning escalating 8-note scale.
  - Pop-free volume control (`setVolume(v)`) and exponential mute ramping (`setTargetAtTime`).
- **R6: Chat Ordering, Throttled Polling & Live Stats API**:
  - `GET /api/chat` ordering: `orderBy: { createdAt: "desc" }, take: 50` reversed to chronological display.
  - Chat polling throttling: 15,000ms when drawer is closed vs. 3,500ms when open.
  - `GET /api/stats/home` schema contract validation (`totals.trees`, `totals.players`, `totals.runs`).
  - Frontend consumption in `play/page.tsx` replacing hardcoded static fallback.

### Tier 2: Boundary & Corner Cases (Boundary Value Analysis)
Validation of extremal, limit, and edge parameters to prevent runtime exceptions, overflow bugs, or cheat exploits:

- **Extreme Combos**: Streak values from 0 up to 100+; scale wrap-around, multiplier caps, and reset triggers.
- **0-Timer / Run Termination**: Exact transition at `timeLeftMs = 0`, sub-zero clamps, liquidation state transitions.
- **Rapid Jump Inputs**: High-frequency key repeat (10-20ms interval), mid-air double-presses within buffer window.
- **Chat Message Lengths & Boundaries**: Empty string `""`, single-character `"x"`, whitespace-only `"   "`, max length (280 chars), overflow truncation, HTML/XSS special character sanitization.
- **Volume Clamping**: Out-of-range volume values (`-1.5`, `0.0`, `0.5`, `1.0`, `2.5`); strict bounds enforcement to `[0.0, 1.0]`.

### Tier 3: Cross-Feature Combinations (Pairwise Combinatorial Testing)
Verification of concurrent feature interactions across multiple subsystems:

- **Audio Hurry-Up + Combo Multiplier**: Dynamic tempo acceleration (176 BPM) triggering simultaneously with rapid 8-step pentatonic combo streak audio playback without buffer underruns or audio crackle.
- **Chat Drawer State + Active Gameplay**: Opening and closing the slide-out global chat drawer while player runs and chops; verifying keyboard event isolation (typing in chat input does not trigger spacebar jump or A/D sprint).
- **Mute Toggle + Hurry-Up Mode**: Toggling audio mute on/off while in <=10s Hurry-Up mode; verifying gain node stays silenced without unscheduled oscillator leaks, and unmutes at the correct accelerated tempo.
- **Colorblind Mode + God Candle Fanfare**: Activating high-contrast colorblind mode while combo streaks climb; ensuring UI glyphs (`▲`/`▼`) and visual fanfare remain fully synchronized.
- **Offline / Server Fallback + Client Stats**: Resilient degradation when `/api/stats/home` or `/api/chat` encounters network latency, preserving playable state with graceful fallback copy.

### Tier 4: Real-World Application Scenarios (End-to-End User Workflows)
Complete, multi-step player journeys testing integrated functionality:

- **Workflow 1: Demo Practice -> Liquidation -> Score Flex -> Wallet Modal**:
  1. Player visits `/play`, observes Arcade Cabinet Battle Station.
  2. Launches Free Practice / Demo run.
  3. Chops trees, collects God Candles, reaches timer liquidation.
  4. Post-run Results Panel mounts with verified score calculations.
  5. User interacts with "FLEX SCORE ON X" and triggers Solana wallet connect modal (Phantom/Solflare).
- **Workflow 2: Active Run with Live Chat Interactivity**:
  1. Player begins active run.
  2. Opens Global Chat drawer, sends message to chat feed.
  3. Verifies chat switches to 3.5s high-frequency polling.
  4. Messages render in correct chronological order without freezing or truncating.
- **Workflow 3: Live Stats Aggregation & Leaderboard Telemetry**:
  1. Platform queries `/api/stats/home`.
  2. Verifies aggregate weekly trees stat updates dynamically.
  3. Inspects leaderboard endpoints (`/api/leaderboard`, `/leaderboard`).
  4. Confirms live telemetry displays consistent records across views.

---

## 3. Test Coverage Thresholds & Quality Gates

To pass quality assurance and be declared `TEST_READY`, the test suite must satisfy:

| Metric | Target Threshold | Description |
| :--- | :--- | :--- |
| **Tier 1 Feature Coverage** | >= 5 test cases / feature | Minimum 30 automated tests spanning R1 through R6 |
| **Tier 2 Boundary Cases** | >= 5 test cases / feature | Minimum 25 automated tests testing boundary conditions |
| **Tier 3 Combinatorial** | >= 10 pairwise test cases | Interaction matrix testing cross-cutting states |
| **Tier 4 Workflows** | >= 3 full user journeys | End-to-end multi-step flows simulating real player sessions |
| **Pass Rate** | 100% | Zero test failures permitted |
| **Smoke Test Compatibility** | 100% (6/6 routes) | Live port 3000 endpoints return HTTP 200 with required content |
| **Execution Performance** | < 10.0s total runtime | Rapid feedback loop suitable for CI/CD |

---

## 4. Test Suite Inventory & Commands

- **Audit Test Suite**:
  ```bash
  node scripts/test-audit.mjs
  ```
- **Automated E2E Suite (All Tiers)**:
  ```bash
  node tests/e2e/runner.mjs
  ```
- **Individual Tier Suites**:
  ```bash
  node tests/e2e/tier1-feature-coverage.test.mjs
  node tests/e2e/tier2-boundary-corner.test.mjs
  node tests/e2e/tier3-cross-feature.test.mjs
  node tests/e2e/tier4-real-world.test.mjs
  ```
- **Production Smoke Test (Port 3000)**:
  ```bash
  node scripts/smoke-test.mjs
  ```
