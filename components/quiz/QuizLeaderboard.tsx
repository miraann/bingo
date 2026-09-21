"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/quizChannel";

export function QuizLeaderboard({
  leaderboard,
  highlightPlayerId,
}: {
  leaderboard: LeaderboardEntry[];
  highlightPlayerId?: string;
}) {
  const top5 = leaderboard.slice(0, 5);

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <AnimatePresence initial={false}>
        {top5.map((entry, i) => {
          const isFirst = i === 0;
          const isMe = entry.playerId === highlightPlayerId;
          return (
            <motion.div
              key={entry.playerId}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.06 }}
              className={`
                flex items-center gap-3 rounded-2xl px-4 py-2.5
                ${isFirst ? "bg-gradient-to-r from-amber-400 to-yellow-400" :
                  isMe ? "bg-purple-50 border-2 border-purple-300" : "bg-gray-50 border border-gray-200"}
              `}
            >
              {isFirst ? (
                <motion.span
                  animate={{ rotate: [0, -14, 14, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                >
                  <Trophy size={18} className="text-white" strokeWidth={2.5} />
                </motion.span>
              ) : (
                <span
                  className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 ${
                    isMe ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span className="text-xl leading-none">{entry.emoji}</span>
              <span className={`font-bold flex-1 truncate ${isFirst ? "text-white" : "text-gray-700"}`}>{entry.name}</span>
              <span className={`font-black tabular-nums ${isFirst ? "text-white" : "text-gray-600"}`} dir="ltr">
                {entry.score}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {top5.length === 0 && <p className="text-xs text-gray-300 text-center py-4">هێشتا خاڵ نییە</p>}
    </div>
  );
}
