import type { PublicQuizQuestion } from "./quizLoader";

export type QuizPhase = "LOBBY" | "QUESTION" | "REVEAL" | "ENDED";

export interface QuizPlayerPresence {
  playerId: string;
  name: string;
  emoji: string;
  joinedAt: number;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  emoji: string;
  score: number;
  lastCorrect: boolean;
  lastPoints: number;
}

/** Broadcast whenever the host changes mode/topic while still in the lobby. */
export interface GameModeChangedPayload {
  topicKey: string;
  topicLabel: string;
}

export interface QuestionShownPayload {
  question: PublicQuizQuestion;
  index: number;
  total: number;
  startedAt: number;
  /** Every question opens frozen at full time until the host presses Start. */
  awaitingStart: boolean;
}

/** Broadcast when the host moves on: the next question appears after `durationMs`. */
export interface NextQuestionLoadingPayload {
  index: number;
  total: number;
  durationMs: number;
}

export interface SubmitAnswerPayload {
  playerId: string;
  name: string;
  emoji: string;
  answerIndex: number;
  timeElapsedMs: number;
}

export interface AnswerRevealPayload {
  correctAnswer: number;
  leaderboard: LeaderboardEntry[];
}

export interface QuizPhaseChangedPayload {
  phase: QuizPhase;
}

/** Broadcast when the host pauses/resumes the current question's timer.
 *  On resume, startedAt is shifted forward by the paused duration so every
 *  client's countdown realigns to the same remaining time. */
export interface TimerPauseChangedPayload {
  paused: boolean;
  startedAt: number;
}

/** Lifelines a player can each use once per game. */
export type HintType = "fiftyFifty" | "showCorrect";

/** Broadcast when the host turns player hints on/off. */
export interface HintsEnabledChangedPayload {
  enabled: boolean;
}

/** Player → host: request a hint for the question at `index`. */
export interface UseHintPayload {
  playerId: string;
  type: HintType;
  index: number;
}

/** Host → one player (filtered by playerId): the hint's result. The host
 *  owns the answer key, so it decides which options to remove / reveal and
 *  enforces the once-per-game limit. `denied` says why a hint was refused:
 *  "used" (spent earlier this game) or "unavailable" (hints off, paused, or
 *  the question moved on). */
export interface HintResultPayload {
  playerId: string;
  type: HintType;
  index: number;
  denied?: "used" | "unavailable";
  removedOptions?: number[];
  correctAnswer?: number;
}

/** Full snapshot sent in response to a late-joiner's state-sync request. */
export interface QuizStateSyncPayload {
  phase: QuizPhase;
  topicKey: string;
  topicLabel: string;
  index: number;
  total: number;
  question: PublicQuizQuestion | null;
  startedAt: number | null;
  paused: boolean;
  awaitingStart: boolean;
  correctAnswer: number | null;
  leaderboard: LeaderboardEntry[];
  hintsEnabled: boolean;
}

export const QUIZ_EVENTS = {
  stateSyncRequest: "quiz-state-sync-request",
  stateSync: "quiz-state-sync",
  gameModeChanged: "GAME_MODE_CHANGED",
  questionShown: "question-shown",
  submitAnswer: "SUBMIT_ANSWER",
  answerReveal: "answer-reveal",
  phaseChanged: "quiz-phase-changed",
  quizReset: "quiz-reset",
  timerPauseChanged: "timer-pause-changed",
  hintsEnabledChanged: "hints-enabled-changed",
  useHint: "USE_HINT",
  hintResult: "hint-result",
  nextQuestionLoading: "next-question-loading",
} as const;

export function quizChannelName(gameId: string) {
  return `quiz-game-${gameId}`;
}
