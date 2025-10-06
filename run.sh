#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-docker}"
ZIP_NAME="${ZIP_NAME:-curve-fitter-ui-lambda.zip}"
STREAM_URL='https://2pzmybbrkdhzf75k6wz24dflua0hbiko.lambda-url.eu-west-2.on.aws/curves/stream'  
if [[ "${MODE}" == "lambda" ]]; then
  npm run build:lambda
  pushd lambda/build >/dev/null
  rm -f "../${ZIP_NAME}"
  if ! command -v zip >/dev/null 2>&1; then
    echo "zip utility not found. Install it or archive lambda/build manually." >&2
    exit 1
  fi
  zip -qr "../${ZIP_NAME}" .
  popd >/dev/null
  echo "Lambda package created at lambda/${ZIP_NAME}"
  exit 0
fi

IMAGE_NAME="curve-fitter-ui:latest"

docker build -t "${IMAGE_NAME}" .

docker run --rm \
  -p 8080:80 \
  -e STREAM_URL="${STREAM_URL:-http://localhost:8000/curves/stream}" \
  -e APP_ENV="${APP_ENV:-prd}" \
  "${IMAGE_NAME}"
