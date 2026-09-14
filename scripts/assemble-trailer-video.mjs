#!/usr/bin/env node
/**
 * scripts/assemble-trailer-video.mjs
 * 
 * Master Video Assembly Engine for $TAP Solana Arcade Cinematic Trailer.
 * Assembles 13 high-resolution 1080p scene PNGs and 40.00s 48kHz audio into
 * the final 1080p 60fps cinematic MP4 trailer.
 * 
 * Requirements:
 * - Exactly 1920x1080 (16:9 widescreen)
 * - Constant 60.000 FPS (-r 60, libx264, yuv420p, crf 18)
 * - Duration strictly 40.00 seconds (matching 40.00s 48kHz audio track)
 * - 6 Acts fully depicted with dynamic camera zoompan, crossfades, and neon cyberpunk HUD overlays
 * - Grand Prize callout "Climb the Leaderboard · Win 10% Dev Wallet Prize in Month 1"
 * - Official Token Mint CA: ADcF26nFGKMuRZ7va5361H2PCHCDRi2FmeJBkX3Spump
 * - Audio muxed as AAC 48kHz stereo at 192kbps
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
let outputVideoPath = path.resolve(projectRoot, 'public/assets/media/tap_intro_trailer.mp4');
let audioTrackPath = path.resolve(projectRoot, 'public/assets/media/tap_trailer_audio.wav');
let scenesDirPath = path.resolve(projectRoot, 'temp_trailer_scenes');
let tempBuildDir = path.resolve(projectRoot, 'temp_trailer_assembly');
let forceRebuild = args.includes('--force');

for (const arg of args) {
  if (arg.startsWith('--output=')) {
    outputVideoPath = path.resolve(process.cwd(), arg.split('=')[1]);
  } else if (arg.startsWith('--audio=')) {
    audioTrackPath = path.resolve(process.cwd(), arg.split('=')[1]);
  } else if (arg.startsWith('--scenes=')) {
    scenesDirPath = path.resolve(process.cwd(), arg.split('=')[1]);
  }
}

console.log('================================================================');
console.log('$TAP SOLANA ARCADE // MASTER TRAILER VIDEO ASSEMBLY');
console.log('================================================================');
console.log(`[Assembly] Output Path:  ${outputVideoPath}`);
console.log(`[Assembly] Audio Track:  ${audioTrackPath}`);
console.log(`[Assembly] Scenes Dir:   ${scenesDirPath}`);
console.log(`[Assembly] Temp Workdir: ${tempBuildDir}`);

// Ensure directories exist
fs.mkdirSync(path.dirname(outputVideoPath), { recursive: true });
if (!fs.existsSync(tempBuildDir)) {
  fs.mkdirSync(tempBuildDir, { recursive: true });
}

// Fonts on Windows
const FONT_CONSOLA_BOLD = 'C\\:/Windows/Fonts/consolab.ttf';
const FONT_SEGOEUI_BOLD = 'C\\:/Windows/Fonts/segoeuib.ttf';

// Helper function to safely format drawtext filter
function drawText(font, text, color, size, x, y) {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "") // strip single quotes
    .replace(/:/g, '\\:');
  return `drawtext=fontfile='${font}':text='${escaped}':expansion=none:fontcolor=${color}:fontsize=${size}:x=${x}:y=${y}`;
}

// Verify audio track exists
if (!fs.existsSync(audioTrackPath)) {
  console.error(`[Assembly] ERROR: Audio track not found at ${audioTrackPath}`);
  process.exit(1);
}

// Scene definitions across the 6 acts (Total: exactly 2400 frames = 40.00s @ 60 FPS)
const SCENE_DEFINITIONS = [
  // --- ACT 1: First Arrival (0:00 - 0:05, 5.0s, 300 frames) ---
  {
    id: 'seg01_act1_terminal',
    act: 'Act 1: First Arrival',
    image: 'act1_terminal.png',
    frames: 300, // 5.00s
    desc: 'Lobby Battle Station terminal fly-in with live ticker & trollbox',
    zoompan: "zoompan=z='min(1.0+0.12*(on/300),1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=300:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0x00FFA3:t=fill",
      drawText(FONT_CONSOLA_BOLD, '$TAP SOLANA ARCADE // BATTLE STATION TERMINAL', '0x00FFA3', 36, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'STATUS: SYSTEM ONLINE // LIVE 132 BPM PROCEDURAL RETRO-SYNTH', '0xFFD000', 20, '(w-text_w)/2', 76),
      "drawbox=x=60:y=988:w=720:h=54:color=black@0.82:t=fill",
      "drawbox=x=60:y=988:w=720:h=54:color=0x00FFA3:t=2",
      drawText(FONT_CONSOLA_BOLD, 'LIVE TICKER · 1,428,500 GLOBAL TREES FELLED', '0x00FFA3', 22, 85, 1003)
    ]
  },

  // --- ACT 2: Instant Wallet Connect (0:05 - 0:09, 4.0s, 240 frames total) ---
  {
    id: 'seg02_act2_wallet_modal',
    act: 'Act 2: Instant Wallet Connect (Modal)',
    image: 'act2_wallet_modal.png',
    frames: 120, // 2.00s
    desc: 'Wallet selection modal highlighting Phantom, Solflare, Jupiter badges',
    zoompan: "zoompan=z='min(1.0+0.08*(on/120),1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0xFFD000:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'ONE-CLICK SOLANA ONBOARDING // SELECT WALLET', '0xFFD000', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'SUPPORTING PHANTOM · SOLFLARE · JUPITER · BACKPACK', '0x00FFA3', 20, '(w-text_w)/2', 76)
    ]
  },
  {
    id: 'seg03_act2_wallet_connected',
    act: 'Act 2: Instant Wallet Connect (Connected)',
    image: 'act2_wallet_connected.png',
    frames: 120, // 2.00s
    desc: 'Authenticated session with green verified pill and Drop In CTA',
    zoompan: "zoompan=z='max(1.06-0.06*(on/120),1.00)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1920x1080:fps=60,fade=t=in:st=0:d=0.30",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0x00FFA3:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'WALLET CONNECTED: 2Mz6...ndCE // AUTHENTICATED', '0x00FFA3', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'ZERO SEED PHRASE FRICTION // READY TO DROP IN & CHOP', '0xFFD000', 20, '(w-text_w)/2', 76)
    ]
  },

  // --- ACT 3: High-Octane Gameplay (0:09 - 0:22, 13.0s, 780 frames total) ---
  {
    id: 'seg04_act3_gameplay_chop',
    act: 'Act 3: Gameplay Run (Timber Chop)',
    image: 'act3_gameplay_chop.png',
    frames: 150, // 2.50s
    desc: 'Timber chopping action with dynamic punch zoom',
    zoompan: "zoompan=z='1.0+0.18*sin((on/150)*PI)':x='iw*0.44-(iw/zoom/2)':y='ih*0.50-(ih/zoom/2)':d=150:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0x00FFA3:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'ACT III: HIGH-OCTANE ARCADE RUN // DROP IN', '0x00FFA3', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'CHOP TIMBER · RIDE THE PUMP · DONT GET REKT', '0xFFD000', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=580:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=580:h=70:color=0x00FFA3:t=3",
      drawText(FONT_SEGOEUI_BOLD, '+10 CHOP! // TIMBER FELL', '0x00FFA3', 28, 130, 898)
    ]
  },
  {
    id: 'seg05_act3_rat_stomp',
    act: 'Act 3: Gameplay Run (Rat Stomp)',
    image: 'act3_rat_stomp.png',
    frames: 150, // 2.50s
    desc: 'Jump over chasm & Rat Stomp with jump buffering & coyote time',
    zoompan: "zoompan=z='1.08+0.14*sin((on/150)*PI)':x='iw*0.48-(iw/zoom/2)':y='ih*0.55-(ih/zoom/2)':d=150:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0xFFD000:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'COYOTE TIME & JUMP BUFFERING // PLATFORMER POLISH', '0xFFD000', 32, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, '100MS COYOTE TIME · 120MS JUMP BUFFER · VARIABLE HOP HEIGHT', '0x00FFA3', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=580:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=580:h=70:color=0x00FFA3:t=3",
      drawText(FONT_SEGOEUI_BOLD, '+10 STOMP! 🐀💥 // COMBO MULTIPLIER x2', '0x00FFA3', 28, 130, 898)
    ]
  },
  {
    id: 'seg06_act3_bear_combat',
    act: 'Act 3: Gameplay Run (Bear Combat)',
    image: 'act3_bear_combat.png',
    frames: 150, // 2.50s
    desc: 'Patrolling cyber Bear combat encounter with 3 HP cyber bar',
    zoompan: "zoompan=z='min(1.05+0.14*(on/150),1.19)':x='iw*0.58-(iw/zoom/2)':y='ih*0.50-(ih/zoom/2)':d=150:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0xFF3B30:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'BOSS ENCOUNTER: PATROLLING CYBER BEAR // 3 HP', '0xFF3B30', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'MULTI-HIT COMBAT · CHARGE ROAR · DODGE OR COUNTER-HIT', '0xFFD000', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=620:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=620:h=70:color=0xFF3B30:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'WARNING: BEAR ATTACK CHARGE // 3 HP', '0xFF3B30', 28, 130, 898)
    ]
  },
  {
    id: 'seg07_act3_bear_counterhit',
    act: 'Act 3: Gameplay Run (Counter-Hit Clash)',
    image: 'act3_bear_counterhit.png',
    frames: 150, // 2.50s
    desc: 'Axe parry counter-hit clash with spark bloom and camera recoil shake',
    zoompan: "zoompan=z='1.16+0.04*sin(on*0.8)':x='iw*0.54-(iw/zoom/2)+4*sin(on*1.5)':y='ih*0.48-(ih/zoom/2)+3*cos(on*1.5)':d=150:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0xFFD000:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'COUNTER HIT! ⚡ // PERFECT TIMING PARRY', '0xFFD000', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'ELECTRIC SPARK BLOOM · CRITICAL DAMAGE · BEAR STAGGERED', '0x00FFA3', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=660:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=660:h=70:color=0xFFD000:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'COUNTER HIT! ⚡ // CRITICAL MULTIPLIER x3', '0xFFD000', 28, 130, 898)
    ]
  },
  {
    id: 'seg08_act3_bear_rekt',
    act: 'Act 3: Gameplay Run (Bear Rekt & Hurry-Up Mode)',
    image: 'act3_bear_rekt.png',
    frames: 180, // 3.00s
    desc: 'Bear defeated with 3 green pump candles & 176 BPM Hurry-Up acceleration',
    zoompan: "zoompan=z='min(1.04+0.12*(on/180),1.16)':x='iw*0.50-(iw/zoom/2)':y='ih*0.50-(ih/zoom/2)':d=180:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0x00FFA3:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'BEAR REKT! 🐻💥 +30 PTS // 3 PUMP CANDLES UNLEASHED', '0x00FFA3', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'BEAR MARKET DUMP SQUASHED · GOD CANDLE SURGE ACTIVE', '0xFFD000', 20, '(w-text_w)/2', 76),
      "drawbox=x=360:y=960:w=1200:h=68:color=black@0.88:t=fill",
      "drawbox=x=360:y=960:w=1200:h=68:color=0xFF3B30:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'HURRY-UP MODE ACTIVE // 176 BPM // LAST 10 SECONDS TENSION', '0xFF3B30', 28, '(w-text_w)/2', 978)
    ]
  },

  // --- ACT 4: Level 1 Cleared & Advance to Level 2 (0:22 - 0:28, 6.0s, 360 frames total) ---
  {
    id: 'seg09_act4_level1_clear',
    act: 'Act 4: Level 1 Clear (Hit-Stop & Flash)',
    image: 'act4_level1_clear.png',
    frames: 150, // 2.50s
    desc: '150ms hit-stop freeze silence followed by Bull Green flash and particle celebration',
    zoompan: "zoompan=z='if(lt(on,10),1.25,max(1.25-0.25*((on-10)/140),1.00))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0x00FFA3:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'ACT IV: LEVEL 1 CLEARED // 150MS HIT-STOP IMPACT', '0x00FFA3', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'FINAL TIMBER FELLED · SOLANA BULL GREEN SCREEN FLASH · PARTICLES BURST', '0xFFD000', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=640:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=640:h=70:color=0x00FFA3:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'LEVEL 1 CLEARED! // PUMP CONFIRMED', '0x00FFA3', 28, 130, 898)
    ]
  },
  {
    id: 'seg10_act4_level2_banner',
    act: 'Act 4: Level 2 Banner Transition',
    image: 'act4_level2_banner.png',
    frames: 210, // 3.50s
    desc: 'Center Level 2 banner transition with velocity boost',
    zoompan: "zoompan=z='min(1.00+0.14*(on/210),1.14)':x='iw/2-(iw/zoom/2)':y='ih*0.48-(ih/zoom/2)':d=210:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0xFFD000:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'LEVEL 2 UNLOCKED // VELOCITY x1.25 SPEED BOOST', '0xFFD000', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'ADVANCING TO LEVEL 2 · HIGHER TIMBER VELOCITY · EXPONENTIAL MULTIPLIER', '0x00FFA3', 20, '(w-text_w)/2', 76),
      "drawbox=x=360:y=960:w=1200:h=68:color=black@0.88:t=fill",
      "drawbox=x=360:y=960:w=1200:h=68:color=0x00FFA3:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'LEVEL 1 CLEARED // ADVANCING TO LEVEL 2 // VELOCITY x1.25', '0x00FFA3', 28, '(w-text_w)/2', 978)
    ]
  },

  // --- ACT 5: ATH Score Flex & Leaderboard (0:28 - 0:34, 6.0s, 360 frames total) ---
  {
    id: 'seg11_act5_ath_results',
    act: 'Act 5: ATH Score Flex (Results)',
    image: 'act5_ath_results.png',
    frames: 180, // 3.00s
    desc: 'Celebrating Ape mascot with 42,069 score and NEW ALL-TIME HIGH badge',
    zoompan: "zoompan=z='1.02+0.06*sin((on/180)*PI)':x='iw*0.45-(iw/zoom/2)':y='ih*0.48-(ih/zoom/2)':d=180:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0x00FFA3:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'ACT V: NEW ALL-TIME HIGH (ATH) RECORDED!', '0x00FFA3', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'GLOBAL SERVER-VALIDATED RUN · PROVABLY VERIFIED ON SOLANA', '0xFFD000', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=640:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=640:h=70:color=0xFFD000:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'ATH SCORE: 42,069 PTS // LEVEL 2 VERIFIED', '0xFFD000', 28, 130, 898)
    ]
  },
  {
    id: 'seg12_act5_leaderboard_podium',
    act: 'Act 5: ATH Score Flex (Leaderboard #1)',
    image: 'act5_leaderboard_podium.png',
    frames: 180, // 3.00s
    desc: 'Top 3 podium ranking vertical pan up to #1 ApexAdmin · 42,069 PTS',
    zoompan: "zoompan=z=1.06:x='iw/2-(iw/zoom/2)':y='max(ih*0.56-(ih/zoom/2)-(on/180)*90,ih*0.46-(ih/zoom/2))':d=180:s=1920x1080:fps=60",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=76:color=black@0.80:t=fill",
      "drawbox=x=0:y=100:w=1920:h=4:color=0xFFD000:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'GLOBAL LIVE LEADERBOARD // RANK #1: APEXADMIN', '0xFFD000', 34, '(w-text_w)/2', 34),
      drawText(FONT_CONSOLA_BOLD, 'NEW ALL-TIME HIGH (ATH) // GLOBAL LEADERBOARD #1 RANK', '0x00FFA3', 20, '(w-text_w)/2', 76),
      "drawbox=x=100:y=880:w=680:h=70:color=black@0.85:t=fill",
      "drawbox=x=100:y=880:w=680:h=70:color=0x00FFA3:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'PODIUM #1 UNLOCKED // 10% DEV WALLET POOL CONTENDER', '0x00FFA3', 26, 130, 898)
    ]
  },

  // --- ACT 6: Grand Prize Callout & Call to Action (0:34 - 0:40, 6.0s, 360 frames total) ---
  {
    id: 'seg13_act6_grand_prize',
    act: 'Act 6: Grand Prize Callout & Call to Action',
    image: 'act6_grand_prize.png',
    frames: 360, // 6.00s
    desc: 'Season 1 Grand Championship competition rule + Token Mint CA + fade to black at 39.8s',
    zoompan: "zoompan=z='max(1.10-0.10*(on/360),1.00)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1920x1080:fps=60,fade=t=out:st=5.5:d=0.5",
    overlays: [
      "drawbox=x=0:y=24:w=1920:h=56:color=black@0.85:t=fill",
      "drawbox=x=0:y=80:w=1920:h=3:color=0xFFD000:t=fill",
      drawText(FONT_SEGOEUI_BOLD, 'SEASON 1 GRAND CHAMPIONSHIP // COMPETE & WIN', '0xFFD000', 28, '(w-text_w)/2', 36),

      // Main Prize Callout Banner
      "drawbox=x=160:y=96:w=1600:h=82:color=black@0.88:t=fill",
      "drawbox=x=160:y=96:w=1600:h=82:color=0x00FFA3:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'Climb the Leaderboard · Win 10% Dev Wallet Prize in Month 1', '0x00FFA3', 40, '(w-text_w)/2', 116),

      // Official Token Contract Address Banner
      "drawbox=x=160:y=870:w=1600:h=68:color=black@0.90:t=fill",
      "drawbox=x=160:y=870:w=1600:h=68:color=0x00FFA3:t=2",
      drawText(FONT_CONSOLA_BOLD, 'OFFICIAL TOKEN CA: ADcF26nFGKMuRZ7va5361H2PCHCDRi2FmeJBkX3Spump', '0x00FFA3', 28, '(w-text_w)/2', 888),

      // Bottom Call to Action Banner
      "drawbox=x=160:y=950:w=1600:h=72:color=black@0.92:t=fill",
      "drawbox=x=160:y=950:w=1600:h=72:color=0xFFD000:t=3",
      drawText(FONT_SEGOEUI_BOLD, 'TRADE $TAP ON JUPITER // PLAY NOW AT TAPCOIN', '0xFFD000', 32, '(w-text_w)/2', 968)
    ]
  }
];

// Verify all input scene images exist
console.log('\n[Assembly] Verifying input scene assets...');
let totalFrames = 0;
for (const scene of SCENE_DEFINITIONS) {
  const imgPath = path.resolve(scenesDirPath, scene.image);
  if (!fs.existsSync(imgPath)) {
    console.error(`[Assembly] ERROR: Missing scene image ${imgPath}`);
    process.exit(1);
  }
  totalFrames += scene.frames;
  const durationSec = (scene.frames / 60).toFixed(2);
  console.log(`  [OK] ${scene.id} (${scene.act}): ${scene.image} [${scene.frames} frames, ${durationSec}s]`);
}

const totalDurationSec = (totalFrames / 60).toFixed(2);
console.log(`[Assembly] Total Planned Frames: ${totalFrames} frames`);
console.log(`[Assembly] Total Planned Duration: ${totalDurationSec} seconds (Target: 40.00s)`);
if (totalFrames !== 2400) {
  console.error(`[Assembly] FATAL: Total frames ${totalFrames} does not equal 2400 (40.00s)!`);
  process.exit(1);
}

// Step 1: Render individual video segments
console.log('\n[Assembly] ========================================');
console.log('[Assembly] Step 1: Rendering Animated Video Segments');
console.log('[Assembly] ========================================');

const segmentFiles = [];
const startTimeAll = Date.now();

for (let i = 0; i < SCENE_DEFINITIONS.length; i++) {
  const scene = SCENE_DEFINITIONS[i];
  const imgPath = path.resolve(scenesDirPath, scene.image).replace(/\\/g, '/');
  const segOutFile = path.resolve(tempBuildDir, `${scene.id}.mp4`).replace(/\\/g, '/');
  segmentFiles.push(segOutFile);

  if (!forceRebuild && fs.existsSync(segOutFile) && fs.statSync(segOutFile).size > 50000) {
    console.log(`[Assembly] [${i + 1}/${SCENE_DEFINITIONS.length}] ${scene.id} already exists (${(fs.statSync(segOutFile).size / 1024).toFixed(0)} KB) -> Skipping render.`);
    continue;
  }

  console.log(`\n[Assembly] Rendering [${i + 1}/${SCENE_DEFINITIONS.length}]: ${scene.id} (${(scene.frames / 60).toFixed(2)}s)...`);
  console.log(`  Act: ${scene.act}`);
  console.log(`  Description: ${scene.desc}`);

  // Build filtergraph: zoompan -> overlays -> format=yuv420p
  const filterParts = [scene.zoompan];
  if (scene.overlays && scene.overlays.length > 0) {
    filterParts.push(...scene.overlays);
  }
  filterParts.push('format=yuv420p');

  const filterGraph = filterParts.join(',');

  const ffmpegArgs = [
    '-v', 'warning',
    '-y',
    '-i', imgPath,
    '-vf', filterGraph,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-r', '60',
    segOutFile
  ];

  const segStart = Date.now();
  const res = spawnSync('ffmpeg', ffmpegArgs, { stdio: ['inherit', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    console.error(`[Assembly] ERROR rendering ${scene.id}:`);
    console.error(res.stderr.toString());
    process.exit(1);
  }
  const segElapsed = ((Date.now() - segStart) / 1000).toFixed(1);
  console.log(`  Rendered in ${segElapsed}s -> ${segOutFile}`);
}

const renderElapsed = ((Date.now() - startTimeAll) / 1000).toFixed(1);
console.log(`\n[Assembly] All 13 video segments rendered successfully in ${renderElapsed}s.`);

// Step 2: Concatenate segments
console.log('\n[Assembly] ========================================');
console.log('[Assembly] Step 2: Concatenating Video Segments');
console.log('[Assembly] ========================================');

const concatListFile = path.resolve(tempBuildDir, 'concat_list.txt');
const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
fs.writeFileSync(concatListFile, concatContent, 'utf8');

const rawMergedVideo = path.resolve(tempBuildDir, 'video_no_audio.mp4').replace(/\\/g, '/');

const concatArgs = [
  '-v', 'warning',
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatListFile.replace(/\\/g, '/'),
  '-c', 'copy',
  rawMergedVideo
];

console.log('[Assembly] Executing concat demuxer...');
const concatRes = spawnSync('ffmpeg', concatArgs, { stdio: ['inherit', 'pipe', 'pipe'] });
if (concatRes.status !== 0) {
  console.error('[Assembly] ERROR in concat demuxer:');
  console.error(concatRes.stderr.toString());
  process.exit(1);
}
console.log(`[Assembly] Concat completed -> ${rawMergedVideo}`);

// Step 3: Mux with 40.00s Audio Track
console.log('\n[Assembly] ========================================');
console.log('[Assembly] Step 3: Audio Muxing & Final Mastering');
console.log('[Assembly] ========================================');

const audioNormalizedPath = audioTrackPath.replace(/\\/g, '/');
const outputNormalizedPath = outputVideoPath.replace(/\\/g, '/');

const muxArgs = [
  '-v', 'warning',
  '-y',
  '-i', rawMergedVideo,
  '-i', audioNormalizedPath,
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ar', '48000',
  '-movflags', '+faststart',
  outputNormalizedPath
];

console.log(`[Assembly] Muxing video with audio track (${audioNormalizedPath})...`);
const muxRes = spawnSync('ffmpeg', muxArgs, { stdio: ['inherit', 'pipe', 'pipe'] });
if (muxRes.status !== 0) {
  console.error('[Assembly] ERROR in audio muxing:');
  console.error(muxRes.stderr.toString());
  process.exit(1);
}
console.log(`[Assembly] SUCCESS! Master trailer rendered to:\n  ${outputNormalizedPath}`);

// Step 4: Copy to brain/user artifacts directory if available
const brainDir = 'C:/Users/indra/.gemini/antigravity/brain/7842554f-024c-43c8-b841-99760e450442';
if (fs.existsSync(brainDir)) {
  const artifactTarget = path.resolve(brainDir, 'tap_intro_trailer.mp4');
  try {
    fs.copyFileSync(outputVideoPath, artifactTarget);
    console.log(`[Assembly] Copied master artifact to brain directory:\n  ${artifactTarget}`);
  } catch (err) {
    console.warn(`[Assembly] Warning: Could not copy to brain dir: ${err.message}`);
  }
}

// Step 5: Independent Verification via ffprobe
console.log('\n[Assembly] ========================================');
console.log('[Assembly] Step 5: Verification via FFprobe');
console.log('[Assembly] ========================================');

const probeCmd = `ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels -of default=noprint_wrappers=1 "${outputNormalizedPath}"`;
const probeOutput = execSync(probeCmd).toString().trim();
console.log('[Assembly] Verbatim Probe Output:\n' + probeOutput);

console.log('\n================================================================');
console.log('$TAP SOLANA ARCADE // TRAILER ASSEMBLY COMPLETE (60 FPS / 1080P)');
console.log('================================================================');
