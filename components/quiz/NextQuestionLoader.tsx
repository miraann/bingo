"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** "Next question in 5…4…" countdown shown between questions — full-screen
 *  on the player screen, inline under the host's next-question button. */
export function NextQuestionLoader({
  index,
  total,
  durationMs,
  inline = false,
}: {
  /** Zero-based index of the upcoming question. */
  index: number;
  total: number;
  durationMs: number;
  inline?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inline) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [inline]);

  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, durationMs - (now - startedAt));
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  const size = inline ? 110 : 160;
  const strokeWidth = inline ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      ref={rootRef}
      dir="rtl"
      initial={{ opacity: 0, y: inline ? -8 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={inline
        ? "flex flex-col items-center gap-3 py-2"
        : "fixed inset-0 z-40 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-6 px-4"}
    >
      <span className="text-sm font-bold text-gray-400" dir="ltr">
        {index + 1} / {total}
      </span>
      {!inline && <h2 className="text-2xl md:text-3xl font-black text-gray-800">پرسیاری داهاتوو...</h2>}

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="#059669" strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: circumference }}
            transition={{ duration: durationMs / 1000, ease: "linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={secondsLeft}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`${inline ? "text-4xl" : "text-6xl"} font-black text-emerald-600 tabular-nums`}
            >
              {secondsLeft}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-3 h-3 rounded-full bg-emerald-500"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
