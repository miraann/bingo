"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { listQuizTopics, loadQuizQuestions, toPublicQuestion, type QuizQuestion } from "@/lib/quizLoader";
import {
  DEFAULT_MAX_TRIES,
  DEFAULT_TOTAL_ROUNDS,
  HAT_COUNT,
  MAX_ROUNDS,
  MAX_TRIES,
  KLLAWEN_EVENTS,
  ROUND_INTRO_MS,
  TEAMS,
  TOSS_GRACE_MS,
  kllawenChannelName,
  otherTeam,
  resolveSeek,
  tallyCaptainVotes,
  tossWinner,
  type CaptainVotePayload,
  type ChooseTeamPayload,
  type ControlMode,
  type HideRingPayload,
  type KllawenPhase,
  type KllawenPlayerPresence,
  type KllawenPublicState,
  type KllawenRosterEntry,
  type KllawenTossPublic,
  type RoundResult,
  type SeekAction,
  type SeekHatPayload,
  type SeekMistake,
  type Team,
  type TeamMode,
  type TossAnswer,
  type TossAnswerPayload,
} from "@/lib/kllawenChannel";

/** The opening toss question, answer key included. */
interface HostToss {
  question: QuizQuestion;
  /** Host clock time the question opens (the intro countdown runs until then). */
  startedAt: number;
  answers: Record<string, TossAnswer>;
  winnerId: string | null;
}

/** The host's full game state — the only place `ringHat` ever lives. */
interface HostGame {
  phase: KllawenPhase;
  controlMode: ControlMode;
  teamMode: TeamMode;
  totalRounds: number;
  maxTries: number;
  triesLeft: number;
  wrongClaims: number;
  mistake: SeekMistake | null;
  hiderTeam: Team;
  scores: Record<Team, number>;
  round: number;
  ringHat: number | null;
  lifted: number[];
  result: RoundResult | null;
  /** playerId → team. Kept for players who drop off so a rejoin lands them back. */
  teams: Record<string, Team>;
  /** Captain the host picked for each team; overrides the vote until a teammate votes again. */
  captainPicks: Record<Team, string | null>;
  /** voter playerId → teammate they want as captain. */
  captainVotes: Record<string, string>;
  /** Captains frozen when the game starts, so a reconnect (which re-sends a newer
   *  `joinedAt`) can't hand the role to a teammate. Cleared back in the lobby. */
  lockedCaptains: Record<Team, string | null>;
  toss: HostToss | null;
}

const INITIAL_GAME: HostGame = {
  phase: "LOBBY",
  controlMode: "phones",
  teamMode: "choose",
  totalRounds: DEFAULT_TOTAL_ROUNDS,
  maxTries: DEFAULT_MAX_TRIES,
  triesLeft: DEFAULT_MAX_TRIES,
  wrongClaims: 0,
  mistake: null,
  hiderTeam: "a",
  scores: { a: 0, b: 0 },
  round: 0,
  ringHat: null,
  lifted: [],
  result: null,
  teams: {},
  captainPicks: { a: null, b: null },
  captainVotes: {},
  lockedCaptains: { a: null, b: null },
  toss: null,
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

/** Any hat still down (all of them, except in a game saved mid re-hide by an older version). */
function randomHat(lifted: number[]) {
  const down = Array.from({ length: HAT_COUNT }, (_, h) => h).filter(h => !lifted.includes(h));
  return down[Math.floor(Math.random() * down.length)];
}

function randomTeam(): Team {
  return Math.random() < 0.5 ? "a" : "b";
}

/** Any question from any quiz topic. */
function randomTossQuestion(): QuizQuestion {
  const pool = listQuizTopics().flatMap(t => loadQuizQuestions(t.key));
  return pool[Math.floor(Math.random() * pool.length)];
}

function publicToss(phase: KllawenPhase, toss: HostToss | null): KllawenTossPublic | null {
  if (!toss || !phase.startsWith("TOSS_")) return null;
  const revealed = phase === "TOSS_RESULT";
  return {
    question: toPublicQuestion(toss.question),
    startedAt: toss.startedAt,
    answeredIds: Object.keys(toss.answers),
    correctAnswer: revealed ? toss.question.correctAnswer : null,
    answers: revealed ? Object.values(toss.answers).sort((a, b) => a.elapsedMs - b.elapsedMs) : [],
    winnerId: revealed ? toss.winnerId : null,
  };
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

/** In game, the captain locked at the start (while connected). Otherwise the
 *  host's pick wins; then the most-voted teammate (earliest joiner on a tie);
 *  with no votes, the team's first joiner. */
function computeCaptains(
  roster: KllawenRosterEntry[],
  picks: Record<Team, string | null>,
  votes: Record<string, string>,
  locked: Record<Team, string | null>,
): Record<Team, string | null> {
  const counts = tallyCaptainVotes(roster, votes);
  const captainOf = (team: Team) => {
    const members = roster.filter(p => p.team === team);
    if (locked[team] && members.some(p => p.playerId === locked[team])) return locked[team];
    if (picks[team] && members.some(p => p.playerId === picks[team])) return picks[team];
    let best = members[0] ?? null;
    for (const p of members) if ((counts[p.playerId] ?? 0) > (counts[best!.playerId] ?? 0)) best = p;
    return best?.playerId ?? null;
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
  const captains = useMemo(
    () => computeCaptains(roster, game.captainPicks, game.captainVotes, game.lockedCaptains),
    [roster, game.captainPicks, game.captainVotes, game.lockedCaptains],
  );
  const captainVoteCounts = useMemo(() => tallyCaptainVotes(roster, game.captainVotes), [roster, game.captainVotes]);
  const captainsRef = useRef(captains);
  captainsRef.current = captains;

  const publicState = useMemo<KllawenPublicState>(() => ({
    phase: game.phase,
    controlMode: game.controlMode,
    teamMode: game.teamMode,
    totalRounds: game.totalRounds,
    maxTries: game.maxTries,
    triesLeft: game.triesLeft,
    wrongClaims: game.wrongClaims,
    mistake: game.mistake,
    hiderTeam: game.hiderTeam,
    scores: game.scores,
    round: game.round,
    lifted: game.lifted,
    result: game.result,
    roster,
    captains,
    captainVotes: game.captainVotes,
    toss: publicToss(game.phase, game.toss),
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

  /** Closes the toss question: the fastest right answer's team hides first,
   *  or a random team when nobody got it. */
  const finishToss = useCallback(() => {
    update(g => {
      if (g.phase !== "TOSS_QUESTION" || !g.toss) return g;
      const winner = tossWinner(Object.values(g.toss.answers), g.toss.question.correctAnswer);
      return {
        ...g,
        phase: "TOSS_RESULT",
        hiderTeam: winner?.team ?? randomTeam(),
        toss: { ...g.toss, winnerId: winner?.playerId ?? null },
      };
    });
  }, [update]);

  // Toss timers run off the stored timestamps, so a reloaded host picks them back up.
  const tossStartedAt = game.toss?.startedAt;
  const tossLimitMs = (game.toss?.question.timeLimit ?? 0) * 1000;
  useEffect(() => {
    if (tossStartedAt == null) return;
    if (game.phase === "TOSS_INTRO") {
      const id = setTimeout(() => {
        update(g => (g.phase === "TOSS_INTRO" ? { ...g, phase: "TOSS_QUESTION" } : g));
      }, Math.max(0, tossStartedAt - Date.now()));
      return () => clearTimeout(id);
    }
    if (game.phase === "TOSS_QUESTION") {
      const id = setTimeout(finishToss, Math.max(0, tossStartedAt + tossLimitMs + TOSS_GRACE_MS - Date.now()));
      return () => clearTimeout(id);
    }
  }, [game.phase, tossStartedAt, tossLimitMs, update, finishToss]);

  const hide = useCallback((hat: number) => {
    const g = gameRef.current;
    if (g.phase !== "HIDING" || !Number.isInteger(hat) || hat < 0 || hat >= HAT_COUNT || g.lifted.includes(hat)) return;
    update(prev => ({ ...prev, ringHat: hat, phase: "SEEKING", mistake: null }));
  }, [update]);

  const seek = useCallback((hat: number, action: SeekAction) => {
    const g = gameRef.current;
    if (g.phase !== "SEEKING" || g.ringHat == null || !Number.isInteger(hat) || hat < 0 || hat >= HAT_COUNT || g.lifted.includes(hat)) return;
    const resolution = resolveSeek(g.ringHat, g.lifted, hat, action, g.hiderTeam, g.triesLeft, g.wrongClaims);
    if (resolution.kind === "continue") {
      const { mistake = null } = resolution;
      update(prev => ({
        ...prev, lifted: resolution.lifted, mistake,
        triesLeft: prev.triesLeft - (mistake ? 1 : 0),
        wrongClaims: prev.wrongClaims + (mistake?.kind === "wrongClaim" ? 1 : 0),
      }));
      return;
    }
    const { result } = resolution;
    update(prev => ({
      ...prev,
      lifted: resolution.lifted,
      result,
      mistake: null,
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

    channel.on("broadcast", { event: KLLAWEN_EVENTS.captainVote }, ({ payload }: { payload: CaptainVotePayload }) => {
      const g = gameRef.current;
      const team = g.teams[payload.playerId];
      // Captains are settled before the game starts, and only between teammates.
      if (g.phase !== "LOBBY" || !team || g.teams[payload.candidateId] !== team) return;
      // A fresh vote hands the choice back to the team, replacing any host pick.
      update(prev => ({
        ...prev,
        captainVotes: { ...prev.captainVotes, [payload.playerId]: payload.candidateId },
        captainPicks: { ...prev.captainPicks, [team]: null },
      }));
    });

    channel.on("broadcast", { event: KLLAWEN_EVENTS.hideRing }, ({ payload }: { payload: HideRingPayload }) => {
      const g = gameRef.current;
      // Hiding is always the hiding captain's call, from their phone — even in
      // screen mode, so the ring's hat never shows on the TV.
      if (payload.round !== g.round) return;
      if (payload.playerId !== captainsRef.current[g.hiderTeam]) return;
      hide(payload.hat);
    });

    channel.on("broadcast", { event: KLLAWEN_EVENTS.tossAnswer }, ({ payload }: { payload: TossAnswerPayload }) => {
      const g = gameRef.current;
      const team = g.teams[payload.playerId];
      const p = playersRef.current.find(x => x.playerId === payload.playerId);
      if (g.phase !== "TOSS_QUESTION" || !g.toss || !team || !p) return;
      if (payload.questionId !== g.toss.question.id || g.toss.answers[payload.playerId]) return;
      if (!Number.isInteger(payload.answer) || payload.answer < 0 || payload.answer >= g.toss.question.options.length) return;
      const limitMs = g.toss.question.timeLimit * 1000;
      const elapsedMs = Math.min(limitMs, Math.max(0, Number(payload.elapsedMs) || 0));
      const answer: TossAnswer = { playerId: p.playerId, name: p.name, emoji: p.emoji, team, answer: payload.answer, elapsedMs };
      update(prev => (prev.toss ? { ...prev, toss: { ...prev.toss, answers: { ...prev.toss.answers, [p.playerId]: answer } } } : prev));
      // No need to wait out the clock once every player on a team has answered.
      const answers = gameRef.current.toss?.answers ?? {};
      if (playersRef.current.every(x => !gameRef.current.teams[x.playerId] || answers[x.playerId])) finishToss();
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
  }, [gameId, broadcastState, clearAutoAdvance, update, hide, seek, finishToss]);

  /* ── Lobby settings ──────────────────────────────────────────────────── */

  const setControlMode = useCallback((controlMode: ControlMode) => {
    update(g => ({ ...g, controlMode }));
  }, [update]);

  const setTeamMode = useCallback((teamMode: TeamMode) => {
    update(g => ({ ...g, teamMode }));
  }, [update]);

  const setTotalRounds = useCallback((totalRounds: number) => {
    if (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > MAX_ROUNDS) return;
    update(g => ({ ...g, totalRounds }));
  }, [update]);

  const setMaxTries = useCallback((maxTries: number) => {
    if (!Number.isInteger(maxTries) || maxTries < 1 || maxTries > MAX_TRIES) return;
    update(g => ({ ...g, maxTries, triesLeft: maxTries }));
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
      return { ...g, teams, captainPicks: { a: null, b: null }, captainVotes: {} };
    });
  }, [update]);

  /* ── Game flow ───────────────────────────────────────────────────────── */

  /** Phones mode needs a captain on each side; on a shared screen anyone can play. */
  const canStart = game.controlMode === "screen" || (captains.a !== null && captains.b !== null);

  /** Opens with a toss question on every phone; with nobody on a team to
   *  answer it, a random team hides first instead. */
  const startGame = useCallback(() => {
    const current = gameRef.current;
    if (current.phase !== "LOBBY") return;
    clearAutoAdvance();
    const fresh = {
      scores: { a: 0, b: 0 }, ringHat: null, lifted: [], result: null, triesLeft: current.maxTries, wrongClaims: 0, mistake: null,
      lockedCaptains: captainsRef.current,
    };
    if (playersRef.current.some(p => current.teams[p.playerId])) {
      update(g => ({
        ...g, ...fresh,
        phase: "TOSS_INTRO",
        round: 0,
        toss: { question: randomTossQuestion(), startedAt: Date.now() + ROUND_INTRO_MS, answers: {}, winnerId: null },
      }));
      return;
    }
    update(g => ({ ...g, ...fresh, phase: "ROUND_INTRO", hiderTeam: randomTeam(), round: 1, toss: null }));
    scheduleHiding();
  }, [update, clearAutoAdvance, scheduleHiding]);

  /** From the toss result into round 1, with the toss winners hiding. */
  const startFirstRound = useCallback(() => {
    if (gameRef.current.phase !== "TOSS_RESULT") return;
    clearAutoAdvance();
    update(g => ({ ...g, phase: "ROUND_INTRO", round: 1, toss: null }));
    scheduleHiding();
  }, [update, clearAutoAdvance, scheduleHiding]);

  const hideRandom = useCallback(() => hide(randomHat(gameRef.current.lifted)), [hide]);

  const endGame = useCallback(() => {
    clearAutoAdvance();
    if (gameRef.current.phase === "LOBBY") return;
    update(g => ({ ...g, phase: "ENDED" }));
  }, [update, clearAutoAdvance]);

  const nextRound = useCallback(() => {
    clearAutoAdvance();
    const g = gameRef.current;
    if (g.phase !== "ROUND_RESULT" || !g.result) return;
    if (g.round >= g.totalRounds) {
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
      triesLeft: prev.maxTries,
      wrongClaims: 0,
      mistake: null,
    }));
    scheduleHiding();
  }, [update, clearAutoAdvance, scheduleHiding]);
  nextRoundRef.current = nextRound;

  /** Back to the lobby with scores cleared; teams and settings are kept. */
  const resetGame = useCallback(() => {
    clearAutoAdvance();
    update(g => ({ ...g, phase: "LOBBY", scores: { a: 0, b: 0 }, round: 0, ringHat: null, lifted: [], result: null, toss: null, triesLeft: g.maxTries, wrongClaims: 0, mistake: null, lockedCaptains: { a: null, b: null } }));
  }, [update, clearAutoAdvance]);

  const gameOver = game.result != null && game.round >= game.totalRounds;

  return {
    connected, roster, captains, captainVoteCounts, canStart, gameOver,
    phase: game.phase,
    controlMode: game.controlMode, setControlMode,
    teamMode: game.teamMode, setTeamMode,
    totalRounds: game.totalRounds, setTotalRounds,
    maxTries: game.maxTries, setMaxTries,
    triesLeft: game.triesLeft, wrongClaims: game.wrongClaims, mistake: game.mistake,
    hiderTeam: game.hiderTeam, scores: game.scores, round: game.round,
    lifted: game.lifted, result: game.result,
    toss: publicState.toss, tossStartedAt: game.toss?.startedAt ?? null,
    setPlayerTeam, setCaptain, shuffleTeams,
    startGame, startFirstRound, hide, hideRandom, seek, nextRound, endGame, resetGame,
  };
}
