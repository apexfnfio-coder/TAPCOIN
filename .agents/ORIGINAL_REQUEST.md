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
