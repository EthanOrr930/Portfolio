import type { SceneData } from "./types";

export function validateSceneData(data: unknown): data is SceneData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 2) return false;
  if (!d.settings || typeof d.settings !== "object") return false;
  if (!d.camera || typeof d.camera !== "object") return false;
  if (!d.transform || typeof d.transform !== "object") return false;
  if (!d.model || typeof d.model !== "object") return false;

  const cam = d.camera as Record<string, unknown>;
  const tf = d.transform as Record<string, unknown>;
  const mdl = d.model as Record<string, unknown>;

  if (!Array.isArray(cam.keyframes)) return false;
  if (!Array.isArray(tf.keyframes)) return false;
  if (!Array.isArray(mdl.keyframes)) return false;
  if (!Array.isArray(mdl.transitions)) return false;

  return true;
}

export function serializeSceneData(data: SceneData): string {
  return JSON.stringify(data, null, 2);
}

export function deserializeSceneData(json: string): SceneData {
  const parsed = JSON.parse(json);
  if (!validateSceneData(parsed)) {
    throw new Error("Invalid scene data format (expected version: 2)");
  }
  return parsed;
}
