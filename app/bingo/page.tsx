"use client";

import { useRouter } from "next/navigation";
import { BingoDashboard } from "@/components/BingoDashboard";
import { saveHostMode, type HostMode } from "@/components/GameModeSelector";

export default function BingoPage() {
  const router = useRouter();

  const handleModeChange = (next: HostMode) => {
    saveHostMode(next);
    router.push(next === "quiz" ? "/quiz" : "/bingo");
  };

  return <BingoDashboard mode="bingo" onModeChange={handleModeChange} />;
}
