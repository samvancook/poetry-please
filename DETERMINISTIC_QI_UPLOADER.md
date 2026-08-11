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

The Poetry Please Import Assistant accepts pasted Sheet rows, previews the deterministic IDs and paths, imports valid create/update rows, displays per-row results, and exposes **Retry failed rows**. When called through Firebase Hosting, it processes one item per request so a slow Drive file cannot exceed the gateway's 60-second request deadline. The durable job still contains the whole prepared tranche, and completed rows are never replayed.

Before a production tranche, use the read-only **Drive access diagnostic** with one source file. It must identify the production service account and return successful metadata and authenticated media reads. This catches Drive permission or deployment drift before any Storage or Firestore write.

## Spreadsheet role

The old Apps Script remains useful as a row-selection and manifest-preparation model. It should no longer hold a production service-account key or write directly to Firestore. A future thin Sheet client may submit selected rows to this same job API, but it must not implement a second Storage or Firestore engine.

## Production rollout

1. Deploy the function and admin UI together.
2. Preview one already-complete QI and confirm action `update` with no write.
3. Import one new canary QI.
4. Verify the job result, Storage object, Firestore document, public `contentById`, and cache refresh.
5. Re-run the exact manifest and confirm the same batch and object are reused.
6. Only then proceed with larger prepared selections.

## Verified production canary — 2026-08-10

- Content ID: `ASAB-QI-GHAZAL-FOR-MY-GRANDMOTHER`
- Source Drive file ID: `1rcv3dW39yEtb3ZNnv7eXCkSPbK80rFQi`
- Deterministic Storage path: `content-library/graphics/asab-qi-ghazal-for-my-grandmother/ASAB-QI-GHAZAL-FOR-MY-GRANDMOTHER.png`
- Batch ID: `batch-bea6c5f0a7dc070f9a2f6120`
- Verified the public PNG response (`image/png`, 123,394 bytes), Storage provenance metadata, Firestore fields, public `contentById` response, and QI Library audit row.
- Re-submitting the identical manifest returned the same batch ID and existing object; it did not create a second job, Firestore identity, or Storage asset.

The canary also established three required production safeguards: preview reads authenticated Drive MIME metadata for extensionless filenames, preview matching preserves that MIME through collision assignment, and public-content cache reads compare a durable snapshot generation so Cloud Run instances cannot retain an obsolete in-memory snapshot after an import.

## Verified yearly rollout — 2026-08-10

- 2014: 8 of 8 ready QI rows are public, metadata-verified, image-verified, and recorded in the QI Library.
- 2015: 25 of 25 ready QI rows are public, metadata-verified, image-verified, and recorded in the QI Library.
- 2016: 111 of 111 ready QI rows are public, metadata-verified, image-verified, and recorded in the QI Library. This includes 107 rows processed in measured batches plus four earlier rows re-verified during closeout.
- 2017: 239 of 239 ready QI rows are public, metadata-verified, image-verified, and recorded in the QI Library. The remaining 371 source-year rows stay deferred because they still require poem matching.
- 2018: 187 of 187 ready QI rows are public, metadata-verified, image-verified, and recorded in the QI Library. The remaining 104 source-year rows stay deferred because they still require poem matching or other enrichment. The final seven Claire Schwartz rows were written by batch `batch-1c38739185faf647c0cf85f8` after the authenticated Drive diagnostic verified the production service identity and source media access.

Production behavior confirmed during the 2016–2017 rollout:

- Source Drive identity wins before metadata matching, so distinct QIs for the same poem do not overwrite one another.
- Confirmed same-poem variants use explicit, collision-checked canonical `-V2`, `-V3`, and later IDs when needed.
- Variant allocation reads the complete Firestore document-ID family for every proposed base ID before assigning a suffix, including variants created in earlier batches.
- Public content retains `bookShortener` through its Firestore projection so same-title editions, such as `HELI` (2017) and `HLE` (2021), resolve to the correct catalog. Projection changes bump the durable content-snapshot version so stale snapshots cannot preserve the old mapping.
- Known-broken IDs force a fresh Storage upload; the exact ID is removed from the broken-content manifest only after the job reports a new Storage path and the public image is verified.
- A public `contentById` cache miss performs one exact Firestore document lookup before returning 404. It does not rebuild the full content snapshot for an unknown ID, and newly imported canonical IDs resolve immediately across Cloud Run instances.
- A year is complete only after the QI Library records the public image URL, `cloud_upload_verified`, canonical content ID, `firestore_verified_public`, verification timestamp, and batch note for every ready row.
- Malformed smart quotes in pasted Sheet text can collapse several tab-separated rows into one parse result. Correct the source cell, reread it, and re-preview; do not edit around the parse failure inside the importer.
- When a legacy poem-title family already contains ambiguous IDs, preview explicit candidate variants and import only the first collision-free ID. The 2018 `CAMARO` row was safely created as `DT-QI-CAMARO-V6`; existing `V2` and `V4` records were not overwritten.

Next recommended year tranches are 2019 (306 ready rows), 2020 (231), 2021 (603), 2022 (575), 2023 (318), 2024 (268), 2025 (402), and 2026 (126). Within a year, use 25-row upload jobs and finish public/API/image/library verification before starting the next job.
