/* ─────────────────────────────────────────────────────────────────────────────
   Shared bingo primitives — card generation, group metadata, win checking.
   Used by both the host dashboard and the player view.
───────────────────────────────────────────────────────────────────────────── */

export const GROUPS = [
  { letter: "B", start: 1,  bg: "bg-blue-600",  calledBg: "bg-blue-600",  border: "border-blue-400",   text: "text-blue-700",  hex: "#2563eb" },
  { letter: "I", start: 16, bg: "bg-red-600",   calledBg: "bg-red-600",   border: "border-red-400",    text: "text-red-700",   hex: "#dc2626" },
  { letter: "N", start: 31, bg: "bg-violet-600",calledBg: "bg-violet-600",border: "border-violet-400", text: "text-violet-700",hex: "#7c3aed" },
  { letter: "G", start: 46, bg: "bg-green-600", calledBg: "bg-green-600", border: "border-green-400",  text: "text-green-700", hex: "#16a34a" },
  { letter: "O", start: 61, bg: "bg-orange-500",calledBg: "bg-orange-500",border: "border-orange-400", text: "text-orange-600",hex: "#f97316" },
] as const;

export const TIMER_PRESETS = [10, 15, 30] as const;

export type Cell = number | "FREE";
export type BingoCard = Cell[][]; // [row][col], col 0..4 = B,I,N,G,O

export function groupOf(n: number) {
  return GROUPS[Math.min(Math.floor((n - 1) / 15), 4)];
}

export function generateBingoCard(): BingoCard {
  const ranges: [number, number][] = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  const columns = ranges.map(([min, max]) => {
    const pool: number[] = [];
    while (pool.length < 5) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!pool.includes(n)) pool.push(n);
    }
    return pool;
  });
  const grid: BingoCard = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => columns[c][r])
  );
  grid[2][2] = "FREE";
  return grid;
}

export type WinPattern =
  | "row-0" | "row-1" | "row-2" | "row-3" | "row-4"
  | "col-0" | "col-1" | "col-2" | "col-3" | "col-4"
  | "diag-main" | "diag-anti" | "full-house";

const PATTERN_LABELS_CKB: Record<WinPattern, string> = {
  "row-0": "ڕیزی ئاسۆیی ١", "row-1": "ڕیزی ئاسۆیی ٢", "row-2": "ڕیزی ئاسۆیی ٣",
  "row-3": "ڕیزی ئاسۆیی ٤", "row-4": "ڕیزی ئاسۆیی ٥",
  "col-0": "ستوونی B", "col-1": "ستوونی I", "col-2": "ستوونی N",
  "col-3": "ستوونی G", "col-4": "ستوونی O",
  "diag-main": "کەوانەیی", "diag-anti": "کەوانەیی پێچەوانە",
  "full-house": "خشتەی تەواو",
};

export function patternLabel(p: WinPattern): string {
  return PATTERN_LABELS_CKB[p];
}

function isHit(cell: Cell, called: Set<number>) {
  return cell === "FREE" || called.has(cell as number);
}

/** Checks a card against the authoritative set of called numbers and returns
 *  the first winning pattern found, or null. Never trusts the player's own
 *  "marked" cells — only numbers that were actually called count. */
export function findWinningPattern(card: BingoCard, calledNumbers: Iterable<number>): WinPattern | null {
  const called = calledNumbers instanceof Set ? calledNumbers : new Set(calledNumbers);

  for (let r = 0; r < 5; r++) {
    if (card[r].every(cell => isHit(cell, called))) return `row-${r}` as WinPattern;
  }
  for (let c = 0; c < 5; c++) {
    if (card.every(row => isHit(row[c], called))) return `col-${c}` as WinPattern;
  }
  if ([0, 1, 2, 3, 4].every(i => isHit(card[i][i], called))) return "diag-main";
  if ([0, 1, 2, 3, 4].every(i => isHit(card[i][4 - i], called))) return "diag-anti";
  if (card.every(row => row.every(cell => isHit(cell, called)))) return "full-house";
  return null;
}
