#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-poetry-please}"

NODE_BIN="${NODE_BIN:-/Users/buttonadmin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="node"
fi

echo "Running uploader tests..."
"$NODE_BIN" --test functions/uploader-helpers.test.js

echo "Deploying Poetry Please to ${PROJECT_ID}..."
firebase use "$PROJECT_ID"
firebase deploy --only functions:api,hosting

echo "Checking deployed API..."
curl -fsS "https://poetry-please.web.app/api/healthz" >/dev/null
echo "Deployment verified."
