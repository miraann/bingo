"use client";

import { motion } from "framer-motion";
import type { SeekAction, Team } from "@/lib/kllawenChannel";
import { TEAM_UI, hatNumber, seekStakes } from "@/components/kllawen/kllawenUi";

/** The seeker's two calls on a chosen hat: پوچ (it's empty) or گوڵ (the ring is here). */
export function SeekActionBar({
  hat,
  liftedCount,
  hiderTeam,
  triesLeft,
  wrongClaims,
  onAction,
  onCancel,
}: {
  hat: number;
  liftedCount: number;
  hiderTeam: Team;
  triesLeft: number;
  wrongClaims: number;
  onAction: (action: SeekAction) => void;
  onCancel: () => void;
}) {
  const { claimPoints, missPoints } = seekStakes(liftedCount, wrongClaims);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 w-full max-w-md"
    >
      <span className="text-sm font-black text-gray-700">کڵاوی {hatNumber(hat)}</span>
      <div className="grid grid-cols-2 gap-2 w-full">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onAction("empty")}
          className="flex flex-col items-center gap-0.5 rounded-2xl bg-gray-800 hover:bg-gray-900 text-white px-3 py-3 cursor-pointer"
        >
          <span className="text-lg font-black">پوچ ✋</span>
          <span className="text-[10px] font-bold opacity-70">ئەم کڵاوە بەتاڵە</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onAction("claim")}
          className="flex flex-col items-center gap-0.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-3 cursor-pointer"
        >
          <span className="text-lg font-black">{liftedCount === 0 ? "گوڵ ✂️" : "ئەوەتا 💍"}</span>
          <span className="text-[10px] font-bold opacity-80">
            ئەنگوستیلە لێرەیە{claimPoints > 0 ? ` (+${claimPoints})` : ""}
          </span>
        </motion.button>
      </div>
      <span className="text-sm sm:text-base font-black text-red-500 text-center">
        {triesLeft > 1
          ? `ئەگەر هەڵە بێت: هەوڵێک دەڕوات (${triesLeft} هەوڵ ماوە) · گوڵی هەڵە: −1 خاڵ`
          : `ئەگەر هەڵە بێت: +${missPoints} خاڵ بۆ ${TEAM_UI[hiderTeam].label}`}
      </span>
      <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600 underline cursor-pointer">
        پاشگەزبوونەوە
      </button>
    </motion.div>
  );
}
