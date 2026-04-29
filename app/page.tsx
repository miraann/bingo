"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music, Music2,
  Bell, BellOff,
  Play, Pause,
  RotateCcw,
  Timer,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────────────────────── */

const GROUPS = [
  { letter: "B", start: 1,  bg: "bg-blue-600",  calledBg: "bg-blue-600",  border: "border-blue-400",   text: "text-blue-700",  hex: "#2563eb" },
  { letter: "I", start: 16, bg: "bg-red-600",   calledBg: "bg-red-600",   border: "border-red-400",    text: "text-red-700",   hex: "#dc2626" },
  { letter: "N", start: 31, bg: "bg-violet-600",calledBg: "bg-violet-600",border: "border-violet-400", text: "text-violet-700",hex: "#7c3aed" },
  { letter: "G", start: 46, bg: "bg-green-600", calledBg: "bg-green-600", border: "border-green-400",  text: "text-green-700", hex: "#16a34a" },
  { letter: "O", start: 61, bg: "bg-orange-500",calledBg: "bg-orange-500",border: "border-orange-400", text: "text-orange-600",hex: "#f97316" },
] as const;

const TIMER_PRESETS = [10, 15, 30] as const;

function groupOf(n: number) {
  return GROUPS[Math.min(Math.floor((n - 1) / 15), 4)];
}

/* ─────────────────────────────────────────────────────────────────────────────
   IconToggle
───────────────────────────────────────────────────────────────────────────── */

function IconToggle({
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  label,
  active,
  onClick,
  activeClass = "bg-purple-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.45)]",
}: {
  activeIcon: React.ElementType;
  inactiveIcon?: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass?: string;
}) {
  const Icon = active ? ActiveIcon : (InactiveIcon ?? ActiveIcon);
  return (
    <motion.button
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1 px-4 py-2 md:px-5 md:py-2.5
        rounded-2xl cursor-pointer select-none transition-all duration-200
        ${active ? activeClass : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"}
      `}
    >
      <Icon size={22} strokeWidth={2} />
      <span className="text-[11px] font-bold tracking-wide">{label}</span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────────────────────────────────────── */

export default function BingoDashboard() {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const [calledSet,    setCalledSet]    = useState<Set<number>>(new Set());
  const [current,      setCurrent]      = useState<number | null>(null);
  const [history,      setHistory]      = useState<number[]>([]);
  const [pool,         setPool]         = useState<number[]>(() =>
    Array.from({ length: 75 }, (_, i) => i + 1)
  );
  const [autoOn,       setAutoOn]       = useState(false);
  const [musicOn,      setMusicOn]      = useState(false);
  const [ringOn,       setRingOn]       = useState(true);
  const [busy,         setBusy]         = useState(false);
  const [autoInterval, setAutoInterval] = useState(10);
  const [customInput,  setCustomInput]  = useState("10");

  /* ── Refs ──────────────────────────────────────────────────────────────── */
  const bgMusicRef   = useRef<HTMLAudioElement | null>(null);
  const drawRef      = useRef<() => void>(() => {});
  const musicOnRef   = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Init bg music ─────────────────────────────────────────────────────── */
  useEffect(() => {
    bgMusicRef.current        = new Audio("/audio/bg-music.mp3");
    bgMusicRef.current.loop   = true;
    bgMusicRef.current.volume = 0.35;
    return () => { bgMusicRef.current?.pause(); };
  }, []);

  useEffect(() => { musicOnRef.current = musicOn; }, [musicOn]);

  useEffect(() => {
    const m = bgMusicRef.current;
    if (!m) return;
    if (musicOn) m.play().catch(() => {});
    else         m.pause();
  }, [musicOn]);

  /* ── Volume fade ───────────────────────────────────────────────────────── */
  const fadeBgMusic = useCallback((target: number, durationMs = 350) => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
    const start  = audio.volume;
    const steps  = 20;
    const stepMs = durationMs / steps;
    const delta  = (target - start) / steps;
    let   step   = 0;
    fadeTimerRef.current = setInterval(() => {
      step++;
      audio.volume = Math.min(1, Math.max(0, start + delta * step));
      if (step >= steps) {
        clearInterval(fadeTimerRef.current!);
        fadeTimerRef.current = null;
        audio.volume = target;
      }
    }, stepMs);
  }, []);

  /* ── Draw ──────────────────────────────────────────────────────────────── */
  const draw = useCallback(() => {
    if (busy || pool.length === 0) return;
    setBusy(true);
    const idx = Math.floor(Math.random() * pool.length);
    const n   = pool[idx];

    if (ringOn) {
      const ring  = new Audio("/audio/ring.mp3");
      ring.volume = 0.60;
      ring.play().catch(() => {});
    }

    setTimeout(() => {
      const voice  = new Audio(`/audio/${n}.mp3`);
      voice.volume = 1.0;
      if (musicOnRef.current) fadeBgMusic(0.05, 250);
      voice.play().catch(() => {});
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        if (musicOnRef.current) fadeBgMusic(0.35, 600);
      };
      voice.addEventListener("ended", restore, { once: true });
      setTimeout(restore, 6000);
    }, 500);

    setCurrent(n);
    setCalledSet(prev => { const s = new Set(prev); s.add(n); return s; });
    setHistory(prev => [n, ...prev]);
    setPool(prev => prev.filter((_, i) => i !== idx));
    setTimeout(() => setBusy(false), 900);
  }, [busy, pool, ringOn, fadeBgMusic]);

  drawRef.current = draw;

  /* ── Auto mode ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!autoOn || pool.length === 0) return;
    const t = setTimeout(() => drawRef.current(), autoInterval * 1000);
    return () => clearTimeout(t);
  }, [autoOn, pool.length, current, autoInterval]);

  /* ── Reset ─────────────────────────────────────────────────────────────── */
  const reset = () => {
    setCalledSet(new Set());
    setCurrent(null);
    setHistory([]);
    setPool(Array.from({ length: 75 }, (_, i) => i + 1));
    setAutoOn(false);
    setBusy(false);
  };

  const selectPreset    = (s: number) => { setAutoInterval(s); setCustomInput(String(s)); };
  const handleCustomInput = (raw: string) => {
    setCustomInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 3 && v <= 600) setAutoInterval(v);
  };

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const calledCount  = calledSet.size;
  const progress     = (calledCount / 75) * 100;
  const currentGroup = current != null ? groupOf(current) : GROUPS[1];

  /* ─────────────────────────────────────────────────────────────────────────
     Render
     Layout:  root = h-dvh flex-col
              top  = flex-none  (natural height)
              board = flex-1 min-h-0  (fills whatever remains)
              board rows = flex-1  (each gets exactly 1/5 of board height)
     This guarantees all 5 rows fit on ANY screen width × height.
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div
      dir="rtl"
      className="
        h-dvh bg-white flex flex-col items-center
        px-2 md:px-3 pt-2 pb-1 overflow-x-hidden
      "
    >
      {/* ════════════════════════════════════════════════════════════════════
          TOP SECTION — flex-none so it never compresses the board
          Mobile flex-col: Ball → Controls → Toggles
          md+ flex-row RTL: [Draw] [Ball] [Music/Ring]
      ════════════════════════════════════════════════════════════════════ */}
      <div className="
        flex-none w-full max-w-[1800px]
        flex flex-col md:flex-row items-center justify-center
        gap-2 md:gap-5 lg:gap-10 xl:gap-16
        mb-1 md:mb-2
      ">

        {/* ── DRAW PANEL ── */}
        <div className="order-2 md:order-1 flex flex-col items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.93 }}
              onClick={draw}
              disabled={busy || pool.length === 0}
              className={`
                bg-purple-600 text-white font-black rounded-2xl
                shadow-[0_6px_24px_rgba(124,58,237,0.45)]
                transition-colors duration-200
                text-base md:text-xl xl:text-2xl
                px-5 md:px-7 xl:px-9 py-2.5 md:py-3.5 xl:py-4
                ${busy || pool.length === 0
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-purple-700 active:bg-purple-800 cursor-pointer"}
              `}
            >
              ڕاکێشانی تۆپ
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.12, rotate: -35 }}
              whileTap={{ scale: 0.88 }}
              onClick={reset}
              title="ریست کردنەوە"
              className="
                w-10 h-10 flex-shrink-0 rounded-xl
                bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500
                flex items-center justify-center transition-colors duration-200
              "
            >
              <RotateCcw size={18} strokeWidth={2.5} />
            </motion.button>
          </div>

          <IconToggle
            activeIcon={Pause} inactiveIcon={Play}
            label="خۆکار" active={autoOn}
            onClick={() => setAutoOn(v => !v)}
            activeClass="bg-purple-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.40)]"
          />

          {/* Timer settings */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1 text-gray-400">
              <Timer size={11} strokeWidth={2.5} />
              <span className="text-[10px] font-bold tracking-widest uppercase">ئینتێرڤاڵ</span>
            </div>
            <div className="flex gap-1.5" dir="ltr">
              {TIMER_PRESETS.map(s => (
                <motion.button
                  key={s} whileTap={{ scale: 0.92 }}
                  onClick={() => selectPreset(s)}
                  className={`
                    px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer
                    transition-all duration-200
                    ${autoInterval === s
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
                  `}
                >
                  {s}s
                </motion.button>
              ))}
            </div>
            <div className="flex items-center gap-1.5" dir="ltr">
              <input
                type="number" min="3" max="600" value={customInput}
                onChange={e => handleCustomInput(e.target.value)}
                className="
                  w-14 text-center border-2 border-gray-200 rounded-xl
                  text-xs font-bold py-1
                  focus:border-purple-400 focus:outline-none transition-colors
                "
              />
              <span className="text-[11px] text-gray-400 font-semibold">s</span>
            </div>
          </div>
        </div>

        {/* ── BALL ── */}
        <div className="order-1 md:order-2 flex flex-col items-center gap-2 flex-shrink-0">
          <div className="relative">
            {/* Breathing glow */}
            <motion.div
              animate={{
                backgroundColor: currentGroup.hex,
                scale:   [1.08, 1.28, 1.08],
                opacity: [0.20, 0.36, 0.20],
              }}
              transition={{
                backgroundColor: { duration: 0.6,  ease: "easeInOut" },
                scale:           { duration: 2.6,  repeat: Infinity, ease: "easeInOut" },
                opacity:         { duration: 2.6,  repeat: Infinity, ease: "easeInOut" },
              }}
              className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
            />
            {/* Circle */}
            <motion.div
              animate={{
                backgroundColor: currentGroup.hex,
                scale: busy ? 1.06 : 1,
              }}
              transition={{
                backgroundColor: { duration: 0.55, ease: "easeInOut" },
                scale:           { duration: 0.45, ease: "easeInOut" },
              }}
              className="
                relative flex items-center justify-center
                w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-72 xl:h-72 2xl:w-64 2xl:h-64
                rounded-full
                border-[7px] sm:border-[8px] md:border-[10px] lg:border-[11px] xl:border-[12px]
                border-yellow-400 shadow-2xl
              "
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <AnimatePresence mode="wait">
                {current != null ? (
                  <motion.div
                    key={current}
                    initial={{ opacity: 0, scale: 0.35, y: 30  }}
                    animate={{ opacity: 1, scale: 1,    y: 0   }}
                    exit={  { opacity: 0, scale: 1.4,   y: -30 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24 }}
                    className="flex flex-col items-center leading-none"
                  >
                    <span className="
                      text-white font-black tracking-tighter
                      drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]
                      text-[2.8rem] sm:text-[3.5rem] md:text-[4.2rem] lg:text-[5.5rem] xl:text-[6.5rem] 2xl:text-[5.5rem]
                    ">
                      {current}
                    </span>
                    <span className="text-yellow-300 font-black -mt-1 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-6xl">
                      {groupOf(current).letter}
                    </span>
                  </motion.div>
                ) : (
                  <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-white/25 font-black text-5xl lg:text-7xl">?</motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 w-40 sm:w-48 md:w-56 lg:w-64 xl:w-72 2xl:w-64" dir="ltr">
            <span className="text-gray-500 text-xs font-mono w-5 text-right tabular-nums">{calledCount}</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-red-500"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-gray-400 text-xs font-mono">75</span>
          </div>

          {/* History strip */}
          <AnimatePresence>
            {history.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1" dir="ltr"
              >
                {history.slice(1, 8).map((n, i) => {
                  const g = groupOf(n);
                  return (
                    <motion.div
                      key={`h-${n}-${i}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: Math.max(0.2, 1 - i * 0.13), scale: 1 }}
                      className={`w-7 h-7 rounded-md ${g.calledBg} text-white flex items-center justify-center text-xs font-black shadow-sm`}
                    >
                      {n}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Celebration */}
          <AnimatePresence>
            {pool.length === 0 && (
              <motion.p
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                className="text-green-600 font-black text-sm md:text-base"
              >
                🎉 هەموو تۆپەکان ڕاکێشران!
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── MUSIC / RING ── */}
        <div className="order-3 flex flex-row md:flex-col gap-2 items-center justify-center w-full md:w-auto">
          <IconToggle
            activeIcon={Music2} inactiveIcon={Music} label="میوزیك" active={musicOn}
            onClick={() => setMusicOn(v => !v)}
            activeClass="bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.40)]"
          />
          <IconToggle
            activeIcon={Bell} inactiveIcon={BellOff} label="زەنگ" active={ringOn}
            onClick={() => setRingOn(v => !v)}
            activeClass="bg-amber-500 text-white shadow-[0_4px_14px_rgba(245,158,11,0.40)]"
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MASTER BOARD
          flex-1 min-h-0  →  fills all remaining viewport height exactly.
          Rows are flex-1  →  each row = 1/5 of board height, always.
          This guarantees B through O are always visible on any screen.
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 w-full max-w-[1800px] overflow-x-auto" dir="ltr">
        <div className="min-w-[480px] h-full flex flex-col gap-1 md:gap-1.5">
          {GROUPS.map((group) => (
            <div key={group.letter} className="flex-1 flex items-stretch gap-1 md:gap-1.5">

              {/* Letter label */}
              <div className={`
                w-8 sm:w-9 md:w-11 lg:w-12 xl:w-14 2xl:w-16
                ${group.bg} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm
              `}>
                <span className="text-white font-black text-sm md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl">
                  {group.letter}
                </span>
              </div>

              {/* 15 number cells — flex-1 width, height = row height (1/5 of board) */}
              {Array.from({ length: 15 }, (_, i) => {
                const n      = group.start + i;
                const called = calledSet.has(n);
                const isCurr = n === current;
                return (
                  <motion.div
                    key={n}
                    layout={false}
                    animate={
                      isCurr  ? { scale: [1, 1.22, 1.06], rotate: [0, -3, 3, 0] } :
                      called  ? { scale: [1, 1.10, 1] } : {}
                    }
                    transition={{ duration: 0.4 }}
                    className={`
                      bingo-cell flex-1 flex items-center justify-center
                      rounded-md md:rounded-lg
                      text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-black
                      ${isCurr
                        ? `${group.calledBg} text-white shadow-[inset_0_0_0_3px_#facc15] md:shadow-[inset_0_0_0_5px_#facc15]`
                        : called
                        ? `${group.calledBg} text-white shadow-sm`
                        : `bg-white border border-dashed md:border-2 ${group.border} ${group.text}`
                      }
                    `}
                  >
                    {n}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
