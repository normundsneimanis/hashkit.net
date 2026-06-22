import { describe, expect, it } from "vitest";

import {
  CharClass,
  defaultPasswordConfig,
  flattenPasswordCharset,
  generatePassword,
  generatePasswordWith,
  GeneratorFlag,
  isValid,
  passwordGroups,
} from "../src/index.js";
import { sequentialRandomUint } from "../src/random.js";

describe("passwordGenerator", () => {
  it("default generates length 32", () => {
    const password = generatePassword(defaultPasswordConfig());
    expect([...password].length).toBe(32);
  });

  it("char from every group includes each class", () => {
    const config = {
      length: 8,
      classes: CharClass.LOWER_LETTERS | CharClass.UPPER_LETTERS | CharClass.NUMBERS,
      flags: GeneratorFlag.CHAR_FROM_EVERY_GROUP | GeneratorFlag.EXCLUDE_LOOK_ALIKE,
      customCharset: "",
      excludedCharset: "",
    };
    const password = generatePassword(config);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
  });

  it("exclude look-alike chars", () => {
    const config = {
      length: 64,
      classes:
        CharClass.LOWER_LETTERS |
        CharClass.UPPER_LETTERS |
        CharClass.NUMBERS |
        CharClass.DASHES,
      flags: GeneratorFlag.CHAR_FROM_EVERY_GROUP | GeneratorFlag.EXCLUDE_LOOK_ALIKE,
      customCharset: "",
      excludedCharset: "",
    };
    const password = generatePassword(config);
    expect(password.includes("l")).toBe(false);
    expect(password.includes("|")).toBe(false);
    expect(password.includes("0")).toBe(false);
  });

  it("excluded charset is removed", () => {
    const config = {
      length: 16,
      classes: CharClass.LOWER_LETTERS,
      flags: 0,
      customCharset: "",
      excludedCharset: "aeiou",
    };
    const password = generatePassword(config);
    expect([...password].some((ch) => "aeiou".includes(ch))).toBe(false);
  });

  it("flatten password charset dedupes and excludes", () => {
    const config = {
      length: 32,
      classes: CharClass.LOWER_LETTERS | CharClass.NUMBERS,
      flags: GeneratorFlag.EXCLUDE_LOOK_ALIKE,
      customCharset: "",
      excludedCharset: "0",
    };
    const charset = flattenPasswordCharset(config);
    expect(charset.includes("0")).toBe(false);
    expect(charset.includes("l")).toBe(false);
    expect(charset.includes("a")).toBe(true);
    expect(charset.includes("2")).toBe(true);
    expect(new Set([...charset]).size).toBe([...charset].length);
  });

  it("invalid config errors", () => {
    const config = {
      length: 1,
      classes: CharClass.LOWER_LETTERS | CharClass.UPPER_LETTERS,
      flags: GeneratorFlag.CHAR_FROM_EVERY_GROUP,
      customCharset: "",
      excludedCharset: "",
    };
    expect(isValid(config)).toBe(false);
    expect(() => generatePassword(config)).toThrow(
      "invalid password generator configuration",
    );
  });

  it("deterministic generation matches sequential rng", () => {
    const config = {
      length: 5,
      classes: CharClass.LOWER_LETTERS | CharClass.UPPER_LETTERS | CharClass.NUMBERS,
      flags: 0,
      customCharset: "",
      excludedCharset: "",
    };
    const password = generatePasswordWith(config, sequentialRandomUint([3, 6, 9, 12, 15]));
    expect(password).toBe("dgjmp");
  });

  it("whitespace class can emit a password containing space", () => {
    const config = {
      length: 2,
      classes: CharClass.LOWER_LETTERS | CharClass.WHITESPACE,
      flags: GeneratorFlag.CHAR_FROM_EVERY_GROUP,
      customCharset: "",
      excludedCharset: "",
    };
    const password = generatePasswordWith(config, sequentialRandomUint([0, 0]));
    expect(password.includes(" ")).toBe(true);
  });
});

describe("passwordGroups", () => {
  it("includes custom charset as its own group", () => {
    const groups = passwordGroups({
      length: 8,
      classes: CharClass.LOWER_LETTERS,
      flags: 0,
      customCharset: "++",
      excludedCharset: "",
    });
    expect(groups.at(-1)).toEqual(["+"]);
  });
});
