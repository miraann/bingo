"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const OPTION_COLORS = [
  { bg: "bg-red-500", hover: "hover:bg-red-600" },
  { bg: "bg-blue-500", hover: "hover:bg-blue-600" },
  { bg: "bg-amber-400", hover: "hover:bg-amber-500" },
  { bg: "bg-green-500", hover: "hover:bg-green-600" },
] as const;

export function QuizAnswerButtons({
  options,
  selectedAnswer,
  correctAnswer,
  disabled,
  onSelect,
  removedOptions = [],
  hintedAnswer = null,
}: {
  options: string[];
  selectedAnswer: number | null;
  correctAnswer: number | null;
  disabled: boolean;
  onSelect?: (index: number) => void;
  /** Options knocked out by a 50/50 hint — shown faded and unclickable. */
  removedOptions?: number[];
  /** Correct answer revealed early to this player by a hint. */
  hintedAnswer?: number | null;
}) {
  const revealed = correctAnswer !== null;

  return (
    <div className={`grid gap-3 w-full ${revealed ? "grid-cols-1 justify-items-center max-w-lg" : "grid-cols-1 sm:grid-cols-2 max-w-md"}`}>
      {options.map((opt, i) => {
        const color = OPTION_COLORS[i % OPTION_COLORS.length];
        const isSelected = selectedAnswer === i;
        const isCorrect = revealed && i === correctAnswer;
        const isWrongSelected = revealed && isSelected && i !== correctAnswer;
        const isRemoved = !revealed && removedOptions.includes(i);
        const isHinted = !revealed && hintedAnswer === i;
        const interactive = !disabled && !!onSelect && !isRemoved;

        // On reveal, only the correct answer (and the player's own wrong pick, if any) stay visible.
        if (revealed && !isCorrect && !isWrongSelected) return null;

        const borderClass = isCorrect
          ? "border-green-400"
          : isWrongSelected
          ? "border-red-500"
          : isSelected && !revealed
          ? "border-orange-400"
          : isHinted
          ? "border-yellow-300"
          : "border-transparent";

        return (
          <motion.button
            key={i}
            type="button"
            whileHover={interactive ? { scale: 1.03 } : undefined}
            whileTap={interactive ? { scale: 0.95 } : undefined}
            disabled={!interactive}
            onClick={() => onSelect?.(i)}
            className={`
              relative flex items-center justify-center gap-2 w-full
              rounded-2xl text-white font-black text-center
              shadow-lg transition-all duration-200 border-4
              ${isCorrect ? "px-6 py-8 text-xl sm:text-2xl" : "px-4 py-6 text-base sm:text-lg"}
              ${color.bg} ${interactive ? `${color.hover} cursor-pointer` : ""}
              ${isRemoved ? "opacity-15 line-through shadow-none" : ""}
              ${isHinted ? "ring-4 ring-yellow-300/70 shadow-[0_0_24px_rgba(253,224,71,0.8)]" : ""}
              ${borderClass}
              ${isCorrect ? "scale-[1.05]" : ""}
            `}
          >
            {isCorrect && <Check size={28} strokeWidth={3} />}
            {isWrongSelected && <X size={20} strokeWidth={3} />}
            {isHinted && <span aria-hidden>💡</span>}
            <span>{opt}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
