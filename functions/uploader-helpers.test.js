import test from "node:test";
import assert from "node:assert/strict";
import {
  contentIdSlug,
  detectRemoteMediaMimeType,
  importGraphicMetadataKey,
  inferRemoteMimeType,
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
