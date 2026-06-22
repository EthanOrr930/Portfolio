"use client";

import dynamic from "next/dynamic";

const CircuitBoardScene = dynamic(
  () => import("@/components/circuit-board/CircuitBoardScene"),
  { ssr: false },
);

export default function CircuitBoardPage() {
  return (
    <div className="fixed inset-0">
      <CircuitBoardScene />
    </div>
  );
}
