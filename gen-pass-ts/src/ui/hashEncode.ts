export type DetectResult = {
  algorithm: string;
  variant?: string;
  params?: Record<string, unknown>;
  confidence: string;
  notes?: string;
  htpasswd_user?: string;
};

export type EncodeResult = {
  ok: boolean;
  hash?: string;
  error?: string;
};

export type PassHashApi = {
  detect_algorithm(hash: string): string;
  encode_password(algo: string, password: string, options_json: string): string;
  default?: () => Promise<void>;
};

const HEAVY_ALGOS = new Set([
  "argon2id",
  "argon2i",
  "argon2d",
  "yescrypt",
  "sha512crypt",
  "sha256crypt",
  "scrypt",
  "django_pbkdf2_sha256",
  "django_pbkdf2_sha512",
]);

let api: PassHashApi | null = null;
let worker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let refreshHashPreview: (() => void) | null = null;
let previewRequestId = 0;

type WorkerControlMessage = { type: "ready" };

function isWorkerControlMessage(data: unknown): data is WorkerControlMessage {
  return typeof data === "object" && data !== null && (data as WorkerControlMessage).type === "ready";
}

/** Start loading the encode worker (WASM init runs in parallel with UI setup). */
export function warmHashWorker(): void {
  void getWorkerReady().catch(() => {
    /* surfaced when an encode is attempted */
  });
}

function getWorkerReady(): Promise<void> {
  if (workerReady) return workerReady;

  worker = new Worker(new URL("./hashWorker.js", import.meta.url), { type: "module" });
  workerReady = new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isWorkerControlMessage(event.data)) return;
      worker?.removeEventListener("message", onMessage);
      worker?.removeEventListener("error", onError);
      resolve();
    };
    const onError = (event: ErrorEvent) => {
      worker?.removeEventListener("message", onMessage);
      worker?.removeEventListener("error", onError);
      worker = null;
      workerReady = null;
      reject(event.error ?? new Error(event.message));
    };
    worker!.addEventListener("message", onMessage);
    worker!.addEventListener("error", onError);
  });

  return workerReady;
}

export async function loadPassHash(): Promise<PassHashApi> {
  if (api) return api;
  const url = new URL("../../pkg/pass-hash/pass_hash.js", import.meta.url).href;
  const mod = await import(/* @vite-ignore */ url);
  await mod.default();
  api = mod as PassHashApi;
  return api;
}

/** Re-run the live example hash for the current password and algorithm. */
export function triggerHashPreview(): void {
  refreshHashPreview?.();
}

function parseJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

export function detectHash(hash: string, passHash: PassHashApi): DetectResult {
  return parseJson<DetectResult>(passHash.detect_algorithm(hash));
}

export function encodeSync(
  algo: string,
  password: string,
  options: Record<string, unknown>,
  passHash: PassHashApi,
): EncodeResult {
  return parseJson<EncodeResult>(
    passHash.encode_password(algo, password, JSON.stringify(options)),
  );
}

async function workerEncode(
  algo: string,
  password: string,
  options: Record<string, unknown>,
  requestId: number,
): Promise<EncodeResult> {
  await getWorkerReady();
  const w = worker;
  if (!w) throw new Error("Hash worker unavailable");

  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<EncodeResult & { id: number }>) => {
      if (isWorkerControlMessage(event.data) || event.data.id !== requestId) return;
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      const { id: _id, ...result } = event.data;
      resolve(result);
    };
    const onError = (event: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(event.error ?? new Error(event.message));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ id: requestId, algo, password, options });
  });
}

export async function encodePassword(
  algo: string,
  password: string,
  options: Record<string, unknown>,
  passHash: PassHashApi,
  requestId?: number,
): Promise<EncodeResult> {
  if (HEAVY_ALGOS.has(algo)) {
    return workerEncode(algo, password, options, requestId ?? ++previewRequestId);
  }
  return encodeSync(algo, password, options, passHash);
}

export const ALGORITHMS: { id: string; label: string; group: string }[] = [
  { id: "argon2id", label: "Argon2id (PHC)", group: "Argon2" },
  { id: "argon2i", label: "Argon2i (PHC)", group: "Argon2" },
  { id: "argon2d", label: "Argon2d (PHC)", group: "Argon2" },
  { id: "yescrypt", label: "yescrypt (shadow)", group: "Linux shadow" },
  { id: "sha512crypt", label: "SHA-512 crypt ($6$)", group: "Linux shadow" },
  { id: "sha256crypt", label: "SHA-256 crypt ($5$)", group: "Linux shadow" },
  { id: "bcrypt", label: "bcrypt", group: "Linux shadow" },
  { id: "md5crypt", label: "MD5 crypt ($1$, legacy)", group: "Linux shadow" },
  { id: "htpasswd_bcrypt", label: "htpasswd bcrypt", group: "htpasswd" },
  { id: "htpasswd_apr1", label: "htpasswd apr1 (MD5)", group: "htpasswd" },
  { id: "htpasswd_crypt", label: "htpasswd crypt (sha512)", group: "htpasswd" },
  { id: "django_pbkdf2_sha256", label: "Django pbkdf2_sha256", group: "Django" },
  { id: "django_pbkdf2_sha512", label: "Django pbkdf2_sha512", group: "Django" },
  { id: "scrypt", label: "scrypt (PHC)", group: "Other" },
  { id: "pbkdf2_sha256_phc", label: "PBKDF2-SHA256 (PHC)", group: "Other" },
  { id: "pbkdf2_sha512_phc", label: "PBKDF2-SHA512 (PHC)", group: "Other" },
];

export const DEFAULT_OPTIONS: Record<string, Record<string, unknown>> = {
  argon2id: { m_cost: 19456, t_cost: 2, p_cost: 1 },
  argon2i: { m_cost: 19456, t_cost: 2, p_cost: 1, variant: "argon2i" },
  argon2d: { m_cost: 19456, t_cost: 2, p_cost: 1, variant: "argon2d" },
  bcrypt: { cost: 12, bcrypt_prefix: "2y" },
  yescrypt: {},
  sha512crypt: { rounds: 5000 },
  sha256crypt: { rounds: 5000 },
  md5crypt: {},
  htpasswd_bcrypt: { cost: 12, bcrypt_prefix: "2y", username: "user" },
  htpasswd_apr1: { username: "user" },
  htpasswd_crypt: { username: "user", variant: "sha512crypt", rounds: 5000 },
  django_pbkdf2_sha256: { iterations: 720000 },
  django_pbkdf2_sha512: { iterations: 720000 },
  scrypt: { scrypt_n: 15, scrypt_r: 8, scrypt_p: 1 },
  pbkdf2_sha256_phc: { iterations: 600000 },
  pbkdf2_sha512_phc: { iterations: 600000 },
};

export function optionsFromDetect(result: DetectResult): Record<string, unknown> {
  const base = { ...(DEFAULT_OPTIONS[result.algorithm] ?? {}) };
  const params = result.params ?? {};
  if (typeof params.m === "string") base.m_cost = Number.parseInt(params.m, 10);
  if (typeof params.t === "string") base.t_cost = Number.parseInt(params.t, 10);
  if (typeof params.p === "string") base.p_cost = Number.parseInt(params.p, 10);
  if (typeof params.cost === "number") base.cost = params.cost;
  if (typeof params.rounds === "number") base.rounds = params.rounds;
  if (typeof params.iterations === "string") {
    base.iterations = Number.parseInt(params.iterations, 10);
  }
  if (result.htpasswd_user) base.username = result.htpasswd_user;
  if (result.variant?.startsWith("$2")) base.bcrypt_prefix = result.variant.slice(1, 3);
  return base;
}

function exampleOptions(raw: Record<string, unknown>): Record<string, unknown> {
  const opts = { ...raw };
  if (!opts.salt) delete opts.salt;
  return opts;
}

export function formatBatchEntry(plaintext: string, hash: string): string {
  return `#${plaintext}\n${hash}`;
}

export function formatBatchOutput(entries: { plaintext: string; hash: string }[]): string {
  return entries.map((e) => formatBatchEntry(e.plaintext, e.hash)).join("\n");
}

export function readSelectedAlgorithm(): string {
  const algoSelect = document.getElementById("hash-algo") as HTMLSelectElement | null;
  return algoSelect?.value ?? "argon2id";
}

export function readHashOptionsFromDom(useCustomSalt = true): Record<string, unknown> {
  const algoSelect = document.getElementById("hash-algo") as HTMLSelectElement | null;
  const paramsRoot = document.getElementById("hash-params");
  const algo = algoSelect?.value ?? "argon2id";
  const opts: Record<string, unknown> = { ...(DEFAULT_OPTIONS[algo] ?? {}) };
  for (const input of paramsRoot?.querySelectorAll<HTMLInputElement>("input[data-opt]") ?? []) {
    const key = input.dataset.opt;
    if (!key) continue;
    if (!useCustomSalt && key === "salt") continue;
    if (input.type === "number") {
      const n = Number.parseInt(input.value, 10);
      if (!Number.isNaN(n)) opts[key] = n;
    } else if (input.value.trim()) {
      opts[key] = input.value.trim();
    }
  }
  return opts;
}

export async function encodeForBatch(
  password: string,
  passHash: PassHashApi,
): Promise<EncodeResult> {
  const algo = readSelectedAlgorithm();
  const options = exampleOptions(readHashOptionsFromDom(false));
  return encodePassword(algo, password, options, passHash);
}

export function mountHashEncode(passHash: PassHashApi): void {
  warmHashWorker();

  const algoSelect = document.getElementById("hash-algo") as HTMLSelectElement;
  const detectInput = document.getElementById("hash-detect-input") as HTMLInputElement;
  const detectInfo = document.getElementById("hash-detect-info");
  const encodedOutput = document.getElementById("encoded-output") as HTMLInputElement;
  const encodeBtn = document.getElementById("encode-password") as HTMLButtonElement;
  const copyBtn = document.getElementById("copy-encoded") as HTMLButtonElement;
  const status = document.getElementById("hash-status");
  const paramsRoot = document.getElementById("hash-params");

  if (!algoSelect || !encodeBtn || !encodedOutput) return;

  let previewTimer: ReturnType<typeof setTimeout> | null = null;

  for (const algo of ALGORITHMS) {
    const opt = document.createElement("option");
    opt.value = algo.id;
    opt.textContent = `${algo.group}: ${algo.label}`;
    algoSelect.append(opt);
  }

  function readOptions(includeCustomSalt = true): Record<string, unknown> {
    return readHashOptionsFromDom(includeCustomSalt);
  }

  function currentPassword(): string {
    return (document.getElementById("output") as HTMLInputElement)?.value ?? "";
  }

  async function runEncodedPreview(useCustomSalt = false): Promise<void> {
    const password = currentPassword();
    const requestId = ++previewRequestId;

    if (!password) {
      encodedOutput.value = "";
      if (status) status.textContent = "";
      return;
    }

    if (status) status.textContent = "Encoding…";
    try {
      const options = useCustomSalt ? readOptions(true) : exampleOptions(readOptions(true));
      const result = await encodePassword(
        algoSelect.value,
        password,
        options,
        passHash,
        requestId,
      );
      if (requestId !== previewRequestId) return;
      if (!result.ok) {
        encodedOutput.value = "";
        if (status) status.textContent = result.error ?? "Encode failed";
        return;
      }
      encodedOutput.value = result.hash ?? "";
      if (status) status.textContent = "";
    } catch (error) {
      if (requestId !== previewRequestId) return;
      encodedOutput.value = "";
      if (status) status.textContent = `Encode failed: ${error}`;
    }
  }

  function scheduleEncodedPreview(): void {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      void runEncodedPreview(false);
    }, 300);
  }

  refreshHashPreview = () => {
    if (previewTimer) clearTimeout(previewTimer);
    void runEncodedPreview(false);
  };

  function renderParamFields(algo: string): void {
    if (!paramsRoot) return;
    paramsRoot.replaceChildren();
    const defs: [string, string, string | number][] = [];
    if (algo.startsWith("argon2")) {
      defs.push(["m_cost", "Memory (KiB)", 19456], ["t_cost", "Time", 2], ["p_cost", "Parallelism", 1]);
    }
    if (algo === "bcrypt" || algo === "htpasswd_bcrypt") {
      defs.push(["cost", "Cost", 12], ["bcrypt_prefix", "Prefix (2a/2b/2y)", "2y"]);
    }
    if (algo === "sha512crypt" || algo === "sha256crypt" || algo === "htpasswd_crypt") {
      defs.push(["rounds", "Rounds", 5000]);
    }
    if (algo.startsWith("django") || algo.startsWith("pbkdf2")) {
      defs.push(["iterations", "Iterations", 720000]);
    }
    if (algo.startsWith("htpasswd")) {
      defs.push(["username", "Username", "user"]);
    }
    if (algo === "scrypt") {
      defs.push(["scrypt_n", "log2(N)", 15], ["scrypt_r", "r", 8], ["scrypt_p", "p", 1]);
    }
    defs.push(["salt", "Salt (optional, auto if empty)", ""]);

    for (const [key, label, value] of defs) {
      const wrap = document.createElement("label");
      wrap.textContent = label;
      const input = document.createElement("input");
      input.dataset.opt = key;
      input.type = key === "salt" || key === "username" || key === "bcrypt_prefix" ? "text" : "number";
      input.value = String(value);
      input.spellcheck = false;
      input.addEventListener("input", scheduleEncodedPreview);
      input.addEventListener("change", scheduleEncodedPreview);
      wrap.append(input);
      paramsRoot.append(wrap);
    }
  }

  function applyDetect(raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed || !detectInfo) return;
    const result = detectHash(trimmed, passHash);
    if (result.algorithm === "unknown") {
      detectInfo.textContent = result.notes ?? "Unknown format";
      return;
    }
    algoSelect.value = result.algorithm;
    renderParamFields(result.algorithm);
    const opts = optionsFromDetect(result);
    for (const input of paramsRoot?.querySelectorAll<HTMLInputElement>("input[data-opt]") ?? []) {
      const key = input.dataset.opt;
      if (key && opts[key] !== undefined) input.value = String(opts[key]);
    }
    detectInfo.textContent = `Detected: ${result.algorithm} (${result.confidence})`;
    void runEncodedPreview(false);
  }

  algoSelect.addEventListener("change", () => {
    renderParamFields(algoSelect.value);
    void runEncodedPreview(false);
  });
  detectInput?.addEventListener("input", () => applyDetect(detectInput.value));
  renderParamFields(algoSelect.value);

  encodeBtn.addEventListener("click", async () => {
    const password = currentPassword();
    if (!password) {
      if (status) status.textContent = "Generate a password first.";
      return;
    }
    encodeBtn.disabled = true;
    await runEncodedPreview(true);
    encodeBtn.disabled = false;
  });

  copyBtn?.addEventListener("click", async () => {
    if (!encodedOutput.value) return;
    try {
      await navigator.clipboard.writeText(encodedOutput.value);
      copyBtn.classList.add("copied");
      setTimeout(() => copyBtn.classList.remove("copied"), 1500);
    } catch {
      /* clipboard unavailable */
    }
  });

  void (async () => {
    try {
      await getWorkerReady();
      if (currentPassword()) await runEncodedPreview(false);
    } catch (error) {
      if (status) status.textContent = `Encode failed: ${error}`;
    }
  })();
}
