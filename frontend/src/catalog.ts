export type Family='Granite'|'Marble'|'Stone'|'Terrazzo'|'Wood'|'Pattern'
export type SurfaceUse='Floor'|'Wall'|'Both'
export type TileOrientation='Landscape'|'Portrait'
export const TILE_SIZES = [
  "1' × 1.5' (300 × 450 mm)",
  "1' × 2' (300 × 600 mm)",
  "2' × 2' (600 × 600 mm)",
  "2' × 4' (600 × 1200 mm)",
] as const
export type TileSize = typeof TILE_SIZES[number]

export interface TileDimensionOption {
  id: string
  label: string
  fullText: string
  metric: string
  aspectRatio: string
}

export interface SizeVariationOption {
  id: '4x2' | '2x2' | '1x1'
  label: string
  detailLabel: string
  sizeString: string
  metric: string
  aspectRatio: string
}

export const SIZE_VARIATIONS: SizeVariationOption[] = [
  { id: '4x2', label: '4 × 2', detailLabel: "4' × 2' ft", sizeString: "4' × 2' (1200 × 600 mm)", metric: '1200 × 600 mm', aspectRatio: '2:1' },
  { id: '2x2', label: '2 × 2', detailLabel: "2' × 2' ft", sizeString: "2' × 2' (600 × 600 mm)", metric: '600 × 600 mm', aspectRatio: '1:1' },
  { id: '1x1', label: '1 × 1', detailLabel: "1' × 1' ft", sizeString: "1' × 1' (300 × 300 mm)", metric: '300 × 300 mm', aspectRatio: '1:1' },
]

export const STANDARD_DIMENSIONS: TileDimensionOption[] = [
  { id: '1x2', label: '1×2', fullText: "1' × 2' (300 × 600 mm)", metric: '300 × 600 mm', aspectRatio: '1:2' },
  { id: '2x2', label: '2×2', fullText: "2' × 2' (600 × 600 mm)", metric: '600 × 600 mm', aspectRatio: '1:1' },
  { id: '4x2', label: '4×2', fullText: "4' × 2' (1200 × 600 mm)", metric: '1200 × 600 mm', aspectRatio: '2:1' },
]

export function isTile1x1(size: string | undefined): boolean {
  if (!size) return false
  return /1['’]?\s*[x×]\s*1|300\s*[x×]\s*300/i.test(size)
}

export function isTile2x2(size: string | undefined): boolean {
  if (!size) return false
  return /2['’]?\s*[x×]\s*2|600\s*[x×]\s*600/i.test(size)
}

export function isSlab2x4(size: string | undefined): boolean {
  if (!size) return false
  return /4['’]?\s*[x×]\s*2|2['’]?\s*[x×]\s*4|600\s*[x×]\s*1200|1200\s*[x×]\s*600|1200|slab/i.test(size)
}

export function isTile1x2(size: string | undefined): boolean {
  if (!size) return false
  return /1['’]?\s*[x×]\s*2|2['’]?\s*[x×]\s*1|300\s*[x×]\s*600|600\s*[x×]\s*300/i.test(size)
}

export function getSizeVariationKey(size: string | undefined): '4x2' | '2x2' | '1x1' {
  if (!size) return '4x2'
  if (isTile1x1(size)) return '1x1'
  if (isTile2x2(size)) return '2x2'
  if (isSlab2x4(size)) return '4x2'
  return '4x2'
}

export function formatTileSizeLabel(size: string | undefined): string {
  if (!size) return '2×2'
  if (isTile1x1(size)) return '1×1'
  if (isTile2x2(size)) return '2×2'
  if (isSlab2x4(size)) return '4×2'
  if (isTile1x2(size)) return '1×2'
  const m = size.match(/(\d+)\s*[x×]\s*(\d+)/i)
  if (m) {
    const a = parseInt(m[1], 10), b = parseInt(m[2], 10)
    if (a === 300 && b === 300) return '1×1'
    if (a === 600 && b === 600) return '2×2'
    if ((a === 600 && b === 1200) || (a === 1200 && b === 600)) return '4×2'
    if ((a === 300 && b === 600) || (a === 600 && b === 300)) return '1×2'
    return `${a}×${b}`
  }
  return size
}

export function getTileDisplaySize(size: string | undefined): string {
  if (!size) return '4 × 2'
  if (isTile1x1(size)) return '1 × 1'
  if (isTile2x2(size)) return '2 × 2'
  if (isSlab2x4(size)) return '4 × 2'
  if (isTile1x2(size)) return '1 × 2'
  const label = formatTileSizeLabel(size)
  if (label && label.includes('×')) {
    return label.replace(/\s*×\s*/g, ' × ')
  }
  if (label && label.includes('x')) {
    return label.replace(/\s*x\s*/g, ' × ')
  }
  return label || '4 × 2'
}

export function getTileDetailSize(size: string | undefined): string {
  if (!size || /confirm/i.test(size)) return "4' × 2' ft (600 × 1200 mm)"
  if (isTile1x1(size)) return "1' × 1' ft (300 × 300 mm)"
  if (isTile2x2(size)) return "2' × 2' ft (600 × 600 mm)"
  if (isSlab2x4(size)) return "4' × 2' ft (600 × 1200 mm)"
  const display = getTileDisplaySize(size)
  if (/\b(ft|mm|cm|in|m)\b/i.test(display)) return display
  return `${display} ft`
}

export function getTileDisplayType(surface: SurfaceUse | string | undefined, isWall = false): string {
  if (isWall || surface === 'Wall') return 'Wall Tile'
  if (surface === 'Floor') return 'Floor Tile'
  if (surface === 'Both') return isWall ? 'Wall Tile' : 'Floor Tile'
  return isWall ? 'Wall Tile' : 'Floor Tile'
}

export function getTileDisplayFinish(finish: string | undefined): string {
  if (!finish) return 'Matte'
  const lower = finish.toLowerCase().trim()
  if (lower === 'matt' || lower === 'matte') return 'Matte'
  if (lower === 'polished') return 'Polished'
  if (lower === 'satin') return 'Satin'
  if (lower === 'textured') return 'Textured'
  if (lower === 'anti-skid') return 'Anti-skid'
  if (lower === 'honed') return 'Honed'
  if (lower === 'distressed matt') return 'Distressed Matte'
  return finish.charAt(0).toUpperCase() + finish.slice(1)
}

export function getTileDisplayColor(tile: Tile | undefined): string {
  if (!tile) return 'Natural'
  const nameLower = (tile.name || '').toLowerCase()
  if (nameLower.includes('blue')) return 'Blue'
  if (nameLower.includes('brown')) return 'Brown'
  if (nameLower.includes('block') || nameLower.includes('black') || nameLower.includes('noir') || nameLower.includes('charcoal')) return 'Black'
  if (nameLower.includes('dgreen')) return 'Dark Green'
  if (nameLower.includes('green') || nameLower.includes('sage') || nameLower.includes('olive') || nameLower.includes('verde')) return 'Green'
  if (nameLower.includes('orange')) return 'Orange'
  if (nameLower.includes('ocean')) return 'Ocean Blue'
  if (nameLower.includes('ivory') || nameLower.includes('dune')) return 'Ivory'
  if (nameLower.includes('calacatta') || nameLower.includes('gold')) return 'Gold / Cream'
  if (nameLower.includes('statuario') || nameLower.includes('white') || nameLower.includes('pearl')) return 'White'
  if (nameLower.includes('terracotta')) return 'Terracotta'
  if (nameLower.includes('rose') || nameLower.includes('blush')) return 'Rose'
  if (nameLower.includes('grey') || nameLower.includes('gray') || nameLower.includes('ash') || nameLower.includes('silver') || nameLower.includes('mist')) return 'Grey'
  if (nameLower.includes('travertine') || nameLower.includes('sand') || nameLower.includes('cream')) return 'Cream / Beige'
  if (nameLower.includes('wood') || nameLower.includes('oak') || nameLower.includes('walnut') || nameLower.includes('teak') || nameLower.includes('birch')) return 'Natural Wood'
  if (tile.color && !tile.color.startsWith('#')) return tile.color.charAt(0).toUpperCase() + tile.color.slice(1)
  return tile.family || 'Natural'
}

export function getTileDisplayCategory(tile: Tile | undefined): string {
  if (!tile) return 'Ceramic'
  if ((tile as any).category) return (tile as any).category
  if (!tile.builtIn) return 'Ceramic'
  if (tile.family === 'Pattern') return 'Ceramic'
  if (tile.family === 'Wood') return 'Wood Porcelain'
  if (tile.family === 'Marble') return 'Marble'
  if (tile.family === 'Stone') return 'Natural Stone'
  if (tile.family === 'Terrazzo') return 'Terrazzo'
  if (tile.family === 'Granite') return 'Granite'
  return 'Ceramic'
}

export function is1x1_5(size: string | undefined): boolean {
  if (!size) return false
  return /1['’]?\s*[x×]\s*1\.5|300\s*[x×]\s*450/i.test(size)
}

export function is2x2(size: string | undefined): boolean {
  if (!size) return false
  return /2['’]?\s*[x×]\s*2|600\s*[x×]\s*600/i.test(size)
}

export function isBathroomTile(tile: { id?: string; name?: string; size?: string; isBathroomOnly?: boolean } | undefined): boolean {
  if (!tile) return false
  if (tile.isBathroomOnly) return true
  if (tile.id?.startsWith('BT-')) return true
  // 1x1.5 ft tiles are dedicated bathroom wall tiles
  if (is1x1_5(tile.size)) return true
  // Check bathroom keywords or IDs
  return /bathroom|bath/i.test(tile.name ?? '') || /bathroom|bath/i.test(tile.id ?? '')
}

export type Tile={id:string;name:string;family:Family;color:string;vein:string;finish:string;size:string;image:string;normal?:string|null;roughness?:string|null;repeat:number;surface:SurfaceUse;orientation?:TileOrientation;builtIn:boolean;sortOrder:number;isBathroomOnly?:boolean}

export const families:Family[]=['Granite','Marble','Stone','Terrazzo','Wood','Pattern']
export const roomNames=['Cozy Living Room','Modern Bedroom','VR Gallery','Cooking Club','Modern Bathroom','Modern House Entrance']
export const houseEntranceWallNames=['West exterior','East exterior','Rear exterior','Front entry facade','Hall partition','Parking divider']
export const sampleUrl=(tile?:Tile)=>tile?.image ?? ''

export function getFloorDisplayLabel(id: number): string {
  if (id === 5) return 'Hall Floor'
  if (id === 6) return 'Entrance Floor'
  if (id === 7) return 'Car Parking Floor'
  if (id === 8) return 'Portico Floor'
  return `${roomNames[id] ?? 'Room'} Floor`
}
