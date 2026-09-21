"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { BingoResultPayload } from "@/lib/gameChannel";
import { patternLabel } from "@/lib/bingo";

export function WinnerBanner({ announcement }: { announcement: BingoResultPayload | null }) {
  return (
    <AnimatePresence>
      {announcement && announcement.valid && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-2 text-center"
        >
          <span className="text-2xl">{announcement.emoji}</span>
          <span>
            {announcement.name} بینگۆی کرد! 🎉
            {announcement.pattern && (
              <span className="block text-xs font-bold opacity-90">
                {patternLabel(announcement.pattern)}
              </span>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
