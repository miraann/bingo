"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Eye, EyeOff } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/quizChannel";
import { QuizLeaderboard } from "@/components/quiz/QuizLeaderboard";

export function QuizWinnerModal({
  leaderboard,
  onNewGame,
}: {
  leaderboard: LeaderboardEntry[];
  onNewGame: () => void;
}) {
  const [showBoard, setShowBoard] = useState(false);
  const winner = leaderboard[0] ?? null;

  return (
    <AnimatePresence>
      {winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="bg-white rounded-3xl shadow-2xl px-8 py-8 max-w-sm w-full flex flex-col items-center gap-3 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg"
            >
              <Trophy size={40} className="text-white" strokeWidth={2.5} />
            </motion.div>

            <div className="flex items-center gap-2 text-2xl md:text-3xl font-black text-gray-800">
              <span>{winner.emoji}</span>
              <span>{winner.name}</span>
            </div>
            <p className="text-lg font-bold text-amber-600">براوەی کویزەکە بوو! 🎉</p>
            <p className="text-sm font-bold text-gray-400" dir="ltr">{winner.score} خاڵ</p>

            <button
              onClick={() => setShowBoard(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
            >
              {showBoard ? <EyeOff size={13} /> : <Eye size={13} />}
              {showBoard ? "شاردنەوەی خاڵەکان" : "بینینی هەموو خاڵەکان"}
            </button>

            <AnimatePresence>
              {showBoard && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div className="pt-1">
                    <QuizLeaderboard leaderboard={leaderboard} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={onNewGame}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl py-3 shadow-lg transition-colors cursor-pointer mt-2"
            >
              یاریی نوێ
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
