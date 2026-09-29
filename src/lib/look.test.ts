import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  BACKGROUND_IDS,
  FONT_IDS,
  FONTS,
  PREVIEW_FONTS_HREF,
  SPARKLE_BASE,
  activeFontHref,
  fontById,
  isBackgroundId,
  isFontId,
  normalizeBackground,
  normalizeFont,
} from "./look.ts";
import { THEME_KEY, readLocalTheme, writeLocalTheme } from "./theme.ts";

test("background and font ids reject unknown values", () => {
  assert.equal(isBackgroundId("pink"), true);
  assert.equal(isBackgroundId("gold"), false);
  assert.equal(normalizeBackground("teal"), "teal");
  assert.equal(normalizeBackground("rainbow"), "black");
  assert.equal(normalizeBackground(null), "black");
  assert.equal(isFontId("pacifico"), true);
  assert.equal(isFontId("comic"), false);
  assert.equal(normalizeFont("dancing"), "dancing");
  assert.equal(normalizeFont(""), "classic");
});

test("script and display faces keep a readable body companion", () => {
  const pacifico = fontById("pacifico");
  const dancing = fontById("dancing");
  const fredoka = fontById("fredoka");
  const baloo = fontById("baloo");
  assert.match(pacifico.serif, /Pacifico/);
  assert.match(pacifico.sans, /Quicksand/);
  assert.doesNotMatch(pacifico.sans, /Pacifico/);
  assert.match(dancing.serif, /Dancing Script/);
  assert.match(dancing.sans, /Outfit/);
  assert.doesNotMatch(dancing.sans, /Dancing Script/);
  assert.match(fredoka.serif, /Fredoka/);
  assert.match(fredoka.sans, /Nunito/);
  assert.match(baloo.serif, /Baloo 2/);
  assert.match(baloo.sans, /Nunito/);
  assert.ok(pacifico.headingScale > 1);
  assert.ok(dancing.headingScale > 1);
  assert.equal(fontById("classic").google, null);
  assert.match(activeFontHref("quicksand") ?? "", /display=swap/);
  assert.match(PREVIEW_FONTS_HREF, /display=swap/);
});

test("stored themes without a look fall back to black sparkle and classic", () => {
  const mem = new Map<string, string>();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify({ main: "#112233", secondary: "#fff" }));
    const legacy = readLocalTheme();
    assert.equal(legacy.main, "#112233");
    assert.equal(legacy.secondary, "#ffffff");
    assert.equal(legacy.background, "black");
    assert.equal(legacy.font, "classic");

    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ main: "nope", secondary: "#abcdef", background: "rainbow", font: "comic" }),
    );
    const junk = readLocalTheme();
    assert.equal(junk.main, "#d4af37");
    assert.equal(junk.secondary, "#abcdef");
    assert.equal(junk.background, "black");
    assert.equal(junk.font, "classic");

    writeLocalTheme({ main: "#010203", secondary: "#040506", background: "teal", font: "baloo" });
    const saved = readLocalTheme();
    assert.deepEqual(saved, {
      main: "#010203",
      secondary: "#040506",
      background: "teal",
      font: "baloo",
    });
  } finally {
    globalThis.localStorage = previous;
  }
});

test("boot script applies every sparkle and font before paint", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(html, /localStorage\.getItem\("beauti_theme"\)/);
  assert.match(html, /data-bg/);
  assert.match(html, /data-font/);
  assert.match(html, /display=swap/);
  for (const id of BACKGROUND_IDS) {
    assert.match(html, new RegExp(`\\b${id}\\b`));
  }
  for (const id of FONT_IDS) {
    assert.match(html, new RegExp(`\\b${id}\\b`));
  }
  for (const font of FONTS) {
    const family = font.serif.split(",")[0]?.replaceAll('"', "") ?? "";
    assert.match(html, new RegExp(family.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(html, new RegExp(SPARKLE_BASE.pink, "i"));
  assert.match(html, new RegExp(SPARKLE_BASE.teal, "i"));
});

test("theme look migration is a wrangler file and is not exec'd from ensureCatalog", () => {
  const boot = readFileSync(new URL("../../worker/bootstrap.ts", import.meta.url), "utf8");
  assert.doesNotMatch(boot, /0014_theme_look\.sql/);
  assert.match(boot, /0014/);
  const sql = readFileSync(new URL("../../migrations/0014_theme_look.sql", import.meta.url), "utf8");
  assert.match(sql, /theme_background/);
  assert.match(sql, /theme_font/);
  assert.match(sql, /ALTER TABLE users ADD COLUMN theme_background/);
  assert.match(sql, /ALTER TABLE users ADD COLUMN theme_font/);
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(statements, /db\.exec/);
  assert.equal(statements.trim().split(";").filter((part) => part.trim()).length, 2);
});
