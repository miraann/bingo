"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { generateBingoCard, type BingoCard } from "@/lib/bingo";
import { generatePlayerId } from "@/lib/id";
import { loadPlayerProfile, savePlayerProfile } from "@/lib/playerProfile";
import { useChannelReconnect } from "@/hooks/useChannelReconnect";
import {
  GAME_EVENTS,
  gameChannelName,
  type BingoResultPayload,
  type GamePhase,
  type NumberDrawnPayload,
  type PhaseChangedPayload,
  type StateSyncPayload,
  type ToggleChangedPayload,
} from "@/lib/gameChannel";

interface PersistedPlayer {
  playerId: string;
  name: string;
  emoji: string;
  card: BingoCard;
}

export type ClaimStatus = "idle" | "pending" | "valid" | "invalid";

function storageKey(gameId: string) {
  return `bingo:player:${gameId}`;
}

function loadPersisted(gameId: string): PersistedPlayer | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(gameId));
    if (raw) return JSON.parse(raw) as PersistedPlayer;
  } catch {}
  // Already registered for this game code in the quiz — reuse that identity.
  const profile = loadPlayerProfile(gameId);
  if (!profile) return null;
  const fromProfile: PersistedPlayer = { ...profile, card: generateBingoCard() };
  savePersisted(gameId, fromProfile);
  return fromProfile;
}

function savePersisted(gameId: string, p: PersistedPlayer) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(storageKey(gameId), JSON.stringify(p));
  } catch {}
}

/** Marked cells, kept locally so a refresh or reconnect doesn't wipe them. */
function markedStorageKey(gameId: string) {
  return `bingo:marked:${gameId}`;
}

function loadMarked(gameId: string): Set<number> {
  if (typeof window === "undefined" || !gameId) return new Set();
  try {
    const raw = window.localStorage.getItem(markedStorageKey(gameId));
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveMarked(gameId: string, marked: Set<number>) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(markedStorageKey(gameId), JSON.stringify([...marked]));
  } catch {}
}

/** Drives the player side of a game: registers a name/emoji, generates and
 *  persists a personal card, mirrors the host's broadcasts, and sends bingo
 *  claims for the host to validate. */
export function usePlayerGame(gameId: string) {
  const initialPlayer = useRef<PersistedPlayer | null>(loadPersisted(gameId));
  const [player, setPlayer] = useState<PersistedPlayer | null>(initialPlayer.current);
  const [phase, setPhase] = useState<GamePhase>("LOBBY");
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [marked, setMarked] = useState<Set<number>>(() => loadMarked(gameId));
  const [autoMarkEnabled, setAutoMarkEnabled] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [announcements, setAnnouncements] = useState<BingoResultPayload[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { attempt, connected, onStatus, reconnect } = useChannelReconnect(channelRef, GAME_EVENTS.stateSyncRequest);
  const playerRef = useRef(player);
  const autoMarkEnabledRef = useRef(autoMarkEnabled);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { autoMarkEnabledRef.current = autoMarkEnabled; }, [autoMarkEnabled]);
  useEffect(() => { saveMarked(gameId, marked); }, [gameId, marked]);

  useEffect(() => {
    if (!gameId) return;

    const presenceKey = initialPlayer.current?.playerId ?? generatePlayerId();
    const channel = supabase.channel(gameChannelName(gameId), {
      config: { presence: { key: presenceKey } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: GAME_EVENTS.numberDrawn }, ({ payload }: { payload: NumberDrawnPayload }) => {
      setCalledNumbers(payload.calledNumbers);
      setCurrentNumber(payload.number);
      if (autoMarkEnabledRef.current) setMarked(prev => new Set(prev).add(payload.number));
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
    });

    channel.on("broadcast", { event: GAME_EVENTS.phaseChanged }, ({ payload }: { payload: PhaseChangedPayload }) => {
      setPhase(payload.phase);
    });

    channel.on("broadcast", { event: GAME_EVENTS.autoMarkChanged }, ({ payload }: { payload: ToggleChangedPayload }) => {
      setAutoMarkEnabled(payload.enabled);
    });

    channel.on("broadcast", { event: GAME_EVENTS.hintsChanged }, ({ payload }: { payload: ToggleChangedPayload }) => {
      setHintsEnabled(payload.enabled);
    });

    channel.on("broadcast", { event: GAME_EVENTS.stateSync }, ({ payload }: { payload: StateSyncPayload }) => {
      setPhase(payload.phase);
      setCalledNumbers(payload.calledNumbers);
      setCurrentNumber(payload.currentNumber);
      setAutoMarkEnabled(payload.autoMarkEnabled);
      // Catch up on numbers drawn while this phone was offline.
      if (payload.autoMarkEnabled && payload.calledNumbers.length > 0) {
        setMarked(prev => new Set([...prev, ...payload.calledNumbers]));
      }
      setHintsEnabled(payload.hintsEnabled);
    });

    channel.on("broadcast", { event: GAME_EVENTS.gameReset }, () => {
      setPhase("LOBBY");
      setCalledNumbers([]);
      setCurrentNumber(null);
      setMarked(new Set());
      setClaimStatus("idle");
      setAnnouncements([]);
    });

    channel.on("broadcast", { event: GAME_EVENTS.bingoResult }, ({ payload }: { payload: BingoResultPayload }) => {
      setAnnouncements(prev => [payload, ...prev].slice(0, 8));
      if (playerRef.current && payload.playerId === playerRef.current.playerId) {
        setClaimStatus(payload.valid ? "valid" : "invalid");
      }
    });

    let disposed = false;
    channel.subscribe(status => {
      if (disposed) return;
      onStatus(status);
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: GAME_EVENTS.stateSyncRequest, payload: {} });
        if (playerRef.current) {
          channel.track({
            playerId: playerRef.current.playerId,
            name: playerRef.current.name,
            emoji: playerRef.current.emoji,
            joinedAt: Date.now(),
          });
        }
      }
    });

    return () => {
      disposed = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId, attempt, onStatus]);

  const join = useCallback((name: string, emoji: string) => {
    const playerId = initialPlayer.current?.playerId ?? generatePlayerId();
    const card = initialPlayer.current?.card ?? generateBingoCard();
    const newPlayer: PersistedPlayer = { playerId, name: name.trim(), emoji, card };
    initialPlayer.current = newPlayer;
    savePersisted(gameId, newPlayer);
    savePlayerProfile(gameId, newPlayer);
    setPlayer(newPlayer);
    setMarked(new Set());
    channelRef.current?.track({ playerId, name: newPlayer.name, emoji, joinedAt: Date.now() });
  }, [gameId]);

  const toggleMark = useCallback((n: number) => {
    setMarked(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }, []);

  const claimBingo = useCallback(() => {
    if (!playerRef.current) return;
    setClaimStatus("pending");
    channelRef.current?.send({
      type: "broadcast",
      event: GAME_EVENTS.bingoClaim,
      payload: {
        playerId: playerRef.current.playerId,
        name: playerRef.current.name,
        emoji: playerRef.current.emoji,
        card: playerRef.current.card,
      },
    });
  }, []);

  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);

  return {
    player,
    phase,
    calledNumbers,
    calledSet,
    currentNumber,
    marked,
    autoMarkEnabled,
    hintsEnabled,
    claimStatus,
    setClaimStatus,
    announcements,
    connected,
    reconnect,
    join,
    toggleMark,
    claimBingo,
  };
}
