/**
 * Web Audio API Chime & Bell Sound Utility for Kiranape Orders
 * Generates an instant, crisp two-tone bell chime without external audio assets or 404 risks.
 */

export function playOrderChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Primary bell strike (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Second bell chime (A5 - 880 Hz) with warm triangle harmonics
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.9);

    // High shimmer harmonic (D6 - 1174.66 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2);
    gain3.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ctx.currentTime + 0.2);
    osc3.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn('Audio chime playback warning:', err);
  }
}

/**
 * High-priority two-pulse notification chime for Store Admin Dashboard
 * Plays when a new Voice, Parchi, or COD order is detected.
 */
export function playAdminNotificationChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // First Alert Ping (C6 - 1046.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain1.gain.setValueAtTime(0.5, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second Elevated Ping (E6 - 1318.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain2.gain.setValueAtTime(0.6, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.7);

    // Third Harmonic Affirmation (G6 - 1567.98 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.35);
    gain3.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain3.gain.setValueAtTime(0.4, ctx.currentTime + 0.35);
    gain3.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ctx.currentTime + 0.35);
    osc3.stop(ctx.currentTime + 1.1);
  } catch (err) {
    console.warn('Admin notification chime error:', err);
  }
}

