import { encodeSync, loadPassHash, type EncodeResult } from "./hashEncode.js";

type WorkerRequest = {
  id: number;
  algo: string;
  password: string;
  options: Record<string, unknown>;
};

type WorkerResponse = {
  id: number;
} & EncodeResult;

const passHash = await loadPassHash();

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const { id, algo, password, options } = event.data;
  const result = encodeSync(algo, password, options, passHash);
  const response: WorkerResponse = { id, ...result };
  self.postMessage(response);
});

self.postMessage({ type: "ready" });
