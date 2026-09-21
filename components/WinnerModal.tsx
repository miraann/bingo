"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Eye, EyeOff } from "lucide-react";
import type { BingoResultPayload } from "@/lib/gameChannel";
import { GROUPS, patternLabel } from "@/lib/bingo";

export function WinnerModal({
  winner,
  calledSet,
  onContinue,
  onNewGame,
}: {
  winner: BingoResultPayload | null;
  calledSet: Set<number>;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  const [showCard, setShowCard] = useState(false);

  // Collapse the card again the next time a (different) winner pops up.
  useEffect(() => {
    setShowCard(false);
  }, [winner?.playerId]);

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

            <button
              onClick={() => setShowCard(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
            >
              {showCard ? <EyeOff size={13} /> : <Eye size={13} />}
              {showCard ? "شاردنەوەی کارت" : "بینینی کارتی براوە"}
            </button>

            <AnimatePresence>
              {showCard && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                  dir="ltr"
                >
                  <div className="grid grid-cols-5 gap-1 mb-1 pt-1">
                    {GROUPS.map(g => (
                      <div key={g.letter} className={`${g.bg} rounded py-1 flex items-center justify-center`}>
                        <span className="text-white font-black text-[11px]">{g.letter}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {winner.card.map((row, r) =>
                      row.map((cell, c) => {
                        const isFree = cell === "FREE";
                        const n = isFree ? null : (cell as number);
                        const called = isFree || (n !== null && calledSet.has(n));
                        const group = GROUPS[c];
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`
                              aspect-square rounded flex items-center justify-center
                              text-xs font-black
                              ${called ? `${group.calledBg} text-white` : "bg-gray-50 border border-gray-200 text-gray-400"}
                            `}
                          >
                            {isFree ? "★" : n}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
