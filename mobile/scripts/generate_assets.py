#!/usr/bin/env python3
"""One-off generator for the app's placeholder avatar images and app icon.

Draws simple line-art on the app's existing cream/taupe palette (see
lib/theme/app_colors.dart and Design-lapidation.md), matching the
diamond/gem + line-art-icons-in-circles visual identity already used
ad-hoc via Icons.diamond_outlined in the current screens.

Run once: `python3 scripts/generate_assets.py` from mobile/. Output is
committed as PNGs under assets/images/ and assets/icon/ — this script is
not shipped as part of the app.
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(ROOT, "assets", "images")
ICON_DIR = os.path.join(ROOT, "assets", "icon")

# AppColors palette (lib/theme/app_colors.dart)
BADGE_BG = (0xEF, 0xE8, 0xDC, 255)      # circle/badge background
ACCENT = (0x8B, 0x73, 0x55, 255)        # accentPrimary, line-art stroke
PRIMARY_BG = (0xF7, 0xF1, 0xE8, 255)    # cream app background

SS = 4  # supersampling factor for anti-aliased strokes


def _canvas(size):
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def _finish(img, size):
    return img.resize((size, size), Image.LANCZOS)


def _cap(draw, xy, r, fill):
    x, y = xy
    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def draw_bust_avatar(size, female, out_path):
    img, draw = _canvas(size)
    big = size * SS
    cx, cy = big / 2, big / 2
    r = big / 2

    draw.ellipse([0, 0, big, big], fill=BADGE_BG)

    stroke = int(big * 0.045)
    head_r = big * 0.155
    head_cy = cy - big * 0.14

    # Head outline
    draw.ellipse(
        [cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r],
        outline=ACCENT, width=stroke,
    )
    _cap(draw, (cx - head_r, head_cy), stroke / 2, ACCENT)
    _cap(draw, (cx + head_r, head_cy), stroke / 2, ACCENT)

    # Shoulders: bottom half of a wide ellipse, clipped by the circular frame
    shoulder_w = big * 0.62
    shoulder_h = big * 0.62
    shoulder_cy = cy + big * 0.34
    bbox = [cx - shoulder_w / 2, shoulder_cy - shoulder_h / 2,
            cx + shoulder_w / 2, shoulder_cy + shoulder_h / 2]
    draw.arc(bbox, start=200, end=340, fill=ACCENT, width=stroke)
    import math
    for angle in (200, 340):
        rad = math.radians(angle)
        px = cx + (shoulder_w / 2) * math.cos(rad)
        py = shoulder_cy + (shoulder_h / 2) * math.sin(rad)
        _cap(draw, (px, py), stroke / 2, ACCENT)

    if female:
        # Subtle flowing-hair arcs framing the head, thinner stroke
        hair_stroke = int(stroke * 0.6)
        hair_r = head_r * 1.18
        hair_bbox = [cx - hair_r, head_cy - hair_r * 1.05, cx + hair_r, head_cy + hair_r * 1.35]
        draw.arc(hair_bbox, start=200, end=340, fill=ACCENT, width=hair_stroke)

    # Circular frame outline
    frame_stroke = int(big * 0.02)
    draw.ellipse([frame_stroke, frame_stroke, big - frame_stroke, big - frame_stroke],
                 outline=ACCENT, width=frame_stroke)

    out = _finish(img, size)
    out.save(out_path)
    print(f"wrote {out_path}")


def _gem_points(cx, cy, w, h):
    top_y = cy - h / 2
    girdle_y = cy - h / 6
    bottom_y = cy + h / 2
    return {
        "table_l": (cx - w * 0.22, top_y),
        "table_r": (cx + w * 0.22, top_y),
        "girdle_l": (cx - w * 0.5, girdle_y),
        "girdle_r": (cx + w * 0.5, girdle_y),
        "bottom": (cx, bottom_y),
    }


def draw_gem(draw, cx, cy, w, h, stroke, fill_bg=None):
    pts = _gem_points(cx, cy, w, h)
    outline = [pts["table_l"], pts["table_r"], pts["girdle_r"], pts["bottom"], pts["girdle_l"]]
    if fill_bg:
        draw.polygon(outline, fill=fill_bg)
    draw.line(outline + [outline[0]], fill=ACCENT, width=stroke, joint="curve")
    # Pavilion facets
    draw.line([pts["table_l"], pts["bottom"]], fill=ACCENT, width=stroke)
    draw.line([pts["table_r"], pts["bottom"]], fill=ACCENT, width=stroke)
    for p in outline + [pts["bottom"]]:
        _cap(draw, p, stroke / 2, ACCENT)


def draw_app_icon(size, out_path, background, transparent_bg, gem_scale):
    img, draw = _canvas(size)
    big = size * SS
    if not transparent_bg:
        draw.rectangle([0, 0, big, big], fill=background)
    stroke = int(big * 0.018)
    draw_gem(draw, big / 2, big / 2, big * gem_scale, big * gem_scale * 1.15, stroke)
    out = _finish(img, size)
    out.save(out_path)
    print(f"wrote {out_path}")


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    os.makedirs(ICON_DIR, exist_ok=True)

    draw_bust_avatar(512, female=True, out_path=os.path.join(IMAGES_DIR, "avatar_female.png"))
    draw_bust_avatar(512, female=False, out_path=os.path.join(IMAGES_DIR, "avatar_male.png"))

    # Full-bleed icon (iOS / legacy Android): opaque cream background
    draw_app_icon(1024, os.path.join(ICON_DIR, "app_icon.png"),
                  background=PRIMARY_BG, transparent_bg=False, gem_scale=0.5)

    # Adaptive-icon foreground (Android): transparent bg, gem within the ~66% safe zone
    draw_app_icon(1024, os.path.join(ICON_DIR, "app_icon_foreground.png"),
                  background=None, transparent_bg=True, gem_scale=0.42)


if __name__ == "__main__":
    main()
