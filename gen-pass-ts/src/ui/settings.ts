import type { ThemeMode } from "./theme.js";
import type { PasswordConfig } from "../passwordGenerator.js";

export const SETTINGS_KEY = "hashkitPasswordGenSettings";

const DEFAULT_ENABLED = ["LOWER_LETTERS", "UPPER_LETTERS", "NUMBERS"];

export interface SavedSettings {
  length: number;
  enabledClasses: string[];
  excludedCharset: string;
  excludeLookAlike: boolean;
  pickFromEachGroup: boolean;
  customCharset: string;
  theme: ThemeMode;
}

export function defaultSettings(): SavedSettings {
  return {
    length: 32,
    enabledClasses: [...DEFAULT_ENABLED],
    excludedCharset: "",
    excludeLookAlike: false,
    pickFromEachGroup: true,
    customCharset: "",
    theme: "system",
  };
}

export function loadSettings(): SavedSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedSettings>;
    const defaults = defaultSettings();
    return {
      length: typeof parsed.length === "number" ? parsed.length : defaults.length,
      enabledClasses: Array.isArray(parsed.enabledClasses)
        ? parsed.enabledClasses.filter((k) => typeof k === "string")
        : defaults.enabledClasses,
      excludedCharset:
        typeof parsed.excludedCharset === "string"
          ? parsed.excludedCharset
          : defaults.excludedCharset,
      excludeLookAlike:
        typeof parsed.excludeLookAlike === "boolean"
          ? parsed.excludeLookAlike
          : defaults.excludeLookAlike,
      pickFromEachGroup:
        typeof parsed.pickFromEachGroup === "boolean"
          ? parsed.pickFromEachGroup
          : defaults.pickFromEachGroup,
      customCharset:
        typeof parsed.customCharset === "string"
          ? parsed.customCharset
          : defaults.customCharset,
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
          ? parsed.theme
          : defaults.theme,
    };
  } catch {
    return null;
  }
}

export function saveSettings(
  config: PasswordConfig,
  enabledClasses: string[],
  theme: ThemeMode,
): void {
  const settings: SavedSettings = {
    length: config.length,
    enabledClasses,
    excludedCharset: config.excludedCharset,
    excludeLookAlike: (config.flags & 1) !== 0,
    pickFromEachGroup: (config.flags & 2) !== 0,
    customCharset: config.customCharset,
    theme,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

export function parseExcludedCharset(excluded: string): Set<string> {
  return new Set([...excluded]);
}
