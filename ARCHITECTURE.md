# $TAP Production Architecture

## Product decisions

- **Application:** Next.js 14 full-stack monolith with React UI and isolated Phaser 3 game runtime. React owns product screens; Phaser exclusively owns the 60 FPS game loop.
- **Data:** Prisma ORM. SQLite is enabled only for local development; production deployment uses PostgreSQL with the same relational schema and migrations.
- **Authentication:** Opaque random server sessions in secure HTTP-only cookies. Solana wallet association uses an expiring one-time nonce and Ed25519 message-signature verification. Private keys and seed phrases never enter the app.
- **Real-time:** Server-Sent Events for leaderboard, competition, and configuration invalidation. This is one-way and simpler than WebSockets for these update patterns. At horizontal scale, replace the in-process hub with Redis pub/sub.
- **API:** Same-origin typed REST endpoints with Zod boundary validation and a consistent `{ ok, data | error }` envelope.
- **Authority:** PostgreSQL is the source of truth. Game values are read from centralized database-backed configuration. The backend recomputes scores and applies plausibility limits before a run can affect rankings.

## Runtime boundaries

1. **Web application** — Next.js App Router pages, responsive navigation, wallet UI, loading/error/empty states.
2. **Game engine** — Phaser scenes, parallax world, keyboard/touch movement, automatic chopping, collisions, damage states, particles, and real run events.
3. **Backend** — authenticated API routes, RBAC guards, Zod validation, rate limiting, audit recording, score verification.
4. **Database** — users, sessions, wallet nonces, runs, competitions, competition entries, centralized config, audit log.
5. **Web3** — browser wallet discovery, nonce signing, public-key verification, configurable token/trading information. The application never invents balances, hashes, or transaction success.

## Server-authoritative data

- User identity, wallet association, roles, account status
- Run acceptance and computed score
- User aggregates and personal best
- Competition windows, status, entries, and rankings
- Token metadata, official links, scoring, difficulty, announcements, maintenance mode
- Security and administrator audit history

## Modular game platform

Game implementations are registered through `src/modules/games/core/game-registry.ts`. The current default module is `$TAP Chimp` (`tap-chimp`), with its module metadata, official token mint, score rules, and level generator isolated under `src/modules/games/tap-chimp/`.

The root route intentionally boots users directly into `/play`. React owns lobby/progression/results UI, while Phaser owns the real-time level loop. Run records carry `gameSlug`, `level`, `targetTrees`, `progress`, and `endedBy` so future games can share platform services without mixing leaderboards.

## Run validation

The server recomputes score from event counts and the current game module/config. It rejects mismatched scores, implausible level clears, bad durations, impossible tree rates, impossible collectible counts, unknown game modules, failed wallet leaderboard eligibility, and non-live competition submissions. Rejected runs are retained for investigation but excluded from public rankings and aggregates.

For economically meaningful on-chain rewards, the next hardening phase should add signed run-start tickets, deterministic spawn seeds, periodic event checkpoints, replay verification, and a separate reward-finalization worker. Current verification is suitable for competitive scoring but is not a cryptographic proof of play.

## Scaling path

- Deploy Next.js app nodes behind HTTPS.
- Replace SQLite with managed PostgreSQL and use connection pooling (PgBouncer for serverless environments).
- Replace in-memory rate limits and SSE pub/sub with Redis.
- Put static SVG/game assets behind a CDN with immutable caching.
- Add structured log export, error tracking, DB metrics, availability probes, alerts, and automated backups.
- Schedule competition state transitions and nonce/session cleanup as idempotent jobs rather than lazy request-time transitions.

## Security posture

- HTTP-only, SameSite cookies; secure flag in production
- One-use five-minute wallet nonces and Ed25519 verification
- Explicit RBAC on all admin endpoints
- Per-endpoint response projection to avoid database-field leakage
- Security headers and restrictive CSP
- Input validation and basic abuse rate limits
- No secrets in client bundles; no storage/request of wallet secrets
- Archive instead of deleting competitions so historical run data remains auditable

## Deployment checklist

1. Generate a strong `SESSION_SECRET` and configure `ADMIN_WALLETS`.
2. Set the production PostgreSQL `DATABASE_URL`; change Prisma datasource provider to `postgresql`; create and deploy a reviewed migration.
3. Configure official token mint and trading links in Admin → Settings only after launch details are verified.
4. Install Redis-backed rate limiting/pub-sub before multi-instance deployment.
5. Enforce HTTPS and add the deployment domain to the CSP/connect allowlist where required.
6. Configure backups, monitoring, alerting, error reporting, and key rotation.
7. Load-test run submission and leaderboard queries with production-scale data.
