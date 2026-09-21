"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Zap, ZapOff, Eye, EyeOff } from "lucide-react";
import { usePlayerGame } from "@/hooks/usePlayerGame";
import { useWakeLock } from "@/hooks/useWakeLock";
import { EmojiPicker } from "@/components/EmojiPicker";
import { PlayerBingoCard } from "@/components/PlayerBingoCard";
import { WinnerBanner } from "@/components/WinnerBanner";
import { groupOf, patternLabel } from "@/lib/bingo";

export function PlayClient() {
  useWakeLock();

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGameId = (searchParams.get("gameId") ?? "").toUpperCase();

  const [manualCode, setManualCode] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦁");

  const gameId = urlGameId;
  const {
    player, phase, calledNumbers, calledSet, currentNumber, marked, autoMarkEnabled, hintsEnabled,
    claimStatus, setClaimStatus, announcements, connected, join, toggleMark, claimBingo,
  } = usePlayerGame(gameId);

  const calledCount = calledSet.size;
  const progress    = (calledCount / 75) * 100;
  const history      = calledNumbers.slice(1, 8);

  // Auto-clear an "invalid" claim result so the player can try again.
  useEffect(() => {
    if (claimStatus !== "invalid") return;
    const t = setTimeout(() => setClaimStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [claimStatus, setClaimStatus]);

  const latestAnnouncement = announcements[0] ?? null;

  /* ── No game code yet: ask for one manually ───────────────────────────── */
  if (!gameId) {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-xl font-black text-gray-800">بەشداریکردن لە یاری بینگۆ</h1>
        <p className="text-sm text-gray-400 text-center max-w-xs">کۆدی یاری بنووسە کە لەسەر شاشەی سەرەکی نیشان دراوە</p>
        <input
          value={manualCode}
          onChange={e => setManualCode(e.target.value.toUpperCase())}
          placeholder="کۆدی یاری"
          dir="ltr"
          className="w-full max-w-[220px] text-center text-2xl font-black tracking-[0.3em] border-2 border-gray-200 rounded-2xl py-3 focus:border-purple-400 focus:outline-none"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={manualCode.trim().length < 3}
          onClick={() => router.replace(`/play?gameId=${manualCode.trim()}`)}
          className={`
            font-black rounded-2xl px-8 py-3 text-white
            ${manualCode.trim().length < 3 ? "bg-gray-200 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 cursor-pointer"}
          `}
        >
          بەشداریکردن
        </motion.button>
      </div>
    );
  }

  /* ── Registration ──────────────────────────────────────────────────────── */
  if (!player) {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-5 px-6 py-8 overflow-y-auto">
        <h1 className="text-xl font-black text-gray-800">بەشداریکردن لە یاری</h1>
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <label className="text-xs font-bold text-gray-400 self-start">ناو</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ناوی خۆت بنووسە"
            maxLength={20}
            className="w-full text-center text-lg font-bold border-2 border-gray-200 rounded-2xl py-3 focus:border-purple-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-bold text-gray-400">ئیمۆجیت هەڵبژێرە</label>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={name.trim().length === 0}
          onClick={() => join(name, emoji)}
          className={`
            font-black rounded-2xl px-8 py-3.5 text-lg text-white
            ${name.trim().length === 0 ? "bg-gray-200 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 cursor-pointer"}
          `}
        >
          بەشداریکردن لە یاری
        </motion.button>
      </div>
    );
  }

  /* ── Waiting for host to start ─────────────────────────────────────────── */
  if (phase === "LOBBY") {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-4 px-6">
        <span className="text-5xl">{player.emoji}</span>
        <h1 className="text-lg font-black text-gray-800">سڵاو {player.name} 👋</h1>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"}`} />
          {connected ? "پەیوەستیت" : "چاوەڕوانی پەیوەستبوون..."}
        </div>
        <p className="text-sm text-gray-400 text-center">چاوەڕێی دەستپێکردنی یاری بکە...</p>
      </div>
    );
  }

  /* ── Game ended ────────────────────────────────────────────────────────── */
  if (phase === "ENDED") {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-4 px-6 py-8 overflow-y-auto">
        <h1 className="text-xl font-black text-gray-800">یاری تەواو بوو 🎉</h1>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {announcements.filter(a => a.valid).map(a => (
            <div key={a.playerId} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <span className="text-xl">{a.emoji}</span>
              <span className="font-bold text-gray-700 flex-1">{a.name}</span>
              {a.pattern && <span className="text-[11px] text-amber-600 font-bold">{patternLabel(a.pattern)}</span>}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400">چاوەڕێی یاریی داهاتوو بکە</p>
      </div>
    );
  }

  /* ── Playing ───────────────────────────────────────────────────────────── */
  return (
    <div dir="rtl" className="min-h-dvh bg-white flex flex-col items-center gap-4 px-3 py-4">
      <WinnerBanner announcement={latestAnnouncement} />

      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-xl">{player.emoji}</span>{player.name}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 ${
              autoMarkEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {autoMarkEnabled ? <Zap size={11} /> : <ZapOff size={11} />}
            {autoMarkEnabled ? "خۆکار" : "دەستی"}
          </span>
          <span
            className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 ${
              hintsEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {hintsEnabled ? <Eye size={11} /> : <EyeOff size={11} />}
            {hintsEnabled ? "ڕوونکردنەوە" : "بێ یارمەتی"}
          </span>
        </div>
      </div>

      {!autoMarkEnabled && !hintsEnabled && (
        <p className="text-xs text-amber-600 font-bold -mt-2">
          پێویستە بە خۆت ژمارەکان لە کارتەکەت بدۆزیتەوە و دایبنێیت
        </p>
      )}

      {currentNumber != null && (
        <motion.div
          key={currentNumber}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-lg"
        >
          {currentNumber}
        </motion.div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2.5 w-full max-w-sm" dir="ltr">
        <span className="text-gray-500 text-sm font-mono w-6 text-right tabular-nums">{calledCount}</span>
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-red-500"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-gray-400 text-sm font-mono">75</span>
      </div>

      {/* History strip */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 flex-wrap justify-center" dir="ltr"
          >
            {history.map((n, i) => {
              const g = groupOf(n);
              return (
                <motion.div
                  key={`h-${n}-${i}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: Math.max(0.2, 1 - i * 0.13), scale: 1 }}
                  className={`w-8 h-8 rounded-lg ${g.calledBg} text-white flex items-center justify-center text-sm font-black shadow-sm`}
                >
                  {n}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerBingoCard
        card={player.card}
        calledSet={calledSet}
        marked={marked}
        currentNumber={currentNumber}
        hintsEnabled={hintsEnabled}
        onToggle={toggleMark}
      />

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={claimBingo}
        disabled={claimStatus === "pending"}
        className={`
          w-full max-w-sm font-black text-2xl rounded-2xl py-4 shadow-xl cursor-pointer
          transition-colors duration-200
          ${claimStatus === "pending" ? "bg-gray-300 text-white cursor-wait" : "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:brightness-105"}
        `}
      >
        بینگۆ!
      </motion.button>

      <AnimatePresence>
        {claimStatus === "valid" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm"
          >
            <Check size={16} /> سەرکەوتوو بوویت، بینگۆ! 🎉
          </motion.div>
        )}
        {claimStatus === "invalid" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-red-500 font-bold text-sm"
          >
            <X size={16} /> هێشتا بینگۆ نییە
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
