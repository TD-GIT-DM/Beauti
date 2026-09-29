import { isNativeRuntime } from "./native.ts";
import {
  activeFontHref,
  fontById,
  normalizeBackground,
  normalizeFont,
  SPARKLE_BASE,
  type BackgroundId,
  type FontId,
} from "./look.ts";

export const DEFAULT_THEME = {
  main: "#d4af37",
  secondary: "#070707",
  background: "black" as BackgroundId,
  font: "classic" as FontId,
};

export const THEME_KEY = "beauti_theme";

export interface ThemeColors {
  main: string;
  secondary: string;
  background?: BackgroundId;
  font?: FontId;
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

/** Soft cream / ink used for auto black-or-white text. */
export const INK_LIGHT = "#f4efe6";
export const INK_DARK = "#1a1610";
export const AA_CONTRAST = 4.5;

export function mixHex(hex: string, toward: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}

function srgbChannelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a 6-digit hex color. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick readable ink against `bg`: soft cream/brown when they meet AA, else black or white. */
export function autoContrast(bg: string, dark = INK_DARK, light = INK_LIGHT): string {
  const soft = contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
  if (contrastRatio(soft, bg) >= AA_CONTRAST) return soft;
  return contrastRatio("#ffffff", bg) >= contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
}

/**
 * Keep as much of `fg` as possible, mixing toward black or white until `minRatio`
 * against `bg`. Falls back to auto ink when the hue cannot reach the target.
 */
export function ensureContrast(fg: string, bg: string, minRatio: number, fallback?: string): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const toward = autoContrast(bg, "#000000", "#ffffff");
  let lo = 0;
  let hi = 1;
  let found = false;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mixHex(fg, toward, mid), bg) >= minRatio) {
      hi = mid;
      found = true;
    } else {
      lo = mid;
    }
  }
  if (found) return mixHex(fg, toward, hi);
  const auto = fallback ?? autoContrast(bg);
  const pole = toward === "#000000" ? "#000000" : "#ffffff";
  return contrastRatio(auto, bg) >= contrastRatio(pole, bg) ? auto : pole;
}

/** Mute ink toward the background without dropping below `minRatio`. */
export function fadeInk(ink: string, bg: string, preferredMix: number, minRatio: number): string {
  const preferred = mixHex(ink, bg, preferredMix);
  if (contrastRatio(preferred, bg) >= minRatio) return preferred;
  let lo = 0;
  let hi = preferredMix;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mixHex(ink, bg, mid), bg) >= minRatio) lo = mid;
    else hi = mid;
  }
  return mixHex(ink, bg, lo);
}

function readableSurface(bg: string, ink: string, toward: string, amount: number): string {
  const preferred = mixHex(bg, toward, amount);
  if (contrastRatio(ink, preferred) >= AA_CONTRAST) return preferred;
  if (contrastRatio(ink, bg) >= AA_CONTRAST) return bg;
  const pole = relativeLuminance(ink) > relativeLuminance(bg) ? "#000000" : "#ffffff";
  let lo = 0;
  let hi = 1;
  let found = false;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(ink, mixHex(bg, pole, mid)) >= AA_CONTRAST) {
      hi = mid;
      found = true;
    } else {
      lo = mid;
    }
  }
  return found ? mixHex(bg, pole, hi) : mixHex(bg, pole, 1);
}

export interface ThemeTokens {
  "--bg": string;
  "--bg-rgb": string;
  "--bg-raised": string;
  "--bg-card": string;
  "--ink": string;
  "--ink-rgb": string;
  "--ink-soft": string;
  "--muted": string;
  "--gold": string;
  "--gold-rgb": string;
  "--gold-soft": string;
  "--gold-bright": string;
  "--gold-bright-rgb": string;
  "--gold-text": string;
  "--gold-text-bright": string;
  "--gold-dim": string;
  "--line": string;
  "--on-gold": string;
  "--on-gold-bright": string;
  "--input-bg": string;
  "--chip-bg": string;
  "--panel-bg": string;
  "--danger": string;
  "--ok": string;
  "--shadow": string;
  "--spark-1-rgb": string;
  "--spark-2-rgb": string;
  "--spark-3-rgb": string;
  "--spark-hot-rgb": string;
  "--spark-glow-rgb": string;
  "color-scheme": "light" | "dark";
}

function lerpHue(from: number, to: number, amount: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return (from + delta * amount + 360) % 360;
}

function rgbChannels(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

/**
 * Page field color. Black Sparkle keeps the secondary slider as the background
 * (the current vault). Pink and Teal keep their sparkle color, and the slider
 * tints that field so contrast can follow both.
 */
export function canvasColor(background: BackgroundId, secondary: string): string {
  const sec = normalizeHex(secondary) ?? DEFAULT_THEME.secondary;
  if (background === "black") return sec;
  const base = hexToHsl(SPARKLE_BASE[background]);
  const user = hexToHsl(sec);
  const lightVault = user.l >= 0.62;
  const l = lightVault
    ? clamp01(base.l * 0.22 + user.l * 0.78)
    : clamp01(base.l * 0.86 + user.l * 0.14);
  const pull = user.s > 0.12 ? 0.16 : 0;
  const h = lerpHue(base.h, user.h, pull);
  const s = lightVault
    ? clamp01(Math.max(0.16, base.s * 0.58 + user.s * 0.12))
    : clamp01(Math.max(0.26, base.s * 0.92 + user.s * 0.04));
  return hslToHex({ h, s, l });
}

function sparkChannels(
  background: BackgroundId,
  canvas: string,
  main: string,
  ink: string,
  bright: string,
): { one: string; two: string; three: string; hot: string; glow: string } {
  if (background === "black") {
    const light = relativeLuminance(canvas) > 0.45;
    return {
      one: rgbChannels(bright),
      two: rgbChannels(ink),
      three: rgbChannels(main),
      hot: rgbChannels(light ? "#6a6156" : "#fff4dc"),
      glow: rgbChannels(main),
    };
  }
  const light = relativeLuminance(canvas) > 0.4;
  if (background === "pink") {
    return light
      ? {
          one: rgbChannels("#a33d6e"),
          two: rgbChannels("#6e2448"),
          three: rgbChannels("#d47aa0"),
          hot: rgbChannels("#ffffff"),
          glow: rgbChannels("#e7a0c0"),
        }
      : {
          one: rgbChannels("#ffd0e4"),
          two: rgbChannels("#fff6fb"),
          three: rgbChannels("#f2a3c4"),
          hot: rgbChannels("#ffffff"),
          glow: rgbChannels("#e86aa6"),
        };
  }
  return light
    ? {
        one: rgbChannels("#1c7c7a"),
        two: rgbChannels("#0d4a4c"),
        three: rgbChannels("#8fd4cf"),
        hot: rgbChannels("#ffffff"),
        glow: rgbChannels("#7dccc6"),
      }
    : {
        one: rgbChannels("#c9fff6"),
        two: rgbChannels("#f3fffd"),
        three: rgbChannels("#7ee0d8"),
        hot: rgbChannels("#ffffff"),
        glow: rgbChannels("#2bbbad"),
      };
}

export function themeTokens(theme: ThemeColors): ThemeTokens {
  const main = normalizeHex(theme.main) ?? DEFAULT_THEME.main;
  const secondaryInput = normalizeHex(theme.secondary) ?? DEFAULT_THEME.secondary;
  const background = normalizeBackground(theme.background);
  const secondary = canvasColor(background, secondaryInput);
  const gold = hexToRgb(main);
  const goldHsl = rgbToHsl(gold.r, gold.g, gold.b);
  const bg = hexToRgb(secondary);
  const ink = autoContrast(secondary);
  const lightSurface = relativeLuminance(ink) < relativeLuminance(secondary);
  const inkRgb = hexToRgb(ink);
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
  const toward = lightSurface ? "#000000" : "#ffffff";
  const raised = readableSurface(secondary, ink, toward, lightSurface ? 0.06 : 0.045);
  const card = readableSurface(secondary, ink, toward, lightSurface ? 0.08 : 0.06);
  const inkSoft = fadeInk(ink, secondary, 0.14, AA_CONTRAST);
  const muted = fadeInk(ink, secondary, 0.36, AA_CONTRAST);
  const onGold = autoContrast(main);
  const onGoldBright = autoContrast(bright);
  const goldText = ensureContrast(main, secondary, AA_CONTRAST, ink);
  const goldTextBright = ensureContrast(bright, secondary, AA_CONTRAST, ink);
  const inputBg = readableSurface(secondary, ink, toward, lightSurface ? 0.05 : 0.07);
  const chipBg = readableSurface(secondary, ink, toward, lightSurface ? 0.07 : 0.09);
  const panelBg = readableSurface(card, ink, toward, lightSurface ? 0.02 : 0.03);
  const danger = ensureContrast("#c47a7a", secondary, AA_CONTRAST, ink);
  const ok = ensureContrast("#8aa37a", secondary, AA_CONTRAST, ink);
  const sparks = sparkChannels(background, secondary, main, ink, bright);

  return {
    "--bg": secondary,
    "--bg-rgb": `${bg.r} ${bg.g} ${bg.b}`,
    "--bg-raised": raised,
    "--bg-card": card,
    "--ink": ink,
    "--ink-rgb": `${inkRgb.r} ${inkRgb.g} ${inkRgb.b}`,
    "--ink-soft": inkSoft,
    "--muted": muted,
    "--gold": main,
    "--gold-rgb": `${gold.r} ${gold.g} ${gold.b}`,
    "--gold-soft": soft,
    "--gold-bright": bright,
    "--gold-bright-rgb": `${brightRgb.r} ${brightRgb.g} ${brightRgb.b}`,
    "--gold-text": goldText,
    "--gold-text-bright": goldTextBright,
    "--gold-dim": `rgb(var(--gold-rgb) / ${lightSurface ? 0.22 : 0.18})`,
    "--line": `rgb(var(--gold-rgb) / ${lightSurface ? 0.42 : 0.28})`,
    "--on-gold": onGold,
    "--on-gold-bright": onGoldBright,
    "--input-bg": inputBg,
    "--chip-bg": chipBg,
    "--panel-bg": panelBg,
    "--danger": danger,
    "--ok": ok,
    "--shadow": lightSurface ? "0 24px 80px rgba(0, 0, 0, 0.18)" : "0 24px 80px rgba(0, 0, 0, 0.55)",
    "--spark-1-rgb": sparks.one,
    "--spark-2-rgb": sparks.two,
    "--spark-3-rgb": sparks.three,
    "--spark-hot-rgb": sparks.hot,
    "--spark-glow-rgb": sparks.glow,
    "color-scheme": lightSurface ? "light" : "dark",
  };
}

export function readLocalTheme(): ThemeColors {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw) as Partial<ThemeColors>;
    const main = normalizeHex(parsed.main ?? "") ?? DEFAULT_THEME.main;
    const secondary = normalizeHex(parsed.secondary ?? "") ?? DEFAULT_THEME.secondary;
    return {
      main,
      secondary,
      background: normalizeBackground(parsed.background),
      font: normalizeFont(parsed.font),
    };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function writeLocalTheme(theme: ThemeColors): void {
  const stored: ThemeColors = {
    main: normalizeHex(theme.main) ?? DEFAULT_THEME.main,
    secondary: normalizeHex(theme.secondary) ?? DEFAULT_THEME.secondary,
    background: normalizeBackground(theme.background),
    font: normalizeFont(theme.font),
  };
  localStorage.setItem(THEME_KEY, JSON.stringify(stored));
}

function ensureFontStylesheet(font: FontId): void {
  const href = activeFontHref(font);
  const existing = document.getElementById("beauti-font-active");
  if (!href) {
    existing?.remove();
    return;
  }
  let link = existing as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = "beauti-font-active";
    link.rel = "stylesheet";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}

function syncNativeChrome(color: string, scheme: "light" | "dark"): void {
  if (!isNativeRuntime()) return;
  void import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) =>
      Promise.all([
        StatusBar.setBackgroundColor({ color }),
        StatusBar.setStyle({ style: scheme === "light" ? Style.Dark : Style.Light }),
      ]),
    )
    .catch(() => undefined);
}

export function applyTheme(theme: ThemeColors): void {
  if (typeof document === "undefined") return;
  const tokens = themeTokens(theme);
  const font = fontById(theme.font);
  const background = normalizeBackground(theme.background);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  root.dataset.bg = background;
  root.dataset.font = font.id;
  root.dataset.scheme = tokens["color-scheme"];
  root.style.setProperty("--font-sans", font.sans);
  root.style.setProperty("--font-serif", font.serif);
  root.style.setProperty("--body-scale", String(font.bodyScale));
  root.style.setProperty("--heading-scale", String(font.headingScale));
  root.style.backgroundColor = tokens["--bg"];
  root.style.color = tokens["--ink"];
  document.body.style.backgroundColor = tokens["--bg"];
  document.body.style.color = tokens["--ink"];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tokens["--bg"]);
  ensureFontStylesheet(font.id);
  syncNativeChrome(tokens["--bg"], tokens["color-scheme"]);
}

export function applyStoredTheme(): ThemeColors {
  const theme = typeof localStorage === "undefined" ? { ...DEFAULT_THEME } : readLocalTheme();
  applyTheme(theme);
  return theme;
}
