const GAME_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I confusion
const HOST_GAME_ID_KEY = "bingo:hostGameId";
const QUIZ_HOST_GAME_ID_KEY = "quiz:hostGameId";

export function generateGameId(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += GAME_CODE_ALPHABET[Math.floor(Math.random() * GAME_CODE_ALPHABET.length)];
  }
  return out;
}

export function generatePlayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The host keeps one persistent game code per browser so a page refresh
 *  during an event doesn't invalidate the QR code players already scanned. */
export function getOrCreateHostGameId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(HOST_GAME_ID_KEY);
  if (existing) return existing;
  const created = generateGameId();
  window.localStorage.setItem(HOST_GAME_ID_KEY, created);
  return created;
}

export function createNewHostGameId(): string {
  const created = generateGameId();
  if (typeof window !== "undefined") window.localStorage.setItem(HOST_GAME_ID_KEY, created);
  return created;
}

/** Same idea as getOrCreateHostGameId, kept separate so a quiz game and a
 *  bingo game never end up sharing a code/channel. */
export function getOrCreateQuizHostGameId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(QUIZ_HOST_GAME_ID_KEY);
  if (existing) return existing;
  const created = generateGameId();
  window.localStorage.setItem(QUIZ_HOST_GAME_ID_KEY, created);
  return created;
}

export function createNewQuizHostGameId(): string {
  const created = generateGameId();
  if (typeof window !== "undefined") window.localStorage.setItem(QUIZ_HOST_GAME_ID_KEY, created);
  return created;
}
