import type { RandomUint } from "./random.js";
import { defaultRandomUint } from "./random.js";
import {
  CharClass,
  defaultPasswordConfig,
  GeneratorFlag,
  type PasswordConfig,
} from "./types.js";

export type { PasswordConfig };
export { CharClass, GeneratorFlag, defaultPasswordConfig };

function hasClass(classes: number, flag: number): boolean {
  return (classes & flag) !== 0;
}

function hasFlag(flags: number, flag: number): boolean {
  return (flags & flag) !== 0;
}

export function passwordGroups(config: PasswordConfig): string[][] {
  const exclude = hasFlag(config.flags, GeneratorFlag.EXCLUDE_LOOK_ALIKE);
  const groups: string[][] = [];

  if (hasClass(config.classes, CharClass.LOWER_LETTERS)) {
    const group: string[] = [];
    for (let code = 97; code <= 122; code += 1) {
      if (exclude && code === 108) {
        continue;
      }
      group.push(String.fromCodePoint(code));
    }
    groups.push(group);
  }

  if (hasClass(config.classes, CharClass.UPPER_LETTERS)) {
    const group: string[] = [];
    for (let code = 65; code <= 90; code += 1) {
      if (exclude && (code === 66 || code === 71 || code === 73 || code === 79)) {
        continue;
      }
      group.push(String.fromCodePoint(code));
    }
    groups.push(group);
  }

  if (hasClass(config.classes, CharClass.NUMBERS)) {
    const group: string[] = [];
    for (let code = 48; code <= 57; code += 1) {
      if (exclude && (code === 48 || code === 49 || code === 54 || code === 56)) {
        continue;
      }
      group.push(String.fromCodePoint(code));
    }
    groups.push(group);
  }

  if (hasClass(config.classes, CharClass.BRACES)) {
    groups.push(["(", ")", "[", "]", "{", "}"]);
  }

  if (hasClass(config.classes, CharClass.PUNCTUATION)) {
    groups.push([",", ".", ":", ";"]);
  }

  if (hasClass(config.classes, CharClass.QUOTES)) {
    groups.push(['"', "'"]);
  }

  if (hasClass(config.classes, CharClass.DASHES)) {
    const group = ["-", "/", "\\", "_"];
    if (!exclude) {
      group.push("|");
    }
    groups.push(group);
  }

  if (hasClass(config.classes, CharClass.MATH)) {
    groups.push(["!", "*", "+", "<", "=", ">", "?"]);
  }

  if (hasClass(config.classes, CharClass.LOGOGRAMS)) {
    const group: string[] = [];
    for (let code = 35; code <= 38; code += 1) {
      group.push(String.fromCodePoint(code));
    }
    group.push("@", "^", "`", "~");
    groups.push(group);
  }

  if (hasClass(config.classes, CharClass.EASCII)) {
    const group: string[] = [];
    for (let code = 161; code <= 172; code += 1) {
      group.push(String.fromCodePoint(code));
    }
    for (let code = 174; code <= 255; code += 1) {
      if (exclude && code === 249) {
        continue;
      }
      group.push(String.fromCodePoint(code));
    }
    groups.push(group);
  }

  if (hasClass(config.classes, CharClass.WHITESPACE)) {
    groups.push([" "]);
  }

  if (config.customCharset.length > 0) {
    const group: string[] = [];
    for (const ch of config.customCharset) {
      if (!group.includes(ch)) {
        group.push(ch);
      }
    }
    if (group.length > 0) {
      groups.push(group);
    }
  }

  const excluded = [...config.excludedCharset];
  return groups
    .map((group) => group.filter((ch) => !excluded.includes(ch)))
    .filter((group) => group.length > 0);
}

export function minLength(config: PasswordConfig): number {
  if (hasFlag(config.flags, GeneratorFlag.CHAR_FROM_EVERY_GROUP)) {
    return passwordGroups(config).length;
  }
  return 1;
}

export function isValid(config: PasswordConfig): boolean {
  if (config.classes === 0 && config.customCharset.length === 0) {
    return false;
  }
  if (config.length === 0) {
    return false;
  }
  if (
    hasFlag(config.flags, GeneratorFlag.CHAR_FROM_EVERY_GROUP) &&
    config.length < minLength(config)
  ) {
    return false;
  }
  return passwordGroups(config).length > 0;
}

export function flattenPasswordCharset(config: PasswordConfig): string {
  const chars = passwordGroups(config).flat();
  const unique = [...new Set(chars)].sort();
  return unique.join("");
}

export function generatePasswordWith(
  config: PasswordConfig,
  randomUint: RandomUint,
): string {
  if (!isValid(config)) {
    throw new Error("invalid password generator configuration");
  }

  const groups = passwordGroups(config);
  const passwordChars = groups.flat();
  let password = "";

  if (hasFlag(config.flags, GeneratorFlag.CHAR_FROM_EVERY_GROUP)) {
    for (const group of groups) {
      const pos = randomUint(group.length);
      password += group[pos]!;
    }

    for (let i = groups.length; i < config.length; i += 1) {
      const pos = randomUint(passwordChars.length);
      password += passwordChars[pos]!;
    }

    const chars = [...password];
    for (let i = chars.length - 1; i >= 1; i -= 1) {
      const j = randomUint(i + 1);
      [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    password = chars.join("");
  } else {
    for (let i = 0; i < config.length; i += 1) {
      const pos = randomUint(passwordChars.length);
      password += passwordChars[pos]!;
    }
  }

  return password;
}

export function generatePassword(
  config: PasswordConfig,
  randomUint: RandomUint = defaultRandomUint,
): string {
  return generatePasswordWith(config, randomUint);
}
