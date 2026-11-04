"use client";

export type HostMode = "bingo" | "quiz" | "kllawen";

const HOST_MODE_KEY = "event:hostMode";

export function isHostMode(value: unknown): value is HostMode {
  return value === "bingo" || value === "quiz" || value === "kllawen";
}

/** Each game has its own host route; "/" and the mode toggle navigate here. */
export function hostModePath(mode: HostMode): string {
  return `/${mode}`;
}

/** Remembers which game the host last ran, so "/" can send a bookmark/refresh
 *  back to the right route without asking again. */
export function saveHostMode(mode: HostMode) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(HOST_MODE_KEY, mode); } catch {}
}

export function loadHostMode(): HostMode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(HOST_MODE_KEY);
    return isHostMode(saved) ? saved : null;
  } catch {
    return null;
  }
}

const MODE_BUTTONS: { mode: HostMode; icon: string; label: string; activeClass: string }[] = [
  { mode: "quiz", icon: "🧠", label: "پرسیار", activeClass: "bg-emerald-600" },
  { mode: "bingo", icon: "🎱", label: "بینگۆ", activeClass: "bg-purple-600" },
  { mode: "kllawen", icon: "🎩", label: "کڵاوێن", activeClass: "bg-amber-700" },
];

/** Compact segmented control — lets the host flip between the games right
 *  on the lobby screen, above the start button. */
export function GameModeToggle({
  mode,
  onChange,
}: {
  mode: HostMode;
  onChange: (mode: HostMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-stone-100/80 ring-1 ring-stone-200/70 rounded-2xl p-1">
      {MODE_BUTTONS.map(b => (
        <button
          key={b.mode}
          type="button"
          onClick={() => onChange(b.mode)}
          aria-pressed={mode === b.mode}
          className={`
            flex items-center gap-1.5 rounded-xl px-3 sm:px-4 py-2 text-sm font-bold cursor-pointer
            transition-all duration-150
            ${mode === b.mode ? `${b.activeClass} text-white shadow-md` : "text-stone-400 hover:text-stone-700 hover:bg-white/70"}
          `}
        >
          <span className="text-base leading-none">{b.icon}</span> {b.label}
        </button>
      ))}
    </div>
  );
}
