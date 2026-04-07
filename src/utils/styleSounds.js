import { STYLE_KEYS } from '../config/stylePresets.js';

/** 吃子短音效（todo 二.5 音效配合），失败时静默 */
export function playCaptureSound(styleId) {
  if (typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const freq =
      styleId === STYLE_KEYS.MODERN
        ? 523
        : styleId === STYLE_KEYS.FANTASY
          ? 392
          : styleId === STYLE_KEYS.WAR
            ? 349
            : 440;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.11);
    o.onended = () => ctx.close();
  } catch (_) {
    /* ignore */
  }
}
