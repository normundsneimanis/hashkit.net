import { describe, expect, it } from "vitest";
import {
  CharClass,
  GeneratorFlag,
  type PasswordConfig,
} from "../src/passwordGenerator.js";
import {
  formatLog10AsExponent,
  formatPermutationCount,
  formatPermutationCountForConfig,
  passwordPermutationCount,
} from "../src/permutations.js";

function config(overrides: Partial<PasswordConfig> = {}): PasswordConfig {
  return {
    length: 2,
    classes: CharClass.LOWER_LETTERS | CharClass.NUMBERS,
    flags: 0,
    customCharset: "",
    excludedCharset: "",
    ...overrides,
  };
}

describe("passwordPermutationCount", () => {
  it("counts n^L without every-group", () => {
    const cfg = config({
      classes: CharClass.NUMBERS,
      length: 2,
      flags: 0,
    });
    expect(passwordPermutationCount(cfg)).toBe(100);
  });

  it("uses pool size for every-group flag too", () => {
    const cfg = config({
      classes: CharClass.LOWER_LETTERS | CharClass.NUMBERS,
      length: 2,
      flags: GeneratorFlag.CHAR_FROM_EVERY_GROUP,
    });
    // 36^2 — pool has 26 letters + 10 digits, order matters, repetition allowed
    expect(passwordPermutationCount(cfg)).toBe(1296);
  });

  it("counts only enabled character types in pool", () => {
    const cfg = config({
      classes: CharClass.LOWER_LETTERS,
      length: 32,
      flags: GeneratorFlag.CHAR_FROM_EVERY_GROUP,
    });
    expect(passwordPermutationCount(cfg)).toBe(Math.pow(26, 32));
    expect(formatPermutationCountForConfig(cfg)).toBe("1.90e+45");
  });

  it("returns 0 for invalid config", () => {
    expect(passwordPermutationCount(config({ classes: 0, length: 8 }))).toBe(0);
  });
});

describe("formatPermutationCount", () => {
  it("formats in exponential notation", () => {
    expect(formatPermutationCount(5.72e57)).toBe("5.72e+57");
    expect(formatLog10AsExponent(57.757)).toBe("5.71e+57");
  });

  it("formats from config", () => {
    const cfg = config({
      classes: CharClass.NUMBERS,
      length: 2,
      flags: 0,
    });
    expect(formatPermutationCountForConfig(cfg)).toBe("1.00e+2");
  });

  it("returns dash for invalid config", () => {
    expect(formatPermutationCountForConfig(config({ classes: 0, length: 4 }))).toBe("—");
  });
});
