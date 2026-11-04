/* ─────────────────────────────────────────────────────────────────────────────
   کڵاوێن sound engine — Kurdish-style, fully synthesised with Web Audio (no
   assets, and every sound can react to the game).

   Instruments
     دهۆڵ   dahol    — big double-headed drum: deep mallet "dum", thin-stick "tek"
     دەف    daf      — frame drum with ring jingles
     تەمبوور tembûr  — long-neck lute, paired metal strings
     شمشاڵ  shimshal — cane flute, physically modelled (breath jet + resonant tube)
     تیلیلی tilîlî  — wedding ululation, for when the ring is found

   Melodies use maqam Bayati on D (with its quarter-tone 2nd) — the sound of
   Kurdish folk songs and govend dances — and maqam Kurd for the sad moments.

   • playHatSelect   — stick tap + soft tembûr note
   • playHatEmpty    — whoosh, daf, and a tembûr figure that climbs with each
                       empty hat so tension rises as the hats run out
   • playRingReveal  — dahol, daf roll, shimshal fanfare, bells and tilîlî
   • playKurdishVictory — a short govend burst for the end of the game
   • playCountdownTick / playCountdownGo — the intro countdown: a ring note
                       per second that climbs and gathers drums, then a hit
   • kllawenMusic    — adaptive loop: a shimshal lawik over a drone while the
                       ring is hidden; a halparke dance while seeking that
                       speeds up and brings in the shimshal as hats are lifted
───────────────────────────────────────────────────────────────────────────── */
"use client";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverbSend: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) {
    ctx = new Ctx();
    loadShimshal(ctx);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);

    // Open-air reverb (a village square, not a hall) from decaying noise.
    const len = Math.floor(ctx.sampleRate * 1.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.3;
    reverbSend.connect(conv);
    conv.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = noiseBuf.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return { ctx, master: master!, reverb: reverbSend!, noise: noiseBuf! };
}

/** Output stage for one voice: dry into `dest` (master by default) plus a reverb send. */
function out(gain: number, wet = 0.4, dest?: AudioNode) {
  const a = audio()!;
  const g = a.ctx.createGain();
  g.gain.value = gain;
  g.connect(dest ?? a.master);
  if (wet > 0) {
    const s = a.ctx.createGain();
    s.gain.value = wet;
    g.connect(s);
    s.connect(a.reverb);
  }
  return g;
}

function noise(t: number, dur: number) {
  const a = audio()!;
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur);
  return src;
}

/* ── Maqamat on D ─────────────────────────────────────────────────────── */
/** Bayati: D E½♭ F G A B♭ C — the quarter-tone 2nd is the Kurdish colour. */
const BAYATI = [0, 1.5, 3, 5, 7, 8, 10];
/** Kurd: D E♭ F G A B♭ C — darker, for losing the ring. */
const KURD = [0, 1, 3, 5, 7, 8, 10];
const D3 = 146.83;
const D5 = 587.33;
function deg(step: number, base = D3, scale = BAYATI) {
  const oct = Math.floor(step / scale.length);
  const i = ((step % scale.length) + scale.length) % scale.length;
  return base * Math.pow(2, oct + scale[i] / 12);
}

/* ── Percussion ───────────────────────────────────────────────────────── */

/** Dahol "dum" — the big mallet side. */
function dum(t: number, vol = 0.6, dest?: AudioNode) {
  const a = audio(); if (!a) return;
  const o = a.ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.3);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g); g.connect(out(1, 0.2, dest));
  o.start(t); o.stop(t + 0.6);

  // Mallet slap on the skin.
  const src = noise(t, 0.08);
  const lp = a.ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 420;
  const ng = a.ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(lp); lp.connect(ng); ng.connect(out(1, 0.1, dest));
}

/** Dahol "tek" — the thin stick on the other head. */
function tek(t: number, vol = 0.22, dest?: AudioNode) {
  const a = audio(); if (!a) return;
  const src = noise(t, 0.05);
  const hp = a.ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 2200;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(hp); hp.connect(g); g.connect(out(1, 0.15, dest));

  const o = a.ctx.createOscillator();
  o.type = "triangle"; o.frequency.value = 1350;
  const og = a.ctx.createGain();
  og.gain.setValueAtTime(vol * 0.45, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(og); og.connect(out(1, 0.1, dest));
  o.start(t); o.stop(t + 0.04);
}

/** Daf jingles — the metal rings inside the frame. */
function dafJingle(t: number, vol = 0.08, dest?: AudioNode) {
  const a = audio(); if (!a) return;
  const src = noise(t, 0.25);
  const hp = a.ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 5200;
  const bp = a.ctx.createBiquadFilter();
  bp.type = "peaking"; bp.frequency.value = 8200; bp.Q.value = 3; bp.gain.value = 9;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  // A few rings hitting each other in quick succession.
  for (let i = 0; i < 4; i++) {
    const at = t + i * 0.014 + Math.random() * 0.006;
    g.gain.setValueAtTime(vol * (1 - i * 0.2), at);
    g.gain.exponentialRampToValueAtTime(vol * 0.15, at + 0.012);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out(1, 0.3, dest));
}

/** Daf "boom" — palm on the centre of the skin, rings shake with it. */
function dafBoom(t: number, vol = 0.3, dest?: AudioNode) {
  const a = audio(); if (!a) return;
  const o = a.ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g); g.connect(out(1, 0.35, dest));
  o.start(t); o.stop(t + 0.45);
  dafJingle(t + 0.005, vol * 0.3, dest);
}

/** One heartbeat thump — a muffled, chest-deep sub hit. */
function thump(t: number, vol: number, dest?: AudioNode) {
  const a = audio(); if (!a) return;
  const o = a.ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(72, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
  const lp = a.ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 160;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(lp); lp.connect(g); g.connect(out(1, 0.05, dest));
  o.start(t); o.stop(t + 0.25);
}

/** Heartbeat "lub-dub". */
function heartbeat(t: number, vol = 0.7, dest?: AudioNode) {
  thump(t, vol, dest);
  thump(t + 0.17, vol * 0.65, dest);
}

function whoosh(t: number, dur = 0.32, vol = 0.3, from = 350, to = 2600) {
  const a = audio(); if (!a) return;
  const src = noise(t, dur + 0.05);
  const bp = a.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(out(1, 0.3));
}

/* ── Strings & bells ──────────────────────────────────────────────────── */

/** Tembûr: two paired metal strings, bright attack, quick decay. */
function tembur(t: number, freq: number, vol = 0.18, dur = 0.6, dest?: AudioNode, wet = 0.4) {
  const a = audio(); if (!a) return;
  const lp = a.ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 3;
  lp.frequency.setValueAtTime(Math.min(freq * 14, 10000), t);
  lp.frequency.exponentialRampToValueAtTime(freq * 2, t + dur * 0.5);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  lp.connect(g); g.connect(out(1, wet, dest));
  for (const [type, detune, level] of [["sawtooth", -5, 0.55], ["sawtooth", 5, 0.55], ["square", 1200, 0.12]] as const) {
    const o = a.ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const og = a.ctx.createGain(); og.gain.value = level;
    o.connect(og); og.connect(lp);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

/** Metallic bell — the glint of the ring. */
function bell(t: number, freq: number, vol = 0.14, dur = 1.4) {
  const a = audio(); if (!a) return;
  const bus = out(1, 0.6);
  for (const [ratio, level, decay] of [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.25, 0.35], [8.93, 0.12, 0.2]]) {
    const o = a.ctx.createOscillator();
    o.type = "sine"; o.frequency.value = freq * ratio;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * decay);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur * decay + 0.05);
  }
}

/* ── Shimshal ─────────────────────────────────────────────────────────── */

/* The shimshal is a physical model, not an oscillator: a breath jet blows
   across the edge of a cane tube and the tube's own resonance makes the note
   (a waveguide flute after Perry Cook's STK model). Breath pressure decides
   everything a real player controls — too little and only air comes out, the
   tone "catches" as pressure rises, harder blowing brightens it — and pitch
   changes glide the way the air column re-forms under the fingers.
   Tuning is calibrated so every note, quarter-tones included, lands within a
   few cents across the whole playing range. */
const SHIMSHAL_WORKLET = `
class ShimshalProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "frequency", defaultValue: 587, minValue: 60, maxValue: 3000, automationRate: "a-rate" },
      { name: "pressure", defaultValue: 0, minValue: 0, maxValue: 1.4, automationRate: "a-rate" },
      { name: "noise", defaultValue: 0.26, minValue: 0, maxValue: 1, automationRate: "k-rate" },
    ];
  }
  constructor() {
    super();
    this.size = 4096;
    this.bore = new Float32Array(this.size);
    this.jet = new Float32Array(this.size);
    this.w = 0;
    this.lp = 0; this.dcx = 0; this.dcy = 0; this.last = 0;
    this.pole = 0.7 - 0.1 * 22050 / sampleRate;
    this.alive = true;
    this.port.onmessage = () => { this.alive = false; };
  }
  read(buf, d) {
    let r = this.w - d;
    while (r < 0) r += this.size;
    const i = r | 0, f = r - i;
    const a = buf[i % this.size], b = buf[(i + 1) % this.size];
    return a + (b - a) * f;
  }
  process(_in, outputs, params) {
    const out = outputs[0][0];
    const fq = params.frequency, pr = params.pressure, ng = params.noise[0];
    const pole = this.pole;
    let freq = -1, delay = 0;
    for (let n = 0; n < out.length; n++) {
      const f = fq.length > 1 ? fq[n] : fq[0];
      if (f !== freq) {
        freq = f;
        // Overblown bore at 2/3 f, minus loop-filter phase delay, with calibration.
        const lf = f * 0.66666 / (1.0155 + 5.8e-6 * f);
        const w = 2 * Math.PI * lf / sampleRate;
        delay = sampleRate / lf - Math.atan2(pole * Math.sin(w), 1 - pole * Math.cos(w)) / w - 1;
        if (delay > this.size - 2) delay = this.size - 2;
      }
      const p = pr.length > 1 ? pr[n] : pr[0];
      const breath = p + p * ng * (Math.random() * 2 - 1);
      this.lp = (1 - pole) * this.last + pole * this.lp;
      let temp = -this.lp;
      const dc = temp - this.dcx + 0.99 * this.dcy; this.dcx = temp; this.dcy = dc; temp = dc;
      this.jet[this.w] = breath - 0.5 * temp;
      const j = this.read(this.jet, delay * 0.32);
      let jt = j * (j * j - 1);
      if (jt > 1) jt = 1; else if (jt < -1) jt = -1;
      this.bore[this.w] = jt + 0.5 * temp;
      const o = this.read(this.bore, delay);
      this.w = (this.w + 1) % this.size;
      this.last = o;
      out[n] = 0.3 * o;
    }
    return this.alive;
  }
}
registerProcessor("shimshal", ShimshalProcessor);
`;

let shimshalReady = false;
function loadShimshal(c: AudioContext) {
  if (!c.audioWorklet) return;
  const url = URL.createObjectURL(new Blob([SHIMSHAL_WORKLET], { type: "application/javascript" }));
  c.audioWorklet.addModule(url).then(() => { shimshalReady = true; }).catch(() => {}).finally(() => URL.revokeObjectURL(url));
}

/** Breath pressure where the tone speaks well (it catches at ~0.9, breaks up past ~1.4). */
const P_SOFT = 1.02;
const P_FULL = 1.26;

class Shimshal {
  private node: AudioWorkletNode | null = null;
  private freq!: AudioParam;
  private press!: AudioParam;
  private vol!: GainNode;
  private airAmp!: GainNode;
  private airBand!: BiquadFilterNode;
  private vibLfo!: OscillatorNode;
  private vibPress!: GainNode;
  private vibPitch!: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private last: number;
  private dest: AudioNode;

  constructor(t: number, startFreq: number, dest: AudioNode) {
    this.dest = dest;
    this.last = startFreq;
    const a = audio();
    if (!a || !shimshalReady) return; // stays silent until the model has loaded

    this.node = new AudioWorkletNode(a.ctx, "shimshal", { numberOfInputs: 0, outputChannelCount: [1] });
    this.freq = this.node.parameters.get("frequency")!;
    this.press = this.node.parameters.get("pressure")!;
    this.freq.value = startFreq;
    this.press.value = 0;

    // Tube → remove DC → a touch of cane body and edge presence → volume.
    const hp = a.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 120;
    const body = a.ctx.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 1600; body.Q.value = 0.8; body.gain.value = 2.5;
    const edge = a.ctx.createBiquadFilter(); edge.type = "peaking"; edge.frequency.value = 4200; edge.Q.value = 1.2; edge.gain.value = 3;
    const lp = a.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
    this.vol = a.ctx.createGain(); this.vol.gain.value = 0.2;
    this.node.connect(hp); hp.connect(body); body.connect(edge); edge.connect(lp); lp.connect(this.vol);
    this.vol.connect(out(1, 0.55, dest));

    // Air escaping past the lips — heard most on attacks and phrase ends.
    const air = a.ctx.createBufferSource();
    air.buffer = a.noise; air.loop = true;
    this.airBand = a.ctx.createBiquadFilter();
    this.airBand.type = "bandpass"; this.airBand.Q.value = 4; this.airBand.frequency.value = startFreq * 2;
    const hiss = a.ctx.createBiquadFilter(); hiss.type = "highpass"; hiss.frequency.value = 4500;
    const hissG = a.ctx.createGain(); hissG.gain.value = 0.35;
    this.airAmp = a.ctx.createGain(); this.airAmp.gain.value = 0;
    air.connect(this.airBand); this.airBand.connect(this.airAmp);
    air.connect(hiss); hiss.connect(hissG); hissG.connect(this.airAmp);
    this.airAmp.connect(out(1, 0.4, dest));
    air.start(t);
    this.sources.push(air);

    // Vibrato is mostly breath pulsing (as on real flutes), plus a little pitch.
    this.vibLfo = a.ctx.createOscillator(); this.vibLfo.frequency.value = 5.2;
    this.vibPress = a.ctx.createGain(); this.vibPress.gain.value = 0;
    this.vibPitch = a.ctx.createGain(); this.vibPitch.gain.value = 0;
    this.vibLfo.connect(this.vibPress); this.vibPress.connect(this.press);
    this.vibLfo.connect(this.vibPitch); this.vibPitch.connect(this.freq);
    this.vibLfo.start(t);
    this.sources.push(this.vibLfo);

    // A player's breath and pitch are never perfectly still.
    for (const [rate, depth, target] of [[0.23, 0.012, this.press], [2.9, 0.008, this.press], [0.31, startFreq * 0.003, this.freq], [0.7, startFreq * 0.0015, this.freq]] as const) {
      const d = a.ctx.createOscillator();
      d.frequency.value = rate * (0.8 + Math.random() * 0.4);
      const g = a.ctx.createGain(); g.gain.value = depth;
      d.connect(g); g.connect(target);
      d.start(t);
      this.sources.push(d);
    }
  }

  /** False while the worklet was still loading when this voice was made. */
  get live() { return this.node !== null; }

  private pitch(t: number, f: number, tc: number) {
    if (!this.node) return;
    this.freq.setTargetAtTime(f, t, tc);
    this.airBand.frequency.setTargetAtTime(f * 2, t, tc);
    this.last = f;
  }

  /** One note of `dur` seconds. `fresh` = first note after a breath. */
  note(t: number, freq: number, dur: number, level: number, opts: { fresh?: boolean; graces?: number[]; fall?: boolean; taper?: boolean } = {}) {
    if (!this.node) return;
    // `level` (≈0.06–0.12) sets both how hard the player blows and the loudness.
    const push = Math.min(1, Math.max(0, (level - 0.05) / 0.07)) * (0.85 + Math.random() * 0.3);
    const p = Math.min(P_FULL, P_SOFT + (P_FULL - P_SOFT) * push);
    const air = 0.03 + level * 0.25;
    this.vol.gain.setTargetAtTime(level * 3.4, t, 0.05);

    if (opts.fresh) {
      // The breath arrives before the tone: a puff of air, then the note catches.
      this.airAmp.gain.setTargetAtTime(air * 3, t, 0.006);
      this.airAmp.gain.setTargetAtTime(air, t + 0.06, 0.07);
      this.press.setTargetAtTime(p * 1.05, t, 0.025);
      this.press.setTargetAtTime(p, t + 0.09, 0.05);
      this.freq.setValueAtTime(freq * 0.96, t);
      this.pitch(t + 0.02, freq, 0.035);
    } else {
      // Slurred: a small breath push, fingers move.
      this.press.setTargetAtTime(Math.min(1.36, p * 1.04), t, 0.012);
      this.press.setTargetAtTime(p, t + 0.05, 0.04);
      this.airAmp.gain.setTargetAtTime(air * 1.6, t, 0.01);
      this.airAmp.gain.setTargetAtTime(air, t + 0.05, 0.05);
      let at = t;
      for (const gf of opts.graces ?? []) { this.pitch(at, gf, 0.005); at += 0.05; }
      if (!opts.graces?.length && freq > this.last) {
        this.pitch(at, freq * 0.988, 0.01);
        this.pitch(at + 0.035, freq, 0.025);
      } else {
        this.pitch(at, freq, 0.012);
      }
    }

    // Lean into long notes.
    if (dur > 0.6) this.press.setTargetAtTime(Math.min(1.34, p * 1.05), t + 0.2, dur * 0.3);

    // Vibrato blooms only on held notes, at a slightly unsteady rate.
    this.vibPress.gain.setTargetAtTime(0, t, 0.02);
    this.vibPitch.gain.setTargetAtTime(0, t, 0.02);
    this.vibLfo.frequency.setTargetAtTime(4.6 + Math.random() * 1.3, t, 0.2);
    if (dur > 0.45) {
      const depth = 0.5 + Math.random() * 0.5;
      this.vibPress.gain.setTargetAtTime(0.045 * depth, t + 0.28, 0.2);
      this.vibPitch.gain.setTargetAtTime(freq * 0.006 * depth, t + 0.28, 0.2);
    }

    if (opts.fall) {
      // The lawik sob: pitch sags while the breath gives out — the tone thins
      // to air and dies on its own as pressure drops below where it can speak.
      const at = t + dur * 0.5;
      this.freq.setTargetAtTime(freq * 0.93, at, dur * 0.2);
      this.airBand.frequency.setTargetAtTime(freq * 1.86, at, dur * 0.2);
      this.press.setTargetAtTime(0.6, at + dur * 0.1, dur * 0.2);
      this.airAmp.gain.setTargetAtTime(air * 1.8, at, 0.1);
      this.airAmp.gain.setTargetAtTime(0, at + dur * 0.35, 0.08);
    } else if (opts.taper) {
      this.press.setTargetAtTime(0, t + dur * 0.72, dur * 0.1);
      this.airAmp.gain.setTargetAtTime(0, t + dur * 0.75, dur * 0.1);
    }
  }

  /** Finger trill between `base` and `upper`, slightly uneven like a real hand. */
  trill(t: number, base: number, upper: number, dur: number, rate = 0.06) {
    if (!this.node) return;
    let at = t, up = true;
    while (at < t + dur) {
      this.pitch(at, up ? upper : base, 0.006);
      up = !up;
      at += rate * (0.85 + Math.random() * 0.3);
    }
    this.pitch(at, base, 0.01);
  }

  /** Stop blowing and take an audible breath. */
  breathe(t: number) {
    const a = audio(); if (!a || !this.node) return;
    this.press.setTargetAtTime(0, t, 0.03);
    this.airAmp.gain.setTargetAtTime(0, t, 0.04);
    this.vibPress.gain.setTargetAtTime(0, t, 0.05);
    this.vibPitch.gain.setTargetAtTime(0, t, 0.05);
    const src = noise(t + 0.1, 0.5);
    const bp = a.ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 0.7;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.016, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.58);
    src.connect(bp); bp.connect(g); g.connect(out(1, 0.3, this.dest));
  }

  stop(t: number) {
    const a = audio(); if (!a || !this.node) return;
    const node = this.node;
    this.press.cancelScheduledValues(t);
    this.press.setTargetAtTime(0, t, 0.05);
    this.airAmp.gain.cancelScheduledValues(t);
    this.airAmp.gain.setTargetAtTime(0, t, 0.05);
    this.sources.forEach(o => { try { o.stop(t + 0.6); } catch { /* already stopped */ } });
    const ms = Math.max(0, (t - a.ctx.currentTime + 0.8) * 1000);
    setTimeout(() => { node.port.postMessage("stop"); node.disconnect(); }, ms);
  }
}

/** Tilîlî — the wedding ululation, synthesised as a trilled high voice. */
function tilili(t: number, dur = 1.5, vol = 0.05) {
  const a = audio(); if (!a) return;
  const o = a.ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(780, t);
  o.frequency.linearRampToValueAtTime(860, t + dur * 0.7);
  o.frequency.linearRampToValueAtTime(700, t + dur);

  // The tongue flicking "li-li-li" ≈ 7 times a second.
  const lfo = a.ctx.createOscillator();
  lfo.type = "triangle"; lfo.frequency.value = 7.2;
  const fm = a.ctx.createGain(); fm.gain.value = 55;
  lfo.connect(fm); fm.connect(o.frequency);
  const am = a.ctx.createGain(); am.gain.value = 0.55;
  const amDepth = a.ctx.createGain(); amDepth.gain.value = 0.45;
  lfo.connect(amDepth); amDepth.connect(am.gain);

  // Vowel formants of an "ee".
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.12);
  env.gain.setValueAtTime(vol, t + dur - 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [f, q, lvl] of [[1300, 3, 1], [2900, 4, 0.7], [3600, 5, 0.3]]) {
    const bp = a.ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    const bg = a.ctx.createGain(); bg.gain.value = lvl * 3;
    am.connect(bp); bp.connect(bg); bg.connect(env);
  }
  o.connect(am);
  env.connect(out(1, 0.55));
  o.start(t); lfo.start(t);
  o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}

/** Creates the audio context early so the shimshal model is loaded in time. */
export function warmUpKllawenAudio() { audio(); }

/* ── Sound effects ───────────────────────────────────────────────────── */

export function playHatSelect() {
  const a = audio(); if (!a) return;
  const t = a.ctx.currentTime;
  tek(t, 0.14);
  tembur(t + 0.01, deg(4), 0.07, 0.3);
}

/** An empty hat is lifted. `emptiesSoFar` (1-based) raises the pitch. */
export function playHatEmpty(emptiesSoFar: number) {
  const a = audio(); if (!a) return;
  const t = a.ctx.currentTime;
  whoosh(t, 0.3, 0.26);
  dafBoom(t + 0.03, 0.22);
  // A tembûr "hammer-on" figure that climbs Bayati as the hats run out.
  const step = 3 + Math.min(emptiesSoFar, 9);
  tembur(t + 0.15, deg(step + 1), 0.13, 0.25);
  tembur(t + 0.22, deg(step), 0.17, 0.7);
}

export type RevealKind = "found" | "cut" | "fail";

/** The round's final hat comes up. */
export function playRingReveal(kind: RevealKind) {
  const a = audio(); if (!a) return;
  const t = a.ctx.currentTime;
  whoosh(t, 0.42, 0.34, 300, 3200);

  if (kind === "fail") {
    dum(t + 0.2, 0.85);
    // A shimshal lament in maqam Kurd that sobs at the end.
    const k = (n: number) => deg(n, D5, KURD);
    const f = new Shimshal(t + 0.3, k(4), a.master);
    let at = t + 0.35;
    const phrase: [number, number][] = [[4, 0.3], [3, 0.26], [2, 0.26], [1, 0.4]];
    phrase.forEach(([n, len], i) => { f.note(at, k(n), len, 0.11, { fresh: i === 0 }); at += len; });
    f.note(at, k(0), 1, 0.1, { fall: true });
    f.stop(at + 1.3);
    dum(at, 0.5);
    dafBoom(at + 0.9, 0.2);
    return;
  }

  // The ring glints: dahol hit, daf roll, rising bells in Bayati.
  dum(t + 0.22, 0.85);
  tek(t + 0.22, 0.2);
  const roll = kind === "found" ? 12 : 6;
  for (let i = 0; i < roll; i++) dafJingle(t + 0.24 + i * 0.05, 0.05 + i * 0.004);
  const arp = kind === "found" ? [7, 9, 11, 14, 16, 18, 21] : [7, 9, 11, 14];
  arp.forEach((s, i) => bell(t + 0.28 + i * 0.075, deg(s), 0.11, 1.3));

  if (kind === "cut") {
    // Found on the very first hat — nice, but no points: a short tembûr nod.
    [4, 5, 4].forEach((s, i) => tembur(t + 0.6 + i * 0.13, deg(s + 7), 0.13, i === 2 ? 0.9 : 0.3));
    dafBoom(t + 0.86, 0.25);
    return;
  }

  // Shimshal fanfare: run up, trill on the octave, fall home — over a dahol beat.
  const f = new Shimshal(t + 0.4, deg(3, D5), a.master);
  let at = t + 0.42;
  for (const n of [3, 4, 5, 6]) { f.note(at, deg(n, D5), 0.07, 0.11, { fresh: n === 3 }); at += 0.07; }
  f.note(at, deg(7, D5), 0.6, 0.12);
  f.trill(at + 0.14, deg(7, D5), deg(8, D5), 0.38);
  at += 0.6;
  f.note(at, deg(6, D5), 0.16, 0.11, { graces: [deg(7, D5)] }); at += 0.16;
  f.note(at, deg(5, D5), 0.16, 0.11); at += 0.16;
  f.note(at, deg(4, D5), 0.8, 0.11, { graces: [deg(5, D5)], taper: true });
  f.stop(at + 1);

  const beat = 0.21;
  const b0 = t + 0.42;
  [[0, "D"], [1, "T"], [1.5, "T"], [2, "D"], [3, "T"], [4, "D"], [5, "T"], [5.5, "T"], [6, "D"], [7, "D"]].forEach(([n, h]) => {
    const when = b0 + (n as number) * beat;
    if (h === "D") dum(when, 0.55); else tek(when, 0.18);
    dafJingle(when, 0.05);
  });
  tilili(t + 0.75, 1.6, 0.045);
}

/** One second of the intro countdown. `secondsLeft` is the number on screen:
 *  the note climbs as it falls and the drums join for the last three. */
export function playCountdownTick(secondsLeft: number) {
  const a = audio(); if (!a) return;
  const t = a.ctx.currentTime;
  const urgent = secondsLeft <= 3;
  tek(t, urgent ? 0.2 : 0.14);
  dafJingle(t, urgent ? 0.07 : 0.045);
  bell(t + 0.01, deg(7 + Math.max(0, 5 - secondsLeft)), urgent ? 0.13 : 0.1, 0.9);
  if (urgent) dafBoom(t, 0.18 + (3 - secondsLeft) * 0.05);
  if (secondsLeft === 1) dum(t, 0.5);
}

/** The countdown hits zero and play opens. */
export function playCountdownGo() {
  const a = audio(); if (!a) return;
  const t = a.ctx.currentTime;
  dum(t, 0.85);
  dafBoom(t, 0.3);
  tek(t + 0.01, 0.2);
  for (let i = 0; i < 6; i++) dafJingle(t + 0.02 + i * 0.045, 0.06 - i * 0.006);
  [0, 4, 7].forEach((s, i) => tembur(t + i * 0.03, deg(s + 7), 0.13, 0.9));
  bell(t + 0.04, deg(14), 0.09, 1.2);
}

/** A short govend burst for the end of the game. */
export function playKurdishVictory() {
  const a = audio(); if (!a) return;
  const t = a.ctx.currentTime + 0.05;
  const sixteenth = 60 / 138 / 4;
  const f = new Shimshal(t, deg(4, D5), a.master);
  const phrase = [...GOVEND_A, ...GOVEND_B];
  for (let s = 0; s < phrase.length * 2; s++) {
    const at = t + s * sixteenth;
    playDahol(at, s % 8, 7);
    if (s % 2 === 0) dafJingle(at, 0.06);
    if (s % 2 === 0) playFlute(f, at, phrase, s / 2, sixteenth * 2, 0.1, true, 0.015);
  }
  const end = t + phrase.length * 2 * sixteenth;
  f.note(end, deg(7, D5), 1.1, 0.12, { fresh: true, taper: true });
  f.trill(end + 0.15, deg(7, D5), deg(8, D5), 0.6);
  f.stop(end + 1.3);
  dum(end, 0.8);
  dafBoom(end, 0.3);
  tilili(t + 0.2, 1.8, 0.04);
  tilili(end - 0.4, 1.6, 0.045);
}

/* ── Adaptive music ──────────────────────────────────────────────────── */

export type MusicMode = "hiding" | "seeking";

/** Melody events, one per eighth note: scale step, null = rest, "~" = hold. */
type Ev = number | null | "~";
// Govend tune — hovers G–A and falls home to D, as the line dances.
const GOVEND_A: Ev[] = [4, 3, 4, 5, 4, "~", 3, 2, 3, 2, 3, 4, 2, 1, 0, null];
// Higher answer phrase once the tension is up.
const GOVEND_B: Ev[] = [7, 6, 5, 6, 7, "~", 5, 4, 5, 4, 3, 4, 2, 1, 0, null];
// Lawik — a slow, free shepherd's song while the ring is hidden. Starts high,
// lingers on the quarter-tone E½♭ (step 1) and sinks home to D, with rests to breathe.
const LAWIK: Ev[] = [
  5, "~", "~", 4, "~", 3, 4, "~", "~", "~", 3, 2, "~", 1, "~", "~", 0, "~", "~", "~", null, null,
  2, 3, 4, "~", "~", 5, 6, "~", 5, 4, "~", "~", 3, "~", 4, 3, 2, "~", "~", null,
  1, 2, 1, "~", "~", 0, "~", "~", "~", "~", null, null, null,
];

/** Plays one melody event on the shimshal, reading ahead for note length,
 *  phrase ends and breaths, with loose timing and varied ornaments.
 *  `sob`: phrase ends sag in pitch (lawik) instead of just tapering (dance). */
function playFlute(
  f: Shimshal, t: number, phrase: Ev[], i: number, eighth: number,
  level: number, ornaments: boolean, rubato: number, sob = false,
) {
  const n = phrase.length;
  const ev = phrase[i % n];
  const prev = phrase[(i - 1 + n) % n];
  if (ev === "~") return;
  if (ev === null) { if (prev !== null) f.breathe(t); return; }
  let holds = 0;
  while (phrase[(i + 1 + holds) % n] === "~") holds++;
  const end = phrase[(i + 1 + holds) % n] === null;
  const dur = (1 + holds) * eighth;
  const freq = deg(ev, D5);
  const r = Math.random();
  const graces = !ornaments ? undefined
    : (holds >= 1 || i % 4 === 0) && r < 0.3 ? [deg(ev + 1, D5)]
    : holds >= 2 && r < 0.5 ? [deg(ev + 1, D5), freq, deg(ev - 1, D5)]
    : undefined;
  f.note(t + Math.random() * rubato, freq, dur, level, {
    fresh: prev === null, graces, fall: end && sob, taper: end && !sob,
  });
}

/** Halparke dahol pattern on a 2/4 bar of 8 sixteenths. */
function playDahol(t: number, pos: number, lvl: number, dest?: AudioNode) {
  if (pos === 0) dum(t, 0.3 + lvl * 0.015, dest);
  else if (pos === 4) dum(t, 0.32 + lvl * 0.01, dest);
  else if (pos === 2 || pos === 3 || pos === 6) tek(t, 0.14 + lvl * 0.008, dest);
  else if (lvl >= 6 && (pos === 5 || pos === 7)) tek(t, 0.07, dest);
}

class Music {
  private mode: MusicMode | null = null;
  private intensity = 0;
  private bus: GainNode | null = null;
  private drone: OscillatorNode[] = [];
  private dance: Shimshal | null = null;
  private flute: Shimshal | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;

  start(mode: MusicMode) {
    const a = audio(); if (!a) return;
    if (this.mode === mode) return;
    this.stop(0.4);
    this.mode = mode;
    this.step = 0;
    const t = a.ctx.currentTime;

    this.bus = a.ctx.createGain();
    this.bus.gain.setValueAtTime(0.0001, t);
    this.bus.gain.exponentialRampToValueAtTime(1, t + 1);
    this.bus.connect(a.master);

    // Dozale-style drone: low D and A, breathing slowly.
    const lp = a.ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = mode === "hiding" ? 420 : 650; lp.Q.value = 3;
    const lfo = a.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoAmt = a.ctx.createGain(); lfoAmt.gain.value = 180;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);
    const dg = a.ctx.createGain(); dg.gain.value = mode === "hiding" ? 0.06 : 0.04;
    lp.connect(dg); dg.connect(this.bus);
    const send = a.ctx.createGain(); send.gain.value = 0.5;
    dg.connect(send); send.connect(a.reverb);
    this.drone = [lfo];
    for (const [f, d] of [[D3 / 2, -5], [D3 / 2, 5], [D3 * 0.75, 0]] as const) {
      const o = a.ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d;
      o.connect(lp); o.start(t);
      this.drone.push(o);
    }
    lfo.start(t);

    if (mode === "hiding") this.flute = new Shimshal(t, deg(5, D5), this.bus);

    this.nextTime = t + 0.15;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  /** 0..9 — empty hats so far. Speeds up the dance and adds instruments. */
  setIntensity(n: number) { this.intensity = Math.max(0, Math.min(9, n)); }

  private sixteenth() {
    const bpm = this.mode === "hiding" ? 66 : 100 + this.intensity * 6;
    return 60 / bpm / 4;
  }

  private schedule() {
    const a = audio(); if (!a || !this.mode || !this.bus) return;
    while (this.nextTime < a.ctx.currentTime + 0.12) {
      this.playStep(this.nextTime, this.step);
      this.nextTime += this.sixteenth();
      this.step++;
    }
  }

  private playStep(t: number, s: number) {
    const bus = this.bus!;
    const pos = s % 8;

    if (this.mode === "hiding") {
      // Sneaky: a slow heartbeat under a shimshal lawik.
      if (s % 8 === 0) heartbeat(t, 0.55, bus);
      if (s % 16 === 0) dafJingle(t + 0.01, 0.025, bus);
      if (!this.flute?.live && shimshalReady) this.flute = new Shimshal(t, deg(5, D5), bus);
      if (s % 2 === 0 && this.flute) playFlute(this.flute, t, LAWIK, s / 2, this.sixteenth() * 2, 0.075, true, 0.045, true);
      return;
    }

    const lvl = this.intensity;
    // The heartbeat drives the dance: one lub-dub per bar, so it races as the
    // tempo climbs, and beats twice per bar once only a few hats are left.
    if (pos === 0 || (lvl >= 7 && pos === 4)) heartbeat(t, 0.6 + lvl * 0.03, bus);
    playDahol(t, pos, lvl, bus);
    if (pos % 2 === 0) dafJingle(t, 0.04 + lvl * 0.004, bus);
    else if (lvl >= 4) dafJingle(t, 0.02, bus);

    if (s % 2 !== 0) return;
    const i = s / 2;
    const phrase = lvl >= 6 ? GOVEND_B : GOVEND_A;
    const ev = phrase[i % phrase.length];
    // Tembûr always carries the tune.
    if (typeof ev === "number") tembur(t, deg(ev), 0.08, 0.35, bus, 0.3);

    // The shimshal joins once three hats are gone and gets showier near the end.
    if (lvl >= 3) {
      if (!this.dance?.live) this.dance = new Shimshal(t, deg(4, D5), bus);
      playFlute(this.dance, t, phrase, i, this.sixteenth() * 2, 0.065 + (lvl - 3) * 0.006, lvl >= 5, 0.02);
      const next = phrase[(i + 1) % phrase.length];
      if (lvl >= 8 && typeof ev === "number" && next === "~") {
        this.dance.trill(t + 0.08, deg(ev, D5), deg(ev + 1, D5), this.sixteenth() * 2.5);
      }
    }
  }

  stop(fade = 0.25) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.mode = null;
    this.intensity = 0;
    const a = ctx;
    const bus = this.bus;
    const voices = [...this.drone];
    const winds = [this.dance, this.flute].filter(Boolean) as Shimshal[];
    this.bus = null;
    this.drone = [];
    this.dance = null;
    this.flute = null;
    if (!a || !bus) return;
    const t = a.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    voices.forEach(o => { try { o.stop(t + fade + 0.05); } catch { /* already stopped */ } });
    winds.forEach(w => w.stop(t + fade));
    setTimeout(() => bus.disconnect(), (fade + 0.6) * 1000);
  }
}

export const kllawenMusic = new Music();
