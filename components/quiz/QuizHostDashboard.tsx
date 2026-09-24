"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, Music, Music2, Bell, BellOff, RotateCcw, Flag, Timer, Pause, Play, Lightbulb, LightbulbOff, Calculator } from "lucide-react";
import { TIMER_PRESETS } from "@/lib/bingo";
import { getOrCreateHostGameId, createNewHostGameId } from "@/lib/id";
import { listQuizTopics } from "@/lib/quizLoader";
import { useQuizHost } from "@/hooks/useQuizHost";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useBroadcastHostMode } from "@/hooks/useHostMode";
import { QRPanel } from "@/components/QRPanel";
import { PlayerLobbyList } from "@/components/PlayerLobbyList";
import { GameModeToggle, type HostMode } from "@/components/GameModeSelector";
import { IconToggle } from "@/components/IconToggle";
import { QuizAnswerButtons } from "@/components/quiz/QuizAnswerButtons";
import { QuizLeaderboard } from "@/components/quiz/QuizLeaderboard";
import { QuizWinnerModal } from "@/components/quiz/QuizWinnerModal";
import { CountdownRing } from "@/components/quiz/CountdownRing";
import { QuizPointsInfoModal } from "@/components/quiz/QuizPointsInfoModal";

export function QuizHostDashboard({
  mode,
  onModeChange,
}: {
  mode: HostMode;
  onModeChange: (mode: HostMode) => void;
}) {
  useWakeLock();

  const [gameId, setGameId] = useState("");
  useEffect(() => setGameId(getOrCreateHostGameId()), []);
  useBroadcastHostMode(gameId, "quiz");

  const {
    phase, players, connected, topicKey, setTopic,
    currentIndex, totalQuestions, currentQuestion, startedAt, paused,
    submittedCount, correctAnswer, leaderboard,
    questionDurationSec, setQuestionDuration,
    questionCount, setQuestionCount,
    startQuiz, revealAnswer, nextQuestion, resetQuiz, endQuiz,
    pauseQuestion, resumeQuestion,
    hintsEnabled, setHintsEnabled,
  } = useQuizHost(gameId);

  const HintsToggle = (
    <IconToggle
      size="lg"
      activeIcon={Lightbulb} inactiveIcon={LightbulbOff} label="یارمەتی" active={hintsEnabled}
      onClick={() => setHintsEnabled(!hintsEnabled)}
      activeClass="bg-yellow-400 text-white shadow-[0_4px_14px_rgba(250,204,21,0.45)]"
    />
  );

  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    if (!gameId || typeof window === "undefined") return;
    setJoinUrl(`${window.location.origin}/play?gameId=${gameId}`);
  }, [gameId]);

  const handleNewGame = () => { resetQuiz(); setGameId(createNewHostGameId()); };

  const topics = listQuizTopics();
  const prevPhaseRef = useRef(phase);

  /* ── Toolbar state (music / bell / player list / timer override) ────────── */
  const [musicOn, setMusicOn] = useState(false);
  const [ringOn, setRingOn] = useState(true);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [customInput, setCustomInput] = useState(String(questionDurationSec ?? currentQuestion?.timeLimit ?? 15));
  const [customCountInput, setCustomCountInput] = useState(String(questionCount));
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio("/audio/bg-music.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.35;
    return () => { bgMusicRef.current?.pause(); };
  }, []);

  useEffect(() => {
    const m = bgMusicRef.current;
    if (!m) return;
    if (musicOn) m.play().catch(() => {});
    else m.pause();
  }, [musicOn]);

  useEffect(() => {
    if (prevPhaseRef.current !== "REVEAL" && phase === "REVEAL" && ringOn) {
      const bell = new Audio("/audio/ring.mp3");
      bell.volume = 0.5;
      bell.play().catch(() => {});
    }
    if (prevPhaseRef.current !== "ENDED" && phase === "ENDED" && leaderboard.length > 0) {
      const cheer = new Audio("/audio/win-cheer.wav");
      cheer.volume = 0.8;
      cheer.play().catch(() => {});
    }
    prevPhaseRef.current = phase;
  }, [phase, leaderboard.length, ringOn]);

  const selectPreset = (s: number) => { setQuestionDuration(s); setCustomInput(String(s)); };
  const handleCustomInput = (raw: string) => {
    setCustomInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 3 && v <= 120) setQuestionDuration(v);
  };

  const maxQuestions = topics.find(t => t.key === topicKey)?.count ?? 0;
  const QUESTION_COUNT_PRESETS = [5, 10, 15, 20].filter(n => n <= maxQuestions);
  const selectCountPreset = (n: number) => { setQuestionCount(n); setCustomCountInput(String(n)); };
  const handleCustomCountInput = (raw: string) => {
    setCustomCountInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 1 && v <= maxQuestions) setQuestionCount(v);
  };

  const playersWithScores = players
    .map(p => ({ ...p, score: leaderboard.find(l => l.playerId === p.playerId)?.score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const ConnectionBadge = (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"}`} />
      {connected ? "پەیوەستە" : "چاوەڕوانی پەیوەستبوون..."}
    </div>
  );

  /* ═══════════════════════════════ LOBBY ═══════════════════════════════ */
  if (phase === "LOBBY") {
    return (
      <div dir="rtl" className="h-dvh bg-white overflow-y-auto">
        {/* min-h-full inner wrapper: centered when it fits, top stays reachable when it scrolls */}
        <div className="min-h-full flex flex-col items-center justify-center gap-5 sm:gap-6 px-4 py-6 sm:py-8 w-full max-w-5xl mx-auto">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-800">داشبۆردی کویز</h1>
            {ConnectionBadge}
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 sm:gap-6 lg:gap-12 w-full">
            {gameId && joinUrl && (
              <div className="flex-shrink-0 lg:sticky lg:top-8">
                <QRPanel gameId={gameId} joinUrl={joinUrl} />
              </div>
            )}

            <div className="flex flex-col items-center gap-5 sm:gap-6 w-full max-w-md lg:max-w-lg">
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="text-xs font-bold text-gray-400 self-start">
                  {topicKey ? "بابەت هەڵبژێردرا ✓" : "کرتە لەسەر بابەتێک بکە بۆ هەڵبژاردنی 👇"}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                  {topics.map(t => {
                    const selected = topicKey === t.key;
                    return (
                      <motion.button
                        key={t.key}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTopic(t.key)}
                        aria-pressed={selected}
                        className={`
                          relative rounded-2xl px-3 py-3.5 font-bold text-sm text-center cursor-pointer
                          border-2 transition-colors duration-150
                          ${selected
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg"
                            : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50"}
                        `}
                      >
                        {selected && (
                          <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} className="text-emerald-600" />
                          </span>
                        )}
                        {t.label}
                        <span className="block text-[10px] font-normal opacity-70 mt-0.5">{t.count} پرسیار</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {topicKey && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-400">ژمارەی پرسیار بۆ یاری</span>
                  <div className="flex flex-wrap justify-center gap-1.5" dir="ltr">
                    {QUESTION_COUNT_PRESETS.map(n => (
                      <motion.button
                        key={n} whileTap={{ scale: 0.92 }}
                        onClick={() => selectCountPreset(n)}
                        className={`
                          px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all duration-200
                          ${questionCount === n ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
                        `}
                      >
                        {n}
                      </motion.button>
                    ))}
                    <input
                      type="number" min="1" max={maxQuestions} value={customCountInput}
                      onChange={e => handleCustomCountInput(e.target.value)}
                      className="w-14 text-center border-2 border-gray-200 rounded-xl text-xs font-bold py-1 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-gray-300">لە کۆی {maxQuestions} پرسیار</span>
                </div>
              )}

              <div className="flex flex-col items-center gap-1.5">
                {HintsToggle}
                <span className="text-[10px] text-gray-400 text-center max-w-[16rem]">
                  هەر یاریزانێک یەکجار لە یارییەکدا دەتوانێت ٢ وەڵام لاببات و یەکجار وەڵامی ڕاست ببینێت
                </span>
              </div>

              <PlayerLobbyList players={players} />

              <GameModeToggle mode={mode} onChange={onModeChange} />

              <motion.button
                whileHover={topicKey ? { scale: 1.03 } : undefined}
                whileTap={topicKey ? { scale: 0.95 } : undefined}
                onClick={startQuiz}
                disabled={!topicKey}
                className={`
                  w-full sm:w-auto font-black rounded-2xl px-8 py-3.5 text-lg text-white shadow-[0_6px_24px_rgba(16,185,129,0.45)]
                  ${topicKey ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer" : "bg-gray-200 cursor-not-allowed"}
                `}
              >
                دەستپێکردنی کویز
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

  /* ═══════════════════════════════ ENDED ═══════════════════════════════ */
  if (phase === "ENDED") {
    return (
      <div dir="rtl" className="min-h-dvh bg-white flex flex-col items-center justify-center gap-5 px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800">کویز تەواو بوو 🎉</h1>
        {leaderboard.length === 0 && (
          <>
            <p className="text-gray-400 text-sm">هیچ یاریزانێک بەشداری نەکرد</p>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              onClick={resetQuiz}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-8 py-3 shadow-lg cursor-pointer"
            >
              یاریی نوێ
            </motion.button>
          </>
        )}
        <QuizWinnerModal leaderboard={leaderboard} onNewGame={resetQuiz} />
      </div>
    );
  }

  /* ═══════════════════════════ QUESTION / REVEAL ═══════════════════════════ */
  const revealed = phase === "REVEAL";

  return (
    <div dir="rtl" className="h-dvh bg-white flex flex-col items-center px-3 pt-6 md:pt-8 pb-4 gap-3 overflow-y-auto">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPlayers(v => !v)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <Users size={14} strokeWidth={2.5} />
            <span className="text-xs font-bold">{submittedCount}/{players.length} وەڵامیان دا</span>
          </button>

          <AnimatePresence>
            {showPlayers && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 right-0 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-64 max-w-[calc(100vw-1.5rem)] max-h-72 overflow-y-auto"
              >
                {playersWithScores.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-2">هیچ یاریزانێک نییە</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {playersWithScores.map((p, i) => (
                      <div key={p.playerId} className="flex items-center gap-2 bg-gray-50 rounded-xl px-2.5 py-1.5">
                        <span className="text-[10px] font-black text-gray-400 w-4 text-center">{i + 1}</span>
                        <span className="text-lg leading-none">{p.emoji}</span>
                        <span className="text-sm font-bold text-gray-700 flex-1 truncate">{p.name}</span>
                        <span className="text-sm font-black text-emerald-600 tabular-nums" dir="ltr">{p.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="text-xs font-bold text-gray-400" dir="ltr">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* ── Toolbar: pause / reset / end / music / bell / timer ─────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full max-w-2xl">
        {!revealed && (
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            onClick={paused ? resumeQuestion : pauseQuestion}
            title={paused ? "بەردەوامبوون" : "وەستاندن"}
            className={`
              flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16
              transition-colors duration-200 cursor-pointer
              ${paused ? "bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.40)]" : "bg-gray-100 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"}
            `}
          >
            {paused ? <Play size={22} strokeWidth={2.5} /> : <Pause size={22} strokeWidth={2.5} />}
            <span className="text-[10px] font-bold">{paused ? "بەردەوامبوون" : "وەستاندن"}</span>
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          onClick={resetQuiz}
          title="ڕیست کردنەوە"
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer"
        >
          <RotateCcw size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">ڕیست</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          onClick={endQuiz}
          title="کۆتایی یاری"
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors duration-200 cursor-pointer"
        >
          <Flag size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">کۆتایی</span>
        </motion.button>

        <IconToggle
          size="lg"
          activeIcon={Music2} inactiveIcon={Music} label="میوزیك" active={musicOn}
          onClick={() => setMusicOn(v => !v)}
          activeClass="bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.40)]"
        />
        <IconToggle
          size="lg"
          activeIcon={Bell} inactiveIcon={BellOff} label="زەنگ" active={ringOn}
          onClick={() => setRingOn(v => !v)}
          activeClass="bg-amber-500 text-white shadow-[0_4px_14px_rgba(245,158,11,0.40)]"
        />
        {HintsToggle}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPointsInfo(true)}
          title="خاڵ چۆن هەژمار دەکرێت؟"
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 hover:bg-sky-50 text-gray-400 hover:text-sky-500 transition-colors duration-200 cursor-pointer"
        >
          <Calculator size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">خاڵەکان</span>
        </motion.button>
        <QuizPointsInfoModal
          open={showPointsInfo}
          onClose={() => setShowPointsInfo(false)}
          timeLimitSec={questionDurationSec ?? currentQuestion?.timeLimit ?? 15}
        />

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1 text-gray-400">
            <Timer size={14} strokeWidth={2.5} />
            <span className="text-xs font-bold tracking-widest uppercase">کاتی پرسیار</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2" dir="ltr">
            {TIMER_PRESETS.map(s => (
              <motion.button
                key={s} whileTap={{ scale: 0.92 }}
                onClick={() => selectPreset(s)}
                className={`
                  px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm sm:text-base font-black cursor-pointer transition-all duration-200
                  ${questionDurationSec === s ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
                `}
              >
                {s}s
              </motion.button>
            ))}
            <input
              type="number" min="3" max="120" value={customInput}
              onChange={e => handleCustomInput(e.target.value)}
              className="w-14 sm:w-16 text-center border-2 border-gray-200 rounded-xl text-sm sm:text-base font-bold py-2 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {currentQuestion && (
        <>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 rounded-full px-3 py-1">
            {currentQuestion.category}
          </span>

          {!revealed && startedAt != null && (
            <CountdownRing totalMs={(questionDurationSec ?? currentQuestion.timeLimit) * 1000} startedAt={startedAt} paused={paused} />
          )}
          {paused && !revealed && (
            <p className="text-sm font-bold text-emerald-600">⏸ وەستاوە</p>
          )}

          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-800 text-center max-w-3xl px-2 mt-4 sm:mt-6 md:mt-8 mb-3 sm:mb-4 md:mb-6">
            {currentQuestion.question}
          </h2>

          <QuizAnswerButtons
            options={currentQuestion.options}
            selectedAnswer={null}
            correctAnswer={revealed ? correctAnswer : null}
            disabled
          />

          {!revealed ? (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              onClick={revealAnswer}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl px-6 py-2.5 cursor-pointer"
            >
              پیشاندانی وەڵامی ڕاست
            </motion.button>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <QuizLeaderboard leaderboard={leaderboard} />
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={nextQuestion}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-8 py-3 shadow-lg cursor-pointer"
              >
                {currentIndex + 1 >= totalQuestions ? "کۆتایی کویز" : "پرسیاری داهاتوو"}
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
