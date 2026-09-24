"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BingoPlayClient } from "./BingoPlayClient";
import { QuizPlayerScreen } from "@/components/quiz/QuizPlayerScreen";
import { useHostMode } from "@/hooks/useHostMode";

export function PlayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGameId = (searchParams.get("gameId") ?? "").toUpperCase();
  // Legacy `mode` param only matters if the host can't be reached; otherwise
  // the player follows whichever game the host currently has open.
  const fallbackMode = searchParams.get("mode") === "quiz" ? "quiz" : "bingo";
  const mode = useHostMode(urlGameId, fallbackMode);

  const [manualCode, setManualCode] = useState("");

  /* ── No game code yet: ask for one manually ───────────────────────────── */
  if (!urlGameId) {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-xl font-black text-gray-800">بەشداریکردن لە یاری</h1>
        <p className="text-sm text-gray-400 text-center max-w-xs">کۆدی یاری بنووسە کە لەسەر شاشەی سەرەکی نیشان دراوە</p>

        <input
          value={manualCode}
          onChange={e => setManualCode(e.target.value.toUpperCase())}
          placeholder="کۆدی یاری"
          dir="ltr"
          className="w-full max-w-[220px] text-center text-2xl font-black tracking-[0.3em] border-2 border-gray-200 rounded-2xl py-3 focus:border-purple-400 focus:outline-none"
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={manualCode.trim().length < 3}
          onClick={() =>
            router.replace(`/play?gameId=${manualCode.trim()}`)
          }
          className={`
            font-black rounded-2xl px-8 py-3 text-white
            ${manualCode.trim().length < 3 ? "bg-gray-200 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 cursor-pointer"}
          `}
        >
          بەشداریکردن
        </motion.button>
      </div>
    );
  }

  if (mode === null) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
      </div>
    );
  }

  // key forces a clean remount (fresh channel/state) when the host switches games.
  if (mode === "quiz") return <QuizPlayerScreen key="quiz" gameId={urlGameId} />;
  return <BingoPlayClient key="bingo" gameId={urlGameId} />;
}
