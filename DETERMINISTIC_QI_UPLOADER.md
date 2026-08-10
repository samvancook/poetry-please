# Deterministic QI uploader

## Purpose

One upload engine must serve a human, a spreadsheet, a CLI, or an AI assistant. AI may prepare rows, but Poetry Please performs every production write.

## Canonical workflow

1. Prepare rows containing a unique QI/content ID, source Drive file, filename, and metadata.
2. Preview in Poetry Please. Preview performs no Storage or Firestore writes and returns the exact content ID, Drive file ID, action, idempotency key, and predicted Storage path.
3. Confirm the valid `create` and `update` rows.
4. Poetry Please creates a durable import job whose default batch ID is the manifest hash.
5. The worker fetches the Drive file, reuses or writes the deterministic Storage object, merges Firestore metadata, records provenance, and invalidates Poetry Please caches.
6. Each row ends as `complete`, `failed`, `duplicate`, or `review`. Failed rows can be retried without rerunning completed rows.

## Required graphic fields

```json
{
  "docId": "BOOK-QI-UNIQUE-POEM-ID",
  "imageId": "BOOK-QI-UNIQUE-POEM-ID",
  "imageType": "QI",
  "author": "Author Name",
  "title": "Poem title",
  "book": "Book title",
  "driveLink": "https://drive.google.com/file/d/DRIVE_FILE_ID/view",
  "fileName": "Original source filename.png",
  "bookLink": "https://buttonpoetry.com/product/example/",
  "releaseCatalog": "Spring 2026",
  "bookShortener": "BOOK"
}
```

The server adds or verifies `sourceDriveFileId`, `sourceSystem`, `sourceRecordId`, and `idempotencyKey`.

## Deterministic identities

- Content identity: the supplied unique `docId`/`imageId`; Poetry Please never invents a replacement for a confirmed QI ID during execution.
- Item idempotency: `graphics:<Drive file ID>:<content ID>`.
- Batch idempotency: SHA-256 of the canonical manifest, exposed as the job's `manifestHash`; the default batch ID is derived from it.
- Storage path: `content-library/graphics/<normalized content ID>/<normalized content ID>.<detected extension>`.
- Asset audit identity: hash of content ID plus Storage path.

The filename normalization matches the proven Apps Script behavior: whitespace becomes hyphens, unsafe punctuation becomes hyphens, repeated hyphens collapse, and a MIME-derived extension is added when needed.

## Retry guarantees

- Re-submitting the identical manifest returns the same job.
- Reusing a caller-supplied batch ID for different content returns `import_batch_id_conflict`.
- A retry reuses the same Storage object when its recorded Drive/content identity matches.
- A conflicting object at the same path returns `storage_identity_conflict`; an object without identity metadata returns `storage_identity_unverifiable`. Neither is overwritten silently.
- Firestore uses merge semantics and preserves the original `createdAt`.
- Blank import cells preserve existing enriched Firestore values. Intentional clearing requires the field name in `clearFields`.
- Each upload stage has an aborting timeout. The job does not use a whole-item `Promise.race` that can report failure while a write continues.
- Processing leases older than ten minutes are returned to `pending` and can be retried safely.
- A job does not report publication success until the durable Poetry Please content snapshot has been invalidated. Publication failure is recorded separately and can be retried without re-uploading completed rows.

## Human surface

The Poetry Please Import Assistant accepts pasted Sheet rows, previews the deterministic IDs and paths, imports valid create/update rows, displays per-row results, and exposes **Retry failed rows**. It processes two items per request so a slow Drive file cannot exceed the browser request deadline.

## Spreadsheet role

The old Apps Script remains useful as a row-selection and manifest-preparation model. It should no longer hold a production service-account key or write directly to Firestore. A future thin Sheet client may submit selected rows to this same job API, but it must not implement a second Storage or Firestore engine.

## Production rollout

1. Deploy the function and admin UI together.
2. Preview one already-complete QI and confirm action `update` with no write.
3. Import one new canary QI.
4. Verify the job result, Storage object, Firestore document, public `contentById`, and cache refresh.
5. Re-run the exact manifest and confirm the same batch and object are reused.
6. Only then proceed with larger prepared selections.
