"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import type { BingoResultPayload } from "@/lib/gameChannel";
import { patternLabel } from "@/lib/bingo";

export function WinnerModal({
  winner,
  onContinue,
  onNewGame,
}: {
  winner: BingoResultPayload | null;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  return (
    <AnimatePresence>
      {winner && winner.valid && (
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
            <p className="text-lg font-bold text-amber-600">بینگۆی کرد! 🎉</p>
            {winner.pattern && (
              <p className="text-sm font-bold text-gray-400">{patternLabel(winner.pattern)}</p>
            )}

            <div className="flex items-center gap-3 w-full mt-3">
              <button
                onClick={onContinue}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl py-3 transition-colors cursor-pointer"
              >
                بەردەوامبوون
              </button>
              <button
                onClick={onNewGame}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl py-3 shadow-lg transition-colors cursor-pointer"
              >
                یاریی نوێ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
