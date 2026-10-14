from app.database import get_db
from app.models import TileDesign

db = next(get_db())

sample_tiles = [
    {
        'code': 'BT-W-101',
        'name': 'Aqua Gloss Metro',
        'family': 'Pattern',
        'finish': 'Gloss',
        'surface': 'Wall',
        'orientation': 'Landscape',
        'size': "1' \u00d7 1.5' (300 \u00d7 450 mm)",
        'image_path': '/catalog/long_white_tiles_diff_1k.jpg',
        'normal_path': '/catalog/long_white_tiles_nor_gl_1k.jpg',
        'roughness_path': '/catalog/long_white_tiles_rough_1k.jpg',
        'color': '#d2e5e7',
        'vein': '#78a2a5',
        'texture_repeat': 1.0,
        'sort_order': 200,
        'built_in': True,
    },
    {
        'code': 'BT-W-102',
        'name': 'Carrara Fluted Ceramic',
        'family': 'Marble',
        'finish': 'Satin',
        'surface': 'Wall',
        'orientation': 'Landscape',
        'size': "1' \u00d7 1.5' (300 \u00d7 450 mm)",
        'image_path': '/catalog/marble_tiles.jpg',
        'normal_path': None,
        'roughness_path': None,
        'color': '#f3f1ee',
        'vein': '#989795',
        'texture_repeat': 1.0,
        'sort_order': 201,
        'built_in': True,
    },
    {
        'code': 'BT-W-201',
        'name': 'Calacatta Luxe Wall & Floor',
        'family': 'Marble',
        'finish': 'Polished',
        'surface': 'Both',
        'orientation': 'Landscape',
        'size': "2' \u00d7 2' (600 \u00d7 600 mm)",
        'image_path': '/catalog/marble_01.jpg',
        'normal_path': None,
        'roughness_path': None,
        'color': '#f8f5ed',
        'vein': '#b6a071',
        'texture_repeat': 1.0,
        'sort_order': 202,
        'built_in': True,
    },
    {
        'code': 'BT-W-202',
        'name': 'Nordic Stone Grid',
        'family': 'Stone',
        'finish': 'Matt',
        'surface': 'Both',
        'orientation': 'Landscape',
        'size': "2' \u00d7 2' (600 \u00d7 600 mm)",
        'image_path': '/catalog/stone_tiles.jpg',
        'normal_path': None,
        'roughness_path': None,
        'color': '#e4e2dd',
        'vein': '#898782',
        'texture_repeat': 1.0,
        'sort_order': 203,
        'built_in': True,
    }
]

for item in sample_tiles:
    existing = db.get(TileDesign, item['code'])
    if not existing:
        db.add(TileDesign(**item))
db.commit()
print('Added/verified bathroom sample tiles in database.')
