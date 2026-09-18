import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9333;
const projectRoot = path.resolve(".");
const mediaDir = path.resolve(projectRoot, "public/assets/media");
const brainDir = "C:\\Users\\indra\\.gemini\\antigravity\\brain\\094d5c96-2df4-4e23-9ed2-58dae2fa6bd8";

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Convert local images to Base64 for zero-latency instant rendering in Chrome
function getBase64(relPath) {
  const fullPath = path.resolve(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) return "";
  const ext = path.extname(fullPath).slice(1);
  const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  const b64 = fs.readFileSync(fullPath).toString("base64");
  return `data:${mime};base64,${b64}`;
}

const keyArtBase64 = getBase64("public/assets/media/tapcoin_poster_art.jpg");
const solanaBase64 = getBase64("public/assets/logos/solana.png");
const jupiterBase64 = getBase64("public/assets/logos/jupiter.png");
const phantomBase64 = getBase64("public/assets/logos/phantom.png");
const solflareBase64 = getBase64("public/assets/logos/solflare.png");
const backpackBase64 = getBase64("public/assets/logos/backpack.png");
const logoBase64 = getBase64("public/assets/ui/logo.png");

// 1. Vertical Theatrical Poster HTML (1200 x 1800, 2:3 ratio)
function generateVerticalPosterHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;0,700;0,800;1,700;1,800&family=JetBrains+Mono:wght@400;600;700;800&family=Space+Grotesk:wght@600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 1800px;
    background: #06090c;
    color: #fff;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Background Art Layer */
  .bg-art {
    position: absolute;
    top: 0;
    left: 0;
    width: 1200px;
    height: 1800px;
    background-image: url('${keyArtBase64}');
    background-size: cover;
    background-position: center top;
    z-index: 1;
  }

  /* Cinematic Vignette & Gradient Overlays */
  .vignette {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: radial-gradient(circle at 50% 45%, transparent 35%, rgba(6, 9, 12, 0.45) 75%, rgba(6, 9, 12, 0.95) 100%),
                linear-gradient(180deg, rgba(6, 9, 12, 0.88) 0%, rgba(6, 9, 12, 0.2) 20%, rgba(6, 9, 12, 0.1) 50%, rgba(6, 9, 12, 0.85) 75%, rgba(6, 9, 12, 0.98) 100%);
    pointer-events: none;
  }

  /* Cyber Grid Subtle Lines */
  .scanlines {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: repeating-linear-gradient(0deg, rgba(0, 255, 163, 0.02) 0px, rgba(0, 255, 163, 0.02) 1px, transparent 2px, transparent 4px);
    pointer-events: none;
  }

  /* Poster Content Layout */
  .poster-container {
    position: relative;
    z-index: 10;
    width: 1200px;
    height: 1800px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 70px 50px 70px;
  }

  /* Top Header */
  .header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid rgba(0, 255, 163, 0.35);
    padding-bottom: 18px;
    background: linear-gradient(90deg, rgba(0, 255, 163, 0.08), transparent 70%);
    backdrop-filter: blur(8px);
    border-radius: 4px;
    padding-left: 20px;
    padding-right: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .header-badge {
    background: rgba(0, 255, 163, 0.15);
    border: 1px solid #00FFA3;
    color: #00FFA3;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2.5px;
    padding: 6px 14px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .header-title {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 3px;
    color: #FFD000;
    text-transform: uppercase;
  }

  .solana-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(153, 69, 255, 0.2);
    border: 1px solid rgba(153, 69, 255, 0.6);
    padding: 6px 16px;
    border-radius: 999px;
  }

  .solana-pill img {
    height: 18px;
  }

  .solana-pill span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #E2D9FF;
    letter-spacing: 1.5px;
  }

  /* Mid Title Enhancement (Complements Art Title) */
  .title-subwrap {
    margin-top: 140px;
    text-align: center;
  }

  .grand-subtitle {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 8px;
    color: #00FFA3;
    text-shadow: 0 0 25px rgba(0, 255, 163, 0.8), 0 2px 4px rgba(0,0,0,0.8);
    text-transform: uppercase;
  }

  .genre-pill {
    display: inline-block;
    margin-top: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    letter-spacing: 4px;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 6px 20px;
    border-radius: 999px;
    text-transform: uppercase;
  }

  /* Bottom Content Area */
  .bottom-section {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* Tagline Hero Callout */
  .tagline-box {
    text-align: center;
    background: linear-gradient(180deg, rgba(6, 9, 12, 0.75) 0%, rgba(6, 9, 12, 0.95) 100%);
    border: 1px solid rgba(0, 255, 163, 0.4);
    border-radius: 14px;
    padding: 24px 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 163, 0.15);
    backdrop-filter: blur(12px);
  }

  .tagline-main {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 40px;
    font-weight: 800;
    font-style: italic;
    letter-spacing: 2px;
    color: #FFFFFF;
    line-height: 1.2;
    text-transform: uppercase;
    text-shadow: 0 0 20px rgba(0, 255, 163, 0.6);
  }

  .tagline-main span.green {
    color: #00FFA3;
    text-shadow: 0 0 25px rgba(0, 255, 163, 0.9);
  }

  .tagline-main span.gold {
    color: #FFD000;
    text-shadow: 0 0 25px rgba(255, 208, 0, 0.9);
  }

  .tagline-desc {
    margin-top: 10px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 1.2px;
    color: #C8D6E5;
  }

  /* Feature Grid 3 Columns */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .feature-card {
    background: rgba(10, 15, 22, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .feature-card.highlight {
    border-color: rgba(255, 208, 0, 0.6);
    background: linear-gradient(180deg, rgba(255, 208, 0, 0.12), rgba(10, 15, 22, 0.9));
  }

  .feature-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .feature-icon {
    font-size: 22px;
  }

  .feature-title {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #FFD000;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .feature-card:not(.highlight) .feature-title {
    color: #00FFA3;
  }

  .feature-desc {
    font-size: 13px;
    color: #94A3B8;
    line-height: 1.4;
    font-weight: 500;
  }

  /* Contract Address Banner */
  .ca-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 255, 163, 0.08);
    border: 1.5px solid #00FFA3;
    border-radius: 8px;
    padding: 12px 24px;
    box-shadow: 0 0 25px rgba(0, 255, 163, 0.2);
  }

  .ca-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #00FFA3;
    text-transform: uppercase;
  }

  .ca-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 1.5px;
    text-shadow: 0 0 10px rgba(0, 255, 163, 0.7);
  }

  /* Partner Logo Badges */
  .partner-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
  }

  .partner-group {
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .partner-logo {
    height: 30px;
    object-fit: contain;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8)) grayscale(20%);
    opacity: 0.9;
  }

  .cta-pill {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #00FFA3 0%, #00B074 100%);
    color: #06090c;
    font-family: 'Chakra Petch', sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 2px;
    padding: 12px 32px;
    border-radius: 999px;
    box-shadow: 0 0 30px rgba(0, 255, 163, 0.6);
    text-transform: uppercase;
  }

  /* Legal/Credit Footer */
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
</style>
</head>
<body>

<div class="bg-art"></div>
<div class="vignette"></div>
<div class="scanlines"></div>

<div class="poster-container">
  <!-- Top Header -->
  <div class="header-bar">
    <div class="header-left">
      <div class="header-badge">ARCADE PROTOCOL</div>
      <div class="header-title">SEASON 1 GRAND CHAMPIONSHIP</div>
    </div>
    <div class="solana-pill">
      <img src="${solanaBase64}" alt="Solana">
      <span>BUILT ON SOLANA</span>
    </div>
  </div>

  <!-- Mid Subtitle (enhances art title) -->
  <div class="title-subwrap">
    <div class="grand-subtitle">TIMBER ARCADE SURVIVAL</div>
    <div class="genre-pill">FAST-PACED ENDLESS RETRO-ACTION · 60 FPS</div>
  </div>

  <!-- Bottom Interactive Section -->
  <div class="bottom-section">
    <!-- Tagline Box -->
    <div class="tagline-box">
      <div class="tagline-main">
        CHOP <span class="green">TIMBER</span>. RIDE THE <span class="green">PUMP</span>.<br>SURVIVE THE <span class="gold">FOREST</span>.
      </div>
      <div class="tagline-desc">
        Climb the global leaderboard, dodge the brutal market dump, and claim your share of the prize pool.
      </div>
    </div>

    <!-- 3 Core Feature Cards -->
    <div class="features-grid">
      <div class="feature-card highlight">
        <div class="feature-header">
          <span class="feature-icon">🏆</span>
          <span class="feature-title">10% DEV TREASURY</span>
        </div>
        <div class="feature-desc">Month 1 Grand Prize pool unlocked directly for top-tier competitive degens.</div>
      </div>

      <div class="feature-card">
        <div class="feature-header">
          <span class="feature-icon">⚡</span>
          <span class="feature-title">ONE-CLICK ONBOARDING</span>
        </div>
        <div class="feature-desc">Zero friction. Connect instantly with Phantom, Solflare, Jupiter, or Backpack.</div>
      </div>

      <div class="feature-card">
        <div class="feature-header">
          <span class="feature-icon">⚔️</span>
          <span class="feature-title">ENDLESS HAZARDS</span>
        </div>
        <div class="feature-desc">Slice God Candles, leap chasms, shatter crates, and fight ferocious Cyber Bears.</div>
      </div>
    </div>

    <!-- Contract Address Banner -->
    <div class="ca-banner">
      <div class="ca-label">
        <span>⚡ OFFICIAL TOKEN MINT (CA)</span>
      </div>
      <div class="ca-value">
        ADcF26nFGKMuRZ7va5361H2PCHCDRi2FmeJBkX3Spump
      </div>
    </div>

    <!-- Partner Logos & CTA -->
    <div class="partner-row">
      <div class="partner-group">
        <img class="partner-logo" src="${solanaBase64}" alt="Solana">
        <img class="partner-logo" src="${jupiterBase64}" alt="Jupiter">
        <img class="partner-logo" src="${phantomBase64}" alt="Phantom">
        <img class="partner-logo" src="${solflareBase64}" alt="Solflare">
        <img class="partner-logo" src="${backpackBase64}" alt="Backpack">
      </div>
      <div class="cta-pill">
        <span>PLAY FREE PRACTICE NOW 🎮</span>
      </div>
    </div>

    <!-- Footer Credits -->
    <div class="footer-bar">
      <div>$TAP PROTOCOL // PROVABLY FAIR SOLANA ARCADE</div>
      <div>100% WEB AUDIO DSP · PHASER V3 · 60 FPS ENGINE</div>
      <div>HTTPS://TAPCOIN.APP</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

// 2. Horizontal Banner Poster HTML (1920 x 1080, 16:9 ratio)
function generateHorizontalPosterHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;0,700;0,800;1,700;1,800&family=JetBrains+Mono:wght@400;600;700;800&family=Space+Grotesk:wght@600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px;
    height: 1080px;
    background: #06090c;
    color: #fff;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Background Art Layer */
  .bg-art {
    position: absolute;
    top: 0;
    right: 0;
    width: 1200px;
    height: 1080px;
    background-image: url('${keyArtBase64}');
    background-size: cover;
    background-position: center 20%;
    z-index: 1;
  }

  /* Cinematic Vignette & Left Fade */
  .vignette {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(90deg, #06090c 0%, #06090c 42%, rgba(6, 9, 12, 0.85) 60%, rgba(6, 9, 12, 0.4) 85%, rgba(6, 9, 12, 0.8) 100%),
                linear-gradient(180deg, rgba(6, 9, 12, 0.75) 0%, transparent 20%, transparent 80%, rgba(6, 9, 12, 0.95) 100%);
    pointer-events: none;
  }

  .scanlines {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: repeating-linear-gradient(0deg, rgba(0, 255, 163, 0.015) 0px, rgba(0, 255, 163, 0.015) 1px, transparent 2px, transparent 4px);
    pointer-events: none;
  }

  .banner-container {
    position: relative;
    z-index: 10;
    width: 1920px;
    height: 1080px;
    display: flex;
    justify-content: space-between;
    padding: 60px 80px;
  }

  .left-column {
    width: 900px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .header-badges {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .tag-badge {
    background: rgba(0, 255, 163, 0.15);
    border: 1px solid #00FFA3;
    color: #00FFA3;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    padding: 6px 14px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .solana-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(153, 69, 255, 0.2);
    border: 1px solid rgba(153, 69, 255, 0.6);
    padding: 6px 16px;
    border-radius: 999px;
  }

  .solana-badge img { height: 18px; }
  .solana-badge span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #E2D9FF;
    letter-spacing: 1.5px;
  }

  .hero-headline {
    margin-top: 30px;
  }

  .game-title {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 88px;
    font-weight: 900;
    letter-spacing: 4px;
    color: #00FFA3;
    line-height: 0.95;
    text-transform: uppercase;
    text-shadow: 0 0 40px rgba(0, 255, 163, 0.6);
  }

  .game-sub {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 6px;
    color: #FFD000;
    margin-top: 10px;
    text-transform: uppercase;
  }

  .lead-text {
    font-size: 20px;
    color: #CBD5E1;
    line-height: 1.5;
    margin-top: 20px;
    max-width: 820px;
  }

  .lead-text strong {
    color: #00FFA3;
  }

  .feature-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 32px;
  }

  .f-card {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 16px 20px;
    backdrop-filter: blur(10px);
  }

  .f-card.gold {
    border-color: rgba(255, 208, 0, 0.6);
    background: linear-gradient(180deg, rgba(255, 208, 0, 0.1), rgba(15, 23, 42, 0.8));
  }

  .f-title {
    font-family: 'Chakra Petch', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #00FFA3;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .f-card.gold .f-title { color: #FFD000; }
  .f-desc { font-size: 13px; color: #94A3B8; line-height: 1.35; }

  .ca-bar {
    background: rgba(0, 255, 163, 0.08);
    border: 1.5px solid #00FFA3;
    border-radius: 8px;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 0 25px rgba(0, 255, 163, 0.2);
    margin-top: 24px;
  }

  .ca-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #00FFA3;
  }

  .ca-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 700;
    color: #FFF;
    letter-spacing: 1.5px;
  }

  .bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 26px;
  }

  .logos {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .logos img {
    height: 32px;
    object-fit: contain;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #00FFA3 0%, #00B074 100%);
    color: #06090c;
    font-family: 'Chakra Petch', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 2px;
    padding: 14px 38px;
    border-radius: 999px;
    box-shadow: 0 0 35px rgba(0, 255, 163, 0.7);
    text-transform: uppercase;
  }
</style>
</head>
<body>

<div class="bg-art"></div>
<div class="vignette"></div>
<div class="scanlines"></div>

<div class="banner-container">
  <div class="left-column">
    <div>
      <div class="header-badges">
        <div class="tag-badge">SEASON 1 CHAMPIONSHIP</div>
        <div class="tag-badge" style="border-color: #FFD000; color: #FFD000;">10% DEV TREASURY POOL</div>
        <div class="solana-badge">
          <img src="${solanaBase64}" alt="Solana">
          <span>ON SOLANA</span>
        </div>
      </div>

      <div class="hero-headline">
        <div class="game-title">$TAPCOIN</div>
        <div class="game-sub">ENDLESS TIMBER ARCADE SURVIVAL</div>
        <div class="lead-text">
          Chop timber. Slice <strong>God Candles</strong>. Leap lethal chasms. Unbox mystery crates. Face off against the ferocious <strong>Cyber Bear</strong> in the highest-octane arcade experience on Solana.
        </div>
      </div>

      <div class="feature-strip">
        <div class="f-card gold">
          <div class="f-title">🏆 10% DEV WALLET</div>
          <div class="f-desc">Top the global leaderboard to claim the Month 1 dev treasury grand prize pool.</div>
        </div>
        <div class="f-card">
          <div class="f-title">⚡ ONE-CLICK ONBOARDING</div>
          <div class="f-desc">Connect with Phantom, Solflare, Jupiter, or Backpack with zero seed phrase friction.</div>
        </div>
        <div class="f-card">
          <div class="f-title">🎮 FREE PRACTICE MODE</div>
          <div class="f-desc">Instant drop-in. Practice tree counts, jump buffering, and bear counter-hits anytime.</div>
        </div>
      </div>

      <div class="ca-bar">
        <div class="ca-title">⚡ OFFICIAL TOKEN CA:</div>
        <div class="ca-code">ADcF26nFGKMuRZ7va5361H2PCHCDRi2FmeJBkX3Spump</div>
      </div>
    </div>

    <div class="bottom-row">
      <div class="logos">
        <img src="${solanaBase64}" alt="Solana">
        <img src="${jupiterBase64}" alt="Jupiter">
        <img src="${phantomBase64}" alt="Phantom">
        <img src="${solflareBase64}" alt="Solflare">
        <img src="${backpackBase64}" alt="Backpack">
      </div>
      <div class="action-btn">
        <span>PLAY FREE PRACTICE NOW 🎮</span>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}

// Simple HTTP server to serve the HTML pages to Chrome
async function main() {
  console.log("================================================================");
  console.log("$TAP SOLANA ARCADE // PROFESSIONAL POSTER RENDER ENGINE");
  console.log("================================================================");

  const vertHtml = generateVerticalPosterHtml();
  const horizHtml = generateHorizontalPosterHtml();

  const server = http.createServer((req, res) => {
    if (req.url === "/vertical") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(vertHtml);
    } else if (req.url === "/horizontal") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(horizHtml);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  await new Promise((resolve) => server.listen(8088, resolve));
  console.log("[Server] Local poster server listening on http://localhost:8088");

  // Launch Chrome with remote debugging
  console.log("[Chrome] Launching Headless Chrome...");
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--window-size=1920,1080",
    "--user-data-dir=C:\\temp\\chrome-poster-profile",
  ]);

  await new Promise((r) => setTimeout(r, 2000));

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
    chromeProcess.kill();
    throw new Error("Could not connect to Chrome debugging port");
  }
  console.log("[Chrome] Connected:", version.Browser);

  // Create page tab target
  const newTab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const tab = await newTab.json();
  const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pending.has(msg.id)) {
        const resolve = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg.result);
      }
    } catch (e) {}
  });

  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  console.log("[CDP] Connected to tab WebSocket.");

  function send(method, params = {}) {
    const id = idCounter++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("DOM.enable");
  await send("Runtime.enable");

  // Render 1: Vertical Theatrical Poster (1200 x 1800)
  console.log("\n[Render 1/2] Rendering Vertical Theatrical Poster (1200x1800)...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1200,
    height: 1800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:8088/vertical" });
  await new Promise((r) => setTimeout(r, 3500)); // Allow Google Fonts to render

  const vertScreenshot = await send("Page.captureScreenshot", { format: "png" });
  if (!vertScreenshot?.data) {
    throw new Error("Failed to capture vertical poster screenshot");
  }
  const vertBuffer = Buffer.from(vertScreenshot.data, "base64");

  const vertOutPublic = path.resolve(mediaDir, "tapcoin_poster_theatrical.png");
  const vertOutBrain = path.resolve(brainDir, "tapcoin_poster_theatrical.png");
  fs.writeFileSync(vertOutPublic, vertBuffer);
  fs.writeFileSync(vertOutBrain, vertBuffer);
  console.log(`  [OK] Saved -> ${vertOutPublic} (${(vertBuffer.length / 1024).toFixed(0)} KB)`);
  console.log(`  [OK] Copied -> ${vertOutBrain}`);

  // Render 2: Horizontal Esports Banner Poster (1920 x 1080)
  console.log("\n[Render 2/2] Rendering Horizontal Esports Banner Poster (1920x1080)...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:8088/horizontal" });
  await new Promise((r) => setTimeout(r, 3500)); // Allow Google Fonts to render

  const horizScreenshot = await send("Page.captureScreenshot", { format: "png" });
  if (!horizScreenshot?.data) {
    throw new Error("Failed to capture horizontal banner screenshot");
  }
  const horizBuffer = Buffer.from(horizScreenshot.data, "base64");

  const horizOutPublic = path.resolve(mediaDir, "tapcoin_poster_banner.png");
  const horizOutBrain = path.resolve(brainDir, "tapcoin_poster_banner.png");
  fs.writeFileSync(horizOutPublic, horizBuffer);
  fs.writeFileSync(horizOutBrain, horizBuffer);
  console.log(`  [OK] Saved -> ${horizOutPublic} (${(horizBuffer.length / 1024).toFixed(0)} KB)`);
  console.log(`  [OK] Copied -> ${horizOutBrain}`);

  // Cleanup
  ws.close();
  chromeProcess.kill();
  server.close();
  console.log("\n================================================================");
  console.log(">>> POSTER GENERATION COMPLETED SUCCESSFULLY! <<<");
  console.log("================================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
