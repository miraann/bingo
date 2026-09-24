"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { generatePlayerId } from "@/lib/id";
import { loadPlayerProfile, savePlayerProfile } from "@/lib/playerProfile";
import type { PublicQuizQuestion } from "@/lib/quizLoader";
import {
  QUIZ_EVENTS,
  quizChannelName,
  type AnswerRevealPayload,
  type GameModeChangedPayload,
  type HintResultPayload,
  type HintsEnabledChangedPayload,
  type HintType,
  type LeaderboardEntry,
  type QuestionShownPayload,
  type QuizPhase,
  type QuizPhaseChangedPayload,
  type QuizStateSyncPayload,
  type TimerPauseChangedPayload,
} from "@/lib/quizChannel";

interface PersistedPlayer {
  playerId: string;
  name: string;
  emoji: string;
}

export type AnswerFeedback = "idle" | "correct" | "incorrect" | "timeout";

function storageKey(gameId: string) {
  return `quiz:player:${gameId}`;
}

function loadPersisted(gameId: string): PersistedPlayer | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(gameId));
    if (raw) return JSON.parse(raw) as PersistedPlayer;
  } catch {}
  // Already registered for this game code in bingo — reuse that identity.
  return loadPlayerProfile(gameId);
}

function savePersisted(gameId: string, p: PersistedPlayer) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(storageKey(gameId), JSON.stringify(p));
  } catch {}
}

/** Hints used this game, kept locally so a refresh still shows them as spent
 *  (the host enforces the limit regardless). */
function hintsStorageKey(gameId: string) {
  return `quiz:hints:${gameId}`;
}

function loadUsedHints(gameId: string): HintType[] {
  if (typeof window === "undefined" || !gameId) return [];
  try {
    const raw = window.localStorage.getItem(hintsStorageKey(gameId));
    return raw ? (JSON.parse(raw) as HintType[]) : [];
  } catch {
    return [];
  }
}

function saveUsedHints(gameId: string, hints: HintType[]) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(hintsStorageKey(gameId), JSON.stringify(hints));
  } catch {}
}

/** Drives the player side of a quiz round: registers a name/emoji, mirrors
 *  the host's question/reveal broadcasts, and submits answers for the host
 *  to score — this hook never decides correctness itself. */
export function useQuizPlayer(gameId: string) {
  const initialPlayer = useRef<PersistedPlayer | null>(loadPersisted(gameId));
  const [player, setPlayer] = useState<PersistedPlayer | null>(initialPlayer.current);
  const [phase, setPhase] = useState<QuizPhase>("LOBBY");
  const [topicLabel, setTopicLabel] = useState("");
  const [question, setQuestion] = useState<PublicQuizQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [usedHints, setUsedHints] = useState<HintType[]>(() => loadUsedHints(gameId));
  const [pendingHint, setPendingHint] = useState<HintType | null>(null);
  const [removedOptions, setRemovedOptions] = useState<number[]>([]);
  const [hintedAnswer, setHintedAnswer] = useState<number | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerRef = useRef(player);
  const startedAtRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const questionIndexRef = useRef(0);
  const usedHintsRef = useRef(usedHints);
  const pendingHintRef = useRef<HintType | null>(null);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { questionIndexRef.current = questionIndex; }, [questionIndex]);
  useEffect(() => { pendingHintRef.current = pendingHint; }, [pendingHint]);
  useEffect(() => {
    usedHintsRef.current = usedHints;
    saveUsedHints(gameId, usedHints);
  }, [gameId, usedHints]);

  useEffect(() => {
    if (!gameId) return;

    const presenceKey = initialPlayer.current?.playerId ?? generatePlayerId();
    const channel = supabase.channel(quizChannelName(gameId), {
      config: { presence: { key: presenceKey } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: QUIZ_EVENTS.gameModeChanged }, ({ payload }: { payload: GameModeChangedPayload }) => {
      setTopicLabel(payload.topicLabel);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.questionShown }, ({ payload }: { payload: QuestionShownPayload }) => {
      setQuestion(payload.question);
      setQuestionIndex(payload.index);
      setTotalQuestions(payload.total);
      setStartedAt(payload.startedAt);
      setPaused(false);
      setTopicLabel(payload.question.category);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setCorrectAnswer(null);
      setRemovedOptions([]);
      setHintedAnswer(null);
      setPendingHint(null);
      // First question of a fresh game — hints are available again.
      if (payload.index === 0) setUsedHints([]);
      setPhase("QUESTION");
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.hintsEnabledChanged }, ({ payload }: { payload: HintsEnabledChangedPayload }) => {
      setHintsEnabled(payload.enabled);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.hintResult }, ({ payload }: { payload: HintResultPayload }) => {
      if (payload.playerId !== playerRef.current?.playerId) return;
      if (pendingHintRef.current === payload.type) setPendingHint(null);
      if (payload.denied === "unavailable") return;
      setUsedHints(prev => (prev.includes(payload.type) ? prev : [...prev, payload.type]));
      if (payload.denied || payload.index !== questionIndexRef.current) return;
      if (payload.removedOptions) setRemovedOptions(payload.removedOptions);
      if (payload.correctAnswer != null) setHintedAnswer(payload.correctAnswer);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.timerPauseChanged }, ({ payload }: { payload: TimerPauseChangedPayload }) => {
      setPaused(payload.paused);
      setStartedAt(payload.startedAt);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.answerReveal }, ({ payload }: { payload: AnswerRevealPayload }) => {
      setCorrectAnswer(payload.correctAnswer);
      setLeaderboard(payload.leaderboard);
      setPhase("REVEAL");
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.phaseChanged }, ({ payload }: { payload: QuizPhaseChangedPayload }) => {
      setPhase(payload.phase);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.quizReset }, () => {
      setPhase("LOBBY");
      setQuestion(null);
      setQuestionIndex(0);
      setStartedAt(null);
      setPaused(false);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setCorrectAnswer(null);
      setLeaderboard([]);
      setUsedHints([]);
      setRemovedOptions([]);
      setHintedAnswer(null);
      setPendingHint(null);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.stateSync }, ({ payload }: { payload: QuizStateSyncPayload }) => {
      setPhase(payload.phase);
      setTopicLabel(payload.topicLabel);
      setQuestionIndex(payload.index);
      setTotalQuestions(payload.total);
      setQuestion(payload.question);
      setStartedAt(payload.startedAt);
      setPaused(payload.paused);
      setCorrectAnswer(payload.correctAnswer);
      setLeaderboard(payload.leaderboard);
      setHintsEnabled(payload.hintsEnabled ?? false);
    });

    channel.subscribe(status => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: QUIZ_EVENTS.stateSyncRequest, payload: {} });
        if (playerRef.current) {
          channel.track({
            playerId: playerRef.current.playerId, name: playerRef.current.name,
            emoji: playerRef.current.emoji, joinedAt: Date.now(),
          });
        }
      }
    });

    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [gameId]);

  const join = useCallback((name: string, emoji: string) => {
    const playerId = initialPlayer.current?.playerId ?? generatePlayerId();
    const newPlayer: PersistedPlayer = { playerId, name: name.trim(), emoji };
    initialPlayer.current = newPlayer;
    savePersisted(gameId, newPlayer);
    savePlayerProfile(gameId, newPlayer);
    setPlayer(newPlayer);
    channelRef.current?.track({ playerId, name: newPlayer.name, emoji, joinedAt: Date.now() });
  }, [gameId]);

  const submitAnswer = useCallback((answerIndex: number) => {
    if (pausedRef.current || !playerRef.current) return;
    setSelectedAnswer(answerIndex);
    setHasSubmitted(true);
    const timeElapsedMs = startedAtRef.current != null ? Date.now() - startedAtRef.current : 0;
    channelRef.current?.send({
      type: "broadcast",
      event: QUIZ_EVENTS.submitAnswer,
      payload: {
        playerId: playerRef.current.playerId,
        name: playerRef.current.name,
        emoji: playerRef.current.emoji,
        answerIndex,
        timeElapsedMs,
      },
    });
  }, []);

  /** Asks the host for a hint on the current question; the host replies with
   *  the options to remove (50/50) or the correct answer. */
  const requestHint = useCallback((type: HintType) => {
    if (!playerRef.current || pausedRef.current || pendingHintRef.current) return;
    if (usedHintsRef.current.includes(type)) return;
    pendingHintRef.current = type;
    setPendingHint(type);
    channelRef.current?.send({
      type: "broadcast",
      event: QUIZ_EVENTS.useHint,
      payload: { playerId: playerRef.current.playerId, type, index: questionIndexRef.current },
    });
    // Don't leave the button spinning if the host never answers.
    setTimeout(() => {
      if (pendingHintRef.current === type) setPendingHint(null);
    }, 5000);
  }, []);

  const feedback: AnswerFeedback =
    phase !== "REVEAL" ? "idle" :
    !hasSubmitted ? "timeout" :
    selectedAnswer === correctAnswer ? "correct" : "incorrect";

  const myEntry = player ? leaderboard.find(e => e.playerId === player.playerId) ?? null : null;

  return {
    player, phase, topicLabel, question, questionIndex, totalQuestions, startedAt, paused,
    selectedAnswer, hasSubmitted, correctAnswer, leaderboard, feedback, myEntry, connected,
    join, submitAnswer,
    hintsEnabled, usedHints, pendingHint, removedOptions, hintedAnswer, requestHint,
  };
}
