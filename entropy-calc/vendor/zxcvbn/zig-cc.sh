#!/usr/bin/env bash
set -euo pipefail

args=()
for arg in "$@"; do
  case "$arg" in
    --target=wasm32-unknown-unknown)
      args+=("--target=wasm32-wasi")
      ;;
    --target)
      args+=("$arg")
      ;;
    wasm32-unknown-unknown)
      args+=("wasm32-wasi")
      ;;
    *)
      args+=("$arg")
      ;;
  esac
done

exec zig cc "${args[@]}"
