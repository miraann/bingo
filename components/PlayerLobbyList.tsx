"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PlayerPresence } from "@/lib/gameChannel";

export function PlayerLobbyList({ players }: { players: PlayerPresence[] }) {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-bold text-gray-500">یاریزانان</span>
        <span className="text-sm font-black text-purple-600">{players.length}</span>
      </div>
      <div className="flex flex-wrap gap-2 justify-center min-h-[3rem] px-2">
        <AnimatePresence>
          {players.map(p => (
            <motion.div
              key={p.playerId}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="flex items-center gap-1.5 bg-gray-100 rounded-full ps-3 pe-2 py-1.5"
            >
              <span className="text-sm font-bold text-gray-700">{p.name}</span>
              <span className="text-lg leading-none">{p.emoji}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {players.length === 0 && (
          <span className="text-xs text-gray-300 py-3">چاوەڕێی یاریزانان...</span>
        )}
      </div>
    </div>
  );
}
