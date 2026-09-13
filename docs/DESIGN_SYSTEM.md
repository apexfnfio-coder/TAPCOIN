# $TAP Chimp — Design System

## Overview

This design system provides comprehensive specifications for the $TAP Chimp game UI. All dimensions, colors, and interactions are optimized for mobile-first gameplay with desktop parity.

---

## 🎨 Design Tokens

### Color System

| Token | Light (simulated) | Dark Theme | Usage |
|-------|------------------|------------|-------|
| `--color-bg-primary` | #070d0a | #070d0a | Main game canvas background |
| `--color-bg-secondary` | #0c1510 | #0c1510 | Main content panels |
| `--color-bg-tertiary` | #101d15 | #101d15 | HUD boxes, form inputs |
| `--color-bg-overlay` | rgba(7,13,10,0.88) | rgba(7,13,10,0.88) | Modal backdrops, results overlay |
| `--color-accent-gold` | #f2b53c | #f2b53c | Primary actions, combo chip |
| `--color-accent-gold-highlight` | #ffd25e | #ffd25e | Gold gradients, hover states |
| `--color-accent-gold-deep` | #c8871e | #c8871e | Gold gradient anchors |
| `--color-success-green` | #3ddc84 | #3ddc84 | Green candles, positive feedback |
| `--color-danger-red` | #e74c3c | #e74c3c | Red hits, danger states |
| `--color-neutral-cream` | #efe3c8 | #efe3c8 | Text on dark backgrounds |
| `--color-neutral-muted` | #b9ad94 | #b9ad94 | Secondary text, hints |
| `--color-border-line` | #23402e | #23402e | Subtle borders |

### Typography System

| Element | Font Family | Size | Weight | Line Height | Usage |
|---------|-------------|------|--------|-------------|-------|
| `--font-display` | "Titan One", Arial Black, Arial | 21px (HUD), 24px (stats), 52px (results score) | 700 | 1.15 | Headers, scores, game values |
| `--font-body` | "Rubik", "Segoe UI", Arial | 15px | 400 | 1.5 | Body text, tooltips |
| `--font-mono` | "JetBrains Mono", Consolas | 13px | 500 | 1.2 | Wallet addresses, codes |

### Spacing Scale

| Token | Pixel Value | Usage |
|-------|-------------|-------|
| `--space-2` | 8px | Small padding, icon margins |
| `--space-3` | 12px | Compact HUD gaps |
| `--space-4` | 16px | Component padding, button inner space |
| `--space-6` | 24px | Section margins |
| `--space-8` | 32px | Card padding, modal body |
| `--space-12` | 48px | Large separations |

---

## 🧱 Component Library

### 1. Game HUD (Heads-Up Display)

#### Structure
```html
<div class="game-hud">
  <div class="hud-top">
    <div class="hud-box">Level</div>
    <div class="hud-box">Goal</div>
    <div class="hud-box">Score</div>
    <div class="hud-box">Red left</div>
    <div class="hud-box hud-timer">Limit</div>
  </div>
  <div class="hud-level-progress"><i /></div>
  <div class="hud-combo">🔥 Nx COMBO</div> <!-- appears when combo > 0 -->
  <div class="hud-tree"><div class="hud-treebar"><i /></div></div>
  <button class="hud-quit">END RUN</button>
  <div class="touch-controls">...</div>
</div>
```

#### Dimensions & Positioning

| Element | Position | Size | Notes |
|---------|----------|------|-------|
| `game-hud` | `position: absolute; inset: 0` | Full viewport | `pointer-events: none` on container |
| `hud-top` | `position: absolute; top: 12px; left: 14px; right: 14px` | Flexbox | Gap: 10px, `justify-content: space-between` |
| `hud-box` | Inline-block | Min-width: 92px, Padding: 8px 16px | Border-radius: 11px |
| `hud-box .k` (label) | Inside box | 9.5px, uppercase, letter-spacing: 1.6px | Color: `--cream-dim` |
| `hud-box .v` (value) | Inside box, below label | 21px, gold | Color: `--gold` or `--cream` |
| `hud-level-progress` | Position absolute | Top: 70px, Left: 14px, Right: 88px | Height: 12px, Width calc from HUD |
| `hud-combo` | Position absolute | Top: 118px, Centered X | Padding: 5px 14px, Border-radius: 999px |
| `hud-quit` | Position absolute | Top: 12px, Right: 14px | Padding: 8px 13px, font-size: 12px |
| `touch-controls` | Bottom | 18px from bottom | `pointer-events: auto` |

#### Mobile Landscape Adjustments
On landscape phones (max-height: 560px), HUD is compacted:
- Top offset reduced to 8px
- Box min-width: 60px, padding: 4px 9px
- Font sizes reduced
- Progress bar repositioned

### 2. Touch Controls

#### Structure
```html
<div class="touch-controls">
  <div class="touch-cluster-left">
    <button class="touch-btn">◀ LEFT A</button>
    <button class="touch-btn">▶ RIGHT D</button>
  </div>
  <div class="touch-cluster-right">
    <button class="touch-btn btn-jump">▲ JUMP SPACE</button>
  </div>
</div>
```

#### Button Specifications

| Property | Value |
|----------|-------|
| Size | 12px font, padding: 10px 14px (mobile), 12px 18px (jump) |
| Border-radius | 12px |
| Gap between buttons | 6-10px |
| Border | 1px solid #9a6b3e |
| Shadow | 0 4px 0 #2a1a10, 0 6px 14px rgba(0,0,0,0.35) |
| Active state | translateY(3px), brighter filter |

### 3. Rotate-to-Play Prompt

#### Structure
```html
<div class="rotate-prompt">
  <div class="rp-device">
    <!-- animated device icon -->
  </div>
  <div class="rp-title">Rotate your phone</div>
  <p class="rp-sub">$TAP Chimp is built for landscape — flip your device sideways to play.</p>
</div>
```

#### Activation Conditions
- `@media (orientation: portrait) and (max-width: 700px) and (pointer: coarse)`
- Displays only on small portrait phones (tablets exempt)

#### Animation
- `.rp-device` rotates continuously: 0° → -90° over 2.4s cycle
- Background: radial-gradient(120% 90% at 50% 0%, #13261b to #070d0a)

### 4. Results Panel

#### Structure
```html
<div class="results-backdrop" />
<div class="results-bg-wrapper">
  <div class="rb" style="background-image: url(...)" />
  <div class="rb veil" />
</div>
<div class="panel results-panel">
  <img className="results-ape" src="..." />
  <div className="tagline">Level X cleared/failed</div>
  <div className="results-score">12,500</div>
  <div className="new-best">New personal best!</div>
  <div className="results-grid">
    <div className="stat-tile">...</div>
  </div>
  <div className="actions">
    <button className="btn btn-gold">Next Level X</button>
    <Link className="btn btn-wood">View Leaderboard</Link>
  </div>
</div>
```

#### Dimensions
| Element | Size |
|---------|------|
| `results-backdrop` | `position: fixed; inset: 0; z-index: 4` |
| `results-panel` | Max-width: 460px, Padding: 30px 28px |
| `stat-tile` | Width: 100px, Height: 55px, Gap: 10px |
| `results-score` | Font-size: 52px |

#### Mobile Responsive
- `max-height: calc(100dvh - 116px)`
- `overflow-y: auto`
- Padding reduced to 20px 20px

### 5. Wallet Modal

#### Dimensions
| Element | Size |
|---------|------|
| `.modal` | Max-width: 440px, Max-height: `calc(100dvh - 28px)`, Border-radius: 16px |
| `.modal-body` | Padding: 18px 20px 22px, `overflow-y: auto` |
| `.wallet-opt` | Height: auto, Padding: 13px 15px |

#### States
- **Idle**: Shows connected wallet address with disconnect button
- **Connecting**: Shows "Connecting..." disabled state
- **Signing**: Shows "Approve the signature request in your wallet…"

---

## 📱 Responsive Layout

### Breakpoints

| Breakpoint | Width | Layout Notes |
|------------|-------|--------------|
| Mobile Portrait | ≤ 700px | Rotate prompt active, compact HUD |
| Landscape Phone | ≤ 760px (height ≤ 560px) | Stage fills viewport, HUD compact |
| Tablet | 761px - 1024px | Standard desktop layout |
| Desktop | ≥ 1024px | Full layout with lobby grid sidebar |

### Z-Index Stack

| Element | Z-Index |
|---------|---------|
| `.boot-screen` | 40 |
| `.rotate-prompt` | 400 |
| `game-canvas` | 5 (in game-hud) |
| `.results-backdrop` | 4 |
| `.results-bg-wrapper` | 5 |
| `.game-hud` | 5 (pointer-events: none) |
| `.modal-backdrop` | 100 |

---

## ♿ Accessibility

### WCAG AA Compliance
- **Color Contrast**: HUD boxes meet 4.5:1 against game background
- **Focus Targets**: Minimum 44px touch targets (buttons larger)
- **Keyboard**: Arrow keys, WASD, Space fully supported
- **Reduced Motion**: All animations respect `prefers-reduced-motion`

### Screen Reader Support
- Rotate prompt has `role="status"`
- HUD elements use semantic labels
- Modal backdrop responds to click-outside

---

## 🧪 Test Scenarios

| Scenario | Expected Behavior |
|----------|------------------|
| Start game on iPhone 13 portrait | Shows rotate prompt, device icon animates |
| Rotate to landscape | Game fills screen, prompt hidden |
| Low time (≤10s) | Timer text turns red, pulses |
| Get red candle hit | Screen flashes red, timer deducts seconds |
| Achieve combo ≥5 | Combo chip shows with gold border |
| Game complete | Results panel scrolls if content overflows |
| Connect wallet on mobile | Modal fits screen, scrollable if needed |
| Network timeout | Shows error message in wallet modal |

---

*Design System v1.0 — $TAP Chimp