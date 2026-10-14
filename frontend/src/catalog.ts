export type Family='Granite'|'Marble'|'Stone'|'Terrazzo'|'Wood'|'Pattern'
export type SurfaceUse='Floor'|'Wall'|'Both'
export type TileOrientation='Landscape'|'Portrait'
export const TILE_SIZES = [
  "1' × 1.5' (300 × 450 mm)",
  "2' × 2' (600 × 600 mm)",
  "2' × 4' (600 × 1200 mm)",
] as const
export type TileSize = typeof TILE_SIZES[number]

export function isSlab2x4(size: string | undefined): boolean {
  if (!size) return false
  return /2['’]?\s*[x×]\s*4|600\s*[x×]\s*1200|1200|slab/i.test(size)
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
export const roomNames=['Cozy Living Room','Modern Bedroom','VR Gallery','Cooking Club','Modern Bathroom']
export const sampleUrl=(tile:Tile)=>tile.image
