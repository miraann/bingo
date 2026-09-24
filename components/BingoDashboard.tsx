"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music, Music2,
  Bell, BellOff,
  Play, Pause,
  RotateCcw,
  Timer,
  Printer,
  Users,
  Flag,
  Zap,
  ZapOff,
  Eye,
  EyeOff,
  Trophy,
} from "lucide-react";
import { GROUPS, TIMER_PRESETS, groupOf, generateBingoCard, patternLabel } from "@/lib/bingo";
import { getOrCreateHostGameId, createNewHostGameId } from "@/lib/id";
import { useHostGame } from "@/hooks/useHostGame";
import { useBroadcastHostMode } from "@/hooks/useHostMode";
import { useWakeLock } from "@/hooks/useWakeLock";
import { QRPanel } from "@/components/QRPanel";
import { PlayerLobbyList } from "@/components/PlayerLobbyList";
import { WinnerModal } from "@/components/WinnerModal";
import { GameModeToggle, type HostMode } from "@/components/GameModeSelector";
import { IconToggle } from "@/components/IconToggle";
import type { BingoResultPayload } from "@/lib/gameChannel";

export function BingoDashboard({ mode, onModeChange }: { mode: HostMode; onModeChange: (mode: HostMode) => void }) {
  useWakeLock();

  /* ── Game id + realtime state ─────────────────────────────────────────── */
  const [gameId, setGameId] = useState("");
  useEffect(() => setGameId(getOrCreateHostGameId()), []);
  useBroadcastHostMode(gameId, "bingo");

  const {
    phase, players, calledNumbers, currentNumber, winners, connected,
    autoMarkEnabled, toggleAutoMark, hintsEnabled, toggleHints,
    startGame, endGame, drawNumber, resetGame,
  } = useHostGame(gameId);

  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    if (!gameId || typeof window === "undefined") return;
    setJoinUrl(`${window.location.origin}/play?gameId=${gameId}`);
  }, [gameId]);

  const handleNewGame = () => setGameId(createNewHostGameId());

  /* ── Local UI state ────────────────────────────────────────────────────── */
  const [autoOn,       setAutoOn]       = useState(false);
  const [musicOn,      setMusicOn]      = useState(false);
  const [ringOn,       setRingOn]       = useState(true);
  const [busy,         setBusy]         = useState(false);
  const [autoInterval, setAutoInterval] = useState(10);
  const [customInput,  setCustomInput]  = useState("10");
  const [isPrinting,   setIsPrinting]   = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<BingoResultPayload | null>(null);
  const [showPlayers,  setShowPlayers]  = useState(false);

  /* ── Refs ──────────────────────────────────────────────────────────────── */
  const bgMusicRef   = useRef<HTMLAudioElement | null>(null);
  const drawRef      = useRef<() => void>(() => {});
  const musicOnRef   = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const winnersSeenRef = useRef(0);

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

  /* ── Draw (delegates number selection + broadcast to the realtime hook) ── */
  const draw = useCallback(() => {
    if (busy) return;
    const n = drawNumber();
    if (n === null) return;
    setBusy(true);

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

    setTimeout(() => setBusy(false), 900);
  }, [busy, ringOn, fadeBgMusic, drawNumber]);

  drawRef.current = draw;

  /* ── Auto mode ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!autoOn || calledNumbers.length >= 75 || activeAnnouncement) return;
    const t = setTimeout(() => drawRef.current(), autoInterval * 1000);
    return () => clearTimeout(t);
  }, [autoOn, calledNumbers.length, currentNumber, autoInterval, activeAnnouncement]);

  /* ── Winner modal — pauses the game until the host acknowledges it ──────── */
  useEffect(() => {
    if (winners.length > winnersSeenRef.current) {
      const isFirstWinner = winnersSeenRef.current === 0;
      winnersSeenRef.current = winners.length;
      setAutoOn(false);
      setActiveAnnouncement(winners[winners.length - 1]);
      if (isFirstWinner) {
        const cheer = new Audio("/audio/win-cheer.wav");
        cheer.volume = 0.8;
        cheer.play().catch(() => {});
      }
    }
  }, [winners]);

  /* ── Reset ─────────────────────────────────────────────────────────────── */
  const reset = () => {
    resetGame();
    setAutoOn(false);
    setBusy(false);
  };

  const continueGame = () => setActiveAnnouncement(null);
  const newGameFromWinner = () => {
    setActiveAnnouncement(null);
    reset();
  };

  /* ── PDF Generator ────────────────────────────────────────────────────── */
  const generatePDF = async () => {
    setIsPrinting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const LETTERS = ["B","I","N","G","O"];
      const pageW = 215.9, pageH = 279.4;
      const mX = 8, mY = 10, gap = 5;
      const cardW = (pageW - 2*mX - gap) / 2;
      const cardH = (pageH - 2*mY - gap) / 2;
      const headerH = 13;
      const cellW = cardW / 5;
      const cellH = (cardH - headerH) / 5;

      for (let page = 0; page < 50; page++) {
        if (page > 0) doc.addPage();
        for (let ci = 0; ci < 4; ci++) {
          const x0 = mX + (ci % 2) * (cardW + gap);
          const y0 = mY + Math.floor(ci / 2) * (cardH + gap);
          const grid = generateBingoCard();

          // Header
          for (let c = 0; c < 5; c++) {
            const hx = x0 + c * cellW;
            doc.setFillColor(0, 0, 0);
            doc.rect(hx, y0, cellW, headerH, "F");
            if (c > 0) {
              doc.setDrawColor(255,255,255); doc.setLineWidth(0.3);
              doc.line(hx, y0, hx, y0 + headerH);
            }
            doc.setTextColor(255,255,255);
            doc.setFontSize(15); doc.setFont("helvetica","bold");
            doc.text(LETTERS[c], hx + cellW/2, y0 + headerH/2,
              { align:"center", baseline:"middle" } as Parameters<typeof doc.text>[3]);
          }

          // Cells
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              const cx = x0 + c * cellW;
              const cy = y0 + headerH + r * cellH;
              const val = grid[r][c];
              if (val === "FREE") {
                doc.setFillColor(220,220,220);
                doc.rect(cx, cy, cellW, cellH, "F");
                doc.setFontSize(9); doc.setFont("helvetica","bold");
                doc.setTextColor(60,60,60);
                doc.text("FREE", cx + cellW/2, cy + cellH/2,
                  { align:"center", baseline:"middle" } as Parameters<typeof doc.text>[3]);
              } else {
                doc.setFontSize(17); doc.setFont("helvetica","bold");
                doc.setTextColor(0,0,0);
                doc.text(String(val), cx + cellW/2, cy + cellH/2,
                  { align:"center", baseline:"middle" } as Parameters<typeof doc.text>[3]);
              }
              doc.setDrawColor(180,180,180); doc.setLineWidth(0.25);
              doc.rect(cx, cy, cellW, cellH);
            }
          }

          // Card border
          doc.setDrawColor(0,0,0); doc.setLineWidth(0.7);
          doc.rect(x0, y0, cardW, cardH);
        }
      }
      doc.save("bingo-cards-200.pdf");
    } finally {
      setIsPrinting(false);
    }
  };

  const selectPreset    = (s: number) => { setAutoInterval(s); setCustomInput(String(s)); };
  const handleCustomInput = (raw: string) => {
    setCustomInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 3 && v <= 600) setAutoInterval(v);
  };

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const calledSet    = new Set(calledNumbers);
  const calledCount  = calledSet.size;
  const progress     = (calledCount / 75) * 100;
  const currentGroup = currentNumber != null ? groupOf(currentNumber) : GROUPS[1];
  const history      = calledNumbers.slice(1, 8);

  const ConnectionBadge = (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"}`} />
      {connected ? "پەیوەستە" : "چاوەڕوانی پەیوەستبوون..."}
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════════
     LOBBY PHASE
  ═══════════════════════════════════════════════════════════════════════ */
  if (phase === "LOBBY") {
    return (
      <div dir="rtl" className="h-dvh bg-white overflow-y-auto">
        {/* min-h-full inner wrapper: centered when it fits, top stays reachable when it scrolls */}
        <div className="min-h-full flex flex-col items-center justify-center gap-5 sm:gap-6 px-4 py-6 sm:py-8 w-full max-w-5xl mx-auto">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-800">داشبۆردی بینگۆ</h1>
            {ConnectionBadge}
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 sm:gap-6 lg:gap-12 w-full">
            {gameId && joinUrl && (
              <div className="flex-shrink-0 lg:sticky lg:top-8">
                <QRPanel gameId={gameId} joinUrl={joinUrl} />
              </div>
            )}

            <div className="flex flex-col items-center gap-5 sm:gap-6 w-full max-w-md lg:max-w-lg lg:self-center">
              <PlayerLobbyList players={players} />

              <GameModeToggle mode={mode} onChange={onModeChange} />

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl px-8 py-3.5 text-lg shadow-[0_6px_24px_rgba(124,58,237,0.45)] cursor-pointer"
              >
                دەستپێکردنی یاری
              </motion.button>

              <button onClick={handleNewGame} className="text-xs text-gray-300 hover:text-gray-500 underline cursor-pointer">
                دروستکردنی یاریی نوێ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ENDED PHASE
  ═══════════════════════════════════════════════════════════════════════ */
  if (phase === "ENDED") {
    return (
      <div dir="rtl" className="min-h-dvh bg-white flex flex-col items-center justify-center gap-5 px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800">یاری تەواو بوو 🎉</h1>
        <div className="flex flex-col items-center gap-2 max-w-sm w-full">
          {winners.length === 0 && <p className="text-gray-400 text-sm">هیچ براوەیەک نەبوو</p>}
          {winners.map(w => (
            <div key={w.playerId} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 w-full">
              <span className="text-2xl">{w.emoji}</span>
              <span className="font-bold text-gray-700 flex-1">{w.name}</span>
              {w.pattern && <span className="text-xs text-amber-600 font-bold">{patternLabel(w.pattern)}</span>}
            </div>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
          onClick={resetGame}
          className="bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl px-8 py-3 shadow-lg cursor-pointer"
        >
          یاریی نوێ
        </motion.button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PLAYING PHASE
     Layout:  root = h-dvh flex-col
              top  = flex-none  (natural height)
              board = flex-1 min-h-0  (fills whatever remains)
              board rows = flex-1  (each gets exactly 1/5 of board height)
     This guarantees all 5 rows fit on ANY screen width × height.
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      dir="rtl"
      className="
        h-dvh bg-white flex flex-col items-center
        px-2 md:px-3 pt-2 pb-1 overflow-x-hidden
      "
    >
      <WinnerModal winner={activeAnnouncement} calledSet={calledSet} onContinue={continueGame} onNewGame={newGameFromWinner} />

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
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPlayers(v => !v)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <Users size={16} strokeWidth={2.5} />
              <span className="text-base font-bold">{players.length}</span>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"}`} />
                {connected ? "پەیوەستە" : "چاوەڕوانی پەیوەستبوون..."}
              </div>
            </button>

            <AnimatePresence>
              {showPlayers && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-56 max-h-64 overflow-y-auto"
                >
                  {players.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-2">هیچ یاریزانێک نییە</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {players.map(p => (
                        <div
                          key={p.playerId}
                          className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5"
                        >
                          <span className="text-lg leading-none">{p.emoji}</span>
                          <span className="text-sm font-bold text-gray-700">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.93 }}
              onClick={draw}
              disabled={busy || calledNumbers.length >= 75 || !!activeAnnouncement}
              className={`
                bg-purple-600 text-white font-black rounded-2xl
                shadow-[0_6px_24px_rgba(124,58,237,0.45)]
                transition-colors duration-200
                text-base md:text-xl xl:text-2xl
                px-5 md:px-7 xl:px-9 py-2.5 md:py-3.5 xl:py-4
                ${busy || calledNumbers.length >= 75 || activeAnnouncement
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-purple-700 active:bg-purple-800 cursor-pointer"}
              `}
            >
              ڕاکێشانی تۆپ
            </motion.button>
            <IconToggle
              activeIcon={Pause} inactiveIcon={Play}
              label="خۆکار" active={autoOn}
              onClick={() => setAutoOn(v => !v)}
              activeClass="bg-purple-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.40)]"
            />
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              onClick={endGame}
              title="کۆتایی یاری"
              className="
                flex-shrink-0 rounded-xl w-14 md:w-16 py-1.5 md:py-2
                bg-gray-100 hover:bg-amber-50 text-gray-400 hover:text-amber-500
                flex flex-col items-center justify-center gap-1 transition-colors duration-200
              "
            >
              <Flag size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-bold leading-none whitespace-nowrap">کۆتایی</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.12, rotate: -35 }}
              whileTap={{ scale: 0.88 }}
              onClick={reset}
              title="ریست کردنەوە"
              className="
                flex-shrink-0 rounded-xl w-14 md:w-16 py-1.5 md:py-2
                bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500
                flex flex-col items-center justify-center gap-1 transition-colors duration-200
              "
            >
              <RotateCcw size={18} strokeWidth={2.5} />
              <span className="text-[10px] font-bold leading-none whitespace-nowrap">ڕیست</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.93 }}
              onClick={generatePDF}
              disabled={isPrinting}
              title="پرینت کردنی کارتەکان"
              className={`
                flex-shrink-0 rounded-xl w-14 md:w-16 py-1.5 md:py-2
                border-2 border-gray-200 bg-white text-gray-500 font-bold
                hover:border-purple-300 hover:text-purple-600
                flex flex-col items-center justify-center gap-1 transition-all duration-200
                ${isPrinting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <Printer size={16} strokeWidth={2} />
              <span className="text-[10px] leading-none whitespace-nowrap">
                {isPrinting ? "..." : "پرینت"}
              </span>
            </motion.button>
          </div>

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

          {/* Winners */}
          {winners.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xs md:max-w-sm">
              {winners.map((w, i) =>
                i === 0 ? (
                  <motion.div
                    key={w.playerId}
                    initial={{ opacity: 0, scale: 0.5, y: -8 }}
                    animate={{
                      opacity: 1, y: 0,
                      scale: [1, 1.08, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(245,158,11,0.45)",
                        "0 0 0 9px rgba(245,158,11,0)",
                        "0 0 0 0 rgba(245,158,11,0)",
                      ],
                    }}
                    transition={{
                      opacity: { duration: 0.3 },
                      y: { duration: 0.3 },
                      scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                      boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full pr-4 pl-2 py-2"
                  >
                    <motion.span
                      animate={{ rotate: [0, -14, 14, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                    >
                      <Trophy size={20} className="text-white" strokeWidth={2.5} />
                    </motion.span>
                    <span className="text-base font-black text-white whitespace-nowrap">
                      {w.emoji} {w.name}
                    </span>
                  </motion.div>
                ) : (
                  <div
                    key={w.playerId}
                    className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full pr-4 pl-1.5 py-2"
                  >
                    <span className="w-7 h-7 rounded-full bg-amber-400 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                      #{i + 1}
                    </span>
                    <span className="text-base font-bold text-amber-700 whitespace-nowrap">
                      {w.emoji} {w.name}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
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
                {currentNumber != null ? (
                  <motion.div
                    key={currentNumber}
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
                      {currentNumber}
                    </span>
                    <span className="text-yellow-300 font-black -mt-1 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-6xl">
                      {groupOf(currentNumber).letter}
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
          <div className="flex items-center gap-3 w-52 sm:w-60 md:w-72 lg:w-80 xl:w-96 2xl:w-80" dir="ltr">
            <span className="text-gray-500 text-base md:text-lg font-mono w-7 text-right tabular-nums">{calledCount}</span>
            <div className="flex-1 h-3.5 md:h-4 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-red-500"
                animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-gray-400 text-base md:text-lg font-mono">75</span>
          </div>

          {/* History strip */}
          <AnimatePresence>
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5" dir="ltr"
              >
                {history.map((n, i) => {
                  const g = groupOf(n);
                  return (
                    <motion.div
                      key={`h-${n}-${i}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: Math.max(0.2, 1 - i * 0.13), scale: 1 }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${g.calledBg} text-white flex items-center justify-center text-sm sm:text-base font-black shadow-sm`}
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
            {calledNumbers.length === 75 && (
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
          <IconToggle
            activeIcon={Zap} inactiveIcon={ZapOff} label="خۆکار نیشانکردن" active={autoMarkEnabled}
            onClick={toggleAutoMark}
            activeClass="bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.40)]"
          />
          <IconToggle
            activeIcon={Eye} inactiveIcon={EyeOff} label="یارمەتیدان" active={hintsEnabled}
            onClick={toggleHints}
            activeClass="bg-indigo-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.40)]"
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
                const isCurr = n === currentNumber;
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
