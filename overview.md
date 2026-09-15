# $TAP Coin Platform - Overview

## Project Status
As of 2026-09-14, the $TAP Coin platform is a modular Next.js 14 + Phaser 3 game platform with Solana wallet integration, featuring level-based gameplay, real-time leaderboards, competitions, and an admin dashboard.

## Core Features Implemented

### Gameplay
- Level-based progression (replaced endless/timer scoring)
- Modular game architecture (`$TAP Chimp` as default module)
- Deterministic level generation with difficulty scaling
- Real-time Phaser 3 game engine (60 FPS) isolated from React UI
- Wallet-gated leaderboard eligibility
- Run persistence with server-authoritative score verification

### Platform Systems
- **Modular Game Registry**: Register new games via `src/modules/games/core/game-registry.ts`
- **Leaderboards**: Per-game and global rankings with SSE updates
- **Competitions**: Time-bound events with game-specific filtering
- **Admin Panel**: Configure gameplay, token settings, eligibility rules, and review runs
- **Wallet Integration**: Solana (Phantom/Solflare) connection via nonce + Ed25519 signature
- **Real-time Updates**: Server-Sent Events for leaderboards, competitions, and config changes

### Technical Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Game Engine**: Phaser 3 (isolated runtime)
- **Backend**: Next.js API routes with middleware authentication
- **Database**: Prisma ORM (SQLite dev, PostgreSQL prod)
- **Authentication**: Opaque HTTP-only session cookies + Solana wallet nonces
- **Styling**: CSS Modules with CSS variables (design tokens in `globals.css`)
- **Internationalization**: JSON-based i18n (`src/i18n/strings.ts`)

## Key Directories
- `src/app`: Next.js App Router (pages, layouts, route handlers)
- `src/modules/games`: Game module registry and implementations
- `src/game`: Phaser game engine (scenes, engine, types)
- `src/lib`: Shared utilities (sound, wallet, analytics, etc.)
- `src/components`: Reusable React components
- `prisma`: Database schema and migrations
- `public`: Static assets (images, icons, audio)

## Recent Improvements (2026-09-13/14)
1. **UI/UX Polish ("Canopy" increment)**: Added jungle-themed boot screen, hero strips, podiums, hover-lift cards, and staggered reveals across all major pages.
2. **Asset Optimization**: Reduced PNG bundle from 24 MB → 5.3 MB (~78%) via resolution scaling, palette reduction, and dithering.
3. **Modular Game Overhaul**: Converted to level-based progression, added run metadata (`gameSlug`, `level`, `targetTrees`), and game-aware leaderboards/competitions.
4. **Admin Enhancements**: Game catalog, module configuration, run review surfaces.
5. **Security Foundations**: Wallet nonce authentication, Ed25519 verification, RBAC guards, input validation via Zod.

## Known Limitations
- Home page currently redirects directly to `/play` (no landing page)
- Play page component is large (>800 lines) and would benefit from component splitting
- Rate limiting is in-memory (not Redis-backed) – needs upgrade for horizontal scaling
- Anti-cheat hardening (signed run tickets, deterministic seeds) is planned but not implemented
- Asset delivery lacks CDN integration (optimized assets still served from origin)

## Next Recommended Steps
1. Replace home page redirect with proper landing page (SEO, user onboarding)
2. Split play page into atomic components (lobby, eligibility, treasury, etc.)
3. Migrate rate limiting to Redis for multi-instance deployments
4. Implement run signing anti-cheat system (nonce-based challenge/response)
5. Add CDN configuration for static asset delivery
6. Conduct accessibility audit (WCAG 2.1 AA) and color contrast fixes
