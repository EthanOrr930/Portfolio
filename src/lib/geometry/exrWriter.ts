/**
 * Minimal OpenEXR writer for uncompressed FLOAT RGBA scanline images.
 * Supports custom float metadata attributes.
 * Produces a valid EXR file that Three.js EXRLoader can read.
 */

export interface EXRMetadata {
  [key: string]: number;
}

function writeString(view: DataView, offset: number, str: string): number {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset++, str.charCodeAt(i));
  }
  view.setUint8(offset++, 0); // null terminator
  return offset;
}

function writeAttrHeader(
  view: DataView,
  offset: number,
  name: string,
  type: string,
  size: number,
): number {
  offset = writeString(view, offset, name);
  offset = writeString(view, offset, type);
  view.setInt32(offset, size, true);
  offset += 4;
  return offset;
}

/**
 * Encode RGBA float32 data into an EXR file buffer.
 */
export function encodeEXR(
  width: number,
  height: number,
  r: Float32Array,
  g: Float32Array,
  b: Float32Array,
  a: Float32Array,
  metadata?: EXRMetadata,
): ArrayBuffer {
  const MAGIC = 20000630;
  const VERSION = 2;
  const NO_COMPRESSION = 0;
  const FLOAT = 2;

  const channels = [
    { name: "A", data: a },
    { name: "B", data: b },
    { name: "G", data: g },
    { name: "R", data: r },
  ];

  const metaEntries = metadata ? Object.entries(metadata) : [];

  // ── Estimate header size ──────────────────────────────────
  let headerSize = 0;
  headerSize += 4 + 4; // magic + version

  // channels attribute
  headerSize += "channels".length + 1 + "chlist".length + 1 + 4;
  let chlistSize = 0;
  for (const ch of channels) {
    chlistSize += ch.name.length + 1 + 16;
  }
  chlistSize += 1;
  headerSize += chlistSize;

  // compression
  headerSize += "compression".length + 1 + "compression".length + 1 + 4 + 1;
  // dataWindow
  headerSize += "dataWindow".length + 1 + "box2i".length + 1 + 4 + 16;
  // displayWindow
  headerSize += "displayWindow".length + 1 + "box2i".length + 1 + 4 + 16;
  // lineOrder
  headerSize += "lineOrder".length + 1 + "lineOrder".length + 1 + 4 + 1;
  // pixelAspectRatio
  headerSize += "pixelAspectRatio".length + 1 + "float".length + 1 + 4 + 4;
  // screenWindowCenter
  headerSize += "screenWindowCenter".length + 1 + "v2f".length + 1 + 4 + 8;
  // screenWindowWidth
  headerSize += "screenWindowWidth".length + 1 + "float".length + 1 + 4 + 4;

  // Custom metadata float attributes
  for (const [key] of metaEntries) {
    headerSize += key.length + 1 + "float".length + 1 + 4 + 4;
  }

  headerSize += 1; // end-of-header null byte

  const offsetTableSize = height * 8;
  const pixelDataPerLine = 4 + 4 + width * 4 * 4;
  const totalPixelData = height * pixelDataPerLine;
  const totalSize = headerSize + offsetTableSize + totalPixelData;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let off = 0;

  // ── Magic & version ───────────────────────────────────────
  view.setInt32(off, MAGIC, true); off += 4;
  view.setInt32(off, VERSION, true); off += 4;

  // ── channels ──────────────────────────────────────────────
  off = writeAttrHeader(view, off, "channels", "chlist", chlistSize);
  for (const ch of channels) {
    off = writeString(view, off, ch.name);
    view.setInt32(off, FLOAT, true); off += 4;
    view.setUint8(off, 0); off += 1;
    off += 3;
    view.setInt32(off, 1, true); off += 4;
    view.setInt32(off, 1, true); off += 4;
  }
  view.setUint8(off, 0); off += 1;

  // ── compression ───────────────────────────────────────────
  off = writeAttrHeader(view, off, "compression", "compression", 1);
  view.setUint8(off, NO_COMPRESSION); off += 1;

  // ── dataWindow ────────────────────────────────────────────
  off = writeAttrHeader(view, off, "dataWindow", "box2i", 16);
  view.setInt32(off, 0, true); off += 4;
  view.setInt32(off, 0, true); off += 4;
  view.setInt32(off, width - 1, true); off += 4;
  view.setInt32(off, height - 1, true); off += 4;

  // ── displayWindow ─────────────────────────────────────────
  off = writeAttrHeader(view, off, "displayWindow", "box2i", 16);
  view.setInt32(off, 0, true); off += 4;
  view.setInt32(off, 0, true); off += 4;
  view.setInt32(off, width - 1, true); off += 4;
  view.setInt32(off, height - 1, true); off += 4;

  // ── lineOrder ─────────────────────────────────────────────
  off = writeAttrHeader(view, off, "lineOrder", "lineOrder", 1);
  view.setUint8(off, 0); off += 1;

  // ── pixelAspectRatio ──────────────────────────────────────
  off = writeAttrHeader(view, off, "pixelAspectRatio", "float", 4);
  view.setFloat32(off, 1.0, true); off += 4;

  // ── screenWindowCenter ────────────────────────────────────
  off = writeAttrHeader(view, off, "screenWindowCenter", "v2f", 8);
  view.setFloat32(off, 0.0, true); off += 4;
  view.setFloat32(off, 0.0, true); off += 4;

  // ── screenWindowWidth ─────────────────────────────────────
  off = writeAttrHeader(view, off, "screenWindowWidth", "float", 4);
  view.setFloat32(off, 1.0, true); off += 4;

  // ── Custom metadata ───────────────────────────────────────
  for (const [key, value] of metaEntries) {
    off = writeAttrHeader(view, off, key, "float", 4);
    view.setFloat32(off, value, true); off += 4;
  }

  // ── End of header ─────────────────────────────────────────
  view.setUint8(off, 0); off += 1;

  // ── Offset table ──────────────────────────────────────────
  const pixelDataStart = off + offsetTableSize;

  for (let y = 0; y < height; y++) {
    const scanlineOffset = pixelDataStart + y * pixelDataPerLine;
    view.setUint32(off, scanlineOffset & 0xffffffff, true); off += 4;
    view.setUint32(off, 0, true); off += 4;
  }

  // ── Pixel data (scanlines) ────────────────────────────────
  const scanlineDataSize = width * 4 * 4;

  for (let y = 0; y < height; y++) {
    view.setInt32(off, y, true); off += 4;
    view.setInt32(off, scanlineDataSize, true); off += 4;

    for (const ch of channels) {
      for (let x = 0; x < width; x++) {
        view.setFloat32(off, ch.data[y * width + x], true);
        off += 4;
      }
    }
  }

  return buffer;
}

export interface ExportOptions {
  positions: Float32Array;
  scales: Float32Array;
  count: number;
  filename: string;
  cameraPosition?: [number, number, number];
  cameraRotation?: [number, number, number];
  cameraFov?: number;
  modelRotation?: [number, number, number];
}

/**
 * Pack positions + scales + camera metadata into an EXR file and trigger download.
 */
export function exportAsEXR(opts: ExportOptions) {
  const { positions, scales, count, filename, cameraPosition, cameraRotation, cameraFov, modelRotation } = opts;
  const side = Math.ceil(Math.sqrt(count));
  const totalPixels = side * side;

  const r = new Float32Array(totalPixels);
  const g = new Float32Array(totalPixels);
  const b = new Float32Array(totalPixels);
  const a = new Float32Array(totalPixels);

  for (let i = 0; i < count; i++) {
    r[i] = positions[i * 3];
    g[i] = positions[i * 3 + 1];
    b[i] = positions[i * 3 + 2];
    a[i] = scales[i];
  }

  const metadata: EXRMetadata = {
    positionCount: count,
  };
  if (cameraPosition) {
    metadata.cameraX = cameraPosition[0];
    metadata.cameraY = cameraPosition[1];
    metadata.cameraZ = cameraPosition[2];
  }
  if (cameraRotation) {
    metadata.cameraRotationX = cameraRotation[0];
    metadata.cameraRotationY = cameraRotation[1];
    metadata.cameraRotationZ = cameraRotation[2];
  }
  if (cameraFov !== undefined) {
    metadata.cameraFov = cameraFov;
  }
  if (modelRotation) {
    metadata.modelRotationX = modelRotation[0];
    metadata.modelRotationY = modelRotation[1];
    metadata.modelRotationZ = modelRotation[2];
  }

  const exrBuffer = encodeEXR(side, side, r, g, b, a, metadata);

  // Download EXR
  const exrBlob = new Blob([exrBuffer], { type: "application/octet-stream" });
  const exrUrl = URL.createObjectURL(exrBlob);
  const anchor = document.createElement("a");
  anchor.href = exrUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(exrUrl);

  // Download companion JSON with metadata (camera, count, etc.)
  const jsonFilename = filename.replace(/\.exr$/, ".json");
  const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: "application/json",
  });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const jsonAnchor = document.createElement("a");
  jsonAnchor.href = jsonUrl;
  jsonAnchor.download = jsonFilename;
  jsonAnchor.click();
  URL.revokeObjectURL(jsonUrl);
}
