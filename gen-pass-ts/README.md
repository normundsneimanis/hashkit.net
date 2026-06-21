# gen-pass-ts

KeePassXC-compatible password generation in TypeScript.

## Commands

Use Node 22 (see [`.nvmrc`](../.nvmrc)) when installing deps or updating `package-lock.json` — CI uses Node 22 and `npm ci` requires a matching lockfile.

```bash
npm install
npm run build:parity-cli   # build Rust parity-cli (required for parity tests)
npm run build:browser      # bundle demo UI → ../dist/app.js
npm test                   # all tests (unit + parity)
npm run test:parity        # cross-implementation parity tests only
```

From the repo root, `./build.sh` builds entropy WASM and the browser bundle for the unified demo at `index.html`.

## Parity testing

TypeScript output is compared against the Rust reference in [`tools/parity-ref/`](tools/parity-ref/) via the `parity-cli` binary:

- **Structural parity:** `passwordGroups`, `flattenPasswordCharset`, `isValid`, `minLength`
- **Generation parity:** fixed `randomU32` streams produce identical passwords in TS and Rust

Fixtures live in [`tests/parity/fixtures/`](tests/parity/fixtures/).

Override the CLI path with `GEN_PASS_PARITY_CLI=/path/to/parity-cli`.
