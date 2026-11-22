#!/usr/bin/env bash
# One-time setup of the AquaIndex website on Azure, then a first deploy.
# Creates (or reuses) a resource group, a storage account for the price
# data, a Free-plan Static Web App and an email service for the contact
# form, wires them together and deploys. A brand-new storage account is
# seeded with the AQUGSPOT history from public/data/aquaindex-global.csv.
#
#   az login --tenant aqua-index.com      # complete the MFA prompt
#   ./scripts/provision-azure.sh
#
# Safe to re-run: existing resources are reused. Needs Azure CLI, Node.js 22+.
set -euo pipefail

SUBSCRIPTION="${AZURE_SUBSCRIPTION:-Aquaindex Subscription}"   # name or id
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-aquaindex-website}"
APP_NAME="${AZURE_SWA_NAME:-swa-aquaindex-website}"
STORAGE_NAME="${AZURE_STORAGE_NAME:-staquaindexsite}"
EMAIL_SERVICE="${AZURE_EMAIL_SERVICE:-acs-email-aquaindex-website}"
COMMS_NAME="${AZURE_COMMS_NAME:-acs-aquaindex-website}"
CONTACT_TO="${CONTACT_TO:-info@aqua-index.com}"
# Static Web Apps exists in these regions only. Some subscriptions cannot
# create resources in every region, so each is tried in turn.
REGIONS="${AZURE_REGIONS:-westeurope eastus2 centralus westus2 eastasia}"
TAGS="project=aquaindex-website managed-by=issatrix"

cd "$(dirname "$0")/.."
az() { command az "$@" --subscription "$SUBSCRIPTION"; }

# --- Static Web App (decides the region) -----------------------------------
REGION="$(az staticwebapp list --query "[?name=='${APP_NAME}' && resourceGroup=='${RESOURCE_GROUP}'].location | [0]" -o tsv | tr -d ' ' | tr '[:upper:]' '[:lower:]')"
if [ -n "$REGION" ]; then
  echo "Static Web App ${APP_NAME} already exists (${REGION})."
else
  for candidate in $REGIONS; do
    echo "Trying region ${candidate}..."
    if [ "$(az group exists -n "$RESOURCE_GROUP")" != "true" ]; then
      az group create -n "$RESOURCE_GROUP" -l "$candidate" --tags $TAGS -o none || continue
    fi
    if az staticwebapp create -g "$RESOURCE_GROUP" -n "$APP_NAME" -l "$candidate" --sku Free --tags $TAGS -o none; then
      REGION="$candidate"
      break
    fi
  done
  [ -n "$REGION" ] || { echo "Could not create the Static Web App in any of: ${REGIONS}" >&2; exit 1; }
fi

# --- Storage account (same region as the API when possible) ----------------
NEW_STORAGE=""
if az storage account show -g "$RESOURCE_GROUP" -n "$STORAGE_NAME" -o none 2>/dev/null; then
  echo "Storage account ${STORAGE_NAME} already exists."
else
  created=""
  for candidate in "$REGION" $REGIONS; do
    if az storage account create -g "$RESOURCE_GROUP" -n "$STORAGE_NAME" -l "$candidate" \
         --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 \
         --allow-blob-public-access false --https-only true --tags $TAGS -o none; then
      created="$candidate"
      break
    fi
  done
  [ -n "$created" ] || { echo "Could not create the storage account in any region." >&2; exit 1; }
  echo "Storage account ${STORAGE_NAME} created (${created})."
  NEW_STORAGE="yes"
fi

# --- Email for the contact form (Azure Communication Services) -------------
# Uses an Azure-managed sender domain (DoNotReply@<id>.azurecomm.net). To send
# from an aqua-index.com address instead, add a custom domain to the email
# service in the portal, verify it in DNS, link it, and update CONTACT_FROM.
command az extension add --name communication --only-show-errors 2>/dev/null || true
if ! az communication email show -g "$RESOURCE_GROUP" -n "$EMAIL_SERVICE" -o none 2>/dev/null; then
  az communication email create -g "$RESOURCE_GROUP" -n "$EMAIL_SERVICE" --location global \
    --data-location "United States" --tags $TAGS -o none
fi
if ! az communication email domain show -g "$RESOURCE_GROUP" --email-service-name "$EMAIL_SERVICE" -n AzureManagedDomain -o none 2>/dev/null; then
  az communication email domain create -g "$RESOURCE_GROUP" --email-service-name "$EMAIL_SERVICE" -n AzureManagedDomain \
    --location global --domain-management AzureManaged -o none
fi
DOMAIN_ID="$(az communication email domain show -g "$RESOURCE_GROUP" --email-service-name "$EMAIL_SERVICE" -n AzureManagedDomain --query id -o tsv)"
SENDER_DOMAIN="$(az communication email domain show -g "$RESOURCE_GROUP" --email-service-name "$EMAIL_SERVICE" -n AzureManagedDomain --query mailFromSenderDomain -o tsv)"
if ! az communication show -g "$RESOURCE_GROUP" -n "$COMMS_NAME" -o none 2>/dev/null; then
  az communication create -g "$RESOURCE_GROUP" -n "$COMMS_NAME" --location global \
    --data-location "United States" --linked-domains "$DOMAIN_ID" --tags $TAGS -o none
fi
ACS_CONN="$(az communication list-key -g "$RESOURCE_GROUP" -n "$COMMS_NAME" --query primaryConnectionString -o tsv)"
echo "Email service ready (sender DoNotReply@${SENDER_DOMAIN})."

# --- Wire together, seed, deploy -------------------------------------------
CONN="$(az storage account show-connection-string -g "$RESOURCE_GROUP" -n "$STORAGE_NAME" --query connectionString -o tsv)"
az staticwebapp appsettings set -g "$RESOURCE_GROUP" -n "$APP_NAME" --setting-names \
  "TABLES_CONNECTION_STRING=${CONN}" \
  "ACS_CONNECTION_STRING=${ACS_CONN}" \
  "CONTACT_FROM=DoNotReply@${SENDER_DOMAIN}" \
  "CONTACT_TO=${CONTACT_TO}" -o none
echo "App settings set (contact form emails go to ${CONTACT_TO})."

if [ -n "$NEW_STORAGE" ]; then
  # Only a brand-new store is seeded — never overwrite prices an admin has uploaded.
  (cd api && npm ci --omit=dev --no-audit --no-fund)
  (cd api && TABLES_CONNECTION_STRING="$CONN" node scripts/seed.js)
fi

AZURE_SUBSCRIPTION="$SUBSCRIPTION" AZURE_RESOURCE_GROUP="$RESOURCE_GROUP" AZURE_SWA_NAME="$APP_NAME" \
  ./scripts/deploy-azure.sh

HOST="$(az staticwebapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query defaultHostname -o tsv)"
echo
echo "Site:  https://${HOST}"
echo "Admin: https://${HOST}/admin/"
