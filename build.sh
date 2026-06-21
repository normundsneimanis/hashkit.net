#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# 1. entropy-calc WASM → pkg/entropy-calc/
(cd "$ROOT/entropy-calc" && wasm-pack build --target web)
rm -rf "$ROOT/pkg/entropy-calc"
mkdir -p "$ROOT/pkg/entropy-calc"
cp -R "$ROOT/entropy-calc/pkg/." "$ROOT/pkg/entropy-calc/"

# 2. gen-pass-ts browser bundle → dist/app.js
(cd "$ROOT/gen-pass-ts" && npm ci && npm run build:browser)

echo "Serve: cd $ROOT && python3 -m http.server"
