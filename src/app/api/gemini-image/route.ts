import { NextRequest, NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash-image";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not set in .env.local" },
      { status: 500 },
    );
  }

  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json({ error: text }, { status: upstream.status });
  }

  const data = await upstream.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data,
  );
  if (!img?.inlineData?.data) {
    return NextResponse.json({ error: "no image in response" }, { status: 500 });
  }

  return NextResponse.json({
    mimeType: img.inlineData.mimeType || "image/png",
    base64: img.inlineData.data,
  });
}
