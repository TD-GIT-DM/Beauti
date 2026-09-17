#!/usr/bin/env python3
"""Generate dark-gold Beauti icon + splash PNGs (no Apple account required)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / "resources"
PUBLIC = ROOT / "public"
IOS_ICONSET = ROOT / "resources" / "ios" / "AppIcon.appiconset"
IOS_SPLASHSET = ROOT / "resources" / "ios" / "Splash.imageset"

BG = (7, 7, 7, 255)
GOLD = (212, 175, 55, 255)
GOLD_SOFT = (227, 209, 152, 255)

ICON_SPECS = [
    ("AppIcon-20.png", 20),
    ("AppIcon-29.png", 29),
    ("AppIcon-40.png", 40),
    ("AppIcon-58.png", 58),
    ("AppIcon-60.png", 60),
    ("AppIcon-76.png", 76),
    ("AppIcon-80.png", 80),
    ("AppIcon-87.png", 87),
    ("AppIcon-120.png", 120),
    ("AppIcon-152.png", 152),
    ("AppIcon-167.png", 167),
    ("AppIcon-180.png", 180),
    ("AppIcon-1024.png", 1024),
]


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/Library/Fonts/Georgia.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def _glitter(draw: ImageDraw.ImageDraw, size: int) -> None:
    rng_seed = 21217555
    count = max(18, size // 28)
    for i in range(count):
        rng_seed = (1103515245 * rng_seed + 12345) & 0x7FFFFFFF
        x = rng_seed % size
        rng_seed = (1103515245 * rng_seed + 12345) & 0x7FFFFFFF
        y = rng_seed % size
        rng_seed = (1103515245 * rng_seed + 12345) & 0x7FFFFFFF
        r = 1 + (rng_seed % max(1, size // 220))
        alpha = 70 + (rng_seed % 90)
        color = (*GOLD_SOFT[:3], alpha)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def render_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    _glitter(draw, size)

    inset = max(2, round(size * 0.08))
    stroke = max(1, round(size * 0.018))
    draw.rounded_rectangle(
        (inset, inset, size - inset - 1, size - inset - 1),
        radius=max(4, round(size * 0.18)),
        outline=GOLD,
        width=stroke,
    )

    font = _font(max(10, round(size * 0.58)))
    text = "B"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.03
    draw.text((x, y), text, font=font, fill=GOLD)

    img = Image.alpha_composite(img, overlay)
    if size >= 256:
        glow = img.filter(ImageFilter.GaussianBlur(radius=size / 90))
        img = Image.blend(glow, img, 0.82)
        # restore opaque background after blur
        base = Image.new("RGBA", (size, size), BG)
        img = Image.alpha_composite(base, img)
    return img.convert("RGBA")


def render_splash(size: int = 2732) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    cx = cy = size / 2
    for i, radius in enumerate((980, 640, 420)):
        alpha = 28 - i * 6
        draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            outline=(*GOLD[:3], alpha),
            width=3,
        )
    mark = render_icon(640)
    img.paste(mark, (round(cx - 320), round(cy - 320)), mark)
    word_font = _font(120)
    word = "BEAUTI"
    bbox = draw.textbbox((0, 0), word, font=word_font)
    tw = bbox[2] - bbox[0]
    draw.text(((size - tw) / 2 - bbox[0], cy + 360), word, font=word_font, fill=GOLD_SOFT)
    return img


def write_contents_json() -> None:
    # Xcode 14+ single 1024 is enough; keep a complete set for older templates.
    entries = [
        ("AppIcon-20.png", "iphone", "20x20", "1x"),
        ("AppIcon-40.png", "iphone", "20x20", "2x"),
        ("AppIcon-60.png", "iphone", "20x20", "3x"),
        ("AppIcon-29.png", "iphone", "29x29", "1x"),
        ("AppIcon-58.png", "iphone", "29x29", "2x"),
        ("AppIcon-87.png", "iphone", "29x29", "3x"),
        ("AppIcon-40.png", "iphone", "40x40", "1x"),
        ("AppIcon-80.png", "iphone", "40x40", "2x"),
        ("AppIcon-120.png", "iphone", "40x40", "3x"),
        ("AppIcon-120.png", "iphone", "60x60", "2x"),
        ("AppIcon-180.png", "iphone", "60x60", "3x"),
        ("AppIcon-20.png", "ipad", "20x20", "1x"),
        ("AppIcon-40.png", "ipad", "20x20", "2x"),
        ("AppIcon-29.png", "ipad", "29x29", "1x"),
        ("AppIcon-58.png", "ipad", "29x29", "2x"),
        ("AppIcon-40.png", "ipad", "40x40", "1x"),
        ("AppIcon-80.png", "ipad", "40x40", "2x"),
        ("AppIcon-76.png", "ipad", "76x76", "1x"),
        ("AppIcon-152.png", "ipad", "76x76", "2x"),
        ("AppIcon-167.png", "ipad", "83.5x83.5", "2x"),
        ("AppIcon-1024.png", "ios-marketing", "1024x1024", "1x"),
    ]
    parts = []
    for filename, idiom, size, scale in entries:
        if idiom == "ios-marketing":
            parts.append(
                "    {\n"
                f'      "filename" : "{filename}",\n'
                f'      "idiom" : "ios-marketing",\n'
                '      "platform" : "ios",\n'
                f'      "size" : "{size}"\n'
                "    }"
            )
        else:
            parts.append(
                "    {\n"
                f'      "filename" : "{filename}",\n'
                f'      "idiom" : "{idiom}",\n'
                f'      "scale" : "{scale}",\n'
                f'      "size" : "{size}"\n'
                "    }"
            )
    body = ",\n".join(parts)
    text = (
        "{\n"
        '  "images" : [\n'
        f"{body}\n"
        "  ],\n"
        '  "info" : {\n'
        '    "author" : "xcode",\n'
        '    "version" : 1\n'
        "  }\n"
        "}\n"
    )
    (IOS_ICONSET / "Contents.json").write_text(text)
    (IOS_SPLASHSET / "Contents.json").write_text(
        "{\n"
        '  "images" : [\n'
        "    {\n"
        '      "filename" : "Default@2x~universal~anyany.png",\n'
        '      "idiom" : "universal",\n'
        '      "scale" : "1x"\n'
        "    }\n"
        "  ],\n"
        '  "info" : {\n'
        '    "author" : "xcode",\n'
        '    "version" : 1\n'
        "  }\n"
        "}\n"
    )


def main() -> None:
    RESOURCES.mkdir(parents=True, exist_ok=True)
    IOS_ICONSET.mkdir(parents=True, exist_ok=True)
    IOS_SPLASHSET.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    master = render_icon(1024)
    master.save(RESOURCES / "icon.png", "PNG")
    master.save(PUBLIC / "apple-touch-icon.png", "PNG")

    for name, size in ICON_SPECS:
        render_icon(size).save(IOS_ICONSET / name, "PNG")

    splash = render_splash(2732)
    splash.save(RESOURCES / "splash.png", "PNG")
    splash.save(IOS_SPLASHSET / "Default@2x~universal~anyany.png", "PNG")

    write_contents_json()
    print(f"Wrote icons to {IOS_ICONSET}")
    print(f"Wrote splash to {IOS_SPLASHSET}")


if __name__ == "__main__":
    main()
