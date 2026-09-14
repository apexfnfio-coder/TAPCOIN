## 2026-09-14T02:25:49Z
You are Worker M4 (Platformer Physics & Game Feel).
Your working directory is: e:\TAPCOIN\.agents\teamwork_preview_worker_m4
You MUST read the authoritative requirements in: e:\TAPCOIN\.agents\ORIGINAL_REQUEST.md
Read also:
- e:\TAPCOIN\PROJECT.md
- e:\TAPCOIN\.agents\teamwork_preview_explorer_survey_2\handoff.md

Your exclusive write ownership:
- src/game/scenes/GameScene.ts

Tasks:
1. Implement 100ms Coyote Time (COYOTE_TIME_MS = 100) per handoff.md § 4.2.A-D: allow jump execution up to 100ms after stepping off ground or roots.
2. Implement 120ms Jump Buffering (JUMP_BUFFER_MS = 120): detect rising edge of jump press and execute jump immediately upon landing if pressed within 120ms before contact.
3. Implement Variable Jump Height: when jump input is released early and upward velocity is high (playerVy < MIN_JUMP_VELOCITY of -260), clamp playerVy = -260 to truncate jump into a crisp short hop.
4. Implement screen micro-recoil on chops (this.cameras.main.shake(45, 0.0022)) with directional tree shake tween.
5. Implement dramatic hit-stop on level-clearing tree:
   - Real kinematic freeze: hitStopUntil = now + 150 (pauses motion and timers at top of update())
   - Heavy cinematic screen shake: this.cameras.main.shake(280, 0.012)
   - Solana Bull Green flash: this.cameras.main.flash(180, 0, 255, 163) (#00FFA3)
   - Celebratory particle explosion (quad burst: p-chip, p-leaf, p-dust, p-spark)
   - Standard tree fell hit-stop: 40ms (hitStopUntil = now + 40, shake(120, 0.005))
6. Run verification commands:
   - npx tsc --noEmit
   - node scripts/test-audit.mjs
7. Update progress.md, write handoff.md with verification results, and send completion message to parent orchestrator.
