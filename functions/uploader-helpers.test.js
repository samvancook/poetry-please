import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalImportManifestJson,
  contentIdSlug,
  deterministicGraphicStoragePath,
  detectRemoteMediaMimeType,
  importGraphicMetadataKey,
  inferRemoteMimeType,
  normalizeStorageObjectName,
  preserveExistingImportValues,
} from "./uploader-helpers.js";

const graphicRules = {
  allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
};

test("contentIdSlug preserves long canonical title text beyond the old 80-character limit", () => {
  const title = "Margot Robbie Greta Gerwig Are Not Nominated For An Oscar For Barbie America Ferrera Is The First Honduran Actress In History Nominated For An Oscar For Barbie";
  const slug = contentIdSlug(title);
  assert.ok(slug.length > 80);
  assert.equal(slug.endsWith("for-barbie"), true);
});

test("the Gigi Bella long-title control produces the existing live canonical ID", () => {
  const title = "margot robbie & greta gerwig are not nominated for an oscar for barbie/ america ferrera is the first honduran actress in history nominated for an oscar for barbie";
  const generatedId = `WTF-QI-${contentIdSlug(title)}`.toUpperCase();
  assert.equal(
    generatedId,
    "WTF-QI-MARGOT-ROBBIE-GRETA-GERWIG-ARE-NOT-NOMINATED-FOR-AN-OSCAR-FOR-BARBIE-AMERICA-FERRERA-IS-THE-FIRST-HONDURAN-ACTRESS-IN-HISTORY-NOMINATED-FOR-AN-OSCAR-FOR-BARBIE"
  );
});

test("byte sniffing recognizes PNG served as application/octet-stream", () => {
  const pngPrefix = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectRemoteMediaMimeType(pngPrefix), "image/png");
  assert.equal(
    inferRemoteMimeType("application/octet-stream", "graphic-without-extension", "", graphicRules),
    ""
  );
});

test("byte sniffing recognizes common hosted video containers", () => {
  const mp4Prefix = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const webmPrefix = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
  assert.equal(detectRemoteMediaMimeType(mp4Prefix), "video/mp4");
  assert.equal(detectRemoteMediaMimeType(webmPrefix), "video/webm");
});

test("duplicate metadata matching normalizes punctuation, spacing, and case", () => {
  const incoming = importGraphicMetadataKey({
    author: "Gigi Bella",
    book: "Somewhere Between Shadow & Mourning",
    title: "For Whitney",
    imageType: "QI",
  });
  const existing = importGraphicMetadataKey({
    author: "  GIGI BELLA ",
    book: "Somewhere Between Shadow and Mourning",
    title: "For Whitney!",
    imageType: "qi",
  });
  assert.notEqual(incoming, existing);
  assert.equal(
    importGraphicMetadataKey({
      author: "  GIGI BELLA ",
      book: "Somewhere Between Shadow & Mourning",
      title: "For Whitney!",
      imageType: "qi",
    }),
    incoming
  );
});

test("storage object normalization preserves the proven Apps Script filename rules", () => {
  assert.equal(
    normalizeStorageObjectName("SCHMINKEY - DBAT - QUOTE IMAGE – A good cry canary", "image/png"),
    "SCHMINKEY-DBAT-QUOTE-IMAGE-A-good-cry-canary.png"
  );
  assert.equal(normalizeStorageObjectName("already-safe.JPG", "image/jpeg"), "already-safe.JPG");
});

test("graphic storage paths are stable across retries", () => {
  const input = {
    docId: "DBAT-QI-A-GOOD-CRY-CANARY",
    fileName: "SCHMINKEY - DBAT - QUOTE IMAGE - A good cry canary.png",
    mimeType: "image/png",
  };
  assert.equal(
    deterministicGraphicStoragePath(input),
    "content-library/graphics/dbat-qi-a-good-cry-canary/SCHMINKEY-DBAT-QUOTE-IMAGE-A-good-cry-canary.png"
  );
  assert.equal(deterministicGraphicStoragePath(input), deterministicGraphicStoragePath(input));
});

test("manifest canonicalization ignores object key order but preserves item order", () => {
  const first = canonicalImportManifestJson("graphics", [{ imageId: "A", driveLink: "drive-1" }]);
  const reordered = canonicalImportManifestJson("graphics", [{ driveLink: "drive-1", imageId: "A" }]);
  const differentOrder = canonicalImportManifestJson("graphics", [
    { imageId: "B", driveLink: "drive-2" },
    { imageId: "A", driveLink: "drive-1" },
  ]);
  assert.equal(first, reordered);
  assert.notEqual(first, differentOrder);
});

test("import updates preserve enriched values when incoming cells are blank", () => {
  const merged = preserveExistingImportValues({
    releaseCatalog: "2026 Spring Catalog",
    book: "A Good Cry",
    misc: "old note",
  }, {
    releaseCatalog: "",
    book: "A Good Cry",
    misc: "",
    title: "Canary",
  });
  assert.deepEqual(merged, {
    book: "A Good Cry",
    title: "Canary",
  });
});

test("import updates only clear existing values when explicitly requested", () => {
  assert.deepEqual(
    preserveExistingImportValues({ releaseCatalog: "2026 Spring Catalog" }, { releaseCatalog: "" }, ["releaseCatalog"]),
    { releaseCatalog: "" }
  );
});
