#!/bin/sh
set -eu

STREAM_URL_DEFAULT="http://localhost:8000/curves/stream"
APP_ENV_DEFAULT="prd"

: "${STREAM_URL:=${STREAM_URL_DEFAULT}}"
: "${APP_ENV:=${APP_ENV_DEFAULT}}"

CONFIG_TEMPLATE_PATH="/usr/share/nginx/html/config.template.js"
CONFIG_TARGET_PATH="/usr/share/nginx/html/config.js"

if [ -f "${CONFIG_TEMPLATE_PATH}" ]; then
  envsubst '${STREAM_URL} ${APP_ENV}' < "${CONFIG_TEMPLATE_PATH}" > "${CONFIG_TARGET_PATH}"
else
  echo "warning: config template not found at ${CONFIG_TEMPLATE_PATH}" >&2
fi

exec "$@"
