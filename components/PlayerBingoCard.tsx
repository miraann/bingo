"use client";

import { motion } from "framer-motion";
import { GROUPS, type BingoCard as BingoCardT } from "@/lib/bingo";

export function PlayerBingoCard({
  card,
  calledSet,
  marked,
  currentNumber,
  hintsEnabled,
  onToggle,
}: {
  card: BingoCardT;
  calledSet: Set<number>;
  marked: Set<number>;
  currentNumber: number | null;
  hintsEnabled: boolean;
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
            // Hints control every visual cue about which numbers were called:
            // the dashed "callable" border, the current-number ring, and even
            // which cells respond to a tap. With hints off, every cell looks
            // and behaves the same — the player has to track calls themselves.
            const showCalledHint = hintsEnabled && called && !isMarked;
            const isCurrent = hintsEnabled && n !== null && n === currentNumber;
            const tappable = !isFree && (hintsEnabled ? called : true);
            const group = GROUPS[c];
            return (
              <motion.button
                key={`${r}-${c}`}
                type="button"
                disabled={!tappable}
                onClick={() => n !== null && onToggle(n)}
                whileTap={tappable ? { scale: 0.9 } : undefined}
                animate={isCurrent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className={`
                  aspect-square rounded-lg flex items-center justify-center
                  text-base sm:text-lg md:text-xl font-black select-none
                  ${isMarked
                    ? `${group.calledBg} text-white shadow-inner`
                    : showCalledHint
                    ? "bg-white border-2 border-dashed border-amber-400 text-black animate-pulse"
                    : "bg-gray-50 border border-gray-300 text-black"}
                  ${isCurrent ? "ring-4 ring-yellow-400" : ""}
                  ${tappable ? "cursor-pointer" : "cursor-default"}
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
