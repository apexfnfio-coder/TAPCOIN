#!/usr/bin/env node
/**
 * scripts/synthesize-trailer-audio.mjs
 * 
 * Procedural Chiptune Audio Synthesizer for $TAP Solana Arcade Cinematic Trailer.
 * Generates broadcast-quality 40.00-second 48 kHz 16-bit Stereo PCM WAV file.
 * 
 * 100% pure Node.js mathematical digital signal processing (DSP) based on src/lib/sound.ts.
 * Zero external audio libraries or pre-recorded audio assets required.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments
const args = process.argv.slice(2);
let durationSec = 40.0;
let sampleRate = 48000;
let outputPath = path.resolve(__dirname, '../public/assets/media/tap_trailer_audio.wav');

for (const arg of args) {
  if (arg.startsWith('--duration=')) {
    durationSec = parseFloat(arg.split('=')[1]);
  } else if (arg.startsWith('--output=')) {
    outputPath = path.resolve(process.cwd(), arg.split('=')[1]);
  } else if (arg.startsWith('--sampleRate=')) {
    sampleRate = parseInt(arg.split('=')[1], 10);
  }
}

console.log(`[AudioSynth] Target Duration: ${durationSec.toFixed(2)}s`);
console.log(`[AudioSynth] Sample Rate: ${sampleRate} Hz`);
console.log(`[AudioSynth] Output File: ${outputPath}`);

// Constants from src/lib/sound.ts
const LEAD_PATTERN = [
  440.00,  // step 0: A4
  523.25,  // step 1: C5
  659.25,  // step 2: E5
  880.00,  // step 3: A5
  783.99,  // step 4: G5
  659.25,  // step 5: E5
  523.25,  // step 6: C5
  587.33,  // step 7: D5
  659.25,  // step 8: E5
  783.99,  // step 9: G5
  880.00,  // step 10: A5
  1046.50, // step 11: C6
  880.00,  // step 12: A5
  659.25,  // step 13: E5
  587.33,  // step 14: D5
  523.25,  // step 15: C5
];

const BASS_PATTERN = [
  110.00, // step 0: A2
  null,   // step 1
  110.00, // step 2: A2
  130.81, // step 3: C3
  146.83, // step 4: D3
  null,   // step 5
  164.81, // step 6: E3
  null,   // step 7
  130.81, // step 8: C3
  null,   // step 9
  146.83, // step 10: D3
  164.81, // step 11: E3
  98.00,  // step 12: G2
  null,   // step 13
  110.00, // step 14: A2
  130.81, // step 15: C3
];

const PENTATONIC_SCALE = [
  880.00,  // A5
  1046.50, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
  1760.00, // A6
  2093.00, // C7
  2349.32, // D7
];

const BGM_GAIN = 0.35;
const SFX_GAIN = 0.65;
const MASTER_GAIN = 0.80;

const TOTAL_SAMPLES = Math.round(durationSec * sampleRate);
const masterBufferL = new Float64Array(TOTAL_SAMPLES);
const masterBufferR = new Float64Array(TOTAL_SAMPLES);

// PRNG for repeatable noise synthesis
let rngSeed = 42069;
function pseudoRandom() {
  rngSeed = (rngSeed * 1664525 + 1013904223) % 4294967296;
  return rngSeed / 4294967296;
}

// 1-second white noise buffer matching sound.ts:120-135
const NOISE_BUFFER_SIZE = sampleRate;
const noiseBuffer = new Float32Array(NOISE_BUFFER_SIZE);
for (let i = 0; i < NOISE_BUFFER_SIZE; i++) {
  noiseBuffer[i] = pseudoRandom() * 2 - 1;
}

// Biquad Filter (Cookbook implementation matching Web Audio API)
class BiquadFilter {
  constructor(type, freq, Q = 1.0, sRate = sampleRate) {
    this.type = type;
    this.freq = freq;
    this.Q = Q;
    this.sampleRate = sRate;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.calcCoeffs();
  }

  calcCoeffs() {
    const w0 = 2 * Math.PI * Math.min(this.freq, this.sampleRate * 0.49) / this.sampleRate;
    const sinW = Math.sin(w0);
    const cosW = Math.cos(w0);
    const alpha = sinW / (2 * this.Q);

    let b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

    if (this.type === 'highpass') {
      b0 = (1 + cosW) / 2;
      b1 = -(1 + cosW);
      b2 = (1 + cosW) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else if (this.type === 'bandpass') {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else if (this.type === 'lowpass') {
      b0 = (1 - cosW) / 2;
      b1 = 1 - cosW;
      b2 = (1 - cosW) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    }

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/**
 * Mix an audio chunk into master buffers with stereo panning.
 * pan: -1.0 (hard left) to +1.0 (hard right), 0.0 (center)
 */
function mixChunk(startSample, length, sampleGenerator, pan = 0.0) {
  const panClamped = Math.max(-1.0, Math.min(1.0, pan));
  // Constant power panning
  const angle = (panClamped + 1) * Math.PI / 4;
  const gainL = Math.cos(angle);
  const gainR = Math.sin(angle);

  const end = Math.min(TOTAL_SAMPLES, startSample + length);
  for (let i = startSample; i < end; i++) {
    const t = (i - startSample) / sampleRate;
    const s = sampleGenerator(t, i - startSample);
    masterBufferL[i] += s * gainL;
    masterBufferR[i] += s * gainR;
  }
}

// -------------------------------------------------------------
// INSTRUMENT VOICE SYNTHESIS (matching sound.ts)
// -------------------------------------------------------------

/**
 * Voice 1: Square Lead (Arpeggio melody)
 * Snappy 8-bit square wave with linear attack and exponential decay
 */
function renderLead(startTime, freq, duration, pan = 0.0) {
  const startSample = Math.round(startTime * sampleRate);
  const gateTime = duration * 0.75;
  const totalLen = gateTime + 0.01;
  const lengthSamples = Math.round(totalLen * sampleRate);

  const netGain = BGM_GAIN * MASTER_GAIN;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > gateTime) return 0;
    // Envelope: linear attack to 0.12 in 6ms, stay 0.09 until gateTime*0.6, exp decay to 0.001
    let env = 0.001;
    if (t <= 0.006) {
      env = 0.001 + (0.12 - 0.001) * (t / 0.006);
    } else if (t <= gateTime * 0.6) {
      env = 0.09;
    } else {
      const p = (t - gateTime * 0.6) / (gateTime * 0.4);
      env = 0.09 * Math.pow(0.001 / 0.09, Math.min(1.0, p));
    }

    phase += freq / sampleRate;
    const wave = (phase % 1.0 < 0.5) ? 1.0 : -1.0;
    return wave * env * netGain;
  }, pan);
}

/**
 * Voice 2: Triangle Bass (Walking bassline)
 * Warm retro triangle walking bass with 8ms attack and exponential release
 */
function renderBass(startTime, freq, duration, pan = 0.0) {
  const startSample = Math.round(startTime * sampleRate);
  const gateTime = duration * 0.85;
  const totalLen = gateTime + 0.01;
  const lengthSamples = Math.round(totalLen * sampleRate);

  const netGain = BGM_GAIN * MASTER_GAIN;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > gateTime) return 0;
    // Envelope: linear ramp 0.001 -> 0.22 in 8ms, exp ramp to 0.01 at gateTime
    let env = 0.001;
    if (t <= 0.008) {
      env = 0.001 + (0.22 - 0.001) * (t / 0.008);
    } else {
      const p = (t - 0.008) / (gateTime - 0.008);
      env = 0.22 * Math.pow(0.01 / 0.22, Math.min(1.0, p));
    }

    phase += freq / sampleRate;
    const normPhase = phase % 1.0;
    const wave = 4.0 * Math.abs(normPhase - 0.5) - 1.0;
    return wave * env * netGain;
  }, pan);
}

/**
 * Voice 3: Swept Kick
 * Triangle wave 130 Hz downward drop to 32 Hz over 0.08s
 */
function renderKick(startTime, pan = 0.0) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.085;
  const lengthSamples = Math.round(totalLen * sampleRate);

  const netGain = BGM_GAIN * MASTER_GAIN;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > totalLen) return 0;
    // Frequency exponential drop from 130 to 32 over 0.08s
    const f = 130 * Math.pow(32 / 130, Math.min(1.0, t / 0.08));
    phase += f / sampleRate;
    const normPhase = phase % 1.0;
    const wave = 4.0 * Math.abs(normPhase - 0.5) - 1.0;

    // Gain 0.3 decaying exp to 0.001 at 0.085s
    const env = 0.3 * Math.pow(0.001 / 0.3, Math.min(1.0, t / 0.085));
    return wave * env * netGain;
  }, pan);
}

/**
 * Voice 3: Hi-Hat
 * Highpassed white noise at 7500 Hz
 */
function renderHiHat(startTime, accent = false, pan = 0.25) {
  const startSample = Math.round(startTime * sampleRate);
  const vol = accent ? 0.12 : 0.07;
  const decay = accent ? 0.06 : 0.035;
  const totalLen = decay + 0.01;
  const lengthSamples = Math.round(totalLen * sampleRate);

  const filter = new BiquadFilter('highpass', 7500, 1.0, sampleRate);
  const netGain = BGM_GAIN * MASTER_GAIN;

  let noiseOffset = Math.floor(startTime * 1337) % NOISE_BUFFER_SIZE;

  mixChunk(startSample, lengthSamples, (t, sampleIdx) => {
    if (t > decay) return 0;
    const rawNoise = noiseBuffer[(noiseOffset + sampleIdx) % NOISE_BUFFER_SIZE];
    const filtered = filter.process(rawNoise);
    const env = vol * Math.pow(0.001 / vol, Math.min(1.0, t / decay));
    return filtered * env * netGain;
  }, pan);
}

/**
 * Voice 3: Snare
 * Bandpassed noise at 2200 Hz (Q=1.2) + triangle body swept 200->80 Hz
 */
function renderSnare(startTime, pan = -0.1) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.11;
  const lengthSamples = Math.round(totalLen * sampleRate);

  const filter = new BiquadFilter('bandpass', 2200, 1.2, sampleRate);
  const netGain = BGM_GAIN * MASTER_GAIN;

  let bodyPhase = 0;
  let noiseOffset = Math.floor(startTime * 2718) % NOISE_BUFFER_SIZE;

  mixChunk(startSample, lengthSamples, (t, sampleIdx) => {
    // Noise crack
    let noiseVal = 0;
    if (t <= 0.10) {
      const rawNoise = noiseBuffer[(noiseOffset + sampleIdx) % NOISE_BUFFER_SIZE];
      const filtered = filter.process(rawNoise);
      const noiseEnv = 0.18 * Math.pow(0.001 / 0.18, Math.min(1.0, t / 0.10));
      noiseVal = filtered * noiseEnv;
    }

    // Body tone
    let bodyVal = 0;
    if (t <= 0.07) {
      const bf = 200 * Math.pow(80 / 200, Math.min(1.0, t / 0.07));
      bodyPhase += bf / sampleRate;
      const wave = 4.0 * Math.abs((bodyPhase % 1.0) - 0.5) - 1.0;
      const bodyEnv = 0.15 * Math.pow(0.001 / 0.15, Math.min(1.0, t / 0.07));
      bodyVal = wave * bodyEnv;
    }

    return (noiseVal + bodyVal) * netGain;
  }, pan);
}

// -------------------------------------------------------------
// SFX PROCEDURAL SYNTHESIS (matching sound.ts)
// -------------------------------------------------------------

/**
 * Tree chop sound (playChop in sound.ts)
 * Triangle wave 140 Hz downward drop to 38 Hz in 0.08s, gain 0.35 -> 0.01
 */
function renderChop(startTime, boost = 1.0, pan = 0.0) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.085;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * boost;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.08) return 0;
    const f = 140 * Math.pow(38 / 140, Math.min(1.0, t / 0.08));
    phase += f / sampleRate;
    const norm = phase % 1.0;
    const wave = 4.0 * Math.abs(norm - 0.5) - 1.0;
    const env = 0.35 * Math.pow(0.01 / 0.35, Math.min(1.0, t / 0.08));
    return wave * env * netGain;
  }, pan);
}

/**
 * Heavy tree felling impact for Act 4 clear
 */
function renderHeavyFellChop(startTime, pan = 0.0) {
  renderChop(startTime, 1.4, pan);
  // Reinforced deep sub-bass body thump
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.22;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.45;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.20) return 0;
    const f = 90 * Math.pow(26 / 90, Math.min(1.0, t / 0.20));
    phase += f / sampleRate;
    const wave = Math.sin(2 * Math.PI * phase);
    const env = 0.5 * Math.pow(0.001 / 0.5, Math.min(1.0, t / 0.20));
    return wave * env * netGain;
  }, pan);
}

/**
 * Green candle collect (playGreen in sound.ts)
 * Pentatonic pitch scaling + sparkle fanfare on combo >= 5
 */
function renderGreen(startTime, combo = 1, pan = 0.0) {
  const startSample = Math.round(startTime * sampleRate);
  const safeCombo = typeof combo === 'number' && combo > 0 ? combo : 1;
  const noteIdx = Math.min(Math.max(0, safeCombo - 1), PENTATONIC_SCALE.length - 1);
  const baseFreq = PENTATONIC_SCALE[noteIdx];

  const totalLen = 0.23;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN;

  let osc1Phase = 0;
  let osc2Phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.22) return 0;
    // Osc1: sine swept from baseFreq * 0.75 to baseFreq over 0.04s
    const f1 = (t <= 0.04) 
      ? baseFreq * 0.75 * Math.pow(1 / 0.75, t / 0.04)
      : baseFreq;
    osc1Phase += f1 / sampleRate;
    const s1 = Math.sin(2 * Math.PI * osc1Phase);

    // Osc2: triangle at baseFreq * 1.5 starting at t = 0.03
    let s2 = 0;
    if (t >= 0.03) {
      osc2Phase += (baseFreq * 1.5) / sampleRate;
      s2 = 4.0 * Math.abs((osc2Phase % 1.0) - 0.5) - 1.0;
    }

    const env = 0.22 * Math.pow(0.01 / 0.22, Math.min(1.0, t / 0.22));
    return (s1 + s2) * env * netGain;
  }, pan);

  // Fanfare flourish on combo >= 5 (ascending celebratory multi-tone sparkle arpeggio)
  if (safeCombo >= 5) {
    const flourishNotes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
    flourishNotes.forEach((freq, idx) => {
      const noteTime = startTime + 0.05 + idx * 0.045;
      const nSample = Math.round(noteTime * sampleRate);
      const fLen = Math.round(0.13 * sampleRate);
      let fPhase = 0;

      const spreadPan = (idx % 2 === 0) ? -0.3 : 0.3;

      mixChunk(nSample, fLen, (t) => {
        if (t > 0.12) return 0;
        fPhase += freq / sampleRate;
        const s = Math.sin(2 * Math.PI * fPhase);
        const env = 0.12 * Math.pow(0.001 / 0.12, Math.min(1.0, t / 0.12));
        return s * env * netGain;
      }, spreadPan);
    });
  }
}

/**
 * Jump leap sound (playJump in sound.ts)
 * Sine wave 180 Hz to 460 Hz in 0.16s, gain 0.24 -> 0.01
 */
function renderJump(startTime, pan = -0.1) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.18;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.16) return 0;
    const f = 180 * Math.pow(460 / 180, Math.min(1.0, t / 0.16));
    phase += f / sampleRate;
    const s = Math.sin(2 * Math.PI * phase);
    const env = 0.24 * Math.pow(0.01 / 0.24, Math.min(1.0, t / 0.16));
    return s * env * netGain;
  }, pan);
}

/**
 * UI button click (playClick in sound.ts)
 * Sine wave 900 Hz to 450 Hz in 0.04s, gain 0.12 -> 0.01
 */
function renderClick(startTime, pan = 0.15) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.045;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.04) return 0;
    const f = 900 * Math.pow(450 / 900, Math.min(1.0, t / 0.04));
    phase += f / sampleRate;
    const s = Math.sin(2 * Math.PI * phase);
    const env = 0.12 * Math.pow(0.01 / 0.12, Math.min(1.0, t / 0.04));
    return s * env * netGain;
  }, pan);
}

/**
 * Level cleared / Victory fanfare (playLevelUp in sound.ts)
 * 4-note A major ascending arpeggio [440, 554.37, 659.25, 880] spaced 80ms
 */
function renderLevelUp(startTime) {
  const notes = [440, 554.37, 659.25, 880];
  const netGain = SFX_GAIN * MASTER_GAIN;

  notes.forEach((freq, idx) => {
    const noteTime = startTime + idx * 0.08;
    const startSample = Math.round(noteTime * sampleRate);
    const totalLen = 0.22;
    const lengthSamples = Math.round(totalLen * sampleRate);
    const pan = (idx % 2 === 0) ? -0.2 : 0.2;
    let phase = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > 0.20) return 0;
      phase += freq / sampleRate;
      const s = Math.sin(2 * Math.PI * phase);
      const env = 0.25 * Math.pow(0.01 / 0.25, Math.min(1.0, t / 0.20));
      return s * env * netGain;
    }, pan);
  });
}

/**
 * Arcade Power-On Chirp (Act 1 start)
 * Fast upward chirp 440 Hz -> 880 Hz
 */
function renderPowerOnChirp(startTime) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.25;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.8;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.22) return 0;
    const f = 440 * Math.pow(880 / 440, Math.min(1.0, t / 0.22));
    phase += f / sampleRate;
    const s = Math.sin(2 * Math.PI * phase);
    const env = 0.3 * Math.pow(0.001 / 0.3, Math.min(1.0, t / 0.22));
    return s * env * netGain;
  }, 0.0);
}

/**
 * Terminal UI Focus Chime (Act 1: 3.5s)
 */
function renderTerminalChime(startTime) {
  const notes = [659.25, 880, 1046.50];
  const netGain = SFX_GAIN * MASTER_GAIN * 0.7;

  notes.forEach((freq, idx) => {
    const noteTime = startTime + idx * 0.05;
    const startSample = Math.round(noteTime * sampleRate);
    const totalLen = 0.20;
    const lengthSamples = Math.round(totalLen * sampleRate);
    let phase = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > 0.18) return 0;
      phase += freq / sampleRate;
      const s = Math.sin(2 * Math.PI * phase);
      const env = 0.18 * Math.pow(0.001 / 0.18, Math.min(1.0, t / 0.18));
      return s * env * netGain;
    }, (idx - 1) * 0.2);
  });
}

/**
 * Gasless Auth Crystal Chime (Act 2: 8.0s)
 */
function renderGaslessAuthChime(startTime) {
  renderGreen(startTime, 1, 0.0);
  // Layer crystal harmonic resonance
  const startSample = Math.round((startTime + 0.05) * sampleRate);
  const totalLen = 0.35;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.6;
  let phase1 = 0, phase2 = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.32) return 0;
    phase1 += 1318.51 / sampleRate;
    phase2 += 1760.00 / sampleRate;
    const s = Math.sin(2 * Math.PI * phase1) * 0.6 + Math.sin(2 * Math.PI * phase2) * 0.4;
    const env = 0.25 * Math.pow(0.001 / 0.25, Math.min(1.0, t / 0.32));
    return s * env * netGain;
  }, 0.2);
}

/**
 * Rat Stomp Combo Sound (Act 3: 13.4s)
 * Rebound jump + +10 STOMP chime + punchy impact thud
 */
function renderRatStomp(startTime) {
  renderJump(startTime, -0.15);
  renderGreen(startTime + 0.02, 2, 0.15);

  // Low punchy stomp thud
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.12;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.6;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.10) return 0;
    const f = 160 * Math.pow(45 / 160, Math.min(1.0, t / 0.10));
    phase += f / sampleRate;
    const norm = phase % 1.0;
    const wave = 4.0 * Math.abs(norm - 0.5) - 1.0;
    const env = 0.4 * Math.pow(0.001 / 0.4, Math.min(1.0, t / 0.10));
    return wave * env * netGain;
  }, 0.0);
}

/**
 * Bear Counter-Hit Spark Crack (Act 3: 16.2s)
 * Axe chop + electric spark crackle burst
 */
function renderCounterHitSpark(startTime) {
  renderChop(startTime, 1.2, -0.1);

  // Electric spark crackle burst (highpassed noise + resonant tick)
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.09;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const filter = new BiquadFilter('highpass', 6000, 2.5, sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.8;
  let tickPhase = 0;

  mixChunk(startSample, lengthSamples, (t, sampleIdx) => {
    if (t > 0.08) return 0;
    const rawNoise = noiseBuffer[sampleIdx % NOISE_BUFFER_SIZE];
    const filtered = filter.process(rawNoise);

    const f = 2400 * Math.pow(1200 / 2400, Math.min(1.0, t / 0.08));
    tickPhase += f / sampleRate;
    const tick = Math.sin(2 * Math.PI * tickPhase);

    const env = 0.35 * Math.pow(0.001 / 0.35, Math.min(1.0, t / 0.08));
    return (filtered * 0.7 + tick * 0.3) * env * netGain;
  }, 0.2);
}

/**
 * Bear Defeat Celebration (Act 3: 17.4s)
 * Heavy impact + BEAR REKT combo fanfare + 3 green pump candle pings
 */
function renderBearDefeat(startTime) {
  renderChop(startTime, 1.3, 0.0);
  renderGreen(startTime + 0.05, 4, -0.2);
  // 3 green pump candle pings popping in an arc
  renderGreen(startTime + 0.18, 5, 0.25);
  renderGreen(startTime + 0.30, 6, -0.25);
  renderGreen(startTime + 0.42, 7, 0.35);
}

/**
 * Hurry-Up Tension Alert Beep (Act 3: 18.0s)
 * Dual urgent arcade chime pulses as tempo accelerates
 */
function renderHurryUpAlert(startTime) {
  const pulses = [0.0, 0.08];
  const netGain = SFX_GAIN * MASTER_GAIN * 0.75;

  pulses.forEach(offset => {
    const pTime = startTime + offset;
    const startSample = Math.round(pTime * sampleRate);
    const totalLen = 0.07;
    const lengthSamples = Math.round(totalLen * sampleRate);
    let phase1 = 0, phase2 = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > 0.06) return 0;
      phase1 += 987.77 / sampleRate;  // B5
      phase2 += 1318.51 / sampleRate; // E6
      const wave = ((phase1 % 1.0 < 0.5 ? 1 : -1) + (phase2 % 1.0 < 0.5 ? 1 : -1)) * 0.5;
      const env = 0.25 * Math.pow(0.001 / 0.25, Math.min(1.0, t / 0.06));
      return wave * env * netGain;
    }, 0.0);
  });
}

/**
 * Solana Bull Green shimmer sound (Act 4: 23.5s)
 * Ascending sparkling crystal tones
 */
function renderBullGreenShimmer(startTime) {
  const notes = [880, 1108.73, 1318.51, 1760, 2217.46];
  const netGain = SFX_GAIN * MASTER_GAIN * 0.65;

  notes.forEach((freq, idx) => {
    const noteTime = startTime + idx * 0.06;
    const startSample = Math.round(noteTime * sampleRate);
    const totalLen = 0.25;
    const lengthSamples = Math.round(totalLen * sampleRate);
    const pan = ((idx % 2 === 0) ? -1 : 1) * (0.2 + idx * 0.08);
    let phase = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > 0.22) return 0;
      phase += freq / sampleRate;
      const s = Math.sin(2 * Math.PI * phase);
      const env = 0.2 * Math.pow(0.001 / 0.2, Math.min(1.0, t / 0.22));
      return s * env * netGain;
    }, pan);
  });
}

/**
 * ATH score flex cascade (Act 5: 28.2s)
 * Rapid ascending 8-note pentatonic sparkles
 */
function renderAthCascade(startTime) {
  PENTATONIC_SCALE.forEach((freq, idx) => {
    const noteTime = startTime + idx * 0.065;
    renderGreen(noteTime, idx + 1, ((idx % 2 === 0) ? -0.3 : 0.3));
  });
}

/**
 * Bear Guttural Roar (Act 5: 20.4s)
 * Thick guttural throat growl with 28 Hz flutter and bandpass formant filter
 */
function renderBearRoar(startTime) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.55;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const filter = new BiquadFilter('bandpass', 680, 2.2, sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.95;

  let osc1Phase = 0, osc2Phase = 0, lfoPhase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.52) return 0;
    lfoPhase += 28 / sampleRate;
    const lfo = Math.sin(2 * Math.PI * lfoPhase) * 38;

    let f1 = (t <= 0.15) ? (240 - (60 * (t / 0.15))) : (180 - (65 * ((t - 0.15) / 0.37)));
    let f2 = (t <= 0.15) ? (252 - (64 * (t / 0.15))) : (188 - (70 * ((t - 0.15) / 0.37)));
    f1 = Math.max(60, f1 + lfo);
    f2 = Math.max(60, f2 + lfo);

    osc1Phase += f1 / sampleRate;
    osc2Phase += f2 / sampleRate;

    const saw1 = 2 * (osc1Phase % 1.0) - 1.0;
    const saw2 = 2 * (osc2Phase % 1.0) - 1.0;
    const filtered = filter.process((saw1 + saw2) * 0.5);

    let env = 0.01;
    if (t <= 0.06) {
      env = 0.01 + (0.65 - 0.01) * (t / 0.06);
    } else if (t <= 0.28) {
      env = 0.65 - (0.10 * ((t - 0.06) / 0.22));
    } else {
      env = 0.55 * Math.pow(0.01 / 0.55, (t - 0.28) / 0.24);
    }

    return filtered * env * netGain;
  }, -0.15);
}

/**
 * Bear Claw Slash / Attack (Act 5: 21.5s)
 * Heavy paw whoosh + multi-talon razor friction tear + snarl
 */
function renderBearAttack(startTime) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.28;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const bpFilter = new BiquadFilter('bandpass', 850, 1.6, sampleRate);
  const hpFilter = new BiquadFilter('highpass', 2200, 2.0, sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.9;

  let snarlPhase = 0, lfoPhase = 0;

  mixChunk(startSample, lengthSamples, (t, sIdx) => {
    if (t > 0.25) return 0;
    const rawNoise = noiseBuffer[sIdx % NOISE_BUFFER_SIZE];
    const whoosh = bpFilter.process(rawNoise);
    const tear = hpFilter.process(rawNoise);

    lfoPhase += 30 / sampleRate;
    const lfo = Math.sin(2 * Math.PI * lfoPhase) * 45;
    const fSnarl = Math.max(50, 360 * Math.pow(120 / 360, t / 0.25) + lfo);
    snarlPhase += fSnarl / sampleRate;
    const snarlSaw = 2 * (snarlPhase % 1.0) - 1.0;

    let envWhoosh = (t <= 0.06) ? (t / 0.06) : Math.pow(0.001, (t - 0.06) / 0.19);
    let envTear = (t <= 0.07) ? (t / 0.07) : Math.pow(0.001, (t - 0.07) / 0.18);
    let envSnarl = (t <= 0.04) ? (t / 0.04) : Math.pow(0.01, (t - 0.04) / 0.21);

    const out = (whoosh * envWhoosh * 0.5) + (tear * envTear * 0.45) + (snarlSaw * envSnarl * 0.35);
    return out * netGain;
  }, 0.2);
}

/**
 * Crate Break / Shatter (Act 4: 17.5s)
 * Loud splintering wood fracture + snap pop
 */
function renderCrateBreak(startTime) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.22;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const filter = new BiquadFilter('bandpass', 950, 1.8, sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.85;

  let popPhase = 0;

  mixChunk(startSample, lengthSamples, (t, sIdx) => {
    if (t > 0.20) return 0;
    const rawNoise = noiseBuffer[sIdx % NOISE_BUFFER_SIZE];
    const woodSplinter = filter.process(rawNoise);

    const f = 220 * Math.pow(40 / 220, Math.min(1.0, t / 0.10));
    popPhase += f / sampleRate;
    const pop = (popPhase % 1.0 < 0.5) ? 1.0 : -1.0;

    const envSplinter = 0.35 * Math.pow(0.001 / 0.35, Math.min(1.0, t / 0.18));
    const envPop = 0.30 * Math.pow(0.01 / 0.30, Math.min(1.0, t / 0.10));

    return (woodSplinter * envSplinter + pop * envPop) * netGain;
  }, 0.1);
}

/**
 * Shield Forcefield Activation Chime (Act 4: 17.9s)
 */
function renderShieldCollect(startTime) {
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.28;
  const lengthSamples = Math.round(totalLen * sampleRate);
  const netGain = SFX_GAIN * MASTER_GAIN * 0.7;
  let phase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.26) return 0;
    const f = 320 * Math.pow(740 / 320, Math.min(1.0, t / 0.18));
    phase += f / sampleRate;
    const norm = phase % 1.0;
    const wave = 4.0 * Math.abs(norm - 0.5) - 1.0;
    const env = 0.28 * Math.pow(0.01 / 0.28, Math.min(1.0, t / 0.26));
    return wave * env * netGain;
  }, -0.2);
}

/**
 * Heart Celestial Healing Chime (Act 4: 18.5s)
 */
function renderHeartCollect(startTime) {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const netGain = SFX_GAIN * MASTER_GAIN * 0.65;

  notes.forEach((freq, idx) => {
    const noteTime = startTime + idx * 0.05;
    const startSample = Math.round(noteTime * sampleRate);
    const totalLen = 0.22;
    const lengthSamples = Math.round(totalLen * sampleRate);
    let phase = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > 0.20) return 0;
      phase += freq / sampleRate;
      const s = Math.sin(2 * Math.PI * phase);
      const env = 0.24 * Math.pow(0.001 / 0.24, Math.min(1.0, t / 0.18));
      return s * env * netGain;
    }, (idx % 2 === 0 ? -0.2 : 0.2));
  });
}

/**
 * Rank #1 Podium Unlock Chime (Act 5: 32.0s)
 */
function renderRank1Unlock(startTime) {
  renderGreen(startTime, 8, 0.0);
  // Celebratory 4-note high sparkle arpeggio
  const sparkles = [2349.32, 2936.65, 3520.00, 4698.64];
  const netGain = SFX_GAIN * MASTER_GAIN * 0.55;

  sparkles.forEach((freq, idx) => {
    const sTime = startTime + 0.12 + idx * 0.055;
    const startSample = Math.round(sTime * sampleRate);
    const totalLen = 0.20;
    const lengthSamples = Math.round(totalLen * sampleRate);
    const pan = (idx % 2 === 0) ? -0.25 : 0.25;
    let phase = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > 0.18) return 0;
      phase += freq / sampleRate;
      const s = Math.sin(2 * Math.PI * phase);
      const env = 0.16 * Math.pow(0.001 / 0.16, Math.min(1.0, t / 0.18));
      return s * env * netGain;
    }, pan);
  });
}

/**
 * Dev Wallet Prize Impact Chime (Act 6: 34.5s)
 * Warm golden chord with sub-bass impact
 */
function renderDevWalletPrize(startTime) {
  const chordNotes = [554.37, 880.00, 1318.51, 1760.00];
  const netGain = SFX_GAIN * MASTER_GAIN * 0.7;

  // Impact body
  const startSample = Math.round(startTime * sampleRate);
  const totalLen = 0.35;
  const lengthSamples = Math.round(totalLen * sampleRate);
  let bodyPhase = 0;

  mixChunk(startSample, lengthSamples, (t) => {
    if (t > 0.30) return 0;
    const f = 110 * Math.pow(40 / 110, Math.min(1.0, t / 0.30));
    bodyPhase += f / sampleRate;
    const s = Math.sin(2 * Math.PI * bodyPhase);
    const env = 0.4 * Math.pow(0.001 / 0.4, Math.min(1.0, t / 0.30));
    return s * env * netGain;
  }, 0.0);

  // Golden bell tones
  chordNotes.forEach((freq, idx) => {
    const cTime = startTime + idx * 0.02;
    const cStart = Math.round(cTime * sampleRate);
    const cLen = Math.round(0.65 * sampleRate);
    const pan = (idx % 2 === 0) ? -0.3 : 0.3;
    let phase = 0;

    mixChunk(cStart, cLen, (t) => {
      if (t > 0.60) return 0;
      phase += freq / sampleRate;
      const s = Math.sin(2 * Math.PI * phase);
      const env = 0.22 * Math.pow(0.001 / 0.22, Math.min(1.0, t / 0.60));
      return s * env * netGain;
    }, pan);
  });
}

/**
 * Grand Resolving Outro Cadence (Act 6: 37.0s - 40.0s)
 * Majestic A Major Chord with warm harmonics and exponential reverb tail
 */
function renderOutroCadence(startTime) {
  const chord = [
    { freq: 110.00, type: 'triangle', gain: 0.35, pan: 0.0 },   // A2
    { freq: 164.81, type: 'triangle', gain: 0.25, pan: -0.2 },  // E3
    { freq: 220.00, type: 'triangle', gain: 0.30, pan: 0.2 },   // A3
    { freq: 277.18, type: 'sine',     gain: 0.28, pan: -0.3 },  // C#4
    { freq: 329.63, type: 'sine',     gain: 0.25, pan: 0.3 },   // E4
    { freq: 440.00, type: 'square',   gain: 0.16, pan: -0.1 },  // A4
    { freq: 554.37, type: 'sine',     gain: 0.20, pan: 0.25 },  // C#5
    { freq: 659.25, type: 'sine',     gain: 0.18, pan: -0.25 }, // E5
    { freq: 880.00, type: 'sine',     gain: 0.15, pan: 0.0 },   // A5
  ];

  const duration = 2.8; // Until t = 39.8s
  const netGain = MASTER_GAIN * 0.9;

  chord.forEach(v => {
    const startSample = Math.round(startTime * sampleRate);
    const lengthSamples = Math.round(duration * sampleRate);
    let phase = 0;

    mixChunk(startSample, lengthSamples, (t) => {
      if (t > duration) return 0;
      phase += v.freq / sampleRate;

      let wave = 0;
      if (v.type === 'sine') {
        wave = Math.sin(2 * Math.PI * phase);
      } else if (v.type === 'triangle') {
        wave = 4.0 * Math.abs((phase % 1.0) - 0.5) - 1.0;
      } else if (v.type === 'square') {
        wave = (phase % 1.0 < 0.5) ? 1.0 : -1.0;
      }

      // Smooth attack 15ms, sustain until 1.5s, then long exponential release
      let env = 0;
      if (t <= 0.015) {
        env = (t / 0.015) * v.gain;
      } else if (t <= 1.5) {
        env = v.gain;
      } else {
        const p = (t - 1.5) / (duration - 1.5);
        env = v.gain * Math.pow(0.0001 / v.gain, Math.min(1.0, p));
      }

      return wave * env * netGain;
    }, v.pan);
  });
}

// -------------------------------------------------------------
// BGM SEQUENCER ENGINE
// -------------------------------------------------------------

console.log('[AudioSynth] Sequencer: Scheduling BGM notes & percussion...');

let currentTime = 0.0;
let currentStep = 0;

// Schedule full timeline
while (currentTime < durationSec) {
  // Determine current scene & tempo parameters:
  // Initial tempo: 132 BPM
  // Hurry-Up acceleration: 20.0s to 28.0s (Bear encounter, counter-hit parry & defeat celebration)
  // Outro cadence: 36.8s to 40.0s (Sequencer pauses, grand resolving A Major chord rings out)

  const isOutro = (currentTime >= 36.8);
  const isHurryUp = (currentTime >= 20.0 && currentTime < 28.0);

  const bpm = isHurryUp ? 176 : 132;
  const stepDuration = 60.0 / bpm / 4;

  if (isOutro) {
    // Stop sequencer during grand outro chord
    break;
  }

  // Lead enters at 2.5s and plays until outro
  const leadActive = (currentTime >= 2.5) && (currentTime < 36.8);

  // 1. Voice 1: Square Lead
  if (leadActive) {
    const leadFreq = isHurryUp ? LEAD_PATTERN[currentStep] * 2 : LEAD_PATTERN[currentStep];
    renderLead(currentTime, leadFreq, stepDuration, 0.0);
  }

  // 2. Voice 2: Triangle Bass
  const bassFreq = BASS_PATTERN[currentStep];
  if (bassFreq !== null && currentTime < 36.8) {
    renderBass(currentTime, bassFreq, stepDuration * 2, 0.0);
  }

  // 3. Voice 3: Percussion
  // Swept kick on steps 0, 4, 8, 12
  if (currentStep === 0 || currentStep === 4 || currentStep === 8 || currentStep === 12) {
    renderKick(currentTime, 0.0);
  }

  // Snare crack on steps 4, 12
  if (currentStep === 4 || currentStep === 12) {
    renderSnare(currentTime, -0.1);
  }

  // Hi-Hat
  if (currentStep === 2 || currentStep === 6 || currentStep === 10 || currentStep === 14) {
    renderHiHat(currentTime, currentStep === 14, 0.2);
  } else if (isHurryUp && currentStep % 2 === 1) {
    // 16th-note hi-hat drive in Hurry-Up mode
    renderHiHat(currentTime, false, 0.25);
  }

  currentTime += stepDuration;
  currentStep = (currentStep + 1) % 16;
}

// -------------------------------------------------------------
// SYNCHRONIZED STORYBOARD SFX CUES (All 14 Authentic Scenes)
// -------------------------------------------------------------

console.log('[AudioSynth] Scheduling synchronized SFX cues...');

// --- ACT 1: First Arrival (0.0s - 3.0s) ---
renderPowerOnChirp(0.00);      // Arcade power-on sweep
renderClick(1.50);             // Docked trollbox live chat tick
renderTerminalChime(2.40);     // Terminal UI focus chime

// --- ACT 2: Instant Wallet Connect (3.0s - 7.0s) ---
renderClick(3.20);             // Wallet modal popup click
renderClick(4.20);             // Phantom/Solflare badge select click
renderGaslessAuthChime(5.20);  // Instant gasless auth crystal chime
renderClick(6.60);             // Drop In Free Practice CTA click

// --- ACT 3: Core Run Mechanics (7.0s - 14.0s) ---
renderJump(7.10);              // Run start drop-in leap
renderChop(7.60);              // Timber chop 1 (+10 CHOP!)
renderChop(8.70);              // Timber chop 2
renderGreen(9.70, 1, -0.2);    // Green candle 1
renderGreen(10.15, 2, 0.2);    // Green candle 2
renderGreen(10.60, 3, -0.15);  // Green candle 3
renderGreen(11.05, 4, 0.15);   // Green candle 4
renderGreen(11.50, 5, 0.0);    // 5x STREAK God Candle flourish! 🔥
renderJump(12.30);             // Jump towards rat
renderRatStomp(12.80);         // Rat stomp rebound squash (+10 STOMP!)

// --- ACT 4: Platforming Hazards & Mystery Crates (14.0s - 20.0s) ---
renderJump(14.30);             // Chasm athletic leap whoosh
renderChop(15.60, 0.9);        // Heavy landing thock
renderChop(17.25);             // Axe strikes mystery crate
renderCrateBreak(17.50);       // Splintering wood crate shatter!
renderShieldCollect(17.90);    // Shield forcefield activation chime!
renderHeartCollect(18.60);     // Heart celestial healing chime (+1 Life!)

// --- ACT 5: Boss Combat & Acceleration (20.0s - 28.0s) ---
renderHurryUpAlert(20.00);     // Hurry-Up tension alert beep (176 BPM begins!)
renderBearRoar(20.40);         // Guttural bear throat roar
renderBearAttack(21.50);       // Bear paw claw slash whoosh & friction tear
renderCounterHitSpark(22.80);  // Axe parry COUNTER HIT! ⚡ spark bloom crack
renderBearDefeat(25.20);       // BEAR REKT! 🐻💥 defeat crash
renderGreen(25.60, 5, -0.25);  // Pump candle 1 drop
renderGreen(26.00, 6, 0.25);   // Pump candle 2 drop
renderGreen(26.40, 7, 0.0);    // Pump candle 3 drop

// --- ACT 6: Grand Finale — ATH Flex, Leaderboard & Official Token CA (28.0s - 40.0s) ---
renderAthCascade(28.30);       // ATH 42,069 score ascending pentatonic cascade
renderClick(31.80);            // Navigate to leaderboard
renderRank1Unlock(32.40);      // #1 ApexAdmin podium unlock chime & sparkle arpeggio
renderDevWalletPrize(36.20);   // 10% Dev Treasury Pool golden bell & sub-bass impact
renderClick(36.60);            // Token contract address copy click
renderOutroCadence(36.80);     // Resolving A Major chord cadence ringing out to 40.00s

// -------------------------------------------------------------
// POST-PROCESSING, LIMITING & WAV ENCODING
// -------------------------------------------------------------

console.log('[AudioSynth] Mastering: Applying soft-knee limiter & stereo balance...');

// Add stereo ping-pong / spatial bloom for tail
const delaySamplesL = Math.round(0.14 * sampleRate);
const delaySamplesR = Math.round(0.21 * sampleRate);
const delayFeedback = 0.22;

const tempL = new Float64Array(masterBufferL);
const tempR = new Float64Array(masterBufferR);

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  if (i >= delaySamplesL) {
    masterBufferL[i] += tempR[i - delaySamplesL] * delayFeedback;
  }
  if (i >= delaySamplesR) {
    masterBufferR[i] += tempL[i - delaySamplesR] * delayFeedback;
  }
}

// Fade in (0 to 5ms) and Fade out (39.8s to 40.0s)
const fadeInSamples = Math.round(0.005 * sampleRate);
const fadeOutStart = Math.round(39.80 * sampleRate);

for (let i = 0; i < fadeInSamples; i++) {
  const f = i / fadeInSamples;
  masterBufferL[i] *= f;
  masterBufferR[i] *= f;
}

for (let i = fadeOutStart; i < TOTAL_SAMPLES; i++) {
  const f = Math.max(0, 1.0 - (i - fadeOutStart) / (TOTAL_SAMPLES - fadeOutStart));
  masterBufferL[i] *= f;
  masterBufferR[i] *= f;
}

// Transparent soft limiter: tanh saturation
let peakBefore = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const absL = Math.abs(masterBufferL[i]);
  const absR = Math.abs(masterBufferR[i]);
  if (absL > peakBefore) peakBefore = absL;
  if (absR > peakBefore) peakBefore = absR;

  // Soft knee saturation
  masterBufferL[i] = Math.tanh(masterBufferL[i] * 0.85);
  masterBufferR[i] = Math.tanh(masterBufferR[i] * 0.85);
}

// Measure peak after soft limiter
let peakAfter = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const absL = Math.abs(masterBufferL[i]);
  const absR = Math.abs(masterBufferR[i]);
  if (absL > peakAfter) peakAfter = absL;
  if (absR > peakAfter) peakAfter = absR;
}

// Normalize true peak strictly to -0.3 dBFS (0.96605) to ensure <= -0.2 dBFS and <= -0.1 dB
const TARGET_PEAK = Math.pow(10, -0.30 / 20); // ~0.96605
let normalizationGain = 1.0;
if (peakAfter > TARGET_PEAK) {
  normalizationGain = TARGET_PEAK / peakAfter;
} else if (peakAfter > 0 && peakAfter < 0.85) {
  // If slightly under, lift gracefully while staying <= -0.3 dBFS
  normalizationGain = Math.min(TARGET_PEAK / peakAfter, 1.25);
}

console.log(`[AudioSynth] Peak before limiting: ${(20 * Math.log10(Math.max(peakBefore, 1e-6))).toFixed(2)} dBFS`);
console.log(`[AudioSynth] Peak after limiting:  ${(20 * Math.log10(Math.max(peakAfter, 1e-6))).toFixed(2)} dBFS`);
console.log(`[AudioSynth] Normalization gain:   ${normalizationGain.toFixed(4)} (${(20 * Math.log10(normalizationGain)).toFixed(2)} dB)`);

for (let i = 0; i < TOTAL_SAMPLES; i++) {
  masterBufferL[i] *= normalizationGain;
  masterBufferR[i] *= normalizationGain;
}

// Final peak verification
let finalPeak = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const absL = Math.abs(masterBufferL[i]);
  const absR = Math.abs(masterBufferR[i]);
  if (absL > finalPeak) finalPeak = absL;
  if (absR > finalPeak) finalPeak = absR;
}
const finalDb = 20 * Math.log10(Math.max(finalPeak, 1e-6));
console.log(`[AudioSynth] Final Master Peak:    ${finalDb.toFixed(2)} dBFS (Target: <= -0.2 dBFS)`);

// -------------------------------------------------------------
// WAV BUFFER CREATION (48kHz 16-bit Stereo PCM)
// -------------------------------------------------------------

console.log('[AudioSynth] Encoding 16-bit Stereo PCM WAV file...');

const NUM_CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;
const BLOCK_ALIGN = NUM_CHANNELS * BYTES_PER_SAMPLE;
const BYTE_RATE = sampleRate * BLOCK_ALIGN;
const DATA_SIZE = TOTAL_SAMPLES * BLOCK_ALIGN;
const TOTAL_FILE_SIZE = 44 + DATA_SIZE;

const wavBuffer = Buffer.alloc(TOTAL_FILE_SIZE);

// 1. "RIFF" Header
wavBuffer.write('RIFF', 0);
wavBuffer.writeUInt32LE(36 + DATA_SIZE, 4);
wavBuffer.write('WAVE', 8);

// 2. "fmt " Sub-chunk
wavBuffer.write('fmt ', 12);
wavBuffer.writeUInt32LE(16, 16);           // Sub-chunk 1 size (16 for PCM)
wavBuffer.writeUInt16LE(1, 20);            // Audio format (1 = PCM)
wavBuffer.writeUInt16LE(NUM_CHANNELS, 22); // Channels
wavBuffer.writeUInt32LE(sampleRate, 24);   // Sample rate
wavBuffer.writeUInt32LE(BYTE_RATE, 28);    // Byte rate
wavBuffer.writeUInt16LE(BLOCK_ALIGN, 32);  // Block align
wavBuffer.writeUInt16LE(16, 34);           // Bits per sample

// 3. "data" Sub-chunk
wavBuffer.write('data', 36);
wavBuffer.writeUInt32LE(DATA_SIZE, 40);

// 4. Interleaved PCM audio samples
let byteOffset = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const sL = Math.max(-1.0, Math.min(1.0, masterBufferL[i]));
  const sR = Math.max(-1.0, Math.min(1.0, masterBufferR[i]));

  const intL = sL < 0 ? Math.round(sL * 32768) : Math.round(sL * 32767);
  const intR = sR < 0 ? Math.round(sR * 32768) : Math.round(sR * 32767);

  wavBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, intL)), byteOffset);
  wavBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, intR)), byteOffset + 2);
  byteOffset += 4;
}

// Ensure parent directories exist
const dirName = path.dirname(outputPath);
if (!fs.existsSync(dirName)) {
  fs.mkdirSync(dirName, { recursive: true });
}

// Write to disk
fs.writeFileSync(outputPath, wavBuffer);

const fileStats = fs.statSync(outputPath);
console.log(`[AudioSynth] SUCCESS: Written ${fileStats.size} bytes to ${outputPath}`);
console.log(`[AudioSynth] Duration: ${(TOTAL_SAMPLES / sampleRate).toFixed(2)}s, Sample Rate: ${sampleRate}Hz, Channels: ${NUM_CHANNELS}, Bits: 16-bit PCM`);
