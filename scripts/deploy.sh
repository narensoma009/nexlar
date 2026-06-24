#!/usr/bin/env bash
# Pull latest, build frontend, package, deploy.
# Run inside Azure Cloud Shell (Bash). Idempotent.
set -euo pipefail

cd "$(dirname "$0")"
source ./vars.sh

cd "$REPO_DIR"

echo "==> git pull"
git pull --ff-only

echo "==> Building frontend"
pushd frontend >/dev/null
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build
popd >/dev/null

echo "==> Folding frontend/dist -> backend/static"
rm -rf backend/static
cp -r frontend/dist backend/static

echo "==> Packaging backend"
ZIP_PATH="$REPO_DIR/deploy.zip"
rm -f "$ZIP_PATH"
pushd backend >/dev/null
zip -rq "$ZIP_PATH" .
popd >/dev/null

echo "==> Deploying to App Service: $WEB_APP"
az webapp deploy \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEB_APP" \
  --src-path "$ZIP_PATH" \
  --type zip

rm -f "$ZIP_PATH"

URL="https://${WEB_APP}.azurewebsites.net"
echo ""
echo "Deployed."
echo "  App:    $URL"
echo "  Health: $URL/api/health"
