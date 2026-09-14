import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const port = 9229;
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const scenesDir = path.resolve("temp_trailer_scenes");

if (!fs.existsSync(scenesDir)) {
  fs.mkdirSync(scenesDir, { recursive: true });
}

function secret() {
  return process.env.SESSION_SECRET || "dev-only-secret-change-me";
}

function hashToken(token) {
  return crypto.createHmac("sha256", secret()).update(token).digest("hex");
}

async function setupDatabaseData() {
  console.log("[DB] Preparing users, leaderboard rankings, and competition data...");

  // 1. ApexAdmin (#1 rank, 42069 pts)
  const adminWallet = "2Mz6kawWjgVVTKvPvs9xzhVV37qWP5aHM5EsbSYnndCE";
  let admin = await db.user.findUnique({ where: { walletAddress: adminWallet } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        username: "ApexAdmin",
        walletAddress: adminWallet,
        role: "admin",
        status: "active",
        isGuest: false,
        bestScore: 42069,
        totalRuns: 38,
        totalTrees: 1850,
        totalGreen: 620,
      },
    });
  } else {
    admin = await db.user.update({
      where: { id: admin.id },
      data: { role: "admin", status: "active", bestScore: 42069, username: "ApexAdmin" },
    });
  }

  // 2. SolanaWhale (#2 rank, 38450 pts)
  const p2Wallet = "4h2qJ1bXyKqVVTKvPvs9xzhVV37qWP5aHM5EsbSYnnd02";
  let p2 = await db.user.findUnique({ where: { walletAddress: p2Wallet } });
  if (!p2) {
    p2 = await db.user.create({
      data: {
        username: "SolanaWhale",
        walletAddress: p2Wallet,
        role: "user",
        status: "active",
        isGuest: false,
        bestScore: 38450,
        totalRuns: 29,
        totalTrees: 1420,
      },
    });
  } else {
    await db.user.update({
      where: { id: p2.id },
      data: { bestScore: 38450 },
    });
  }

  // 3. CyberDegen (#3 rank, 31200 pts)
  const p3Wallet = "8m9kL3pXyKqVVTKvPvs9xzhVV37qWP5aHM5EsbSYnnd03";
  let p3 = await db.user.findUnique({ where: { walletAddress: p3Wallet } });
  if (!p3) {
    p3 = await db.user.create({
      data: {
        username: "CyberDegen",
        walletAddress: p3Wallet,
        role: "user",
        status: "active",
        isGuest: false,
        bestScore: 31200,
        totalRuns: 22,
        totalTrees: 980,
      },
    });
  } else {
    await db.user.update({
      where: { id: p3.id },
      data: { bestScore: 31200 },
    });
  }

  // Ensure verified runs exist for leaderboard query
  const existingRun = await db.run.findFirst({ where: { userId: admin.id, score: 42069 } });
  if (!existingRun) {
    await db.run.create({
      data: {
        userId: admin.id,
        gameSlug: "tap-chimp",
        level: 2,
        targetTrees: 4,
        progress: 4,
        score: 42069,
        trees: 18,
        green: 45,
        redHits: 0,
        durationMs: 42000,
        endedBy: "quit",
        valid: true,
      },
    });
  }

  // Ensure Season 1 competition entry exists
  const compId = "season-1-grand-prize";
  const comp = await db.competition.findUnique({ where: { id: compId } });
  if (!comp) {
    await db.competition.create({
      data: {
        id: compId,
        name: "Season 1 Grand Championship",
        description: "Climb the Leaderboard · Win 10% Dev Wallet Prize in Month 1",
        gameSlug: "tap-chimp",
        status: "live",
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 30 * 86400000),
        rewardJson: JSON.stringify({ "1": "10% Dev Wallet Pool ($TAP)", "2-10": "Airdrop Bag Tier A" }),
      },
    });
  }

  // Create valid session token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 86400_000);
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: admin.id,
      expiresAt,
      ip: "127.0.0.1",
      userAgent: "Scene Capture Worker",
    },
  });

  console.log("[DB] Ready: ApexAdmin, top 3 leaderboard, and Season 1 Grand Championship competition.");
  return { adminToken: token, admin };
}

async function main() {
  const { adminToken } = await setupDatabaseData();

  console.log("[Chrome] Launching headless Chrome at 1920x1080 on port", port);
  const tmpUserData = path.join(process.env.TEMP || "C:\\Windows\\Temp", `chrome-scenes-${Date.now()}`);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${tmpUserData}`,
    `--remote-debugging-port=${port}`,
    "--window-size=1920,1080",
    "about:blank",
  ]);

  let version = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/json/version`);
      version = await listRes.json();
      if (version?.Browser) break;
    } catch {}
  }

  if (!version) {
    chrome.kill();
    throw new Error("Could not connect to Chrome debugging port");
  }
  console.log("[Chrome] Connected:", version.Browser);

  const newTab = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/play`, { method: "PUT" });
  const tab = await newTab.json();
  const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

  let msgId = 1;
  const callbacks = new Map();
  ws.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && callbacks.has(msg.id)) {
        const resolve = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        resolve(msg.result);
      }
    } catch (e) {}
  });

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve) => {
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  console.log("[CDP] WebSocket connected. Initializing domains...");

  await send("Page.enable");
  await send("DOM.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function capture(filename, description) {
    const scr = await send("Page.captureScreenshot", { format: "png" });
    if (scr?.data) {
      const outPath = path.join(scenesDir, filename);
      fs.writeFileSync(outPath, Buffer.from(scr.data, "base64"));
      const size = fs.statSync(outPath).size;
      console.log(`[Captured] ${filename} — ${(size / 1024).toFixed(1)} KB — ${description}`);
      return outPath;
    }
    throw new Error(`Failed to capture ${filename}`);
  }

  async function navigate(url, waitMs = 3000) {
    console.log(`[Nav] Navigating to ${url}...`);
    await send("Page.navigate", { url });
    await sleep(waitMs);
  }

  // ==========================================
  // ACT 1: TERMINAL FLY-IN
  // ==========================================
  console.log("\n--- CAPTURING ACT 1: TERMINAL FLY-IN ---");
  await navigate("http://localhost:3000/play", 3500);

  // Dismiss tutorial cleanly if open
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const skip = document.querySelector('.tutorial-close-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Skip'));
        if (skip) skip.click();
      })()
    `,
  });
  await sleep(1500);

  await capture("act1_terminal.png", "Arcade Battle Station lobby with Ape mascot, live ticker marquee, and docked trollbox");

  // ==========================================
  // ACT 2: WALLET MODAL & CONNECTED STATE
  // ==========================================
  console.log("\n--- CAPTURING ACT 2: WALLET CONNECT ---");
  // Open wallet modal
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const btn = document.querySelector('.wallet-trigger') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Connect Wallet'));
        if (btn) btn.click();
      })()
    `,
  });
  await sleep(1500);

  await capture("act2_wallet_modal.png", "Wallet connect modal with official Phantom, Solflare, Jupiter, Backpack badges");

  // Inject session cookie for ApexAdmin
  console.log("[Auth] Connecting wallet as ApexAdmin...");
  await send("Network.setCookie", {
    name: "tap_session",
    value: adminToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });

  // Reload page to show verified connected state
  await navigate("http://localhost:3000/play", 3000);
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const skip = document.querySelector('.tutorial-close-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Skip'));
        if (skip) skip.click();
      })()
    `,
  });
  await sleep(1500);

  await capture("act2_wallet_connected.png", "Verified connected state with 2Mz6...ndCE, green pulse dot, and DROP IN & CHOP CTA");

  // ==========================================
  // ACT 3 & ACT 4: IN-GAME RUN & COMBAT
  // ==========================================
  console.log("\n--- LAUNCHING IN-GAME RUN ---");

  // Start real run (ApexAdmin is authenticated)
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const dropIn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('DROP IN') || b.textContent.includes('FREE PRACTICE'));
        if (dropIn) dropIn.click();
      })()
    `,
  });

  // Wait 4s for Phaser BootScene to preload PNG assets and switch to GameScene
  console.log("[Phaser] Preloading assets and initializing GameScene...");
  await sleep(4500);

  // Extract GameScene reference from V8 closure scope for deterministic frame composition
  console.log("[CDP] Extracting active GameScene via V8 closure scope...");
  const quitObj = await send("Runtime.evaluate", {
    expression: `
      (() => {
        const host = document.querySelector('.game-host');
        const fiberKey = host ? Object.keys(host).find(k => k.startsWith('__reactFiber')) : null;
        const fiber = host ? host[fiberKey] : null;
        const gameCanvasFiber = fiber?.return?.return;
        return gameCanvasFiber?.memoizedState?.next?.memoizedState?.current?.quit;
      })()
    `,
    returnByValue: false,
  });

  let hasSceneHook = false;
  if (quitObj?.result?.objectId) {
    const props = await send("Runtime.getProperties", { objectId: quitObj.result.objectId });
    const scopesProp = props?.internalProperties?.find(p => p.name === "[[Scopes]]");
    if (scopesProp?.value?.objectId) {
      const scopes = await send("Runtime.getProperties", { objectId: scopesProp.value.objectId });
      for (const s of (scopes?.result || [])) {
        if (s.value?.objectId) {
          const scopeVars = await send("Runtime.getProperties", { objectId: s.value.objectId });
          const sceneVar = scopeVars?.result?.find(v => v.name === "gameScene");
          if (sceneVar?.value?.objectId) {
            await send("Runtime.callFunctionOn", {
              objectId: sceneVar.value.objectId,
              functionDeclaration: "function() { window.__gameScene = this; console.log('[CDP] Attached window.__gameScene!'); }",
            });
            hasSceneHook = true;
            console.log("[CDP] Successfully hooked window.__gameScene!");
            break;
          }
        }
      }
    }
  }

  // --- ACT 3 SCENE 1: TIMBER CHOPPING ---
  console.log("\n--- CAPTURING ACT 3: TIMBER CHOPPING ---");
  // Dispatch movement forward to Tree 1 (x=1000)
  // Jump over chasm at t=500ms
  await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyD", key: "d" });
  await sleep(500);
  await send("Input.dispatchKeyEvent", { type: "keyDown", code: "Space", key: " " });
  await sleep(180);
  await send("Input.dispatchKeyEvent", { type: "keyUp", code: "Space", key: " " });
  await sleep(1200); // Reaches Tree 1 (x=1000), auto-chop begins

  // Trigger chop particles and axe animation frame
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s) {
          s.state = "chop";
          s.setApeTexture("ape-chop1");
          s.burst(s.player.x + 80, 470 - 70, "p-chip", 14, 320);
          s.burst(s.player.x + 80, 470 - 90, "p-spark", 8, 220);
          s.cameras.main.shake(100, 0.004);
        }
      })()
    `,
  });
  await sleep(150);
  await capture("act3_gameplay_chop.png", "Ape chopping timber with wood chip (p-chip) and spark (p-spark) particles");

  // Release KeyD
  await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyD", key: "d" });
  await sleep(500);

  // --- ACT 3 SCENE 2: RAT STOMP ---
  console.log("\n--- CAPTURING ACT 3: RAT STOMP ---");
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s) {
          // Spawn rat directly in front and execute authentic stomp sequence
          const rx = s.player.x + 65;
          const ry = 470;
          s.burst(rx, ry - 10, "p-dust", 12, 160);
          s.burst(rx, ry - 15, "p-spark", 6, 140);
          s.floatText(rx, ry - 55, "+10 STOMP!", "#00FFA3");
          s.player.setY(ry - 55); // In mid-air rebound bounce
          s.score += 10;
          s.reportHud();
        }
      })()
    `,
  });
  await sleep(150);
  await capture("act3_rat_stomp.png", "Rat stomp jump with +10 STOMP! in #00FFA3 and rebound bounce");

  // --- ACT 3 SCENE 3: BEAR COMBAT (3 HP CYBER BAR, ROAR, ATTACK) ---
  console.log("\n--- CAPTURING ACT 3: BEAR COMBAT ---");
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s) {
          const bx = s.player.x + 140;
          const by = 470 + 4;
          
          // Clear any existing obstacles in view
          for (const o of s.obstacles) {
            o.sprite?.destroy();
            o.hpBarBg?.destroy();
            o.hpBarFill?.destroy();
            o.hpText?.destroy();
            o.dangerIcon?.destroy();
          }
          s.obstacles = [];

          // Create authentic 210px Bear with Cyber HP Bar
          const sprite = s.add.image(bx, by, "obstacle-bear").setDepth(8).setOrigin(0.5, 1);
          s.fitHeight(sprite, 210);
          sprite.setTint(0xff5533); // Red windup roar tint

          const hpBarBg = s.add.graphics().setDepth(14);
          hpBarBg.fillStyle(0x06090c, 0.92);
          hpBarBg.fillRoundedRect(bx - 34, by - 152, 68, 9, 3);
          hpBarBg.lineStyle(1, 0xff3b30, 0.85);
          hpBarBg.strokeRoundedRect(bx - 34, by - 152, 68, 9, 3);

          const hpBarFill = s.add.graphics().setDepth(15);
          hpBarFill.fillStyle(0x00ffa3, 1);
          hpBarFill.fillRoundedRect(bx - 33, by - 151, 66, 7, 2);

          const hpText = s.add.text(bx, by - 162, "3/3 HP", {
            fontFamily: "Rubik, Arial Black, sans-serif",
            fontSize: "10px",
            color: "#ffd000",
            fontStyle: "bold",
          }).setOrigin(0.5).setDepth(15);

          const dangerIcon = s.add.text(bx, by - 180, "⚠ ATTACK!", {
            fontFamily: "Arial Black, Impact, sans-serif",
            fontSize: "12px",
            color: "#ff3b30",
            stroke: "#06090c",
            strokeThickness: 3,
          }).setOrigin(0.5).setDepth(16);

          s.floatText(bx, by - 195, "BEAR ROAR! 🐻⚡", "#ff5533");
          s.cameras.main.shake(90, 0.0035);

          s.obstacles.push({
            sprite, kind: "bear", x: bx, y: by, hit: false, hp: 3, maxHp: 3,
            hpBarBg, hpBarFill, hpText, dangerIcon, state: "windup"
          });
        }
      })()
    `,
  });
  await sleep(200);
  await capture("act3_bear_combat.png", "Multi-hit Bear combat with 3 HP cyber bar, roar windup, and ATTACK warning");

  // --- ACT 3 SCENE 4: BEAR COUNTER-HIT ---
  console.log("\n--- CAPTURING ACT 3: BEAR COUNTER-HIT ---");
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s && s.obstacles.length > 0) {
          const bear = s.obstacles[0];
          bear.hp = 2;
          bear.hpText.setText("2/3 HP");
          bear.hpBarFill.clear();
          bear.hpBarFill.fillStyle(0x00ffa3, 1);
          bear.hpBarFill.fillRoundedRect(bear.x - 33, bear.y - 151, 44, 7, 2);

          // Counter-hit sparks
          s.burst(bear.x, bear.y - 110, "p-spark", 16, 260);
          s.burst(bear.x, bear.y - 90, "p-chip", 10, 180);
          s.floatText(bear.x, bear.y - 145, "COUNTER HIT! ⚡", "#00FFA3");
          s.cameras.main.shake(140, 0.0055);
        }
      })()
    `,
  });
  await sleep(180);
  await capture("act3_bear_counterhit.png", "Counter-hit sparks on Bear charge with COUNTER HIT! in #00FFA3");

  // --- ACT 3 SCENE 5: BEAR REKT & CANDLE LOOT DROP ---
  console.log("\n--- CAPTURING ACT 3: BEAR REKT ---");
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s && s.obstacles.length > 0) {
          const bear = s.obstacles[0];
          bear.hp = 0;
          bear.hpBarBg?.destroy();
          bear.hpBarFill?.destroy();
          bear.hpText?.destroy();
          bear.dangerIcon?.destroy();
          bear.sprite.setAlpha(0.3).setAngle(35);

          // Defeat fanfare float text
          s.floatText(bear.x, bear.y - 110, "BEAR REKT! 🐻💥", "#FFD000");
          s.cameras.main.shake(180, 0.007);

          // Drop 3 green pump candles in arc (+30 reward)
          for (let i = -1; i <= 1; i++) {
            const cx = bear.x + i * 48;
            const cy = bear.y - 55;
            const candleSprite = s.add.image(cx, cy, "candle-green").setDepth(6);
            s.fitHeight(candleSprite, 56);
            const glyph = s.add.text(cx, cy - 28, "▲", {
              fontFamily: "Arial Black",
              fontSize: "14px",
              color: "#00FFA3",
            }).setOrigin(0.5).setDepth(7);
            s.candles.push({ sprite: candleSprite, kind: "green", baseY: cy, phase: 0, taken: false, glyph });
          }

          s.score += 30;
          s.reportHud();
        }
      })()
    `,
  });
  await sleep(200);
  await capture("act3_bear_rekt.png", "Bear defeat celebration with BEAR REKT! in #FFD000 and 3 green pump candles drop");

  // ==========================================
  // ACT 4: LEVEL 1 CLEARED & LEVEL 2 ADVANCE
  // ==========================================
  console.log("\n--- CAPTURING ACT 4: LEVEL 1 CLEAR ---");
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s) {
          const tx = s.player.x + 90;
          const ty = 470;
          
          // Flash camera in Solana Bull Green (#00FFA3)
          s.cameras.main.flash(220, 0, 255, 163);
          s.cameras.main.shake(280, 0.012);

          // Celebratory quad particle burst
          s.burst(tx, ty - 55, "p-chip", 28, 440);
          s.burst(tx, ty - 130, "p-leaf", 20, 280);
          s.burst(tx, ty - 10, "p-dust", 16, 220);
          s.burst(tx, ty - 80, "p-spark", 14, 320);

          s.floatText(tx, ty - 220, "+100 LEVEL 1 CLEAR!", "#00FFA3");
          s.levelTreeCount = 4;
          s.reportHud();
        }
      })()
    `,
  });
  await sleep(160);
  await capture("act4_level1_clear.png", "Level 1 cleared with 150ms hit-stop, Solana Bull Green #00FFA3 flash, and quad particle burst");

  console.log("\n--- CAPTURING ACT 4: LEVEL 2 BANNER ---");
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const s = window.__gameScene;
        if (s) {
          // Increment level and display giant LEVEL 2 banner
          s.level = Object.assign({}, s.level, { level: 2 });
          const label = s.add.text(s.player.x, 205, "LEVEL 2", {
            fontFamily: "Arial Black, Arial",
            fontSize: "46px",
            color: "#efe3c8",
            stroke: "#132016",
            strokeThickness: 8,
          }).setOrigin(0.5).setDepth(25);

          s.reportHud();
        }
      })()
    `,
  });
  await sleep(200);
  await capture("act4_level2_banner.png", "Transition into Level 2 with giant LEVEL 2 banner across center screen");

  // ==========================================
  // ACT 5: ATH SCORE FLEX & LEADERBOARD
  // ==========================================
  console.log("\n--- CAPTURING ACT 5: RESULTS ATH FLEX ---");
  // Quit run to trigger ResultsPanel
  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const quitBtn = document.querySelector('.hud-quit');
        if (quitBtn) quitBtn.click();
      })()
    `,
  });
  await sleep(3000);

  await capture("act5_ath_results.png", "Results panel with celebrate Ape, 42,069 score flex, and NEW ALL-TIME HIGH (ATH) badge");

  console.log("\n--- CAPTURING ACT 5: LEADERBOARD PODIUM ---");
  await navigate("http://localhost:3000/leaderboard", 3000);

  await capture("act5_leaderboard_podium.png", "Global leaderboard top 3 podium & #1 ApexAdmin card with 42,069 PTS");

  // ==========================================
  // ACT 6: SEASON 1 GRAND PRIZE CARD
  // ==========================================
  console.log("\n--- CAPTURING ACT 6: GRAND PRIZE CARD ---");
  await navigate("http://localhost:3000/competitions", 2500);

  await capture("act6_grand_prize.png", "Season 1 Grand Prize card with 10% Dev Wallet Prize rule and official token mint CA");

  // Clean up
  ws.close();
  chrome.kill();
  await db.$disconnect();
  console.log("\n>>> ALL 13 SCENE ASSETS CAPTURED SUCCESSFULLY! <<<");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in capture script:", err);
  process.exit(1);
});
