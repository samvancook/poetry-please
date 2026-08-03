# GitHub and deployment workflow

GitHub is the canonical source for the Poetry Please application. Do not copy individual files into Cloud Shell as a normal workflow.

## First-time setup

Clone the repository locally or in Cloud Shell:

```bash
git clone git@github.com:samvancook/poetry-please.git
cd poetry-please
```

Authenticate GitHub using either SSH or the GitHub CLI. The repository owner should complete that login step; no token belongs in this project.

## Normal change flow

```bash
git switch -c change-description
git pull --ff-only origin main
# make and test changes
git add .
git commit -m "Describe the change"
git push -u origin HEAD
```

## Deploy from a checked-out commit

After Firebase CLI authentication:

```bash
./scripts/deploy.sh
```

The script runs the uploader tests, deploys the API and Hosting together, and checks `/api/healthz`.

## Important separation

This is the code deployment workflow. Content ingestion should use the deterministic import-job API and manifest workflow; it should not require GitHub access or an AI assistant.
