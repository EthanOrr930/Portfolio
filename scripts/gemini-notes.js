// One-off: run CHE's exact AI-notes generator (gemini-2.5-pro, the same
// SYSTEM_PROMPT + config from firebase/functions/src/aiSummary.ts) against the
// real Deepgram transcript. Emits raw markdown to /tmp/notes_raw.md.
const fs = require("fs");
const path = require("path");

const CHE = "/Users/ethanorr/Documents/CheConference/ConferenceSystem";
const { GoogleGenAI } = require(path.join(CHE, "firebase/functions/node_modules/@google/genai"));

const env = Object.fromEntries(
  fs.readFileSync("/tmp/che_keys.env", "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  }),
);
const KEY = env.GEMINI_API_KEY;
if (!KEY) throw new Error("GEMINI_API_KEY missing");
const MODEL = "gemini-2.5-pro";

// Pull the live SYSTEM_PROMPT verbatim from CHE source (no interpolation → eval
// of the template literal just resolves the escaped backticks).
const src = fs.readFileSync(path.join(CHE, "firebase/functions/src/aiSummary.ts"), "utf8");
const m = src.match(/const SYSTEM_PROMPT = (`(?:\\.|[^`\\])*`)/);
if (!m) throw new Error("SYSTEM_PROMPT not found in aiSummary.ts");
const SYSTEM_PROMPT = eval(m[1]);

function formatMSS(secs) {
  const t = Math.max(0, Math.floor(secs));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function formatDeepgramForPrompt(dg) {
  const alt = dg?.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) return "";
  const paras = alt.paragraphs?.paragraphs;
  if (paras && paras.length) {
    const lines = [];
    for (const p of paras) {
      const sl = typeof p.speaker === "number" ? `Speaker ${p.speaker}` : "Speaker";
      for (const s of p.sentences ?? []) lines.push(`[${formatMSS(s.start)} · ${sl}] ${s.text.trim()}`);
      lines.push("");
    }
    return lines.join("\n").trim();
  }
  const flat = alt.transcript?.trim();
  return flat ? `[0:00 · Speaker 0] ${flat}` : "";
}

(async () => {
  const dg = JSON.parse(fs.readFileSync("/tmp/dg_raw.json", "utf8"));
  const transcriptText = formatDeepgramForPrompt(dg);
  console.error("prompt transcript chars:", transcriptText.length, "| prompt len:", SYSTEM_PROMPT.length);
  const ai = new GoogleGenAI({ apiKey: KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: transcriptText,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingBudget: 32768, includeThoughts: false },
    },
  });
  const md = (response.text ?? "").trim();
  if (!md) {
    console.error("EMPTY response, finishReason:", response.candidates?.[0]?.finishReason);
    process.exit(1);
  }
  fs.writeFileSync("/tmp/notes_raw.md", md);
  const u = response.usageMetadata ?? {};
  console.log(`OK notes: ${md.length} chars | tokens in/think/out: ${u.promptTokenCount}/${u.thoughtsTokenCount}/${u.candidatesTokenCount}`);
  console.log(`mermaid=${/```mermaid/.test(md)} math($$)=${/\$\$/.test(md)} tables=${/\|.*\|/.test(md)} headings=${(md.match(/^#{2,4} /gm) || []).length}`);
})();
