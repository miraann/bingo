"use client";

import { useRouter } from "next/navigation";
import { KllawenHostDashboard } from "@/components/kllawen/KllawenHostDashboard";
import { hostModePath, saveHostMode, type HostMode } from "@/components/GameModeSelector";

export default function KllawenPage() {
  const router = useRouter();

  const handleModeChange = (next: HostMode) => {
    saveHostMode(next);
    router.push(hostModePath(next));
  };

  return <KllawenHostDashboard mode="kllawen" onModeChange={handleModeChange} />;
}
