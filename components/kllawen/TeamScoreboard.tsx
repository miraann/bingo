"use client";

import { motion } from "framer-motion";
import { TEAMS, type KllawenRosterEntry, type Team } from "@/lib/kllawenChannel";
import { TEAM_UI } from "@/components/kllawen/kllawenUi";

type CardProps = {
  team: Team;
  scores: Record<Team, number>;
  hiderTeam: Team;
  inGame: boolean;
  roster: KllawenRosterEntry[];
  captains: Record<Team, string | null>;
  highlightTeam?: Team | null;
  /** "stacked" = label over a big number; "compact" = small (phones);
   *  "header" = one short wide row (name on one side, score on the other) for the TV header. */
  variant?: "stacked" | "compact" | "header";
  className?: string;
};

/** One team's score card. */
export function TeamScoreCard({
  team, scores, hiderTeam, inGame, roster, captains, highlightTeam = null, variant = "stacked", className = "",
}: CardProps) {
  const ui = TEAM_UI[team];
  const captain = roster.find(p => p.playerId === captains[team]);
  // With no fixed target, the bar shows each team's share of the points so far.
  const total = scores.a + scores.b;
  const progress = total > 0 ? (scores[team] / total) * 100 : 0;
  const compact = variant === "compact";
  const header = variant === "header";

  const roleBadge = inGame && (
    <span className="text-[0.625rem] sm:text-xs font-black bg-white/80 rounded-full px-2 py-0.5 text-gray-600 whitespace-nowrap">
      {team === hiderTeam ? "🎩 دەشارێتەوە" : "🔍 دەگەڕێت"}
    </span>
  );
  const score = (
    <motion.span
      key={scores[team]}
      initial={{ scale: 1.5, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`block font-black tabular-nums leading-none ${ui.text} ${
        compact ? "text-2xl" : header ? "text-5xl" : "text-4xl sm:text-6xl"
      }`}
    >
      {scores[team]}
    </motion.span>
  );
  const bar = (
    <div className="h-1.5 sm:h-2 bg-white rounded-full overflow-hidden" dir="ltr">
      <motion.div animate={{ width: `${progress}%` }} className={`h-full rounded-full ${ui.bar}`} />
    </div>
  );
  const frame = `relative rounded-2xl sm:rounded-3xl border-2 ${ui.border} ${ui.soft} ${highlightTeam === team ? "ring-4 ring-amber-300" : ""}`;

  if (header) {
    return (
      <div className={`${frame} flex items-center gap-4 px-5 py-2 min-w-0 ${className}`}>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-black ${ui.text} text-xl whitespace-nowrap`}>{ui.dot} {ui.label}</span>
            {roleBadge}
          </div>
          {captain && (
            <span className="text-sm font-bold text-gray-500 truncate">👑 {captain.emoji} {captain.name}</span>
          )}
          {bar}
        </div>
        <div dir="ltr">{score}</div>
      </div>
    );
  }

  return (
    <div className={`${frame} ${compact ? "px-3 py-2" : "px-4 py-3 sm:px-6 sm:py-4"} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-black ${ui.text} ${compact ? "text-sm" : "text-base sm:text-xl"}`}>
          {ui.dot} {ui.label}
        </span>
        {roleBadge}
      </div>
      <div className="flex items-baseline gap-1 mt-1" dir="ltr">{score}</div>
      <div className="mt-1">{bar}</div>
      {captain && !compact && (
        <span className="block mt-1.5 text-[11px] sm:text-xs font-bold text-gray-500 truncate">
          👑 {captain.emoji} {captain.name}
        </span>
      )}
    </div>
  );
}

export function TeamScoreboard({
  compact = false,
  ...props
}: Omit<CardProps, "team" | "variant" | "className"> & { compact?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-3xl">
      {TEAMS.map(team => (
        <TeamScoreCard key={team} team={team} variant={compact ? "compact" : "stacked"} {...props} />
      ))}
    </div>
  );
}
