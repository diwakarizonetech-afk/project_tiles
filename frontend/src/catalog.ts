export type Family='Marble'|'Stone'|'Terrazzo'|'Wood'|'Pattern'
export type SurfaceUse='Floor'|'Wall'|'Both'
export type Tile={id:string;name:string;family:Family;color:string;vein:string;finish:string;size:string;image:string;normal?:string;roughness?:string;repeat:number;surface:SurfaceUse;builtIn:boolean;sortOrder:number}

export const families:Family[]=['Marble','Stone','Terrazzo','Wood','Pattern']
export const roomNames=['Cozy living room','Modern bedroom','Simple living room','Gallery hall','Bathroom','Office space','VR gallery','Cooking club']
export const sampleUrl=(tile:Tile)=>tile.image
