"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRPanel({ gameId, joinUrl }: { gameId: string; joinUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-3 bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-5">
      <div className="bg-white p-3 rounded-2xl border border-gray-200">
        <QRCodeSVG value={joinUrl} size={190} level="M" fgColor="#111827" bgColor="#ffffff" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">کۆدی یاری</span>
        <span className="text-3xl font-black tracking-[0.35em] text-purple-700" dir="ltr">{gameId}</span>
      </div>
      <p className="text-xs text-gray-400 text-center max-w-[240px] break-all" dir="ltr">{joinUrl}</p>
    </div>
  );
}
