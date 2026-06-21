export const CharClass = {
  LOWER_LETTERS: 1 << 0,
  UPPER_LETTERS: 1 << 1,
  NUMBERS: 1 << 2,
  BRACES: 1 << 3,
  PUNCTUATION: 1 << 4,
  QUOTES: 1 << 5,
  DASHES: 1 << 6,
  MATH: 1 << 7,
  LOGOGRAMS: 1 << 8,
  SPECIAL_CHARACTERS:
    (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8),
  EASCII: 1 << 9,
  DEFAULT_CHARSET: (1 << 0) | (1 << 1) | (1 << 2),
} as const;

export const GeneratorFlag = {
  EXCLUDE_LOOK_ALIKE: 1 << 0,
  CHAR_FROM_EVERY_GROUP: 1 << 1,
  ADVANCED_MODE: 1 << 2,
  DEFAULT_FLAGS: (1 << 0) | (1 << 1),
} as const;

export interface PasswordConfig {
  length: number;
  classes: number;
  flags: number;
  customCharset: string;
  excludedCharset: string;
}

export function defaultPasswordConfig(): PasswordConfig {
  return {
    length: 32,
    classes: CharClass.DEFAULT_CHARSET,
    flags: GeneratorFlag.DEFAULT_FLAGS,
    customCharset: "",
    excludedCharset: "",
  };
}
