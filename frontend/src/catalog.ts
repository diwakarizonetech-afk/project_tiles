export type Family = 'Marble' | 'Stone' | 'Terrazzo' | 'Wood' | 'Pattern'
export type SurfaceUse = 'Floor' | 'Wall' | 'Both'
export type Tile = { id: string; name: string; family: Family; color: string; vein: string; finish: string; size: string; seed: number; scan: string; image?: string; surface?: SurfaceUse }
const designs: [string, Family, string, string][] = [
  ['Ivory Dune','Stone','#e7d9c2','#bbaa90'], ['Calacatta Gold','Marble','#f8f5ed','#b6a071'],
  ['Statuario White','Marble','#f5f5f1','#898f93'], ['Sage Terrazzo','Terrazzo','#c2cdc0','#4f7162'],
  ['Travertine Sand','Stone','#d6c5aa','#a28e72'], ['Honey Oak','Wood','#be9461','#684829'],
  ['Onyx Veil','Marble','#363b3c','#b8b3a8'], ['Terracotta Arc','Pattern','#b8755a','#ecd2b1'],
  ['Arabescato Pearl','Marble','#ece6db','#716b61'], ['Verde Alpi','Marble','#385b4d','#c7cbb1'],
  ['Rosso Levanto','Marble','#763f3c','#ddbbb1'], ['Ocean Quartz','Marble','#78989c','#d8e5dd'],
  ['Mistral Stone','Stone','#b9bbb5','#838780'], ['Limestone Cream','Stone','#eee4cf','#bcb199'],
  ['Basalt Ash','Stone','#686c69','#414842'], ['Desert Taupe','Stone','#b6a48c','#8c7b65'],
  ['Salt & Pepper','Terrazzo','#eee9e0','#525652'], ['Blush Confetti','Terrazzo','#e6c4b4','#a1665b'],
  ['Midnight Aggregate','Terrazzo','#384448','#bec8bd'], ['Citrus Fleck','Terrazzo','#ecdcb3','#b48b42'],
  ['Nordic Birch','Wood','#dcc7a7','#9e815d'], ['Smoked Walnut','Wood','#745541','#362b25'],
  ['Natural Teak','Wood','#aa7547','#563d27'], ['Coastal Ash','Wood','#bdb6a6','#7e7563'],
  ['Riviera Blue','Pattern','#6c91a3','#ede7d7'], ['Olive Check','Pattern','#7e8c6b','#eee5cc'],
  ['Noir Geometry','Pattern','#353b3b','#e7e4d8'], ['Rose Mosaic','Pattern','#b6857b','#eadad0'],
  ['Silver Mist','Marble','#c8cdce','#7c8589'], ['Botticino Silk','Marble','#e1cdb1','#b39b7f'],
]
const scans=['interior_tiles','marble_01','floor_tiles_02','old_mosaic_floor','floor_tiles_04','wood_floor','granite_tile','terracotta_floor_tiles','marble_mosaic_tiles','stone_tiles_02','granite_tile_02','square_tiles_03','granite_tile_03','floor_tiles_08','slate_floor_03','stone_floor','terrazzo_tiles','marble_tiles','square_tiles_02','square_tiles','diagonal_parquet','herringbone_parquet','rectangular_parquet','old_wood_floor','floor_tiles_09','patterned_slate_tiles','floor_tiles_06','stone_tiles','mixed_stone_tiles','stone_tiles_03']
export const tiles: Tile[] = designs.map(([name,family,color,vein],i)=>({id:`AT-${2048+i}`,name,family,color,vein,finish:family==='Marble'?'Polished':family==='Wood'?'Textured':'Matt',size:family==='Wood'?'200 × 1200 mm':family==='Pattern'?'600 × 600 mm':'600 × 1200 mm',seed:i+12,scan:scans[i]}))
export const families: Family[] = ['Marble','Stone','Terrazzo','Wood','Pattern']
export const roomNames = ['Living room','Kitchen','Master suite','Bathroom']
export const scannedMaterials: Record<string,{diffuse:string;normal?:string;roughness?:string;repeat:number}> = Object.fromEntries(tiles.map(tile=>[tile.id,{diffuse:`/tiles/${tile.scan}.jpg`,repeat:tile.family==='Wood'?3:tile.family==='Pattern'?2.4:2.8,...(tile.scan==='interior_tiles'?{normal:'/textures/interior_tiles_nor_gl_1k.jpg',roughness:'/textures/interior_tiles_rough_1k.jpg'}:{}),...(tile.scan==='wood_floor'?{normal:'/textures/wood_floor_nor_gl_1k.jpg',roughness:'/textures/wood_floor_rough_1k.jpg'}:{})}]))

// The exact same deterministic material is used on catalog samples and 3D floors.
export function tileCanvas(tile: Tile, size=512): HTMLCanvasElement {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size
  const ctx=canvas.getContext('2d')!;let seed=tile.seed
  const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
  ctx.fillStyle=tile.color;ctx.fillRect(0,0,size,size)
  if(tile.family==='Marble') {
    for(let i=0;i<34;i++) {
      const y=random()*size;ctx.beginPath();ctx.moveTo(-20,y);ctx.bezierCurveTo(size*.3,y+(random()-.5)*210,size*.55,y+(random()-.5)*220,size+20,y+90)
      ctx.strokeStyle=tile.vein;ctx.globalAlpha=i<5?.38:.12;ctx.lineWidth=i<5?1+random()*3:5+random()*22;ctx.stroke()
    }
  } else if(tile.family==='Terrazzo') {
    for(let i=0;i<470;i++) {const x=random()*size,y=random()*size,r=2+random()*9;ctx.beginPath();for(let k=0;k<5;k++){const a=k/5*Math.PI*2;ctx.lineTo(x+Math.cos(a)*r*(.5+random()*.5),y+Math.sin(a)*r)}ctx.closePath();ctx.globalAlpha=.35+random()*.55;ctx.fillStyle=i%3===0?'#fff9e9':i%3===1?tile.vein:'#a3907a';ctx.fill()}
  } else if(tile.family==='Wood') {
    for(let i=0;i<350;i++){const x=random()*size;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+random()*30,180,x-random()*20,340,x+random()*12,size);ctx.strokeStyle=tile.vein;ctx.globalAlpha=random()*.25;ctx.lineWidth=.3+random()*2;ctx.stroke()}
  } else if(tile.family==='Pattern') {
    ctx.globalAlpha=1;ctx.fillStyle=tile.vein;const s=size/4
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){ctx.save();ctx.translate(x*s+s/2,y*s+s/2);ctx.rotate((x+y)%2*Math.PI/2);ctx.beginPath();ctx.arc(-s/2,-s/2,s,0,Math.PI/2);ctx.lineTo(-s/2,-s/2);ctx.fill();ctx.fillStyle=tile.color;ctx.beginPath();ctx.arc(-s/2,-s/2,s*.65,0,Math.PI/2);ctx.lineTo(-s/2,-s/2);ctx.fill();ctx.fillStyle=tile.vein;ctx.restore()}
  }
  ctx.globalAlpha=1
  for(let i=0;i<14000;i++){ctx.globalAlpha=random()*(tile.family==='Stone'?.12:.045);ctx.fillStyle=random()>.5?'#fff':'#332b22';ctx.fillRect(random()*size,random()*size,1+random()*2,1+random()*2)}
  ctx.globalAlpha=1;ctx.strokeStyle='#ccc6b8';ctx.lineWidth=3;ctx.strokeRect(0,0,size,size)
  return canvas
}
const samples = new Map<string,string>()
export function sampleUrl(tile: Tile) {if(tile.image)return tile.image;if(scannedMaterials[tile.id])return scannedMaterials[tile.id].diffuse;if(!samples.has(tile.id))samples.set(tile.id,tileCanvas(tile,256).toDataURL());return samples.get(tile.id)!}
