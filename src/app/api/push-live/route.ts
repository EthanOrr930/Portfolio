import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();
const BUCKET = "portfolio-a415d.firebasestorage.app";

/**
 * Push files from public/ to Firebase Storage using gsutil.
 * Only works in dev mode.
 *
 * Body: { paths: string[] } — paths relative to public/
 */
export async function POST(req: NextRequest) {
  try {
    const { paths } = await req.json();

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: "Missing paths array" }, { status: 400 });
    }

    const results: Array<{ path: string; ok: boolean; error?: string }> = [];

    for (const p of paths) {
      const localPath = join(PROJECT_ROOT, "public", p);
      const storagePath = `gs://${BUCKET}/${p}`;

      try {
        await execAsync(`gsutil cp "${localPath}" "${storagePath}"`);
        results.push({ path: p, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ path: p, ok: false, error: message });
      }
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
