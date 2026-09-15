# Original User Request

## 2026-09-14T02:17:20Z

Complete end-to-end polish and de-slopping of the  Solana arcade gaming platform: replace all robotic AI copy with authentic arcade degen voice, overhaul the dark muddy color palette into an electric retro-cyber aesthetic, upgrade game feel (jump buffering, coyote time, procedural audio, combo fanfare), fix backend chat freeze and live stat queries, and unify desktop/mobile layouts into a cohesive arcade cabinet experience.

Working directory: e:/TAPCOIN
Integrity mode: development

## Requirements

### R1. Complete Copywriting De-Slop (Authentic Degen Arcade Voice)
In src/i18n/strings.ts and across all pages, replace every instance of stiff, robotic AI copy (predefined maximum, run terminates when your timer drops to zero, TODO: Actual claim...) with punchy, energetic, meme-savvy Web3 arcade copywriting (CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT., GOD CANDLE SURGE, BEAR MARKET DUMPS, LOCK IN YOUR AIRDROP BAG).

### R2. Visual & Palette Overhaul (Electric Arcade Aesthetics)
In src/app/globals.css, eliminate duplicate :root definitions and replace muddy dark green-grey surfaces with high-contrast Deep Space Void (#06090c), Cyber Panel surfaces with crisp glassmorphic borders, Solana Bull Green (#00FFA3), Liquidated Red (#FF3B30), and Electric Arcade Gold (#FFD000). Clean the parallax .px-veil so the forest pixel art and chart grid shine through with depth and vibrancy.

### R3. Arcade Cabinet Lobby Restructure & Redundancy Reduction
Transform the home lobby from a generic vertical SaaS card stack into an Arcade Battle Station. The hero section frames the Ape mascot and play controls inside a retro-modern cabinet with glowing bezels. Consolidate the lengthy How to Play section on the home page into 3 crisp, interactive tactical rule cards (Chop -> Jump -> Pump), while keeping in-depth rules on /how-to-play.

### R4. Game Feel & Platformer Physics Polish
In src/game/scenes/GameScene.ts, upgrade the jump mechanics with platformer polish:
- Add 100ms Coyote Time (allow jump right after stepping off roots/ledges).
- Add 120ms Jump Buffering (execute jump immediately upon landing if button was pressed shortly before ground contact).
- Variable Jump Height (releasing jump early cuts vertical speed for low obstacle hops).
- Add screen micro-recoil on chops and dramatic hit-stop on the level-clearing tree.

### R5. Procedural 8-Bit Audio & Dynamic Hurry-Up Mode
In src/lib/sound.ts, implement a lightweight procedural retro-chiptune background music (BGM) synthesizer using Web Audio API (zero extra MBs to download). When timer reaches <= 10 seconds, tempo accelerates dynamically into Hurry-Up mode to create arcade tension. Add pentatonic pitch scaling for combo streaks.

### R6. Chat Freeze Fix & Backend Global Stats Wiring
In src/app/api/chat/route.ts, fix the 50-message freeze by ordering by createdAt: desc with 	ake: 50 (reversed for display) so new messages always appear. Throttle chat polling in GlobalChat.tsx when closed (15s) vs open (3.5s). In src/app/play/page.tsx, wire etch(/api/stats/home) to display real aggregate trees instead of hardcoded 142850.

## Acceptance Criteria

### Copywriting & Content
- [ ] Zero robotic corporate phrasing or placeholder TODO texts remain anywhere in user-facing UI.
- [ ] Slogans, guides, tooltips, and modals use punchy, authentic Solana gaming / degen terminology.

### Visual Design & Colors
- [ ] Color system is unified: clean deep void background with vibrant neon green (#00FFA3), sharp red (#FF3B30), and radiant gold.
- [ ] Parallax background is clear, crisp, and provides depth without murky or muddy veil overlays.
- [ ] Lobby layout feels like an arcade machine, not a corporate landing page.

### Game Feel & Audio
- [ ] Jumping feels tight and responsive with coyote time and jump buffering.
- [ ] Procedural 8-bit arcade BGM plays during runs and accelerates during last 10 seconds.
- [ ] Sound toggle and volume controls work cleanly without audio stutter.
- [ ] Combo counter and multipliers display clearly on HUD with escalating sound cues.

### Technical & Performance
- [ ] Chat continues loading new messages past 50 entries without freezing.
- [ ] Global weekly trees stat is populated from the live /api/stats/home aggregation.
- [ ] Production build 
pm run build succeeds with 0 errors.
- [ ] Automated smoke tests pass 100% on live port 3000.

## 2026-09-14T09:39:36Z

Produce an ultra-slick, 30 to 45-second 16:9 widescreen (1080p) cinematic teaser & onboarding video for the upcoming $TAP Solana Arcade Game release. The video takes the viewer on a seamless journey: First Launch → Connect Wallet → Play & Fight to Level 2 → Climb the Leaderboard → Win 10% Dev Wallet Monthly Prize, featuring dynamic camera zooms, smooth 60 FPS motion transitions, and synchronized fast-paced 8-bit chiptune arcade sound effects.

Working directory: e:/TAPCOIN
Integrity mode: development

## Requirements

### R1. Cinematic Storyboard & Script Sequence (30–45s Total)
Direct and render a cohesive 6-act promotional video showcasing the authentic $TAP platform in 16:9 widescreen:
- **Act 1: First Arrival (0:00–0:05)** — Opening cinematic fly-in on the Arcade Battle Station terminal, hero ape mascot, and live degenerate trollbox ticker.
- **Act 2: Instant Wallet Connect (0:05–0:09)** — Smooth connection flow highlighting official Solana wallet badges (Phantom, Solflare, Jupiter).
- **Act 3: High-Octane Gameplay (0:09–0:22)** — Free Practice / Drop In action: chopping timber, dodging chasms, rat stomping (`+10 STOMP!`), and axe combat against the multi-hit patrolling Bear with counter-hit sparks.
- **Act 4: Level 1 Cleared & Advance to Level 2 (0:22–0:28)** — Final timber felled, dramatic hit-stop, Solana Bull Green flash, celebratory particle burst, and transition into Level 2.
- **Act 5: ATH Score Flex & Leaderboard Climb (0:28–0:35)** — High score recorded, navigating to the live Leaderboard ranking with animated climb.
- **Act 6: Grand Prize Callout & Call to Action (0:35–0:42)** — Highlighting the season competition: *"Climb the Leaderboard · Win 10% Dev Wallet Prize in Month 1"* with official token mint contract address ($TAP).

### R2. Cinematic Camera Dynamics & Smooth Transitions
- Ensure fluid 30/60 FPS recording with zero frame stutter or lag.
- Implement dynamic camera pan and zoom effects:
  - Smooth zoom-in on the Ape delivering axe chops and Bear counter-hits.
  - Dramatic zoom-out on Level 1 clear to showcase the celebratory confetti and Bull Green lighting.
  - Smooth crossfades and motion-blur transition cuts between scenes.

### R3. Motion Graphics, Typography & 8-Bit Audio Sync
- High-contrast arcade cyberpunk typography overlays (Solana Green `#00FFA3`, Electric Gold `#FFD000`, Liquidated Red `#FF3B30`).
- Synchronize fast-paced retro 8-bit chiptune background music, axe chop audio, level-up fanfares, and reward sound cues.
- Render in high-definition (1920x1080 or 1280x720) MP4 video container ready for sharing on X (Twitter), Telegram, and Discord.

## Acceptance Criteria

### Video Quality & Performance
- [ ] Output video is exported to an accessible MP4 artifact file (`public/assets/media/tap_intro_trailer.mp4` and artifact folder).
- [ ] Total video duration strictly adheres to 30–45 seconds.
- [ ] Video playback is smooth and fluid with zero stuttering or frozen frames.
- [ ] Dynamic zoom-in and zoom-out transitions are rendered smoothly during key action sequences.

### Story & Feature Coverage
- [ ] Sequence includes authentic first open, wallet connect, gameplay progression through Level 1 into Level 2, and leaderboard display.
- [ ] Bear combat demonstrates multi-hit damage and Bear attack dynamics.
- [ ] Season competition callout clearly displays the "Win 10% Dev Wallet Pool in Month 1" prize rule and official token contract address.
- [ ] All captions and title cards use professional, authentic Web3 arcade copywriting in English.

## Verification Resources
- Browser automation recorder: `scripts/record-walkthrough.mjs` and CDP screencast pipeline.
- Video synthesis & ffmpeg encoder: filter_complex for dynamic zoompan, crossfades, typography overlays, and audio mixing.

## 2026-09-15T05:46:54Z

Perform an exhaustive, professional, and rigorous end-to-end audit of the entire $TAP Solana arcade gaming platform (`e:/TAPCOIN`). Inspect and test all three critical pillars — Security & Anti-Cheat, UI/UX & Responsive Experience, and Game Engine & Tokenomics Logic — providing concrete vulnerability assessments, UI/UX grading, logic proofs, and verified recommendations.

Working directory: e:/TAPCOIN
Integrity mode: development

## Requirements

### R1. Security & Anti-Cheat Audit (Keamanan)
Perform an adversarial security audit on the web3 and backend architecture:
- **Season Paywall & Bypass Resistance:** Verify that no unpaid user can register a valid run or pollute the leaderboard via API manipulation, direct `/api/runs` payload injection, or falsified transaction signatures.
- **Solana On-Chain Payment Verification:** Inspect `src/app/api/access/verify/route.ts` and `src/lib/solanaRpc.ts` to confirm transaction signature uniqueness (`signature @unique`), recipient address validation (`95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7`), exact lamport amount checking (`10_000_000` lamports / 0.01 SOL), and immunity to replay/tampering attacks.
- **Authentication & Role Guards:** Audit wallet authentication (nonce generation, ed25519 signature checks, HTTP-only session cookies), ensuring admin endpoints (`/api/admin/*`) strictly verify admin roles and zero sensitive private keys are stored, logged, or transmitted.

### R2. UI/UX & Responsive Design Audit (UI/UX)
Evaluate visual aesthetics, layout density, responsiveness, and degen arcade feel across desktop and mobile:
- **Desktop Battle Station:** Inspect the desktop layout (`/play`, `/`, `/leaderboard`, `/admin`) to ensure zero awkward empty whitespace, crisp arcade framing, clean dock positioning of the Global Trollbox, and legible HUD telemetry.
- **Mobile Responsiveness & Touch Controls:** Inspect mobile viewports (down to 360px width) for navigation overlap, button touch targets (jump, attack, wallet connect), modal usability (`SeasonPassModal`), and proper viewport height without unintended page scrolling during gameplay.
- **Copywriting & Tokenomics Clarity:** Audit user-facing text to verify complete de-slopping (authentic arcade degen voice) and crystal-clear presentation of the 10% Leaderboard Prize Pool / 90% Buyback & Burn tokenomics split across modals, banners, and the `/how-to-play` playbook.

### R3. Game Engine & Core Gameplay Logic Audit (Game Logic)
Verify mathematical correctness and gameplay integrity in Phaser 3:
- **Combat & Enemy AI:** Audit Bear multi-hit HP scaling by level, telegraphing/lunge attack logic, hit recoil, and Rat Stomp rebound mechanics.
- **Platformer Physics & Hazards:** Audit chasm/jurang spawn clearance (`SAFE_TREE_CLEARANCE`), chasm leap detection (guaranteeing zero points awarded for jumping chasms), tumble fall penalties, jump buffering, and coyote time responsiveness.
- **Level Progression & Scoring:** Verify level advancing logic, tree target milestones, combo multiplier escalation from green candles, and red candle dump penalties.

### R4. Tokenomics & Treasury Pool Logic Audit (Ekonomi & Math)
Audit backend and frontend math for the seasonal prize distribution:
- **Game Fee Aggregation:** Verify that `/api/treasury/pool` and `/api/admin/overview` correctly aggregate confirmed `amountSol` from `PaymentTx` for the active season.
- **Allocation Invariant:** Confirm that `prizePoolSol === totalGameFeesSol * 0.10` and `buybackBurnPoolSol === totalGameFeesSol * 0.90` at all times, with dev wallet balance displayed strictly as treasury reserve proof.
- **Public Competition Decoupling:** Confirm that public competition routes redirect cleanly to `/leaderboard` and no stale competition IDs exist in game state.

## Acceptance Criteria

### Security & Integrity
- [ ] Adversarial test proves unpaid or guest users cannot submit runs with `valid: true`.
- [ ] Transaction signature reuse (replay attack) is rejected with HTTP 409 or appropriate error.
- [ ] Zero private keys, mnemonic seeds, or administrative secrets exist in client bundles or public repositories.
- [ ] Solana RPC queries implement fallback caching to avoid rate-limit denial of service.

### UI/UX & Quality
- [ ] Desktop `/play` renders a high-octane battle station without vacant dead space.
- [ ] Mobile navigation and arcade controls function seamlessly with zero horizontal scroll or layout clipping.
- [ ] Public competitions are 100% hidden from navigation and redirected from `/competitions`.
- [ ] Tokenomics 10/90 split is prominently and accurately explained in `SeasonPassModal`, `/leaderboard`, and `/how-to-play`.

### Logic & Build Verification
- [ ] All automated test suites (`tests/season-treasury.test.mjs`, `tests/e2e/rat-bear-share-chat.test.mjs`, `tests/e2e/chasm-tree-desktop.test.mjs`) pass with 0 failures.
- [ ] Production build (`npm run build`) compiles cleanly with 0 TypeScript/ESLint errors across all 38 routes.
- [ ] Detailed formal audit report generated with severity ratings (Critical, High, Medium, Low, Informational) and actionable verdicts.

## Verification Resources
- Test suites: `node tests/season-treasury.test.mjs`, `node tests/e2e/rat-bear-share-chat.test.mjs`, `node tests/e2e/chasm-tree-desktop.test.mjs`
- Build verification: `npm run build`
- Endpoint testing scripts in `scripts/` and curl/fetch assertions.

