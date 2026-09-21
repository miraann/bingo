"use client";

export type HostMode = "bingo" | "quiz";

const HOST_MODE_KEY = "event:hostMode";

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
    return saved === "bingo" || saved === "quiz" ? saved : null;
  } catch {
    return null;
  }
}

/** Compact segmented control — lets the host flip between بینگۆ and کویز
 *  right on the lobby screen, above the start button. */
export function GameModeToggle({
  mode,
  onChange,
}: {
  mode: HostMode;
  onChange: (mode: HostMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
      <button
        type="button"
        onClick={() => onChange("quiz")}
        className={`
          flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer
          transition-all duration-150
          ${mode === "quiz" ? "bg-emerald-600 text-white shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"}
        `}
      >
        <span className="text-base leading-none">🧠</span> کویز
      </button>
      <button
        type="button"
        onClick={() => onChange("bingo")}
        className={`
          flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer
          transition-all duration-150
          ${mode === "bingo" ? "bg-purple-600 text-white shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"}
        `}
      >
        <span className="text-base leading-none">🎱</span> بینگۆ
      </button>
    </div>
  );
}
