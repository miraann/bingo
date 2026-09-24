"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Calculator, X } from "lucide-react";

/** Mirrors the scoring in useQuizHost.revealAnswer: 100 × (1 − elapsed / total). */
const MAX_POINTS = 100;

export function QuizPointsInfoModal({
  open,
  onClose,
  timeLimitSec,
}: {
  open: boolean;
  onClose: () => void;
  timeLimitSec: number;
}) {
  const rows = [
    { label: "دەستبەجێ", fraction: 0 },
    { label: "چارەکی کات", fraction: 0.25 },
    { label: "نیوەی کات", fraction: 0.5 },
    { label: "٧٥٪ی کات", fraction: 0.75 },
    { label: "کۆتایی کات", fraction: 1 },
  ].map(r => ({
    ...r,
    seconds: Math.round(timeLimitSec * r.fraction * 10) / 10,
    points: Math.round(MAX_POINTS * (1 - r.fraction)),
  }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={e => e.stopPropagation()}
            className="relative bg-white rounded-3xl shadow-2xl px-5 py-6 sm:px-8 sm:py-8 max-w-sm w-full max-h-[90dvh] overflow-y-auto flex flex-col items-center gap-4 text-center"
          >
            <button
              onClick={onClose}
              title="داخستن"
              className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg">
              <Calculator size={30} className="text-white" strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black text-gray-800">خاڵ چۆن هەژمار دەکرێت؟</h3>
            <p className="text-sm font-bold text-gray-500 leading-relaxed">
              وەڵامی ڕاست تا <span className="text-emerald-600" dir="ltr">{MAX_POINTS}</span> خاڵ وەردەگرێت.
              هەتا خێراتر وەڵام بدەیتەوە، خاڵی زیاتر وەردەگریت.
            </p>

            <div className="w-full flex flex-col gap-2">
              {rows.map(r => (
                <div key={r.label} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-2.5">
                  <div className="flex flex-col items-start min-w-[5.5rem]">
                    <span className="text-sm font-bold text-gray-700">{r.label}</span>
                    <span className="text-[11px] font-bold text-gray-400" dir="ltr">{r.seconds}s</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden" dir="ltr">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.points}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <span className="w-10 text-base font-black text-emerald-600 tabular-nums" dir="ltr">
                    {r.points === MAX_POINTS ? `~${r.points}` : r.fraction === 1 ? "~0" : r.points}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-red-50 rounded-2xl px-3 py-2.5">
                <span className="text-sm font-bold text-red-500">وەڵامی هەڵە یان بێ وەڵام</span>
                <span className="w-10 text-base font-black text-red-500 tabular-nums" dir="ltr">0</span>
              </div>
            </div>

            <ul className="w-full text-xs font-bold text-gray-400 flex flex-col gap-1 text-right list-disc pr-4">
              <li>ئەگەر وەڵامەکەت بگۆڕیت، کات لە دوایین وەڵامەوە دەژمێردرێت.</li>
              <li>بەکارهێنانی یارمەتی خاڵ کەم ناکاتەوە.</li>
              <li>خاڵی گشتی = کۆی خاڵی هەموو پرسیارەکان.</li>
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
