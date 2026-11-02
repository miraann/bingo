"use client";

import { useRouter } from "next/navigation";
import { QuizHostDashboard } from "@/components/quiz/QuizHostDashboard";
import { hostModePath, saveHostMode, type HostMode } from "@/components/GameModeSelector";

export default function QuizPage() {
  const router = useRouter();

  const handleModeChange = (next: HostMode) => {
    saveHostMode(next);
    router.push(hostModePath(next));
  };

  return <QuizHostDashboard mode="quiz" onModeChange={handleModeChange} />;
}
