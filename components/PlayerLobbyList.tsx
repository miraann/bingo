"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import type { PlayerPresence } from "@/lib/gameChannel";
import { LobbyCard, SectionLabel } from "@/components/HostLobby";

export function PlayerLobbyList({ players, minHeight = "min-h-[10rem]" }: { players: PlayerPresence[]; minHeight?: string }) {
  return (
    <LobbyCard className="flex flex-col">
      <SectionLabel
        action={
          <span className="grid place-items-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-stone-100 ring-1 ring-stone-200 text-xs font-black text-stone-600 tabular-nums">
            {players.length}
          </span>
        }
      >
        یاریزانان
      </SectionLabel>

      {players.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 text-stone-400 py-6 ${minHeight}`}>
          <span className="grid place-items-center w-11 h-11 rounded-full bg-white ring-1 ring-stone-200">
            <Users size={20} strokeWidth={2} />
          </span>
          <span className="text-xs font-bold">چاوەڕێی یاریزانان...</span>
        </div>
      ) : (
        <div className={`flex flex-wrap content-start gap-2 ${minHeight}`}>
          <AnimatePresence>
            {players.map(p => (
              <motion.div
                key={p.playerId}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-2 bg-stone-50 ring-1 ring-stone-200/80 rounded-full ps-1.5 pe-3.5 py-1.5"
              >
                <span className="grid place-items-center w-7 h-7 rounded-full bg-white ring-1 ring-stone-200 text-base leading-none">{p.emoji}</span>
                <span className="text-sm font-bold text-stone-700">{p.name}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </LobbyCard>
  );
}
