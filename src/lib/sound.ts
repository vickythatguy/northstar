/**
 * Tiny optional "pop/giggle" on sun poke. Muted by default (see `soundOn`).
 * Uses the Web Audio API so there are no asset files to ship.
 */
export const audioPrefs = { on: false };

let ctx: AudioContext | null = null;

export function playPop() {
  if (!audioPrefs.on) return;
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // A quick upward "boing" chirp.
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch {
    /* audio not available — ignore */
  }
}
