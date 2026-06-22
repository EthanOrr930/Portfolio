"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createDefaultPageData } from "@/lib/pages/defaults";
import type { PageData } from "@/lib/pages/types";

const PageEditor = dynamic(() => import("@/components/page-editor/PageEditor"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-zinc-50 flex items-center justify-center">
      <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
    </div>
  ),
});

export default function PageEditorRoute() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [initialData, setInitialData] = useState<PageData | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_EDITOR_MODE !== "true") {
      window.location.href = "/";
      return;
    }
    setAllowed(true);

    // Try to load existing portfolio.json, fall back to defaults
    fetch("/pages/portfolio.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setInitialData(data ?? createDefaultPageData());
      })
      .catch(() => {
        setInitialData(createDefaultPageData());
      });
  }, []);

  if (!allowed || !initialData) {
    return (
      <div className="fixed inset-0 bg-zinc-50 flex items-center justify-center">
        <div className="w-4 h-4 bg-zinc-300 rounded-full animate-pulse" />
      </div>
    );
  }

  return <PageEditor initialData={initialData} />;
}
