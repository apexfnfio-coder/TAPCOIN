---
name: coding-standards
description: Enforce strict invariants for React hooks ordering, SSR hydration safety, database transactions, and game combat mechanics.
always_on: true
---

# $TAP Project Coding Standards & Invariants

## 1. React & Next.js Client Invariants
- **Hook Declaration Order (Prevent TDZ)**:
  - Always declare state (`useState`), refs (`useRef`), and callbacks (`useCallback`) BEFORE any `useEffect` or `useMemo` that references them in their dependency arrays.
  - Never reference a `const` function in an effect before its definition line.
- **SSR / Client Hydration Safety**:
  - NEVER call unparameterized `.toLocaleString()` or `.toLocaleDateString()` inside JSX rendered during SSR.
  - Always specify an explicit locale: `.toLocaleString("en-US")`.
  - For browser-specific APIs (`localStorage`, `window.location`, dynamic overlays), guard with a `mounted` state:
    ```tsx
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    // In JSX:
    {mounted && showOverlay && <Overlay />}
    ```

## 2. Database & Data Integrity Invariants
- **Atomic Mutations**:
  - Multi-table mutations (e.g. creating a `Run` and updating `User` stats) MUST be wrapped in `db.$transaction([...])`.
- **Unique Constraint Defenses**:
  - When generating synthetic usernames from wallet addresses, append a random suffix or check existence to prevent collisions on `username @unique`.
- **SQLite Concurrency**:
  - Enforce `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;` on local SQLite databases to allow concurrent reads during write operations.

## 3. Game Engine Combat Invariants
- **Single-Target Melee Priority**:
  - Melee hit resolution must sort candidate entities within range by absolute distance to the player and only apply damage to `candidates[0]`.
  - Apply an attack swing cooldown (`swingLockTime`) to prevent multi-frame damage duplication on a single swing.
- **PowerUp / Boost Exclusivity**:
  - Time boosts and temporary skills must strictly adhere to game design rules (e.g. Time Boost is exclusive to Mystery Crates; trees only yield points and green candles).
