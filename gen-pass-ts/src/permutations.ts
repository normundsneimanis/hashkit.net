import {
  flattenPasswordCharset,
  isValid,
  type PasswordConfig,
} from "./passwordGenerator.js";

function poolSize(config: PasswordConfig): number {
  return flattenPasswordCharset(config).length;
}

function termLog10(base: number, length: number): number {
  if (base <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  return length * Math.log10(base);
}

/** Ordered permutations with repetition: poolSize^length */
export function passwordPermutationCount(config: PasswordConfig): number {
  if (!isValid(config)) {
    return 0;
  }

  const n = poolSize(config);
  const length = config.length;
  if (n <= 0 || length <= 0) {
    return 0;
  }

  const count = Math.pow(n, length);
  return Number.isFinite(count) ? count : Number.POSITIVE_INFINITY;
}

export function permutationLog10(config: PasswordConfig): number | null {
  if (!isValid(config)) {
    return null;
  }

  const n = poolSize(config);
  const length = config.length;
  if (n <= 0 || length <= 0) {
    return null;
  }

  return termLog10(n, length);
}

export function formatPermutationCount(count: number): string {
  if (count === 0) {
    return "0";
  }
  if (!Number.isFinite(count) || count < 0) {
    return "—";
  }
  return count.toExponential(2);
}

export function formatLog10AsExponent(log10: number): string {
  const exp = Math.floor(log10);
  const mantissa = Math.pow(10, log10 - exp);
  return `${mantissa.toFixed(2)}e+${exp}`;
}

export function formatPermutationCountForConfig(config: PasswordConfig): string {
  const log10 = permutationLog10(config);
  if (log10 === null) {
    return "—";
  }
  return formatLog10AsExponent(log10);
}
