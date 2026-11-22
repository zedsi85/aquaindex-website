#!/usr/bin/env bash
# Deploy the site (public/) and the price API (api/) to Azure Static Web Apps.
#
#   az login --tenant aqua-index.com      # complete the MFA prompt
#   ./scripts/deploy-azure.sh
#
# First-time setup of the Azure resources: scripts/provision-azure.sh
#
# Needs: Azure CLI, Node.js 22+.
set -euo pipefail

SUBSCRIPTION="${AZURE_SUBSCRIPTION:-Aquaindex Subscription}"   # name or id
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-aquaindex-website}"
APP_NAME="${AZURE_SWA_NAME:-swa-aquaindex-website}"

cd "$(dirname "$0")/.."

echo "Installing API dependencies..."
(cd api && npm ci --omit=dev --no-audit --no-fund)

echo "Fetching the deployment token for ${APP_NAME}..."
TOKEN="$(az staticwebapp secrets list --subscription "$SUBSCRIPTION" -g "$RESOURCE_GROUP" -n "$APP_NAME" --query properties.apiKey -o tsv)"

npx --yes @azure/static-web-apps-cli deploy ./public \
  --api-location ./api --api-language node --api-version 22 \
  --deployment-token "$TOKEN" --env production
