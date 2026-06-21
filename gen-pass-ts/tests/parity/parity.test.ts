import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CharClass,
  flattenPasswordCharset,
  generatePassword,
  generatePasswordWith,
  GeneratorFlag,
  isValid,
  minLength,
  passwordGroups,
} from "../../src/index.js";
import { sequentialRandomUint } from "../../src/random.js";
import { runRustParity, type ParityRequest } from "./rustParity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface StructuralCase {
  name: string;
  request: ParityRequest;
}

interface GenerationCase {
  name: string;
  config: {
    length: number;
    classes: number;
    flags: number;
    customCharset: string;
    excludedCharset: string;
  };
  randomU32: number[];
  expectedPassword?: string;
  expectError?: boolean;
}

const structuralCases = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/structural.json"), "utf8"),
) as StructuralCase[];

const generationCases = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/generation.json"), "utf8"),
) as GenerationCase[];

describe("parity structural", () => {
  for (const testCase of structuralCases) {
    it(testCase.name, () => {
      const rust = runRustParity(testCase.request);
      const config = {
        length: testCase.request.config.length,
        classes: testCase.request.config.classes,
        flags: testCase.request.config.flags,
        customCharset: testCase.request.config.custom_charset ?? "",
        excludedCharset: testCase.request.config.excluded_charset ?? "",
      };

      expect(isValid(config)).toBe(rust.valid);
      expect(minLength(config)).toBe(rust.min_length);

      if (testCase.request.action === "groups") {
        expect(passwordGroups(config)).toEqual(rust.groups);
      }

      if (testCase.request.action === "charset") {
        expect(flattenPasswordCharset(config)).toBe(rust.charset);
      }
    });
  }
});

describe("parity generation", () => {
  for (const testCase of generationCases) {
    it(testCase.name, () => {
      const rust = runRustParity({
        action: "generate",
        config: {
          length: testCase.config.length,
          classes: testCase.config.classes,
          flags: testCase.config.flags,
          custom_charset: testCase.config.customCharset,
          excluded_charset: testCase.config.excludedCharset,
        },
        random_u32: testCase.randomU32,
      });

      const randomUint = sequentialRandomUint(testCase.randomU32);

      if (testCase.expectError) {
        expect(() => generatePasswordWith(testCase.config, randomUint)).toThrow(
          "invalid password generator configuration",
        );
        expect(rust.error).toBe("invalid password generator configuration");
        return;
      }

      const password = generatePasswordWith(testCase.config, randomUint);
      expect(password).toBe(testCase.expectedPassword);
      expect(rust.password).toBe(testCase.expectedPassword);
    });
  }
});

describe("parity guard", () => {
  it("rust cli still matches committed generation fixtures", () => {
    for (const testCase of generationCases) {
      if (testCase.expectError) {
        continue;
      }

      const rust = runRustParity({
        action: "generate",
        config: {
          length: testCase.config.length,
          classes: testCase.config.classes,
          flags: testCase.config.flags,
          custom_charset: testCase.config.customCharset,
          excluded_charset: testCase.config.excludedCharset,
        },
        random_u32: testCase.randomU32,
      });

      expect(rust.password).toBe(testCase.expectedPassword);
    }
  });
});
