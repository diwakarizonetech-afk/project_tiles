import type { Tile } from './catalog'

const API_BASE=(import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/,'')
type ApiDesign={code:string;name:string;family:Tile['family'];finish:string;surface:Tile['surface'];image_url:string;color:string;vein:string;size:string;normal_url?:string;roughness_url?:string;texture_repeat:number;sort_order:number;built_in:boolean}
const asTile=(design:ApiDesign):Tile=>({id:design.code,name:design.name,family:design.family,color:design.color,vein:design.vein,finish:design.finish,size:design.size,image:design.image_url,normal:design.normal_url,roughness:design.roughness_url,repeat:design.texture_repeat,surface:design.surface,builtIn:design.built_in,sortOrder:design.sort_order})

export async function fetchTiles(){const response=await fetch(`${API_BASE}/api/tile-designs`);if(!response.ok)throw new Error('Could not load the tile catalog.');return (await response.json() as ApiDesign[]).map(asTile)}
export async function saveCustomTile(tile:Tile){
  if(!tile.image)throw new Error('A texture image is required.')
  const image=await (await fetch(tile.image)).blob();const body=new FormData()
  body.append('code',tile.id);body.append('name',tile.name);body.append('family',tile.family);body.append('finish',tile.finish);body.append('surface',tile.surface??'Both');body.append('image',image,`${tile.id}.jpg`)
  const response=await fetch(`${API_BASE}/api/tile-designs`,{method:'POST',body})
  if(!response.ok){const result=await response.json().catch(()=>null);throw new Error(result?.detail??'Could not save tile design.')}
  return asTile(await response.json() as ApiDesign)
}
