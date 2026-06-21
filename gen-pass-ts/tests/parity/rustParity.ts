import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export interface ParityConfig {
  length: number;
  classes: number;
  flags: number;
  custom_charset?: string;
  excluded_charset?: string;
}

export interface ParityRequest {
  action: "groups" | "charset" | "valid" | "generate";
  config: ParityConfig;
  random_u32?: number[];
}

export interface ParityResponse {
  valid: boolean;
  min_length: number;
  groups?: string[][];
  charset?: string;
  password?: string;
  error?: string | null;
}

function parityCliPath(): string {
  if (process.env.GEN_PASS_PARITY_CLI && existsSync(process.env.GEN_PASS_PARITY_CLI)) {
    return process.env.GEN_PASS_PARITY_CLI;
  }

  const candidates = [
    path.join(repoRoot, "tools/parity-ref/target/debug/parity-cli"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "parity-cli not found. Run: npm run build:parity-cli (from gen-pass-ts)",
  );
}

export function runRustParity(request: ParityRequest): ParityResponse {
  const cli = parityCliPath();
  const result = spawnSync(cli, [], {
    input: JSON.stringify(request),
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `parity-cli exited with ${result.status}`);
  }

  return JSON.parse(result.stdout) as ParityResponse;
}
