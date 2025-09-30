set -euo pipefail

IMAGE_NAME="curve-fitter-ui:latest"

docker build -t "${IMAGE_NAME}" .

docker run --rm \
  -p 8080:80 \
  -e STREAM_URL="${STREAM_URL:-http://localhost:8000/curves/stream}" \
  -e APP_ENV="${APP_ENV:-prd}" \
  "${IMAGE_NAME}"
