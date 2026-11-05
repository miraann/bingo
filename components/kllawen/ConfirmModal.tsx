"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** "Are you sure?" before a host action that throws the game away. The cancel
 *  button takes focus, so a stray Enter (or TV remote OK) never confirms. */
export function ConfirmModal({
  open,
  icon,
  title,
  detail,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  icon: string;
  title: string;
  detail: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center px-4"
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={e => e.stopPropagation()}
            dir="rtl"
            className="bg-white rounded-3xl shadow-2xl px-5 py-6 sm:px-8 sm:py-7 max-w-md w-full flex flex-col items-center gap-3 text-center"
          >
            <span className="text-5xl leading-none">{icon}</span>
            <h3 className="text-xl font-black text-gray-800">{title}</h3>
            <p className="text-sm font-bold text-gray-500 leading-relaxed">{detail}</p>
            <div className="grid grid-cols-2 gap-2 w-full mt-2">
              <button
                type="button"
                autoFocus
                onClick={onCancel}
                className="rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-3 cursor-pointer transition-colors"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black py-3 cursor-pointer transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
