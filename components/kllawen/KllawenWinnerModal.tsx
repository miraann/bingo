"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { leadingTeam, type Team } from "@/lib/kllawenChannel";
import { TEAM_UI } from "@/components/kllawen/kllawenUi";

export function KllawenWinnerModal({
  open,
  scores,
  onNewGame,
}: {
  open: boolean;
  scores: Record<Team, number>;
  onNewGame: () => void;
}) {
  const winner = leadingTeam(scores);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            dir="rtl"
            className="bg-white rounded-3xl shadow-2xl px-5 py-6 sm:px-8 sm:py-8 max-w-sm w-full flex flex-col items-center gap-3 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg"
            >
              <Trophy size={40} className="text-white" strokeWidth={2.5} />
            </motion.div>

            {winner ? (
              <>
                <p className={`text-2xl md:text-3xl font-black ${TEAM_UI[winner].text}`}>
                  {TEAM_UI[winner].dot} {TEAM_UI[winner].label}
                </p>
                <p className="text-lg font-bold text-amber-600">براوەی کڵاوێن بوو! 🎉</p>
              </>
            ) : (
              <p className="text-2xl font-black text-gray-700">یەکسان بوون! 🤝</p>
            )}

            <div className="flex items-center gap-4 text-lg font-black" dir="ltr">
              <span className={TEAM_UI.a.text}>{scores.a}</span>
              <span className="text-gray-300">—</span>
              <span className={TEAM_UI.b.text}>{scores.b}</span>
            </div>

            <button
              onClick={onNewGame}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-2xl py-3 shadow-lg transition-colors cursor-pointer mt-2"
            >
              یاریی نوێ
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
