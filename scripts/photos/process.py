"""Prepare product photos for the site.

For each image in assets-src/photos/:
  1. Remove the plain studio background (white or black) with soft, defringed edges.
  2. Crop to the item and center it in a standard 800x880 frame (matches the
     200x220 mockup canvas, so logo boxes use the same coordinates).
  3. Measure the dark "dyed" material's shading range (lo/hi) used to recolor
     the photo into other team colors in the browser.

Output: public/products/<name>.webp and src/lib/catalog/photo-meta.json
Run:    python3 scripts/photos/process.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets-src/photos"
OUT = ROOT / "public/products"
W, H, MARGIN = 800, 880, 0.07

# Items that are mostly white themselves (cards, sheets) need a stricter background cutoff.
STRICT = {"eye-black", "helmet-decal-kit"}
# Photos whose dyed material is the LIGHT part (gray pants with dark piping).
LIGHT_MATERIAL = {"pants-piped-gray"}


def process(path: Path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dark_bg = bg.mean() < 60
    dist = np.abs(rgb - bg).max(axis=2)
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

    if dark_bg:
        # Black seamless background; also drop the light-gray floor reflection under the item.
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        candidate = (dist < 9) | ((lum > 62) & (sat < 12))
    else:
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        # Pure background, plus the soft gray drop shadow on white seamless paper.
        candidate = dist < (6 if path.stem in STRICT else 14)
        if path.stem not in STRICT:
            candidate |= (lum > 175) & (sat < 14)

    labels, _ = ndimage.label(candidate)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bgmask = np.isin(labels, edge_labels[edge_labels > 0])
    # Remove specks; keep the item solid.
    item = ndimage.binary_opening(~bgmask, iterations=2)
    item = ndimage.binary_fill_holes(item) if path.stem not in {"wrist-tape-black"} else item
    keep, n = ndimage.label(item)
    if n > 1:  # keep components bigger than 2% of the largest (bats in the backpack, etc.)
        sizes = ndimage.sum(item, keep, range(1, n + 1))
        item = np.isin(keep, [i + 1 for i, s in enumerate(sizes) if s > 0.02 * sizes.max()])

    # Soft alpha at the boundary: blend weight from distance to background color.
    alpha = item.astype(np.float32)
    band = ndimage.binary_dilation(item, iterations=2) & ~ndimage.binary_erosion(item, iterations=2)
    soft = np.clip(dist / (90.0 if not dark_bg else 30.0), 0, 1)
    alpha[band] = np.minimum(alpha[band] + 0, soft[band]) if not dark_bg else soft[band]
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    alpha[~ndimage.binary_dilation(item, iterations=3)] = 0

    # Defringe: remove the background color mixed into semi-transparent edge pixels.
    a = np.clip(alpha, 1e-3, 1)[..., None]
    color = np.clip((rgb - (1 - a) * bg) / a, 0, 255)
    color = np.where(alpha[..., None] > 0.98, rgb, color)

    ys, xs = np.where(alpha > 0.05)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([color, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
    crop = Image.fromarray(rgba, "RGBA")
    scale = min(W * (1 - 2 * MARGIN) / crop.width, H * (1 - 2 * MARGIN) / crop.height)
    crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(crop, ((W - crop.width) // 2, (H - crop.height) // 2), crop)

    # Shading range of the dark material (ignore labels, buckles, glossy highlights).
    arr = np.asarray(canvas).astype(np.float32)
    L = arr[..., :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32) / 255
    light = path.stem in LIGHT_MATERIAL
    dyed = (arr[..., 3] > 240) & ((L > 0.42) if light else (L < 0.42))
    lo, hi = (np.percentile(L[dyed], [1, 99.5]) if dyed.sum() > 500 else (0.0, 0.4))
    canvas.save(OUT / f"{path.stem}.webp", "WEBP", quality=86, method=6)
    return {"lo": round(float(lo), 4), "hi": round(float(max(hi, lo + 0.05)), 4), "material": "light" if light else "dark"}


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {p.stem: process(p) for p in sorted(SRC.glob("*.png"))}
    (ROOT / "src/lib/catalog/photo-meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    for k, v in meta.items():
        print(f"{k:28s} lo={v['lo']:.3f} hi={v['hi']:.3f} {(OUT / (k + '.webp')).stat().st_size // 1024} KB")
