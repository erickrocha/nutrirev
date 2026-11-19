#!/usr/bin/env python3
"""One-off generator for the app's placeholder avatar images and app icon.
"""Asset and launcher icon generator for NutriRev mobile app.

Draws simple line-art on the app's existing cream/taupe palette (see
lib/theme/app_colors.dart and Design-lapidation.md), matching the
diamond/gem + line-art-icons-in-circles visual identity already used
ad-hoc via Icons.diamond_outlined in the current screens.
Generates:
1. `assets/icon/app_icon.png` (1024x1024 full bleed icon for iOS and legacy Android)
2. `assets/icon/app_icon_foreground.png` (1024x1024 adaptive icon foreground for Android)
3. Android launcher mipmap icons (ic_launcher.png and ic_launcher_foreground.png across all densities)
4. iOS AppIcon set icons (all required sizes in Runner.xcassets)
5. Default avatar placeholders matching NutriRev palette

Run once: `python3 scripts/generate_assets.py` from mobile/. Output is
committed as PNGs under assets/images/ and assets/icon/ — this script is
not shipped as part of the app.
Run with: `python3 mobile/scripts/generate_assets.py`
"""

import math
import os
from PIL import Image, ImageDraw
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(ROOT, "assets", "images")
ICON_DIR = os.path.join(ROOT, "assets", "icon")
ASSETS_ICON_DIR = os.path.join(ROOT, "assets", "icon")
ASSETS_IMAGES_DIR = os.path.join(ROOT, "assets", "images")
ANDROID_RES_DIR = os.path.join(ROOT, "android", "app", "src", "main", "res")
IOS_APPICON_DIR = os.path.join(ROOT, "ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")

# AppColors palette (lib/theme/app_colors.dart)
BADGE_BG = (0xEF, 0xE8, 0xDC, 255)      # circle/badge background
ACCENT = (0x8B, 0x73, 0x55, 255)        # accentPrimary, line-art stroke
PRIMARY_BG = (0xF7, 0xF1, 0xE8, 255)    # cream app background
# NutriRev Palette
PRIMARY_BLUE = (0x1D, 0x6F, 0xD1, 255)   # #1D6FD1 - NutriRev Accent Primary
DARK_BLUE    = (0x0F, 0x2A, 0x47, 255)   # #0F2A47 - Text Heading / Deep Brand Blue
ACCENT_YEL   = (0xFF, 0xC6, 0x29, 255)   # #FFC629 - NutriRev Accent Secondary (Yellow)
BG_PRIMARY   = (0xF7, 0xFA, 0xFF, 255)   # #F7FAFF - Soft Cool White / Bluish Background
BG_SURFACE   = (0xFF, 0xFF, 0xFF, 255)   # Pure White
BORDER_ICE   = (0xDC, 0xE6, 0xF2, 255)   # #DCE6F2 - Ice Blue Border
BADGE_BG     = (0xED, 0xF3, 0xFC, 255)   # #EDF3FC - Soft Subtle Blue Badge

SS = 4  # supersampling factor for anti-aliased strokes
SS = 4  # Supersampling factor for crystal-clear anti-aliasing


def _canvas(size):
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def _finish(img, size):
    return img.resize((size, size), Image.LANCZOS)


def _cap(draw, xy, r, fill):
    x, y = xy
    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)
def _draw_cap(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def draw_bust_avatar(size, female, out_path):
    img, draw = _canvas(size)
def draw_arc_with_caps(draw, cx, cy, radius, start_deg, sweep_deg, stroke_width, color):
    """Draws a smooth circular arc with rounded caps."""
    end_deg = start_deg + sweep_deg
    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
    
    # In PIL: angle 0 is 3 o'clock, 90 is 6 o'clock, 180 is 9 o'clock, 270 is 12 o'clock (top)
    draw.arc(bbox, start=start_deg, end=end_deg, fill=color, width=int(stroke_width))
    
    cap_r = stroke_width / 2.0
    for deg in (start_deg, end_deg):
        rad = math.radians(deg)
        cap_x = cx + radius * math.cos(rad)
        cap_y = cy + radius * math.sin(rad)
        _draw_cap(draw, cap_x, cap_y, cap_r, color)


def draw_nutrirev_mark(draw, cx, cy, mark_diameter, stroke_ratio=0.13):
    """Draws the official NutriRev ring mark:
    - Blue primary arc (~240 degrees)
    - Yellow accent arc (~65 degrees)
    - Both with rounded caps and balanced gaps
    """
    radius = (mark_diameter / 2.0) * (1.0 - stroke_ratio)
    stroke_width = mark_diameter * stroke_ratio

    # Blue Arc: starts at 270° (top / 12 o'clock) and sweeps clockwise 240° (to 150°)
    blue_start = 270
    blue_sweep = 240
    draw_arc_with_caps(draw, cx, cy, radius, blue_start, blue_sweep, stroke_width, PRIMARY_BLUE)

    # Yellow Arc: starts at 174° and sweeps clockwise 66° (to 240°)
    yellow_start = 174
    yellow_sweep = 66
    draw_arc_with_caps(draw, cx, cy, radius, yellow_start, yellow_sweep, stroke_width, ACCENT_YEL)


def create_app_icon(size=1024):
    """Generates the full-bleed app icon with subtle radial gradient and soft inner border."""
    big = size * SS
    cx, cy = big / 2, big / 2
    r = big / 2
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Base background: #F7FAFF
    draw.rectangle([0, 0, big, big], fill=BG_PRIMARY)

    # Subtle soft radial glow in the center for depth and modern look
    center = big / 2.0
    glow_radius = int(big * 0.45)
    glow_img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse(
        [center - glow_radius, center - glow_radius, center + glow_radius, center + glow_radius],
        fill=(255, 255, 255, 140)
    )
    glow_blurred = glow_img.filter(ImageFilter.GaussianBlur(radius=int(big * 0.12)))
    img.alpha_composite(glow_blurred)

    # Redraw context after composite
    draw = ImageDraw.Draw(img)

    # Subtle elegant rounded border outline (safe for iOS corners)
    border_inset = int(big * 0.04)
    border_r = int(big * 0.22)
    border_stroke = int(big * 0.008)
    draw.rounded_rectangle(
        [border_inset, border_inset, big - border_inset, big - border_inset],
        radius=border_r,
        outline=(0xDC, 0xE6, 0xF2, 180),
        width=border_stroke
    )

    # Mark size: ~54% of canvas (leaves generous safe zone for iOS squircles and Android circles)
    mark_diameter = big * 0.54
    draw_nutrirev_mark(draw, center, center, mark_diameter, stroke_ratio=0.135)

    return _finish(img, size)


def create_foreground_icon(size=1024):
    """Generates the Android adaptive icon foreground (transparent background, 66% safe zone)."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = big / 2.0
    # Safe zone for Android adaptive icons is 66% of the 108dp viewport (i.e. diameter <= 0.44 canvas)
    mark_diameter = big * 0.44
    draw_nutrirev_mark(draw, center, center, mark_diameter, stroke_ratio=0.135)

    return _finish(img, size)


def create_avatar(size=512, female=True):
    """Generates clean placeholder avatar using NutriRev color palette."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = big / 2.0, big / 2.0
    r = big / 2.0

    # Soft badge background
    draw.ellipse([0, 0, big, big], fill=BADGE_BG)

    stroke = int(big * 0.045)
    stroke = int(big * 0.042)
    head_r = big * 0.155
    head_cy = cy - big * 0.14

    # Head outline
    # Head outline in primary blue
    draw.ellipse(
        [cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r],
        outline=ACCENT, width=stroke,
        outline=PRIMARY_BLUE, width=stroke
    )
    _cap(draw, (cx - head_r, head_cy), stroke / 2, ACCENT)
    _cap(draw, (cx + head_r, head_cy), stroke / 2, ACCENT)
    _draw_cap(draw, cx - head_r, head_cy, stroke / 2.0, PRIMARY_BLUE)
    _draw_cap(draw, cx + head_r, head_cy, stroke / 2.0, PRIMARY_BLUE)

    # Shoulders: bottom half of a wide ellipse, clipped by the circular frame
    # Shoulders
    shoulder_w = big * 0.62
    shoulder_h = big * 0.62
    shoulder_cy = cy + big * 0.34
    bbox = [cx - shoulder_w / 2, shoulder_cy - shoulder_h / 2,
            cx + shoulder_w / 2, shoulder_cy + shoulder_h / 2]
    draw.arc(bbox, start=200, end=340, fill=ACCENT, width=stroke)
    import math
    bbox = [cx - shoulder_w / 2.0, shoulder_cy - shoulder_h / 2.0,
            cx + shoulder_w / 2.0, shoulder_cy + shoulder_h / 2.0]
    draw.arc(bbox, start=200, end=340, fill=PRIMARY_BLUE, width=stroke)
    for angle in (200, 340):
        rad = math.radians(angle)
        px = cx + (shoulder_w / 2) * math.cos(rad)
        py = shoulder_cy + (shoulder_h / 2) * math.sin(rad)
        _cap(draw, (px, py), stroke / 2, ACCENT)
        px = cx + (shoulder_w / 2.0) * math.cos(rad)
        py = shoulder_cy + (shoulder_h / 2.0) * math.sin(rad)
        _draw_cap(draw, px, py, stroke / 2.0, PRIMARY_BLUE)

    if female:
        # Subtle flowing-hair arcs framing the head, thinner stroke
        hair_stroke = int(stroke * 0.6)
        hair_stroke = int(stroke * 0.65)
        hair_r = head_r * 1.18
        hair_bbox = [cx - hair_r, head_cy - hair_r * 1.05, cx + hair_r, head_cy + hair_r * 1.35]
        draw.arc(hair_bbox, start=200, end=340, fill=ACCENT, width=hair_stroke)
        draw.arc(hair_bbox, start=200, end=340, fill=PRIMARY_BLUE, width=hair_stroke)

    # Circular frame outline
    # Frame border in subtle ice blue
    frame_stroke = int(big * 0.02)
    draw.ellipse([frame_stroke, frame_stroke, big - frame_stroke, big - frame_stroke],
                 outline=ACCENT, width=frame_stroke)
    draw.ellipse(
        [frame_stroke, frame_stroke, big - frame_stroke, big - frame_stroke],
        outline=BORDER_ICE, width=frame_stroke
    )

    out = _finish(img, size)
    out.save(out_path)
    print(f"wrote {out_path}")
    return _finish(img, size)


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
def main():
    os.makedirs(ASSETS_ICON_DIR, exist_ok=True)
    os.makedirs(ASSETS_IMAGES_DIR, exist_ok=True)

    print("Generating NutriRev Brand Icons...")

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
    # 1. High-resolution master icons in assets/icon/
    full_icon = create_app_icon(1024)
    full_icon_path = os.path.join(ASSETS_ICON_DIR, "app_icon.png")
    full_icon.save(full_icon_path, format="PNG")
    print(f"✓ Saved master full icon: {full_icon_path}")

    foreground_icon = create_foreground_icon(1024)
    foreground_icon_path = os.path.join(ASSETS_ICON_DIR, "app_icon_foreground.png")
    foreground_icon.save(foreground_icon_path, format="PNG")
    print(f"✓ Saved master foreground icon: {foreground_icon_path}")

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
    # 2. Avatars
    avatar_f = create_avatar(512, female=True)
    avatar_f.save(os.path.join(ASSETS_IMAGES_DIR, "avatar_female.png"), format="PNG")
    avatar_m = create_avatar(512, female=False)
    avatar_m.save(os.path.join(ASSETS_IMAGES_DIR, "avatar_male.png"), format="PNG")
    print("✓ Saved NutriRev avatar placeholders")

    # 3. Android Mipmap Icons (ic_launcher.png)
    android_densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in android_densities.items():
        dir_path = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)
        icon_path = os.path.join(dir_path, "ic_launcher.png")
        resized = full_icon.resize((size, size), Image.LANCZOS)
        resized.save(icon_path, format="PNG")
    print("✓ Updated Android mipmap ic_launcher.png icons")

def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    os.makedirs(ICON_DIR, exist_ok=True)
    # 4. Android Drawable Foreground Icons (ic_launcher_foreground.png)
    drawable_densities = {
        "drawable-mdpi": 108,
        "drawable-hdpi": 162,
        "drawable-xhdpi": 216,
        "drawable-xxhdpi": 324,
        "drawable-xxxhdpi": 432,
    }
    for folder, size in drawable_densities.items():
        dir_path = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)
        fg_path = os.path.join(dir_path, "ic_launcher_foreground.png")
        resized_fg = foreground_icon.resize((size, size), Image.LANCZOS)
        resized_fg.save(fg_path, format="PNG")
    print("✓ Updated Android drawable ic_launcher_foreground.png icons")

    draw_bust_avatar(512, female=True, out_path=os.path.join(IMAGES_DIR, "avatar_female.png"))
    draw_bust_avatar(512, female=False, out_path=os.path.join(IMAGES_DIR, "avatar_male.png"))
    # 5. iOS AppIcon set
    ios_sizes = {
        "Icon-App-20x20@1x.png": 20,
        "Icon-App-20x20@2x.png": 40,
        "Icon-App-20x20@3x.png": 60,
        "Icon-App-29x29@1x.png": 29,
        "Icon-App-29x29@2x.png": 58,
        "Icon-App-29x29@3x.png": 87,
        "Icon-App-40x40@1x.png": 40,
        "Icon-App-40x40@2x.png": 80,
        "Icon-App-40x40@3x.png": 120,
        "Icon-App-50x50@1x.png": 50,
        "Icon-App-50x50@2x.png": 100,
        "Icon-App-57x57@1x.png": 57,
        "Icon-App-57x57@2x.png": 114,
        "Icon-App-60x60@2x.png": 120,
        "Icon-App-60x60@3x.png": 180,
        "Icon-App-72x72@1x.png": 72,
        "Icon-App-72x72@2x.png": 144,
        "Icon-App-76x76@1x.png": 76,
        "Icon-App-76x76@2x.png": 152,
        "Icon-App-83.5x83.5@2x.png": 167,
        "Icon-App-1024x1024@1x.png": 1024,
    }
    if os.path.isdir(IOS_APPICON_DIR):
        for filename, px in ios_sizes.items():
            dest = os.path.join(IOS_APPICON_DIR, filename)
            resized = full_icon.resize((px, px), Image.LANCZOS)
            resized.save(dest, format="PNG")
        print("✓ Updated iOS AppIcon.appiconset icons")

    # Full-bleed icon (iOS / legacy Android): opaque cream background
    draw_app_icon(1024, os.path.join(ICON_DIR, "app_icon.png"),
                  background=PRIMARY_BG, transparent_bg=False, gem_scale=0.5)
    print("\nAll NutriRev mobile icons generated successfully!")

    # Adaptive-icon foreground (Android): transparent bg, gem within the ~66% safe zone
    draw_app_icon(1024, os.path.join(ICON_DIR, "app_icon_foreground.png"),
                  background=None, transparent_bg=True, gem_scale=0.42)


if __name__ == "__main__":
    main()
