"use client";

import { motion } from "framer-motion";
import type { SeekAction, Team } from "@/lib/kllawenChannel";
import { TEAM_UI, hatNumber, seekStakes } from "@/components/kllawen/kllawenUi";

/** The seeker's two calls on a chosen hat: پوچ (it's empty) or گوڵ (the ring is here).
 *  `row` lays it out as one short strip so the TV's hats keep their room. */
export function SeekActionBar({
  hat,
  liftedCount,
  hiderTeam,
  triesLeft,
  wrongClaims,
  onAction,
  onCancel,
  layout = "stacked",
}: {
  hat: number;
  liftedCount: number;
  hiderTeam: Team;
  triesLeft: number;
  wrongClaims: number;
  onAction: (action: SeekAction) => void;
  onCancel: () => void;
  layout?: "stacked" | "row";
}) {
  const { claimPoints, missPoints } = seekStakes(liftedCount, wrongClaims);
  const row = layout === "row";
  const hiders = TEAM_UI[hiderTeam].label;
  // Tries only cover a wrong گوڵ; پوچ on the ring's hat always ends the round.
  const warning = triesLeft > 1
    ? `پوچی هەڵە: +${missPoints} خاڵ بۆ ${hiders} · گوڵی هەڵە: هەوڵێک دەڕوات و −1 خاڵ (${triesLeft} هەوڵ ماوە)`
    : `ئەگەر هەڵە بێت: +${missPoints} خاڵ بۆ ${hiders}`;

  const emptyBtn = (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => onAction("empty")}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-gray-800 hover:bg-gray-900 text-white px-3 cursor-pointer ${row ? "flex-1 py-2" : "py-3"}`}
    >
      <span className="font-black text-lg">پوچ ✋</span>
      <span className={`font-bold opacity-70 ${row ? "text-[0.6875rem]" : "text-[10px]"}`}>ئەم کڵاوە بەتاڵە</span>
    </motion.button>
  );
  const claimBtn = (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => onAction("claim")}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white px-3 cursor-pointer ${row ? "flex-1 py-2" : "py-3"}`}
    >
      <span className="font-black text-lg">{liftedCount === 0 ? "گوڵ ✂️" : "ئەوەتا 💍"}</span>
      <span className={`font-bold opacity-80 ${row ? "text-[0.6875rem]" : "text-[10px]"}`}>
        ئەنگوستیلە لێرەیە{claimPoints > 0 ? ` (+${claimPoints})` : ""}
      </span>
    </motion.button>
  );

  if (row) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-1.5 w-full max-w-2xl"
      >
        <span className="text-sm font-black text-center">
          <span className="text-gray-700">کڵاوی {hatNumber(hat)}</span>
          <span className="text-red-500"> · {warning}</span>
        </span>
        <div className="flex items-stretch gap-2 w-full">
          {emptyBtn}
          {claimBtn}
          <button
            onClick={onCancel}
            className="rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm px-4 cursor-pointer"
          >
            پاشگەزبوونەوە
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 w-full max-w-md"
    >
      <span className="text-sm font-black text-gray-700">کڵاوی {hatNumber(hat)}</span>
      <div className="grid grid-cols-2 gap-2 w-full">
        {emptyBtn}
        {claimBtn}
      </div>
      <span className="text-sm sm:text-base font-black text-red-500 text-center">{warning}</span>
      <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600 underline cursor-pointer">
        پاشگەزبوونەوە
      </button>
    </motion.div>
  );
}
