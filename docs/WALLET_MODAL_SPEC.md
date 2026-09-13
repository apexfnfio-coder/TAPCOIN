# Wallet Modal Component Specification

## Overview

Detailed UI/UX specification for the wallet connection modal in $TAP Chimp. This modal must be fully visible and usable on all screen sizes, especially mobile phones where height constraints are tight.

---

## 📐 Modal Structure

```html
<div class="modal-backdrop">
  <div class="modal">
    <div class="modal-head">
      <div class="modal-title">Connect Wallet</div>
      <button class="modal-x">✕</button>
    </div>
    <div class="modal-body">
      /* Connect flow content */
      <p class="sub">Connect your Solana wallet...</p>
      <div class="wallet-opt">Phantom →</div>
      <div class="wallet-opt">Solflare →</div>
      <div class="wallet-opt">Backpack →</div>
      <button class="btn btn-ghost btn-block">Continue as Guest</button>
    </div>
  </div>
</div>
```

---

## 🎨 Modal Container Specifications

### Modal Backdrop (.modal-backdrop)
| Property | Value |
|----------|-------|
| Position | `fixed; inset: 0; z-index: 100` |
| Background | `rgba(4, 8, 6, 0.78)` |
| Display | `flex` |
| Align-items | `center` |
| Justify-content | `center` |
| Padding | 14px |
| Backdrop-filter | blur(4px) |
| Animation | fadeIn 0.18s ease |

### Modal Core (.modal)
| Property | Value |
|----------|-------|
| Width | 100% |
| Max-width | 440px |
| Background | Gradient: `#18291e` → `#101d15` |
| Border | 1px solid #23402e |
| Border-radius | 16px |
| Box-shadow | 0 24px 60px rgba(0,0,0,0.6) |
| Animation | popIn 0.2s ease |
| **Max-height** | `calc(100dvh - 28px)` |
| **Display** | `flex; flex-direction: column` |

### Modal Head (.modal-head)
| Property | Value |
|----------|-------|
| Display | flex |
| Align-items | center |
| Justify-content | space-between |
| Padding | 18px 20px 0 |
| Flex-shrink | 0 |

### Modal Title (.modal-title)
| Property | Value |
|----------|-------|
| Font | Titan One, Arial Black |
| Size | 20px |
| Color | #efe3c8 |

### Close Button (.modal-x)
| Property | Value |
|----------|-------|
| Background | #101d15 |
| Border | 1px solid #23402e |
| Color | #b9ad94 |
| Border-radius | 8px |
| Width | 32px |
| Height | 32px |
| Font-size | 15px |
| Flex-shrink | 0 |

### Modal Body (.modal-body)
| Property | Value |
|----------|-------|
| Padding | 18px 20px 22px |
| **Overflow-y** | auto |
| **-webkit-overflow-scrolling** | touch |
| **flex** | 1 (inherits from parent's flex column) |

---

## 📱 Mobile Responsiveness

### Small Phones (≤ 420px)

#### Adjustments
```css
@media (max-width: 420px) {
  .modal { 
    max-width: 90vw; /* tighter horizontal constraint */
  }
  .modal-head { padding: 18px 16px 0; }
  .modal-body { padding: 14px 16px 18px; }
}
```

#### Height Constraint
- Uses `100dvh - 28px` — dynamic viewport height unit
- Accounts for browser address bar collapsing
- Ensures modal never touches screen edges

### Landscape Phones (max-height: 560px)

#### Special Handling
- Modal becomes vertically compact
- Body region scrolls independently
- Header and footer remain visible

### Touch Scrolling
- `-webkit-overflow-scrolling: touch` for smooth iOS scrolling
- Content scrolls inside `.modal-body` without page jump
- `overscroll-behavior: contain` prevents nested scroll chaining

---

## 💳 Wallet Options List

### Wallet Option Item (.wallet-opt)
| Property | Value |
|----------|-------|
| Display | flex; align-items: center; gap: 13px |
| Width | 100% |
| Background | #101d15 |
| Border | 1px solid #23402e |
| Border-radius | 11px |
| Padding | 13px 15px |
| Margin-bottom | 9px |
| Font-weight | 700 |
| Font-size | 14.5px |
| Transition | border-color 0.15s, background 0.15s |

### Wallet Icon (.wicon)
| Property | Value |
|----------|-------|
| Width | 30px |
| Height | 30px |
| Border-radius | 8px |
| Display | flex; align-items: center; justify-content: center |
| Font-weight | 900 |
| Font-size | 13px |
| Color | white |

### Wallet Arrow (.arrow)
| Property | Value |
|----------|-------|
| Margin-left | auto |
| Color | #7d8a7f |

### Wallet Option States
```css
.wallet-opt:hover:not(:disabled) {
  border-color: var(--gold-deep);
  background: var(--bg-3);
}
.wallet-opt:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

---

## 👤 Connected Wallet View

When user is already connected (`me && !me.isGuest`):

```html
<div class="wallet-opt" style="...">
  <span class="wicon" style="background: #7c63d9">Ph</span>
  Phantom
  <span class="arrow">→</span>
</div>
<div class="field">
  <label>Account</label>
  <div style="font-weight: 700">username</div>
</div>
<button class="btn btn-ghost btn-block">Disconnect</button>
```

### Key Differences from Connect Flow
- Shows wallet address (shortened)
- Shows account name
- Only one "Disconnect" button instead of wallet list
- No "Continue as Guest" option

---

## 🌕 Guest Flow

### Guest Button (.btn-ghost.btn-block)
| Property | Value |
|----------|-------|
| Width | 100% |
| Background | #101d15 |
| Border | 1px solid #23402e |
| Color | #b9ad94 |

### Guest Helper Text
| Property | Value |
|----------|-------|
| Font-size | 13px |
| Color | #7d8a7f |
| Font-style | normal |
| Text-align | center |
| Margin-top | 10px |
| Margin-bottom | 0 |

---

## ⚠️ Error States

### Error Box Integration
```html
<div class="error-box">
  Phantom not detected. Install the Phantom extension, then retry.
</div>
```

| Property | Value |
|----------|-------|
| Background | rgba(231,76,60,0.09) |
| Border | 1px solid var(--red-deep) (#b02718) |
| Color | #f0a9a0 |
| Border-radius | 10px |
| Padding | 12px 15px |
| Font-size | 13.5px |
| Margin | 14px auto or 9px (between wallet opts) |

### Error Recovery Messaging
| Phase | Message |
|-------|---------|
| Not detected | "{Name} not detected. Install the {Name} extension, then retry." |
| User rejected | "Signature request was rejected in the wallet." |
| Network | "Connection failed." |

---

## 🔐 Accessibility

### Screen Reader Support
- Modal title is semantic `<div class="modal-title">` — consider `<h2>` for better semantics
- Close button has explicit `✕` character — should add `aria-label="Close"`
- Wallet options are `<button>` elements — fully keyboard accessible

### Keyboard Navigation
Tab order:
1. Phantom wallet option
2. Solflare wallet option
3. Backpack wallet option
4. Continue as Guest button
5. Close (✕) button

### Focus Management
- First focusable element receives focus on open
- ESC closes modal
- Focus trap enforced by z-index + stacking order

---

## 📐 Dimensions Summary

| Element | Desktop | Tablet (768px) | Small Phone (420px) |
|---------|---------|----------------|---------------------|
| Modal max-width | 440px | 90vw | 90vw |
| Modal body padding | 18px 20px 22px | 18px 20px 22px | 14px 16px 18px |
| Modal head padding | 18px 20px 0 | 18px 20px 0 | 18px 16px 0 |
| Wallet opt padding | 13px 15px | 13px 15px | 13px 15px |
| Guest button | Full width | Full width | Full width |

---

## 🧪 Test Cases

| Test Case | Expected Result |
|-----------|----------------|
| Open modal on 14" laptop | Fully visible, centered, no scroll needed |
| Open modal on iPhone 14 | Scrollable body, header+close always visible |
| Open modal with 5 wallet options | Modal body scrolls, doesn't overflow parent |
| Install Phantom but not Solflare | Solflare option shows error on connect |
| User rejects signature | Clear error message shown, buttons re-enabled |
| Network timeout during connect | Generic "Connection failed" message |
| Click backdrop to close | Modal closes, returns to trigger state |
| Click ✕ button to close | Modal closes cleanly |
| ESC key pressed | Modal closes |
| Tab key cycling | Cycles through focusable elements |
| Mobile high contrast mode | Colors maintain 4.5:1 contrast ratios |

---

*Wallet Modal Spec v1.0 — $TAP Chimp*