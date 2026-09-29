/** Sparkle backgrounds and site fonts. Pure data: safe for the Worker and the boot script. */

export const BACKGROUND_IDS = ["black", "pink", "teal"] as const;
export type BackgroundId = (typeof BACKGROUND_IDS)[number];

export const FONT_IDS = [
  "classic",
  "quicksand",
  "comfortaa",
  "fredoka",
  "baloo",
  "pacifico",
  "dancing",
] as const;
export type FontId = (typeof FONT_IDS)[number];

/** Fixed field color before the secondary slider tints it. Black follows the slider instead. */
export const SPARKLE_BASE: Record<BackgroundId, string> = {
  black: "#070707",
  pink: "#5a2348",
  teal: "#0f4c50",
};

export interface BackgroundOption {
  id: BackgroundId;
  label: string;
  detail: string;
}

export const BACKGROUNDS: readonly BackgroundOption[] = [
  { id: "black", label: "Black Sparkle", detail: "Current glitter" },
  { id: "pink", label: "Pink Sparkle", detail: "Rose glitter" },
  { id: "teal", label: "Teal Sparkle", detail: "Aqua glitter" },
];

export interface FontOption {
  id: FontId;
  label: string;
  detail: string;
  /** Body line shown in the picker, in the body face. */
  sample: string;
  sans: string;
  serif: string;
  /** Slight size bump when the face runs small. 1 is the current size. */
  bodyScale: number;
  /** Extra heading size for display and script faces. */
  headingScale: number;
  /**
   * Google Fonts css2 family query (no leading ?family=).
   * Null when the face is already on the page (Outfit + Cormorant).
   */
  google: string | null;
}

export const FONTS: readonly FontOption[] = [
  {
    id: "classic",
    label: "Classic",
    detail: "Current serif and sans",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Outfit", system-ui, sans-serif',
    serif: '"Cormorant Garamond", "Times New Roman", serif',
    bodyScale: 1,
    headingScale: 1,
    google: null,
  },
  {
    id: "quicksand",
    label: "Rounded",
    detail: "Quicksand",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Quicksand", "Outfit", system-ui, sans-serif',
    serif: '"Quicksand", "Outfit", system-ui, sans-serif',
    bodyScale: 1.03,
    headingScale: 1,
    google: "Quicksand:wght@400;500;600;700",
  },
  {
    id: "comfortaa",
    label: "Soft",
    detail: "Comfortaa",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Comfortaa", "Outfit", system-ui, sans-serif',
    serif: '"Comfortaa", "Outfit", system-ui, sans-serif',
    bodyScale: 1.04,
    headingScale: 1,
    google: "Comfortaa:wght@400;500;600;700",
  },
  {
    id: "fredoka",
    label: "Bubbly",
    detail: "Fredoka headings, Nunito body",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Nunito", "Outfit", system-ui, sans-serif',
    serif: '"Fredoka", "Nunito", system-ui, sans-serif',
    bodyScale: 1.02,
    headingScale: 1.04,
    google: "Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700",
  },
  {
    id: "baloo",
    label: "Playful",
    detail: "Baloo 2 headings, Nunito body",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Nunito", "Outfit", system-ui, sans-serif',
    serif: '"Baloo 2", "Nunito", system-ui, sans-serif',
    bodyScale: 1.02,
    headingScale: 1.06,
    google: "Baloo+2:wght@500;600;700&family=Nunito:wght@400;500;600;700",
  },
  {
    id: "pacifico",
    label: "Script",
    detail: "Pacifico headings, Quicksand body",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Quicksand", "Outfit", system-ui, sans-serif',
    serif: '"Pacifico", "Quicksand", cursive',
    bodyScale: 1.03,
    headingScale: 1.12,
    google: "Pacifico&family=Quicksand:wght@400;500;600;700",
  },
  {
    id: "dancing",
    label: "Handwritten",
    detail: "Dancing Script headings, Outfit body",
    sample: "Deals, wishes, and restocks stay easy to read.",
    sans: '"Outfit", system-ui, sans-serif',
    serif: '"Dancing Script", "Outfit", cursive',
    bodyScale: 1,
    headingScale: 1.16,
    google: "Dancing+Script:wght@500;600;700",
  },
];

/** One stylesheet for the settings picker so every sample can draw its real face. */
export const PREVIEW_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700&family=Comfortaa:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700&family=Pacifico&family=Quicksand:wght@400;500;600;700&display=swap";

const FONT_BY_ID = new Map(FONTS.map((font) => [font.id, font]));

export function isBackgroundId(value: string): value is BackgroundId {
  return (BACKGROUND_IDS as readonly string[]).includes(value);
}

export function isFontId(value: string): value is FontId {
  return (FONT_IDS as readonly string[]).includes(value);
}

export function normalizeBackground(value: unknown): BackgroundId {
  return typeof value === "string" && isBackgroundId(value) ? value : "black";
}

export function normalizeFont(value: unknown): FontId {
  return typeof value === "string" && isFontId(value) ? value : "classic";
}

export function fontById(value: unknown): FontOption {
  return FONT_BY_ID.get(normalizeFont(value)) ?? FONTS[0];
}

export function activeFontHref(value: unknown): string | null {
  const google = fontById(value).google;
  if (!google) return null;
  return `https://fonts.googleapis.com/css2?family=${google}&display=swap`;
}
