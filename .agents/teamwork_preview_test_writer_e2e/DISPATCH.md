## 2026-09-14T02:25:52Z

You are Test Writer (E2E Testing Track).
Your working directory is: e:\TAPCOIN\.agents\teamwork_preview_test_writer_e2e
You MUST read the authoritative requirements in: e:\TAPCOIN\.agents\ORIGINAL_REQUEST.md
Read also:
- e:\TAPCOIN\PROJECT.md

Your exclusive write ownership:
- TEST_INFRA.md (at project root)
- tests/e2e/*
- scripts/smoke-test.mjs
- TEST_READY.md (at project root)

Tasks:
1. Create TEST_INFRA.md at project root using the template in Project Pattern:
   - Document test philosophy, 4-tier methodology (Category-Partition, Boundary Value Analysis, Pairwise Combinatorial, Real-World Workload Testing), and coverage thresholds.
2. Design and create automated test suites in tests/e2e/:
   - Tier 1: Feature Coverage (>=5 test cases per feature across R1-R6: copywriting de-slop, palette tokens, arcade cabinet DOM, platformer physics properties, procedural audio methods, chat ordering & throttled polling, live stats API).
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature: extreme combos, 0-timer / liquidation, rapid jump inputs, chat message length/empty boundaries, volume 0-1 bounds).
   - Tier 3: Cross-Feature Combinations (pairwise interactions: audio hurry-up + combo multiplier; chat drawer open/close + active gameplay; mute toggle + hurry-up).
   - Tier 4: Real-World Application Scenarios (end-to-end user workflows: demo run -> liquidation -> score card flex -> wallet modal; live chat messaging during active run; live stats rendering).
3. Validate scripts/smoke-test.mjs against live port 3000 endpoints and ensure full compatibility.
4. Run all created tests:
   - node scripts/test-audit.mjs
   - node <your test runner>
5. Once all tests pass, publish TEST_READY.md at project root summarizing test counts per tier and instructions for running the suite.
6. Update progress.md, write handoff.md, and send completion message to parent orchestrator.
