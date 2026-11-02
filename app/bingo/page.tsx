"use client";

import { useRouter } from "next/navigation";
import { BingoDashboard } from "@/components/BingoDashboard";
import { hostModePath, saveHostMode, type HostMode } from "@/components/GameModeSelector";

export default function BingoPage() {
  const router = useRouter();

  const handleModeChange = (next: HostMode) => {
    saveHostMode(next);
    router.push(hostModePath(next));
  };

  return <BingoDashboard mode="bingo" onModeChange={handleModeChange} />;
}
