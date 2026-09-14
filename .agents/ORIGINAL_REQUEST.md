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
