const STORAGE_BUCKET = "portfolio-a415d.firebasestorage.app";

const isEditor = process.env.NEXT_PUBLIC_EDITOR_MODE === "true";

/**
 * Resolve an asset path to a local path (dev/editor) or Firebase Storage URL (production).
 *
 * Usage: assetUrl("/textures/positions.exr")
 * - In editor mode: "/textures/positions.exr"
 * - In production:  "https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media"
 */
export function assetUrl(path: string): string {
  // Firebase Hosting serves everything in public/ at the root, so
  // relative paths work for both editor and production. The Storage
  // bucket URL is only needed if assets are explicitly uploaded there.
  return path;
}
