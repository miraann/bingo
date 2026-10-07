"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/* Moods shown next to the player's avatar while waiting in the lobby. */
const MOODS: { prop: string; label: string }[] = [
  { prop: "🤔", label: "بیر دەکاتەوە..." },
  { prop: "💃", label: "سەما دەکات!" },
  { prop: "🎮", label: "یاری دەکات..." },
  { prop: "🎵", label: "گۆرانی دەڵێت..." },
  { prop: "😴", label: "خەوی لێ دەکەوێت..." },
  { prop: "🤸", label: "وەرزش دەکات!" },
  { prop: "🍿", label: "پۆپکۆرن دەخوات..." },
];

const MOOD_MS = 4000;

export function WaitingAvatar({ emoji }: { emoji: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % MOODS.length), MOOD_MS);
    return () => clearInterval(id);
  }, []);

  const mood = MOODS[i];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <span className="text-6xl inline-block">{emoji}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            className="absolute -top-1 -left-1 text-3xl"
            initial={{ opacity: 0, scale: 0, rotate: -30 }}
            animate={{ opacity: 1, scale: [1, 1.15, 1], rotate: 0, transition: { scale: { duration: 1, repeat: Infinity } } }}
            exit={{ opacity: 0, scale: 0 }}
          >
            {mood.prop}
          </motion.span>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          className="text-xs font-bold text-gray-400"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          {mood.label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
