"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { generatePlayerId } from "@/lib/id";
import { loadPlayerProfile, savePlayerProfile, type PlayerProfile } from "@/lib/playerProfile";
import { useChannelReconnect } from "@/hooks/useChannelReconnect";
import {
  KLLAWEN_EVENTS,
  kllawenChannelName,
  otherTeam,
  type HideVotePayload,
  type KllawenPublicState,
  type SeekAction,
  type Team,
} from "@/lib/kllawenChannel";

/** The hat this phone's captain hid the ring under, so a refresh still shows
 *  it (the host never sends the ring's position back before the reveal). */
interface HiddenHat {
  round: number;
  hat: number;
}

function hiddenStorageKey(gameId: string) {
  return `kllawen:hidden:${gameId}`;
}

function loadHidden(gameId: string): HiddenHat | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    const raw = window.localStorage.getItem(hiddenStorageKey(gameId));
    return raw ? (JSON.parse(raw) as HiddenHat) : null;
  } catch {
    return null;
  }
}

function saveHidden(gameId: string, hidden: HiddenHat) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(hiddenStorageKey(gameId), JSON.stringify(hidden));
  } catch {}
}

export interface HideVote {
  name: string;
  emoji: string;
  hat: number;
}

export type KllawenRole = "hidingCaptain" | "seekingCaptain" | "hider" | "seeker" | "spectator";

/** Drives the player side of کڵاوێن: mirrors the host's public snapshot and
 *  sends team picks / hide / seek moves for the host to validate and score. */
export function useKllawenPlayer(gameId: string) {
  const initialPlayer = useRef<PlayerProfile | null>(loadPlayerProfile(gameId));
  const [player, setPlayer] = useState<PlayerProfile | null>(initialPlayer.current);
  const [state, setState] = useState<KllawenPublicState | null>(null);
  const [hidden, setHidden] = useState<HiddenHat | null>(() => loadHidden(gameId));
  /** This round's hide votes from my team, by playerId (mine included). */
  const [votes, setVotes] = useState<Record<string, HideVote>>({});

  const channelRef = useRef<RealtimeChannel | null>(null);
  const { attempt, connected, onStatus, reconnect } = useChannelReconnect(channelRef, KLLAWEN_EVENTS.stateSyncRequest);
  const playerRef = useRef(player);
  const stateRef = useRef(state);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { stateRef.current = state; }, [state]);
  const myTeamRef = useRef<Team | null>(null);
  const voteRound = state?.phase === "HIDING" ? state.round : null;
  useEffect(() => { setVotes({}); }, [voteRound]);

  useEffect(() => {
    if (!gameId) return;

    const presenceKey = initialPlayer.current?.playerId ?? generatePlayerId();
    const channel = supabase.channel(kllawenChannelName(gameId), {
      config: { presence: { key: presenceKey } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: KLLAWEN_EVENTS.state }, ({ payload }: { payload: KllawenPublicState }) => {
      setState(payload);
    });

    channel.on("broadcast", { event: KLLAWEN_EVENTS.hideVote }, ({ payload }: { payload: HideVotePayload }) => {
      const s = stateRef.current;
      if (!s || s.phase !== "HIDING" || payload.round !== s.round || payload.team !== myTeamRef.current) return;
      setVotes(prev => ({ ...prev, [payload.playerId]: { name: payload.name, emoji: payload.emoji, hat: payload.hat } }));
    });

    let disposed = false;
    channel.subscribe(status => {
      if (disposed) return;
      onStatus(status);
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: KLLAWEN_EVENTS.stateSyncRequest, payload: {} });
        if (playerRef.current) {
          channel.track({
            playerId: playerRef.current.playerId, name: playerRef.current.name,
            emoji: playerRef.current.emoji, joinedAt: Date.now(),
          });
        }
      }
    });

    return () => { disposed = true; supabase.removeChannel(channel); channelRef.current = null; };
  }, [gameId, attempt, onStatus]);

  const join = useCallback((name: string, emoji: string) => {
    const playerId = initialPlayer.current?.playerId ?? generatePlayerId();
    const newPlayer: PlayerProfile = { playerId, name: name.trim(), emoji };
    initialPlayer.current = newPlayer;
    savePlayerProfile(gameId, newPlayer);
    setPlayer(newPlayer);
    channelRef.current?.track({ playerId, name: newPlayer.name, emoji, joinedAt: Date.now() });
  }, [gameId]);

  const chooseTeam = useCallback((team: Team) => {
    if (!playerRef.current) return;
    channelRef.current?.send({
      type: "broadcast",
      event: KLLAWEN_EVENTS.chooseTeam,
      payload: { playerId: playerRef.current.playerId, team },
    });
  }, []);

  const hideRing = useCallback((hat: number) => {
    const s = stateRef.current;
    if (!playerRef.current || !s || s.phase !== "HIDING") return;
    const next = { round: s.round, hat };
    setHidden(next);
    saveHidden(gameId, next);
    channelRef.current?.send({
      type: "broadcast",
      event: KLLAWEN_EVENTS.hideRing,
      payload: { playerId: playerRef.current.playerId, round: s.round, hat },
    });
  }, [gameId]);

  /** A hider teammate suggests a hat; only their own captain's phone counts it. */
  const voteHide = useCallback((hat: number) => {
    const s = stateRef.current;
    const p = playerRef.current;
    const team = myTeamRef.current;
    if (!p || !s || !team || s.phase !== "HIDING" || team !== s.hiderTeam) return;
    setVotes(prev => ({ ...prev, [p.playerId]: { name: p.name, emoji: p.emoji, hat } }));
    channelRef.current?.send({
      type: "broadcast",
      event: KLLAWEN_EVENTS.hideVote,
      payload: { playerId: p.playerId, name: p.name, emoji: p.emoji, team, round: s.round, hat } satisfies HideVotePayload,
    });
  }, []);

  const seekHat = useCallback((hat: number, action: SeekAction) => {
    const s = stateRef.current;
    if (!playerRef.current || !s || s.phase !== "SEEKING") return;
    channelRef.current?.send({
      type: "broadcast",
      event: KLLAWEN_EVENTS.seekHat,
      payload: { playerId: playerRef.current.playerId, round: s.round, hat, action },
    });
  }, []);

  const me = player && state ? state.roster.find(p => p.playerId === player.playerId) ?? null : null;
  const myTeam = me?.team ?? null;
  myTeamRef.current = myTeam;
  const isCaptain = player != null && myTeam != null && state?.captains[myTeam] === player.playerId;

  // The hiding captain always hides from their phone; the seeking captain
  // only seeks from it in phones mode (otherwise seeking is on the TV).
  let role: KllawenRole = "spectator";
  if (state && myTeam) {
    const hiding = myTeam === state.hiderTeam;
    if (isCaptain && hiding) role = "hidingCaptain";
    else if (isCaptain && state.controlMode === "phones") role = "seekingCaptain";
    else role = hiding ? "hider" : "seeker";
  }
  const myVote = player ? votes[player.playerId]?.hat ?? null : null;

  const myHiddenHat = state && hidden && hidden.round === state.round && role === "hidingCaptain" ? hidden.hat : null;
  const seekerTeam = state ? otherTeam(state.hiderTeam) : null;

  return {
    player, state, connected, reconnect,
    myTeam, isCaptain, role, myHiddenHat, seekerTeam,
    votes, myVote,
    join, chooseTeam, hideRing, voteHide, seekHat,
  };
}
