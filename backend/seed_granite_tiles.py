"""Import only the 14 original granite tiles from the catalog into PostgreSQL.

Run from ``backend`` with ``python seed_granite_tiles.py``.
Removes all legacy and variation tiles, keeping strictly the 14 authentic granite designs.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image

from sqlalchemy import delete, select

from app.config import CATALOG_DIR
from app.database import SessionLocal
from app.models import TileDesign

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
            # Flattened data or simple pixel iteration
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
    # Only pick the 14 main large tiles
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
    # Remove small variations so only the 14 large files remain
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

    source = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_SOURCE.resolve()
    
    # 1. Clean up small images from source folder
    cleanup_small_images(source)

    # 2. Discover exactly the 14 main tiles
    images = discover(source)
    codes = [product_code(image) for image in images]

    # 3. Clear database to ensure only the 14 tiles exist
    clear_all_tiles()

    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    destination_folder = CATALOG_DIR / "granite_tiles_clean_no_white_borders"
    destination_folder.mkdir(parents=True, exist_ok=True)
    cleanup_small_images(destination_folder)

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

    print(f"Total tiles in catalog: {len(images)}")
    for item in exported_fallback_tiles:
        print(f"  {item['id']}: {item['name']}")
    
    sync_frontend_fallback(exported_fallback_tiles)


if __name__ == "__main__":
    main()
