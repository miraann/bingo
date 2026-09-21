import type { BingoCard, WinPattern } from "./bingo";

export type GamePhase = "LOBBY" | "PLAYING" | "ENDED";

export interface PlayerPresence {
  playerId: string;
  name: string;
  emoji: string;
  joinedAt: number;
}

export interface StateSyncPayload {
  phase: GamePhase;
  calledNumbers: number[];
  currentNumber: number | null;
  autoMarkEnabled: boolean;
  highlightCurrent: boolean;
}

export interface NumberDrawnPayload {
  number: number;
  calledNumbers: number[];
  poolRemaining: number;
}

export interface PhaseChangedPayload {
  phase: GamePhase;
}

/** Shared shape for any simple host-controlled on/off broadcast (auto-mark,
 *  highlight-current, ...). */
export interface ToggleChangedPayload {
  enabled: boolean;
}

export interface BingoClaimPayload {
  playerId: string;
  name: string;
  emoji: string;
  card: BingoCard;
}

export interface BingoResultPayload {
  playerId: string;
  name: string;
  emoji: string;
  valid: boolean;
  pattern: WinPattern | null;
}

export const GAME_EVENTS = {
  stateSyncRequest: "state-sync-request",
  stateSync: "state-sync",
  numberDrawn: "number-drawn",
  phaseChanged: "phase-changed",
  autoMarkChanged: "auto-mark-changed",
  highlightChanged: "highlight-changed",
  gameReset: "game-reset",
  bingoClaim: "bingo-claim",
  bingoResult: "bingo-result",
} as const;

export function gameChannelName(gameId: string) {
  return `bingo-game-${gameId}`;
}
