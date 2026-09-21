"use client";

import { useEffect, useRef } from "react";

/** Keeps the screen from sleeping while the page is open, using the native
 *  Screen Wake Lock API. Locks are released by the browser whenever the tab
 *  is hidden, so this re-acquires one every time the page becomes visible
 *  again (e.g. after the phone's screen briefly locks). Silently does
 *  nothing on browsers that don't support the API. */
export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const requestLock = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
        lock.addEventListener("release", () => {
          if (lockRef.current === lock) lockRef.current = null;
        });
      } catch {
        // Can fail (e.g. low battery, tab not focused yet) — harmless to skip.
      }
    };

    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !lockRef.current) requestLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, []);
}
