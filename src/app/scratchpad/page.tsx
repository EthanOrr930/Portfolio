"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCRATCHPAD_PATH = "pages/scratchpad.md";
const SCRATCHPAD_URL = "/pages/scratchpad.md";
const IMAGES_DIR = "pages/scratchpad";
const DRAG_MIME = "text/x-scratchpad-image";

type GeneratedImage = { id: string; dataUrl: string; prompt: string };
type SaveState = "idle" | "saving" | "saved" | "error";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let inCode = false;
  let codeBuf: string[] = [];

  const flushList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (!inCode) {
        flushList();
        inCode = true;
        codeBuf = [];
      } else {
        html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    let l = escapeHtml(raw);
    l = l.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img alt="$1" src="$2" style="max-width:100%;border-radius:6px;margin:8px 0;"/>',
    );
    l = l.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
    l = l.replace(/`([^`]+)`/g, "<code>$1</code>");
    l = l.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    l = l.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

    const hMatch = l.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      html += `<h${level}>${hMatch[2]}</h${level}>`;
      continue;
    }

    const liMatch = l.match(/^[-*]\s+(.*)$/);
    if (liMatch) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${liMatch[1]}</li>`;
      continue;
    }

    flushList();
    if (l.trim() === "") {
      html += "<br/>";
    } else {
      html += `<p>${l}</p>`;
    }
  }
  flushList();
  if (inCode) {
    html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
  }
  return html;
}

export default function ScratchpadPage() {
  const [markdown, setMarkdown] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(SCRATCHPAD_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        setMarkdown(text);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch("/api/write-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: SCRATCHPAD_PATH, content: markdown }),
        });
        setSaveState(resp.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [markdown, loaded]);

  const previewHtml = useMemo(() => renderMarkdown(markdown), [markdown]);

  const generateImage = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      const resp = await fetch("/api/gemini-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setGenError(err.error || `HTTP ${resp.status}`);
        return;
      }
      const data = await resp.json();
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
      setImages((prev) => [
        { id: crypto.randomUUID(), dataUrl, prompt },
        ...prev,
      ]);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "failed");
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating]);

  const onDragStart = (e: React.DragEvent<HTMLImageElement>, id: string) => {
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      const id = e.dataTransfer.getData(DRAG_MIME);
      if (!id) return;
      e.preventDefault();
      const img = images.find((i) => i.id === id);
      if (!img) return;

      const match = img.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) return;
      const mime = match[1];
      const base64 = match[2];
      const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg");
      const filename = `${img.id}.${ext}`;
      const storagePath = `${IMAGES_DIR}/${filename}`;

      const resp = await fetch("/api/write-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: storagePath,
          content: base64,
          encoding: "base64",
        }),
      });
      if (!resp.ok) {
        setGenError("failed to save image");
        return;
      }

      const publicUrl = `/${storagePath}`;
      const ta = textareaRef.current;
      const altText = img.prompt.slice(0, 80);
      const insert = `\n![${altText}](${publicUrl})\n`;

      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = markdown.slice(0, start) + insert + markdown.slice(end);
        setMarkdown(next);
        requestAnimationFrame(() => {
          ta.focus();
          const caret = start + insert.length;
          ta.setSelectionRange(caret, caret);
        });
      } else {
        setMarkdown(markdown + insert);
      }

      setImages((prev) => prev.filter((i) => i.id !== id));
    },
    [images, markdown],
  );

  const saveLabel =
    saveState === "saving"
      ? "saving…"
      : saveState === "saved"
        ? "saved"
        : saveState === "error"
          ? "save error"
          : "";

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 320px",
        gridTemplateRows: "auto 1fr",
        background: "#0b0b0f",
        color: "#e5e5e5",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <header
        style={{
          gridColumn: "1 / -1",
          padding: "12px 20px",
          borderBottom: "1px solid #1f1f28",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Scratchpad
          </h1>
          <a
            href="/"
            style={{ color: "#7a7a88", fontSize: 12, textDecoration: "none" }}
          >
            ← home
          </a>
        </div>
        <span style={{ fontSize: 12, color: "#7a7a88" }}>{saveLabel}</span>
      </header>

      <textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        spellCheck={false}
        placeholder="# Ideas&#10;&#10;Write markdown here. Drop generated images from the right panel →"
        style={{
          padding: "20px 24px",
          background: "#0b0b0f",
          color: "#e5e5e5",
          border: "none",
          borderRight: "1px solid #1f1f28",
          outline: "none",
          resize: "none",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      />

      <div
        style={{
          padding: "20px 24px",
          overflowY: "auto",
          borderRight: "1px solid #1f1f28",
          fontSize: 14,
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      <aside
        style={{
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 12, color: "#7a7a88", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Gemini Image
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe an image…"
          rows={3}
          style={{
            background: "#14141c",
            color: "#e5e5e5",
            border: "1px solid #1f1f28",
            borderRadius: 6,
            padding: 10,
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
        />
        <button
          onClick={generateImage}
          disabled={generating || !prompt.trim()}
          style={{
            background: generating ? "#1f1f28" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 13,
            fontWeight: 500,
            cursor: generating || !prompt.trim() ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "Generating…" : "Generate"}
        </button>
        {genError && (
          <div
            style={{
              color: "#f87171",
              fontSize: 12,
              padding: 8,
              background: "#1f1010",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {genError}
          </div>
        )}

        <div style={{ fontSize: 11, color: "#555566", marginTop: 4 }}>
          Drag an image onto the editor to insert it.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                border: "1px solid #1f1f28",
                borderRadius: 6,
                overflow: "hidden",
                background: "#14141c",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.prompt}
                draggable
                onDragStart={(e) => onDragStart(e, img.id)}
                style={{
                  width: "100%",
                  display: "block",
                  cursor: "grab",
                }}
              />
              <div
                style={{
                  padding: "6px 8px",
                  fontSize: 11,
                  color: "#7a7a88",
                  borderTop: "1px solid #1f1f28",
                  maxHeight: 40,
                  overflow: "hidden",
                }}
              >
                {img.prompt}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
