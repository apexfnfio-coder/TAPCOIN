# Mobile Layout Guidelines — $TAP Chimp

## Overview

Comprehensive responsive design guidelines for $TAP Chimp across all mobile form factors. This document defines how the game adapts from desktop to tablet to phone, ensuring optimal playability and visual clarity at every breakpoint.

---

## 📱 Breakpoint Strategy

### Defining Characteristics

| Device | Orientation | Width | Height | Trigger |
|--------|-------------|-------|--------|---------|
| Small Phone | Portrait | ≤ 420px | Any | `.rotate-prompt` appears |
| Large Phone | Portrait | ≤ 700px | Any | `.rotate-prompt` appears |
| Tablet (small) | Any | 761px–1024px | Any | Full layout |
| Phone | Landscape | Any | ≤ 560px | Compact HUD mode |
| Desktop | Any | ≥ 1024px | Any | Full layout |

### Key Triggers Used
```css
/* Portrait phone detection */
@media (orientation: portrait) and (max-width: 700px) and (pointer: coarse)

/* Landscape phone with short height */
@media (orientation: landscape) and (max-height: 560px)

/* Small portrait phones */
@media (max-width: 420px)
```

---

## 🎯 Viewport Optimization

### Desktop (>1024px)

#### Layout Structure
```
+-------------------------------------------+
|  Nav Bar                                  |
|                                          |
|  [Game Canvas (16:9 aspect)]            |
|  [Control hint text below]              |
|                                          |
+-------------------------------------------+
```

**Dimensions**:
- Max container width: 1360px
- Game shell: `width: 100%; aspect-ratio: 16 / 9;`
- Padding-top: 22px

### Landscape Phone (Height ≤ 560px)

#### Challenges
- Very limited vertical space
- Touch controls need room
- HUD must not overlap game area

#### Adaptations
1. **Stage sizing**: 
   ```css
   .game-shell {
     width: min(100%, calc((100dvh - 84px) * 16 / 9));
     height: auto;
   }
   ```
   Stage derives width from available height, maintaining exact 16:9 aspect

2. **HUD compaction**:
   - Top padding: 8px (reduced from 12px)
   - Box min-width: 60px (reduced from 92px)
   - Box padding: 4px 9px (reduced from 8px 16px)
   - Font sizes reduced proportionally

3. **Control hints hidden**:
   ```css
   .play-hint { display: none; }
   ```

4. **Results panel**:
   ```css
   .results-panel {
     max-height: calc(100dvh - 116px);
     padding: 20px 20px;
   }
   ```

#### Visual Layout
```
+-------------------------------------------+
|  [Game Canvas]                            |
|  ┌────────────────────────────┐           |
|  │ HUD boxes (compact)        │           |
|  │ [Lv] [G] [Sc] [Rd] [Tm]    │           |
|  └────────────────────────────┘           |
|  ┌────────────────────────────┐           |
|  │ [Progress bar]             │           |
|  └────────────────────────────┘           |
|                                           |
|         ← LEFT    RIGHT →     JUMP        |
|                                           |
+-------------------------------------------+
```

### Portrait Phone (≤ 700px wide, coarse pointer)

#### Rotate Prompt

##### Visual Design
```
┌──────────────────────────────────────┐
│                                      │
│   [Animated phone icon]              │
│   (rotating 0° → -90°)               │
│                                      │
│   ROTATE YOUR PHONE                  │
│                                      │
│   $TAP Chimp is built for            │
│   landscape — flip your device       │
│   sideways to play.                  │
│                                      │
│                                      │
│   ┌──────┐     ┌──────────┐         │
│   │      │     │          │         │
│   │  📱  │ ─→  │  📱      │         │
│   │ portrait │ │ landscape │         │
│   └──────┘     └──────────┘         │
│                                      │
└──────────────────────────────────────┘
```

##### Technical Specifications
- **Background**: Radial gradient `#13261b` → `#070d0a`
- **Device icon**: 46×80px, animated border rotation
- **Z-index**: 400 (above all other elements)
- **Activation**: Only on touch devices in portrait orientation

##### Why Not Force Landscape?
Forcing orientation-lock via JavaScript is unreliable and creates UX friction. The prompt approach is:
- Non-invasive
- Respects user preference
- Works across browsers
- Clearly communicates the requirement

---

## 📐 Element Specifications by Breakpoint

### HUD Box Dimensions

| Metric | Desktop | Landscape Phone | Small Portrait |
|--------|---------|-----------------|----------------|
| Min width | 92px | 60px | 74px |
| Padding | 8px 16px | 4px 9px | 6px 10px |
| Label font | 9.5px | 8px | 8px |
| Value font | 21px | 15px | 17px |
| Timer margin-right | 74px | 58px | auto |

### Touch Control Dimensions

| Metric | Desktop | Landscape Phone | ≤420px |
|--------|---------|-----------------|--------|
| Button padding | 12px 18px | 10px 14px | 8px 10px |
| Button gap | 10px | 6px | 4px |
| Font size | 13.5px | 12px | 11px |
| Arrow icon | 14px | 14px | 12px |
| Jump button padding | 12px 24px | 10px 18px | 8px 14px |
| Bottom offset | 18px | 10px | 8px |
| Side padding | 20px | 10px | 6px |
| Keyboard hint | shown | hidden | hidden |

### Results Panel

| Metric | Desktop | Landscape Phone | ≤420px |
|--------|---------|-----------------|--------|
| Max width | 460px | 460px | auto |
| Padding | 30px 28px | 20px 20px | 22px 16px |
| Max height | auto | 100dvh - 116px | auto |
| Score font | 52px | 38px | 40px |
| Panel animation | popIn 0.35s | same | same |

### Wallet Modal

| Metric | Desktop | ≤420px |
|--------|---------|--------|
| Max width | 440px | 440px |
| Body padding | 18px 20px 22px | 14px 16px 18px |
| Close button | 32×32px | 32×32px |

---

## 🔤 Typography Adjustments by Screen

### Responsive Font Adjustments
```css
/* Desktop */
.hud-box .v { font-size: 21px; }

/* Small screens */
@media (max-width: 760px) {
  .hud-box { min-width: 74px; padding: 6px 10px; }
  .hud-box .v { font-size: 17px; }
}

/* Very small screens */
@media (max-width: 420px) {
  .touch-btn { font-size: 11px; }
}
```

---

## 👆 Touch Target Compliance

### WCAG Requirement: ≥44px touch targets

#### Current Implementation
| Element | Actual Size | Compliance |
|---------|-------------|------------|
| HUD boxes | 92×~50px | ✅ |
| Touch buttons | ~60×60px | ✅ |
| Quit button | ~40×36px | ⚠️ Borderline — text only, minimal padding |
| Nav links | ~80×42px | ✅ |
| Wallet modal buttons | Full width, 44px+ height | ✅ |

#### Recommended Improvement
```css
/* Increase quit button tap area */
.hud-quit {
  padding: 8px 13px;
  min-width: 44px;
  min-height: 44px;
}
```

---

## 🧭 Navigation & Flow

### Mobile Navigation Drawer
- Triggered by burger menu (hidden on desktop nav)
- `position: absolute; top: 62px; left: 0; right: 0;`
- Background: `var(--bg-1)`
- Full height, scrollable
- Closes on any link click

### Game Entry Flow (Mobile)
```
1. User lands on lobby page
   → Portrait → show rotate prompt
2. User rotates to landscape
   → Rotate prompt hides
   → Game stage appears
3. User finishes game
   → Results panel slides in (with scroll if needed)
4. User clicks "View Leaderboard"
   → Full page navigation
5. User clicks back
   → Back to lobby
```

---

## 🧪 Testing Matrix

### Devices to Test

| Device | OS | Orientation | Expected Result |
|--------|----|-------------|-----------------|
| iPhone SE (3rd gen) | iOS 16 | Portrait | Rotate prompt shows |
| iPhone SE (3rd gen) | iOS 16 | Landscape | Full game view visible |
| Pixel 7a | Android 14 | Portrait | Rotate prompt shows |
| Pixel 7a | Android 14 | Landscape | Full game view visible |
| iPad Air | iPadOS 17 | Any | Full game view (no prompt) |
| Samsung Galaxy Tab S8 | Android 14 | Any | Full game view (no prompt) |

### Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Very short browser chrome (browser address bar hidden) | dvh units adapt correctly |
| Split-screen multitasking on iPad | Game scales down, no clipping |
| Browser zoom to 200% | HUD remains readable, no overlap |
| High contrast mode | Colors still pass 4.5:1 contrast |
| Reduced motion preference | All animations disabled |
| Slow network | Graceful timeout handling on wallet connect |

---

## 🛠 Development Notes

### CSS Units Strategy
- Use **dvh/dvw** units for full-height containers (accounts for browser UI)
- Avoid **vh** units (fixed, doesn't account for mobile browser chrome)
- Use **aspect-ratio** for game canvas (maintains 16:9 regardless of dimensions)

### Z-Index Management
1. Boot screen: 40
2. Rotate prompt: 400
3. Results backdrop: 4
4. Background layers (in results): 5
5. HUD overlay: 5 (with `pointer-events: none`)
6. Modal backdrop: 100

### Performance Considerations
- All mobile-only styles use media queries (no JS detection needed)
- Touch controls use `touch-action: none` to prevent scrolling
- Backdrop filters are hardware-accelerated
- Animations use simple transforms (not layout thrashing)

---

*Mobile Layout Guidelines v1.0 — $TAP Chimp*