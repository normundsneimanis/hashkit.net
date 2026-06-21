import {
  CharClass,
  type PasswordConfig,
  passwordGroups,
} from "../passwordGenerator.js";

export const CLASS_OPTIONS = [
  ["LOWER_LETTERS", "Lowercase", CharClass.LOWER_LETTERS] as const,
  ["UPPER_LETTERS", "Uppercase", CharClass.UPPER_LETTERS] as const,
  ["NUMBERS", "Numbers", CharClass.NUMBERS] as const,
  ["BRACES", "Braces ()[]{}", CharClass.BRACES] as const,
  ["PUNCTUATION", "Punctuation ,.:;", CharClass.PUNCTUATION] as const,
  ["QUOTES", 'Quotes "\'"', CharClass.QUOTES] as const,
  ["DASHES", "Dashes -/\\_|", CharClass.DASHES] as const,
  ["MATH", "Math !*+<=>?", CharClass.MATH] as const,
  ["LOGOGRAMS", "Logograms #$%&@^`~", CharClass.LOGOGRAMS] as const,
  ["EASCII", "Extended ASCII", CharClass.EASCII] as const,
];

const DEFAULT_ENABLED = new Set(["LOWER_LETTERS", "UPPER_LETTERS", "NUMBERS"]);

const CHEVRON_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function charsForClass(
  config: PasswordConfig,
  classFlag: number,
): string[] {
  const groupConfig: PasswordConfig = {
    ...config,
    classes: classFlag,
    customCharset: "",
    excludedCharset: "",
  };
  return passwordGroups(groupConfig).flat();
}

export function customCharsForConfig(config: PasswordConfig): string[] {
  if (!config.customCharset) {
    return [];
  }
  const groupConfig: PasswordConfig = {
    ...config,
    classes: 0,
    excludedCharset: "",
  };
  return passwordGroups(groupConfig).flat();
}

export function poolChars(config: PasswordConfig): string[] {
  const poolConfig: PasswordConfig = {
    ...config,
    excludedCharset: "",
  };
  if (!poolConfig.classes && !poolConfig.customCharset) {
    return [];
  }
  return passwordGroups(poolConfig).flat();
}

export function excludedToString(set: Set<string>): string {
  return [...set].join("");
}

export function pruneExcludedSet(
  excludedSet: Set<string>,
  config: PasswordConfig,
): Set<string> {
  const pool = new Set(poolChars(config));
  return new Set([...excludedSet].filter((ch) => pool.has(ch)));
}

export interface ClassPopoverInitial {
  enabledClasses?: string[];
  excludedSet?: Set<string>;
}

export interface ClassPopoverController {
  refresh(options?: { preserveOpen?: boolean }): void;
  getExcludedSet(): Set<string>;
  setExcludedSet(set: Set<string>): void;
  getEnabledClasses(): string[];
  isClassEnabled(classKey: string): boolean;
}

export function mountClassPopovers(
  container: HTMLElement,
  readBaseConfig: () => PasswordConfig,
  onChange: () => void,
  initial?: ClassPopoverInitial,
): ClassPopoverController {
  let excludedSet = new Set(initial?.excludedSet ?? []);
  let openPopover: HTMLElement | null = null;
  let openClassKey: string | null = null;
  let pendingEnabled: Set<string> | null = initial?.enabledClasses
    ? new Set(initial.enabledClasses)
    : null;

  function readEnabledState(): Map<string, boolean> {
    const state = new Map<string, boolean>();
    for (const btn of container.querySelectorAll<HTMLButtonElement>(
      ".class-toggle[data-class]",
    )) {
      const key = btn.dataset.class;
      if (key) state.set(key, btn.getAttribute("aria-pressed") === "true");
    }
    if (pendingEnabled) {
      for (const [key] of CLASS_OPTIONS) {
        state.set(key, pendingEnabled.has(key));
      }
      pendingEnabled = null;
    } else if (state.size === 0) {
      for (const [key] of CLASS_OPTIONS) {
        state.set(key, DEFAULT_ENABLED.has(key));
      }
    }
    return state;
  }

  function closePopover() {
    if (openPopover) {
      openPopover.hidden = true;
      const row = openPopover.closest(".class-chip");
      const btn = row?.querySelector(".class-menu-btn") as HTMLButtonElement | null;
      btn?.setAttribute("aria-expanded", "false");
      openPopover = null;
      openClassKey = null;
    }
  }

  function openPopoverByKey(classKey: string) {
    const popover = container.querySelector<HTMLElement>(
      `.popover[data-class="${classKey}"]`,
    );
    if (!popover) return;
    const row = popover.closest(".class-chip");
    const btn = row?.querySelector(".class-menu-btn") as HTMLButtonElement | null;
    popover.hidden = false;
    btn?.setAttribute("aria-expanded", "true");
    openPopover = popover;
    openClassKey = classKey;
  }

  function toggleChar(ch: string) {
    if (excludedSet.has(ch)) {
      excludedSet.delete(ch);
    } else {
      excludedSet.add(ch);
    }
    refresh({ preserveOpen: true });
    onChange();
  }

  function setGroupExcluded(chars: readonly string[], excluded: boolean) {
    for (const ch of chars) {
      if (excluded) {
        excludedSet.add(ch);
      } else {
        excludedSet.delete(ch);
      }
    }
    refresh({ preserveOpen: true });
    onChange();
  }

  function createCharTile(ch: string): HTMLButtonElement {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "char-tile";
    const enabled = !excludedSet.has(ch);
    tile.classList.add(enabled ? "enabled" : "disabled");
    tile.title = enabled ? `Click to exclude “${ch}”` : `Click to include “${ch}”`;
    tile.textContent = ch;
    tile.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleChar(ch);
    });
    return tile;
  }

  function createPopover(
    classKey: string,
    chars: readonly string[],
    menuBtn: HTMLButtonElement,
  ): HTMLDivElement {
    const popover = document.createElement("div");
    popover.className = "popover";
    popover.hidden = true;
    popover.dataset.class = classKey;
    popover.setAttribute("role", "dialog");

    const header = document.createElement("div");
    header.className = "popover-header";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "popover-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closePopover();
    });

    header.append(closeBtn);

    const actions = document.createElement("div");
    actions.className = "panel-actions";
    actions.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const selectAllBtn = document.createElement("button");
    selectAllBtn.type = "button";
    selectAllBtn.textContent = "Select all";
    selectAllBtn.addEventListener("click", () => setGroupExcluded(chars, false));

    const deselectAllBtn = document.createElement("button");
    deselectAllBtn.type = "button";
    deselectAllBtn.className = "secondary";
    deselectAllBtn.textContent = "Deselect all";
    deselectAllBtn.addEventListener("click", () => setGroupExcluded(chars, true));

    actions.append(selectAllBtn, deselectAllBtn);

    const tiles = document.createElement("div");
    tiles.className = "char-tiles";
    tiles.append(...chars.map(createCharTile));

    popover.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    popover.append(header, actions, tiles);

    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (openPopover === popover) {
        closePopover();
        return;
      }
      closePopover();
      popover.hidden = false;
      menuBtn.setAttribute("aria-expanded", "true");
      openPopover = popover;
      openClassKey = classKey;
    });

    return popover;
  }

  function configForListing(enabledState: Map<string, boolean>): PasswordConfig {
    const base = readBaseConfig();
    let classes = 0;
    for (const [key, , flag] of CLASS_OPTIONS) {
      if (enabledState.get(key)) {
        classes |= flag;
      }
    }
    return { ...base, classes, excludedCharset: "" };
  }

  function renderChip(
    classKey: string,
    label: string,
    classFlag: number,
    enabled: boolean,
    listConfig: PasswordConfig,
  ): HTMLElement {
    const chip = document.createElement("div");
    chip.className = "class-chip";
    chip.dataset.class = classKey;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "class-toggle";
    toggle.dataset.class = classKey;
    toggle.dataset.flag = String(classFlag);
    toggle.setAttribute("aria-pressed", String(enabled));

    const toggleLabel = document.createElement("span");
    toggleLabel.className = "class-toggle-label";
    toggleLabel.textContent = label;

    const count = document.createElement("span");
    count.className = "class-count";

    toggle.append(toggleLabel, count);

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const pressed = toggle.getAttribute("aria-pressed") === "true";
      toggle.setAttribute("aria-pressed", String(!pressed));
      refresh();
      onChange();
    });

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "class-menu-btn";
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", `Customize ${label}`);
    menuBtn.innerHTML = CHEVRON_SVG;

    chip.append(toggle, menuBtn);

    if (enabled) {
      const chars = charsForClass(listConfig, classFlag);
      const enabledCount = chars.filter((ch) => !excludedSet.has(ch)).length;
      count.textContent = `${enabledCount}/${chars.length}`;
      count.classList.toggle("warning", enabledCount === 0);
      menuBtn.hidden = chars.length === 0;
      if (chars.length > 0) {
        chip.append(createPopover(classKey, chars, menuBtn));
      }
    } else {
      menuBtn.hidden = true;
      count.textContent = "";
    }

    return chip;
  }

  function renderCustomChip(listConfig: PasswordConfig): HTMLElement | null {
    const chars = customCharsForConfig(listConfig);
    if (chars.length === 0) {
      return null;
    }

    const chip = document.createElement("div");
    chip.className = "class-chip";
    chip.dataset.class = "CUSTOM";

    const label = document.createElement("span");
    label.className = "class-toggle-label custom-label";
    label.textContent = "Custom";

    const count = document.createElement("span");
    count.className = "class-count";
    const enabledCount = chars.filter((ch) => !excludedSet.has(ch)).length;
    count.textContent = `${enabledCount}/${chars.length}`;
    count.classList.toggle("warning", enabledCount === 0);

    const spacer = document.createElement("span");
    spacer.className = "class-toggle custom-static";
    spacer.append(label, count);

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "class-menu-btn";
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Customize custom characters");
    menuBtn.innerHTML = CHEVRON_SVG;

    chip.append(spacer, menuBtn, createPopover("CUSTOM", chars, menuBtn));
    return chip;
  }

  function refresh(options?: { preserveOpen?: boolean }) {
    const savedClassKey = options?.preserveOpen ? openClassKey : null;
    if (!options?.preserveOpen) {
      closePopover();
    } else {
      openPopover = null;
      openClassKey = null;
    }

    const enabledState = readEnabledState();
    const listConfig = configForListing(enabledState);
    const baseConfig = readBaseConfig();
    excludedSet = pruneExcludedSet(excludedSet, {
      ...baseConfig,
      excludedCharset: excludedToString(excludedSet),
    });

    container.replaceChildren();
    for (const [key, label, flag] of CLASS_OPTIONS) {
      container.append(renderChip(key, label, flag, enabledState.get(key) ?? false, listConfig));
    }

    const customChip = renderCustomChip(listConfig);
    if (customChip) {
      container.append(customChip);
    }

    const pool = poolChars(listConfig);
    const summary = document.getElementById("charset-summary");
    if (summary) {
      const enabledCount = pool.filter((ch) => !excludedSet.has(ch)).length;
      summary.textContent = `${enabledCount} of ${pool.length} characters enabled`;
      summary.classList.toggle("warning", enabledCount === 0 && pool.length > 0);
    }

    if (savedClassKey) {
      openPopoverByKey(savedClassKey);
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (
      !event.target.closest(".popover") &&
      !event.target.closest(".class-menu-btn")
    ) {
      closePopover();
    }
  });

  return {
    refresh,
    getExcludedSet: () => excludedSet,
    setExcludedSet: (set: Set<string>) => {
      excludedSet = new Set(set);
    },
    getEnabledClasses: () => {
      const state = readEnabledState();
      return CLASS_OPTIONS.filter(([key]) => state.get(key) === true).map(([key]) => key);
    },
    isClassEnabled: (classKey: string) => {
      const btn = container.querySelector<HTMLButtonElement>(
        `.class-toggle[data-class="${classKey}"]`,
      );
      return btn?.getAttribute("aria-pressed") === "true";
    },
  };
}
