import type { Tile } from './catalog'

const API_BASE=(import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/,'')
type ApiDesign={code:string;name:string;family:Tile['family'];finish:string;surface:Tile['surface'];image_url:string;color:string;vein:string;size:string;normal_url?:string;roughness_url?:string;texture_repeat:number;sort_order:number;built_in:boolean}
const asTile=(design:ApiDesign):Tile=>({id:design.code,name:design.name,family:design.family,color:design.color,vein:design.vein,finish:design.finish,size:design.size,image:design.image_url,normal:design.normal_url,roughness:design.roughness_url,repeat:design.texture_repeat,surface:design.surface,builtIn:design.built_in,sortOrder:design.sort_order})

export async function fetchTiles(){const response=await fetch(`${API_BASE}/api/tile-designs`);if(!response.ok)throw new Error('Could not load the tile catalog.');return (await response.json() as ApiDesign[]).map(asTile)}
export async function saveCustomTile(tile:Tile){
  if(!tile.image)throw new Error('A texture image is required.')
  const image=await (await fetch(tile.image)).blob();const body=new FormData()
  body.append('code',tile.id);body.append('name',tile.name);body.append('family',tile.family);body.append('finish',tile.finish);body.append('surface',tile.surface??'Both');body.append('size',tile.size||"2' × 2' (600 × 600 mm)");body.append('image',image,`${tile.id}.jpg`)
  const response=await fetch(`${API_BASE}/api/tile-designs`,{method:'POST',body})
  if(!response.ok){const result=await response.json().catch(()=>null);throw new Error(result?.detail??'Could not save tile design.')}
  return asTile(await response.json() as ApiDesign)
}
export async function deleteCustomTile(code:string){
  const response = await fetch(`${API_BASE}/api/tile-designs/${code}`, {method:'DELETE'});
  if (!response.ok) {
    const result = await response.json().catch(()=>null);
    throw new Error(result?.detail ?? 'Could not delete tile design.');
  }
}

export async function saveInquiry(data: { name: string, contact: string, message: string }) {
  const res = await fetch(`${API_BASE}/api/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to send inquiry');
  return res.json();
}

export async function fetchInquiries() {
  const res = await fetch(`${API_BASE}/api/inquiries`);
  if (!res.ok) throw new Error('Failed to fetch inquiries');
  return res.json();
}
