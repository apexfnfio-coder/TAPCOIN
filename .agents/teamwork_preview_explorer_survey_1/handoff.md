# Explorer Survey 1: Frontend Copy & Lobby Explorer Handoff Report

**Scope**: R1 (Complete Copywriting De-Slop / Authentic Degen Arcade Voice) & R3 (Arcade Cabinet Lobby Restructure & Redundancy Reduction)  
**Date**: 2026-09-14  
**Working Directory**: `e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_1`

---

## 1. Observations

### 1.1 Direct Observations in `src/i18n/strings.ts`
Inspection of `src/i18n/strings.ts` (139 lines total) reveals multiple instances of stiff, corporate AI phrasing, passive explanations, and explicit placeholders:

- **Line 11**:
  ```typescript
  infiniteLevelsRule: "Levels continue without a predefined maximum. A run ends only when you fail or quit.",
  ```
  *Flaw*: Robotic phrasing ("without a predefined maximum", "when you fail or quit"). Lacks high-stakes crypto arcade urgency.

- **Line 9-10**:
  ```typescript
  tagline: "CHOP. COLLECT. COMPETE.",
  heroSubcopy: "Chop the green candles. Dodge the red. The chart never stops climbing.",
  ```
  *Flaw*: Generic SaaS style. Prompt explicitly specifies: `"CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT."`

- **Line 34-35**:
  ```typescript
  connectToSave: "Connect wallet to save scores & earn $TAP",
  walletRequiredNote: "A connected Solana wallet is required to save your record and earn $TAP.",
  ```
  *Flaw*: Bureaucratic wording. Should evoke locking in airdrop bags and immutable high score verification on Solana.

- **Line 53-56**:
  ```typescript
  greenPoints: "+ POINTS",
  redPenalty: "− PENALTY",
  greenTooltip: "Green candles reward +10 bonus points",
  redTooltip: "Red candles deduct −25 points and 3 seconds",
  ```
  *Flaw*: Misses opportunity for signature Solana trading terminology ("GOD CANDLE SURGE", "BEAR MARKET DUMPS").

- **Line 86-88**:
  ```typescript
  runEnd: {
    title: "When Does a Run End?",
    desc: "A run terminates when your timer drops to zero or when you choose to quit. Every millisecond counts.",
  },
  ```
  *Flaw*: Explicitly flagged in user request (`"run terminates when your timer drops to zero"`). Needs degen liquidation vocabulary.

- **Line 116-119**:
  ```typescript
  newPersonalBest: "New personal best!",
  awayFromBest: "away from your best",
  demoBadge: "DEMO — SCORE NOT SAVED",
  demoNotice: "You played in Demo Mode. Connect your Solana wallet to record verified runs and earn $TAP rewards.",
  ```
  *Flaw*: Corporate fitness tracker tone instead of degen arcade energy ("NEW ALL-TIME HIGH (ATH)!", "FREE PRACTICE").

- **Line 129**:
  ```typescript
  rewardsBackendNotice: "TODO: Actual $TAP claim distribution and token conversions are wired to on-chain pool.",
  ```
  *Flaw*: Explicitly flagged in user request (`"TODO: Actual claim..."`). Unprofessional placeholder exposed in post-run results and rewards modal.

---

### 1.2 Direct Observations in Page & Component Copy

- **`src/app/layout.tsx`** (Lines 8–11):
  ```typescript
  title: "$TAP — Chop. Collect. Compete.",
  description:
    "$TAP is a competitive arcade game. Chop trees, dodge red candles, collect green candles, and climb the leaderboard.",
  ```
  *Flaw*: Flat, generic app description. Misses key meme and Solana trading identity.

- **`src/app/page.tsx`** (Lines 5–7):
  ```typescript
  export default function HomePage() {
    return <PlayPage />;
  }
  ```
  *Discovery*: `src/app/page.tsx` directly renders `<PlayPage />` from `src/app/play/page.tsx`. Therefore, `src/app/play/page.tsx` IS the home lobby.

- **`src/app/play/page.tsx`**:
  - **Line 13–16**: `Loading Arcade Engine…`
  - **Line 201–204**:
    ```typescript
    <b>Desktop:</b> Use Arrow Keys or [A] / [D] to move. <b>Mobile:</b> Touch [LEFT] / [RIGHT] pads.
    Chop is automatic at trees. Dodge RED candles & slice GREEN candles!
    ```
  - **Line 297–298**:
    ```html
    CHOP. <span className="gold-text">COLLECT.</span> COMPETE.
    ```
  - **Line 338**: `<p className="wallet-required-note">{strings.walletRequiredNote}</p>`
  - **Line 454**: `<span className="terminal-tag">ACTIVE RUNNER</span>`
  - **Line 553–554**:
    ```html
    <span>Weekly Milestone: <b>{globalWeeklyTrees.toLocaleString()} trees</b> chopped across all runs.</span>
    ```
  - **Line 592–594**:
    ```html
    <div className="buy-tap-badge">DEX MONETIZATION</div>
    <div className="buy-tap-title">{strings.buyTap}</div>
    <div className="buy-tap-dest">Trade on Jupiter / Raydium ↗</div>
    ```
    *Flaw*: "DEX MONETIZATION" sounds like internal corporate slide deck jargon.

- **`src/app/how-to-play/page.tsx`**:
  - Entire page uses hardcoded strings (lines 20–148) instead of pulling from `strings.ts`.
  - Line 23: `OFFICIAL ARCADE PLAYBOOK`
  - Line 28–30: `Master the charts, jump over hazardous red candles, and climb the infinite Solana trading ladder.`
  - Line 42: `Slice Green Candles & Fell Timber`
  - Line 70: `Jump Over Red Candles & Obstacles`
  - Line 106: `Levels Climb Indefinitely`
  - Line 123: `Connect Solana Wallet (Phantom or Solflare)`

- **`src/components/ResultsPanel.tsx`**:
  - Line 72: Share text: `"🪓 I chopped ${local.trees} trees and scored ${local.score.toLocaleString()} PTS on Level ${local.level} in $TAP Chop Game!\n\nCan you beat my chart climb? Play now: ${window.location.origin}/play\n#TAPCOIN #SolanaGaming"`
  - Line 81: Tweet text: `"🪓 Just sliced green candles & scored ${local.score.toLocaleString()} PTS on Level ${local.level} in $TAP Chop Game!\n\nDodge red, chop green. Play on Solana:\n${window.location.origin}/play"`
  - Line 126: Canvas snapshot branding: `CHOP. COLLECT. COMPETE. · SOLANA`
  - Line 169: `Slice green. Dodge red. Play at tapcoin.fun/play`
  - Line 190: `Run ended on Level ${local.level}` / `You reached Level ${local.level}`

- **`src/components/WalletButton.tsx`**:
  - Line 253: `Your wallet is securely linked to your game profile.`
  - Line 262: `Gasless signature authentication active.`
  - Line 274: `Select your Solana wallet to link your account, save progress, and participate in competitions.`
  - Line 285–286: `✦ Instant & Gasless Login` / `Connect your wallet to play, track your high scores, and participate in tournaments.`
  - Line 300: `$TAP required`
  - Line 306: `To appear on the leaderboard and enter competitive rankings, your wallet needs at least...`

---

### 1.3 Direct Observations on Lobby Structure & Redundancy (R3)

1. **Current Hero Presentation in `src/app/play/page.tsx` (Lines 279–356)**:
   - Contains a standard vertical stack:
     - Background parallax (`.px-l1`, `.px-l2`, `.px-l3`, `.px-ground`, `.px-veil`, `.leaf-field`)
     - Floating image container (`.hero-ape-container`) with `.float-ape.lobby-ape`
     - Text eyebrow: `$TAP CHOP GAME`
     - Main headline: `CHOP. COLLECT. COMPETE.`
     - Standalone widget: `<CandleLegend colorblindMode={colorblindMode} />` (taking up 120px height)
     - Subtitle: `heroSubcopy`
     - Two standard web buttons: `Try Demo` (wood) and `Play Now` (gold)
     - Wallet badges container
   - *Problem*: Feels like a SaaS landing page with a game screenshot, not an interactive **Arcade Battle Station** or coin-op cabinet.

2. **Extreme Redundancy between Lobby Section 2 and `/how-to-play`**:
   - In `src/app/play/page.tsx` (Lines 358–445), Section 2 is an exhaustive 5-card grid:
     - Card 1: What to chop (`BONUS TARGET` - green candle)
     - Card 2: What to avoid (`HAZARD` - red candle)
     - Card 3: Infinite progression (`PROGRESSION` - infinity symbol)
     - Card 4: Run ends on (`CONDITIONS` - timer = 0)
     - Card 5: Solana Wallet Requirement Card (`Solana Wallet Integration` + badges + connect button)
   - Simultaneously, `src/app/how-to-play/page.tsx` (Lines 34–150) renders the exact same 4 rules in a 4-card deck!
   - Furthermore, the Hero section already displays `CandleLegend` which explains green (+10) and red (-25) candles a third time!
   - *Result*: Triple redundancy, massive vertical page bloat, and poor user conversion flow.

3. **Smoke Test Invariants in `scripts/smoke-test.mjs`**:
   - Line 5:
     ```javascript
     { path: "/play", expectedCode: 200, check: (body) => body.includes("$TAP CHOP GAME") && body.includes("Phantom") },
     ```
   - Line 6:
     ```javascript
     { path: "/how-to-play", expectedCode: 200, check: (body) => body.includes("How to Play") && body.includes("Solana") },
     ```
   - *Critical constraint*: Any copy changes MUST ensure `"$TAP CHOP GAME"` and `"Phantom"` are present in `/play` response HTML, and `"How to Play"` and `"Solana"` are present in `/how-to-play` response HTML, or else `npm run smoke-test` will fail!

---

## 2. Logic Chain

1. **Premise**: The user requests a complete de-slopping of copy into an authentic Solana degen arcade voice, plus an Arcade Battle Station lobby redesign with 3 tactical rule cards.
2. **From Observation 1.1 & 1.2**: `strings.ts` is the single source of truth for UI copy, but is riddled with robotic AI placeholders ("without a predefined maximum", "TODO: Actual claim...", "DEX MONETIZATION").
   - *Inference*: Rewriting `strings.ts` with authentic crypto degen phrases ("GOD CANDLE SURGE", "BEAR MARKET DUMP", "LOCK IN YOUR AIRDROP BAG", "CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT.") immediately upgrades HUD, lobby, tutorial, modal, and post-run screens.
3. **From Observation 1.3 (Hero Presentation)**: The hero section feels like a standard SaaS card stack because the Ape mascot is just a floating PNG and the buttons are generic web pills.
   - *Inference*: Restructuring the hero into a retro-modern **Arcade Cabinet Battle Station** with glowing neon bezels (`#00FFA3` / `#FFD000`), a CRT scanline screen framing the mascot, and tactile arcade pushbuttons (1P Start / Free Practice) delivers the authentic arcade feel demanded by R3.
4. **From Observation 1.3 (Redundancy)**: The home lobby currently has 5 large How-to-Play cards plus a candle legend that duplicates `/how-to-play`.
   - *Inference*: Replacing this section on the home page with **3 crisp, interactive tactical rule cards (`Chop -> Jump -> Pump`)** eliminates redundancy, speeds up page comprehension, and creates an intuitive 1-2-3 tactical onboarding funnel. `/how-to-play` remains the authoritative in-depth playbook.
5. **From Observation 1.3 (Smoke Test)**: Automated testing strictly validates `body.includes("$TAP CHOP GAME")` on `/play` and `body.includes("How to Play")` on `/how-to-play`.
   - *Inference*: New copy must preserve these exact strings as eyebrows, subtitles, or metadata so that automated builds and smoke tests pass at 100%.

---

## 3. Caveats

1. **Automated Smoke Test Compatibility**:
   `scripts/smoke-test.mjs` checks for exact substring `"$TAP CHOP GAME"` on `/play` and `"How to Play"` on `/how-to-play`. Even though the main banner should be `"CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT."`, the string `"$TAP CHOP GAME"` must be maintained in the eyebrow or cabinet marquee tag to prevent test breakage.
2. **Colorblind Accessibility**:
   The `CandleLegend` and HUD support a colorblind toggle (Blue `#3B82F6` / Orange `#F97316`). Any new styling or degen terminology for God Candles (Green) and Bear Dumps (Red) must continue honoring `colorblindMode` glyphs (▲/🔷 for points, ▼/🟠 for penalty).
3. **Mobile Screen Real Estate**:
   The Arcade Cabinet frame in the hero must be fully responsive. On desktop, it can have full cabinet wings and side bezels. On mobile (< 600px), it should collapse gracefully into a compact CRT screen and oversized thumb-friendly arcade pushbuttons without awkward horizontal overflow.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 R1: Copy Catalog (Current vs. Recommended Replacement)

| Key / File Location | Current Text | Recommended Replacement | Rationale |
| :--- | :--- | :--- | :--- |
| `strings.ts:8` `gameTitle` | `"$TAP CHOP GAME"` | `"$TAP CHOP GAME"` | Retained for brand consistency & smoke test |
| `strings.ts:9` `tagline` | `"CHOP. COLLECT. COMPETE."` | `"CHOP TIMBER. RIDE THE PUMP. DON'T GET REKT."` | Authoritative slogan from requirements |
| `strings.ts:10` `heroSubcopy` | `"Chop the green candles. Dodge the red. The chart never stops climbing."` | `"Slice green candles for God Candle surges. Leap over brutal red dumps. The Solana chart pumps forever — don't get liquidated."` | High-energy crypto platformer voice |
| `strings.ts:11` `infiniteLevelsRule` | `"Levels continue without a predefined maximum. A run ends only when you fail or quit."` | `"The Solana chart has no ceiling. Infinite levels, accelerating velocity. You only stop when the clock liquidates you or you cash out."` | De-slops "predefined maximum" |
| `strings.ts:26` `playNow` | `"Play Now"` | `"DROP IN & CHOP"` | Arcade action phrasing |
| `strings.ts:28` `tryDemo` | `"Try Demo"` | `"FREE PRACTICE"` | Differentiates guest practice from real run |
| `strings.ts:29` `starting` | `"Starting…"` | `"IGNITING ENGINE…"` | Arcade boot feel |
| `strings.ts:30` `endRun` | `"END RUN"` | `"CASH OUT / SURRENDER"` | Crypto trading risk/reward feel |
| `strings.ts:31` `playAgain` | `"Play Again"` | `"RUN IT BACK"` | Classic arcade/degen slang |
| `strings.ts:32` `shareScore` | `"Share Score"` | `"FLEX SCORE ON X"` | Authentic Web3 social CTA |
| `strings.ts:34` `connectToSave` | `"Connect wallet to save scores & earn $TAP"` | `"Connect wallet to lock scores & farm $TAP"` | De-slops corporate wording |
| `strings.ts:35` `walletRequiredNote` | `"A connected Solana wallet is required to save your record and earn $TAP."` | `"Plug in your Phantom or Solflare wallet to claim your leaderboard rank and lock in your airdrop bag."` | Direct Web3 community callout |
| `strings.ts:38` `currentRun` | `"CURRENT RUN"` | `"MISSION BRIEFING"` | Arcade battle station terminology |
| `strings.ts:50` `globalWeeklyTreesFallback` | `"142,850 trees chopped by players this week"` | `"142,850+ timber felled across Solana this week"` | Degen community framing |
| `strings.ts:53` `greenPoints` | `"+ POINTS"` | `"+ GOD CANDLE SURGE"` | Signature Solana trading concept |
| `strings.ts:54` `redPenalty` | `"− PENALTY"` | `"− BEAR MARKET DUMP"` | Signature Solana trading concept |
| `strings.ts:55` `greenTooltip` | `"Green candles reward +10 bonus points"` | `"Green candles ignite God Candle Surges (+10 pts & combo multipliers)"` | Explains combo mechanic |
| `strings.ts:56` `redTooltip` | `"Red candles deduct −25 points and 3 seconds"` | `"Red candles dump your bag (−25 pts & −3s clock burn)"` | Emphasizes time penalty urgency |
| `strings.ts:87` `howToPlay.runEnd.desc` | `"A run terminates when your timer drops to zero or when you choose to quit. Every millisecond counts."` | `"Your run gets liquidated when the clock strikes zero or you hit Cash Out. Every split-second hop matters."` | De-slops "terminates when timer drops to zero" |
| `strings.ts:116` `newPersonalBest` | `"New personal best!"` | `"🚀 NEW ALL-TIME HIGH (ATH)!"` | Authentic crypto degen celebration |
| `strings.ts:117` `awayFromBest` | `"away from your best"` | `"from breaking your ATH"` | Crypto high-score metric |
| `strings.ts:118` `demoBadge` | `"DEMO — SCORE NOT SAVED"` | `"FREE PRACTICE — UNVERIFIED RUN"` | Clearer arcade distinction |
| `strings.ts:119` `demoNotice` | `"You played in Demo Mode. Connect your Solana wallet..."` | `"Practice run completed! Connect your Solana wallet to write verified runs to the leaderboard and lock in your airdrop bag."` | Punchy Web3 incentive |
| `strings.ts:129` `rewardsBackendNotice` | `"TODO: Actual $TAP claim distribution and token conversions are wired to on-chain pool."` | `"Rewards Pool: Daily community distributions are calculated based on verified leaderboard scores and eligible $TAP token holdings."` | Eliminates visible "TODO" |
| `layout.tsx:8` `title` | `"$TAP — Chop. Collect. Compete."` | `"$TAP Arcade — Chop Timber. Ride The Pump. Don't Get Rekt."` | Browser tab title upgrade |
| `layout.tsx:9-10` `description` | `"$TAP is a competitive arcade game. Chop trees..."` | `"The high-octane Solana arcade battle station. Chop timber, ride God Candle surges, dodge brutal bear market dumps, and lock in your airdrop bag."` | Meta description polish |
| `play/page.tsx:592` `buy-tap-badge` | `"DEX MONETIZATION"` | `"TRADE $TAP"` | Eliminates corporate slide buzzword |
| `how-to-play/page.tsx:23` `eyebrow` | `"OFFICIAL ARCADE PLAYBOOK"` | `"DEGEN COMBAT PLAYBOOK"` | Thematic playbook title |
| `how-to-play/page.tsx:29` `strip-sub` | `"Master the charts, jump over hazardous red candles..."` | `"Chop timber, ride God Candle surges, dodge brutal bear market dumps, and lock in your airdrop bag."` | Playbook de-slop |
| `WalletButton.tsx:262` | `"Gasless signature authentication active."` | `"Gasless signature verified — zero SOL transaction fees."` | Clear Solana benefit |
| `WalletButton.tsx:285` | `"✦ Instant & Gasless Login"` | `"✦ Instant & 100% Gasless Login"` | Emphasizes free auth |

---

### 4.2 R3: Arcade Cabinet Battle Station Specifications

#### 1. Hero Arcade Cabinet Structure (`src/app/play/page.tsx`)
Replace the loose hero container with an integrated **Arcade Cabinet Unit**:

```tsx
<section className="arcade-cabinet-station" aria-label="Arcade Battle Station">
  {/* Ambient Parallax Backdrop */}
  <div className="px-l1" style={{ backgroundImage: "url(/assets/bg/sky.png)" }} />
  <div className="px-l2" style={{ backgroundImage: "url(/assets/bg/far.png)" }} />
  <div className="px-l3" style={{ backgroundImage: "url(/assets/bg/mid.png)" }} />
  <div className="px-ground" style={{ backgroundImage: "url(/assets/bg/ground.png)" }} />
  <div className="px-veil" />
  <div className="leaf-field" aria-hidden="true"><i /><i /><i /><i /></div>

  {/* ARCADE CABINET CHASSIS */}
  <div className="cabinet-chassis">
    
    {/* 1. Marquee Header */}
    <div className="cabinet-marquee">
      <div className="marquee-bezel-lights">
        <span className="bezel-led led-green" />
        <span className="bezel-led led-gold" />
        <span className="bezel-led led-green" />
      </div>
      <div className="marquee-center">
        <div className="marquee-eyebrow">$TAP CHOP GAME · UNIT 01</div>
        <h1 className="marquee-heading">
          CHOP TIMBER. <span className="gold-text">RIDE THE PUMP.</span> DON&apos;T GET REKT.
        </h1>
      </div>
      <div className="marquee-credit-badge">
        <span className="credit-dot pulse" />
        <span>{walletConnected ? "PILOT READY" : "FREE PLAY"}</span>
      </div>
    </div>

    {/* 2. CRT Screen Bezel Stage (Framing Ape Mascot & Status) */}
    <div className="cabinet-crt-screen">
      <div className="crt-scanlines" />
      <div className="crt-stage-inner">
        {/* Ape Mascot on Hologram Pedestal */}
        <div className="crt-mascot-pod">
          <div className="crt-hologram-glow" />
          <img src="/assets/ape/idle.png" alt="$TAP Ape" className="float-ape cabinet-ape" />
        </div>

        {/* Tactical Screen Telemetry */}
        <div className="crt-telemetry">
          <p className="crt-tagline">{strings.heroSubcopy}</p>
          <div className="crt-quick-pills">
            <div className="crt-pill green-pill">
              <span className="pill-arrow">▲</span>
              <span>GREEN: GOD CANDLE SURGE (+10 PTS)</span>
            </div>
            <div className="crt-pill red-pill">
              <span className="pill-arrow">▼</span>
              <span>RED: BEAR MARKET DUMP (−25 PTS / −3s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 3. Retro Arcade Control Deck */}
    <div className="cabinet-control-deck">
      {/* Joystick / Key Guide */}
      <div className="deck-guide">
        <div className="deck-key-cluster">
          <span className="arcade-key">A</span>
          <span className="arcade-key">D</span>
          <span className="key-action">SPRINT</span>
        </div>
        <div className="deck-key-cluster">
          <span className="arcade-key key-space">SPACE</span>
          <span className="key-action">JUMP</span>
        </div>
      </div>

      {/* Chunky Arcade Pushbuttons */}
      <div className="deck-pushbuttons">
        <button
          type="button"
          className="arcade-btn btn-practice"
          onClick={startDemoRun}
        >
          <span className="arcade-btn-cap">⚡</span>
          <div className="arcade-btn-labels">
            <span className="arcade-btn-title">{strings.tryDemo}</span>
            <span className="arcade-btn-sub">PRACTICE (FREE)</span>
          </div>
        </button>

        <button
          type="button"
          className="arcade-btn btn-chop-now glow-solana"
          onClick={startRealRun}
          disabled={starting || meLoading || !config || config.maintenance}
        >
          <span className="arcade-btn-cap">🪓</span>
          <div className="arcade-btn-labels">
            <span className="arcade-btn-title">
              {starting
                ? strings.starting
                : walletConnected
                ? strings.playNow
                : strings.connectWallet}
            </span>
            <span className="arcade-btn-sub">
              {walletConnected ? "RECORD ATH RUN" : "CONNECT SOLANA"}
            </span>
          </div>
        </button>
      </div>

      {/* Coin Slot / Supported Wallets Row */}
      <div className="deck-wallet-slot">
        {!walletConnected ? (
          <div className="slot-auth-prompt">
            <span className="slot-led" />
            <span className="slot-copy">LOCK IN YOUR AIRDROP BAG:</span>
            <WalletBadges />
          </div>
        ) : (
          <div className="slot-authenticated">
            <span className="pilot-dot" />
            <span>AUTHENTICATED PILOT: {me?.walletAddress?.slice(0, 4)}…{me?.walletAddress?.slice(-4)}</span>
          </div>
        )}
      </div>
    </div>

  </div>
</section>
```

#### 2. Consolidation of How-to-Play into 3 Tactical Rule Cards
Replace the 5 bloated cards in Section 2 of `src/app/play/page.tsx` with **3 Crisp Interactive Tactical Cards**:

```tsx
{/* SECTION 2: 3 TACTICAL RULES (CHOP -> JUMP -> PUMP) */}
<section className="lobby-section tactical-rules-section" aria-label="Tactical Rules">
  <div className="section-header">
    <span className="eyebrow">FIELD TACTICS</span>
    <h2 className="card-title display-title">HOW TO PLAY</h2>
    <p className="sub">Three core rules to survive the chart climb and lock in your airdrop bag.</p>
  </div>

  <div className="tactical-cards-grid">
    {/* CARD 1: CHOP */}
    <div className="tactical-card card-chop">
      <div className="tactical-card-top">
        <span className="step-badge">STEP 01</span>
        <span className="tactical-icon">🪓</span>
      </div>
      <h3 className="tactical-title">1. CHOP TIMBER</h3>
      <p className="tactical-desc">
        Sprint up to trees to fell them automatically. Hit level tree quotas to clear the board and bank vital extra time before the clock drops to zero.
      </p>
      <div className="tactical-metric green-metric">
        <span>+100 PTS</span>
        <span className="metric-sub">per tree felled</span>
      </div>
    </div>

    {/* CARD 2: JUMP */}
    <div className="tactical-card card-jump">
      <div className="tactical-card-top">
        <span className="step-badge red-step">STEP 02</span>
        <span className="tactical-icon">🦘</span>
      </div>
      <h3 className="tactical-title">2. JUMP RED DUMPS</h3>
      <p className="tactical-desc">
        Red candles represent sudden market dumps. Hitting red candles or obstacles bleeds run time and slashes points. Leap cleanly with [SPACE] or mobile [JUMP].
      </p>
      <div className="tactical-metric red-metric">
        <span>−25 PTS & −3.0s</span>
        <span className="metric-sub">dump collision penalty</span>
      </div>
    </div>

    {/* CARD 3: PUMP */}
    <div className="tactical-card card-pump">
      <div className="tactical-card-top">
        <span className="step-badge gold-step">STEP 03</span>
        <span className="tactical-icon">🚀</span>
      </div>
      <h3 className="tactical-title">3. RIDE GOD CANDLES</h3>
      <p className="tactical-desc">
        Slice through neon green candles to trigger God Candle Surges, chaining up to 10x combo multipliers. The chart climbs infinitely with escalating speed.
      </p>
      <div className="tactical-metric gold-metric">
        <span>+10 PTS & 2x–10x</span>
        <span className="metric-sub">streak multiplier</span>
      </div>
    </div>
  </div>

  {/* Deep Dive Link to Full Rules */}
  <div className="tactical-playbook-footer">
    <Link href="/how-to-play" className="btn btn-ghost tactical-playbook-link">
      <span>📖</span>
      <span>Need detailed platform mechanics & control keys? View Full Official Playbook →</span>
    </Link>
  </div>
</section>
```

#### 3. Styling Specifications to be Added/Updated in `src/app/globals.css`
- **Cabinet Chassis**:
  - `background`: `linear-gradient(180deg, #0f1a20 0%, #080d12 100%)`
  - `border`: `2px solid #1e383c`
  - `box-shadow`: `0 0 35px rgba(0, 255, 163, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08)`
  - `border-radius`: `18px`
- **Glowing Bezels**:
  - LED indicators: Green (`#00FFA3`), Gold (`#FFD000`) with `box-shadow: 0 0 10px currentColor`
- **CRT Screen**:
  - `background`: `#04080b`
  - Border with curved inner corners (`border-radius: 12px`)
  - Scanlines pattern: `repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)`
- **Arcade Pushbuttons**:
  - 3D beveled appearance: `box-shadow: 0 5px 0 #00995c, 0 8px 20px rgba(0, 255, 163, 0.35)`
  - Active press: `transform: translateY(3px); box-shadow: 0 2px 0 #00995c;`

---

## 5. Verification Method

To independently verify these findings and confirm the planned improvements:

1. **Verify Exact String Locations**:
   ```powershell
   grep -n "predefined maximum" src/i18n/strings.ts
   grep -n "TODO: Actual" src/i18n/strings.ts
   grep -n "DEX MONETIZATION" src/app/play/page.tsx
   ```
2. **Verify Smoke Test Substring Constraints**:
   ```powershell
   cat scripts/smoke-test.mjs
   ```
   Confirm that `$TAP CHOP GAME` and `Phantom` are verified on `/play`, and `How to Play` and `Solana` are verified on `/how-to-play`.
3. **Verify Build Health**:
   ```powershell
   npm run build
   ```
   Must compile Next.js production bundle with 0 TypeScript/ESLint errors.
4. **Verify Smoke Test Execution**:
   Start server (`npm run start` or `npm run dev`) and run:
   ```powershell
   node scripts/smoke-test.mjs
   ```
   Expect: `ALL LIVE SMOKE TESTS PASSED (100% HEALTHY)`.
