#!/usr/bin/env bash
set -euo pipefail

: "${DJANGO_API_URL:?Set DJANGO_API_URL to the deployed Django service URL.}"
if [[ ! "$DJANGO_API_URL" =~ ^https://[[:alnum:].-]+(:[0-9]+)?$ ]]; then
  echo "DJANGO_API_URL must be an HTTPS origin without a path."
  exit 1
fi

api_url="${DJANGO_API_URL%/}"
mkdir -p netlify-dist/js
cp index.html employee.html style.css app.js netlify-dist/
cp js/*.js netlify-dist/js/
printf 'window.PD_CONFIG = { API_BASE_URL: "%s" };\n' "$api_url" > netlify-dist/js/config.js
