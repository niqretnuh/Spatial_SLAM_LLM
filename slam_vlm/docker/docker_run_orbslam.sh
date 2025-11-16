#!/usr/bin/env bash
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

SCENE_NAME="$1"
if [ -z "$SCENE_NAME" ]; then
  echo "Usage: $0 SCENE_NAME"
  exit 1
fi

echo "Using REPO_ROOT = $REPO_ROOT"
echo "Scene          = $SCENE_NAME"

sudo docker run -it --rm \
  --name "orbslam_${SCENE_NAME}" \
  -v "$REPO_ROOT/data:/dockerMount/data" \
  -v "$REPO_ROOT/scripts:/dockerMount/scripts" \
  -v "$REPO_ROOT/docker:/dockerMount/docker" \
  -v "$REPO_ROOT/config:/dockerMount/config" \
  orbpy /bin/bash
