# Nexlara — deploy to Azure App Service + Azure Postgres Flexible Server (with pgvector)
# Prereqs:  az login   AND   az account set --subscription "<your-sub>"
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\variables.ps1"

$repo     = Split-Path -Parent $PSScriptRoot
$backend  = Join-Path $repo "backend"
$frontend = Join-Path $repo "frontend"
$static   = Join-Path $backend "static"
$zip      = Join-Path $repo "nexlara-deploy.zip"

# ── 1. Postgres Flexible Server ───────────────────────────────────
Write-Host "==> Ensuring Postgres Flexible Server: $DB_SERVER (~5 min on first create)"
$pgExists = az postgres flexible-server show --resource-group $RESOURCE_GROUP --name $DB_SERVER 2>$null
if (-not $pgExists) {
  az postgres flexible-server create `
    --resource-group $RESOURCE_GROUP `
    --name $DB_SERVER `
    --location $LOCATION `
    --admin-user $DB_USER `
    --admin-password $DB_PASSWORD `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --version 16 `
    --storage-size 32 `
    --public-access 0.0.0.0 `
    --yes | Out-Null

  az postgres flexible-server db create `
    --resource-group $RESOURCE_GROUP `
    --server-name $DB_SERVER `
    --database-name $DB_NAME | Out-Null

  az postgres flexible-server firewall-rule create `
    --resource-group $RESOURCE_GROUP `
    --name $DB_SERVER `
    --rule-name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 | Out-Null
}

Write-Host "==> Allow-listing the vector extension on Postgres"
az postgres flexible-server parameter set `
  --resource-group $RESOURCE_GROUP `
  --server-name $DB_SERVER `
  --name azure.extensions `
  --value VECTOR | Out-Null

$DATABASE_URL = "postgresql+psycopg2://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

# ── 2. Build frontend, fold into backend/static ───────────────────
Write-Host "==> Building frontend"
Push-Location $frontend
if (-not (Test-Path "node_modules")) { npm install --no-fund --no-audit }
npm run build
Pop-Location

Write-Host "==> Copying frontend/dist -> backend/static"
if (Test-Path $static) { Remove-Item $static -Recurse -Force }
Copy-Item (Join-Path $frontend "dist") $static -Recurse

# ── 3. App Service ────────────────────────────────────────────────
Write-Host "==> Ensuring App Service plan: $APP_SERVICE_PLAN"
az appservice plan create `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --sku B1 --is-linux --location $LOCATION | Out-Null

Write-Host "==> Ensuring web app: $WEB_APP"
az webapp create `
  --name $WEB_APP `
  --resource-group $RESOURCE_GROUP `
  --plan $APP_SERVICE_PLAN `
  --runtime "PYTHON:3.11" | Out-Null

Write-Host "==> Setting startup command"
az webapp config set `
  --name $WEB_APP --resource-group $RESOURCE_GROUP `
  --startup-file "startup.sh" | Out-Null

Write-Host "==> Setting app settings"
az webapp config appsettings set `
  --name $WEB_APP --resource-group $RESOURCE_GROUP `
  --settings `
    AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" `
    AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" `
    AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" `
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="$AZURE_OPENAI_EMBEDDING_DEPLOYMENT" `
    AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" `
    EMBEDDING_DIM="$EMBEDDING_DIM" `
    DATABASE_URL="$DATABASE_URL" `
    SCM_DO_BUILD_DURING_DEPLOYMENT=true | Out-Null

# ── 4. Zip + deploy ───────────────────────────────────────────────
Write-Host "==> Packaging backend"
if (Test-Path $zip) { Remove-Item $zip -Force }
Push-Location $backend
Get-ChildItem -Recurse -Force -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Compress-Archive -Path * -DestinationPath $zip -Force
Pop-Location

Write-Host "==> Deploying zip"
az webapp deploy `
  --name $WEB_APP --resource-group $RESOURCE_GROUP `
  --src-path $zip --type zip

Remove-Item $zip -Force

Write-Host ""
Write-Host "Deployed: https://$WEB_APP.azurewebsites.net"
Write-Host "Health:   https://$WEB_APP.azurewebsites.net/api/health"
