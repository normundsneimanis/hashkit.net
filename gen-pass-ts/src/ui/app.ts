import {
  CharClass,
  generatePassword,
  GeneratorFlag,
  isValid,
  minLength,
  type PasswordConfig,
} from "../passwordGenerator.js";
import { formatPermutationCountForConfig } from "../permutations.js";
import {
  excludedToString,
  mountClassPopovers,
  type ClassPopoverController,
} from "./classPopover.js";
import {
  emptyStrength,
  parseWords,
  renderPermutations,
  renderStrength,
  type EntropyApi,
} from "./entropy.js";
import {
  clearSettings,
  defaultSettings,
  DICT_STORAGE_KEY,
  loadSettings,
  parseExcludedCharset,
  saveSettings,
  type SavedSettings,
} from "./settings.js";
import { cycleThemeMode, getThemeMode, initTheme } from "./theme.js";
import { initTooltips } from "./tooltip.js";
import { loadPassHash, mountHashEncode, triggerHashPreview, encodeForBatch, formatBatchOutput, type PassHashApi } from "./hashEncode.js";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readBaseConfig(): PasswordConfig {
  const lengthSlider = document.getElementById("length-slider") as HTMLInputElement;
  const lengthInput = document.getElementById("length") as HTMLInputElement;

  let length = Number.parseInt(lengthInput?.value ?? "32", 10) || 0;
  if (lengthSlider) {
    length = Number.parseInt(lengthSlider.value, 10) || length;
  }

  let classes = 0;
  const toggles = document.querySelectorAll<HTMLButtonElement>(
    "#class-checks .class-toggle[data-class]",
  );
  if (toggles.length === 0) {
    classes = CharClass.DEFAULT_CHARSET;
  } else {
    for (const btn of toggles) {
      if (btn.getAttribute("aria-pressed") === "true") {
        classes |= Number.parseInt(btn.dataset.flag ?? "0", 10);
      }
    }
  }

  let flags = 0;
  if ((document.getElementById("flag-look-alike") as HTMLInputElement)?.checked) {
    flags |= GeneratorFlag.EXCLUDE_LOOK_ALIKE;
  }
  if ((document.getElementById("flag-every-group") as HTMLInputElement)?.checked) {
    flags |= GeneratorFlag.CHAR_FROM_EVERY_GROUP;
  }

  return {
    length,
    classes,
    flags,
    customCharset: (document.getElementById("custom-charset") as HTMLInputElement)?.value ?? "",
    excludedCharset: "",
  };
}

function readConfig(popover: ClassPopoverController): PasswordConfig {
  const config = readBaseConfig();
  config.excludedCharset = excludedToString(popover.getExcludedSet());
  return config;
}

function syncLengthControls(from: "slider" | "number"): void {
  const slider = document.getElementById("length-slider") as HTMLInputElement;
  const number = document.getElementById("length") as HTMLInputElement;
  if (!slider || !number) return;

  if (from === "slider") {
    number.value = slider.value;
  } else {
    slider.value = number.value;
  }
}

function enforceLengthBounds(config: PasswordConfig): void {
  const slider = document.getElementById("length-slider") as HTMLInputElement;
  const number = document.getElementById("length") as HTMLInputElement;
  if (!slider || !number) return;

  const min = minLength(config);
  const max = 128;
  slider.min = String(min);
  number.min = String(min);
  slider.max = String(max);
  number.max = String(max);

  let length = config.length;
  if (length < min) length = min;
  if (length > max) length = max;

  slider.value = String(length);
  number.value = String(length);
}

function applySettingsToDom(settings: SavedSettings): void {
  const slider = document.getElementById("length-slider") as HTMLInputElement;
  const number = document.getElementById("length") as HTMLInputElement;
  if (slider) slider.value = String(settings.length);
  if (number) number.value = String(settings.length);

  const lookAlike = document.getElementById("flag-look-alike") as HTMLInputElement;
  const everyGroup = document.getElementById("flag-every-group") as HTMLInputElement;
  const customCharset = document.getElementById("custom-charset") as HTMLInputElement;
  if (lookAlike) lookAlike.checked = settings.excludeLookAlike;
  if (everyGroup) everyGroup.checked = settings.pickFromEachGroup;
  if (customCharset) customCharset.value = settings.customCharset;
}

function scheduleSave(popover: ClassPopoverController): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const config = readConfig(popover);
    saveSettings(config, popover.getEnabledClasses(), getThemeMode());
  }, 200);
}

function updatePermutationsDisplay(config: PasswordConfig): void {
  renderPermutations(formatPermutationCountForConfig(config));
}

function renderWordList(entropy: EntropyApi): void {
  const wordList = document.getElementById("word-list");
  if (!wordList) return;
  const words = entropy.dictionary_words();
  wordList.replaceChildren(
    ...words.map((word) => {
      const item = document.createElement("li");
      item.textContent = word;
      return item;
    }),
  );
}

function persistWords(entropy: EntropyApi): void {
  localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(entropy.dictionary_words()));
}

function loadSavedWords(entropy: EntropyApi): void {
  try {
    const saved = JSON.parse(localStorage.getItem(DICT_STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) {
      entropy.set_words(saved.filter((word) => typeof word === "string"));
    }
  } catch {
    entropy.clear_words();
  }
  renderWordList(entropy);
}

async function loadEntropy(): Promise<EntropyApi> {
  const url = new URL("../../pkg/entropy-calc/entropy_calc.js", import.meta.url).href;
  const mod = await import(/* @vite-ignore */ url);
  await mod.default();
  return mod as EntropyApi;
}

function doGenerate(
  popover: ClassPopoverController,
  entropy: EntropyApi | null,
  statusEl: HTMLElement | null,
): void {
  const config = readConfig(popover);
  updatePermutationsDisplay(config);

  if (!isValid(config)) {
    const output = document.getElementById("output") as HTMLInputElement;
    if (output) output.value = "";
    if (entropy) emptyStrength(entropy.Quality);
    if (statusEl) statusEl.textContent = "Invalid password generator configuration.";
    triggerHashPreview();
    return;
  }

  try {
    const password = generatePassword(config);
    const output = document.getElementById("output") as HTMLInputElement;
    if (output) output.value = password;
    if (entropy) {
      renderStrength(entropy.analyze_password(password), entropy.Quality);
    }
    if (statusEl) statusEl.textContent = "";
    triggerHashPreview();
  } catch (error) {
    if (statusEl) statusEl.textContent = `Generation failed: ${error}`;
  }
}

function clampBatchCount(raw: number): number {
  if (Number.isNaN(raw)) return 10;
  return Math.min(50, Math.max(5, raw));
}

function updateBatchButtonLabel(): void {
  const countInput = document.getElementById("batch-count") as HTMLInputElement | null;
  const batchBtn = document.getElementById("generate-batch") as HTMLButtonElement | null;
  const hashBtn = document.getElementById("generate-batch-hashes") as HTMLButtonElement | null;
  if (!countInput || !batchBtn || !hashBtn) return;
  const count = clampBatchCount(Number.parseInt(countInput.value, 10));
  countInput.value = String(count);
  batchBtn.textContent = `Generate ${count} passwords`;
  hashBtn.textContent = `Generate ${count} hashes`;
}

function updateBatchHashButtonState(passHashReady: boolean): void {
  const hashBtn = document.getElementById("generate-batch-hashes") as HTMLButtonElement | null;
  if (!hashBtn) return;
  hashBtn.disabled = !passHashReady;
}

export async function initApp(): Promise<void> {
  const statusEl = document.getElementById("status");
  const generateBtn = document.getElementById("generate") as HTMLButtonElement;
  const classChecks = document.getElementById("class-checks");

  if (!classChecks || !generateBtn) {
    throw new Error("Missing required DOM elements");
  }

  const saved = loadSettings() ?? defaultSettings();
  applySettingsToDom(saved);
  initTheme(saved.theme);
  initTooltips();

  let entropy: EntropyApi | null = null;
  let passHashApi: PassHashApi | null = null;
  let batchPasswords: string[] = [];

  const batchCountInput = document.getElementById("batch-count") as HTMLInputElement;
  const batchBtn = document.getElementById("generate-batch") as HTMLButtonElement;
  const batchHashBtn = document.getElementById("generate-batch-hashes") as HTMLButtonElement;
  const batchStatus = document.getElementById("batch-status");
  const batchOutput = document.getElementById("batch-encoded-output") as HTMLTextAreaElement;

  updateBatchButtonLabel();
  batchCountInput?.addEventListener("input", updateBatchButtonLabel);
  batchCountInput?.addEventListener("change", updateBatchButtonLabel);

  document.getElementById("copy-batch-encoded")?.addEventListener("click", async () => {
    if (!batchOutput?.value) return;
    const btn = document.getElementById("copy-batch-encoded") as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(batchOutput.value);
      btn.classList.add("copied");
      btn.setAttribute("aria-label", "Copied!");
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.setAttribute("aria-label", "Copy batch output");
      }, 1500);
    } catch {
      /* clipboard unavailable */
    }
  });

  const popover = mountClassPopovers(
    classChecks,
    readBaseConfig,
    () => {
      applyConfigChange(popover, entropy, statusEl, { refreshPopover: false });
    },
    {
      enabledClasses: saved.enabledClasses,
      excludedSet: parseExcludedCharset(saved.excludedCharset),
    },
  );

  batchBtn?.addEventListener("click", () => {
    const config = readConfig(popover);
    if (!isValid(config)) {
      if (batchStatus) batchStatus.textContent = "Invalid password generator configuration.";
      return;
    }

    const count = clampBatchCount(Number.parseInt(batchCountInput?.value ?? "10", 10));
    if (batchCountInput) batchCountInput.value = String(count);
    updateBatchButtonLabel();

    batchBtn.disabled = true;
    if (batchStatus) batchStatus.textContent = `Generating ${count} passwords…`;

    try {
      const passwords: string[] = [];
      for (let i = 0; i < count; i += 1) {
        passwords.push(generatePassword(config));
      }
      batchPasswords = passwords;
      if (batchOutput) batchOutput.value = passwords.join("\n");
      if (batchStatus) batchStatus.textContent = `Generated ${count} passwords.`;
      updateBatchHashButtonState(passHashApi !== null);
    } catch (error) {
      if (batchStatus) batchStatus.textContent = `Batch failed: ${error}`;
    } finally {
      batchBtn.disabled = false;
    }
  });

  batchHashBtn?.addEventListener("click", async () => {
    if (!passHashApi) {
      if (batchStatus) batchStatus.textContent = "Loading WASM modules…";
      return;
    }

    const config = readConfig(popover);
    if (!isValid(config)) {
      if (batchStatus) batchStatus.textContent = "Invalid password generator configuration.";
      return;
    }

    const count = clampBatchCount(Number.parseInt(batchCountInput?.value ?? "10", 10));
    if (batchCountInput) batchCountInput.value = String(count);
    updateBatchButtonLabel();

    let passwords = batchPasswords;
    if (passwords.length === 0) {
      if (batchStatus) batchStatus.textContent = `Generating ${count} passwords…`;
      passwords = [];
      for (let i = 0; i < count; i += 1) {
        passwords.push(generatePassword(config));
      }
      batchPasswords = passwords;
    }

    const total = passwords.length;
    batchHashBtn.disabled = true;
    if (batchStatus) batchStatus.textContent = `Encoding ${total} passwords…`;

    try {
      const entries: { plaintext: string; hash: string }[] = [];
      for (let i = 0; i < total; i += 1) {
        const password = passwords[i]!;
        if (batchStatus) batchStatus.textContent = `Encoding ${i + 1}/${total}…`;
        const result = await encodeForBatch(password, passHashApi);
        if (!result.ok || !result.hash) {
          if (batchStatus) {
            batchStatus.textContent = result.error ?? `Encode failed at password ${i + 1}.`;
          }
          return;
        }
        entries.push({ plaintext: password, hash: result.hash });
      }
      if (batchOutput) batchOutput.value = formatBatchOutput(entries);
      if (batchStatus) batchStatus.textContent = `Encoded ${total} passwords.`;
    } catch (error) {
      if (batchStatus) batchStatus.textContent = `Batch failed: ${error}`;
    } finally {
      updateBatchHashButtonState(passHashApi !== null);
    }
  });

  function applyConfigChange(
    pop: ClassPopoverController,
    ent: EntropyApi | null,
    status: HTMLElement | null,
    options?: { refreshPopover?: boolean; persist?: boolean },
  ): void {
    let config = readConfig(pop);
    enforceLengthBounds(config);
    config = readConfig(pop);
    if (options?.refreshPopover) {
      pop.refresh();
      config = readConfig(pop);
    }
    updatePermutationsDisplay(config);
    doGenerate(pop, ent, status);
    if (options?.persist !== false) {
      scheduleSave(pop);
    }
  }

  function refreshUi(): void {
    applyConfigChange(popover, entropy, statusEl, { refreshPopover: true });
  }

  function analyzeCurrentOutput(): void {
    if (!entropy) return;
    const value = (document.getElementById("output") as HTMLInputElement)?.value ?? "";
    if (!value) {
      emptyStrength(entropy.Quality);
      updatePermutationsDisplay(readConfig(popover));
      return;
    }
    renderStrength(entropy.analyze_password(value), entropy.Quality);
  }

  const lengthSlider = document.getElementById("length-slider");
  const lengthNumber = document.getElementById("length");
  lengthSlider?.addEventListener("input", () => {
    syncLengthControls("slider");
    refreshUi();
  });
  lengthNumber?.addEventListener("input", () => {
    syncLengthControls("number");
    refreshUi();
  });
  lengthNumber?.addEventListener("change", () => {
    syncLengthControls("number");
    refreshUi();
  });

  for (const id of ["custom-charset", "flag-look-alike", "flag-every-group"]) {
    document.getElementById(id)?.addEventListener("input", refreshUi);
    document.getElementById(id)?.addEventListener("change", refreshUi);
  }

  generateBtn.addEventListener("click", () => {
    applyConfigChange(popover, entropy, statusEl, { refreshPopover: false });
  });

  document.getElementById("output")?.addEventListener("input", analyzeCurrentOutput);

  document.getElementById("copy-password")?.addEventListener("click", async () => {
    const output = document.getElementById("output") as HTMLInputElement;
    const btn = document.getElementById("copy-password") as HTMLButtonElement;
    if (!output?.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      btn.classList.add("copied");
      btn.setAttribute("aria-label", "Copied!");
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.setAttribute("aria-label", "Copy password");
      }, 1500);
    } catch {
      /* clipboard unavailable */
    }
  });

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    cycleThemeMode();
    scheduleSave(popover);
  });

  document.getElementById("reset-settings")?.addEventListener("click", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    clearSettings();
    const defaults = defaultSettings();
    applySettingsToDom(defaults);
    popover.setEnabledClasses(defaults.enabledClasses);
    popover.setExcludedSet(new Set());
    initTheme(defaults.theme);
    if (entropy) {
      entropy.clear_words();
      renderWordList(entropy);
    }
    const customWords = document.getElementById("custom-words") as HTMLTextAreaElement;
    if (customWords) customWords.value = "";
    applyConfigChange(popover, entropy, statusEl, {
      refreshPopover: true,
      persist: false,
    });
  });

  applyConfigChange(popover, entropy, statusEl, { refreshPopover: true });
  generateBtn.disabled = false;

  try {
    if (statusEl) statusEl.textContent = "Loading WASM modules…";
    entropy = await loadEntropy();
    loadSavedWords(entropy);
    const passHash = await loadPassHash();
    passHashApi = passHash;
    mountHashEncode(passHash);
    updateBatchHashButtonState(true);
    updatePermutationsDisplay(readConfig(popover));
    const generated = (document.getElementById("output") as HTMLInputElement)?.value ?? "";
    if (generated && entropy) {
      renderStrength(entropy.analyze_password(generated), entropy.Quality);
    }
    if (statusEl) statusEl.textContent = "";
    scheduleSave(popover);
  } catch (error) {
    if (statusEl) statusEl.textContent = `Failed to load WASM: ${error}`;
    console.error(error);
  }

  document.getElementById("add-words")?.addEventListener("click", () => {
    if (!entropy) return;
    const textarea = document.getElementById("custom-words") as HTMLTextAreaElement;
    const words = parseWords(textarea?.value ?? "");
    if (words.length === 0) return;
    entropy.add_words(words);
    if (textarea) textarea.value = "";
    persistWords(entropy);
    renderWordList(entropy);
    analyzeCurrentOutput();
  });

  document.getElementById("clear-words")?.addEventListener("click", () => {
    if (!entropy) return;
    entropy.clear_words();
    persistWords(entropy);
    renderWordList(entropy);
    analyzeCurrentOutput();
  });
}
