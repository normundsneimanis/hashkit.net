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

Pushes to `main` and version tags (`v*`) trigger [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which:

1. Builds WASM (`entropy-calc`) and the browser bundle (`gen-pass-ts`)
2. Packages `index.html`, `dist/`, and `pkg/` for GitHub Pages
3. Deploys to https://hashkit.net

Built artifacts (`dist/`, `pkg/`) are gitignored and produced in CI only.

### First deploy checklist

Before the workflow can succeed, ensure these paths are committed on `main`:

- [`build.sh`](build.sh), [`index.html`](index.html), [`.gitignore`](.gitignore)
- [`gen-pass-ts/`](gen-pass-ts/) including **`package-lock.json`** (required for `npm ci`)
- [`entropy-calc/`](entropy-calc/) source (not `target/` or `pkg/`)

### One-time GitHub Pages setup

1. **Enable Actions deploy** — Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. **Custom domain** — In the same Pages settings, set the custom domain to `hashkit.net`. The workflow writes a `CNAME` file into each deployment.
3. **DNS** — At your domain registrar, point the apex domain `hashkit.net` to GitHub Pages using the [documented A and AAAA records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain).
4. **HTTPS** — After DNS validates, enable **Enforce HTTPS** in Pages settings.

### Verify a deploy

1. Push to `main` and confirm the **Deploy to GitHub Pages** workflow succeeds in the Actions tab.
2. Open https://hashkit.net — the generator loads and the entropy meter works (WASM from `/pkg/entropy-calc/`).
3. Optionally push a tag such as `v0.1.0` and confirm a redeploy runs.
