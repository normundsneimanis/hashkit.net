# hashkit.net

Password generator demo with KeePassXC-compatible generation and zxcvbn entropy scoring (Rust WASM).

## Local development

```bash
./build.sh
python3 -m http.server
```

Open http://localhost:8000/

See [`gen-pass-ts/README.md`](gen-pass-ts/README.md) for TypeScript commands and parity tests.

## Deployment

Version tags (`v*`) trigger [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which:

1. Builds WASM (`entropy-calc`) and the browser bundle (`gen-pass-ts`)
2. Packages `index.html`, `dist/`, and `pkg/` for GitHub Pages
3. Deploys to https://hashkit.net

Built artifacts (`dist/`, `pkg/`) are gitignored and produced in CI only.
