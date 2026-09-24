/** Name/emoji/id a player registered with for a given game code. Shared by the
 *  bingo and quiz player screens so switching games doesn't ask again. */
export interface PlayerProfile {
  playerId: string;
  name: string;
  emoji: string;
}

function storageKey(gameId: string) {
  return `player:profile:${gameId}`;
}

export function loadPlayerProfile(gameId: string): PlayerProfile | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(gameId));
    return raw ? (JSON.parse(raw) as PlayerProfile) : null;
  } catch {
    return null;
  }
}

export function savePlayerProfile(gameId: string, p: PlayerProfile) {
  if (!gameId) return;
  try {
    window.localStorage.setItem(storageKey(gameId), JSON.stringify({ playerId: p.playerId, name: p.name, emoji: p.emoji }));
  } catch {}
}
