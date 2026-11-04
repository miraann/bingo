"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROUND_INTRO_MS, TEAMS, type RoundResult, type Team } from "@/lib/kllawenChannel";
import { TEAM_UI } from "@/components/kllawen/kllawenUi";
import { playCountdownTick } from "@/lib/kllawenSound";

const INTRO_SECONDS = Math.round(ROUND_INTRO_MS / 1000);

const OUTCOME_TEXT: Record<RoundResult["outcome"], string> = {
  cut: "گوڵ ✂️",
  found: "ئەنگوستیلە دۆزرایەوە 💍",
  autoFound: "ئەنگوستیلە دۆزرایەوە 💍",
  miss: "ئەنگوستیلە نەدۆزرایەوە ❌",
  wrongClaim: "ئەنگوستیلە نەدۆزرایەوە ❌",
};

/** Who scored last round, and the running totals. */
function LastRound({ result, scores }: { result: RoundResult; scores: Record<Team, number> }) {
  const winner = result.scoringTeam;
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <span className="text-sm sm:text-lg font-bold text-gray-400">{OUTCOME_TEXT[result.outcome]}</span>
      {winner ? (
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.6 }}
          className={`flex items-center gap-2 sm:gap-3 rounded-3xl px-5 py-2.5 sm:px-8 sm:py-4 ${TEAM_UI[winner].solid} shadow-lg`}
        >
          <span className="text-2xl sm:text-4xl">🏆</span>
          <span className="text-xl sm:text-4xl font-black">{TEAM_UI[winner].label}</span>
          <span className="text-2xl sm:text-5xl font-black tabular-nums">+{result.points}</span>
        </motion.div>
      ) : (
        <p className="text-xl sm:text-3xl font-black text-gray-600">هیچ خاڵێک نییە — کڵاوەکان دەگوازرێنەوە</p>
      )}

      <div className="flex items-center gap-3 sm:gap-6" dir="rtl">
        {TEAMS.map((team, i) => (
          <div key={team} className="flex items-center gap-3 sm:gap-6">
            {i > 0 && <span className="text-xl sm:text-3xl font-black text-gray-300">—</span>}
            <div className="flex flex-col items-center">
              <span className={`text-xs sm:text-base font-black ${TEAM_UI[team].text}`}>{TEAM_UI[team].dot} {TEAM_UI[team].label}</span>
              <motion.span
                initial={team === winner ? { scale: 1.6 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 12 }}
                className={`text-3xl sm:text-5xl font-black tabular-nums ${team === winner ? TEAM_UI[team].text : "text-gray-700"}`}
              >
                {scores[team]}
              </motion.span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The ticking number and filling bar; counts from mount. With `sound`, each
 *  second ticks (only the host screen sets it, so phones don't echo the TV). */
export function IntroTimer({ barClass, sound = false }: { barClass: string; sound?: boolean }) {
  const [left, setLeft] = useState(INTRO_SECONDS);
  useEffect(() => {
    const id = setInterval(() => setLeft(s => Math.max(1, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (sound) playCountdownTick(left);
  }, [left, sound]);

  return (
    <>
      <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
        {/* CSS spin runs on the compositor, so it stays smooth on slow TV browsers. */}
        <div className="absolute inset-0 rounded-full border-[6px] border-amber-100 border-t-amber-600 animate-spin" />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={left}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="text-4xl sm:text-6xl font-black text-amber-700 tabular-nums"
          >
            {left}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="w-56 sm:w-80 h-2.5 rounded-full bg-gray-100 overflow-hidden" dir="ltr">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: INTRO_SECONDS, ease: "linear" }}
        />
      </div>
      <p className="text-sm sm:text-base font-bold text-gray-400">ئامادە بن...</p>
    </>
  );
}

/** Counts down from the moment this device sees the intro; the host's timer
 *  decides when hiding actually opens. */
function Countdown({
  round,
  hiderTeam,
  result,
  scores,
  sound,
}: {
  round: number;
  hiderTeam: Team;
  result: RoundResult | null;
  scores: Record<Team, number>;
  sound: boolean;
}) {
  const ui = TEAM_UI[hiderTeam];
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="flex flex-col items-center gap-4 sm:gap-6 px-6 text-center"
    >
      {result ? (
        <LastRound result={result} scores={scores} />
      ) : (
        <motion.span
          className="text-6xl sm:text-8xl"
          animate={{ y: ["0%", "-18%", "0%"], rotate: [-8, 8, -8] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          🎩
        </motion.span>
      )}

      <div className="flex flex-col items-center gap-1">
        <p className="text-2xl sm:text-4xl font-black text-gray-800">گەڕی {round}</p>
        <p className={`text-base sm:text-2xl font-black ${ui.text}`}>
          {ui.dot} {ui.label} ئەنگوستیلە دەشارێتەوە
        </p>
      </div>

      <IntroTimer barClass={ui.bar} sound={sound} />
    </motion.div>
  );
}

/** Full-screen countdown shown on the TV and every phone between rounds. */
export function RoundIntro({
  open,
  round,
  hiderTeam,
  result,
  scores,
  sound = false,
}: {
  open: boolean;
  round: number;
  hiderTeam: Team;
  /** Last round's result; null before round 1. */
  result: RoundResult | null;
  scores: Record<Team, number>;
  /** Tick each second of the countdown (host screen only). */
  sound?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center overflow-y-auto py-6"
        >
          <Countdown key={round} round={round} hiderTeam={hiderTeam} result={result} scores={scores} sound={sound} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
