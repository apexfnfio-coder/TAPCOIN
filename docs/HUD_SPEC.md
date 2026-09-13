# HUD & Game UI Component Specification

## Overview

Complete visual specification for all HUD components in $TAP Chimp. All dimensions assume the 16:9 game viewport at 1280×720 unless noted otherwise.

---

## 🎮 Main Game HUD

### Container Layout

```
+----------------------------------------------------------+
| [Level 1] [Goal 3/5] [Score 1,250] [Red left 5] [0:42] × |
| [████████████████████████████████████████████████████] |
|                      🔥 3x COMBO                          |
|                              [TREE HP BAR]              |
|                                                           |
|                                                           |
|         LEFT    RIGHT          JUMP                      |
|                                                           |
+----------------------------------------------------------+
```

### HUD Top Bar (hud-top)

#### Positioning
- Top: 12px from viewport edge
- Horizontal padding: 14px on both sides
- Layout: `display: flex; justify-content: space-between; align-items: flex-start;`

#### Box Specifications

| Box Type | Width | Padding | Label Color | Value Color | Notes |
|----------|-------|---------|-------------|-------------|-------|
| Level | 92px | 8px 16px | `#b9ad94` (cream-dim) | `#f2b53c` (gold) | Standard |
| Goal | 92px | 8px 16px | `#b9ad94` | `#efe3c8` (cream) | Standard |
| Score | 110px | 8px 16px | `#b9ad94` | `#f2b53c` | Standard |
| Red left | 92px | 8px 16px | `#b9ad94` | `#efe3c8` | Standard |
| Limit (timer) | 92px | 8px 16px | `#b9ad94` | `#f2b53c` → `#e74c3c` (red when low) | Pulses when `timeLeft ≤ 10s` |

#### Typography Inside Boxes
- **Label** (`.k`):
  - Font: 9.5px
  - Weight: 700
  - Text-transform: uppercase
  - Letter-spacing: 1.6px
  - Color: `#b9ad94`
  - Display: block above value

- **Value** (`.v`):
  - Font: 21px (font-display family)
  - Line-height: 1.15
  - Color: Gold (`#f2b53c`) or Cream (`#efe3c8`)
  - For timer, turns red (`#e74c3c`) when ≤ 10 seconds, pulses with `animation: pulse 0.8s infinite`

#### Timer Low-State Behavior
When `timeLeft ≤ 10`:
- Value color: `#e74c3c`
- Animation: `pulse` (opacity 0.35 at 50%)
- Additional: Screen-wide subtle red vignette may be triggered at ≤5s

### Level Progress Bar (hud-level-progress)

#### Positioning
- Top: 70px
- Left: 14px, Right: 88px
- Height: 12px

#### Visual Style
- **Background**: `rgba(7,13,10,0.74)` with `1px solid #23402e`
- **Border-radius**: 999px
- **Fill element** (`<i>`):
  - Height: 100%
  - Background: `linear-gradient(90deg, #1fa85c, #ffd25e)`
  - Width: Dynamic based on `progress / targetTrees * 100`
  - Transition: 0.18s ease

#### Mobile Landscape
- Top: 54px
- Height: 9px
- Right: 72px

### Tree HP Bar (hud-tree)

#### Positioning
- Top: 91px
- Centered: `left: 50%; transform: translateX(-50%)`
- Width: 210px

#### Visual Style
- **Container**: `background: rgba(7,13,10,0.7)`, `1px solid #23402e`, `border-radius: 6px`
- **Fill bar** (`<i>`):
  - Height: 100%
  - Width: `treeHpPct * 100%`
  - Gradient: `linear-gradient(90deg, #ffd25e → #f2b53c)` (healthy) or `linear-gradient(90deg, #b02718 → #e74c3c)` (≤35% HP)
  - Transition: 0.18s ease

#### Mobile Landscape
- Top: 70px
- Width: 160px

### Combo Chip (hud-combo)

#### Positioning
- Top: 118px
- Centered: `left: 50%; transform: translateX(-50%)`
- Only visible when `hud.combo > 0`

#### Visual Style
- **Background**: `linear-gradient(180deg, rgba(242,181,60,0.2), rgba(200,135,30,0.12))`
- **Border**: `1px solid #c8871e`
- **Border-radius**: 999px
- **Padding**: 5px 14px
- **Backdrop-filter**: blur(3px)

#### Typography
- Font: `font-display`
- Size: 14px
- Letter-spacing: 1px
- Color: `#ffd25e`
- Text shadow: `0 2px 0 rgba(0,0,0,0.5)`

#### Mobile Landscape
- Top: 88px
- Font-size: 12px
- Padding: 3px 11px

### Quit Button (hud-quit)

#### Positioning
- Top: 12px
- Right: 14px
- `pointer-events: auto`

#### Visual Style
- Background: `rgba(7,13,10,0.78)`
- Border: `1px solid #23402e`
- Border-radius: 10px
- Padding: 8px 13px
- Font-weight: 800
- Font-size: 12px
- Letter-spacing: 1px
- Color: `#b9ad94` (cream-dim)

#### Hover State
- Color: `#efe3c8`
- Border-color: `#b02718` (red-deep)

---

## 👆 Touch Controls (touch-controls)

### Container Layout
- Position: `absolute; bottom: 18px; left: 0; right: 0`
- Z-index: 10
- Layout: `display: flex; justify-content: space-between; align-items: flex-end;`
- Padding: 0 20px

#### Mobile (max-width: 760px)
- Bottom: 12px
- Padding: 0 10px

#### Mobile (max-width: 420px)
- Bottom: 8px
- Padding: 0 6px

### Left Cluster (touch-cluster-left)

Layout: `display: flex; gap: 10px`

#### Buttons
- **Left Button**: ◀ LEFT + "A" hint
- **Right Button**: ▶ RIGHT + "D" hint

### Right Cluster (touch-cluster-right)

Layout: Single button

#### Jump Button (.btn-jump)
- Special styling: Gold gradient background
- Icon: ▲
- Label: JUMP
- Hint: SPACE

### Button Specifications (All Variants)

| Property | Standard | Jump Variant |
|----------|----------|--------------|
| Height | Auto | Auto |
| Padding | 12px 18px | 12px 24px |
| Border-radius | 12px | 12px |
| Border | 1px solid #9a6b3f | 1px solid #ffe17d |
| Color | #efe3c8 (cream) | #2a1a0c (dark brown) |
| Box-shadow | 0 4px 0 #2a1a10, 0 6px 14px rgba(0,0,0,0.35) | 0 4px 0 #7a5410, 0 6px 16px rgba(242,181,60,0.3) |
| Transition | transform 0.08s, filter 0.1s | transform 0.08s, filter 0.1s |

#### Active/Pressed State
All buttons:
- transform: translateY(3px)
- box-shadow: 0 1px 0, 0 2px 6px rgba(0,0,0,0.4)
- filter: brightness(1.15)

Jump variant active:
- filter: brightness(1.12)

### Inner Button Elements

| Element | Class | Style |
|---------|-------|-------|
| Arrow icon | `.arr` | Font-size: 14px, color: gold (#f2b53c) |
| Button label | `.btn-label` | Font-weight: 900, letter-spacing: 0.8px |
| Keyboard hint | `.kbd-hint` | 10px monospace, background rgba(0,0,0,0.35), border 1px rgba(255,255,255,0.18) |

---

## 🔄 Rotate-to-Play Prompt

### Visibility Conditions
```css
@media (orientation: portrait) and (max-width: 700px) and (pointer: coarse)
```
Only activates on **touch devices** in **portrait** orientation **under 700px wide**.

### Visual Elements

| Element | Class | Dimensions | Style |
|---------|-------|------------|-------|
| Container | `.rotate-prompt` | Full viewport | `z-index: 400`, `display: flex; flex-direction: column; align-items: center;` |
| Device icon | `.rp-device` | 46×80px | Border: 3px solid gold, border-radius: 11px, animation: `rpRotate 2.4s infinite` |
| Title | `.rp-title` | Auto | Font-display, 27px, color: #efe3c8, text-shadow: 0 3px 0 rgba(0,0,0,0.55) |
| Subtitle | `.rp-sub` | Max-width 300px | Font-size: 14px, color: #7d8a7f, line-height: 1.55, text-align: center |

### Device Icon Animation

Keyframes `rpRotate`:
```
0% → 30%:  rotate(0deg)
70% → 100%: rotate(-90deg)
```

### Device Icon Details

#### Portrait Icon
- Camera punch-out in top-left corner
- Small screen showing blue tinted rectangle

#### Landscape Icon
- Same device outline rotated 90 degrees
- Screen shows actual game content representation

### Background
- Radial gradient: `radial-gradient(120% 90% at 50% 0%, #13261b 0%, #070d0a 72%)`

---

*HUD Spec v1.0 — $TAP Chimp*