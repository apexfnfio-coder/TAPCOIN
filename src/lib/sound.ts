// Web Audio API sound synthesizer for $TAP game
// Provides crisp, low-latency procedural retro-arcade sound effects & chiptune BGM without external audio files

// 16-step melody pattern (frequencies in Hz): A minor / C pentatonic arcade arpeggio
const LEAD_PATTERN: number[] = [
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

// 16-step walking bassline pattern (frequencies in Hz)
const BASS_PATTERN: (number | null)[] = [
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

// 8-note pentatonic scale for candle collection combo escalation
const PENTATONIC_SCALE: number[] = [
  880.00,  // A5
  1046.50, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
  1760.00, // A6
  2093.00, // C7
  2349.32, // D7
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted: boolean = false;
  private volume: number = 0.8;

  // Procedural BGM Synthesizer state
  private isBgmPlaying: boolean = false;
  private hurryUp: boolean = false;
  private bpm: number = 132;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        this.muted = window.localStorage.getItem("tap_sound_muted") === "true";
        const savedVol = window.localStorage.getItem("tap_sound_volume");
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.volume = parsed;
          }
        }
      } catch {}
    }
  }

  // Centralized AudioContext and GainNode routing initialization:
  // destination <- masterGain <- [bgmGain, sfxGain]
  public init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        // Connect routing hierarchy
        this.bgmGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Initial gain levels with pop-free initial values
        const initialMaster = this.muted ? 0 : this.volume;
        this.masterGain.gain.setValueAtTime(initialMaster, this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Generate or return procedural 1-second white noise buffer for chiptune percussion
  private getOrCreateNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
      return this.noiseBuffer;
    } catch {
      return null;
    }
  }

  // Volume controls with smooth exponential transitions
  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.8));
    this.volume = clamped;
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem("tap_sound_volume", String(clamped));
      } catch {}
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.setTargetAtTime(target, now, 0.03);
    }
  }

  // Mute state management with pop-free 30ms exponential easing
  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem("tap_sound_muted", String(muted));
      } catch {}
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.setTargetAtTime(target, now, 0.03);
    }
  }

  // -------------------------------------------------------------
  // PROCEDURAL 16-STEP RETRO-CHIPTUNE BGM SYNTHESIZER
  // -------------------------------------------------------------

  public startBgm() {
    this.init();
    if (!this.ctx || !this.bgmGain) return;
    if (this.isBgmPlaying) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    this.isBgmPlaying = true;
    this.bpm = this.hurryUp ? 176 : 132;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    // Smooth un-mute / fade-in for BGM gain
    const now = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(0.001, now);
    this.bgmGain.gain.setTargetAtTime(0.35, now, 0.03);

    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
    }
    // Chris Wilson Lookahead Scheduler: 25ms tick, 100ms lookahead
    this.bgmTimer = setInterval(this.scheduler, 25);
  }

  public stopBgm() {
    if (!this.isBgmPlaying) return;
    this.isBgmPlaying = false;

    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.setTargetAtTime(0, now, 0.03);
    }
  }

  // Dynamic Hurry-Up mode: seamlessly accelerates tempo (132 -> 176 BPM)
  public setHurryUp(accelerate: boolean) {
    if (this.hurryUp === accelerate) return;
    this.hurryUp = accelerate;
    this.bpm = accelerate ? 176 : 132;
  }

  public isBgmActive(): boolean {
    return this.isBgmPlaying;
  }

  public isHurryUp(): boolean {
    return this.hurryUp;
  }

  // Lookahead Web Audio Scheduler (Chris Wilson pattern)
  // 100ms lookahead horizon prevents timing jitter from JS main thread events
  private scheduler = () => {
    if (!this.ctx || !this.isBgmPlaying) return;

    // Guard against tab suspension / lag: clamp if clock fell behind
    if (this.nextStepTime < this.ctx.currentTime) {
      this.nextStepTime = this.ctx.currentTime;
    }

    // Schedule any steps that fall within the next 100ms
    while (this.nextStepTime < this.ctx.currentTime + 0.1) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  };

  private advanceStep() {
    const secondsPerStep = 60.0 / this.bpm / 4;
    this.nextStepTime += secondsPerStep;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const stepDuration = 60.0 / this.bpm / 4;

    // Voice 1: Square Lead (Arpeggio melody, octave jump in Hurry-Up mode)
    const leadFreq = this.hurryUp ? LEAD_PATTERN[step] * 2 : LEAD_PATTERN[step];
    this.scheduleLead(leadFreq, time, stepDuration);

    // Voice 2: Triangle Bass (Walking bassline)
    const bassFreq = BASS_PATTERN[step];
    if (bassFreq !== null) {
      this.scheduleBass(bassFreq, time, stepDuration * 2);
    }

    // Voice 3: Noise Percussion (Hi-hat bursts & Swept kicks)
    // Four-on-the-floor swept kick
    if (step === 0 || step === 4 || step === 8 || step === 12) {
      this.scheduleKick(time);
    }

    // Snare / noise crack on beats 4 & 12
    if (step === 4 || step === 12) {
      this.scheduleSnare(time);
    }

    // Off-beat hi-hat bursts
    if (step === 2 || step === 6 || step === 10 || step === 14) {
      this.scheduleHiHat(time, step === 14);
    } else if (this.hurryUp && step % 2 === 1) {
      // Rapid 16th-note hi-hat drive in Hurry-Up mode
      this.scheduleHiHat(time, false);
    }
  }

  // Voice 1 synthesis: snappy 8-bit square wave
  private scheduleLead(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, time);

      const gateTime = duration * 0.75;
      noteGain.gain.setValueAtTime(0.001, time);
      noteGain.gain.linearRampToValueAtTime(0.12, time + 0.006);
      noteGain.gain.setValueAtTime(0.09, time + gateTime * 0.6);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + gateTime);

      osc.connect(noteGain);
      noteGain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + gateTime + 0.01);
    } catch {}
  }

  // Voice 2 synthesis: warm retro triangle walking bass
  private scheduleBass(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time);

      const gateTime = duration * 0.85;
      noteGain.gain.setValueAtTime(0.001, time);
      noteGain.gain.linearRampToValueAtTime(0.22, time + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + gateTime);

      osc.connect(noteGain);
      noteGain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + gateTime + 0.01);
    } catch {}
  }

  // Voice 3 synthesis - Swept Kick: fast downward pitch drop
  private scheduleKick(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.08);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.085);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + 0.09);
    } catch {}
  }

  // Voice 3 synthesis - Hi-Hat: filtered white noise burst
  private scheduleHiHat(time: number, accent: boolean = false) {
    if (!this.ctx || !this.bgmGain) return;
    const noise = this.getOrCreateNoiseBuffer();
    if (!noise) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = noise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7500, time);

      const gain = this.ctx.createGain();
      const vol = accent ? 0.12 : 0.07;
      const decay = accent ? 0.06 : 0.035;

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      source.start(time);
      source.stop(time + decay + 0.01);
    } catch {}
  }

  // Voice 3 synthesis - Snare: bandpassed noise crack with body tone
  private scheduleSnare(time: number) {
    if (!this.ctx || !this.bgmGain) return;
    const noise = this.getOrCreateNoiseBuffer();
    if (!noise) return;
    try {
      // Noise burst crack
      const source = this.ctx.createBufferSource();
      source.buffer = noise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2200, time);
      filter.Q.setValueAtTime(1.2, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      source.start(time);
      source.stop(time + 0.11);

      // Body tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.07);

      oscGain.gain.setValueAtTime(0.15, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(oscGain);
      oscGain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + 0.075);
    } catch {}
  }

  // -------------------------------------------------------------
  // ARCADE SOUND EFFECTS (SFX) ROUTED VIA SFXGAIN
  // -------------------------------------------------------------

  // Tree chop sound: punchy wooden thud
  public playChop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Green candle collect: bright, uplifting crypto ping with pentatonic pitch scaling & combo fanfare
  public playGreen(combo?: number) {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const safeCombo = typeof combo === "number" && combo > 0 ? combo : 1;
      const noteIdx = Math.min(Math.max(0, safeCombo - 1), PENTATONIC_SCALE.length - 1);
      const baseFreq = PENTATONIC_SCALE[noteIdx];

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(baseFreq * 0.75, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.03);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc1.stop(now + 0.23);
      osc2.start(now + 0.03);
      osc2.stop(now + 0.23);

      // Fanfare flourish on combo >= 5: ascending celebratory multi-tone sparkle arpeggio
      if (safeCombo >= 5) {
        const flourishNotes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
        flourishNotes.forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const noteTime = now + 0.05 + idx * 0.045;
          const fOsc = this.ctx.createOscillator();
          const fGain = this.ctx.createGain();

          fOsc.type = "sine";
          fOsc.frequency.setValueAtTime(freq, noteTime);

          fGain.gain.setValueAtTime(0.12, noteTime);
          fGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

          fOsc.connect(fGain);
          fGain.connect(this.sfxGain);

          fOsc.start(noteTime);
          fOsc.stop(noteTime + 0.13);
        });
      }
    } catch {}
  }

  // Red candle penalty: low harsh buzzer
  public playRed() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // Hazard / Chasm hit effect
  public playHit() {
    this.playRed();
  }

  // Jump leap sound: retro arcade spring whoosh
  public playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.16);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  // Level cleared / Victory fanfare
  public playLevelUp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A major
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch {}
  }

  // UI button click
  public playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }
}

export const sound = new SoundManager();
