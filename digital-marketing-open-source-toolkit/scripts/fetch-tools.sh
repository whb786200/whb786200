#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESTINATION="${1:-$ROOT_DIR/tools}"

command -v git >/dev/null 2>&1 || {
  echo "git is required but was not found in PATH." >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required to read tools.json." >&2
  exit 1
}

mkdir -p "$DESTINATION"

python3 - "$ROOT_DIR/tools.json" <<'PY' | while IFS=$'\t' read -r slug name repo; do
import json
import sys
from pathlib import Path

manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
for tool in manifest:
    print(f"{tool['slug']}\t{tool['name']}\t{tool['repo']}")
PY
  target="$DESTINATION/$slug"
  if [ -d "$target/.git" ]; then
    echo "Updating $name -> $target"
    git -C "$target" pull --ff-only
    continue
  fi
  if [ -e "$target" ]; then
    echo "Skipping $name: target exists but is not a git repo: $target" >&2
    continue
  fi
  echo "Cloning $name -> $target"
  git clone --depth 1 "$repo" "$target"
done

echo "Done. Tools are in: $DESTINATION"

