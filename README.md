# $TAP Coin Platform

Solana arcade gaming platform built with Next.js 14 and Phaser 3.

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Game Engine**: Phaser 3 (isolated 60 FPS runtime)
- **Database**: Prisma ORM (SQLite dev / PostgreSQL prod)
- **Auth**: HTTP-only session cookies + Solana wallet (Ed25519 nonce verification)
- **Styling**: Vanilla CSS with custom properties
- **Validation**: Zod

## Getting Started

`ash
npm install
npm run db:push
npm run db:seed
npm run dev
`

Open http://localhost:3000 — root redirects to /play.

## Project Structure

`
src/
├── app/              # Next.js App Router pages & API routes
│   ├── admin/        # Admin dashboard pages
│   ├── api/          # REST endpoints (auth, runs, leaderboard, chat, etc.)
│   ├── play/         # Main game lobby page
│   ├── how-to-play/  # Game rules page
│   ├── leaderboard/  # Rankings page
│   ├── competitions/ # Competition pages
│   ├── profile/      # User profile page
│   └── buy/          # Token purchase page
├── components/       # Reusable React UI components
├── game/             # Phaser 3 engine (scenes, types, bootstrap)
├── lib/              # Shared utilities (auth, sound, config, scoreVerify, etc.)
├── modules/games/    # Modular game registry & implementations
│   ├── core/         # Game registry interface
│   └── tap-chimp/    # Default game module ( Chimp)
└── i18n/             # String catalog

docs/                 # Design specs, guidelines, test infrastructure
prisma/               # Database schema & migrations
public/               # Static assets
scripts/              # Build, start, and smoke test scripts
tests/                # E2E test suites
.agents/              # Agent rules & skills configuration
`

## Architecture

See ARCHITECTURE.md for detailed system design, runtime boundaries, security posture, and scaling path.

Key principles:
- **Server-authoritative**: Backend recomputes scores, validates runs, rejects implausible results
- **Modular games**: New games register via src/modules/games/core/game-registry.ts
- **Runtime isolation**: React owns UI; Phaser exclusively owns the 60 FPS game loop
- **Real-time**: SSE for leaderboard/competition/config updates

## Scripts

| Command | Description |
|---------|-------------|
| 
pm run dev | Start dev server on port 3000 |
| 
pm run build | Production build |
| 
pm run start | Start production server |
| 
pm run db:push | Push Prisma schema to database |
| 
pm run db:seed | Seed database with initial data |

## Environment Variables

Copy .env.example to .env and configure:
- DATABASE_URL — SQLite (dev) or PostgreSQL (prod) connection string
- SESSION_SECRET — Strong random secret for session cookies
- ADMIN_WALLETS — Comma-separated Solana wallet addresses with admin access
- SOLANA_RPC_URL — Solana RPC endpoint for wallet verification
