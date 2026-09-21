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
  correctAnswer: number | null;
  leaderboard: LeaderboardEntry[];
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
} as const;

export function quizChannelName(gameId: string) {
  return `quiz-game-${gameId}`;
}
