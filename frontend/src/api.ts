import type { Tile } from './catalog'

const API_BASE=(import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/,'')
type ApiDesign={code:string;name:string;family:Tile['family'];finish:string;surface:NonNullable<Tile['surface']>;image_url:string}
const asTile=(design:ApiDesign):Tile=>({id:design.code,name:design.name,family:design.family,color:'#d8d4cb',vein:'#7e786f',finish:design.finish,size:'Custom size',seed:design.code.length,scan:'',image:design.image_url,surface:design.surface})

export async function fetchCustomTiles(){const response=await fetch(`${API_BASE}/api/tile-designs`);if(!response.ok)throw new Error('Could not load saved tile designs.');return (await response.json() as ApiDesign[]).map(asTile)}
export async function saveCustomTile(tile:Tile){
  if(!tile.image)throw new Error('A texture image is required.')
  const image=await (await fetch(tile.image)).blob();const body=new FormData()
  body.append('code',tile.id);body.append('name',tile.name);body.append('family',tile.family);body.append('finish',tile.finish);body.append('surface',tile.surface??'Both');body.append('image',image,`${tile.id}.jpg`)
  const response=await fetch(`${API_BASE}/api/tile-designs`,{method:'POST',body})
  if(!response.ok){const result=await response.json().catch(()=>null);throw new Error(result?.detail??'Could not save tile design.')}
  return asTile(await response.json() as ApiDesign)
}
