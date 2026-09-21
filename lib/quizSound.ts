/* ─────────────────────────────────────────────────────────────────────────────
   Tiny Web Audio beep helper for instant answer feedback — avoids needing
   dedicated correct/incorrect audio assets for every install of the app.
───────────────────────────────────────────────────────────────────────────── */
"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine", volume = 0.2) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function playCorrectSound() {
  tone(880, 150, "sine", 0.25);
  setTimeout(() => tone(1174, 220, "sine", 0.25), 130);
}

export function playIncorrectSound() {
  tone(220, 320, "sawtooth", 0.2);
}
