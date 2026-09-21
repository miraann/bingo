"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { findWinningPattern } from "@/lib/bingo";
import {
  GAME_EVENTS,
  gameChannelName,
  type BingoClaimPayload,
  type BingoResultPayload,
  type GamePhase,
  type PlayerPresence,
} from "@/lib/gameChannel";

const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1);

interface PersistedHostState {
  phase: GamePhase;
  calledNumbers: number[];
  currentNumber: number | null;
  autoMarkEnabled: boolean;
  highlightCurrent: boolean;
}

function storageKey(gameId: string) {
  return `bingo:host:${gameId}`;
}

function loadPersisted(gameId: string): PersistedHostState | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(gameId));
    return raw ? (JSON.parse(raw) as PersistedHostState) : null;
  } catch {
    return null;
  }
}

function savePersisted(gameId: string, state: PersistedHostState) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(storageKey(gameId), JSON.stringify(state));
  } catch {}
}

/** Drives the host side of a game: owns the authoritative called-numbers
 *  list, broadcasts every draw/phase change over the Supabase Realtime
 *  channel, and validates bingo claims against its own state. */
export function useHostGame(gameId: string) {
  const persisted = useRef<PersistedHostState | null>(null);
  if (persisted.current === null) {
    const loaded = loadPersisted(gameId);
    persisted.current = {
      phase: loaded?.phase ?? "LOBBY",
      calledNumbers: loaded?.calledNumbers ?? [],
      currentNumber: loaded?.currentNumber ?? null,
      autoMarkEnabled: loaded?.autoMarkEnabled ?? true,
      highlightCurrent: loaded?.highlightCurrent ?? true,
    };
  }

  const [phase, setPhase] = useState<GamePhase>(persisted.current.phase);
  const [calledNumbers, setCalledNumbers] = useState<number[]>(persisted.current.calledNumbers);
  const [currentNumber, setCurrentNumber] = useState<number | null>(persisted.current.currentNumber);
  const [autoMarkEnabled, setAutoMarkEnabled] = useState<boolean>(persisted.current.autoMarkEnabled);
  const [highlightCurrent, setHighlightCurrent] = useState<boolean>(persisted.current.highlightCurrent);
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const [winners, setWinners] = useState<BingoResultPayload[]>([]);
  const [connected, setConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const calledListRef = useRef<number[]>(calledNumbers);
  const calledSetRef = useRef<Set<number>>(new Set(calledNumbers));
  const phaseRef = useRef(phase);
  const currentNumberRef = useRef(currentNumber);
  const autoMarkEnabledRef = useRef(autoMarkEnabled);
  const highlightCurrentRef = useRef(highlightCurrent);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentNumberRef.current = currentNumber; }, [currentNumber]);
  useEffect(() => { autoMarkEnabledRef.current = autoMarkEnabled; }, [autoMarkEnabled]);
  useEffect(() => { highlightCurrentRef.current = highlightCurrent; }, [highlightCurrent]);
  useEffect(() => {
    calledListRef.current = calledNumbers;
    calledSetRef.current = new Set(calledNumbers);
    savePersisted(gameId, { phase, calledNumbers, currentNumber, autoMarkEnabled, highlightCurrent });
  }, [gameId, phase, calledNumbers, currentNumber, autoMarkEnabled, highlightCurrent]);

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(gameChannelName(gameId), {
      config: { presence: { key: "host" } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PlayerPresence>();
      const list: PlayerPresence[] = [];
      for (const key of Object.keys(state)) {
        if (key === "host") continue;
        const entry = state[key]?.[0];
        if (entry) list.push(entry as unknown as PlayerPresence);
      }
      list.sort((a, b) => a.joinedAt - b.joinedAt);
      setPlayers(list);
    });

    channel.on("broadcast", { event: GAME_EVENTS.stateSyncRequest }, () => {
      channel.send({
        type: "broadcast",
        event: GAME_EVENTS.stateSync,
        payload: {
          phase: phaseRef.current,
          calledNumbers: calledListRef.current,
          currentNumber: currentNumberRef.current,
          autoMarkEnabled: autoMarkEnabledRef.current,
          highlightCurrent: highlightCurrentRef.current,
        },
      });
    });

    channel.on("broadcast", { event: GAME_EVENTS.bingoClaim }, ({ payload }: { payload: BingoClaimPayload }) => {
      const pattern = findWinningPattern(payload.card, calledSetRef.current);
      const result: BingoResultPayload = {
        playerId: payload.playerId,
        name: payload.name,
        emoji: payload.emoji,
        valid: pattern !== null,
        pattern,
      };
      channel.send({ type: "broadcast", event: GAME_EVENTS.bingoResult, payload: result });
      if (result.valid) {
        setWinners(prev => (prev.some(w => w.playerId === result.playerId) ? prev : [...prev, result]));
      }
    });

    channel.subscribe(status => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        channel.track({ playerId: "host", name: "host", emoji: "🎙️", joinedAt: Date.now() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId]);

  const startGame = useCallback(() => {
    setPhase("PLAYING");
    channelRef.current?.send({
      type: "broadcast",
      event: GAME_EVENTS.phaseChanged,
      payload: { phase: "PLAYING" },
    });
  }, []);

  const endGame = useCallback(() => {
    setPhase("ENDED");
    channelRef.current?.send({
      type: "broadcast",
      event: GAME_EVENTS.phaseChanged,
      payload: { phase: "ENDED" },
    });
  }, []);

  const toggleAutoMark = useCallback(() => {
    setAutoMarkEnabled(prev => {
      const next = !prev;
      channelRef.current?.send({
        type: "broadcast",
        event: GAME_EVENTS.autoMarkChanged,
        payload: { enabled: next },
      });
      return next;
    });
  }, []);

  const toggleHighlightCurrent = useCallback(() => {
    setHighlightCurrent(prev => {
      const next = !prev;
      channelRef.current?.send({
        type: "broadcast",
        event: GAME_EVENTS.highlightChanged,
        payload: { enabled: next },
      });
      return next;
    });
  }, []);

  const drawNumber = useCallback((): number | null => {
    const currentSet = calledSetRef.current;
    if (currentSet.size >= 75) return null;
    const remaining = ALL_NUMBERS.filter(n => !currentSet.has(n));
    const n = remaining[Math.floor(Math.random() * remaining.length)];
    const nextList = [n, ...calledListRef.current];
    calledListRef.current = nextList;
    calledSetRef.current = new Set(nextList);

    setCurrentNumber(n);
    setCalledNumbers(nextList);

    channelRef.current?.send({
      type: "broadcast",
      event: GAME_EVENTS.numberDrawn,
      payload: { number: n, calledNumbers: nextList, poolRemaining: 75 - nextList.length },
    });

    return n;
  }, []);

  const resetGame = useCallback(() => {
    calledListRef.current = [];
    calledSetRef.current = new Set();
    setCalledNumbers([]);
    setCurrentNumber(null);
    setPhase("LOBBY");
    setWinners([]);
    channelRef.current?.send({ type: "broadcast", event: GAME_EVENTS.gameReset, payload: {} });
  }, []);

  return {
    phase,
    players,
    calledNumbers,
    currentNumber,
    winners,
    connected,
    autoMarkEnabled,
    toggleAutoMark,
    highlightCurrent,
    toggleHighlightCurrent,
    startGame,
    endGame,
    drawNumber,
    resetGame,
  };
}
