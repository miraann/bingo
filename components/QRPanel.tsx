"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRPanel({ gameId, joinUrl }: { gameId: string; joinUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-3 bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-4 sm:p-5 lg:p-6 w-full max-w-[18rem] sm:max-w-xs lg:max-w-sm">
      <div className="bg-white p-3 rounded-2xl border border-gray-200 w-full max-w-[13rem] sm:max-w-[15rem] lg:max-w-[18rem]">
        <QRCodeSVG value={joinUrl} size={256} level="M" fgColor="#111827" bgColor="#ffffff" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">کۆدی یاری</span>
        <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[0.25em] sm:tracking-[0.35em] text-purple-700" dir="ltr">{gameId}</span>
      </div>
      <p className="text-xs text-gray-400 text-center max-w-full break-all" dir="ltr">{joinUrl}</p>
    </div>
  );
}
