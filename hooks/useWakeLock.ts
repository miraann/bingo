"use client";

import { useEffect, useRef } from "react";
import { NO_SLEEP_MP4 } from "@/lib/noSleepVideo";

/** iPhone/iPad (including iPadOS, which reports itself as a Mac). */
function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Keeps the screen from sleeping while the page is open.
 *
 *  Uses the native Screen Wake Lock API where available. Locks are released
 *  by the browser whenever the tab is hidden, so this re-acquires one every
 *  time the page becomes visible again, and also on every tap in case the
 *  browser refused the lock without a user gesture.
 *
 *  iOS doesn't honour that API reliably (missing before 16.4, broken in
 *  home-screen apps before 18.4), so there — or wherever the API is missing —
 *  it also plays a tiny silent looping video, which iOS treats as "media is
 *  playing" and keeps the display on. Video playback must start from a user
 *  gesture, so it kicks in on the first tap. */
export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    let cancelled = false;
    const hasNative = "wakeLock" in navigator;

    const requestLock = async () => {
      if (!hasNative || lockRef.current || document.visibilityState !== "visible") return;
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
        // Can fail (e.g. low battery, no user gesture yet) — retried on next tap.
      }
    };

    let video: HTMLVideoElement | null = null;
    if (!hasNative || isIOS()) {
      video = document.createElement("video");
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.setAttribute("title", "Keep screen awake");
      video.setAttribute("aria-hidden", "true");
      video.muted = true;
      video.loop = true;
      video.src = NO_SLEEP_MP4;
      Object.assign(video.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "1px",
        height: "1px",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(video);
    }

    const playVideo = () => {
      if (video && video.paused && document.visibilityState === "visible") {
        video.play().catch(() => {});
      }
    };

    const handleGesture = () => {
      requestLock();
      playVideo();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestLock();
        playVideo();
      }
    };

    requestLock();
    playVideo();
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("touchend", handleGesture, { passive: true });
    document.addEventListener("click", handleGesture);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("touchend", handleGesture);
      document.removeEventListener("click", handleGesture);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      if (video) {
        video.pause();
        video.remove();
      }
    };
  }, []);
}
