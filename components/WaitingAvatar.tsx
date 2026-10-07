"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";

/* Moods the player's avatar cycles through while waiting in the lobby. */
const MOODS: { prop: string; label: string; anim: TargetAndTransition }[] = [
  {
    prop: "🤔", label: "بیر دەکاتەوە...",
    anim: { rotate: [0, -8, 0, -8, 0], y: [0, -2, 0], transition: { duration: 2, repeat: Infinity } },
  },
  {
    prop: "💃", label: "سەما دەکات!",
    anim: { rotate: [-15, 15, -15], x: [-8, 8, -8], y: [0, -10, 0, -10, 0], transition: { duration: 0.8, repeat: Infinity } },
  },
  {
    prop: "🎮", label: "یاری دەکات...",
    anim: { y: [0, -4, 0], scale: [1, 1.05, 1], transition: { duration: 0.35, repeat: Infinity } },
  },
  {
    prop: "🎵", label: "گۆرانی دەڵێت...",
    anim: { rotate: [-6, 6, -6], transition: { duration: 1, repeat: Infinity, ease: "easeInOut" } },
  },
  {
    prop: "😴", label: "خەوی لێ دەکەوێت...",
    anim: { rotate: [0, 12, 12, 0], y: [0, 4, 4, 0], transition: { duration: 3, repeat: Infinity } },
  },
  {
    prop: "🤸", label: "وەرزش دەکات!",
    anim: { rotate: [0, 360], y: [0, -24, 0], transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.4 } },
  },
  {
    prop: "🍿", label: "پۆپکۆرن دەخوات...",
    anim: { scale: [1, 1.08, 1], transition: { duration: 0.5, repeat: Infinity } },
  },
];

const MOOD_MS = 15000;

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
        <motion.span key={i} className="text-6xl inline-block" animate={mood.anim}>
          {emoji}
        </motion.span>
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
