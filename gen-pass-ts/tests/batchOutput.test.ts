import { describe, expect, it } from "vitest";
import { formatBatchEntry, formatBatchOutput } from "../src/ui/hashEncode.js";

describe("batch output formatting", () => {
  it("formats a single entry with no space after hash", () => {
    expect(formatBatchEntry("PlaintextPassword1", "$argon2id$abc")).toBe(
      "#PlaintextPassword1\n$argon2id$abc",
    );
  });

  it("preserves internal spaces in password comment line", () => {
    expect(formatBatchEntry("hello world", "$hash$")).toBe("#hello world\n$hash$");
  });

  it("does not insert space after hash symbol", () => {
    const formatted = formatBatchEntry("hello world", "$hash$");
    expect(formatted.startsWith("#hello")).toBe(true);
    expect(formatted.startsWith("# hello")).toBe(false);
  });

  it("joins multiple entries with newlines", () => {
    const output = formatBatchOutput([
      { plaintext: "a", hash: "$1$" },
      { plaintext: "b c", hash: "$2$" },
    ]);
    expect(output).toBe("#a\n$1$\n#b c\n$2$");
  });
});
