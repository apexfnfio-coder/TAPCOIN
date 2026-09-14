# Handoff Report: Chat Freeze Fix & Frontend Polling Throttling (Worker M6)

**Worker:** Worker M6 (Chat Freeze Fix & Backend Stats)  
**Date:** 2026-09-14  
**Target Files:**
- `src/app/api/chat/route.ts`
- `src/components/GlobalChat.tsx`

---

## 1. Observation

1. **Previous `GET /api/chat` Route Implementation (`src/app/api/chat/route.ts:7-15`)**:
   ```typescript
   export async function GET() {
     try {
       const messages = await db.chatMessage.findMany({
         orderBy: { createdAt: "asc" },
         take: 50,
       });
   ```
   - Direct observation: The query executed with `orderBy: { createdAt: "asc" }` and `take: 50`. Because the database ordered ascending from oldest to newest, it retrieved the initial 50 messages created in the system.
   - When more than 50 messages existed in the database, subsequent messages (#51 and beyond) were completely excluded by `take: 50`, freezing the trollbox on historical messages.

2. **Previous Chat Polling Implementation (`src/components/GlobalChat.tsx:50-55`)**:
   ```typescript
   // Poll every 3.5s for real-time updates
   useEffect(() => {
     fetchMessages();
     const timer = setInterval(fetchMessages, 3500);
     return () => clearInterval(timer);
   }, []);
   ```
   - Direct observation: Polling was set to an unconditional 3.5s interval (`setInterval(fetchMessages, 3500)`) with an empty dependency array `[]`.
   - The polling interval remained 3500ms even when `isOpen` was `false` (drawer closed), generating unnecessary network overhead when the user was actively playing.

3. **Verification Command Output**:
   - `node scripts/test-audit.mjs`:
     ```text
     AUDIT RESULTS: 16 passed, 0 failed
     All audit verification checks passed successfully!
     ```
   - `node scripts/smoke-test.mjs`:
     ```text
     ✓ [200] /api/health (313ms)
     ✓ [200] /play (22ms)
     ✓ [200] /how-to-play (8ms)
     ✓ [200] /leaderboard (8ms)
     ✓ [200] /buy (6ms)
     ✓ [200] /profile (9ms)
     ALL LIVE SMOKE TESTS PASSED (100% HEALTHY)
     ```
   - Direct Database Simulation with 55 mock messages:
     - Old query (`orderBy: { createdAt: "asc" }, take: 50`): returned messages 1..50; newest message #55 was absent (`has55Buggy === false`).
     - Fixed query (`orderBy: { createdAt: "desc" }, take: 50`, followed by `.reverse()`): returned messages 6..55; message #55 was at index 49 (bottom of list), in chronological order (`chronological[0].text === 'Test message number 6'`, `chronological[49].text === 'Test message number 55'`).

---

## 2. Logic Chain

1. **Chat Freeze Resolution (`src/app/api/chat/route.ts`)**:
   - From Observation 1: Ordering by `createdAt: "asc"` with `take: 50` guarantees that once 50 rows exist, no newer messages will ever enter the window.
   - By switching the query to `orderBy: { createdAt: "desc" }` with `take: 50`, the database index scan (`@@index([createdAt])`) fetches the 50 most recently created messages in descending order.
   - Applying `messages.reverse()` reverses this window into chronological ascending order in memory, ensuring that older messages appear at the top of the chat scroll and the newest message is always at the bottom.
   - Returning `{ ok: true, messages: [...] }` adheres to the interface contract defined in `PROJECT.md` line 86 while keeping full backward compatibility with client expectations (`Array.isArray(data.messages)`).

2. **Dynamic Polling Throttling (`src/components/GlobalChat.tsx`)**:
   - From Observation 2: The client component holds state `const [isOpen, setIsOpen] = useState(false);`.
   - Wrapping `fetchMessages` in `useCallback(async () => { ... }, [])` stabilizes reference across renders.
   - Setting `const pollInterval = isOpen ? 3500 : 15000;` throttles requests to 15 seconds when the drawer is closed (reducing background network load by ~76%), while immediately refreshing and increasing polling frequency to 3.5 seconds as soon as the drawer opens (`isOpen` transitions to `true`).
   - Declaring `[isOpen, fetchMessages]` in the `useEffect` dependencies ensures that timer teardown and recreation occur immediately upon opening or closing the drawer.

---

## 3. Caveats

- **Existing Server Process**: The local Next.js background instance running on port 3000 serves pre-compiled production artifacts from a prior `next start`. When a full production re-build occurs (as part of M7 Final E2E pass), the updated route bundle will be compiled. The logic was verified against the SQLite database using Prisma directly.
- **Ownership Scope**: `src/app/play/page.tsx` global weekly trees wiring is assigned to Milestone 3 Worker (`src/app/play/page.tsx` write boundary). Worker M6 stayed strictly within its assigned files (`src/app/api/chat/route.ts` and `src/components/GlobalChat.tsx`).

---

## 4. Conclusion

1. The 50-message chat freeze bug is resolved: `src/app/api/chat/route.ts` now retrieves the latest 50 messages descending and returns them reversed chronologically.
2. Polling throttling is implemented in `src/components/GlobalChat.tsx`: 15,000ms when closed, 3,500ms when open, responding dynamically to `isOpen`.
3. All audit checks (`scripts/test-audit.mjs` — 16 passed) and smoke tests (`scripts/smoke-test.mjs` — 6 passed) execute with 100% success.

---

## 5. Verification Method

To independently verify Worker M6's implementation:

1. **Verify Source Code Changes**:
   - Check `src/app/api/chat/route.ts` lines 9-15 for `orderBy: { createdAt: "desc" }`, `take: 50`, and `messages.reverse()`.
   - Check `src/components/GlobalChat.tsx` lines 50-56 for `pollInterval = isOpen ? 3500 : 15000` and `useEffect` dependent on `[isOpen, fetchMessages]`.

2. **Run System Audit**:
   ```bash
   node scripts/test-audit.mjs
   ```
   Expected result: `AUDIT RESULTS: 16 passed, 0 failed`.

3. **Run Smoke Tests**:
   ```bash
   node scripts/smoke-test.mjs
   ```
   Expected result: `ALL LIVE SMOKE TESTS PASSED (100% HEALTHY)`.

4. **Verify Database Query Behavior Under > 50 Messages**:
   Run node command testing descending order and chronological reversal:
   ```bash
   node -e "const { PrismaClient } = require('@prisma/client'); const assert = require('assert'); const db = new PrismaClient(); async function test() { const testRunId = 'test_' + Date.now(); const testData = []; for (let i = 1; i <= 55; i++) { testData.push({ userId: testRunId, username: 'User_' + i, wallet: '0x' + String(i).padStart(4, '0'), text: 'Test ' + i, createdAt: new Date(Date.now() + i * 1000) }); } await db.chatMessage.createMany({ data: testData }); const fixedDesc = await db.chatMessage.findMany({ where: { userId: testRunId }, orderBy: { createdAt: 'desc' }, take: 50 }); assert.strictEqual(fixedDesc.length, 50); const chronological = fixedDesc.reverse(); assert.strictEqual(chronological[49].text, 'Test 55'); await db.chatMessage.deleteMany({ where: { userId: testRunId } }); await db.\`$disconnect(); console.log('PASS'); } test();"
   ```
   Expected output: `PASS`.

5. **Invalidation Conditions**:
   - If `src/app/api/chat/route.ts` queries `createdAt: "asc"`, older messages block newer messages past count 50.
   - If `src/components/GlobalChat.tsx` polls at 3500ms while `isOpen` is `false`, the throttling requirement is violated.
