"use client";

import { motion } from "framer-motion";
import { Check, Play, Plus, Users } from "lucide-react";
import { QRPanel } from "@/components/QRPanel";
import { GameModeToggle, type HostMode } from "@/components/GameModeSelector";

/* Shared building blocks for the host lobby screens (bingo / quiz / kllawen),
 * so all three games share one layout and look — only the accent changes. */

export type LobbyAccent = "amber" | "emerald" | "purple";

/** Full class strings (not built dynamically) so Tailwind keeps them. */
const ACCENTS: Record<LobbyAccent, {
  glow: string;
  tile: string;
  code: string;
  optSelected: string;
  optIcon: string;
  optLabel: string;
  check: string;
  segText: string;
  focus: string;
  start: string;
  switchOn: string;
  soft: string;
  softIcon: string;
  chip: string;
}> = {
  amber: {
    glow: "bg-[radial-gradient(70rem_28rem_at_50%_-8%,rgba(245,158,11,0.12),transparent)]",
    tile: "from-amber-400 via-amber-600 to-amber-800 shadow-[0_10px_24px_-8px_rgba(180,83,9,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
    code: "text-amber-700",
    optSelected: "bg-amber-50/80 border-amber-600 ring-4 ring-amber-600/10",
    optIcon: "bg-amber-700 text-white shadow-[0_4px_12px_rgba(180,83,9,0.35)]",
    optLabel: "text-amber-900",
    check: "bg-amber-700 text-white",
    segText: "text-amber-800",
    focus: "focus:ring-amber-500/40",
    start: "bg-gradient-to-b from-amber-600 to-amber-800 hover:to-amber-700 shadow-[0_12px_30px_-10px_rgba(180,83,9,0.7),inset_0_1px_0_rgba(255,255,255,0.25)]",
    switchOn: "bg-amber-600",
    soft: "bg-amber-50/60 ring-amber-200/50",
    softIcon: "text-amber-700",
    chip: "text-amber-800 bg-amber-50 hover:bg-amber-100 ring-amber-200/70",
  },
  emerald: {
    glow: "bg-[radial-gradient(70rem_28rem_at_50%_-8%,rgba(16,185,129,0.12),transparent)]",
    tile: "from-emerald-400 via-emerald-600 to-emerald-800 shadow-[0_10px_24px_-8px_rgba(5,150,105,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
    code: "text-emerald-700",
    optSelected: "bg-emerald-50/80 border-emerald-600 ring-4 ring-emerald-600/10",
    optIcon: "bg-emerald-600 text-white shadow-[0_4px_12px_rgba(5,150,105,0.35)]",
    optLabel: "text-emerald-900",
    check: "bg-emerald-600 text-white",
    segText: "text-emerald-700",
    focus: "focus:ring-emerald-500/40",
    start: "bg-gradient-to-b from-emerald-500 to-emerald-700 hover:to-emerald-600 shadow-[0_12px_30px_-10px_rgba(5,150,105,0.7),inset_0_1px_0_rgba(255,255,255,0.25)]",
    switchOn: "bg-emerald-600",
    soft: "bg-emerald-50/60 ring-emerald-200/50",
    softIcon: "text-emerald-700",
    chip: "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 ring-emerald-200/70",
  },
  purple: {
    glow: "bg-[radial-gradient(70rem_28rem_at_50%_-8%,rgba(147,51,234,0.10),transparent)]",
    tile: "from-purple-400 via-purple-600 to-purple-800 shadow-[0_10px_24px_-8px_rgba(126,34,206,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]",
    code: "text-purple-700",
    optSelected: "bg-purple-50/80 border-purple-600 ring-4 ring-purple-600/10",
    optIcon: "bg-purple-600 text-white shadow-[0_4px_12px_rgba(126,34,206,0.35)]",
    optLabel: "text-purple-900",
    check: "bg-purple-600 text-white",
    segText: "text-purple-700",
    focus: "focus:ring-purple-500/40",
    start: "bg-gradient-to-b from-purple-500 to-purple-700 hover:to-purple-600 shadow-[0_12px_30px_-10px_rgba(126,34,206,0.7),inset_0_1px_0_rgba(255,255,255,0.25)]",
    switchOn: "bg-purple-600",
    soft: "bg-purple-50/60 ring-purple-200/50",
    softIcon: "text-purple-700",
    chip: "text-purple-800 bg-purple-50 hover:bg-purple-100 ring-purple-200/70",
  },
};

export function lobbyAccent(accent: LobbyAccent) {
  return ACCENTS[accent];
}

/* ── Page shell: header + sticky join panel + content column ──────────────── */

export function HostLobbyShell({
  accent,
  icon,
  title,
  connected,
  playerCount,
  mode,
  onModeChange,
  gameId,
  joinUrl,
  onNewGame,
  headerActions,
  children,
}: {
  accent: LobbyAccent;
  icon: React.ReactNode;
  title: string;
  connected: boolean;
  playerCount: number;
  mode: HostMode;
  onModeChange: (mode: HostMode) => void;
  gameId: string;
  joinUrl: string;
  onNewGame: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div dir="rtl" className={`h-dvh overflow-y-auto bg-stone-50 ${a.glow}`}>
      <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col gap-6 sm:gap-8">

        <header className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br text-2xl sm:text-3xl ${a.tile}`}>
              {icon}
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">{title}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${connected ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-stone-100 text-stone-500 ring-stone-200"}`}>
                  <span className="relative flex w-1.5 h-1.5">
                    {connected && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />}
                    <span className={`relative w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-stone-400"}`} />
                  </span>
                  {connected ? "پەیوەستە" : "چاوەڕوانی پەیوەستبوون..."}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-stone-600 ring-1 ring-stone-200">
                  <Users size={12} strokeWidth={2.5} />
                  <span className="tabular-nums">{playerCount}</span> یاریزان
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GameModeToggle mode={mode} onChange={onModeChange} />
            {headerActions}
          </div>
        </header>

        <div className="grid items-start gap-6 lg:gap-8 md:grid-cols-[17rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]">
          <aside className="md:sticky md:top-6 flex flex-col items-center gap-3">
            {gameId && joinUrl && <QRPanel gameId={gameId} joinUrl={joinUrl} accentClass={a.code} />}
            <button
              type="button"
              onClick={onNewGame}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 hover:bg-white transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} /> دروستکردنی یاریی نوێ
            </button>
          </aside>

          <main className="flex flex-col gap-5 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

/** Small header-row button (e.g. rules) sized to match the game switcher. */
export function HeaderButton({ onClick, title, icon, label }: { onClick: () => void; title: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 h-11 rounded-2xl bg-white ring-1 ring-stone-200 px-3.5 text-sm font-bold text-stone-600 hover:text-stone-900 hover:ring-stone-300 transition-colors cursor-pointer"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ── Cards & labels ───────────────────────────────────────────────────────── */

export function LobbyCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-[1.75rem] border border-stone-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-14px_rgba(0,0,0,0.10)] p-4 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <span className="text-xs font-black text-stone-500">{children}</span>
      {action}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-stone-100" />;
}

/** Soft accent-tinted box for helper notes. */
export function InfoNote({ accent, items }: { accent: LobbyAccent; items: { icon: React.ElementType; text: React.ReactNode }[] }) {
  const a = ACCENTS[accent];
  return (
    <div className={`flex flex-col gap-2 rounded-2xl ring-1 p-3 text-[11px] leading-relaxed text-stone-600 ${a.soft}`}>
      {items.map(({ icon: Icon, text }, i) => (
        <p key={i} className="flex items-start gap-2">
          <Icon size={14} strokeWidth={2.5} className={`shrink-0 mt-0.5 ${a.softIcon}`} />
          <span>{text}</span>
        </p>
      ))}
    </div>
  );
}

/** Pill-style secondary action used in section headers. */
export function ChipButton({ accent, onClick, children }: { accent: LobbyAccent; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ring-1 transition-colors cursor-pointer ${ACCENTS[accent].chip}`}
    >
      {children}
    </button>
  );
}

/* ── Inputs ───────────────────────────────────────────────────────────────── */

/** Selectable card with icon, title and hint, plus a radio-style check. */
export function OptionCard({
  accent,
  selected,
  onClick,
  icon,
  label,
  hint,
}: {
  accent: LobbyAccent;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  hint?: string;
}) {
  const a = ACCENTS[accent];
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`
        relative flex items-start gap-3 text-start rounded-2xl p-3 sm:p-3.5 border cursor-pointer transition-all duration-200
        ${selected ? a.optSelected : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"}
      `}
    >
      {icon && (
        <span className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 transition-colors ${selected ? a.optIcon : "bg-stone-100 text-stone-500"}`}>
          {icon}
        </span>
      )}
      <span className="flex flex-col gap-0.5 min-w-0 pe-5 self-center">
        <span className={`text-sm font-black ${selected ? a.optLabel : "text-stone-800"}`}>{label}</span>
        {hint && <span className="text-[11px] leading-snug text-stone-500">{hint}</span>}
      </span>
      <span className={`absolute top-3 end-3 grid place-items-center w-4 h-4 rounded-full transition-all ${selected ? a.check : "ring-1 ring-stone-300"}`}>
        {selected && <Check size={11} strokeWidth={3.5} />}
      </span>
    </motion.button>
  );
}

/** Segmented number presets with a trailing custom-value field. */
export function NumberSegment({
  accent,
  presets,
  value,
  onSelect,
  inputValue,
  onInput,
  min,
  max,
  label,
}: {
  accent: LobbyAccent;
  presets: readonly number[];
  value: number;
  onSelect: (n: number) => void;
  inputValue: string;
  onInput: (raw: string) => void;
  min: number;
  max: number;
  label: string;
}) {
  const a = ACCENTS[accent];
  const custom = !presets.includes(value);
  return (
    <div className="flex items-center gap-1 bg-stone-100/80 ring-1 ring-stone-200/70 rounded-xl p-1" dir="ltr">
      {presets.map(n => (
        <motion.button
          key={n} type="button" whileTap={{ scale: 0.94 }}
          onClick={() => onSelect(n)}
          aria-pressed={value === n}
          className={`
            min-w-[3rem] px-3 py-1.5 rounded-lg text-sm font-black tabular-nums cursor-pointer transition-all duration-150
            ${value === n ? `bg-white shadow-sm ring-1 ring-stone-200 ${a.segText}` : "text-stone-500 hover:text-stone-800"}
          `}
        >
          {n}
        </motion.button>
      ))}
      <input
        type="number" min={min} max={max} inputMode="numeric"
        value={inputValue} placeholder="تر"
        onChange={e => onInput(e.target.value)}
        aria-label={label}
        className={`
          w-14 text-center rounded-lg text-sm font-black tabular-nums py-1.5 placeholder:text-stone-400 placeholder:font-bold
          focus:outline-none focus:bg-white focus:ring-2 ${a.focus} transition-all
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
          ${custom ? `bg-white shadow-sm ring-1 ring-stone-200 ${a.segText}` : "bg-transparent text-stone-500"}
        `}
      />
    </div>
  );
}

/** Settings row with icon, title, description and an on/off switch. */
export function SwitchRow({
  accent,
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  accent: LobbyAccent;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const a = ACCENTS[accent];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 text-start cursor-pointer group"
    >
      <span className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 transition-colors ${checked ? a.optIcon : "bg-stone-100 text-stone-500"}`}>
        {icon}
      </span>
      <span className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-black text-stone-800">{label}</span>
        {hint && <span className="text-[11px] leading-snug text-stone-500">{hint}</span>}
      </span>
      {/* Track is LTR so the knob slides the conventional way. */}
      <span dir="ltr" className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? a.switchOn : "bg-stone-200 group-hover:bg-stone-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

/* ── Start ────────────────────────────────────────────────────────────────── */

export function StartButton({
  accent,
  onClick,
  disabled = false,
  label,
  hint,
}: {
  accent: LobbyAccent;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  /** Shown under the button while it's disabled. */
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={!disabled ? { y: -1 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
        onClick={onClick}
        disabled={disabled}
        className={`
          w-full flex items-center justify-center gap-2.5 font-black rounded-2xl px-8 py-4 text-lg transition-[background-color,box-shadow] duration-200
          ${!disabled ? `text-white cursor-pointer ${ACCENTS[accent].start}` : "bg-stone-200/70 text-stone-400 cursor-not-allowed"}
        `}
      >
        <Play size={18} strokeWidth={2.5} fill="currentColor" />
        {label}
      </motion.button>
      {disabled && hint && (
        <span className="text-[11px] font-bold text-stone-400 text-center">{hint}</span>
      )}
    </div>
  );
}
