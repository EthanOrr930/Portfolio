"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createDefaultSceneData } from "@/lib/animation/defaults";
import type { SceneData } from "@/lib/animation/types";

const AnimationEditor = dynamic(
  () => import("@/components/animation-editor/AnimationEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
      </div>
    ),
  },
);

export default function EditorRoute() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [initialData, setInitialData] = useState<SceneData | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EDITOR_MODE !== "true") {
      window.location.href = "/";
      return;
    }
    setAllowed(true);

    fetch("/pages/scene.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.version === 2) {
          setInitialData(data);
        } else {
          setInitialData(createDefaultSceneData());
        }
      })
      .catch(() => {
        setInitialData(createDefaultSceneData());
      });
  }, []);

  if (!allowed || !initialData) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
      </div>
    );
  }

  return <AnimationEditor initialData={initialData} />;
}
