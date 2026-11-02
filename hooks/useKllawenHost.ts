"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  DEFAULT_TARGET_SCORE,
  HAT_COUNT,
  KLLAWEN_EVENTS,
  ROUND_INTRO_MS,
  TEAMS,
  kllawenChannelName,
  otherTeam,
  resolveSeek,
  type ChooseTeamPayload,
  type ControlMode,
  type HideRingPayload,
  type KllawenPhase,
  type KllawenPlayerPresence,
  type KllawenPublicState,
  type KllawenRosterEntry,
  type RoundResult,
  type SeekAction,
  type SeekHatPayload,
  type Team,
  type TeamMode,
} from "@/lib/kllawenChannel";

/** The host's full game state — the only place `ringHat` ever lives. */
interface HostGame {
  phase: KllawenPhase;
  controlMode: ControlMode;
  teamMode: TeamMode;
  targetScore: number;
  hiderTeam: Team;
  scores: Record<Team, number>;
  round: number;
  ringHat: number | null;
  lifted: number[];
  result: RoundResult | null;
  /** playerId → team. Kept for players who drop off so a rejoin lands them back. */
  teams: Record<string, Team>;
  /** Captain the host picked for each team; falls back to the team's first joiner. */
  captainPicks: Record<Team, string | null>;
}

const INITIAL_GAME: HostGame = {
  phase: "LOBBY",
  controlMode: "phones",
  teamMode: "choose",
  targetScore: DEFAULT_TARGET_SCORE,
  hiderTeam: "a",
  scores: { a: 0, b: 0 },
  round: 0,
  ringHat: null,
  lifted: [],
  result: null,
  teams: {},
  captainPicks: { a: null, b: null },
};

const AUTO_ADVANCE_DELAY_MS = 7000;

function storageKey(gameId: string) {
  return `kllawen:host:${gameId}`;
}

function loadPersisted(gameId: string): HostGame | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(gameId));
    if (!raw) return null;
    const game: HostGame = { ...INITIAL_GAME, ...(JSON.parse(raw) as Partial<HostGame>) };
    // The intro's timer didn't survive the reload, so go straight to hiding.
    return game.phase === "ROUND_INTRO" ? { ...game, phase: "HIDING", result: null } : game;
  } catch {
    return null;
  }
}

function savePersisted(gameId: string, game: HostGame) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(storageKey(gameId), JSON.stringify(game));
  } catch {}
}

function randomHat() {
  return Math.floor(Math.random() * HAT_COUNT);
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildRoster(players: KllawenPlayerPresence[], teams: Record<string, Team>): KllawenRosterEntry[] {
  return players.map(p => ({ ...p, team: teams[p.playerId] ?? null }));
}

function computeCaptains(roster: KllawenRosterEntry[], picks: Record<Team, string | null>): Record<Team, string | null> {
  const captainOf = (team: Team) => {
    const members = roster.filter(p => p.team === team);
    if (picks[team] && members.some(p => p.playerId === picks[team])) return picks[team];
    return members[0]?.playerId ?? null;
  };
  return { a: captainOf("a"), b: captainOf("b") };
}

/** Drives the host side of کڵاوێن: owns the hidden ring, validates every
 *  hide / seek move (from a captain's phone or from the main screen), scores
 *  rounds via `resolveSeek`, and broadcasts a public snapshot on every change. */
export function useKllawenHost(gameId: string) {
  const [game, setGame] = useState<HostGame>(INITIAL_GAME);
  const [players, setPlayers] = useState<KllawenPlayerPresence[]>([]);
  const [connected, setConnected] = useState(false);

  const gameRef = useRef(game);
  const playersRef = useRef(players);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForRef = useRef("");

  const update = useCallback((fn: (g: HostGame) => HostGame) => {
    const next = fn(gameRef.current);
    if (next === gameRef.current) return;
    gameRef.current = next;
    setGame(next);
  }, []);

  // gameId arrives after mount (read from localStorage), so restore once it does.
  useEffect(() => {
    if (!gameId || loadedForRef.current === gameId) return;
    loadedForRef.current = gameId;
    const loaded = loadPersisted(gameId);
    gameRef.current = loaded ?? INITIAL_GAME;
    setGame(gameRef.current);
  }, [gameId]);

  const roster = useMemo(() => buildRoster(players, game.teams), [players, game.teams]);
  const captains = useMemo(() => computeCaptains(roster, game.captainPicks), [roster, game.captainPicks]);
  const captainsRef = useRef(captains);
  captainsRef.current = captains;

  const publicState = useMemo<KllawenPublicState>(() => ({
    phase: game.phase,
    controlMode: game.controlMode,
    teamMode: game.teamMode,
    targetScore: game.targetScore,
    hiderTeam: game.hiderTeam,
    scores: game.scores,
    round: game.round,
    lifted: game.lifted,
    result: game.result,
    roster,
    captains,
  }), [game, roster, captains]);
  const publicStateRef = useRef(publicState);
  publicStateRef.current = publicState;

  const broadcastState = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: KLLAWEN_EVENTS.state, payload: publicStateRef.current });
  }, []);

  useEffect(() => {
    // Skip the render that still holds INITIAL_GAME right before the restore lands.
    if (loadedForRef.current !== gameId || gameRef.current !== game) return;
    savePersisted(gameId, game);
  }, [gameId, game]);

  useEffect(() => { broadcastState(); }, [publicState, broadcastState]);

  // Random teams: deal anyone who joins without a team onto the smaller side.
  useEffect(() => {
    playersRef.current = players;
    if (game.teamMode !== "random") return;
    const unassigned = players.filter(p => !game.teams[p.playerId]);
    if (unassigned.length === 0) return;
    update(g => {
      const teams = { ...g.teams };
      const count = (t: Team) => players.filter(p => teams[p.playerId] === t).length;
      for (const p of unassigned) teams[p.playerId] = count("a") <= count("b") ? "a" : "b";
      return { ...g, teams };
    });
  }, [players, game.teamMode, game.teams, update]);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  }, []);

  /** Holds every screen on the round countdown (which still shows the last
   *  round's result), then opens hiding. */
  const scheduleHiding = useCallback(() => {
    introTimerRef.current = setTimeout(() => {
      introTimerRef.current = null;
      update(g => (g.phase === "ROUND_INTRO" ? { ...g, phase: "HIDING", result: null } : g));
    }, ROUND_INTRO_MS);
  }, [update]);

  const nextRoundRef = useRef<() => void>(() => {});

  const hide = useCallback((hat: number) => {
    if (gameRef.current.phase !== "HIDING" || hat < 0 || hat >= HAT_COUNT) return;
    update(g => ({ ...g, ringHat: hat, lifted: [], phase: "SEEKING" }));
  }, [update]);

  const seek = useCallback((hat: number, action: SeekAction) => {
    const g = gameRef.current;
    if (g.phase !== "SEEKING" || g.ringHat == null || hat < 0 || hat >= HAT_COUNT || g.lifted.includes(hat)) return;
    const resolution = resolveSeek(g.ringHat, g.lifted, hat, action, g.hiderTeam);
    if (resolution.kind === "continue") {
      update(prev => ({ ...prev, lifted: resolution.lifted }));
      return;
    }
    const { result } = resolution;
    update(prev => ({
      ...prev,
      lifted: resolution.lifted,
      result,
      phase: "ROUND_RESULT",
      scores: result.scoringTeam
        ? { ...prev.scores, [result.scoringTeam]: prev.scores[result.scoringTeam] + result.points }
        : prev.scores,
    }));
    clearAutoAdvance();
    autoAdvanceTimerRef.current = setTimeout(() => nextRoundRef.current(), AUTO_ADVANCE_DELAY_MS);
  }, [update, clearAutoAdvance]);

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(kllawenChannelName(gameId), {
      config: { presence: { key: "host" } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<KllawenPlayerPresence>();
      const list: KllawenPlayerPresence[] = [];
      for (const key of Object.keys(state)) {
        if (key === "host") continue;
        const entry = state[key]?.[0];
        if (entry) list.push(entry as unknown as KllawenPlayerPresence);
      }
      list.sort((a, b) => a.joinedAt - b.joinedAt);
      setPlayers(list);
    });

    channel.on("broadcast", { event: KLLAWEN_EVENTS.stateSyncRequest }, () => broadcastState());

    channel.on("broadcast", { event: KLLAWEN_EVENTS.chooseTeam }, ({ payload }: { payload: ChooseTeamPayload }) => {
      const g = gameRef.current;
      if (g.teamMode !== "choose" || (payload.team !== "a" && payload.team !== "b")) return;
      // Mid-game a player may only pick a side once — no hopping to the winning team.
      if (g.phase !== "LOBBY" && g.teams[payload.playerId]) return;
      update(prev => ({ ...prev, teams: { ...prev.teams, [payload.playerId]: payload.team } }));
    });

    channel.on("broadcast", { event: KLLAWEN_EVENTS.hideRing }, ({ payload }: { payload: HideRingPayload }) => {
      const g = gameRef.current;
      // Hiding is always the hiding captain's call, from their phone — even in
      // screen mode, so the ring's hat never shows on the TV.
      if (payload.round !== g.round) return;
      if (payload.playerId !== captainsRef.current[g.hiderTeam]) return;
      hide(payload.hat);
    });

    channel.on("broadcast", { event: KLLAWEN_EVENTS.seekHat }, ({ payload }: { payload: SeekHatPayload }) => {
      const g = gameRef.current;
      if (g.controlMode !== "phones" || payload.round !== g.round) return;
      if (payload.playerId !== captainsRef.current[otherTeam(g.hiderTeam)]) return;
      if (payload.action !== "empty" && payload.action !== "claim") return;
      seek(payload.hat, payload.action);
    });

    channel.subscribe(status => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        channel.track({ playerId: "host", name: "host", emoji: "🎙️", joinedAt: Date.now() });
        broadcastState();
      }
    });

    return () => {
      clearAutoAdvance();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId, broadcastState, clearAutoAdvance, update, hide, seek]);

  /* ── Lobby settings ──────────────────────────────────────────────────── */

  const setControlMode = useCallback((controlMode: ControlMode) => {
    update(g => ({ ...g, controlMode }));
  }, [update]);

  const setTeamMode = useCallback((teamMode: TeamMode) => {
    update(g => ({ ...g, teamMode }));
  }, [update]);

  const setTargetScore = useCallback((targetScore: number) => {
    if (!Number.isFinite(targetScore) || targetScore < 1) return;
    update(g => ({ ...g, targetScore }));
  }, [update]);

  const setPlayerTeam = useCallback((playerId: string, team: Team) => {
    update(g => ({ ...g, teams: { ...g.teams, [playerId]: team } }));
  }, [update]);

  const setCaptain = useCallback((team: Team, playerId: string) => {
    update(g => ({ ...g, captainPicks: { ...g.captainPicks, [team]: playerId } }));
  }, [update]);

  /** Deals every connected player out alternately after a shuffle. */
  const shuffleTeams = useCallback(() => {
    update(g => {
      const teams = { ...g.teams };
      shuffle(playersRef.current).forEach((p, i) => { teams[p.playerId] = TEAMS[i % 2]; });
      return { ...g, teams, captainPicks: { a: null, b: null } };
    });
  }, [update]);

  /* ── Game flow ───────────────────────────────────────────────────────── */

  /** Phones mode needs a captain on each side; on a shared screen anyone can play. */
  const canStart = game.controlMode === "screen" || (captains.a !== null && captains.b !== null);

  const startGame = useCallback(() => {
    if (gameRef.current.phase !== "LOBBY") return;
    clearAutoAdvance();
    // Like the coin toss at the start of a real game: a random team hides first.
    update(g => ({
      ...g,
      phase: "ROUND_INTRO",
      hiderTeam: Math.random() < 0.5 ? "a" : "b",
      scores: { a: 0, b: 0 },
      round: 1,
      ringHat: null,
      lifted: [],
      result: null,
    }));
    scheduleHiding();
  }, [update, clearAutoAdvance, scheduleHiding]);

  const hideRandom = useCallback(() => hide(randomHat()), [hide]);

  const endGame = useCallback(() => {
    clearAutoAdvance();
    if (gameRef.current.phase === "LOBBY") return;
    update(g => ({ ...g, phase: "ENDED" }));
  }, [update, clearAutoAdvance]);

  const nextRound = useCallback(() => {
    clearAutoAdvance();
    const g = gameRef.current;
    if (g.phase !== "ROUND_RESULT" || !g.result) return;
    if (g.scores.a >= g.targetScore || g.scores.b >= g.targetScore) {
      update(prev => ({ ...prev, phase: "ENDED" }));
      return;
    }
    update(prev => ({
      ...prev,
      phase: "ROUND_INTRO",
      hiderTeam: prev.result?.nextHider ?? prev.hiderTeam,
      round: prev.round + 1,
      ringHat: null,
      lifted: [],
    }));
    scheduleHiding();
  }, [update, clearAutoAdvance, scheduleHiding]);
  nextRoundRef.current = nextRound;

  /** Back to the lobby with scores cleared; teams and settings are kept. */
  const resetGame = useCallback(() => {
    clearAutoAdvance();
    update(g => ({ ...g, phase: "LOBBY", scores: { a: 0, b: 0 }, round: 0, ringHat: null, lifted: [], result: null }));
  }, [update, clearAutoAdvance]);

  const gameOver = game.result != null && (game.scores.a >= game.targetScore || game.scores.b >= game.targetScore);

  return {
    connected, roster, captains, canStart, gameOver,
    phase: game.phase,
    controlMode: game.controlMode, setControlMode,
    teamMode: game.teamMode, setTeamMode,
    targetScore: game.targetScore, setTargetScore,
    hiderTeam: game.hiderTeam, scores: game.scores, round: game.round,
    lifted: game.lifted, result: game.result,
    setPlayerTeam, setCaptain, shuffleTeams,
    startGame, hide, hideRandom, seek, nextRound, endGame, resetGame,
  };
}
