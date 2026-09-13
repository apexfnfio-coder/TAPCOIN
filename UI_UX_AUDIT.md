# $TAP UI/UX Audit & Improvement Pass

This pass keeps the existing product behavior and real data architecture intact while improving presentation, hierarchy, responsive behavior, and game-first UX.

## Main improvements
- Desktop navigation stays at the top; mobile navigation is a five-action bottom bar: Home, Compete, Play, Ranks, Profile.
- Play is visually prioritized on mobile without removing access to the other core areas.
- Existing wallet, competition, leaderboard, profile, buy, admin, API, and game functionality is preserved.
- Page headings use cleaner spacing and less decorative framing.
- Panels are flatter and more restrained; decorative card nesting is reduced.
- Gameplay HUD is tightened so Level, Trees, Score, Time, tree HP, and End Run remain readable without dominating the playfield.
- Touch controls are treated as primary controls and remain attached to the game viewport.
- Mobile admin navigation becomes a horizontal sticky tool strip instead of a desktop sidebar that can collapse the page.
- Tables remain inside their own scroll region rather than causing global horizontal overflow.
- Focus-visible states and reduced-motion behavior are improved.
- The generic "Solscan" label was changed to "View on Explorer" because the configured explorer may vary.
- The current 1600×720 transparent background pipeline is retained for the game layers.

## Intentionally preserved
- $TAP game concept and gameplay systems.
- Real API/database-backed data.
- Wallet authentication and eligibility flow.
- Competition and leaderboard systems.
- Admin controls and security/audit systems.
- Existing character/tree/background asset pipeline.
