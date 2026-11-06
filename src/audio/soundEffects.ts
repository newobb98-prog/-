/**
 * Procedural Web Audio API Sound Synthesizer & Haptic Engine
 * 100% self-contained, zero external audio asset dependencies.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'capture') {
    if (!this.hapticsEnabled) return;

    // 1. Try Telegram Mini App WebApp Haptic API
    try {
      const tgHaptic = window.Telegram?.WebApp?.HapticFeedback;
      if (tgHaptic) {
        if (type === 'light') tgHaptic.impactOccurred('light');
        else if (type === 'medium') tgHaptic.impactOccurred('medium');
        else if (type === 'heavy') tgHaptic.impactOccurred('heavy');
        else if (type === 'success') tgHaptic.notificationOccurred('success');
        else if (type === 'capture') tgHaptic.notificationOccurred('warning');
        return;
      }
    } catch {
      // Fall through to navigator.vibrate
    }

    // 2. Standard Web Navigator Vibration API
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'light') navigator.vibrate(25);
        else if (type === 'medium') navigator.vibrate(45);
        else if (type === 'heavy') navigator.vibrate([60, 40, 80]);
        else if (type === 'success') navigator.vibrate([50, 50, 100, 50, 150]);
        else if (type === 'capture') navigator.vibrate([80, 50, 120]);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Dice rolling rattle clatter
   */
  public playDiceRoll() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic('light');

    const now = ctx.currentTime;
    const rattleCount = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < rattleCount; i++) {
      const clickTime = now + i * 0.045 + Math.random() * 0.02;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 1200, clickTime);
      filter.Q.setValueAtTime(3, clickTime);

      osc.type = i % 2 === 0 ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(140 + Math.random() * 180, clickTime);

      const amp = (1 - i / rattleCount) * 0.18;
      gain.gain.setValueAtTime(amp, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.045);
    }
  }

  /**
   * Final dice settle clack
   */
  public playDiceSettle(isSix: boolean = false) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic(isSix ? 'heavy' : 'medium');

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSix ? 520 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);

    if (isSix) {
      // Extra sparkle chime on rolling a 6!
      setTimeout(() => this.playSafeZone(), 80);
    }
  }

  /**
   * Token hopping step sound
   */
  public playTokenHop() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic('light');

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Token spawn out from yard
   */
  public playTokenSpawn() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic('medium');

    const now = ctx.currentTime;
    const frequencies = [440, 660, 880];

    frequencies.forEach((freq, idx) => {
      const noteTime = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.2);
    });
  }

  /**
   * Token capture impact explosion
   */
  public playCapture() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic('capture');

    const now = ctx.currentTime;

    // Low boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(180, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.35);

    // Whoosh / sweep
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(800, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

    sweepGain.gain.setValueAtTime(0.2, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    sweepOsc.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.25);
  }

  /**
   * Safe zone star bell
   */
  public playSafeZone() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [784, 987.77, 1174.66]; // G5, B5, D6 harmonic chime

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  }

  /**
   * Home goal triumph trumpet fanfare
   */
  public playHomeGoal() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic('success');

    const now = ctx.currentTime;
    // C5, E5, G5, C6 triumphant arpeggio
    const fanfare = [
      { f: 523.25, d: 0.1, t: 0 },
      { f: 659.25, d: 0.1, t: 0.1 },
      { f: 783.99, d: 0.15, t: 0.2 },
      { f: 1046.5, d: 0.5, t: 0.35 },
    ];

    fanfare.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.25, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.05);
    });
  }

  /**
   * UI Click
   */
  public playClick() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.triggerHaptic('light');

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Turn notification ping
   */
  public playTurnPing() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const sound = new SoundSynthesizer();
