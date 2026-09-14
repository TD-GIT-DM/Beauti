import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AA_CONTRAST,
  DEFAULT_THEME,
  INK_DARK,
  INK_LIGHT,
  autoContrast,
  contrastRatio,
  ensureContrast,
  relativeLuminance,
  themeTokens,
  type ThemeColors,
} from "./theme.ts";

const palettes: Array<[string, ThemeColors]> = [
  ["default", DEFAULT_THEME],
  ["light secondary", { main: "#d4af37", secondary: "#f3eee4" }],
  ["white secondary", { main: "#d4af37", secondary: "#ffffff" }],
  ["gold on gold", { main: "#d4af37", secondary: "#d4af37" }],
  ["mid bronze", { main: "#d4af37", secondary: "#8a7a50" }],
  ["pale gold vault", { main: "#e8d48b", secondary: "#f7f1dc" }],
  ["dark accent", { main: "#3a2208", secondary: "#070707" }],
  ["dark on dark", { main: "#1a1008", secondary: "#0a0a0a" }],
  ["near black", { main: "#d4af37", secondary: "#111111" }],
];

function assertReadable(label: string, fg: string, bg: string, min = AA_CONTRAST) {
  const ratio = contrastRatio(fg, bg);
  assert.ok(
    ratio >= min,
    `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1 (need ${min}:1)`,
  );
}

test("relative luminance matches WCAG white and black", () => {
  assert.equal(relativeLuminance("#ffffff"), 1);
  assert.ok(relativeLuminance("#000000") < 0.001);
});

test("autoContrast prefers cream on the default vault and dark ink on a light vault", () => {
  assert.equal(autoContrast(DEFAULT_THEME.secondary), INK_LIGHT);
  assert.equal(autoContrast("#f3eee4"), INK_DARK);
  assert.equal(autoContrast("#ffffff"), INK_DARK);
});

test("ensureContrast leaves default gold on the dark vault", () => {
  assert.equal(ensureContrast(DEFAULT_THEME.main, DEFAULT_THEME.secondary, AA_CONTRAST), DEFAULT_THEME.main);
});

test("default dark-gold tokens keep cream ink and gold accents", () => {
  const t = themeTokens(DEFAULT_THEME);
  assert.equal(t["--ink"], INK_LIGHT);
  assert.equal(t["--gold"], DEFAULT_THEME.main);
  assert.equal(t["--gold-text"], DEFAULT_THEME.main);
  assert.equal(t["--bg"], DEFAULT_THEME.secondary);
  assert.equal(t["color-scheme"], "dark");
  assert.equal(t["--on-gold"], INK_DARK);
});

test("every palette derives AA body, muted, accent, and on-fill text", () => {
  for (const [name, theme] of palettes) {
    const t = themeTokens(theme);
    assertReadable(`${name} ink/bg`, t["--ink"], t["--bg"]);
    assertReadable(`${name} ink-soft/bg`, t["--ink-soft"], t["--bg"]);
    assertReadable(`${name} muted/bg`, t["--muted"], t["--bg"]);
    assertReadable(`${name} gold-text/bg`, t["--gold-text"], t["--bg"]);
    assertReadable(`${name} gold-text-bright/bg`, t["--gold-text-bright"], t["--bg"]);
    assertReadable(`${name} on-gold/gold`, t["--on-gold"], t["--gold"]);
    assertReadable(`${name} on-gold-bright/bright`, t["--on-gold-bright"], t["--gold-bright"]);
    assertReadable(`${name} ink/card`, t["--ink"], t["--bg-card"]);
    assertReadable(`${name} ink/input`, t["--ink"], t["--input-bg"]);
    assertReadable(`${name} ink/raised`, t["--ink"], t["--bg-raised"]);
    assertReadable(`${name} ink/panel`, t["--ink"], t["--panel-bg"]);
    assertReadable(`${name} danger/bg`, t["--danger"], t["--bg"]);
  }
});

test("a very light secondary flips ink dark and darkens gold text", () => {
  const t = themeTokens({ main: "#d4af37", secondary: "#f3eee4" });
  assert.equal(t["--ink"], INK_DARK);
  assert.equal(t["color-scheme"], "light");
  assert.notEqual(t["--gold-text"], "#d4af37");
  assert.ok(relativeLuminance(t["--gold-text"]) < relativeLuminance("#d4af37"));
});

test("dark main on the default vault uses light text on the fill", () => {
  const t = themeTokens({ main: "#3a2208", secondary: "#070707" });
  assert.equal(t["--on-gold"], INK_LIGHT);
  assert.equal(t["--ink"], INK_LIGHT);
});
