import { HAT_COUNT, otherTeam, seekerPoints, type RoundResult, type SeekMistake, type Team } from "@/lib/kllawenChannel";

/** Full class strings (not built dynamically) so Tailwind keeps them. */
export const TEAM_UI: Record<Team, {
  label: string;
  dot: string;
  solid: string;
  soft: string;
  text: string;
  border: string;
  bar: string;
}> = {
  a: {
    label: "تیپی سوور",
    dot: "🔴",
    solid: "bg-rose-500 hover:bg-rose-600 text-white",
    soft: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-300",
    bar: "bg-rose-500",
  },
  b: {
    label: "تیپی شین",
    dot: "🔵",
    solid: "bg-sky-500 hover:bg-sky-600 text-white",
    soft: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-300",
    bar: "bg-sky-500",
  },
};

/** Hats are numbered from 1 on screen. */
export function hatNumber(hat: number) {
  return hat + 1;
}

export function describeResult(result: RoundResult, hiderTeam: Team): {
  title: string;
  detail: string;
  good: boolean;
} {
  const hiders = TEAM_UI[hiderTeam].label;
  const seekers = TEAM_UI[otherTeam(hiderTeam)].label;
  switch (result.outcome) {
    case "cut":
      return {
        title: "گوڵ! ✂️",
        detail: `${seekers} لە یەکەم کڵاودا دۆزییەوە — هیچ خاڵێک نییە، کڵاوەکان دەگوازرێنەوە`,
        good: true,
      };
    case "found":
      return {
        title: "دۆزرایەوە! 💍",
        detail: `+${result.points} خاڵ بۆ ${seekers} — کڵاوەکان دەگوازرێنەوە`,
        good: true,
      };
    case "autoFound":
      return {
        title: "هەموو کڵاوە بەتاڵەکان پوچ کران! 💍",
        detail: `+${result.points} خاڵ بۆ ${seekers} — کڵاوەکان دەگوازرێنەوە`,
        good: true,
      };
    case "miss":
      return {
        title: `ئەنگوستیلەکە لەژێر کڵاوی ${hatNumber(result.ringHat)} بوو! ❌`,
        detail: `+${result.points} خاڵ بۆ ${hiders} (${result.points} کڵاو مابوو)`,
        good: false,
      };
    case "wrongClaim":
      return {
        title: `هەڵە! ئەنگوستیلەکە لەژێر کڵاوی ${hatNumber(result.ringHat)} بوو ❌`,
        detail: `+${result.points} خاڵ بۆ ${hiders} (${result.points} کڵاو مابوو)`,
        good: false,
      };
  }
}

/** The notice after a wrong گوڵ that only cost a try. */
export function describeMistake(mistake: SeekMistake, triesLeft: number): string {
  return `هەڵە! کڵاوی ${hatNumber(mistake.hat)} بەتاڵ بوو — −1 خاڵ ئەگەر بیدۆزنەوە · ${triesLeft} هەوڵ ماوە`;
}

/** What each seeker move is worth right now, for the stakes hint. */
export function seekStakes(liftedCount: number, wrongClaims = 0) {
  return { claimPoints: seekerPoints(liftedCount, wrongClaims), missPoints: HAT_COUNT - liftedCount };
}
