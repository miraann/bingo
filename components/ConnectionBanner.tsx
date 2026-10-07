"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, WifiOff } from "lucide-react";

/** Sticky warning shown on player screens while the realtime channel is down,
 *  with a button to force an immediate reconnect. */
export function ConnectionBanner({ connected, onReconnect }: { connected: boolean; onReconnect: () => void }) {
  // Wait a moment before warning so a normal (re)connect doesn't flash it.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (connected) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, [connected]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          dir="rtl"
          initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-red-500 text-white px-4 py-2.5 shadow-lg"
        >
          <WifiOff size={16} className="shrink-0" />
          <span className="text-sm font-bold">پەیوەندی پچڕا، هەوڵی پەیوەستبوونەوە دەدەین...</span>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onReconnect}
            className="flex items-center gap-1 shrink-0 bg-white text-red-600 font-black text-xs rounded-full px-3 py-1.5 cursor-pointer"
          >
            <RefreshCw size={12} /> دووبارە پەیوەستبوونەوە
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
