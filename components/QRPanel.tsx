"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy } from "lucide-react";

export function QRPanel({
  gameId,
  joinUrl,
  accentClass = "text-purple-700",
}: {
  gameId: string;
  joinUrl: string;
  /** Text colour of the game code, so each game can use its own accent. */
  accentClass?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="mx-auto flex flex-col items-center gap-4 bg-white rounded-[1.75rem] border border-stone-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.12)] p-5 lg:p-6 w-full max-w-[18rem] sm:max-w-xs lg:max-w-sm 2xl:max-w-md">
      <div className="bg-white p-3 rounded-2xl ring-1 ring-stone-200 w-full max-w-[min(13rem,40vh)] sm:max-w-[min(15rem,42vh)] lg:max-w-[min(18rem,45vh)] 2xl:max-w-[min(24rem,45vh)]">
        <QRCodeSVG value={joinUrl} size={256} level="M" fgColor="#1c1917" bgColor="#ffffff" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold text-stone-400">کۆدی یاری</span>
        <span className={`text-3xl lg:text-4xl font-black tracking-[0.3em] ps-[0.3em] tabular-nums ${accentClass}`} dir="ltr">{gameId}</span>
      </div>

      <button
        type="button"
        onClick={copy}
        title={joinUrl}
        className="group w-full flex items-center gap-2 rounded-xl bg-stone-50 hover:bg-stone-100 ring-1 ring-stone-200/80 px-3 py-2 cursor-pointer transition-colors"
      >
        <span className="flex-1 min-w-0 truncate text-start text-xs text-stone-500" dir="ltr">
          {joinUrl.replace(/^https?:\/\//, "")}
        </span>
        <span className={`flex items-center gap-1 text-[11px] font-bold shrink-0 ${copied ? "text-emerald-600" : "text-stone-400 group-hover:text-stone-700"}`}>
          {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.5} />}
          {copied ? "کۆپیکرا" : "کۆپی"}
        </span>
      </button>
    </div>
  );
}
