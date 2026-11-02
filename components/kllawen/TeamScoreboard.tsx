"use client";

import { motion } from "framer-motion";
import { TEAMS, type KllawenRosterEntry, type Team } from "@/lib/kllawenChannel";
import { TEAM_UI } from "@/components/kllawen/kllawenUi";

export function TeamScoreboard({
  scores,
  targetScore,
  hiderTeam,
  inGame,
  roster,
  captains,
  highlightTeam = null,
  compact = false,
}: {
  scores: Record<Team, number>;
  targetScore: number;
  hiderTeam: Team;
  inGame: boolean;
  roster: KllawenRosterEntry[];
  captains: Record<Team, string | null>;
  highlightTeam?: Team | null;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-3xl">
      {TEAMS.map(team => {
        const ui = TEAM_UI[team];
        const captain = roster.find(p => p.playerId === captains[team]);
        const progress = Math.min(100, (scores[team] / targetScore) * 100);
        return (
          <div
            key={team}
            className={`relative rounded-2xl sm:rounded-3xl border-2 ${ui.border} ${ui.soft} ${compact ? "px-3 py-2" : "px-4 py-3 sm:px-6 sm:py-4"} ${
              highlightTeam === team ? "ring-4 ring-amber-300" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`font-black ${ui.text} ${compact ? "text-sm" : "text-base sm:text-xl"}`}>
                {ui.dot} {ui.label}
              </span>
              {inGame && (
                <span className="text-[10px] sm:text-xs font-black bg-white/80 rounded-full px-2 py-0.5 text-gray-600 whitespace-nowrap">
                  {team === hiderTeam ? "🎩 دەشارێتەوە" : "🔍 دەگەڕێت"}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-1" dir="ltr">
              <motion.span
                key={scores[team]}
                initial={{ scale: 1.5, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-black tabular-nums ${ui.text} ${compact ? "text-2xl" : "text-4xl sm:text-6xl"}`}
              >
                {scores[team]}
              </motion.span>
              <span className="text-xs sm:text-sm font-bold text-gray-400">/ {targetScore}</span>
            </div>
            <div className="h-1.5 sm:h-2 bg-white rounded-full overflow-hidden mt-1" dir="ltr">
              <motion.div animate={{ width: `${progress}%` }} className={`h-full rounded-full ${ui.bar}`} />
            </div>
            {captain && !compact && (
              <span className="block mt-1.5 text-[11px] sm:text-xs font-bold text-gray-500 truncate">
                👑 {captain.emoji} {captain.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
