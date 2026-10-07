"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

const RETRY_MS = 2500;

/** Keeps a player's realtime channel alive on flaky phones. The owning hook
 *  puts `attempt` in its channel effect's deps (so bumping it rebuilds the
 *  channel) and forwards every subscribe status to `onStatus`. Errors and
 *  timeouts retry automatically; coming back to the tab or regaining network
 *  reconnects at once, or just asks the host for a fresh snapshot if the
 *  channel still looks alive. */
export function useChannelReconnect(
  channelRef: MutableRefObject<RealtimeChannel | null>,
  syncRequestEvent: string,
) {
  const [attempt, setAttempt] = useState(0);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reconnect = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    connectedRef.current = false;
    setConnected(false);
    setAttempt(a => a + 1);
  }, []);

  const onStatus = useCallback((status: string) => {
    const ok = status === "SUBSCRIBED";
    connectedRef.current = ok;
    setConnected(ok);
    if (ok || retryTimer.current) return;
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        setAttempt(a => a + 1);
      }, RETRY_MS);
    }
  }, []);

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      if (!connectedRef.current) { reconnect(); return; }
      // The socket may have silently died while the phone slept; a fresh
      // snapshot catches up anything missed either way.
      channelRef.current?.send({ type: "broadcast", event: syncRequestEvent, payload: {} });
    };
    const goneOffline = () => { connectedRef.current = false; setConnected(false); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", goneOffline);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", goneOffline);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [channelRef, syncRequestEvent, reconnect]);

  return { attempt, connected, onStatus, reconnect };
}
