"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROUND_INTRO_MS, type Team } from "@/lib/kllawenChannel";
import { TEAM_UI } from "@/components/kllawen/kllawenUi";

const INTRO_SECONDS = Math.round(ROUND_INTRO_MS / 1000);

/** Counts down from the moment this device sees the intro; the host's timer
 *  decides when hiding actually opens. */
function Countdown({ round, hiderTeam }: { round: number; hiderTeam: Team }) {
  const [left, setLeft] = useState(INTRO_SECONDS);
  useEffect(() => {
    const id = setInterval(() => setLeft(s => Math.max(1, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const ui = TEAM_UI[hiderTeam];
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="flex flex-col items-center gap-4 sm:gap-6 px-6 text-center"
    >
      <motion.span
        className="text-6xl sm:text-8xl"
        animate={{ y: ["0%", "-18%", "0%"], rotate: [-8, 8, -8] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      >
        🎩
      </motion.span>
      <p className="text-3xl sm:text-5xl font-black text-gray-800">گەڕی {round}</p>
      <p className={`text-lg sm:text-2xl font-black ${ui.text}`}>
        {ui.dot} {ui.label} ئەنگوستیلە دەشارێتەوە
      </p>

      <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-[6px] border-amber-100 border-t-amber-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
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
          className={`h-full rounded-full ${ui.bar}`}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: INTRO_SECONDS, ease: "linear" }}
        />
      </div>
      <p className="text-sm sm:text-base font-bold text-gray-400">ئامادە بن...</p>
    </motion.div>
  );
}

/** Full-screen countdown shown on the TV and every phone between rounds. */
export function RoundIntro({ open, round, hiderTeam }: { open: boolean; round: number; hiderTeam: Team }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center"
        >
          <Countdown key={round} round={round} hiderTeam={hiderTeam} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
