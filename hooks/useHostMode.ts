"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HOST_MODE_EVENTS, hostModeChannelName, type HostModePayload } from "@/lib/hostModeChannel";
import type { HostMode } from "@/components/GameModeSelector";

/** Host side: announces the dashboard's game mode as soon as it connects
 *  (i.e. whenever the host switches between /bingo and /quiz) and answers
 *  late joiners asking which game is running. */
export function useBroadcastHostMode(gameId: string, mode: HostMode) {
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(hostModeChannelName(gameId));
    const announce = () =>
      channel.send({
        type: "broadcast",
        event: HOST_MODE_EVENTS.modeChanged,
        payload: { mode: modeRef.current } satisfies HostModePayload,
      });

    channel.on("broadcast", { event: HOST_MODE_EVENTS.modeSyncRequest }, announce);
    channel.subscribe(status => {
      if (status === "SUBSCRIBED") announce();
    });

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);
}

const HOST_MODE_TIMEOUT_MS = 3000;

function lastModeKey(gameId: string) {
  return `player:lastMode:${gameId}`;
}

/** Player side: follows whichever game the host has open. Returns null while
 *  still waiting for the host's first answer; if the host doesn't answer in
 *  time, falls back to the last mode seen for this game (or `fallback`). */
export function useHostMode(gameId: string, fallback: HostMode): HostMode | null {
  const [mode, setMode] = useState<HostMode | null>(null);

  useEffect(() => {
    if (!gameId) return;
    let heard = false;

    const channel = supabase.channel(hostModeChannelName(gameId));
    channel.on("broadcast", { event: HOST_MODE_EVENTS.modeChanged }, ({ payload }: { payload: HostModePayload }) => {
      if (payload.mode !== "bingo" && payload.mode !== "quiz") return;
      heard = true;
      setMode(payload.mode);
      try { window.localStorage.setItem(lastModeKey(gameId), payload.mode); } catch {}
    });
    channel.subscribe(status => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: HOST_MODE_EVENTS.modeSyncRequest, payload: {} });
      }
    });

    const timeout = setTimeout(() => {
      if (heard) return;
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(lastModeKey(gameId)); } catch {}
      setMode(saved === "bingo" || saved === "quiz" ? saved : fallback);
    }, HOST_MODE_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [gameId, fallback]);

  return mode;
}
