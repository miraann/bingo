import { Suspense } from "react";
import { PlayClient } from "./PlayClient";

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <PlayClient />
    </Suspense>
  );
}
