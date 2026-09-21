"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BingoPlayClient } from "./BingoPlayClient";
import { QuizPlayerScreen } from "@/components/quiz/QuizPlayerScreen";

export function PlayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGameId = (searchParams.get("gameId") ?? "").toUpperCase();
  const mode = searchParams.get("mode") === "quiz" ? "quiz" : "bingo";

  const [manualCode, setManualCode] = useState("");
  const [manualMode, setManualMode] = useState<"bingo" | "quiz">("bingo");

  /* ── No game code yet: ask for one manually ───────────────────────────── */
  if (!urlGameId) {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-xl font-black text-gray-800">بەشداریکردن لە یاری</h1>
        <p className="text-sm text-gray-400 text-center max-w-xs">کۆدی یاری بنووسە کە لەسەر شاشەی سەرەکی نیشان دراوە</p>

        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setManualMode("bingo")}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
              manualMode === "bingo" ? "bg-white shadow text-purple-600" : "text-gray-400"
            }`}
          >
            بینگۆ
          </button>
          <button
            type="button"
            onClick={() => setManualMode("quiz")}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
              manualMode === "quiz" ? "bg-white shadow text-emerald-600" : "text-gray-400"
            }`}
          >
            کویز
          </button>
        </div>

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
            router.replace(`/play?gameId=${manualCode.trim()}${manualMode === "quiz" ? "&mode=quiz" : ""}`)
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

  if (mode === "quiz") return <QuizPlayerScreen gameId={urlGameId} />;
  return <BingoPlayClient gameId={urlGameId} />;
}
