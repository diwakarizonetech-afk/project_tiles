"""Idempotently import source granite textures into the tile catalog.

Run from ``backend`` with ``python seed_granite_tiles.py [source_folder]``.
The default source is ``backend/catalog/granite_tiles_clean_no_white_borders``.
Images remain files under CATALOG_DIR; their bytes are never stored in SQL.
"""
from __future__ import annotations

import hashlib
import mimetypes
import shutil
import sys
from pathlib import Path

from sqlalchemy import select

from app.config import CATALOG_DIR
from app.database import SessionLocal
from app.models import TileDesign

DEFAULT_SOURCE = Path(__file__).resolve().parent / "catalog" / "granite_tiles_clean_no_white_borders"
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}
SIGNATURES = {
    ".jpg": lambda data: data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"),
    ".jpeg": lambda data: data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"),
    ".png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n") and data.endswith(b"IEND\xaeB`\x82"),
    ".webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


def discover(source: Path) -> list[Path]:
    if not source.is_dir():
        raise SystemExit(f"Image folder does not exist: {source}")
    valid = []
    for path in sorted(source.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED:
            continue
        data = path.read_bytes()
        if data and SIGNATURES[path.suffix.lower()](data):
            valid.append(path)
        else:
            print(f"Skipping invalid image: {path}", file=sys.stderr)
    if not valid:
        raise SystemExit(f"No valid supported tile images found under {source}")
    return valid


def product_code(source: Path, image: Path) -> str:
    # The relative filename makes the code stable across machines and runs.
    identity = image.relative_to(source).as_posix().casefold().encode("utf-8")
    return "MJP-GR-" + hashlib.sha256(identity).hexdigest()[:16].upper()


def main() -> None:
    source = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_SOURCE.resolve()
    if len(sys.argv) > 2:
        raise SystemExit("Usage: python seed_granite_tiles.py [source_folder]")
    images = discover(source)
    codes = [product_code(source, image) for image in images]
    if len(set(codes)) != len(codes):
        raise SystemExit("Generated product codes are not unique")

    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    inserted = updated = unchanged = 0
    with SessionLocal() as db:
        for order, (image, code) in enumerate(zip(images, codes)):
            relative = image.relative_to(source)
            destination = CATALOG_DIR / "granite_tiles_clean_no_white_borders" / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            if image.resolve() != destination.resolve():
                if not destination.exists() or hashlib.sha256(image.read_bytes()).digest() != hashlib.sha256(destination.read_bytes()).digest():
                    shutil.copy2(image, destination)
            image_path = "/catalog/" + destination.relative_to(CATALOG_DIR).as_posix()
            existing = db.get(TileDesign, code)
            if existing is None:
                name = image.stem.replace("_", " ").replace("-", " ").title()
                db.add(TileDesign(
                    code=code,
                    name=name[:120],
                    family="Granite",
                    finish="Texture reference",
                    surface="Both",
                    orientation="Landscape",
                    image_path=image_path,
                    image_data=None,
                    image_content_type=None,
                    color="#d8d4cb",
                    vein="#7e786f",
                    size="Custom size",
                    texture_repeat=2.8,
                    sort_order=2000 + order,
                    built_in=False,
                ))
                inserted += 1
            elif existing.image_path != image_path or existing.surface != "Both" or existing.family != "Granite":
                existing.image_path = image_path
                existing.image_data = None
                existing.image_content_type = None
                existing.surface = "Both"
                existing.family = "Granite"
                updated += 1
            else:
                unchanged += 1
        db.commit()

    print(f"Valid images: {len(images)}")
    print(f"Unique product codes: {len(set(codes))}")
    print(f"Inserted: {inserted}; updated: {updated}; unchanged: {unchanged}")
    print(f"Image storage: {CATALOG_DIR / 'granite_tiles_clean_no_white_borders'}")


if __name__ == "__main__":
    main()
