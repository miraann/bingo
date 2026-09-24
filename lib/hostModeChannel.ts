import type { HostMode } from "@/components/GameModeSelector";

/** Tells players which game (bingo / quiz) the host currently has open, so a
 *  single QR code / game code lands them in the right game automatically. */
export interface HostModePayload {
  mode: HostMode;
}

export const HOST_MODE_EVENTS = {
  modeSyncRequest: "host-mode-sync-request",
  modeChanged: "host-mode-changed",
} as const;

export function hostModeChannelName(gameId: string) {
  return `event-mode-${gameId}`;
}
