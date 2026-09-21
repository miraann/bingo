"use client";

const EMOJIS = [
  "🦁", "🐼", "🐸", "🦊", "🐵", "🐯", "🐰", "🐨", "🦄", "🐷",
  "🐙", "🦉", "🐬", "🦋", "🐝", "🐢", "🦖", "🐳", "🦅", "🐺",
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-xs">
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={`
            aspect-square rounded-2xl text-2xl flex items-center justify-center
            transition-all duration-150 cursor-pointer
            ${value === emoji ? "bg-purple-600 scale-105 shadow-lg" : "bg-gray-100 hover:bg-gray-200"}
          `}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
