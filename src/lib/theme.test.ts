import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AA_CONTRAST,
  DEFAULT_THEME,
  INK_DARK,
  INK_LIGHT,
  autoContrast,
  canvasColor,
  contrastRatio,
  ensureContrast,
  hexToRgb,
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

test("black sparkle keeps the secondary color as the page background", () => {
  assert.equal(canvasColor("black", "#123456"), "#123456");
  assert.equal(canvasColor("black", DEFAULT_THEME.secondary), DEFAULT_THEME.secondary);
  const plain = themeTokens({ main: DEFAULT_THEME.main, secondary: DEFAULT_THEME.secondary });
  const black = themeTokens(DEFAULT_THEME);
  assert.equal(black["--bg"], plain["--bg"]);
  assert.equal(black["--ink"], plain["--ink"]);
  assert.equal(black["--gold-text"], plain["--gold-text"]);
  assert.equal(black["--bg-card"], plain["--bg-card"]);
  assert.equal(black["color-scheme"], plain["color-scheme"]);
});

test("pink and teal sparkle stay in their color families on the default vault", () => {
  const pink = canvasColor("pink", DEFAULT_THEME.secondary);
  const teal = canvasColor("teal", DEFAULT_THEME.secondary);
  const pinkRgb = hexToRgb(pink);
  const tealRgb = hexToRgb(teal);
  assert.ok(pinkRgb.r > pinkRgb.g + 15, `pink canvas ${pink} should stay rose`);
  assert.ok(tealRgb.g > tealRgb.r + 15 && tealRgb.b > tealRgb.r + 15, `teal canvas ${teal} should stay aqua`);
  assert.ok(relativeLuminance(pink) < 0.2);
  assert.ok(relativeLuminance(teal) < 0.2);
  assert.notEqual(pink, DEFAULT_THEME.secondary);
  assert.notEqual(teal, DEFAULT_THEME.secondary);
});

const sparklePalettes: Array<[string, ThemeColors]> = [
  ["pink on dark", { main: "#d4af37", secondary: "#070707", background: "pink" }],
  ["teal on dark", { main: "#d4af37", secondary: "#070707", background: "teal" }],
  ["pink on white", { main: "#d4af37", secondary: "#ffffff", background: "pink" }],
  ["teal on white", { main: "#d4af37", secondary: "#ffffff", background: "teal" }],
  ["pink on cream", { main: "#d4af37", secondary: "#f3eee4", background: "pink" }],
  ["teal on cream", { main: "#083838", secondary: "#e8fff8", background: "teal" }],
  ["pink with dark accent", { main: "#3a2208", secondary: "#f7f1dc", background: "pink" }],
  ["teal with near-black accent", { main: "#111111", secondary: "#070707", background: "teal" }],
  ["pink on bronze", { main: "#d4af37", secondary: "#8a7a50", background: "pink" }],
  ["teal on bronze", { main: "#ff99cc", secondary: "#8a7a50", background: "teal" }],
  ["pink with hot accent", { main: "#ff4fa3", secondary: "#101010", background: "pink" }],
  ["black with light vault", { main: "#d4af37", secondary: "#f3eee4", background: "black" }],
];

test("sparkle backgrounds keep AA text with main and secondary colors", () => {
  for (const [name, theme] of sparklePalettes) {
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
    assertReadable(`${name} ok/bg`, t["--ok"], t["--bg"]);
  }
});

test("a light secondary lifts pink sparkle so ink can flip dark", () => {
  const dark = themeTokens({ main: "#d4af37", secondary: "#070707", background: "pink" });
  const light = themeTokens({ main: "#d4af37", secondary: "#ffffff", background: "pink" });
  assert.equal(dark["color-scheme"], "dark");
  assert.equal(light["color-scheme"], "light");
  assert.equal(light["--ink"], INK_DARK);
  assert.ok(relativeLuminance(light["--bg"]) > relativeLuminance(dark["--bg"]));
});
