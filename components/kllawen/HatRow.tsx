"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { HAT_COUNT } from "@/lib/kllawenChannel";
import { hatNumber } from "@/components/kllawen/kllawenUi";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Box = { width: number; height: number };

const COLS = 5;
/** Width : height of the whole 5×2 hat grid on the big screen. */
const GRID_RATIO = 2.2;
/** On wide screens the hats use at most this share of the width (but never less
 *  than MIN_GRID_WIDTH), so they don't run edge to edge and swamp the screen. */
const WIDTH_SHARE = 0.65;
const MIN_GRID_WIDTH = 1000;
const MAX_GRID_WIDTH = 1600;
/** Room kept above the top row (share of the grid height) for hats as they lift. */
const LIFT_ROOM = 0.05;

/** The largest hat grid that fits in `box`. */
function fitGrid(box: Box) {
  const width = Math.floor(Math.max(
    Math.min(box.width, 280), // tiny screens: keep the hats usable and let the page scroll
    Math.min(
      box.width,
      Math.max(box.width * WIDTH_SHARE, MIN_GRID_WIDTH),
      (box.height / (1 + LIFT_ROOM)) * GRID_RATIO,
      MAX_GRID_WIDTH,
    ),
  ));
  const height = Math.floor(width / GRID_RATIO);
  return { width, height, lift: Math.round(height * LIFT_ROOM) };
}

/** Shared viewBox so the rug spot and the hat line up at any box shape. */
const VIEW_BOX = "8 4 84 70";

/** The spot on the rug under the hat (stays put when the hat is lifted). */
function RugSpot() {
  return (
    <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" aria-hidden>
      <ellipse cx="50" cy="63.5" rx="35" ry="9" fill="#fef3c7" stroke="#fde68a" strokeWidth="0.8" />
    </svg>
  );
}

/** A felt Kurdish کڵاو covering its spot on the rug. */
function KllawSvg({ highlighted }: { highlighted: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" aria-hidden>
      {/* soft contact shadow — drawn in, instead of a costly CSS filter */}
      <ellipse cx="50" cy="69" rx="40" ry="4.5" fill="#000" opacity="0.12" />
      <path
        d="M16 64 C16 30, 32 10, 50 10 C68 10, 84 30, 84 64 Z"
        fill={highlighted ? "#b45309" : "#92400e"}
      />
      <path d="M30 60 C30 36, 40 20, 50 18 C60 20, 70 36, 70 60" fill="none" stroke="#fcd34d" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
      <path d="M50 12 L50 60" stroke="#fcd34d" strokeWidth="2" strokeDasharray="3 5" opacity="0.5" />
      <rect x="10" y="58" width="80" height="13" rx="6.5" fill="#451a03" />
      <path d="M16 64.5 H84" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="50" cy="10" r="4" fill="#451a03" />
    </svg>
  );
}

type HatRowProps = {
  lifted: number[];
  /** Hat whose ring is shown (round result). */
  revealRing?: number | null;
  /** Hat only this viewer knows holds the ring (the hiding captain). */
  markedHat?: number | null;
  selected?: number | null;
  /** Hat a wrong گوڵ was called on. */
  wrongHat?: number | null;
  interactive?: boolean;
  onPick?: (hat: number) => void;
  /** Animates a hand sliding under the hats while the ring is being hidden. */
  sweeping?: boolean;
  /** "screen" sizes itself to `bounds` (see HatBoard); "phone" is a fixed small row. */
  size?: "screen" | "phone";
  /** Space the screen-size grid may use; it stays hidden until this is known. */
  bounds?: Box | null;
  /** Hide votes per hat (voter emojis), shown only on the hiding team's phones. */
  voters?: Record<number, string[]>;
};

export function HatRow({
  lifted,
  revealRing = null,
  markedHat = null,
  selected = null,
  wrongHat = null,
  interactive = false,
  onPick,
  sweeping = false,
  size = "screen",
  bounds = null,
  voters,
}: HatRowProps) {
  const screen = size === "screen";
  const fit = screen && bounds ? fitGrid(bounds) : null;

  // Everything on the big screen scales with the hat width, so it reads from across the room.
  const gap = fit ? Math.max(6, Math.min(24, Math.round(fit.width * 0.012))) : 8;
  const cellW = fit ? (fit.width - gap * (COLS - 1)) / COLS : 0;
  const cellH = fit ? (fit.height - gap) / 2 : 0;
  const px = (k: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, cellW * k)));

  const gridStyle: CSSProperties | undefined = screen
    ? fit
      ? { width: fit.width, height: fit.height, gap, gridTemplateRows: "repeat(2, minmax(0, 1fr))" }
      : { visibility: "hidden" }
    : undefined;

  const grid = (
    <div
      className={`relative grid grid-cols-5 ${screen ? "" : "w-full mx-auto gap-1.5 max-w-sm"}`}
      style={gridStyle}
    >
      {Array.from({ length: HAT_COUNT }, (_, hat) => {
        const isLifted = lifted.includes(hat) || revealRing === hat || wrongHat === hat;
        const showRing = revealRing === hat;
        const canPick = interactive && !lifted.includes(hat);
        const isSelected = selected === hat;
        return (
          <button
            key={hat}
            type="button"
            disabled={!canPick}
            onClick={() => canPick && onPick?.(hat)}
            style={screen && fit ? { paddingTop: Math.round(cellH * 0.14), borderRadius: px(0.12, 12, 32) } : undefined}
            className={`
              relative flex flex-col items-center border-2 transition-colors min-h-0
              ${screen ? "px-1 pb-1 sm:px-1.5 sm:pb-1.5" : "rounded-2xl px-1 pt-5 pb-1"}
              ${isSelected ? "border-amber-400 bg-amber-50" : showRing ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-gray-50"}
              ${canPick ? "cursor-pointer hover:border-amber-300 hover:bg-amber-50/60" : "cursor-default"}
            `}
          >
            {voters?.[hat]?.length ? (
              <span className="absolute top-1 inset-x-1 flex items-center justify-center gap-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black px-1 py-0.5 z-10">
                <span className="truncate">{voters[hat].slice(0, 3).join("")}</span>
                <span>{voters[hat].length}</span>
              </span>
            ) : null}
            <div className={`relative w-full ${screen ? "flex-1 min-h-0" : "aspect-[5/4]"}`}>
              <RugSpot />
              {showRing && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.4, 1], opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  style={screen ? { fontSize: px(0.26, 28, 140) } : undefined}
                  className={`absolute inset-x-0 bottom-[4%] flex justify-center leading-none ${screen ? "" : "text-3xl"}`}
                >
                  💍
                </motion.span>
              )}
              {isLifted && !showRing && (
                <span
                  style={screen ? { fontSize: px(0.09, 11, 40) } : undefined}
                  className={`absolute inset-x-0 bottom-[8%] text-center font-black ${screen ? "" : "text-[10px]"} ${wrongHat === hat ? "text-red-500" : "text-gray-400"}`}
                >
                  {wrongHat === hat ? "✗" : "پوچ"}
                </span>
              )}
              <motion.div
                className="absolute inset-0"
                animate={
                  isLifted
                    ? { y: "-38%", rotate: hat % 2 ? 10 : -10, opacity: 0.55 }
                    : { y: "0%", rotate: 0, opacity: 1 }
                }
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                whileHover={canPick ? { scale: 1.06 } : undefined}
              >
                <div className={`absolute inset-0 ${isSelected && !isLifted ? "kl-bob" : ""}`}>
                  <KllawSvg highlighted={isSelected} />
                </div>
              </motion.div>
              {markedHat === hat && !isLifted && (
                <span className="absolute -top-2 right-0 text-base">💍</span>
              )}
            </div>
            <span
              style={screen && fit ? { fontSize: px(0.11, 13, 48), minWidth: px(0.18, 24, 80) } : undefined}
              className={`mt-1 rounded-full px-2 font-black tabular-nums leading-snug ${screen ? "" : "min-w-[1.8rem] text-sm"} ${
                isSelected ? "bg-amber-500 text-white" : "text-gray-400"
              }`}
            >
              {hatNumber(hat)}
            </span>
          </button>
        );
      })}

      {sweeping && (
        // A full-width track slid with a transform; the hand rides its leading edge.
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="kl-sweep absolute left-0 top-[30%] w-full">
            <span
              style={screen && fit ? { fontSize: px(0.2, 28, 110) } : undefined}
              className={`inline-block leading-none ${screen ? "" : "text-3xl"}`}
            >
              ✋
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (!screen) return <div className="relative w-full" dir="ltr">{grid}</div>;

  return (
    <div className="relative flex-shrink-0" dir="ltr" style={fit ? { paddingTop: fit.lift } : undefined}>
      {grid}
    </div>
  );
}

/** The TV board: `top` (status line), the hats and `bottom` (actions), kept together
 *  and centred in the space its parent gives it. The hats get the height the other
 *  two leave, so the whole game always fits on one screen without scrolling. */
export function HatBoard({
  top,
  bottom,
  ...rowProps
}: Omit<HatRowProps, "size" | "bounds"> & { top: ReactNode; bottom: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<() => void>(() => {});
  const [bounds, setBounds] = useState<Box | null>(null);

  useIsoLayoutEffect(() => {
    const stage = stageRef.current, topEl = topRef.current, bottomEl = bottomRef.current;
    if (!stage || !topEl || !bottomEl) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(stage).rowGap) || 0;
      const width = stage.clientWidth;
      const height = stage.clientHeight - topEl.offsetHeight - bottomEl.offsetHeight - gap * 2;
      if (!width) return;
      setBounds(prev => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measureRef.current = measure;
    measure();
    if (typeof ResizeObserver !== "undefined") {
      // The status line and the actions change height with the phase; re-fit when they do.
      const ro = new ResizeObserver(measure);
      [stage, topEl, bottomEl].forEach(el => ro.observe(el));
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Old TV browsers without ResizeObserver: re-fit after every render instead.
  useIsoLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") measureRef.current();
  });

  return (
    <div ref={stageRef} className="flex-1 min-h-0 w-full flex flex-col items-center gap-3">
      {/* auto margins centre the block, and fall to 0 (top-aligned, scrollable) if it overflows */}
      <div ref={topRef} className="mt-auto w-full flex-shrink-0">{top}</div>
      <HatRow {...rowProps} size="screen" bounds={bounds} />
      <div ref={bottomRef} className="mb-auto w-full flex-shrink-0">{bottom}</div>
    </div>
  );
}
