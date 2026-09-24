"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getTopicLabel, loadQuizQuestions, toPublicQuestion, type QuizQuestion } from "@/lib/quizLoader";
import {
  QUIZ_EVENTS,
  quizChannelName,
  type HintResultPayload,
  type HintType,
  type LeaderboardEntry,
  type QuizPhase,
  type QuizPlayerPresence,
  type QuizStateSyncPayload,
  type SubmitAnswerPayload,
  type TimerPauseChangedPayload,
  type UseHintPayload,
} from "@/lib/quizChannel";

interface PersistedHostState {
  phase: QuizPhase;
  topicKey: string;
  currentIndex: number;
  scores: LeaderboardEntry[];
  hintsEnabled: boolean;
  /** playerId → hints already used this game. */
  usedHints: Record<string, HintType[]>;
}

function storageKey(gameId: string) {
  return `quiz:host:${gameId}`;
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

function computeLeaderboard(scores: Map<string, LeaderboardEntry>): LeaderboardEntry[] {
  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

/** Fisher-Yates shuffle, returns a random `count`-sized slice of the pool
 *  so each game only plays a subset of a topic's questions, in random order. */
function sampleQuestions(pool: QuizQuestion[], count: number): QuizQuestion[] {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

const DEFAULT_QUESTION_COUNT = 10;
const AUTO_ADVANCE_DELAY_MS = 4000;

/** Drives the host side of a quiz round: owns the authoritative question set,
 *  broadcasts every question/reveal over the Supabase Realtime channel, and
 *  scores submitted answers against its own answer key + its own clock —
 *  never trusting a player's claimed correctness or elapsed time. */
export function useQuizHost(gameId: string) {
  const persisted = useRef<PersistedHostState | null>(null);
  if (persisted.current === null) {
    const loaded = loadPersisted(gameId);
    persisted.current = {
      phase: loaded?.phase ?? "LOBBY",
      topicKey: loaded?.topicKey ?? "",
      currentIndex: loaded?.currentIndex ?? 0,
      scores: loaded?.scores ?? [],
      hintsEnabled: loaded?.hintsEnabled ?? true,
      usedHints: loaded?.usedHints ?? {},
    };
  }

  const [phase, setPhase] = useState<QuizPhase>(persisted.current.phase);
  const [topicKey, setTopicKeyState] = useState(persisted.current.topicKey);
  const [currentIndex, setCurrentIndex] = useState(persisted.current.currentIndex);
  const [players, setPlayers] = useState<QuizPlayerPresence[]>([]);
  const [connected, setConnected] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(persisted.current.scores);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [questionDurationSec, setQuestionDurationSec] = useState<number | null>(null);
  const [questionCount, setQuestionCountState] = useState(DEFAULT_QUESTION_COUNT);
  const [hintsEnabled, setHintsEnabledState] = useState(persisted.current.hintsEnabled);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const questionPoolRef = useRef<QuizQuestion[]>(topicKey ? loadQuizQuestions(topicKey) : []);
  const questionsRef = useRef<QuizQuestion[]>(questionPoolRef.current);
  const topicKeyRef = useRef(topicKey);
  const phaseRef = useRef(phase);
  const currentIndexRef = useRef(currentIndex);
  const startedAtRef = useRef<number | null>(null);
  const questionDurationRef = useRef<number | null>(null);
  const questionCountRef = useRef(DEFAULT_QUESTION_COUNT);
  const effectiveTimeLimitRef = useRef(15);
  const submissionsRef = useRef<Map<string, SubmitAnswerPayload>>(new Map());
  const scoresRef = useRef<Map<string, LeaderboardEntry>>(new Map(persisted.current.scores.map(s => [s.playerId, s])));
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextQuestionRef = useRef<() => void>(() => {});
  const pausedRef = useRef(false);
  const remainingMsAtPauseRef = useRef(0);
  const hintsEnabledRef = useRef(hintsEnabled);
  const usedHintsRef = useRef<Map<string, Set<HintType>>>(
    new Map(Object.entries(persisted.current.usedHints).map(([id, types]) => [id, new Set(types)])),
  );

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { topicKeyRef.current = topicKey; }, [topicKey]);
  useEffect(() => { hintsEnabledRef.current = hintsEnabled; }, [hintsEnabled]);
  // usedHints lives in a ref (read inside channel handlers); bump this to re-persist it.
  const [usedHintsVersion, setUsedHintsVersion] = useState(0);
  useEffect(() => {
    const usedHints = Object.fromEntries(Array.from(usedHintsRef.current, ([id, set]) => [id, Array.from(set)]));
    savePersisted(gameId, { phase, topicKey, currentIndex, scores: leaderboard, hintsEnabled, usedHints });
  }, [gameId, phase, topicKey, currentIndex, leaderboard, hintsEnabled, usedHintsVersion]);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const revealAnswer = useCallback(() => {
    if (phaseRef.current !== "QUESTION") return;
    clearRevealTimer();
    const question = questionsRef.current[currentIndexRef.current];
    if (!question) return;
    const totalTimeMs = effectiveTimeLimitRef.current * 1000;

    for (const [playerId, submission] of submissionsRef.current) {
      const isCorrect = submission.answerIndex === question.correctAnswer;
      const elapsedMs = Math.min(Math.max(submission.timeElapsedMs, 0), totalTimeMs);
      const points = isCorrect ? Math.round(100 * (1 -elapsedMs / totalTimeMs)) : 0;
      const prev = scoresRef.current.get(playerId);
      scoresRef.current.set(playerId, {
        playerId,
        name: submission.name,
        emoji: submission.emoji,
        score: (prev?.score ?? 0) + points,
        lastCorrect: isCorrect,
        lastPoints: points,
      });
    }
    // Players who never submitted still show up with lastCorrect=false, 0 points this round.
    for (const p of scoresRef.current.values()) {
      if (!submissionsRef.current.has(p.playerId)) {
        scoresRef.current.set(p.playerId, { ...p, lastCorrect: false, lastPoints: 0 });
      }
    }

    const board = computeLeaderboard(scoresRef.current);
    setLeaderboard(board);
    setCorrectAnswer(question.correctAnswer);
    setPhase("REVEAL");

    channelRef.current?.send({
      type: "broadcast",
      event: QUIZ_EVENTS.answerReveal,
      payload: { correctAnswer: question.correctAnswer, leaderboard: board },
    });

    // Auto-advance to the next question (or end the quiz) after a short cooldown,
    // regardless of whether the reveal was triggered by the timer or the host.
    clearAutoAdvanceTimer();
    autoAdvanceTimerRef.current = setTimeout(() => nextQuestionRef.current(), AUTO_ADVANCE_DELAY_MS);
  }, [clearRevealTimer, clearAutoAdvanceTimer]);

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(quizChannelName(gameId), {
      config: { presence: { key: "host" } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<QuizPlayerPresence>();
      const list: QuizPlayerPresence[] = [];
      for (const key of Object.keys(state)) {
        if (key === "host") continue;
        const entry = state[key]?.[0];
        if (entry) list.push(entry as unknown as QuizPlayerPresence);
      }
      list.sort((a, b) => a.joinedAt - b.joinedAt);
      setPlayers(list);
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.stateSyncRequest }, () => {
      const question = questionsRef.current[currentIndexRef.current];
      const publicQuestion = question ? { ...toPublicQuestion(question), timeLimit: effectiveTimeLimitRef.current } : null;
      const payload: QuizStateSyncPayload = {
        phase: phaseRef.current,
        topicKey: topicKeyRef.current,
        topicLabel: topicKeyRef.current ? getTopicLabel(topicKeyRef.current) : "",
        index: currentIndexRef.current,
        total: questionsRef.current.length,
        question: publicQuestion,
        startedAt: startedAtRef.current,
        paused: pausedRef.current,
        correctAnswer: phaseRef.current === "REVEAL" || phaseRef.current === "ENDED" ? question?.correctAnswer ?? null : null,
        leaderboard: computeLeaderboard(scoresRef.current),
        hintsEnabled: hintsEnabledRef.current,
      };
      channel.send({ type: "broadcast", event: QUIZ_EVENTS.stateSync, payload });
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.useHint }, ({ payload }: { payload: UseHintPayload }) => {
      const { playerId, type, index } = payload;
      const reply = (result: Omit<HintResultPayload, "playerId" | "type" | "index">) =>
        channel.send({
          type: "broadcast",
          event: QUIZ_EVENTS.hintResult,
          payload: { playerId, type, index, ...result } satisfies HintResultPayload,
        });

      const question = questionsRef.current[index];
      const used = usedHintsRef.current.get(playerId) ?? new Set<HintType>();
      if (used.has(type)) {
        reply({ denied: "used" });
        return;
      }
      if (
        !hintsEnabledRef.current || !question ||
        phaseRef.current !== "QUESTION" || pausedRef.current || index !== currentIndexRef.current
      ) {
        reply({ denied: "unavailable" });
        return;
      }

      used.add(type);
      usedHintsRef.current.set(playerId, used);
      setUsedHintsVersion(v => v + 1);

      if (type === "showCorrect") {
        reply({ correctAnswer: question.correctAnswer });
        return;
      }
      // 50/50: remove up to two wrong options, always leaving at least one wrong one.
      const wrong = question.options.map((_, i) => i).filter(i => i !== question.correctAnswer);
      for (let i = wrong.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
      }
      reply({ removedOptions: wrong.slice(0, Math.min(2, wrong.length - 1)) });
    });

    channel.on("broadcast", { event: QUIZ_EVENTS.submitAnswer }, ({ payload }: { payload: SubmitAnswerPayload }) => {
      if (phaseRef.current !== "QUESTION" || pausedRef.current) return;
      // Players may change their answer until reveal — the latest pick (and its timing) wins.
      // Host's own clock is authoritative for timing, not the client's self-reported value.
      const hostElapsedMs = startedAtRef.current != null ? Date.now() - startedAtRef.current : payload.timeElapsedMs;
      submissionsRef.current.set(payload.playerId, { ...payload, timeElapsedMs: hostElapsedMs });
      setSubmittedCount(submissionsRef.current.size);
    });

    channel.subscribe(status => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        channel.track({ playerId: "host", name: "host", emoji: "🎙️", joinedAt: Date.now() });
      }
    });

    return () => {
      clearRevealTimer();
      clearAutoAdvanceTimer();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId, clearRevealTimer, clearAutoAdvanceTimer]);

  const setTopic = useCallback((key: string) => {
    if (phaseRef.current !== "LOBBY") return;
    questionPoolRef.current = loadQuizQuestions(key);
    questionsRef.current = questionPoolRef.current;
    setTopicKeyState(key);
    const label = getTopicLabel(key);
    channelRef.current?.send({
      type: "broadcast",
      event: QUIZ_EVENTS.gameModeChanged,
      payload: { topicKey: key, topicLabel: label },
    });
  }, []);

  /** How many questions to randomly sample from the chosen topic per game. */
  const setQuestionCount = useCallback((count: number) => {
    questionCountRef.current = count;
    setQuestionCountState(count);
  }, []);

  const showQuestion = useCallback((index: number) => {
    const question = questionsRef.current[index];
    if (!question) return;
    submissionsRef.current = new Map();
    setSubmittedCount(0);
    setCorrectAnswer(null);
    pausedRef.current = false;
    setPaused(false);
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
    setCurrentIndex(index);
    setPhase("QUESTION");

    const effectiveTimeLimit = questionDurationRef.current ?? question.timeLimit;
    effectiveTimeLimitRef.current = effectiveTimeLimit;

    channelRef.current?.send({
      type: "broadcast",
      event: QUIZ_EVENTS.questionShown,
      payload: {
        question: { ...toPublicQuestion(question), timeLimit: effectiveTimeLimit },
        index,
        total: questionsRef.current.length,
        startedAt: now,
      },
    });

    clearRevealTimer();
    revealTimerRef.current = setTimeout(() => revealAnswer(), effectiveTimeLimit * 1000 + 400);
  }, [clearRevealTimer, revealAnswer]);

  /** Pauses the current question's countdown, freezing the remaining time for
   *  every client and blocking new submissions until resumed. */
  const pauseQuestion = useCallback(() => {
    if (phaseRef.current !== "QUESTION" || pausedRef.current || startedAtRef.current == null) return;
    const elapsedMs = Date.now() - startedAtRef.current;
    remainingMsAtPauseRef.current = Math.max(0, effectiveTimeLimitRef.current * 1000 - elapsedMs);
    pausedRef.current = true;
    setPaused(true);
    clearRevealTimer();

    const payload: TimerPauseChangedPayload = { paused: true, startedAt: startedAtRef.current };
    channelRef.current?.send({ type: "broadcast", event: QUIZ_EVENTS.timerPauseChanged, payload });
  }, [clearRevealTimer]);

  /** Resumes a paused question — shifts startedAt forward by the paused
   *  duration so the frozen remaining time carries over exactly, then
   *  reschedules the auto-reveal. */
  const resumeQuestion = useCallback(() => {
    if (phaseRef.current !== "QUESTION" || !pausedRef.current) return;
    const newStartedAt = Date.now() - (effectiveTimeLimitRef.current * 1000 - remainingMsAtPauseRef.current);
    startedAtRef.current = newStartedAt;
    setStartedAt(newStartedAt);
    pausedRef.current = false;
    setPaused(false);

    clearRevealTimer();
    revealTimerRef.current = setTimeout(() => revealAnswer(), remainingMsAtPauseRef.current + 400);

    const payload: TimerPauseChangedPayload = { paused: false, startedAt: newStartedAt };
    channelRef.current?.send({ type: "broadcast", event: QUIZ_EVENTS.timerPauseChanged, payload });
  }, [clearRevealTimer, revealAnswer]);

  /** Turns the players' once-per-game hints (50/50, show correct) on or off. */
  const setHintsEnabled = useCallback((enabled: boolean) => {
    hintsEnabledRef.current = enabled;
    setHintsEnabledState(enabled);
    channelRef.current?.send({ type: "broadcast", event: QUIZ_EVENTS.hintsEnabledChanged, payload: { enabled } });
  }, []);

  /** Overrides the per-question timer (null reverts to each question's own timeLimit). */
  const setQuestionDuration = useCallback((seconds: number | null) => {
    questionDurationRef.current = seconds;
    setQuestionDurationSec(seconds);
  }, []);

  const startQuiz = useCallback(() => {
    if (!topicKeyRef.current || questionPoolRef.current.length === 0) return;
    const count = Math.min(Math.max(questionCountRef.current, 1), questionPoolRef.current.length);
    questionsRef.current = sampleQuestions(questionPoolRef.current, count);
    usedHintsRef.current = new Map();
    setUsedHintsVersion(v => v + 1);
    showQuestion(0);
  }, [showQuestion]);

  /** Ends the quiz immediately, wherever it currently is (host-initiated "end game"). */
  const endQuiz = useCallback(() => {
    clearRevealTimer();
    clearAutoAdvanceTimer();
    if (phaseRef.current === "LOBBY") return;
    pausedRef.current = false;
    setPaused(false);
    setPhase("ENDED");
    channelRef.current?.send({ type: "broadcast", event: QUIZ_EVENTS.phaseChanged, payload: { phase: "ENDED" } });
  }, [clearRevealTimer, clearAutoAdvanceTimer]);

  const nextQuestion = useCallback(() => {
    clearAutoAdvanceTimer();
    const next = currentIndexRef.current + 1;
    if (next >= questionsRef.current.length) {
      endQuiz();
      return;
    }
    showQuestion(next);
  }, [showQuestion, endQuiz, clearAutoAdvanceTimer]);

  nextQuestionRef.current = nextQuestion;

  const resetQuiz = useCallback(() => {
    clearRevealTimer();
    clearAutoAdvanceTimer();
    submissionsRef.current = new Map();
    scoresRef.current = new Map();
    usedHintsRef.current = new Map();
    setUsedHintsVersion(v => v + 1);
    startedAtRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setSubmittedCount(0);
    setCorrectAnswer(null);
    setLeaderboard([]);
    setCurrentIndex(0);
    setStartedAt(null);
    setPhase("LOBBY");
    channelRef.current?.send({ type: "broadcast", event: QUIZ_EVENTS.quizReset, payload: {} });
  }, [clearRevealTimer]);

  const totalQuestions = questionsRef.current.length;
  const currentQuestion = questionsRef.current[currentIndex] ?? null;

  return {
    phase, players, connected, topicKey, setTopic,
    currentIndex, totalQuestions, currentQuestion, startedAt, paused,
    submittedCount, correctAnswer, leaderboard,
    questionDurationSec, setQuestionDuration,
    questionCount, setQuestionCount,
    startQuiz, revealAnswer, nextQuestion, resetQuiz, endQuiz,
    pauseQuestion, resumeQuestion,
    hintsEnabled, setHintsEnabled,
  };
}
