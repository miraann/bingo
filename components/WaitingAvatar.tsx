"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";

const loop = (duration: number, extra: object = {}) => ({ duration, repeat: Infinity, ...extra });

/* Moods the player's avatar cycles through while waiting in the lobby. */
const MOODS: { prop: string; anim: TargetAndTransition }[] = [
  { prop: "🤔", anim: { rotate: [0, -8, 0, -8, 0], y: [0, -2, 0], transition: loop(2) } },
  { prop: "💃", anim: { rotate: [-15, 15, -15], x: [-8, 8, -8], y: [0, -10, 0, -10, 0], transition: loop(0.8) } },
  { prop: "🎮", anim: { y: [0, -4, 0], scale: [1, 1.05, 1], transition: loop(0.35) } },
  { prop: "🎵", anim: { rotate: [-6, 6, -6], transition: loop(1, { ease: "easeInOut" }) } },
  { prop: "😴", anim: { rotate: [0, 12, 12, 0], y: [0, 4, 4, 0], transition: loop(3) } },
  { prop: "🤸", anim: { rotate: [0, 360], y: [0, -24, 0], transition: loop(1.2, { repeatDelay: 0.4 }) } },
  { prop: "🍿", anim: { scale: [1, 1.08, 1], transition: loop(0.5) } },
  { prop: "⚽", anim: { y: [0, -18, 0], rotate: [0, -10, 0], transition: loop(0.7) } },
  { prop: "📚", anim: { rotate: [0, 4, 0, -4, 0], transition: loop(3) } },
  { prop: "☕", anim: { rotate: [0, -10, 0], y: [0, -3, 0], transition: loop(2.5, { repeatDelay: 0.8 }) } },
  { prop: "🍕", anim: { scale: [1, 1.1, 1, 1.1, 1], transition: loop(1) } },
  { prop: "🥁", anim: { y: [0, 3, 0], rotate: [-3, 3, -3], transition: loop(0.25) } },
  { prop: "🎤", anim: { scale: [1, 1.08, 1], rotate: [-5, 5, -5], transition: loop(0.9) } },
  { prop: "😂", anim: { rotate: [-10, 10, -10], y: [0, -3, 0], transition: loop(0.3) } },
  { prop: "😎", anim: { x: [-6, 6, -6], transition: loop(1.6, { ease: "easeInOut" }) } },
  { prop: "🏀", anim: { y: [0, -20, 0], transition: loop(0.6, { ease: "easeOut" }) } },
  { prop: "🎨", anim: { rotate: [0, 6, 0], transition: loop(1.5) } },
  { prop: "🤳", anim: { rotate: [0, -6, 0], scale: [1, 1.05, 1], transition: loop(1.8, { repeatDelay: 0.5 }) } },
  { prop: "🏆", anim: { y: [0, -12, 0], scale: [1, 1.1, 1], transition: loop(1) } },
  { prop: "🥶", anim: { x: [-2, 2, -2], transition: loop(0.1) } },
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
    <div className="flex flex-col items-center">
      {/* Thought bubble above the avatar */}
      <div className="h-24 w-28 flex items-end justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 15 } }}
            exit={{ opacity: 0, scale: 0, y: 10, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="bg-white border-2 border-gray-200 rounded-full shadow-md w-16 h-16 flex items-center justify-center"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-3xl">{mood.prop}</span>
            </motion.div>
            <span className="mt-1 w-3 h-3 rounded-full bg-white border-2 border-gray-200 shadow-sm" />
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-white border border-gray-200" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="w-28 h-24 flex items-center justify-center">
        <motion.span key={i} className="text-6xl inline-block" animate={mood.anim}>
          {emoji}
        </motion.span>
      </div>
    </div>
  );
}
