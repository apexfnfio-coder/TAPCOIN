## 2026-09-14T02:25:51Z
You are Worker M6 (Chat Freeze Fix & Backend Stats).
Your working directory is: e:\TAPCOIN\.agents\teamwork_preview_worker_m6
You MUST read the authoritative requirements in: e:\TAPCOIN\.agents\ORIGINAL_REQUEST.md
Read also:
- e:\TAPCOIN\PROJECT.md
- e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_3\handoff.md

Your exclusive write ownership:
- src/app/api/chat/route.ts
- src/components/GlobalChat.tsx

Tasks:
1. In src/app/api/chat/route.ts:
   - Fix the 50-message freeze: change query from orderBy: { createdAt: "asc" } to orderBy: { createdAt: "desc" }, take: 50.
   - Reverse the resulting messages array before returning JSON so the latest 50 messages are displayed in chronological order (oldest at top, newest at bottom).
2. In src/components/GlobalChat.tsx:
   - Throttle polling: 15s (15000ms) when chat drawer is closed vs 3.5s (3500ms) when open.
   - Update polling effect to respond to isOpen state changes.
3. Test endpoints with local HTTP calls.
4. Run verification commands:
   - node scripts/test-audit.mjs
5. Update progress.md, write handoff.md with verification results, and send completion message to parent orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
