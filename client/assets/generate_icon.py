"""
Generate NoteBeam High-Resolution App Icons
Design: PC to phone linked with bidirectional arrows.
Background: Soft light pink / purplish gradient.
Outputs:
- icon-1024.png (Master)
- apple-touch-icon.png (180x180 for iOS Home Screen)
- icon-192.png & icon-512.png (PWA Web Manifest)
- notebeam.ico (Windows Desktop & Taskbar Multi-Resolution)
"""

import math
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent
TARGET_SIZE = 1024
SCALE = 2 # 2x supersampling (2048x2048) for smooth anti-aliased geometry
S = TARGET_SIZE * SCALE

def create_gradient(width, height):
    """Creates a smooth, elegant diagonal light pink/purplish gradient."""
    base = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(base)

    # Gradient colors: soft blush pink (#FCE7F3) to dreamy lavender/purple (#DDD6FE)
    c1 = (252, 231, 243) # Light Pink
    c2 = (237, 222, 255) # Light Lavender Pink
    c3 = (221, 214, 254) # Soft Purple

    for y in range(height):
        for x in range(width):
            ratio = (x + y) / (width + height)
            if ratio < 0.5:
                sub_r = ratio / 0.5
                r = int(c1[0] + (c2[0] - c1[0]) * sub_r)
                g = int(c1[1] + (c2[1] - c1[1]) * sub_r)
                b = int(c1[2] + (c2[2] - c1[2]) * sub_r)
            else:
                sub_r = (ratio - 0.5) / 0.5
                r = int(c2[0] + (c3[0] - c2[0]) * sub_r)
                g = int(c2[1] + (c3[1] - c2[1]) * sub_r)
                b = int(c2[2] + (c3[2] - c2[2]) * sub_r)
            draw.point((x, y), fill=(r, g, b, 255))
    return base

def draw_arrow(draw, start_x, start_y, end_x, end_y, thickness, head_len, fill_color, direction="right"):
    """Draws a crisp modern horizontal arrow with rounded styling."""
    if direction == "right":
        # Shaft
        draw.rounded_rectangle(
            [start_x, start_y - thickness // 2, end_x - head_len // 2, start_y + thickness // 2],
            radius=thickness // 2,
            fill=fill_color
        )
        # Head
        points = [
            (end_x, end_y),
            (end_x - head_len, end_y - head_len * 0.7),
            (end_x - head_len * 0.75, end_y),
            (end_x - head_len, end_y + head_len * 0.7),
        ]
        draw.polygon(points, fill=fill_color)
    else:
        # Shaft
        draw.rounded_rectangle(
            [start_x + head_len // 2, start_y - thickness // 2, end_x, start_y + thickness // 2],
            radius=thickness // 2,
            fill=fill_color
        )
        # Head
        points = [
            (start_x, start_y),
            (start_x + head_len, start_y - head_len * 0.7),
            (start_x + head_len * 0.75, start_y),
            (start_x + head_len, start_y + head_len * 0.7),
        ]
        draw.polygon(points, fill=fill_color)

def generate_icon():
    print(f"[*] Rendering icon canvas at {S}x{S}...")

    # 1. Background gradient (Light Pink to Purplish)
    # Optimized gradient using fast horizontal + vertical blend
    im = Image.new("RGBA", (S, S))
    draw = ImageDraw.Draw(im)

    # Start: Soft Rose Pink (253, 230, 242) -> End: Soft Lavender Purple (216, 203, 255)
    r1, g1, b1 = 253, 230, 242
    r2, g2, b2 = 216, 203, 255

    for y in range(S):
        for x in range(0, S, 4): # Step 4 for speed, then blur/smooth
            t = (x * 0.6 + y * 0.4) / S
            r = int(r1 + (r2 - r1) * t)
            g = int(g1 + (g2 - g1) * t)
            b = int(b1 + (b2 - b1) * t)
            draw.rectangle([x, y, x + 3, y], fill=(r, g, b, 255))

    # Subtle ambient inner glow
    im = im.filter(ImageFilter.GaussianBlur(radius=8))
    draw = ImageDraw.Draw(im)

    # Outer border / subtle inset ring
    border_col = (255, 255, 255, 140)
    draw.rounded_rectangle([20 * SCALE, 20 * SCALE, S - 20 * SCALE, S - 20 * SCALE], radius=220 * SCALE, outline=border_col, width=8 * SCALE)

    # Silhouette Color: Deep Rich Amethyst / Plum (#2A113F)
    SIL_COLOR = (42, 17, 63, 255)
    SCREEN_COLOR = (248, 240, 255, 240) # Soft glowing screen cutout
    BEAM_COLOR_1 = (168, 85, 247, 255) # Electric Purple
    BEAM_COLOR_2 = (236, 72, 153, 255) # Radiant Pink

    # ==============================================================
    # 2. Left: Desktop PC Monitor Silhouette
    # ==============================================================
    pc_left = 140 * SCALE
    pc_top = 290 * SCALE
    pc_width = 330 * SCALE
    pc_height = 240 * SCALE
    pc_radius = 24 * SCALE

    # Monitor Frame
    draw.rounded_rectangle([pc_left, pc_top, pc_left + pc_width, pc_top + pc_height], radius=pc_radius, fill=SIL_COLOR)
    
    # Monitor Screen Cutout (Glowing Display)
    screen_inset = 18 * SCALE
    draw.rounded_rectangle(
        [pc_left + screen_inset, pc_top + screen_inset, pc_left + pc_width - screen_inset, pc_top + pc_height - screen_inset],
        radius=14 * SCALE,
        fill=SCREEN_COLOR
    )

    # Stand Neck
    neck_w = 40 * SCALE
    neck_h = 75 * SCALE
    neck_x = pc_left + (pc_width - neck_w) // 2
    neck_y = pc_top + pc_height
    draw.rectangle([neck_x, neck_y, neck_x + neck_w, neck_y + neck_h], fill=SIL_COLOR)

    # Stand Base (Sleek bevel oval/rounded rect)
    base_w = 170 * SCALE
    base_h = 24 * SCALE
    base_x = pc_left + (pc_width - base_w) // 2
    base_y = neck_y + neck_h - 4 * SCALE
    draw.rounded_rectangle([base_x, base_y, base_x + base_w, base_y + base_h], radius=12 * SCALE, fill=SIL_COLOR)

    # ==============================================================
    # 3. Right: iPhone Silhouette
    # ==============================================================
    ph_width = 175 * SCALE
    ph_height = 360 * SCALE
    ph_left = S - ph_width - 150 * SCALE
    ph_top = 275 * SCALE
    ph_radius = 36 * SCALE

    # Phone Outer Body
    draw.rounded_rectangle([ph_left, ph_top, ph_left + ph_width, ph_top + ph_height], radius=ph_radius, fill=SIL_COLOR)

    # Phone Screen Cutout
    ph_inset = 14 * SCALE
    draw.rounded_rectangle(
        [ph_left + ph_inset, ph_top + ph_inset, ph_left + ph_width - ph_inset, ph_top + ph_height - ph_inset],
        radius=26 * SCALE,
        fill=SCREEN_COLOR
    )

    # Dynamic Island / Top Speaker Pill on Phone
    pill_w = 44 * SCALE
    pill_h = 10 * SCALE
    pill_x = ph_left + (ph_width - pill_w) // 2
    pill_y = ph_top + ph_inset + 10 * SCALE
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=5 * SCALE, fill=SIL_COLOR)

    # Bottom Home Indicator Bar
    home_w = 60 * SCALE
    home_h = 5 * SCALE
    home_x = ph_left + (ph_width - home_w) // 2
    home_y = ph_top + ph_height - ph_inset - 12 * SCALE
    draw.rounded_rectangle([home_x, home_y, home_x + home_w, home_y + home_h], radius=3 * SCALE, fill=SIL_COLOR)

    # ==============================================================
    # 4. Center: Bidirectional Arrows / Wireless Beam
    # ==============================================================
    # Arrow 1: Upper arrow (PC -> Phone, pointing Right)
    arrow_start_x = pc_left + pc_width + 25 * SCALE
    arrow_end_x = ph_left - 25 * SCALE
    arrow_thickness = 22 * SCALE
    head_size = 46 * SCALE

    y1 = pc_top + 80 * SCALE
    y2 = pc_top + 160 * SCALE

    # Top Arrow: Pointing Right (Vibrant Electric Purple)
    draw_arrow(draw, arrow_start_x, y1, arrow_end_x, y1, arrow_thickness, head_size, BEAM_COLOR_1, direction="right")

    # Bottom Arrow: Pointing Left (Vibrant Pink/Magenta)
    draw_arrow(draw, arrow_start_x, y2, arrow_end_x, y2, arrow_thickness, head_size, BEAM_COLOR_2, direction="left")

    # Small wireless signal dot / beam sparks in center
    cx = (arrow_start_x + arrow_end_x) // 2
    cy = (y1 + y2) // 2
    draw.ellipse([cx - 10 * SCALE, cy - 10 * SCALE, cx + 10 * SCALE, cy + 10 * SCALE], fill=SIL_COLOR)

    # ==============================================================
    # 5. Downscale with High-Quality Lanczos Filter (Antialiased)
    # ==============================================================
    print("[*] Downsampling to master 1024x1024...")
    final_1024 = im.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)

    # Save 1024x1024 master
    master_path = OUTPUT_DIR / "icon-1024.png"
    final_1024.save(master_path, "PNG", optimize=True)
    print(f"[+] Saved master icon: {master_path}")

    # Generate iOS Apple Touch Icon (180x180)
    touch_path = OUTPUT_DIR / "apple-touch-icon.png"
    final_1024.resize((180, 180), Image.Resampling.LANCZOS).save(touch_path, "PNG", optimize=True)
    print(f"[+] Saved iOS Touch Icon: {touch_path}")

    # Generate PWA Web Icons (192x192 & 512x512)
    pwa_192 = OUTPUT_DIR / "icon-192.png"
    pwa_512 = OUTPUT_DIR / "icon-512.png"
    final_1024.resize((192, 192), Image.Resampling.LANCZOS).save(pwa_192, "PNG", optimize=True)
    final_1024.resize((512, 512), Image.Resampling.LANCZOS).save(pwa_512, "PNG", optimize=True)
    print(f"[+] Saved PWA icons (192 & 512)")

    # Generate Multi-Resolution Windows .ICO file
    ico_path = OUTPUT_DIR / "notebeam.ico"
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    final_1024.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"[+] Saved Windows Multi-Resolution .ICO: {ico_path}")

if __name__ == "__main__":
    generate_icon()
