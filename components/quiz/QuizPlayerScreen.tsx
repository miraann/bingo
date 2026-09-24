"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock } from "lucide-react";
import { useQuizPlayer } from "@/hooks/useQuizPlayer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { EmojiPicker } from "@/components/EmojiPicker";
import { QuizAnswerButtons } from "@/components/quiz/QuizAnswerButtons";
import { QuizLeaderboard } from "@/components/quiz/QuizLeaderboard";
import { CountdownRing } from "@/components/quiz/CountdownRing";
import { playCorrectSound, playIncorrectSound } from "@/lib/quizSound";
import type { HintType } from "@/lib/quizChannel";

const HINTS: { type: HintType; icon: string; label: string }[] = [
  { type: "fiftyFifty", icon: "✂️", label: "لابردنی ٢ وەڵام" },
  { type: "showCorrect", icon: "💡", label: "وەڵامی ڕاست" },
];

export function QuizPlayerScreen({ gameId }: { gameId: string }) {
  useWakeLock();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦁");

  const {
    player, phase, topicLabel, question, questionIndex, totalQuestions,
    startedAt, paused, selectedAnswer, hasSubmitted, correctAnswer, leaderboard,
    feedback, myEntry, connected, join, submitAnswer,
    hintsEnabled, usedHints, pendingHint, removedOptions, hintedAnswer, requestHint,
  } = useQuizPlayer(gameId);

  const lastQuestionIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (question && question.id !== lastQuestionIdRef.current) {
      lastQuestionIdRef.current = question.id;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
    }
  }, [question]);

  const feedbackSoundPlayedRef = useRef<number>(-1);
  useEffect(() => {
    if (phase !== "REVEAL" || feedbackSoundPlayedRef.current === questionIndex) return;
    feedbackSoundPlayedRef.current = questionIndex;
    if (feedback === "correct") playCorrectSound();
    else if (feedback === "incorrect") playIncorrectSound();
  }, [phase, feedback, questionIndex]);

  /* ── Registration ──────────────────────────────────────────────────────── */
  if (!player) {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-5 px-6 py-8 overflow-y-auto">
        <h1 className="text-xl font-black text-gray-800">بەشداریکردن لە کویز 🧠</h1>
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <label className="text-xs font-bold text-gray-400 self-start">ناو</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ناوی خۆت بنووسە"
            maxLength={20}
            className="w-full text-center text-lg font-bold border-2 border-gray-200 rounded-2xl py-3 focus:border-emerald-400 focus:outline-none"
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
            ${name.trim().length === 0 ? "bg-gray-200 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"}
          `}
        >
          بەشداریکردن لە کویز
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
        {topicLabel && (
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 rounded-full px-3 py-1">{topicLabel}</span>
        )}
        <p className="text-sm text-gray-400 text-center">چاوەڕێی دەستپێکردنی کویز بکە...</p>
      </div>
    );
  }

  /* ── Quiz ended ────────────────────────────────────────────────────────── */
  if (phase === "ENDED") {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-5 px-6 py-8 overflow-y-auto">
        <h1 className="text-xl font-black text-gray-800">کویز تەواو بوو 🎉</h1>
        {myEntry && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">{player.emoji}</span>
            <span className="font-bold text-gray-700">{player.name}</span>
            <span className="text-2xl font-black text-emerald-600" dir="ltr">{myEntry.score} خاڵ</span>
          </div>
        )}
        <QuizLeaderboard leaderboard={leaderboard} highlightPlayerId={player.playerId} />
        <p className="text-sm text-gray-400">چاوەڕێی یاریی داهاتوو بکە</p>
      </div>
    );
  }

  /* ── Question / Reveal ────────────────────────────────────────────────── */
  const revealed = phase === "REVEAL";

  return (
    <div dir="rtl" className="min-h-dvh bg-white flex flex-col items-center gap-4 px-3 pt-6 pb-4">
      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-xl">{player.emoji}</span>{player.name}
        </span>
        <span className="text-xs font-bold text-gray-400" dir="ltr">{questionIndex + 1} / {totalQuestions}</span>
      </div>

      {question && (
        <>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 rounded-full px-3 py-1">
            {question.category}
          </span>

          {!revealed && startedAt != null && (
            <CountdownRing totalMs={question.timeLimit * 1000} startedAt={startedAt} paused={paused} />
          )}

          <h2 className="text-lg md:text-xl font-black text-gray-800 text-center max-w-sm mt-4 mb-4">{question.question}</h2>

          <QuizAnswerButtons
            options={question.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={revealed ? correctAnswer : null}
            disabled={revealed || paused}
            onSelect={submitAnswer}
            removedOptions={removedOptions}
            hintedAnswer={hintedAnswer}
          />

          {!revealed && hintsEnabled && (
            <div className="flex items-center justify-center gap-2 w-full max-w-md">
              {HINTS.map(h => {
                const used = usedHints.includes(h.type);
                const loading = pendingHint === h.type;
                const available = !used && !paused && pendingHint === null;
                return (
                  <motion.button
                    key={h.type}
                    type="button"
                    whileTap={available ? { scale: 0.92 } : undefined}
                    disabled={!available}
                    onClick={() => requestHint(h.type)}
                    className={`
                      flex-1 flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-black border-2
                      transition-colors duration-200
                      ${used
                        ? "bg-gray-50 border-gray-100 text-gray-300 line-through cursor-not-allowed"
                        : available
                        ? "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 cursor-pointer"
                        : "bg-yellow-50 border-yellow-200 text-yellow-600 opacity-60 cursor-not-allowed"}
                      ${loading ? "animate-pulse" : ""}
                    `}
                  >
                    <span aria-hidden>{h.icon}</span>
                    {h.label}
                  </motion.button>
                );
              })}
            </div>
          )}

          {!revealed && paused && (
            <p className="text-sm font-bold text-emerald-600">⏸ یاریمان وەستاوە، چاوەڕێی بکە...</p>
          )}
          {!revealed && !paused && hasSubmitted && (
            <p className="text-sm text-gray-400 font-bold">چاوەڕێی وەڵامی ڕاست بکە...</p>
          )}

          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-1.5 font-black text-lg ${
                feedback === "correct" ? "text-emerald-600" : feedback === "incorrect" ? "text-red-500" : "text-gray-400"
              }`}
            >
              {feedback === "correct" && (<><Check size={20} /> دروستە! 🎉</>)}
              {feedback === "incorrect" && (<><X size={20} /> هەڵەیە! ❌</>)}
              {feedback === "timeout" && (<><Clock size={20} /> کاتت تەواو بوو! ⏰</>)}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
