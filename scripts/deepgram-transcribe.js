// One-off: run Deepgram prerecorded transcription on the session audio with the
// exact options CHE uses (nova-3, diarize, paragraphs, smart_format, punctuate),
// then emit the portfolio DeepgramResult shape (channels[0].alternatives[0],
// words stripped). Key read from /tmp/che_keys.env — never committed.
const fs = require("fs");

const env = Object.fromEntries(
  fs.readFileSync("/tmp/che_keys.env", "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  }),
);
const KEY = env.DEEPGRAM_API_KEY;
if (!KEY) throw new Error("DEEPGRAM_API_KEY missing");

const AUDIO = "/Users/ethanorr/Documents/Projects/Portfolio/public/audio/session.mp3";
const params = new URLSearchParams({
  model: "nova-3",
  punctuate: "true",
  smart_format: "true",
  paragraphs: "true",
  diarize: "true",
  utterances: "true",
});

(async () => {
  const t0 = Date.now();
  const res = await fetch("https://api.deepgram.com/v1/listen?" + params, {
    method: "POST",
    headers: { Authorization: "Token " + KEY, "Content-Type": "audio/mpeg" },
    body: fs.readFileSync(AUDIO),
  });
  if (!res.ok) {
    console.error("Deepgram error", res.status, await res.text());
    process.exit(1);
  }
  const json = await res.json();
  fs.writeFileSync("/tmp/dg_raw.json", JSON.stringify(json));

  const alt = json.results?.channels?.[0]?.alternatives?.[0] || {};
  const paras = alt.paragraphs?.paragraphs || [];
  const speakers = [...new Set(paras.map((p) => p.speaker))].sort();
  const out = {
    results: { channels: [{ alternatives: [{ transcript: alt.transcript, confidence: alt.confidence, paragraphs: alt.paragraphs }] }] },
  };
  fs.writeFileSync("/tmp/dg_transcript.json", JSON.stringify(out));

  const lastSent = paras.at(-1)?.sentences?.at(-1);
  const firstSent = paras[0]?.sentences?.[0];
  console.log(
    `OK ${((Date.now() - t0) / 1000).toFixed(1)}s | paragraphs=${paras.length} | speakers=[${speakers.join(",")}] | ` +
      `dur=${json.metadata?.duration}s | conf=${alt.confidence?.toFixed(3)} | first=${firstSent?.start}s last=${lastSent?.end}s`,
  );
  console.log("first paragraph text:", (firstSent?.text || "").slice(0, 120));
})();
