export const DEFAULT_THEME = {
  main: "#d4af37",
  secondary: "#070707",
} as const;

export const THEME_KEY = "beauti_theme";

export interface ThemeColors {
  main: string;
  secondary: string;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (isHexColor(withHash)) return withHash.toLowerCase();
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace("#", "");
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hue) * 255),
    b: Math.round(hue2rgb(p, q, hue - 1 / 3) * 255),
  };
}

export function hexToHsl(hex: string): HslColor {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(hsl: HslColor): string {
  const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(r, g, b);
}

/**
 * Near-black / gray hex colors have no chroma, so hue is undefined and
 * `hslToRgb` ignores H when S is 0 (or L is ~0 / ~1). These floors keep a
 * dragged hue alive through 8-bit hex and visible on the vault surfaces.
 */
export const HUE_VISIBLE_MIN_S = 0.46;
export const HUE_VISIBLE_MIN_L = 0.1;
export const HUE_VISIBLE_MAX_L = 0.88;

export function hueIsExpressible(hsl: HslColor): boolean {
  return hsl.s > 0.02 && hsl.l > 0.03 && hsl.l < 0.97;
}

export function withVisibleHue(hsl: HslColor): HslColor {
  return {
    h: ((hsl.h % 360) + 360) % 360,
    s: Math.max(hsl.s, HUE_VISIBLE_MIN_S),
    l: Math.min(HUE_VISIBLE_MAX_L, Math.max(hsl.l, HUE_VISIBLE_MIN_L)),
  };
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function mixHex(hex: string, toward: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}

export function readLocalTheme(): ThemeColors {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw) as Partial<ThemeColors>;
    const main = normalizeHex(parsed.main ?? "") ?? DEFAULT_THEME.main;
    const secondary = normalizeHex(parsed.secondary ?? "") ?? DEFAULT_THEME.secondary;
    return { main, secondary };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function writeLocalTheme(theme: ThemeColors): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}

export function applyTheme(theme: ThemeColors): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const main = normalizeHex(theme.main) ?? DEFAULT_THEME.main;
  const secondary = normalizeHex(theme.secondary) ?? DEFAULT_THEME.secondary;
  const gold = hexToRgb(main);
  const goldHsl = rgbToHsl(gold.r, gold.g, gold.b);
  const bg = hexToRgb(secondary);
  const bgHsl = rgbToHsl(bg.r, bg.g, bg.b);
  const lightSurface = bgHsl.l > 0.55;
  const soft = hslToHex({
    h: goldHsl.h,
    s: clamp01(goldHsl.s * 0.72),
    l: clamp01(goldHsl.l + 0.06),
  });
  const bright = hslToHex({
    h: goldHsl.h,
    s: clamp01(goldHsl.s * 0.88),
    l: clamp01(Math.min(0.88, goldHsl.l + 0.22)),
  });
  const brightRgb = hexToRgb(bright);
  const raised = mixHex(secondary, lightSurface ? "#000000" : "#ffffff", lightSurface ? 0.06 : 0.045);
  const card = mixHex(secondary, lightSurface ? "#000000" : "#ffffff", lightSurface ? 0.08 : 0.06);
  const ink = lightSurface ? "#1a1610" : "#f4efe6";
  const inkSoft = lightSurface ? "#3c382f" : "#d8d2c6";
  const muted = lightSurface ? "#5c574e" : "#a39e94";
  const onGold = goldHsl.l > 0.62 ? "#16110a" : "#f7f1e6";

  root.style.setProperty("--bg", secondary);
  root.style.setProperty("--bg-rgb", `${bg.r} ${bg.g} ${bg.b}`);
  root.style.setProperty("--bg-raised", raised);
  root.style.setProperty("--bg-card", card);
  root.style.setProperty("--ink", ink);
  root.style.setProperty("--ink-soft", inkSoft);
  root.style.setProperty("--muted", muted);
  root.style.setProperty("--gold", main);
  root.style.setProperty("--gold-rgb", `${gold.r} ${gold.g} ${gold.b}`);
  root.style.setProperty("--gold-soft", soft);
  root.style.setProperty("--gold-bright", bright);
  root.style.setProperty("--gold-bright-rgb", `${brightRgb.r} ${brightRgb.g} ${brightRgb.b}`);
  root.style.setProperty("--gold-dim", `rgb(var(--gold-rgb) / 0.18)`);
  root.style.setProperty("--line", `rgb(var(--gold-rgb) / 0.28)`);
  root.style.setProperty("--on-gold", onGold);
  root.style.setProperty("color-scheme", lightSurface ? "light" : "dark");
  document.body.style.backgroundColor = secondary;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", secondary);
}

export function applyStoredTheme(): ThemeColors {
  const theme = typeof localStorage === "undefined" ? { ...DEFAULT_THEME } : readLocalTheme();
  applyTheme(theme);
  return theme;
}
