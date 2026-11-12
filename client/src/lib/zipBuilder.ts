/**
 * Lightweight zero-dependency PKZIP (STORE method 0) archive builder & verifier.
 * Ideal for packaging JPEG/PNG/WebP/AVIF/SVG product photos cleanly in exact order
 * without browser multi-download throttling or lossy re-encoding.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  name: string;
  data: Uint8Array;
}

function getDosDateTime(date = new Date()): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

export function buildZipArchive(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const { dosTime, dosDate } = getDosDateTime();

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const crc = crc32(dataBytes);
    const size = dataBytes.length >>> 0;

    // Local File Header (30 bytes + filename)
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfhView = new DataView(lfh.buffer);
    lfhView.setUint32(0, 0x04034b50, true); // signature
    lfhView.setUint16(4, 20, true);         // version needed
    lfhView.setUint16(6, 0x0800, true);     // UTF-8 filename flag
    lfhView.setUint16(8, 0, true);          // compression: STORE (0)
    lfhView.setUint16(10, dosTime, true);
    lfhView.setUint16(12, dosDate, true);
    lfhView.setUint32(14, crc, true);
    lfhView.setUint32(18, size, true);      // compressed size
    lfhView.setUint32(22, size, true);      // uncompressed size
    lfhView.setUint16(26, nameBytes.length, true);
    lfhView.setUint16(28, 0, true);         // extra length
    lfh.set(nameBytes, 30);

    localParts.push(lfh, dataBytes);

    // Central Directory Header (46 bytes + filename)
    const cdh = new Uint8Array(46 + nameBytes.length);
    const cdhView = new DataView(cdh.buffer);
    cdhView.setUint32(0, 0x02014b50, true); // signature
    cdhView.setUint16(4, 20, true);         // version made by
    cdhView.setUint16(6, 20, true);         // version needed
    cdhView.setUint16(8, 0x0800, true);     // UTF-8 flag
    cdhView.setUint16(10, 0, true);         // STORE
    cdhView.setUint16(12, dosTime, true);
    cdhView.setUint16(14, dosDate, true);
    cdhView.setUint32(16, crc, true);
    cdhView.setUint32(20, size, true);
    cdhView.setUint32(24, size, true);
    cdhView.setUint16(28, nameBytes.length, true);
    cdhView.setUint16(30, 0, true);         // extra length
    cdhView.setUint16(32, 0, true);         // comment length
    cdhView.setUint16(34, 0, true);         // disk start
    cdhView.setUint16(36, 0, true);         // internal attrs
    cdhView.setUint32(38, 0, true);         // external attrs
    cdhView.setUint32(42, offset, true);    // local header offset
    cdh.set(nameBytes, 46);

    centralParts.push(cdh);
    offset += lfh.length + dataBytes.length;
  }

  let cdSize = 0;
  for (const part of centralParts) {
    cdSize += part.length;
  }

  // End of Central Directory (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  const totalSize = offset + cdSize + eocd.length;
  const output = new Uint8Array(totalSize);
  let cursor = 0;

  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);

  return output;
}

export function verifyZipArchive(zipBytes: Uint8Array): {
  valid: boolean;
  entryCount: number;
  names: string[];
  error?: string;
} {
  if (!zipBytes || zipBytes.length < 22) {
    return { valid: false, entryCount: 0, names: [], error: "ZIP buffer truncated (<22 bytes)." };
  }

  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const decoder = new TextDecoder("utf-8");

  // Find EOCD near end of buffer
  let eocdOffset = -1;
  const minSearch = Math.max(0, zipBytes.length - 65557);
  for (let i = zipBytes.length - 22; i >= minSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    return { valid: false, entryCount: 0, names: [], error: "Missing End of Central Directory record." };
  }

  const expectedCount = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  let pos = cdOffset;
  const names: string[] = [];

  for (let i = 0; i < expectedCount; i++) {
    if (pos + 46 > eocdOffset || view.getUint32(pos, true) !== 0x02014b50) {
      return { valid: false, entryCount: names.length, names, error: `Corrupted central directory entry at index ${i}.` };
    }
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const localOffset = view.getUint32(pos + 42, true);

    if (localOffset + 30 > cdOffset || view.getUint32(localOffset, true) !== 0x04034b50) {
      return { valid: false, entryCount: names.length, names, error: `Missing local header for entry ${i}.` };
    }
    if (uncompSize === 0) {
      return { valid: false, entryCount: names.length, names, error: `Empty 0-byte file detected at entry ${i}.` };
    }

    const name = decoder.decode(zipBytes.subarray(pos + 46, pos + 46 + nameLen));
    names.push(name);
    pos += 46 + nameLen + extraLen + commentLen;
  }

  return { valid: true, entryCount: names.length, names };
}

export function detectImageExtension(
  bytes: Uint8Array,
  contentType?: string,
  fallbackUrl?: string
): string {
  if (bytes && bytes.length >= 12) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return "webp";
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "gif";
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "avif";
    const headText = new TextDecoder("utf-8").decode(bytes.subarray(0, 64)).trim().toLowerCase();
    if (headText.startsWith("<svg") || headText.startsWith("<?xml")) return "svg";
  }

  const ct = (contentType || "").toLowerCase();
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/avif")) return "avif";
  if (ct.includes("image/gif")) return "gif";
  if (ct.includes("image/svg")) return "svg";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";

  if (fallbackUrl) {
    const extMatch = fallbackUrl.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?.*)?$/i);
    if (extMatch && extMatch[1]) {
      const e = extMatch[1].toLowerCase();
      return e === "jpeg" ? "jpg" : e;
    }
  }

  return "jpg";
}

