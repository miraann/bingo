"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { HAT_COUNT } from "@/lib/kllawenChannel";

/** Mirrors the scoring in resolveSeek (lib/kllawenChannel.ts). */
export function KllawenRulesModal({
  open,
  onClose,
  targetScore,
}: {
  open: boolean;
  onClose: () => void;
  targetScore: number;
}) {
  const rows = [
    { label: "گوڵ — یەکەم کڵاو ئەنگوستیلەی تێدابێت", value: "0", note: "کڵاوەکان دەگوازرێنەوە", tone: "bg-gray-50 text-gray-700" },
    { label: "دۆزینەوەی ئەنگوستیلە دوای n پوچ", value: "+n", note: "بۆ تیپی دۆزەرەوە، کڵاوەکان دەگوازرێنەوە", tone: "bg-emerald-50 text-emerald-700" },
    { label: "پوچ کردنی کڵاوی ئەنگوستیلە یان گوڵی هەڵە", value: "+ماوە", note: "تیپی شارەوە خاڵی کڵاوە ماوەکان وەردەگرێت و دووبارە دەشارێتەوە", tone: "bg-red-50 text-red-600" },
  ];

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
            dir="rtl"
            className="relative bg-white rounded-3xl shadow-2xl px-5 py-6 sm:px-8 sm:py-8 max-w-md w-full max-h-[90dvh] overflow-y-auto flex flex-col items-center gap-4 text-center"
          >
            <button
              onClick={onClose}
              title="داخستن"
              className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-800 flex items-center justify-center shadow-lg text-3xl">
              🎩
            </div>

            <h3 className="text-xl font-black text-gray-800">یاسای کڵاوێن</h3>
            <p className="text-sm font-bold text-gray-500 leading-relaxed">
              {HAT_COUNT} کڵاو ڕیز دەکرێن. تیپێک ئەنگوستیلەکە لەژێر یەکێکیاندا دەشارێتەوە،
              تیپی بەرامبەر کڵاوەکان یەک یەک هەڵدەداتەوە:
              <br />
              <b className="text-gray-700">«پوچ»</b> = ئەم کڵاوە بەتاڵە ·{" "}
              <b className="text-gray-700">«گوڵ»</b> = ئەنگوستیلە لێرەیە
            </p>

            <div className="w-full flex flex-col gap-2">
              {rows.map(r => (
                <div key={r.label} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.tone}`}>
                  <div className="flex flex-col items-start flex-1 text-right">
                    <span className="text-sm font-bold">{r.label}</span>
                    <span className="text-[11px] font-bold opacity-70">{r.note}</span>
                  </div>
                  <span className="text-base font-black tabular-nums whitespace-nowrap">{r.value}</span>
                </div>
              ))}
            </div>

            <ul className="w-full text-xs font-bold text-gray-400 flex flex-col gap-1 text-right list-disc pr-4">
              <li>نموونە: ٧ کڵاو پوچ کران، کڵاوی هەشتەم ئەنگوستیلەی تێدایە و دەڵێن «پوچ» ← +٣ بۆ تیپی شارەوە.</li>
              <li>ئەگەر هەموو کڵاوە بەتاڵەکان پوچ بکرێن، ئەنگوستیلەکە دۆزراوەتەوە: +{HAT_COUNT - 1} بۆ تیپی دۆزەرەوە.</li>
              <li>یەکەم تیپ کە بگاتە {targetScore} خاڵ دەیباتەوە.</li>
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
