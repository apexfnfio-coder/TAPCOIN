import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const port = 9229;
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const artifactDir = "C:\\Users\\indra\\.gemini\\antigravity\\brain\\094d5c96-2df4-4e23-9ed2-58dae2fa6bd8";
const videoPath = path.join(artifactDir, "walkthrough_recording.mp4");
const screenshotsDir = path.join(artifactDir, "record_frames");

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function secret() {
  return process.env.SESSION_SECRET || "dev-only-secret-change-me";
}
function hashToken(token) {
  return crypto.createHmac("sha256", secret()).update(token).digest("hex");
}

async function setupAdminSession() {
  console.log("Setting up admin user & session in SQLite...");
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
  } else if (admin.role !== "admin") {
    admin = await db.user.update({
      where: { id: admin.id },
      data: { role: "admin", status: "active" },
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 86400_000);
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: admin.id,
      expiresAt,
      ip: "127.0.0.1",
      userAgent: "Automated Walkthrough Recorder",
    },
  });
  console.log("Admin session token created for:", admin.username);
  return { token, admin };
}

async function main() {
  const { token: adminToken } = await setupAdminSession();

  console.log("Launching headless Chrome on port", port);
  const tmpUserData = path.join(process.env.TEMP || "C:\\Windows\\Temp", `chrome-cdp-${Date.now()}`);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${tmpUserData}`,
    `--remote-debugging-port=${port}`,
    "--window-size=1440,900",
    "about:blank",
  ]);

  let version = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/json/version`);
      version = await listRes.json();
      if (version?.Browser) break;
    } catch {
      console.log(`Waiting for Chrome remote debugging (attempt ${attempt}/10)...`);
    }
  }

  try {
    if (!version) throw new Error("Could not connect to Chrome debugging port");
    console.log("Chrome connected:", version.Browser);

    const newTab = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/play`, { method: "PUT" });
    const tab = await newTab.json();

    const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && callbacks.has(msg.id)) {
        const resolve = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        resolve(msg.result);
      }
    });

    function send(method, params = {}) {
      const msgId = id++;
      return new Promise((resolve) => {
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
    console.log("CDP WebSocket open. Initializing domains...");

    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Clean frames directory
    const framesDir = path.join(artifactDir, "record_frames");
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });
    for (const f of fs.readdirSync(framesDir)) {
      if (f.endsWith(".jpg") || f.endsWith(".png")) {
        try { fs.unlinkSync(path.join(framesDir, f)); } catch {}
      }
    }

    let frameCount = 0;
    ws.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.method === "Page.screencastFrame") {
          const { data, sessionId } = msg.params;
          const framePath = path.join(framesDir, `frame_${String(frameCount++).padStart(5, "0")}.jpg`);
          fs.writeFileSync(framePath, Buffer.from(data, "base64"));
          await send("Page.screencastFrameAck", { sessionId });
        }
      } catch (e) {
        // ignore frame parse errors
      }
    });

    await send("Page.startScreencast", { format: "jpeg", quality: 80, everyNthFrame: 1 });
    console.log("Screencast recording started!");

    async function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function saveKeyFrame(name) {
      const scr = await send("Page.captureScreenshot", { format: "png" });
      if (scr?.data) {
        const p = path.join(artifactDir, `${name}.png`);
        fs.writeFileSync(p, Buffer.from(scr.data, "base64"));
        console.log(`Saved screenshot: ${name}.png`);
      }
    }

    // SCENE 1: DESKTOP HOME / PLAY LOBBY
    console.log("--- SCENE 1: Home / Play Stage ---");
    await sleep(2500);

    // Dismiss tutorial if visible
    await send("Runtime.evaluate", {
      expression: `
        const skip = document.querySelector('.tutorial-close-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Skip'));
        if (skip) skip.click();
      `,
    });
    await sleep(1500);
    await saveKeyFrame("record_01_desktop_lobby");

    // SCENE 2: CONNECT WALLET MODAL
    console.log("--- SCENE 2: Wallet Connect Modal ---");
    await send("Runtime.evaluate", {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Connect Wallet'));
        if (btn) btn.click();
      `,
    });
    await sleep(2000);
    await saveKeyFrame("record_02_wallet_modal");

    // Close wallet modal
    await send("Runtime.evaluate", {
      expression: `
        const x = document.querySelector('.modal-x');
        if (x) x.click();
      `,
    });
    await sleep(1200);

    // SCENE 3: IN-GAME FREE PRACTICE RUN
    console.log("--- SCENE 3: Playing Arcade Run ---");
    await send("Runtime.evaluate", {
      expression: `
        const playBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('FREE PRACTICE') || b.textContent.includes('DROP IN'));
        if (playBtn) playBtn.click();
      `,
    });
    await sleep(2000);

    // Simulate in-game movement and jump
    for (let i = 0; i < 6; i++) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyD", key: "d" });
      await sleep(400);
      if (i % 2 === 1) {
        // Jump over chasm or stomp
        await send("Input.dispatchKeyEvent", { type: "keyDown", code: "Space", key: " " });
        await sleep(150);
        await send("Input.dispatchKeyEvent", { type: "keyUp", code: "Space", key: " " });
      }
      await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyD", key: "d" });
      await sleep(300);
    }
    await saveKeyFrame("record_03_gameplay_action");
    await sleep(1500);

    // Quit run to return to lobby / results
    await send("Runtime.evaluate", {
      expression: `
        const quitBtn = document.querySelector('.hud-quit');
        if (quitBtn) quitBtn.click();
      `,
    });
    await sleep(2000);

    // SCENE 4: PLAYBOOK / HOW TO PLAY
    console.log("--- SCENE 4: Playbook (/how-to-play) ---");
    await send("Page.navigate", { url: "http://localhost:3000/how-to-play" });
    await sleep(2500);
    await saveKeyFrame("record_04_how_to_play");

    // SCENE 5: LEADERBOARD
    console.log("--- SCENE 5: Leaderboard (/leaderboard) ---");
    await send("Page.navigate", { url: "http://localhost:3000/leaderboard" });
    await sleep(2500);
    // Click Weekly tab
    await send("Runtime.evaluate", {
      expression: `
        const tabs = Array.from(document.querySelectorAll('.tabs button'));
        const weekly = tabs.find(t => t.textContent.toLowerCase().includes('weekly'));
        if (weekly) weekly.click();
      `,
    });
    await sleep(1500);
    await saveKeyFrame("record_05_leaderboard");

    // SCENE 6: BUY $TAP
    console.log("--- SCENE 6: Buy $TAP (/buy) ---");
    await send("Page.navigate", { url: "http://localhost:3000/buy" });
    await sleep(2500);
    // Click copy CA
    await send("Runtime.evaluate", {
      expression: `
        const copyPill = document.querySelector('.copyable');
        if (copyPill) copyPill.click();
      `,
    });
    await sleep(1500);
    await saveKeyFrame("record_06_buy_tap");

    // SCENE 7: PROFILE
    console.log("--- SCENE 7: Profile (/profile) ---");
    await send("Page.navigate", { url: "http://localhost:3000/profile" });
    await sleep(2500);
    await saveKeyFrame("record_07_profile");

    // SCENE 8: ADMIN CONSOLE
    console.log("--- SCENE 8: Admin Console (/admin) ---");
    // Inject admin session cookie
    await send("Network.setCookie", {
      name: "tap_session",
      value: adminToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
    await send("Page.navigate", { url: "http://localhost:3000/admin" });
    await sleep(2500);
    await saveKeyFrame("record_08_admin_dashboard");

    // Navigate to Admin Score Review
    await send("Page.navigate", { url: "http://localhost:3000/admin/runs" });
    await sleep(2000);
    await saveKeyFrame("record_09_admin_runs");

    // Navigate to Admin Config
    await send("Page.navigate", { url: "http://localhost:3000/admin/config" });
    await sleep(2000);
    await saveKeyFrame("record_10_admin_config");

    // SCENE 9: MOBILE VIEWPORT
    console.log("--- SCENE 9: Mobile Viewport Responsiveness ---");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/play" });
    await sleep(2500);
    await saveKeyFrame("record_11_mobile_play");

    await send("Page.navigate", { url: "http://localhost:3000/how-to-play" });
    await sleep(2000);
    await saveKeyFrame("record_12_mobile_how_to_play");

    await send("Page.navigate", { url: "http://localhost:3000/leaderboard" });
    await sleep(2000);
    await saveKeyFrame("record_13_mobile_leaderboard");

    // Finalize recording
    console.log("Finalizing screencast video... Frames captured:", frameCount);
    await send("Page.stopScreencast");
    await sleep(500);

    ws.close();
    chrome.kill();

    if (frameCount > 0) {
      console.log(`Compiling ${frameCount} frames into MP4 video with FFmpeg...`);
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-framerate", "8",
        "-i", path.join(framesDir, "frame_%05d.jpg"),
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-movflags", "+faststart",
        videoPath,
      ]);

      ffmpeg.stderr.on("data", (d) => {});

      await new Promise((resolve) => ffmpeg.on("close", resolve));
      console.log("FFmpeg video encoding finished! Video saved at:", videoPath);
    }
    console.log("All walkthrough steps and screen recording completed successfully!");
  } catch (err) {
    console.error("Recording error:", err);
    chrome.kill();
  } finally {
    await db.$disconnect();
  }
}

main();
