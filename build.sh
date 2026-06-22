#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# 1. entropy-calc WASM → pkg/entropy-calc/
(cd "$ROOT/entropy-calc" && wasm-pack build --target web)
rm -rf "$ROOT/pkg/entropy-calc"
mkdir -p "$ROOT/pkg/entropy-calc"
cp -R "$ROOT/entropy-calc/pkg/." "$ROOT/pkg/entropy-calc/"

# 1b. pass-hash WASM → pkg/pass-hash/
(cd "$ROOT/pass-hash" && wasm-pack build --target web)
rm -rf "$ROOT/pkg/pass-hash"
mkdir -p "$ROOT/pkg/pass-hash"
cp -R "$ROOT/pass-hash/pkg/." "$ROOT/pkg/pass-hash/"

# 2. gen-pass-ts browser bundle → dist/app.js
install_node_deps() {
  if [ -n "${CI:-}" ]; then
    npm ci
  else
    echo "npm install (local dev; CI uses npm ci)"
    npm install
  fi
}

(cd "$ROOT/gen-pass-ts" && install_node_deps && npm run build:browser)

echo "Serve: python3 -m http.server"
