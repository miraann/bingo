"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadHostMode } from "@/components/GameModeSelector";

/** "/" has no dashboard of its own — it just sends the host to whichever
 *  game they last ran (or /bingo the first time), so /bingo and /quiz stay
 *  the two real, bookmarkable/shareable host URLs. */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const saved = loadHostMode();
    router.replace(saved === "quiz" ? "/quiz" : "/bingo");
  }, [router]);

  return <div className="h-dvh bg-white" />;
}
