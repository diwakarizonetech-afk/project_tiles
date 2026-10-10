export type Family='Marble'|'Stone'|'Terrazzo'|'Wood'|'Pattern'
export type SurfaceUse='Floor'|'Wall'|'Both'
export type TileOrientation='Landscape'|'Portrait'
export const TILE_SIZES = [
  "2' × 2' (600 × 600 mm)",
  "2' × 4' (600 × 1200 mm)",
] as const
export type TileSize = typeof TILE_SIZES[number]

export function isSlab2x4(size: string | undefined): boolean {
  if (!size) return false
  return /2['’]?\s*[x×]\s*4|600\s*[x×]\s*1200|1200|slab/i.test(size)
}

export type Tile={id:string;name:string;family:Family;color:string;vein:string;finish:string;size:string;image:string;normal?:string|null;roughness?:string|null;repeat:number;surface:SurfaceUse;orientation?:TileOrientation;builtIn:boolean;sortOrder:number}

export const families:Family[]=['Marble','Stone','Terrazzo','Wood','Pattern']
export const roomNames=['Cozy Living Room','Modern Bedroom','VR Gallery','Cooking Club','Modern Bathroom']
export const sampleUrl=(tile:Tile)=>tile.image
