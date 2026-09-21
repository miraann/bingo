"use client";

import { useRouter } from "next/navigation";
import { QuizHostDashboard } from "@/components/quiz/QuizHostDashboard";
import { saveHostMode, type HostMode } from "@/components/GameModeSelector";

export default function QuizPage() {
  const router = useRouter();

  const handleModeChange = (next: HostMode) => {
    saveHostMode(next);
    router.push(next === "quiz" ? "/quiz" : "/bingo");
  };

  return <QuizHostDashboard mode="quiz" onModeChange={handleModeChange} />;
}
