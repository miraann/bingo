/** کڵاوێن — two teams take turns hiding a ring under one of the hats while
 *  the other team tries to find it by clearing the empty ones. */

import type { PublicQuizQuestion } from "./quizLoader";

export const HAT_COUNT = 10;
/** How many rounds a game lasts; the team with more points after the last one wins. */
export const ROUND_PRESETS = [6, 10, 16] as const;
export const DEFAULT_TOTAL_ROUNDS = 10;
export const MAX_ROUNDS = 50;
/** How many wrong calls the seekers get per round before the hiders score. */
export const TRIES_PRESETS = [1, 2, 3] as const;
export const DEFAULT_MAX_TRIES = 1;
export const MAX_TRIES = HAT_COUNT - 1;

export type Team = "a" | "b";
export const TEAMS: Team[] = ["a", "b"];

export function otherTeam(team: Team): Team {
  return team === "a" ? "b" : "a";
}

/** The game opens with a toss question: TOSS_INTRO counts down, TOSS_QUESTION
 *  is open on every phone, TOSS_RESULT shows who answered right fastest — that
 *  team hides first. ROUND_INTRO is the short countdown before each round's hiding. */
export type KllawenPhase =
  | "LOBBY" | "TOSS_INTRO" | "TOSS_QUESTION" | "TOSS_RESULT"
  | "ROUND_INTRO" | "HIDING" | "SEEKING" | "ROUND_RESULT" | "ENDED";

export const ROUND_INTRO_MS = 5000;
/** Extra time the host waits past the toss deadline for answers still in flight. */
export const TOSS_GRACE_MS = 1000;

/** Hiding always happens on the hiding captain's phone. This picks where seeking happens:
 *  "phones": the seeking captain's phone. "screen": tapped on the main screen. */
export type ControlMode = "phones" | "screen";

/** "choose": players pick their own team. "random": the host deals them out. */
export type TeamMode = "choose" | "random";

/** "empty" = پوچ (the seeker says this hat is empty and lifts it).
 *  "claim" = گوڵ (the seeker says the ring is under this hat). */
export type SeekAction = "empty" | "claim";

export type RoundOutcome =
  /** Claimed the ring on the very first hat — no points, hats change hands. */
  | "cut"
  /** Claimed the ring after clearing some empty hats — seekers score the empties. */
  | "found"
  /** Every empty hat was cleared, so the last one must hold the ring. */
  | "autoFound"
  /** Called پوچ on the ring's hat — hiders score the hats still down. */
  | "miss"
  /** Claimed the ring under an empty hat — hiders score the hats still down. */
  | "wrongClaim";

export interface RoundResult {
  outcome: RoundOutcome;
  ringHat: number;
  pickedHat: number;
  scoringTeam: Team | null;
  points: number;
  /** Who hides next round: the hats pass to the seekers once they find the ring. */
  nextHider: Team;
}

/** What the seekers score for finding the ring: one per hat they cleared.
 *  A wrong گوڵ's hat is lifted too but earns nothing, and costs one more. */
export function seekerPoints(liftedCount: number, wrongClaims: number) {
  return Math.max(0, liftedCount - 2 * wrongClaims);
}

/** A wrong call the seekers survived because they still had tries left. */
export interface SeekMistake {
  /** "miss" gave the ring's hat away, so the hiders hide it again. */
  kind: "miss" | "wrongClaim";
  hat: number;
}

export type SeekResolution =
  | { kind: "continue"; lifted: number[]; mistake?: SeekMistake }
  /** A wrong پوچ on the ring's hat with tries left: the ring is hidden again. */
  | { kind: "rehide"; lifted: number[]; mistake: SeekMistake }
  | { kind: "result"; lifted: number[]; result: RoundResult };

/** Applies one seeker move. Pure, so the host stays the only place that
 *  knows `ringHat` and every score comes from here. `triesLeft` counts this
 *  move: a wrong call with more than one left costs a try instead of the round. */
export function resolveSeek(
  ringHat: number,
  lifted: number[],
  hat: number,
  action: SeekAction,
  hiderTeam: Team,
  triesLeft = 1,
  /** Wrong گوڵ calls already made this round, each −1 if the ring is found. */
  wrongClaims = 0,
): SeekResolution {
  const seekerTeam = otherTeam(hiderTeam);
  const hatsStillDown = HAT_COUNT - lifted.length;

  if (hat === ringHat) {
    if (action === "claim") {
      const points = seekerPoints(lifted.length, wrongClaims);
      return {
        kind: "result",
        lifted,
        result: {
          outcome: lifted.length === 0 ? "cut" : "found",
          ringHat, pickedHat: hat,
          scoringTeam: points > 0 ? seekerTeam : null,
          points,
          nextHider: seekerTeam,
        },
      };
    }
    if (triesLeft > 1) return { kind: "rehide", lifted, mistake: { kind: "miss", hat } };
    return {
      kind: "result",
      lifted,
      result: { outcome: "miss", ringHat, pickedHat: hat, scoringTeam: hiderTeam, points: hatsStillDown, nextHider: hiderTeam },
    };
  }

  if (action === "claim" && triesLeft <= 1) {
    return {
      kind: "result",
      lifted,
      result: { outcome: "wrongClaim", ringHat, pickedHat: hat, scoringTeam: hiderTeam, points: hatsStillDown, nextHider: hiderTeam },
    };
  }

  const nextLifted = [...lifted, hat];
  if (nextLifted.length === HAT_COUNT - 1) {
    return {
      kind: "result",
      lifted: nextLifted,
      result: {
        outcome: "autoFound", ringHat, pickedHat: hat,
        scoringTeam: seekerTeam,
        points: seekerPoints(nextLifted.length, wrongClaims + (action === "claim" ? 1 : 0)),
        nextHider: seekerTeam,
      },
    };
  }
  // A wrong گوڵ with tries left lifts that (empty) hat like a پوچ, minus a try.
  return action === "claim"
    ? { kind: "continue", lifted: nextLifted, mistake: { kind: "wrongClaim", hat } }
    : { kind: "continue", lifted: nextLifted };
}

export interface KllawenPlayerPresence {
  playerId: string;
  name: string;
  emoji: string;
  joinedAt: number;
}

export interface KllawenRosterEntry extends KllawenPlayerPresence {
  team: Team | null;
}

/** Everything players are allowed to see — never includes the ring's hat
 *  until a round's result reveals it. */
export interface KllawenPublicState {
  phase: KllawenPhase;
  controlMode: ControlMode;
  teamMode: TeamMode;
  totalRounds: number;
  maxTries: number;
  /** Wrong calls the seekers can still make this round. */
  triesLeft: number;
  /** Wrong گوڵ calls this round — each takes a point off finding the ring. */
  wrongClaims: number;
  /** The last wrong call that cost a try this round; cleared by the next move. */
  mistake: SeekMistake | null;
  hiderTeam: Team;
  scores: Record<Team, number>;
  round: number;
  lifted: number[];
  result: RoundResult | null;
  roster: KllawenRosterEntry[];
  captains: Record<Team, string | null>;
  /** voter playerId → the teammate they voted for as captain. */
  captainVotes: Record<string, string>;
  /** The opening toss question; null once the game is past it (or skipped it). */
  toss: KllawenTossPublic | null;
}

export interface TossAnswer {
  playerId: string;
  name: string;
  emoji: string;
  team: Team;
  answer: number;
  /** Measured on the player's own phone from when the question appeared. */
  elapsedMs: number;
}

export interface KllawenTossPublic {
  question: PublicQuizQuestion;
  answeredIds: string[];
  /** The rest stays hidden until TOSS_RESULT. */
  correctAnswer: number | null;
  /** Fastest first. */
  answers: TossAnswer[];
  /** Whoever answered right first; null when nobody did (the hider was then picked at random). */
  winnerId: string | null;
}

/** The fastest correct answer, or null when nobody got it. */
export function tossWinner(answers: TossAnswer[], correctAnswer: number): TossAnswer | null {
  let best: TossAnswer | null = null;
  for (const a of answers) if (a.answer === correctAnswer && (!best || a.elapsedMs < best.elapsedMs)) best = a;
  return best;
}

/** A player's vote for who should captain their team (lobby only). */
export interface CaptainVotePayload {
  playerId: string;
  candidateId: string;
}

/** Captain votes each player has, counting only voters still on their team. */
export function tallyCaptainVotes(roster: KllawenRosterEntry[], votes: Record<string, string>): Record<string, number> {
  const teamOf = new Map(roster.map(p => [p.playerId, p.team]));
  const counts: Record<string, number> = {};
  for (const [voter, candidate] of Object.entries(votes)) {
    const team = teamOf.get(voter);
    if (team && teamOf.get(candidate) === team) counts[candidate] = (counts[candidate] ?? 0) + 1;
  }
  return counts;
}

export interface ChooseTeamPayload {
  playerId: string;
  team: Team;
}

export interface HideRingPayload {
  playerId: string;
  round: number;
  hat: number;
}

/** Hider teammate → their captain: "hide it under this hat". The host ignores
 *  it; only the captain's phone (same team, same round) tallies the votes. */
export interface HideVotePayload {
  playerId: string;
  name: string;
  emoji: string;
  team: Team;
  round: number;
  hat: number;
}

export interface TossAnswerPayload {
  playerId: string;
  questionId: number;
  answer: number;
  elapsedMs: number;
}

export interface SeekHatPayload {
  playerId: string;
  round: number;
  hat: number;
  action: SeekAction;
}

export const KLLAWEN_EVENTS = {
  stateSyncRequest: "kllawen-state-sync-request",
  state: "kllawen-state",
  chooseTeam: "KLLAWEN_CHOOSE_TEAM",
  captainVote: "KLLAWEN_CAPTAIN_VOTE",
  hideRing: "KLLAWEN_HIDE_RING",
  hideVote: "KLLAWEN_HIDE_VOTE",
  seekHat: "KLLAWEN_SEEK_HAT",
  tossAnswer: "KLLAWEN_TOSS_ANSWER",
} as const;

export function kllawenChannelName(gameId: string) {
  return `kllawen-game-${gameId}`;
}

/** The team with more points once the rounds are played (or the host ends early); null on a tie. */
export function leadingTeam(scores: Record<Team, number>): Team | null {
  if (scores.a === scores.b) return null;
  return scores.a > scores.b ? "a" : "b";
}
