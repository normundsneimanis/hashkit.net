export type RandomUint = (limit: number) => number;

export function randomUintFromValue(limit: number, value: number): number {
  if (limit === 0) {
    return 0;
  }
  const ceil = 0xffffffff - (0xffffffff % limit) - 1;
  if (value <= ceil) {
    return value % limit;
  }
  return randomUintFromValue(limit, value);
}

function cryptoRandomUint32(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0]!;
}

export function defaultRandomUint(limit: number): number {
  if (limit === 0) {
    return 0;
  }
  const ceil = 0xffffffff - (0xffffffff % limit) - 1;
  while (true) {
    const value = cryptoRandomUint32();
    if (value <= ceil) {
      return value % limit;
    }
  }
}

export function sequentialRandomUint(values: readonly number[]): RandomUint {
  let index = 0;
  return (limit: number) => {
    if (limit === 0) {
      return 0;
    }
    const ceil = 0xffffffff - (0xffffffff % limit) - 1;
    while (true) {
      const value = values[index] ?? 0;
      index += 1;
      if (value <= ceil) {
        return value % limit;
      }
    }
  };
}
