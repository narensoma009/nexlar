#!/usr/bin/env bash
# First-time setup: clone repo, build frontend, package, deploy.
# Run inside Azure Cloud Shell (Bash). Re-runnable — wipes any existing clone.
set -euo pipefail

cd "$(dirname "$0")"
source ./vars.sh

echo "==> Cloning $REPO_URL -> $REPO_DIR"
rm -rf "$REPO_DIR"
git clone "$REPO_URL" "$REPO_DIR"

"$REPO_DIR/scripts/deploy.sh"
