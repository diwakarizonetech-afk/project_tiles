"""add curated CC0 PBR wall and floor collections

Revision ID: 20260925_0003
Revises: 20260923_0002
"""
from alembic import op
import sqlalchemy as sa

revision = "20260925_0003"
down_revision = "20260923_0002"
branch_labels = None
depends_on = None


def material(
    code: str,
    name: str,
    asset: str,
    family: str,
    surface: str,
    finish: str,
    size: str,
    color: str,
    vein: str,
    repeat: float,
    order: int,
) -> dict:
    root = f"/catalog/{asset}"
    return {
        "code": code,
        "name": name,
        "family": family,
        "finish": finish,
        "surface": surface,
        "image_path": f"{root}_diff_1k.jpg",
        "color": color,
        "vein": vein,
        "size": size,
        "normal_path": f"{root}_nor_gl_1k.jpg",
        "roughness_path": f"{root}_rough_1k.jpg",
        "texture_repeat": repeat,
        "sort_order": order,
        "built_in": True,
    }


def upgrade() -> None:
    table = sa.table(
        "tile_designs",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("family", sa.String),
        sa.column("finish", sa.String),
        sa.column("surface", sa.String),
        sa.column("image_path", sa.Text),
        sa.column("color", sa.String),
        sa.column("vein", sa.String),
        sa.column("size", sa.String),
        sa.column("normal_path", sa.Text),
        sa.column("roughness_path", sa.Text),
        sa.column("texture_repeat", sa.Float),
        sa.column("sort_order", sa.Integer),
        sa.column("built_in", sa.Boolean),
    )
    op.bulk_insert(table, [
        material("MJP-W-1013", "Pearl Rounded Mosaic", "rounded_square_tiled_wall", "Pattern", "Wall", "Satin relief", "100 x 100 mm", "#d8d7d2", "#777a78", 3.2, 112),
        material("MJP-W-1014", "Architect White Grid", "square_tiled_wall", "Pattern", "Wall", "Matt relief", "100 x 100 mm", "#e2e1dc", "#858782", 3.4, 113),
        material("MJP-W-1015", "Linear Sand Facade", "rectangular_facade_tiles", "Stone", "Wall", "Textured", "150 x 600 mm", "#b4a893", "#6f675b", 2.5, 114),
        material("MJP-W-1016", "Graphite Linear Facade", "rectangular_facade_tiles_02", "Stone", "Wall", "Textured", "150 x 600 mm", "#5d5c58", "#2f302e", 2.5, 115),
        material("MJP-W-1017", "Ivory Ledger Stone", "stone_tile_wall", "Stone", "Wall", "Split face", "150 x 600 mm", "#c8bca7", "#817765", 2.2, 116),
        material("MJP-W-1018", "Volcanic Charcoal", "volcanic_rock_tiles", "Stone", "Wall", "Natural cleft", "300 x 600 mm", "#4a4945", "#222321", 2.3, 117),
        material("MJP-W-1019", "Urban Concrete Panels", "concrete_tile_facade", "Stone", "Wall", "Honed", "300 x 600 mm", "#a7a49d", "#66645f", 2.4, 118),
        material("MJP-W-1020", "Heritage White Subway", "long_white_tiles", "Pattern", "Wall", "Glossy worn", "75 x 300 mm", "#dedbd4", "#8b857d", 3.0, 119),
        material("MJP-F-2001", "Cocoa Ceramic", "tiled_floor_001", "Stone", "Floor", "Satin", "600 x 600 mm", "#866d59", "#514238", 2.8, 30),
        material("MJP-F-2002", "Chestnut Courtyard", "brown_floor_tiles", "Pattern", "Floor", "Matt", "300 x 300 mm", "#9c785c", "#614735", 3.0, 31),
        material("MJP-F-2003", "Gripstone Grey", "anti_skid_tiles", "Stone", "Floor", "Anti-skid", "300 x 300 mm", "#787872", "#484943", 3.0, 32),
        material("MJP-F-2004", "Terracotta Patio", "patio_tiles", "Pattern", "Floor", "Matt", "300 x 300 mm", "#a76649", "#633c2d", 3.0, 33),
        material("MJP-F-2005", "Vintage Ivory Tile", "worn_tile_floor", "Pattern", "Floor", "Distressed matt", "300 x 300 mm", "#c6bba7", "#776e61", 3.0, 34),
        material("MJP-F-2006", "Silver Slab", "slab_tiles", "Stone", "Floor", "Honed", "600 x 1200 mm", "#aaa9a4", "#656660", 2.6, 35),
    ])


def downgrade() -> None:
    codes = [
        "MJP-W-1013", "MJP-W-1014", "MJP-W-1015", "MJP-W-1016",
        "MJP-W-1017", "MJP-W-1018", "MJP-W-1019", "MJP-W-1020",
        "MJP-F-2001", "MJP-F-2002", "MJP-F-2003", "MJP-F-2004",
        "MJP-F-2005", "MJP-F-2006",
    ]
    op.execute(
        sa.text("DELETE FROM tile_designs WHERE code IN :codes")
        .bindparams(sa.bindparam("codes", expanding=True))
        .bindparams(codes=codes)
    )
