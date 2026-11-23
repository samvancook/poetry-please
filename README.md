# Archived: this is not the live Poetry Please code

This repository is an early copy of Poetry Please (October 2025 to January 2026). It was archived on 23 November 2026.

**The live code is [samvancook/poetryplease-org](https://github.com/samvancook/poetryplease-org).** Make every change there. Its `AGENTS.md` and [`docs/OWNERSHIP.md`](https://github.com/samvancook/poetryplease-org/blob/main/docs/OWNERSHIP.md) say how production deploys and who owns each part.

What happened to the work here:

- `main`: superseded by poetryplease-org.
- `fix/pp-20260729-001-qi-uploader` (August 2026): the QI uploader and import jobs were ported to poetryplease-org (`functions/import-jobs.js`, `functions/uploader-helpers.js`).
- `feat/tiktok-auth-callback` (PR #6, closed 8 Oct 2026): the TikTok sign-in callback moved to its own site, `button-poetry-tiktok-auth.web.app`, deployed from the social scheduler's repo.

The old deploy workflow (`.github/workflows/firebase.yml`) was removed before archiving. It deployed this January code to the production Firebase project on any push to `main`.
