const SHOW_DELAY_MS = 200;

export function initTooltips(root: ParentNode = document): void {
  let tipEl: HTMLDivElement | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let activeTarget: HTMLElement | null = null;

  function ensureTip(): HTMLDivElement {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "tooltip";
      tipEl.hidden = true;
      document.body.append(tipEl);
    }
    return tipEl;
  }

  function hide(): void {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    activeTarget = null;
    if (tipEl) tipEl.hidden = true;
  }

  function positionTip(target: HTMLElement, text: string): void {
    const tip = ensureTip();
    tip.textContent = text;
    tip.hidden = false;

    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;

    if (left < 8) left = 8;
    if (left + tipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tipRect.width - 8;
    }
    if (top + tipRect.height > window.innerHeight - 8) {
      top = rect.top - tipRect.height - 8;
    }

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function scheduleShow(target: HTMLElement): void {
    const text = target.dataset.tooltip?.trim();
    if (!text) return;

    if (showTimer) clearTimeout(showTimer);
    activeTarget = target;
    showTimer = setTimeout(() => {
      showTimer = null;
      if (activeTarget !== target) return;
      positionTip(target, text);
    }, SHOW_DELAY_MS);
  }

  for (const el of root.querySelectorAll<HTMLElement>("[data-tooltip]")) {
    if (el.title) {
      el.dataset.tooltip ??= el.title;
      el.removeAttribute("title");
    }

    el.addEventListener("mouseenter", () => scheduleShow(el));
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focus", () => scheduleShow(el));
    el.addEventListener("blur", hide);
  }

  window.addEventListener(
    "scroll",
    () => {
      if (activeTarget && tipEl && !tipEl.hidden) {
        positionTip(activeTarget, activeTarget.dataset.tooltip ?? "");
      }
    },
    true,
  );
  window.addEventListener("resize", hide);
}
