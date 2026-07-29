function normalizeText(value) {
  return String(value || "").trim();
}

function extensionForRemoteMedia(fileName = "", sourceUrl = "") {
  const raw = normalizeText(fileName || sourceUrl).split(/[?#]/, 1)[0];
  const match = raw.match(/\.([a-z0-9]+)$/i);
  return (match?.[1] || "").toLowerCase();
}

export function contentIdSlug(value) {
  return normalizeText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 500);
}

export function normalizeImportMatchValue(value) {
  return normalizeText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function importGraphicMetadataKey(item = {}) {
  const author = normalizeImportMatchValue(item.author);
  const book = normalizeImportMatchValue(item.book);
  const title = normalizeImportMatchValue(item.title || item.poem);
  const imageType = normalizeImportMatchValue(item.imageType || "QI");
  return author && book && title ? `${author}|${book}|${title}|${imageType}` : "";
}

export function inferRemoteMimeType(contentType = "", fileName = "", sourceUrl = "", rules = null) {
  const rawType = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (rules?.allowedMimeTypes?.has(rawType)) return rawType;
  const extensionMimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    qt: "video/quicktime",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
  };
  const inferred = extensionMimeTypes[extensionForRemoteMedia(fileName, sourceUrl)] || "";
  return rules?.allowedMimeTypes?.has(inferred) ? inferred : "";
}

export function detectImageMimeType(buffer) {
  if (!buffer || !buffer.length) return "";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }
  return "";
}

export function detectRemoteMediaMimeType(buffer) {
  const imageMimeType = detectImageMimeType(buffer);
  if (imageMimeType) return imageMimeType;
  if (!buffer || !buffer.length) return "";
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.subarray(8, 12).toString("ascii");
    return brand === "qt  " ? "video/quicktime" : "video/mp4";
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "video/webm";
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return "video/ogg";
  }
  return "";
}
