export type ThemeMode = "system" | "light" | "dark";

let currentMode: ThemeMode = "system";
let mediaQuery: MediaQueryList | null = null;
let onMediaChange: ((event: MediaQueryListEvent) => void) | null = null;

function effectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyEffective(mode: ThemeMode): void {
  document.documentElement.dataset.theme = effectiveTheme(mode);
}

function detachMediaListener(): void {
  if (mediaQuery && onMediaChange) {
    mediaQuery.removeEventListener("change", onMediaChange);
  }
  mediaQuery = null;
  onMediaChange = null;
}

function attachMediaListener(): void {
  detachMediaListener();
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  onMediaChange = () => {
    if (currentMode === "system") {
      applyEffective("system");
    }
  };
  mediaQuery.addEventListener("change", onMediaChange);
}

export function initTheme(mode: ThemeMode): void {
  currentMode = mode;
  applyEffective(mode);
  if (mode === "system") {
    attachMediaListener();
  } else {
    detachMediaListener();
  }
  updateThemeButtonLabel();
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

export function cycleThemeMode(): ThemeMode {
  const order: ThemeMode[] = ["system", "light", "dark"];
  const next = order[(order.indexOf(currentMode) + 1) % order.length]!;
  initTheme(next);
  return next;
}

export function updateThemeButtonLabel(): void {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const labels: Record<ThemeMode, string> = {
    system: "Theme: System",
    light: "Theme: Light",
    dark: "Theme: Dark",
  };
  btn.setAttribute("data-tooltip", labels[currentMode]);
  btn.setAttribute("aria-label", labels[currentMode]);
}
