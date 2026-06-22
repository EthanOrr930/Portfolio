"use client";

import dynamic from "next/dynamic";

const ScrollExperience = dynamic(
  () => import("@/components/scroll-experience/ScrollExperience"),
  { ssr: false },
);

export default function Home() {
  return <ScrollExperience />;
}
