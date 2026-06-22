import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

const PROJECT_ROOT = process.cwd();

/**
 * Write a file to the public directory.
 * Only works in dev mode (API routes aren't exported in static builds).
 *
 * Body: { path: string, content: string, encoding?: "utf8" | "base64" }
 */
export async function POST(req: NextRequest) {
  try {
    const { path, content, encoding = "utf8" } = await req.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    // Only allow writing to public/
    const resolved = join(PROJECT_ROOT, "public", path);
    if (!resolved.startsWith(join(PROJECT_ROOT, "public"))) {
      return NextResponse.json({ error: "Path must be under public/" }, { status: 403 });
    }

    // Ensure directory exists
    await mkdir(dirname(resolved), { recursive: true });

    if (encoding === "base64") {
      await writeFile(resolved, Buffer.from(content, "base64"));
    } else {
      await writeFile(resolved, content, "utf8");
    }

    return NextResponse.json({ ok: true, path: resolved });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
