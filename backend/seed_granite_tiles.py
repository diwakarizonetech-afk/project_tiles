"""Import strictly the 14 original granite tiles from the catalog PDF into PostgreSQL.

Run from ``backend`` with ``python seed_granite_tiles.py``.
Removes all legacy and variation tiles, keeping strictly the 14 authentic granite designs.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image

from sqlalchemy import delete

from app.config import CATALOG_DIR
from app.database import SessionLocal
from app.models import TileDesign

DEFAULT_PDF = Path(r"C:\Users\IZONE 171\Downloads\GRANITE NEW (1).pdf")
DEFAULT_SOURCE = Path(__file__).resolve().parent / "catalog" / "granite_tiles_clean_no_white_borders"

PAGE_NAMES = [
    "Altic Black",
    "Altic Gold",
    "Black Basle",
    "Crystal Aqua",
    "Crystal Blue",
    "Crystal Green",
    "Crystal Nut",
    "Globle Aqua",
    "Globle Blue",
    "Granite Aqua",
    "Granite Black",
    "Granite Blue",
    "Granite Brown",
    "Granite Ocean",
]

# Exact crop box for the large granite tile on the left (calibrated from 4169x3508 brochure page)
TILE_CROP_BOX = (247, 138, 1749, 3148)


def extract_tiles_from_pdf(pdf_path: Path, destination_folder: Path) -> list[Path]:
    """Extract and crop the 14 authentic large granite tiles directly from the PDF."""
    try:
        import pymupdf as fitz
    except ImportError:
        import fitz  # type: ignore

    if not pdf_path.is_file():
        raise SystemExit(f"PDF file does not exist: {pdf_path}")

    destination_folder.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    cropped_paths: list[Path] = []

    print(f"Opening PDF: {pdf_path.name} ({len(doc)} pages)")
    for i in range(min(len(doc), len(PAGE_NAMES))):
        page = doc[i]
        img_list = page.get_images()
        if not img_list:
            print(f"Warning: No images on page {i+1}", file=sys.stderr)
            continue
        xref = img_list[0][0]
        base_img = doc.extract_image(xref)
        with Image.open(io.BytesIO(base_img["image"])) as im:
            tile = im.crop(TILE_CROP_BOX)
            out_file = destination_folder / f"page_{i+1:02d}_tile_large.jpg"
            tile.save(out_file, "JPEG", quality=95)
            cropped_paths.append(out_file)
            print(f"Extracted Page {i+1:02d}: {PAGE_NAMES[i]} -> {out_file.name} ({tile.size[0]}x{tile.size[1]})")

    return cropped_paths


def clear_all_tiles() -> None:
    with SessionLocal() as db:
        res = db.execute(delete(TileDesign))
        db.commit()
        print(f"Cleared {res.rowcount} tiles from the catalog database.")


def get_tile_name(filename: str) -> str:
    m = re.match(r"page_(\d+)_tile_large\.jpg", filename.lower())
    if m:
        page_num = int(m.group(1))
        if 1 <= page_num <= len(PAGE_NAMES):
            return PAGE_NAMES[page_num - 1]
    return filename.replace("_", " ").replace("-", " ").title()


def compute_colors(image_path: Path) -> tuple[str, str]:
    try:
        with Image.open(image_path) as im:
            im = im.resize((50, 100)).convert("RGB")
            pixels = [im.getpixel((x, y)) for y in range(im.height) for x in range(im.width)]
            r_avg = sum(p[0] for p in pixels) // len(pixels)
            g_avg = sum(p[1] for p in pixels) // len(pixels)
            b_avg = sum(p[2] for p in pixels) // len(pixels)
            r_vein = min(255, int(r_avg * 1.35 + 25))
            g_vein = min(255, int(g_avg * 1.35 + 25))
            b_vein = min(255, int(b_avg * 1.35 + 25))
            return f"#{r_avg:02x}{g_avg:02x}{b_avg:02x}", f"#{r_vein:02x}{g_vein:02x}{b_vein:02x}"
    except Exception:
        return "#4a4d52", "#a8adb5"


def discover(source: Path) -> list[Path]:
    if not source.is_dir():
        raise SystemExit(f"Image folder does not exist: {source}")
    valid = []
    for i in range(1, len(PAGE_NAMES) + 1):
        target = source / f"page_{i:02d}_tile_large.jpg"
        if target.is_file():
            valid.append(target)
        else:
            print(f"Warning: Missing tile image {target.name}", file=sys.stderr)
    if not valid:
        raise SystemExit(f"No valid tile images found under {source}")
    return valid


def product_code(image: Path) -> str:
    m = re.match(r"page_(\d+)_tile_large\.jpg", image.name.lower())
    if m:
        page_num = int(m.group(1))
        return f"MJP-GR-{page_num:02d}"
    return "MJP-GR-" + hashlib.sha256(image.name.encode()).hexdigest()[:8].upper()


def cleanup_small_images(source: Path) -> None:
    removed = 0
    for small_file in source.glob("*_small_*.jpg"):
        try:
            small_file.unlink()
            removed += 1
        except Exception:
            pass
    if removed:
        print(f"Removed {removed} small variation image files from disk.")


def sync_frontend_fallback(tiles_data: list[dict]) -> None:
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend" / "src"
    if not frontend_dir.exists():
        return
    
    json_path = frontend_dir / "fallbackTiles.json"
    ts_path = frontend_dir / "fallbackTiles.ts"

    json_path.write_text(json.dumps(tiles_data, indent=2), encoding="utf-8")
    ts_content = "import { type Tile } from './catalog';\n\nexport const fallbackTiles: Tile[] = " + json.dumps(tiles_data, indent=2) + ";\n"
    ts_path.write_text(ts_content, encoding="utf-8")
    print(f"Synchronized fallback tiles ({len(tiles_data)} tiles) to {ts_path} and {json_path}")


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1].lower() in {"--clear", "-c", "clear"}:
        clear_all_tiles()
        return

    destination_folder = CATALOG_DIR / "granite_tiles_clean_no_white_borders"
    destination_folder.mkdir(parents=True, exist_ok=True)
    cleanup_small_images(destination_folder)

    # Determine input source: PDF file or directory
    arg_source = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else None

    if arg_source and arg_source.is_file() and arg_source.suffix.lower() == ".pdf":
        images = extract_tiles_from_pdf(arg_source, destination_folder)
    elif arg_source and arg_source.is_dir():
        cleanup_small_images(arg_source)
        images = discover(arg_source)
    elif DEFAULT_PDF.is_file():
        images = extract_tiles_from_pdf(DEFAULT_PDF, destination_folder)
    else:
        cleanup_small_images(DEFAULT_SOURCE)
        images = discover(DEFAULT_SOURCE)

    codes = [product_code(image) for image in images]

    # Clear all old tiles from database to keep strictly the 14 original tiles
    clear_all_tiles()

    exported_fallback_tiles = []

    with SessionLocal() as db:
        for order, (image, code) in enumerate(zip(images, codes)):
            destination = destination_folder / image.name
            if image.resolve() != destination.resolve():
                if not destination.exists() or hashlib.sha256(image.read_bytes()).digest() != hashlib.sha256(destination.read_bytes()).digest():
                    shutil.copy2(image, destination)
            image_path = "/catalog/granite_tiles_clean_no_white_borders/" + image.name
            
            name = get_tile_name(image.name)
            color_hex, vein_hex = compute_colors(image)
            
            design = TileDesign(
                code=code,
                name=name,
                family="Granite",
                finish="Glossy",
                surface="Both",
                orientation="Landscape",
                image_path=image_path,
                image_data=None,
                image_content_type=None,
                color=color_hex,
                vein=vein_hex,
                size="2' × 4' (600 × 1200 mm)",
                texture_repeat=2.8,
                sort_order=order,
                built_in=False,
            )
            db.add(design)

            exported_fallback_tiles.append({
                "id": code,
                "name": name,
                "family": "Granite",
                "color": color_hex,
                "vein": vein_hex,
                "finish": "Glossy",
                "size": "2' × 4' (600 × 1200 mm)",
                "image": f"http://localhost:8000{image_path}",
                "normal": None,
                "roughness": None,
                "repeat": 2.8,
                "surface": "Both",
                "orientation": "Landscape",
                "builtIn": False,
                "sortOrder": order,
            })

        db.commit()

    print(f"\nSuccessfully seeded {len(images)} granite tiles into PostgreSQL database:")
    for item in exported_fallback_tiles:
        print(f"  {item['id']}: {item['name']} ({item['color']} / {item['vein']})")
    
    sync_frontend_fallback(exported_fallback_tiles)


if __name__ == "__main__":
    main()
