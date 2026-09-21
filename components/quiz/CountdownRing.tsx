"use client";

import { useEffect, useRef, useState } from "react";

export function CountdownRing({
  totalMs,
  startedAt,
  onExpire,
  size = 96,
  strokeWidth = 8,
}: {
  totalMs: number;
  startedAt: number;
  onExpire?: () => void;
  size?: number;
  strokeWidth?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAt, totalMs]);

  const elapsed = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, totalMs - elapsed);
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;

  useEffect(() => {
    if (remainingMs <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [remainingMs, onExpire]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);
  const color = fraction > 0.5 ? "#16a34a" : fraction > 0.2 ? "#f59e0b" : "#dc2626";
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.15s linear, stroke 0.3s ease" }}
        />
      </svg>
      <span dir="ltr" className="absolute font-black text-gray-700 tabular-nums" style={{ fontSize: size * 0.32 }}>
        {seconds}
      </span>
    </div>
  );
}
