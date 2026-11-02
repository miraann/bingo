"use client";

import { motion } from "framer-motion";
import { HAT_COUNT } from "@/lib/kllawenChannel";
import { hatNumber } from "@/components/kllawen/kllawenUi";

/** A felt Kurdish کڵاو covering its spot on the rug. */
function KllawSvg({ highlighted }: { highlighted: boolean }) {
  return (
    <svg viewBox="8 4 84 70" className="w-full h-auto drop-shadow-md" aria-hidden>
      <path
        d="M16 64 C16 30, 32 10, 50 10 C68 10, 84 30, 84 64 Z"
        fill={highlighted ? "#b45309" : "#92400e"}
      />
      <path d="M30 60 C30 36, 40 20, 50 18 C60 20, 70 36, 70 60" fill="none" stroke="#fcd34d" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
      <path d="M50 12 L50 60" stroke="#fcd34d" strokeWidth="2" strokeDasharray="3 5" opacity="0.5" />
      <rect x="10" y="58" width="80" height="13" rx="6.5" fill="#451a03" />
      <path d="M16 64.5 H84" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="50" cy="10" r="4" fill="#451a03" />
    </svg>
  );
}

export function HatRow({
  lifted,
  revealRing = null,
  markedHat = null,
  selected = null,
  wrongHat = null,
  interactive = false,
  onPick,
  sweeping = false,
  size = "screen",
  voters,
}: {
  lifted: number[];
  /** Hat whose ring is shown (round result). */
  revealRing?: number | null;
  /** Hat only this viewer knows holds the ring (the hiding captain). */
  markedHat?: number | null;
  selected?: number | null;
  /** Hat a wrong گوڵ was called on. */
  wrongHat?: number | null;
  interactive?: boolean;
  onPick?: (hat: number) => void;
  /** Animates a hand sliding under the hats while the ring is being hidden. */
  sweeping?: boolean;
  size?: "screen" | "phone";
  /** Hide votes per hat (voter emojis), shown only on the hiding team's phones. */
  voters?: Record<number, string[]>;
}) {
  return (
    <div className="relative w-full" dir="ltr">
      <div
        className={`grid grid-cols-5 w-full mx-auto ${
          size === "screen" ? "gap-2 sm:gap-3 max-w-5xl" : "gap-1.5 max-w-sm"
        }`}
      >
        {Array.from({ length: HAT_COUNT }, (_, hat) => {
          const isLifted = lifted.includes(hat) || revealRing === hat || wrongHat === hat;
          const showRing = revealRing === hat;
          const canPick = interactive && !lifted.includes(hat);
          const isSelected = selected === hat;
          return (
            <button
              key={hat}
              type="button"
              disabled={!canPick}
              onClick={() => canPick && onPick?.(hat)}
              className={`
                relative flex flex-col items-center rounded-2xl sm:rounded-3xl border-2 transition-colors
                ${size === "screen" ? "px-1 pt-7 pb-1.5 sm:px-1.5 sm:pt-10 sm:pb-2" : "px-1 pt-5 pb-1"}
                ${isSelected ? "border-amber-400 bg-amber-50" : showRing ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-gray-50"}
                ${canPick ? "cursor-pointer hover:border-amber-300 hover:bg-amber-50/60" : "cursor-default"}
              `}
            >
              {voters?.[hat]?.length ? (
                <span className="absolute top-1 inset-x-1 flex items-center justify-center gap-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black px-1 py-0.5 z-10">
                  <span className="truncate">{voters[hat].slice(0, 3).join("")}</span>
                  <span>{voters[hat].length}</span>
                </span>
              ) : null}
              <div className="relative w-full aspect-[5/4]">
                {/* the spot on the rug under the hat */}
                <div className="absolute inset-x-[8%] bottom-[2%] h-[26%] rounded-[50%] bg-amber-100 border border-amber-200" />
                {showRing && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.4, 1], opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="absolute inset-x-0 bottom-[4%] flex justify-center text-3xl sm:text-5xl drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                  >
                    💍
                  </motion.span>
                )}
                {isLifted && !showRing && (
                  <span className={`absolute inset-x-0 bottom-[8%] text-center text-[10px] sm:text-xs font-black ${wrongHat === hat ? "text-red-500" : "text-gray-400"}`}>
                    {wrongHat === hat ? "✗" : "پوچ"}
                  </span>
                )}
                <motion.div
                  className="absolute inset-0 flex items-end"
                  animate={
                    isLifted
                      ? { y: "-38%", rotate: hat % 2 ? 10 : -10, opacity: 0.55 }
                      : isSelected
                      ? { y: ["0%", "-8%", "0%"], rotate: 0, opacity: 1 }
                      : { y: "0%", rotate: 0, opacity: 1 }
                  }
                  transition={isSelected && !isLifted ? { duration: 0.6, repeat: Infinity } : { type: "spring", stiffness: 220, damping: 16 }}
                  whileHover={canPick ? { scale: 1.06 } : undefined}
                >
                  <KllawSvg highlighted={isSelected} />
                </motion.div>
                {markedHat === hat && !isLifted && (
                  <span className="absolute -top-2 right-0 text-base drop-shadow">💍</span>
                )}
              </div>
              <span
                className={`mt-1 min-w-[1.8rem] rounded-full px-2 text-sm sm:text-lg font-black tabular-nums ${
                  isSelected ? "bg-amber-500 text-white" : "text-gray-400"
                }`}
              >
                {hatNumber(hat)}
              </span>
            </button>
          );
        })}
      </div>

      {sweeping && (
        <motion.span
          className="pointer-events-none absolute top-[30%] text-3xl sm:text-4xl"
          animate={{ left: ["0%", "90%", "0%"] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          ✋
        </motion.span>
      )}
    </div>
  );
}
