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
        this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
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
  // PROCEDURAL BGM SYNTHESIZER (DISABLED: SFX ONLY)
  // -------------------------------------------------------------

  public startBgm() {
    // Background music disabled per user instruction ("hanya musik saja yang dihapus")
    this.isBgmPlaying = false;
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(0, now);
    }
  }

  // Dynamic Hurry-Up mode: keep parameters safe for backwards compatibility
  public setHurryUp(accelerate: boolean) {
    this.hurryUp = accelerate;
    this.bpm = accelerate ? 176 : 132;
  }

  public isBgmActive(): boolean {
    return false;
  }

  public isHurryUp(): boolean {
    return this.hurryUp;
  }

  // Lookahead Web Audio Scheduler (disabled)
  private scheduler = () => {
    return;
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

  // Tree chop sound: crisp metal axe blade bite + punchy solid wooden log thwack
  public playChop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Solid wooden log body resonance (warm, punchy wood pitch bend 380 Hz -> 150 Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.09);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.11);

      // 2. Axe blade bark bite: sharp filtered white noise crack
      const noise = this.getOrCreateNoiseBuffer();
      if (noise) {
        const source = this.ctx.createBufferSource();
        source.buffer = noise;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1500, now);
        filter.Q.setValueAtTime(2.2, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.4, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        source.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + 0.05);
      }

      // 3. Timber wood splinter snap (square impulse 540 Hz -> 220 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = "square";
      osc2.frequency.setValueAtTime(540, now);
      osc2.frequency.exponentialRampToValueAtTime(220, now + 0.045);

      gain2.gain.setValueAtTime(0.28, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);

      osc2.start(now);
      osc2.stop(now + 0.055);
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

  // Bear roar: ferocious guttural beast roar with pitch modulation & raspy throat resonance
  public playBearRoar() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Guttural throat body (dual detuned sawtooth with pitch flutter)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Bandpass formant filter giving that hollow predator throat sound
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(680, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.45);
      filter.Q.setValueAtTime(2.2, now);

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.linearRampToValueAtTime(180, now + 0.15);
      osc1.frequency.linearRampToValueAtTime(115, now + 0.5);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(252, now); // Slight detune for thick beast growl
      osc2.frequency.linearRampToValueAtTime(188, now + 0.15);
      osc2.frequency.linearRampToValueAtTime(118, now + 0.5);

      // Pitch vibrato / growl flutter LFO (28 Hz)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(28, now);
      lfoGain.gain.setValueAtTime(38, now);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.06);
      gain.gain.setValueAtTime(0.55, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.52);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + 0.55);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);

      // 2. Raspy snarl / breath roar layer (filtered noise)
      const noise = this.getOrCreateNoiseBuffer();
      if (noise) {
        const source = this.ctx.createBufferSource();
        source.buffer = noise;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = "bandpass";
        nFilter.frequency.setValueAtTime(1400, now);
        nFilter.frequency.exponentialRampToValueAtTime(550, now + 0.45);
        nFilter.Q.setValueAtTime(1.8, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.01, now);
        nGain.gain.linearRampToValueAtTime(0.4, now + 0.08);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

        source.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + 0.5);
      }
    } catch {}
  }

  // Bear attack / claw slash: vicious razor swipe with tearing noise and fierce snarl
  public playBearAttack() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Fierce snarling swipe tone (downward plunge with growl flutter)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.22);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);

      // 2. High razor slash swipe (white noise whoosh)
      const noise = this.getOrCreateNoiseBuffer();
      if (noise) {
        const source = this.ctx.createBufferSource();
        source.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2600, now);
        filter.frequency.exponentialRampToValueAtTime(850, now + 0.18);
        filter.Q.setValueAtTime(1.6, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.45, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        source.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + 0.22);
      }
    } catch {}
  }

  // Bear hit: heavy axe impact thud against bear with pain grunt
  public playBearHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Heavy axe impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.16);

      // 2. Bear pain grunt (short low growl)
      const grunt = this.ctx.createOscillator();
      const gGain = this.ctx.createGain();
      grunt.type = "sawtooth";
      grunt.frequency.setValueAtTime(180, now + 0.02);
      grunt.frequency.exponentialRampToValueAtTime(95, now + 0.18);
      gGain.gain.setValueAtTime(0.4, now + 0.02);
      gGain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);
      grunt.connect(gGain);
      gGain.connect(this.sfxGain);
      grunt.start(now + 0.02);
      grunt.stop(now + 0.2);
    } catch {}
  }

  // Bear defeat / BEAR REKT: massive arcade crash + victory chord
  public playBearDefeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      // 1. Deep impact crash
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.4);

      // 2. Victorious ascending celebration sparkle
      const notes = [330, 440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = now + 0.08 + idx * 0.055;
        const nOsc = this.ctx.createOscillator();
        const nGain = this.ctx.createGain();

        nOsc.type = "triangle";
        nOsc.frequency.setValueAtTime(freq, noteTime);

        nGain.gain.setValueAtTime(0.2, noteTime);
        nGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.16);

        nOsc.connect(nGain);
        nGain.connect(this.sfxGain);
        nOsc.start(noteTime);
        nOsc.stop(noteTime + 0.18);
      });
    } catch {}
  }

  // Crate hit: wooden knock
  public playCrateHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Crate break: loud splintering wood fracture
  public playCrateBreak() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const noise = this.getOrCreateNoiseBuffer();
      if (noise) {
        const source = this.ctx.createBufferSource();
        source.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(950, now);
        filter.Q.setValueAtTime(1.8, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        source.start(now);
        source.stop(now + 0.2);
      }

      // Wooden snap pop
      const osc = this.ctx.createOscillator();
      const oGain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.09);

      oGain.gain.setValueAtTime(0.3, now);
      oGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(oGain);
      oGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  // Rat Stomp: cartoon bouncy rebound squash
  public playStomp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch {}
  }

  // Powerup collect: heart (radiant heal), shield (forcefield), frenzy (laser charge)
  public playPowerUp(type: "heart" | "shield" | "frenzy" | "time") {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      if (type === "heart") {
        // Celestial healing chime (C-E-G-C major arpeggio)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const t = now + idx * 0.05;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.24, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t);
          osc.stop(t + 0.2);
        });
      } else if (type === "shield") {
        // Sci-fi forcefield shield resonance
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.18);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        // Frenzy: arcade laser power surge
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.2);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.26);
      }
    } catch {}
  }

  // Chasm tumble fall sound: downward pitch whistle into pit
  public playChasmFall() {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }
}

export const sound = new SoundManager();

// Automatically unlock and resume Web Audio on any early user gesture
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    sound.init();
  };
  ["pointerdown", "touchstart", "touchend", "mousedown", "keydown", "click"].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

