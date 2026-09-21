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
}: {
  options: string[];
  selectedAnswer: number | null;
  correctAnswer: number | null;
  disabled: boolean;
  onSelect?: (index: number) => void;
}) {
  const revealed = correctAnswer !== null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
      {options.map((opt, i) => {
        const color = OPTION_COLORS[i % OPTION_COLORS.length];
        const isSelected = selectedAnswer === i;
        const isCorrect = revealed && i === correctAnswer;
        const isWrongSelected = revealed && isSelected && i !== correctAnswer;
        const interactive = !disabled && !!onSelect;

        return (
          <motion.button
            key={i}
            type="button"
            whileHover={interactive ? { scale: 1.03 } : undefined}
            whileTap={interactive ? { scale: 0.95 } : undefined}
            disabled={!interactive}
            onClick={() => onSelect?.(i)}
            className={`
              relative flex items-center justify-center gap-2
              rounded-2xl px-4 py-6 text-white font-black text-base sm:text-lg text-center
              shadow-lg transition-all duration-200
              ${color.bg} ${interactive ? `${color.hover} cursor-pointer` : ""}
              ${revealed && !isCorrect && !isWrongSelected ? "opacity-40" : ""}
              ${isSelected && !revealed ? "ring-4 ring-white ring-offset-2 ring-offset-gray-100" : ""}
              ${isCorrect ? "ring-4 ring-white ring-offset-2 ring-offset-gray-100 scale-[1.03]" : ""}
              ${isWrongSelected ? "grayscale" : ""}
            `}
          >
            {isCorrect && <Check size={20} strokeWidth={3} />}
            {isWrongSelected && <X size={20} strokeWidth={3} />}
            <span>{opt}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
