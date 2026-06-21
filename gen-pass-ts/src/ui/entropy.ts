export const qualityNames = ["Bad", "Poor", "Weak", "Good", "Excellent"];

export const qualityColors: Record<number, string> = {
  0: "var(--meter-bad)",
  1: "var(--meter-poor)",
  2: "var(--meter-weak)",
  3: "var(--meter-good)",
  4: "var(--meter-excellent)",
};

export interface EntropyResult {
  entropy_bits: number;
  quality: number;
  score: number;
}

export interface EntropyApi {
  analyze_password(password: string): EntropyResult;
  add_words(words: string[]): void;
  set_words(words: string[]): void;
  clear_words(): void;
  dictionary_words(): string[];
  Quality: { Bad: number; Poor: number; Weak: number; Good: number; Excellent: number };
}

export function renderStrength(result: EntropyResult, _Quality: EntropyApi["Quality"]): void {
  const qualityName = qualityNames[result.quality] ?? "Unknown";
  const fill = Math.max(0, Math.min(100, (result.entropy_bits / 120) * 100));

  const qualityEl = document.getElementById("quality-stat");
  const entropyEl = document.getElementById("entropy-stat");
  const meter = document.getElementById("meter");

  if (qualityEl) qualityEl.textContent = qualityName;
  if (entropyEl) entropyEl.textContent = `${result.entropy_bits.toFixed(2)} bits`;
  if (meter) {
    meter.style.width = `${fill}%`;
    meter.style.backgroundColor = qualityColors[result.quality] ?? "var(--muted)";
  }
}

export function renderPermutations(text: string): void {
  const el = document.getElementById("permutations-stat");
  if (el) el.textContent = text;
}

export function emptyStrength(Quality: EntropyApi["Quality"]): void {
  renderStrength({ entropy_bits: 0, quality: Quality.Bad, score: 0 }, Quality);
}

export function parseWords(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}
