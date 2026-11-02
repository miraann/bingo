/** کڵاوێن — two teams take turns hiding a ring under one of the hats while
 *  the other team tries to find it by clearing the empty ones. */

export const HAT_COUNT = 10;
export const TARGET_SCORE_PRESETS = [11, 21, 31] as const;
export const DEFAULT_TARGET_SCORE = 21;

export type Team = "a" | "b";
export const TEAMS: Team[] = ["a", "b"];

export function otherTeam(team: Team): Team {
  return team === "a" ? "b" : "a";
}

/** ROUND_INTRO is the short countdown shown before each round's hiding starts. */
export type KllawenPhase = "LOBBY" | "ROUND_INTRO" | "HIDING" | "SEEKING" | "ROUND_RESULT" | "ENDED";

export const ROUND_INTRO_MS = 5000;

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

export type SeekResolution =
  | { kind: "continue"; lifted: number[] }
  | { kind: "result"; lifted: number[]; result: RoundResult };

/** Applies one seeker move. Pure, so the host stays the only place that
 *  knows `ringHat` and every score comes from here. */
export function resolveSeek(
  ringHat: number,
  lifted: number[],
  hat: number,
  action: SeekAction,
  hiderTeam: Team,
): SeekResolution {
  const seekerTeam = otherTeam(hiderTeam);
  const hatsStillDown = HAT_COUNT - lifted.length;

  if (hat === ringHat) {
    if (action === "claim") {
      const points = lifted.length;
      return {
        kind: "result",
        lifted,
        result: {
          outcome: points === 0 ? "cut" : "found",
          ringHat, pickedHat: hat,
          scoringTeam: points > 0 ? seekerTeam : null,
          points,
          nextHider: seekerTeam,
        },
      };
    }
    return {
      kind: "result",
      lifted,
      result: { outcome: "miss", ringHat, pickedHat: hat, scoringTeam: hiderTeam, points: hatsStillDown, nextHider: hiderTeam },
    };
  }

  if (action === "claim") {
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
        scoringTeam: seekerTeam, points: nextLifted.length, nextHider: seekerTeam,
      },
    };
  }
  return { kind: "continue", lifted: nextLifted };
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
  targetScore: number;
  hiderTeam: Team;
  scores: Record<Team, number>;
  round: number;
  lifted: number[];
  result: RoundResult | null;
  roster: KllawenRosterEntry[];
  captains: Record<Team, string | null>;
  /** voter playerId → the teammate they voted for as captain. */
  captainVotes: Record<string, string>;
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
} as const;

export function kllawenChannelName(gameId: string) {
  return `kllawen-game-${gameId}`;
}

/** The team that reached the target (or leads when the host ends early); null on a tie. */
export function leadingTeam(scores: Record<Team, number>): Team | null {
  if (scores.a === scores.b) return null;
  return scores.a > scores.b ? "a" : "b";
}
