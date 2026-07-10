// Web Audio API Generative Soundscape for the Rejoicing Field

export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windVolume: GainNode | null = null;
  private windOscillators: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private isInitialized = false;

  // Rich background drone node tracking
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  // Root system & Semantic wind audio additions
  private subBassOsc: OscillatorNode | null = null;
  private subBassGain: GainNode | null = null;
  private subBassLfo: OscillatorNode | null = null;
  private tuningMultiplier = 1.0;

  // G Major Pentatonic scale (Harmonizes perfectly)
  private scale = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 880.00, 987.77, 1174.66, 1318.51, 1567.98];

  // Theme base frequencies for the drone pad (Root, Fifth)
  private themeFrequencies: Record<string, { root: number; fifth: number }> = {
    dawn: { root: 87.31, fifth: 130.81 },   // F2, C3
    noon: { root: 130.81, fifth: 196.00 },  // C3, G3
    dusk: { root: 98.00, fifth: 146.83 },   // G2, D3
    night: { root: 73.42, fifth: 110.00 },  // D2, A2
  };

  private currentThemeId = "dusk";

  constructor() {
    // Lazy initialisation to comply with browser autoplay security policies
  }

  public init() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Soft master volume
      this.masterGain.connect(this.ctx.destination);

      // 1. Setup Ambient Wind Synth (Additive synthesis for warm, deep rustling)
      this.windVolume = this.ctx.createGain();
      this.windVolume.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(3, this.ctx.currentTime);

      // Create 3 detuned low oscillators to simulate organic wind rumble
      const freqs = [55.0, 55.4, 110.0];
      freqs.forEach((freq) => {
        if (!this.ctx || !this.filter) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);

        // Connect
        osc.connect(gain);
        gain.connect(this.filter);
        osc.start();
        this.windOscillators.push(osc);

        // Modulate frequency gently to simulate wind gusts
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.12 + Math.random() * 0.08, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(4.0, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        this.windOscillators.push(lfo);
      });

      // Ambient low-frequency filter modulation (wind swooshing)
      const filterLfo = this.ctx.createOscillator();
      const filterLfoGain = this.ctx.createGain();
      filterLfo.frequency.setValueAtTime(0.06, this.ctx.currentTime);
      filterLfoGain.gain.setValueAtTime(120, this.ctx.currentTime);
      
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(this.filter.frequency);
      filterLfo.start();
      this.windOscillators.push(filterLfo);

      this.filter.connect(this.windVolume);
      this.windVolume.connect(this.masterGain);

      // 2. Setup Ambient Background Drone Pad
      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = "lowpass";
      this.droneFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      this.droneFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.06, this.ctx.currentTime); // soft background presence

      const freqsTheme = this.themeFrequencies[this.currentThemeId];
      
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = "triangle"; // richer harmonics than sine
      this.droneOsc1.frequency.setValueAtTime(freqsTheme.root, this.ctx.currentTime);

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = "sine";
      this.droneOsc2.frequency.setValueAtTime(freqsTheme.fifth, this.ctx.currentTime);

      // Connect drone oscillators
      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.masterGain);

      this.droneOsc1.start();
      this.droneOsc2.start();

      // Slow LFO to pulse the background pad softly
      const droneLfo = this.ctx.createOscillator();
      const droneLfoGain = this.ctx.createGain();
      droneLfo.frequency.setValueAtTime(0.04, this.ctx.currentTime); // super slow pulse (25 seconds)
      droneLfoGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      droneLfo.connect(droneLfoGain);
      if (this.droneGain) {
        droneLfoGain.connect(this.droneGain.gain);
      }
      droneLfo.start();

      this.isInitialized = true;
      console.log("Enhanced Generative Audio Engine Initialized");
    } catch (err) {
      console.error("Failed to initialize Web Audio API:", err);
    }
  }

  public setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const clampedVol = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.linearRampToValueAtTime(clampedVol * 0.4, this.ctx.currentTime + 0.1);
  }

  public setThemeTone(themeId: string) {
    this.currentThemeId = themeId;
    if (!this.isInitialized || !this.ctx || !this.droneOsc1 || !this.droneOsc2) return;

    const freqs = this.themeFrequencies[themeId] || this.themeFrequencies.dusk;
    const now = this.ctx.currentTime;

    // Smooth glissando transition between times of day
    this.droneOsc1.frequency.exponentialRampToValueAtTime(freqs.root, now + 4.0);
    this.droneOsc2.frequency.exponentialRampToValueAtTime(freqs.fifth, now + 4.0);

    // Adjust filter cutoff softly for different themes
    if (this.droneFilter) {
      const targetCutoff = themeId === "noon" ? 350 : themeId === "dawn" ? 260 : themeId === "dusk" ? 200 : 150;
      this.droneFilter.frequency.exponentialRampToValueAtTime(targetCutoff, now + 4.0);
    }
  }

  public setWindIntensity(intensity: number) {
    if (!this.ctx || !this.filter || !this.windVolume) return;
    // intensity: 0 to 1
    const baseFreq = 180 + intensity * 400; // shift lowpass filter up for stronger wind
    const volume = 0.02 + intensity * 0.14;

    this.filter.frequency.exponentialRampToValueAtTime(baseFreq, this.ctx.currentTime + 0.5);
    this.windVolume.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.5);
  }

  public playChime(xRatio: number, yRatio: number, chordType: "single" | "third" | "fifth" | "seventh" = "single", timbreFactor: number = 1.0) {
    if (!this.isInitialized) this.init();
    if (!this.ctx || !this.masterGain) return;

    // Ensure audio context is running (browser policy protection)
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // Map X-ratio (0..1) to scale note index
    const scaleLength = this.scale.length;
    const noteIndex = Math.floor(xRatio * scaleLength);
    const rootFreq = this.scale[Math.max(0, Math.min(scaleLength - 1, noteIndex))];

    // Map Y-ratio to chime type and velocity
    const velocity = 1.0 - yRatio * 0.4; // higher on screen = louder/brighter

    // Determine interval multiplier based on request
    let frequenciesToPlay = [rootFreq];
    if (chordType === "third" && noteIndex + 2 < scaleLength) {
      frequenciesToPlay.push(this.scale[noteIndex + 2]); // Major / Minor pentatonic third
    } else if (chordType === "fifth" && noteIndex + 4 < scaleLength) {
      frequenciesToPlay.push(this.scale[noteIndex + 4]); // Perfect fifth
    } else if (chordType === "seventh" && noteIndex + 6 < scaleLength) {
      frequenciesToPlay.push(this.scale[noteIndex + 3]); // Add third
      frequenciesToPlay.push(this.scale[noteIndex + 6]); // Major seventh
    }

    // Play all notes in the cluster/chord
    frequenciesToPlay.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.035); // Arpeggiate chord notes slightly for beauty

      // Envelope: adjust attack and decay based on timbreFactor (past memory resonance)
      const attack = 0.02 + idx * 0.01 + (1.0 - timbreFactor) * 0.22; // slower attack for muffled past memories
      const decay = (2.4 + (1 - xRatio) * 1.6 - idx * 0.3) * (1.0 + (1.0 - timbreFactor) * 1.5); // much longer decay (muffled echo from depths of time)
      const noteVol = (velocity * 0.12) / frequenciesToPlay.length; // normalize volume

      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(noteVol, now + attack);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

      // Add subtle frequency vibrato (wider vibrato for old dreamy memories)
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.setValueAtTime((4.0 + Math.random() * 3.0) * (0.8 + (1.0 - timbreFactor) * 0.4), now);
      vibratoGain.gain.setValueAtTime(1.8 + (1.0 - timbreFactor) * 2.0, now);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start();

      // FM Modulator for chime bell-harmonic tone
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      mod.frequency.setValueAtTime(freq * 2.5, now); // Metallic partials
      // Lower FM index for old memories makes them warm, pure sines, while new memories get crispy metallic bell-harmonics
      modGain.gain.setValueAtTime(freq * 0.35 * timbreFactor, now);

      mod.connect(modGain);
      modGain.connect(osc.frequency);
      mod.start();

      // Timbre adjustment filter
      const timbreFilter = this.ctx.createBiquadFilter();
      timbreFilter.type = "lowpass";
      // Older memories are heavily lowpassed for a muffled, subterranean sound. New ones are wide open.
      const cutoff = 240 + Math.pow(timbreFactor, 2.0) * 16000;
      timbreFilter.frequency.setValueAtTime(cutoff, now);
      timbreFilter.Q.setValueAtTime(1.0 + (1.0 - timbreFactor) * 3.5, now);

      // Stereophonic panning using PannerNode
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        // Spread chord notes across the stereo field nicely
        const panShift = (idx - (frequenciesToPlay.length - 1) / 2) * 0.3;
        const pVal = Math.max(-1, Math.min(1, (xRatio * 2 - 1) + panShift));
        panner.pan.setValueAtTime(pVal, now);
        
        osc.connect(oscGain);
        oscGain.connect(timbreFilter);
        timbreFilter.connect(panner);
        panner.connect(this.masterGain);
      } else {
        osc.connect(oscGain);
        oscGain.connect(timbreFilter);
        timbreFilter.connect(this.masterGain);
      }

      osc.start(now);
      
      // Stop all oscillators to free memory
      osc.stop(now + attack + decay + 0.1);
      mod.stop(now + attack + decay + 0.1);
      vibrato.stop(now + attack + decay + 0.1);
    });
  }

  public setTuningMultiplier(multiplier: number) {
    this.tuningMultiplier = multiplier;
    if (!this.isInitialized || !this.ctx || !this.droneOsc1 || !this.droneOsc2) return;
    const freqs = this.themeFrequencies[this.currentThemeId] || this.themeFrequencies.dusk;
    const now = this.ctx.currentTime;
    this.droneOsc1.frequency.exponentialRampToValueAtTime(freqs.root * multiplier, now + 1.5);
    this.droneOsc2.frequency.exponentialRampToValueAtTime(freqs.fifth * multiplier, now + 1.5);
  }

  public setSubBassActive(active: boolean, volumeFactor: number = 0.5) {
    if (!this.isInitialized) this.init();
    if (!this.ctx || !this.masterGain) return;

    if (active) {
      if (!this.subBassOsc) {
        this.subBassGain = this.ctx.createGain();
        this.subBassGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.subBassGain.connect(this.masterGain);

        this.subBassOsc = this.ctx.createOscillator();
        this.subBassOsc.type = "sine";
        this.subBassOsc.frequency.setValueAtTime(36.0, this.ctx.currentTime);
        this.subBassOsc.connect(this.subBassGain);
        this.subBassOsc.start();

        this.subBassLfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        this.subBassLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
        this.subBassLfo.connect(lfoGain);
        lfoGain.connect(this.subBassOsc.frequency);
        this.subBassLfo.start();
      }

      const targetGain = 0.18 * volumeFactor;
      this.subBassGain?.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 1.5);
    } else {
      this.subBassGain?.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
    }
  }

  public setSubBassFrequency(freq: number) {
    if (!this.isInitialized || !this.ctx || !this.subBassOsc) return;
    this.subBassOsc.frequency.linearRampToValueAtTime(freq, this.ctx.currentTime + 0.5);
  }

  public resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public suspend() {
    if (this.ctx && this.ctx.state === "running") {
      this.ctx.suspend();
    }
  }
}
export const ambientAudio = new AmbientAudio();

