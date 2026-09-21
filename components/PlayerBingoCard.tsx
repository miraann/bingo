"use client";

import { motion } from "framer-motion";
import { GROUPS, type BingoCard as BingoCardT } from "@/lib/bingo";

export function PlayerBingoCard({
  card,
  calledSet,
  marked,
  currentNumber,
  highlightCurrent,
  onToggle,
}: {
  card: BingoCardT;
  calledSet: Set<number>;
  marked: Set<number>;
  currentNumber: number | null;
  highlightCurrent: boolean;
  onToggle: (n: number) => void;
}) {
  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto" dir="ltr">
      <div className="grid grid-cols-5 gap-1 mb-1">
        {GROUPS.map(g => (
          <div key={g.letter} className={`${g.bg} rounded-lg py-1.5 sm:py-2 flex items-center justify-center`}>
            <span className="text-white font-black text-lg sm:text-xl md:text-2xl">{g.letter}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {card.map((row, r) =>
          row.map((cell, c) => {
            const isFree = cell === "FREE";
            const n = isFree ? null : (cell as number);
            const called = isFree || (n !== null && calledSet.has(n));
            const isMarked = isFree || (n !== null && marked.has(n));
            const isCurrent = highlightCurrent && n !== null && n === currentNumber;
            const group = GROUPS[c];
            return (
              <motion.button
                key={`${r}-${c}`}
                type="button"
                disabled={isFree || !called}
                onClick={() => n !== null && onToggle(n)}
                whileTap={!isFree && called ? { scale: 0.9 } : undefined}
                animate={isCurrent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className={`
                  aspect-square rounded-lg flex items-center justify-center
                  text-base sm:text-lg md:text-xl font-black select-none
                  ${isMarked
                    ? `${group.calledBg} text-white shadow-inner`
                    : called
                    ? "bg-white border-2 border-dashed border-amber-400 text-black animate-pulse"
                    : "bg-gray-50 border border-gray-300 text-black"}
                  ${isCurrent ? "ring-4 ring-yellow-400" : ""}
                  ${!isFree && called ? "cursor-pointer" : "cursor-default"}
                `}
              >
                {isFree ? "★" : n}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
