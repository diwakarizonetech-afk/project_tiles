import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import type { Tile } from './catalog'

export type Obstacle = {x:number;z:number;w:number;d:number}
export const wallSides=['West wall','East wall','North wall','South wall'] as const
// Paint finishes plus 15 tile-led wall finishes. Kept as one style value so a
// customer can swap an individual wall without affecting the room's floor.
export const wallDesigns=['paint','limewash','linen','stripes','arches','subway','herringbone','terrazzo','hexagon','zellige','kitkat','travertine','marble','checker','mosaic','chevron','fishscale','concrete','fluted','grid'] as const
export type WallDesign=(typeof wallDesigns)[number]
export type WallStyle={color:string;design:WallDesign;image?:string;normal?:string;roughness?:string;repeat?:number;size?:string}
export const roomAt=(x:number,z:number)=>z>=0?(x<0?0:1):(x<0?2:3)
export const viewpoints = [
  {x:-1.7,z:6.7,yaw:.57,pitch:-.14}, {x:2,z:6.4,yaw:-.48,pitch:-.13},
  {x:-2,z:-1.9,yaw:.36,pitch:-.13}, {x:2.3,z:-1.8,yaw:-.36,pitch:-.16},
]

export function buildHouse(renderer:THREE.WebGLRenderer) {
  let disposed=false
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9d0d8')
  const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer)
  let envTarget=pmrem.fromScene(environment,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.42;environment.dispose()
  new HDRLoader().load('/hdr/modern_bathroom_2k.hdr',hdr=>{
    if(disposed){hdr.dispose();pmrem.dispose();return}
    hdr.mapping=THREE.EquirectangularReflectionMapping;const target=pmrem.fromEquirectangular(hdr);hdr.dispose();envTarget.dispose();envTarget=target;scene.environment=target.texture;scene.environmentIntensity=.72;pmrem.dispose()
  },undefined,()=>pmrem.dispose())
  const obstacles:Obstacle[]=[];const textures:THREE.Texture[]=[]
  const mat=(color:string,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness})
  function tactile(color:string,kind:'paint'|'wood'|'cloth') {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,256,256)
    let seed=color.split('').reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),17)>>>0
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    const count=kind==='wood'?1300:kind==='cloth'?11000:8500
    for(let i=0;i<count;i++){
      const x=rand()*256,y=rand()*256
      ctx.fillStyle=rand()>.5?'rgba(255,244,222,.11)':'rgba(26,25,26,.11)'
      if(kind==='wood')ctx.fillRect(x,y,.25+rand()*.8,8+rand()*80)
      else if(kind==='cloth')ctx.fillRect(x,y,.5+rand()*.8,.5+rand()*1.6)
      else ctx.fillRect(x,y,.6+rand()*1.5,.6+rand()*1.5)
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping
    texture.repeat.set(kind==='wood'?2:4,kind==='wood'?2:4);textures.push(texture)
    return new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:kind==='paint'?.004:.012,roughness:kind==='wood'?.57:kind==='cloth'?.94:.88})
  }
  const plaster=tactile('#e9dccd','paint'),oak=tactile('#875c42','wood'),cream=mat('#d6aa7e'),dark=mat('#253a3b'),brass=mat('#c7995b',.24,.7),white=mat('#f0e8db'),green=mat('#286f57'),glass=new THREE.MeshPhysicalMaterial({color:'#c4e0df',transparent:true,opacity:.16,roughness:.1,metalness:.05,side:THREE.DoubleSide})
  const countertop=new THREE.MeshStandardMaterial({color:'#e7e1d8',roughness:.23})
  const defaultWallColours=['#aa5946','#ede8e0','#75566e','#f0ece6']
  const finishMaps=new Map<WallDesign,THREE.CanvasTexture>()
  function finishMap(design:WallDesign){
    const cached=finishMaps.get(design);if(cached)return cached
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f7f5f0';ctx.fillRect(0,0,256,256)
    let seed=design.length*1973;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    if(design==='limewash')for(let i=0;i<1200;i++){const x=rand()*256,y=rand()*256,r=4+rand()*24;ctx.fillStyle=rand()>.5?'#ffffff0d':'#454a4210';ctx.beginPath();ctx.ellipse(x,y,r,r*(.3+rand()*.8),rand()*3,0,Math.PI*2);ctx.fill()}
    if(design==='linen'){ctx.strokeStyle='#4e57491b';ctx.lineWidth=1;for(let i=0;i<256;i+=6){ctx.beginPath();ctx.moveTo(i+.5,0);ctx.lineTo(i+.5,256);ctx.moveTo(0,i+.5);ctx.lineTo(256,i+.5);ctx.stroke()}}
    if(design==='stripes'){for(let i=0;i<256;i+=24){ctx.fillStyle='#5a625633';ctx.fillRect(i,0,2,256);ctx.fillStyle='#ffffff50';ctx.fillRect(i+5,0,3,256)}}
    if(design==='arches'){ctx.strokeStyle='#48574844';ctx.lineWidth=3;for(let y=-64;y<320;y+=64)for(let x=0;x<320;x+=64){ctx.beginPath();ctx.arc(x+32,y+32,27,Math.PI,0);ctx.lineTo(x+59,y+64);ctx.moveTo(x+5,y+32);ctx.lineTo(x+5,y+64);ctx.stroke()}}
    if(design==='subway'){ctx.strokeStyle='#4d554c66';ctx.lineWidth=3;for(let y=0;y<256;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=(Math.floor(y/42)%2)*32;x<256;x+=64){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+42);ctx.stroke()}}}
    if(design==='herringbone'||design==='chevron'){ctx.strokeStyle='#4c554b66';ctx.lineWidth=3;for(let y=-64;y<320;y+=32)for(let x=-64;x<320;x+=64){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+32,y+16);ctx.lineTo(x,y+32);if(design==='chevron')ctx.lineTo(x-32,y+16);ctx.stroke()}}
    if(design==='terrazzo'){for(let i=0;i<520;i++){const x=rand()*256,y=rand()*256,r=1+rand()*5;ctx.fillStyle=['#33465766','#b86c5f77','#d39a4d77','#4e7f6a77'][i%4];ctx.beginPath();ctx.moveTo(x+r,y);for(let p=1;p<6;p++)ctx.lineTo(x+Math.cos(p*1.047)*r,y+Math.sin(p*1.047)*r);ctx.fill()}}
    if(design==='hexagon'){ctx.strokeStyle='#48574866';ctx.lineWidth=2;for(let y=-18;y<280;y+=36)for(let x=-20;x<280;x+=42){const ox=x+(Math.floor((y+18)/36)%2)*21;ctx.beginPath();for(let p=0;p<7;p++){const a=Math.PI/3*p+Math.PI/6;const px=ox+18*Math.cos(a),py=y+18*Math.sin(a);p?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}}
    if(design==='zellige'){ctx.strokeStyle='#3e554f77';ctx.lineWidth=2;for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){ctx.save();ctx.translate(x+16,y+16);ctx.rotate(((x+y)/32%2)*Math.PI/4);ctx.strokeRect(-12,-12,24,24);ctx.restore()}}
    if(design==='kitkat'||design==='fluted'){ctx.strokeStyle='#3f514577';ctx.lineWidth=2;const gap=design==='kitkat'?12:8;for(let x=0;x<256;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();if(design==='kitkat')for(let y=0;y<256;y+=38){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+gap,y);ctx.stroke()}}}
    if(design==='travertine'){for(let y=0;y<256;y+=38){ctx.fillStyle=y%76?'#8a806a19':'#ffffff40';ctx.fillRect(0,y,256,36);ctx.strokeStyle='#5f594a44';ctx.strokeRect(0,y,256,36)}for(let i=0;i<260;i++){ctx.fillStyle='#61584630';ctx.fillRect(rand()*256,rand()*256,2+rand()*15,1+rand()*3)}}
    if(design==='marble'){ctx.strokeStyle='#565d5e55';ctx.lineWidth=1.5;for(let i=0;i<20;i++){ctx.beginPath();ctx.moveTo(-20,rand()*256);ctx.bezierCurveTo(55,rand()*256,160,rand()*256,276,rand()*256);ctx.stroke()}}
    if(design==='checker'){for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){ctx.fillStyle=(x/32+y/32)%2?'#44555055':'#ffffff50';ctx.fillRect(x,y,32,32)}}
    if(design==='mosaic'){ctx.strokeStyle='#46584f77';ctx.lineWidth=2;for(let y=0;y<256;y+=20)for(let x=0;x<256;x+=20){ctx.fillStyle=(x+y)%40?'#ffffff22':'#506d6255';ctx.fillRect(x+2,y+2,16,16);ctx.strokeRect(x+1,y+1,18,18)}}
    if(design==='fishscale'){ctx.strokeStyle='#40584f77';ctx.lineWidth=2;for(let y=-20;y<280;y+=30)for(let x=-15;x<280;x+=30){ctx.beginPath();ctx.arc(x+(Math.floor((y+20)/30)%2)*15,y,15,0,Math.PI);ctx.stroke()}}
    if(design==='concrete'){for(let i=0;i<1500;i++){ctx.fillStyle=rand()>.5?'#59615a12':'#ffffff1d';ctx.fillRect(rand()*256,rand()*256,1+rand()*4,1+rand()*4)}}
    if(design==='grid'){ctx.strokeStyle='#45544a66';ctx.lineWidth=2;for(let i=0;i<256;i+=48){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke()}}
    for(let i=0;i<3500;i++){const v=rand()>.5?'#ffffff16':'#353a3413';ctx.fillStyle=v;ctx.fillRect(rand()*256,rand()*256,1,1)}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(design==='paint'?4:2,design==='paint'?4:2);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(texture);finishMaps.set(design,texture);return texture
  }
  const wallMaterials=Array.from({length:16},(_,i)=>new THREE.MeshStandardMaterial({color:defaultWallColours[Math.floor(i/4)],map:finishMap('paint'),bumpMap:finishMap('paint'),bumpScale:.003,roughness:.87}))
  const wallImageMaps:(THREE.Texture|undefined)[]=Array(16)
  const wallMeshes:THREE.Mesh[]=[]
  function wallFace(mesh:THREE.Mesh,faces:Record<number,number>){const materials=Array(6).fill(plaster) as THREE.Material[];for(const [face,id] of Object.entries(faces))materials[Number(face)]=wallMaterials[id];mesh.material=materials;mesh.userData.wallFaces=faces;wallMeshes.push(mesh);return mesh}
  const wallStyleKeys:string[]=[],wallLoads:number[]=Array(16).fill(0)
  function setWallStyle(index:number,style:WallStyle){
    const material=wallMaterials[index];if(!material||!/^#[\da-fA-F]{6}$/.test(style.color)||!wallDesigns.includes(style.design))return
    const key=JSON.stringify(style);if(wallStyleKeys[index]===key)return;wallStyleKeys[index]=key
    const request=++wallLoads[index],map=finishMap(style.design)
    material.color.set(style.color);material.map=map;material.bumpMap=map;material.bumpScale=.003;material.roughness=.87;material.needsUpdate=true
    wallImageMaps[index]?.dispose();wallImageMaps[index]=undefined
    if(style.image)new THREE.TextureLoader().load(style.image,texture=>{
      if(disposed||request!==wallLoads[index]){texture.dispose();return}
      wallImageMaps[index]=texture;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2.5,2.5);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())
      material.color.set('#ffffff');material.map=texture;material.bumpMap=texture;material.bumpScale=.005;material.roughness=.64;material.needsUpdate=true
    },undefined,()=>{if(request===wallLoads[index])wallStyleKeys[index]=''})
  }
  const clayLight=mat('#e2bba6'),mintLight=mat('#b7d6ca'),plumLight=mat('#d9bdd0'),blueLight=mat('#b4d3d8')
  function box(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material|THREE.Material[]=plaster,collision=false,round=0) {
    const obj=new THREE.Mesh(round?new RoundedBoxGeometry(w,h,d,3,Math.min(round,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),material)
    obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;scene.add(obj)
    if(collision)obstacles.push({x,z,w,d});return obj
  }
  function cylinder(rt:number,rb:number,h:number,x:number,y:number,z:number,material:THREE.Material=brass) {
    const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,32),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o
  }
  function ball(r:number,x:number,y:number,z:number,material:THREE.Material,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,20,16),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;scene.add(o);return o}
  const floorMaterials:THREE.MeshStandardMaterial[]=[];const floorMeshes:THREE.Mesh[]=[]
  const floorMaps:THREE.Texture[]=[];const floorDetailMaps:THREE.Texture[][]=[];const floorTileIds:string[]=[]
  for(let i=0;i<4;i++) {
    const material=new THREE.MeshStandardMaterial({roughness:.5,metalness:.02});floorMaterials.push(material)
    const floor=box(8,.1,8,i%2===0?-4:4,-.05,i<2?4:-4,material);floor.userData.floor=true;floorMeshes.push(floor)
  }
  function applyTile(index:number,tile:Tile){
    floorTileIds[index]=tile.id
    floorMaps[index]?.dispose();floorDetailMaps[index]?.forEach(map=>map.dispose());floorDetailMaps[index]=[]
    const material=floorMaterials[index]
    if(tile.image){
      const loader=new THREE.TextureLoader()
      void Promise.all([loader.loadAsync(tile.image),tile.normal?loader.loadAsync(tile.normal):Promise.resolve(null),tile.roughness?loader.loadAsync(tile.roughness):Promise.resolve(null)]).then(([diffuse,normal,roughness])=>{
        if(disposed||floorTileIds[index]!==tile.id){diffuse.dispose();normal?.dispose();roughness?.dispose();return}
        for(const map of [diffuse,normal,roughness])if(map){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(tile.repeat,tile.repeat);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())}
        diffuse.colorSpace=THREE.SRGBColorSpace
        floorMaps[index].dispose();floorMaps[index]=diffuse;floorDetailMaps[index]=[];if(normal)floorDetailMaps[index].push(normal);if(roughness)floorDetailMaps[index].push(roughness)
        material.map=diffuse;material.bumpMap=null;material.normalMap=normal;material.roughnessMap=roughness;material.roughness=tile.family==='Wood'?.8:.65;material.needsUpdate=true
      }).catch(()=>{/* Keep the previous backend material when a request fails. */})
    }
  }
  // Properly enclosed partitions with 1.5 m cased openings between the rooms.
  for(const z of [-6.625,-1.875,1.875,6.625])wallFace(box(.18,3.5,Math.abs(z)<2?3.75:2.75,0,1.75,z,plaster,true),z<0?{0:12,1:9}:{0:4,1:1})
  for(const z of [-4.5,4.5]){
    wallFace(box(.18,.6,1.5,0,3.2,z),z<0?{0:12,1:9}:{0:4,1:1})
    for(const edge of [-.75,.75])box(.09,2.9,.1,0,1.45,z+edge,oak)
    box(.09,.08,1.5,0,2.87,z,oak)
  }
  for(const x of [-6.625,-1.875,1.875,6.625])wallFace(box(Math.abs(x)<2?3.75:2.75,3.5,.18,x,1.75,0,plaster,true),x<0?{4:2,5:11}:{4:6,5:15})
  for(const x of [-4.5,4.5]){
    wallFace(box(1.5,.6,.18,x,3.2,0),x<0?{4:2,5:11}:{4:6,5:15})
    for(const edge of [-.75,.75])box(.1,2.9,.09,x+edge,1.45,0,oak)
    box(1.5,.08,.09,x,2.87,0,oak)
  }
  // Solid exterior walls and human-scale glazed windows, with continuous sills and headers.
  for(const z of [-8,8]) {
    for(const x of [-4,4]){
      const face=z<0?4:5,wall=z<0?(x<0?10:14):(x<0?3:7)
      wallFace(box(8,1.05,.2,x,.525,z,plaster,true),{[face]:wall})
      wallFace(box(8,.8,.2,x,3.1,z),{[face]:wall})
      for(const side of [-1,1])wallFace(box(2.8,1.65,.2,x+side*2.6,1.875,z,plaster,true),{[face]:wall})
      box(2.4,1.65,.045,x,1.875,z,glass,true)
      for(const edge of [-1.2,0,1.2])box(.06,1.69,.13,x+edge,1.875,z,dark)
      for(const y of [1.04,2.71])box(2.55,.07,.16,x,y,z,dark)
      box(2.6,.065,.32,x,1.025,z+(z<0?.13:-.13),plaster)
    }
  }
  for(const x of [-8,8])for(const z of [-4,4]){
    wallFace(box(.2,3.5,8,x,1.75,z,plaster,true),x<0?{0:z<0?8:0}:{1:z<0?13:5})
    box(.07,.12,8,x+(x<0?.13:-.13),.09,z,oak)
  }
  for(const x of [-4,4])for(const z of [-4,4]){
    const ceiling=x<0?(z<0?plumLight:clayLight):(z<0?blueLight:mintLight)
    box(8,.12,8,x,3.56,z,ceiling)
    box(7.55,.07,.07,x,3.46,z-3.78,brass)
  }
  // Recessed warm ceiling panels, diffuse fill and directional daylight.
  const glow=new THREE.MeshStandardMaterial({color:'#fff6dc',emissive:'#fff1c5',emissiveIntensity:1.5})
  const recessedLights:THREE.Mesh[]=[]
  for(const x of [-5,-2,2,5])for(const z of [-5,5])recessedLights.push(box(.65,.03,.65,x,3.48,z,glow))
  const hemi=new THREE.HemisphereLight('#e7f3ff','#d2b892',1.35);scene.add(hemi)
  const sun=new THREE.DirectionalLight('#fff4de',2.1);sun.position.set(-3,8,5);sun.target.position.set(0,0,-3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:40});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun,sun.target)
  for(const x of [-4,4])for(const z of [-4,4]){const light=new THREE.PointLight('#fff4df',3.5,10,2);light.position.set(x,2.9,z);scene.add(light)}
  // One downloaded CC0 PBR fixture, cloned across the residence. The invisible
  // point lights remain so the real lamp mesh also provides practical room lighting.
  new GLTFLoader().load('/models/modern-ceiling-lamp/modern_ceiling_lamp_01_1k.gltf',gltf=>{
    if(disposed)return
    const source=gltf.scene
    const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
    // The source asset includes a full suspension cable. Keep the shade at a
    // domestic 48 cm diameter instead of scaling it to a furniture-sized prop.
    const scale=.48/Math.max(size.x,size.z)
    source.position.sub(center)
    for(const x of [-4,4])for(const z of [-4,4]){
      const lamp=new THREE.Group();lamp.position.set(x,3.48-size.y*scale/2,z);lamp.scale.setScalar(scale);lamp.add(source.clone(true))
      lamp.traverse(part=>{if(part instanceof THREE.Mesh){part.castShadow=true;part.receiveShadow=true}});scene.add(lamp)
    }
    recessedLights.forEach(light=>{light.visible=false})
  },undefined,()=>{/* Subtle recessed fixtures remain available if the optional model is unavailable. */})
  const ground=box(100,.1,100,0,-.17,0,mat('#8ea799'));ground.receiveShadow=true
  function plant(x:number,z:number,scale=1){cylinder(.26*scale,.19*scale,.5*scale,x,.25*scale,z,cream);cylinder(.035,.045,1.2*scale,x,.9*scale,z,oak);for(let i=0;i<8;i++){const a=i*2.4;const leaf=ball(.3*scale,x+Math.sin(a)*.25*scale,(.9+i*.09)*scale,z+Math.cos(a)*.25*scale,green,.5,1.5,.5);leaf.rotation.z=Math.sin(a)*.5}}
  function artwork(x:number,y:number,z:number,w:number,h:number,source:string){
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=Math.PI/2;scene.add(group)
    const frame=new THREE.Mesh(new THREE.BoxGeometry(w+.12,h+.12,.08),oak);frame.castShadow=true;group.add(frame)
    const mount=new THREE.Mesh(new THREE.PlaneGeometry(w-.08,h-.08),mat('#eee8dd'));mount.position.z=.045;group.add(mount)
    const image=new THREE.Mesh(new THREE.PlaneGeometry(w-.16,h-.16),new THREE.MeshStandardMaterial({color:'#e8e2d5',roughness:.88,side:THREE.DoubleSide}));image.position.z=.048;group.add(image)
    new THREE.TextureLoader().load(source,texture=>{
      if(disposed){texture.dispose();return}
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(texture)
      const material=image.material as THREE.MeshStandardMaterial;material.color.set('#ffffff');material.map=texture;material.needsUpdate=true
    })
  }
  // Living room: linen modular sofa, oak media wall, sculptural tables and plants.
  const linen=tactile('#40675e','cloth')
  const sofaStart=scene.children.length
  box(1.22,.42,3.5,-6.9,.36,4.0,linen,true,.14);box(.35,.95,3.7,-7.5,.73,4,linen,false,.1)
  for(const z of [2.7,4,5.3]){box(1.16,.23,1.14,-6.85,.66,z,linen,false,.1);const pillow=box(.27,.6,.75,-7.1,.96,z,mat(z===4?'#d29b4c':'#cd735d'),false,.12);pillow.rotation.z=-.12}
  for(const z of [2.1,5.9])box(1.3,.65,.24,-6.9,.59,z,linen,false,.08)
  const sofaFallback=scene.children.slice(sofaStart)
  sofaFallback.forEach(part=>{part.visible=false})
  new GLTFLoader().load('/models/sofa-03/sofa_03_1k.gltf',gltf=>{
    if(disposed)return
    const model=gltf.scene
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
    const scale=3.25/Math.max(size.x,size.z)
    model.position.sub(center)
    const placed=new THREE.Group();placed.position.set(-6.9,size.y*scale/2,4);placed.scale.setScalar(scale)
    placed.rotation.y=size.x>size.z?Math.PI/2:0
    placed.add(model)
    model.traverse(part=>{if(part instanceof THREE.Mesh){part.castShadow=true;part.receiveShadow=true}})
    scene.add(placed)
    sofaFallback.forEach(part=>{part.visible=false})
  },undefined,()=>{/* Keep the modelled sofa if the downloaded asset cannot load. */})
  const tableStart=scene.children.length
  cylinder(.72,.65,.24,-4.75,.47,3.5,oak);obstacles.push({x:-4.75,z:3.5,w:1.5,d:1.5});cylinder(.3,.3,.36,-4.75,.2,3.5,dark)
  const tableFallback=scene.children.slice(tableStart)
  tableFallback.forEach(part=>{part.visible=false})
  new GLTFLoader().load('/models/coffee-table/modern_coffee_table_01_1k.gltf',gltf=>{
    if(disposed)return
    const model=gltf.scene
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
    const scale=1.45/Math.max(size.x,size.z)
    model.position.sub(center)
    const placed=new THREE.Group();placed.position.set(-4.75,size.y*scale/2,3.5);placed.scale.setScalar(scale);placed.add(model)
    model.traverse(part=>{if(part instanceof THREE.Mesh){part.castShadow=true;part.receiveShadow=true}})
    scene.add(placed)
    tableFallback.forEach(part=>{part.visible=false})
  },undefined,()=>{/* Retain the simple table when offline or if the model fails. */})
  // Two real PBR armchairs, shared from one local CC0 glTF asset.
  new GLTFLoader().load('/models/modern-arm-chair/modern_arm_chair_01_1k.gltf',gltf=>{
    if(disposed)return
    const source=gltf.scene
    const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
    const scale=1.15/Math.max(size.x,size.z)
    const place=(x:number,z:number,rotation:number)=>{const model=source.clone(true);model.position.sub(center);const chair=new THREE.Group();chair.position.set(x,size.y*scale/2,z);chair.scale.setScalar(scale);chair.rotation.y=rotation;chair.add(model);chair.traverse(part=>{if(part instanceof THREE.Mesh){part.castShadow=true;part.receiveShadow=true}});scene.add(chair)}
    place(-3.15,2.45,-.8);place(-3.15,5.5,.8)
  },undefined,()=>{/* The room remains navigable if this optional chair asset cannot load. */})
  cylinder(.36,.32,.5,-4.15,.25,4.65,cream);box(.4,.04,.3,-4.7,.62,3.5,mat('#efe9dc'));cylinder(.1,.07,.22,-4.9,.7,3.42,green)
  // Reference-style media wall: shallow stone relief, slim TV and floating ivory cabinetry.
  const mediaIvory=mat('#e9e3d7',.38),mediaShadow=mat('#403d35',.75)
  const feature=box(3.42,3.23,.065,-1.91,1.69,.135,wallMaterials[2])
  feature.userData.wallFaces={0:2};wallMeshes.push(feature)
  const stoneGeometry=new THREE.BoxGeometry(.55,.145,1)
  const stoneRelief=new THREE.InstancedMesh(stoneGeometry,wallMaterials[2],120)
  const stoneTransform=new THREE.Object3D()
  for(let row=0;row<20;row++)for(let col=0;col<6;col++){
    const depth=.025+((row*7+col*13)%5)*.007
    stoneTransform.position.set(-3.32+col*.565, .17+row*.156, .182+depth/2)
    stoneTransform.scale.set(1,1,depth);stoneTransform.updateMatrix()
    stoneRelief.setMatrixAt(row*6+col,stoneTransform.matrix)
  }
  stoneRelief.castShadow=true;stoneRelief.receiveShadow=true;stoneRelief.userData.wallFaces={0:2};wallMeshes.push(stoneRelief);scene.add(stoneRelief)
  box(3.38,.37,.48,-1.91,.44,.49,mediaIvory,true,.018)
  box(3.45,.035,.53,-1.91,.64,.51,mediaIvory,false,.009)
  for(const x of [-3.04,-1.91,-.78]){
    box(1.10,.26,.024,x,.44,.747,mediaIvory,false,.008)
    box(.36,.014,.025,x,.565,.766,mediaShadow)
  }
  box(.8,.095,.025,-1.91,.49,.767,mat('#232729',.3))
  box(2.20,1.27,.065,-1.91,1.82,.27,mat('#16191c',.22,.15),false,.018)
  box(2.13,1.20,.012,-1.91,1.82,.308,mat('#22262a',.17,.35),false,.012)
  box(.55,.07,.085,-1.91,1.12,.32,mat('#1e2424',.55),false,.02)
  const cove= new THREE.MeshStandardMaterial({color:'#ffedc8',emissive:'#ffda9c',emissiveIntensity:2})
  box(3.38,.016,.03,-1.91,.24,.71,cove)
  for(const z of [.28,7.72]){box(7.48,.12,.22,-4,3.39,z,mediaIvory);box(7.32,.018,.035,-4,3.33,z+(z<4?.12:-.12),cove)}
  for(const x of [-7.72,-.28]){box(.22,.12,7.48,x,3.39,4,mediaIvory);box(.035,.018,7.32,x+(x< -4?.12:-.12),3.33,4,cove)}
  for(const x of [-3.0,-.85]){
    cylinder(.075,.075,.045,x,3.29,.7,mat('#45443e',.35,.5))
    cylinder(.057,.057,.006,x,3.263,.7,cove)
    const spot=new THREE.SpotLight('#ffe5bb',10,4.5,Math.PI/5,.65,2)
    spot.position.set(x,3.23,.74);spot.target.position.set(x,1.75,.18);scene.add(spot,spot.target)
  }
  for(const z of [.13,7.85])box(7.5,.1,.04,-4,.09,z,mediaIvory)
  artwork(-7.84,2.25,3.9,2,1.15,'/art/courtyard.png')
  cylinder(.26,.28,.04,-7,.04,6.7,dark);cylinder(.025,.025,2,-7,1,6.7,brass);cylinder(.4,.5,.5,-7,2.05,6.7,cream)
  // Kitchen: sage cabinetry, stone worktops, appliances, island and dining stools.
  const cabinet=mat('#345650',.52),cabinetInset=mat('#2b4943',.61),upper=mat('#e1d4bd',.6)
  const steel=mat('#aeb7b7',.32,.85),applianceGlass=mat('#161e22',.19,.3)
  // Two cabinet runs leave the existing 1.5 m doorway clear.
  function cabinetDoor(x:number,y:number,w:number,h:number,z:number,finish:THREE.Material,inset:THREE.Material){
    box(w,h,.045,x,y,z,inset,false,.01)
    for(const dx of [-1,1])box(.055,h,.065,x+dx*(w/2-.0275),y,z+.012,finish,false,.008)
    for(const dy of [-1,1])box(w-.11,.055,.065,x,y+dy*(h/2-.0275),z+.012,finish,false,.008)
    box(.025,.19,.035,x+w/2-.09,y+.04,z+.065,brass,false,.008)
  }
  for(const x of [1.55,2.4,3.25,5.8,6.65,7.5]){
    box(.82,.75,.66,x,.495,.5,cabinet,true,.012)
    box(.8,.11,.5,x,.12,.44,dark)
    cabinetDoor(x,.51,.79,.7,.85,cabinet,cabinetInset)
    box(.82,.78,.32,x,2.08,.29,upper,false,.012)
    cabinetDoor(x,2.08,.79,.75,.475,upper,cream)
    box(.75,.015,.045,x,1.682,.43,glow)
  }
  // Honed quartz, with subtle mineral speckling rather than stretched floor-tile veins.
  const quartz=tactile('#e9e5dc','paint');quartz.roughness=.32;quartz.bumpScale=.001
  box(2.6,.045,.78,2.4,.895,.51,quartz,false,.012)
  // Countertop surrounds a genuine basin opening.
  box(.47,.045,.78,5.6,.895,.51,quartz,false,.01)
  box(1.17,.045,.78,7.33,.895,.51,quartz,false,.01)
  for(const z of [.205,.815])box(.91,.045,.17,6.285,.895,z,quartz,false,.008)
  box(.83,.025,.42,6.285,.68,.51,steel,false,.015)
  for(const x of [5.85,6.72])box(.025,.2,.44,x,.785,.51,steel)
  for(const z of [.295,.725])box(.88,.2,.025,6.285,.785,z,steel)
  cylinder(.045,.045,.005,6.285,.696,.51,dark)
  const tapPath=new THREE.CatmullRomCurve3([new THREE.Vector3(6.285,.92,.21),new THREE.Vector3(6.285,1.27,.21),new THREE.Vector3(6.285,1.34,.37),new THREE.Vector3(6.285,1.2,.48)])
  const tap=new THREE.Mesh(new THREE.TubeGeometry(tapPath,20,.018,8,false),steel);tap.castShadow=true;scene.add(tap)
  cylinder(.042,.042,.04,6.285,.935,.21,steel)
  box(.08,.025,.03,6.36,.97,.21,steel,false,.008)
  // Black induction hob and built-in oven: door, seals, controls and bar handle.
  box(.73,.018,.5,2.4,.93,.52,applianceGlass,false,.018)
  for(const x of [2.22,2.58])for(const z of [.38,.65]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.002,4,32),steel);ring.rotation.x=Math.PI/2;ring.position.set(x,.941,z);scene.add(ring)
  }
  box(.7,.6,.035,2.4,.48,.912,steel,false,.015)
  box(.6,.39,.018,2.4,.43,.938,applianceGlass,false,.018)
  box(.49,.035,.04,2.4,.67,.98,steel,false,.009)
  box(.15,.035,.012,2.4,.74,.941,dark)
  for(const x of [2.16,2.64]){const dial=cylinder(.027,.027,.02,x,.74,.95,steel);dial.rotation.x=Math.PI/2}
  // Brushed steel fridge with separate doors, recessed seals and physical handles.
  box(.88,2.03,.78,7.3,1.045,1.8,steel,true,.035)
  for(const [y,h] of [[1.36,1.34],[.36,.59]]){
    box(.84,h,.06,7.3,y,2.22,steel,false,.022)
    box(.035,Math.min(.45,h-.15),.065,6.98,y,2.285,steel,false,.012)
  }
  box(.16,.23,.008,7.49,1.52,2.255,applianceGlass,false,.012)
  box(2.7,.12,.94,4.4,.06,3.6,dark)
  box(2.8,.8,1.1,4.4,.52,3.6,cabinet,true,.025);box(3.05,.045,1.4,4.4,.945,3.6,quartz,false,.012)
  for(const x of [3.48,4.4,5.32])cabinetDoor(x,.53,.88,.73,4.165,cabinet,cabinetInset)
  for(const x of [3.6,5.2]){cylinder(.3,.3,.1,x,.67,4.65,oak);for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(.035,.62,.035,x+dx,.31,4.65+dz,dark);obstacles.push({x,z:4.65,w:.6,d:.6});cylinder(.016,.016,.85,x,3.1,3.6,brass);cylinder(.3,.18,.28,x,2.59,3.6,cream)}
  cylinder(.25,.12,.09,4.4,1.0125,3.6,oak);for(const dx of [-.1,0,.1])ball(.09,4.4+dx,1.10,3.6,mat('#c79b42'))
  // ── Modern bedroom – realistic real-estate look ──────────────────────────
  // Materials (prefixed 'bed' to avoid conflict with living-room 'linen')
  const bedLinen=tactile('#c8cdd4','cloth')        // soft grey-blue linen (realistic bed)
  const bedLinenDark=tactile('#9aa3ae','cloth')    // darker contrast linen for quilt top
  const bedWalnut=tactile('#6b4c38','wood')        // warm walnut for bed frame & furniture
  const concretePanel=mat('#7a7d80',.82)           // slate/concrete headboard panel
  const bedWarmWhite=mat('#f2ede6',.55)            // walls / wardrobe finish
  const bedNaturalOak=tactile('#a07850','wood')    // lighter oak for floating shelf
  const bedRugCloth=tactile('#8d8478','cloth')     // charcoal-tone area rug

  // ── Bedroom walls – correct indices 4-7 (room 1 × 4 + side 0-3) ─────────
  // West wall (index 4) – headboard accent wall: concrete/dark grey
  const bedHeadWall=wallFace(box(7.6,3.5,.18,4,1.75,-8,plaster,true),{5:7})
  void bedHeadWall
  // East wall (index 5)
  const bedEastWall=wallFace(box(7.6,3.5,.18,4,1.75,0,plaster,true),{4:6})
  void bedEastWall
  // North wall (index 6) – already covered by shared partition, but set its material
  // South wall (index 7) is the exterior window wall

  // ── Concrete headboard accent panel on the north wall ────────────────────
  // Mounted on north interior face at x≈4, z≈-8 wall
  box(3.8,1.6,.06,-4,1.2,-7.72,concretePanel,false,.04)
  // Slim LED strip at bottom of panel
  const bedroomCove=new THREE.MeshStandardMaterial({color:'#ffecc0',emissive:'#ffd990',emissiveIntensity:2.4})
  box(3.6,.018,.04,-4,.44,-7.72,bedroomCove)
  // Thin oak trim at top of panel
  box(3.85,.055,.08,-4,2.025,-7.72,bedWalnut,false,.008)

  // ── Bed frame – walnut platform bed ──────────────────────────────────────
  // Base platform
  box(2.9,.18,2.2,-4,.09,-6.4,bedWalnut,true,.06)
  // Slightly raised mattress base
  box(2.78,.12,2.1,-4,.27,-6.4,bedWarmWhite,false,.04)
  // Mattress
  box(2.72,.26,2.05,-4,.44,-6.4,bedLinen,false,.08)
  // Flat headboard (concrete panel) rising from platform
  box(2.86,.95,.14,-4,.92,-7.42,concretePanel,false,.06)
  // Walnut cap rail on headboard
  box(2.92,.055,.16,-4,1.415,-7.42,bedWalnut,false,.01)

  // ── Realistic quilt / duvet – grey-blue linen, smooth drape ──────────────
  const quiltGeometry=new THREE.PlaneGeometry(2.82,2.14,56,46)
  const quiltPos=quiltGeometry.attributes.position
  for(let i=0;i<quiltPos.count;i++){
    const x=quiltPos.getX(i),v=quiltPos.getY(i)
    const edge=Math.max(0,Math.abs(x)-1.1)*.55
    const foot=Math.max(0,-v-.72)*.6
    const folds=.012*Math.sin(x*18+v*5)+.009*Math.sin(v*22+x*3)*.5
    quiltPos.setXYZ(i,x,.72-edge-foot+folds,-6.32-v*.96)
  }
  quiltGeometry.computeVertexNormals()
  const quilt=new THREE.Mesh(quiltGeometry,bedLinenDark);quilt.position.x=-4;quilt.castShadow=true;quilt.receiveShadow=true;scene.add(quilt)
  // Quilt fold-over at top showing lighter linen inner
  const foldGeom=new THREE.PlaneGeometry(2.72,.28,28,4);const foldPos=foldGeom.attributes.position
  for(let i=0;i<foldPos.count;i++){const v=foldPos.getY(i);foldPos.setXYZ(i,foldPos.getX(i),.75-.06*v,-6.68+.18*v)}
  foldGeom.computeVertexNormals()
  const fold=new THREE.Mesh(foldGeom,bedLinen);fold.position.x=-4;fold.castShadow=true;scene.add(fold)

  // ── Pillows – realistic stacked arrangement ───────────────────────────────
  for(const x of [-4.72,-3.28]){
    const pillow=box(1.04,.18,.62,x,.67,-7.26,bedLinen,false,.12);pillow.rotation.x=.18
    const pillow2=box(.98,.16,.58,x,.88,-7.24,bedWarmWhite,false,.10);pillow2.rotation.x=.15
  }
  // Small decorative cushion centre
  const deco=box(.62,.38,.18,-4,.88,-7.08,tactile('#8fa3b0','cloth'),false,.09);deco.rotation.z=.06

  // ── Bedside tables – floating walnut wall-mounted ─────────────────────────
  for(const x of [-5.8,-2.2]){
    // Floating shelf table
    box(.7,.04,.52,x,.72,-7.2,bedWalnut,false,.01)
    // Small drawer body
    box(.66,.28,.48,x,.56,-7.2,bedWalnut,false,.02)
    // Brass pull
    box(.22,.018,.02,x,.56,-6.95,brass,false,.005)
    // Bedside lamp – ceramic base
    cylinder(.12,.16,.32,x,.88,-7.2,bedWarmWhite)
    // Lamp shade
    const shadeGeom=new THREE.CylinderGeometry(.18,.22,.28,16,1,true);const shadeMat=new THREE.MeshStandardMaterial({color:'#f0e4c8',roughness:.92,side:THREE.DoubleSide,transparent:true,opacity:.82});const shade=new THREE.Mesh(shadeGeom,shadeMat);shade.position.set(x,1.12,-7.2);shade.castShadow=true;scene.add(shade)
    // Lamp glow disc
    const lampGlow=new THREE.MeshStandardMaterial({color:'#ffeaaa',emissive:'#ffda88',emissiveIntensity:2.8})
    cylinder(.08,.08,.012,x,1.25,-7.2,lampGlow)
    // Point light for bedside lamp
    const bedLight=new THREE.PointLight('#fff0cc',4.5,2.8,2);bedLight.position.set(x,1.3,-7.1);scene.add(bedLight)
  }

  // ── Area rug under bed ────────────────────────────────────────────────────
  box(4.2,.012,3.2,-4,.006,-6.2,bedRugCloth,false,.01)

  // ── Wardrobe / built-in closet on west wall ───────────────────────────────
  box(2.4,2.85,.62,-6.4,1.425,-5.6,bedWarmWhite,true,.03)
  // Three wardrobe doors
  for(const xd of [-6.9,-6.4,-5.9]){
    box(.78,2.7,.04,xd,1.425,-5.28,bedWarmWhite,false,.01)
    box(.74,2.66,.018,xd,1.425,-5.26,mat('#e8e4dc',.45),false,.01)
    // Brass bar handle
    cylinder(.012,.012,.24,xd+.31,1.42,-5.24,brass);cylinder(.012,.012,.024,xd+.31,.74,-5.24,brass);cylinder(.012,.012,.024,xd+.31,2.1,-5.24,brass)
  }
  // Wardrobe top cap
  box(2.46,.055,.64,-6.4,2.87,-5.6,bedWarmWhite,false,.008)

  // ── Floating wall shelf (above wardrobe / art area) ───────────────────────
  box(3.6,.06,.28,-4,2.72,-7.72,bedNaturalOak,false,.01)
  // Shelf items: small framed prints
  for(const x of [-5.1,-4,-2.9]){
    box(.28,.38,.04,x,2.93,-7.7,bedWalnut,false,.005)
    box(.24,.33,.01,x,2.93,-7.68,bedWarmWhite,false,.003)
  }
  // Small decor vase on shelf
  cylinder(.055,.07,.18,-4.6,2.87,-7.7,mat('#c4b8a4',.55))
  cylinder(.04,.055,.06,-4.6,2.97,-7.7,bedWalnut)

  // ── Bedroom wall art ─────────────────────────────────────────────────────
  artwork(-7.84,2,-4.5,1.3,1.7,'/art/botanical.png')
  // Extra framed art above bed on concrete panel
  const artFrame=box(1.4,.98,.05,-4,1.52,-7.68,bedWalnut,false,.01);void artFrame
  const artCanvas=box(1.3,.88,.01,-4,1.52,-7.64,bedWarmWhite,false,.005);void artCanvas

  // ── Ceiling washers for bedroom (warm focused) ────────────────────────────
  for(const x of [-5.5,-4,-2.5]){
    cylinder(.07,.07,.022,x,3.43,-7.08,brass)
    cylinder(.052,.052,.024,x,3.412,-7.08,bedroomCove)
    const bspot=new THREE.SpotLight('#ffe4b5',6,4.5,.45,.7,1.8);bspot.position.set(x,3.35,-7.08);bspot.target.position.set(x,1.4,-7.55);scene.add(bspot,bspot.target)
  }
  // ── Modern luxury bathroom – spacious, spa-like real-estate look ────────────────────
  const bathStone=mat('#d6d0c6',.60)                     // natural stone countertop & tray
  const bathPorcelain=mat('#f4f1ed',.14)                 // high-gloss white porcelain fixtures
  const bathBrass=mat('#c39654',.19,.80)                 // brushed warm gold taps & rail
  const bathChrome=mat('#c4c9c9',.07,.95)                // brushed chrome panel accents
  const bathShadeGlass=new THREE.MeshPhysicalMaterial({color:'#d4e4e0',transparent:true,opacity:.10,roughness:.04,metalness:.06,side:THREE.DoubleSide})
  const bathVanityWood=tactile('#7a5a3e','wood')         // warm walnut floating vanity
  const bathLED=new THREE.MeshStandardMaterial({color:'#fff8e8',emissive:'#ffedcc',emissiveIntensity:2.6})
  function wallDisc(radius:number,depth:number,x:number,y:number,z:number,material:THREE.Material){
    const disc=cylinder(radius,radius,depth,x,y,z,material);disc.rotation.x=Math.PI/2;return disc
  }
  void wallDisc // keep function available for mirror/accessory use

  // ── Double floating vanity (north wall) ──────────────────────────────────────────
  box(2.4,.50,.54,6.22,.75,-7.58,bathVanityWood,true,.02)
  box(2.36,.016,.022,6.22,.49,-7.34,bathLED)              // floating LED shadow gap
  box(2.52,.040,.60,6.22,1.02,-7.57,bathStone,false,.01)  // stone countertop
  // Two vessel sinks (lathe geometry)
  const vPts=[new THREE.Vector2(.04,0),new THREE.Vector2(.205,0),new THREE.Vector2(.30,.086),new THREE.Vector2(.308,.128),new THREE.Vector2(.287,.136),new THREE.Vector2(.265,.092),new THREE.Vector2(.155,.022),new THREE.Vector2(.04,.021)]
  const vGeom=new THREE.LatheGeometry(vPts,42)
  const sink1=new THREE.Mesh(vGeom,bathPorcelain);sink1.position.set(5.44,1.07,-7.3);sink1.castShadow=true;scene.add(sink1)
  const sink2=new THREE.Mesh(vGeom,bathPorcelain);sink2.position.set(7.0,1.07,-7.3);sink2.castShadow=true;scene.add(sink2)
  // Slim gooseneck wall-mount taps
  for(const tx of [5.44,7.0]){
    cylinder(.015,.015,.28,tx,1.32,-7.67,bathBrass)
    box(.02,.02,.22,tx,1.32,-7.57,bathBrass,false,.006)
    cylinder(.03,.03,.007,tx,1.335,-7.46,bathBrass)
  }

  // ── Large backlit mirror panel ─────────────────────────────────────────────────
  box(2.38,.013,.016,6.22,1.76,-7.83,bathLED)             // top LED strip
  box(2.38,.013,.016,6.22,1.02,-7.83,bathLED)             // bottom LED strip
  box(2.32,.72,.014,6.22,1.39,-7.82,new THREE.MeshStandardMaterial({color:'#bdc8c6',roughness:.03,metalness:.94}),false,.005)

  // ── Freestanding oval soaking bathtub (centre of room) ─────────────────────────
  const tubOuter=new THREE.Mesh(new THREE.CylinderGeometry(.76,.70,.46,42,1),bathPorcelain)
  tubOuter.scale.set(1.62,1,.87);tubOuter.position.set(4,.23,-5.5);tubOuter.castShadow=true;tubOuter.receiveShadow=true;scene.add(tubOuter)
  const tubInner=new THREE.Mesh(new THREE.CylinderGeometry(.62,.58,.26,42,1),mat('#d8d4ce',.22))
  tubInner.scale.set(1.62,1,.87);tubInner.position.set(4,.34,-5.5);scene.add(tubInner)
  const tubBase=new THREE.Mesh(new THREE.CylinderGeometry(.80,.80,.052,42,1),bathStone)
  tubBase.scale.set(1.64,1,.89);tubBase.position.set(4,.026,-5.5);scene.add(tubBase)
  cylinder(.02,.02,.50,5.15,.41,-5.5,bathBrass)           // floor-mount filler tap
  box(.026,.026,.24,5.15,.68,-5.5,bathBrass,false,.006)
  cylinder(.082,.082,.016,5.15,.028,-5.5,bathBrass)
  obstacles.push({x:4,z:-5.5,w:2.8,d:1.64})

  // ── Walk-in rain shower (north-west corner, open-plan) ──────────────────────────
  box(2.0,.040,1.98,1.0,.020,-6.87,bathStone,false,.016)  // shower tray
  box(1.76,.012,.055,1.0,.052,-5.88,bathChrome,false,.004) // linear drain channel
  box(.015,2.16,1.98,2.02,1.08,-6.87,bathShadeGlass,false) // frameless glass panel
  box(.018,2.20,.016,2.02,1.1,-7.88,bathBrass)            // glass edge trim
  box(.018,2.20,.016,2.02,1.1,-5.88,bathBrass)            // glass edge trim
  box(.48,.015,.48,1.0,3.36,-7.3,bathChrome,false,.009)   // ceiling rain head 500mm
  cylinder(.015,.015,.10,1.0,3.26,-7.3,bathBrass)         // ceiling arm
  box(.095,.26,.036,.17,1.50,-6.38,bathChrome,false,.008) // thermostatic panel
  for(const cy of [1.42,1.60])cylinder(.036,.036,.040,.17,cy,-6.36,bathBrass)
  box(.022,1.0,.022,.17,1.9,-6.92,bathBrass,false,.005)   // body-spray bar
  for(const sy of [1.45,1.72,1.99,2.26])cylinder(.030,.030,.026,.17,sy,-6.92,bathBrass)
  box(.52,.072,.16,.06,.036,-6.35,bathStone,false,.01)    // recessed niche shelf

  // ── Wall-hung WC (concealed cistern, rimless modern) ───────────────────────────
  box(.34,.90,.15,7.72,.63,-3.55,bathStone,true,.016)     // flush cistern panel
  const wcBowl=new THREE.Mesh(new THREE.CylinderGeometry(.265,.205,.165,36),bathPorcelain)
  wcBowl.scale.set(1.28,1,.94);wcBowl.position.set(7.20,.485,-3.55);wcBowl.castShadow=true;scene.add(wcBowl)
  const wcTorus=new THREE.Mesh(new THREE.TorusGeometry(.25,.028,8,36),bathPorcelain)
  wcTorus.rotation.x=Math.PI/2;wcTorus.scale.x=1.28;wcTorus.scale.y=.94;wcTorus.position.set(7.20,.588,-3.55);scene.add(wcTorus)
  box(.52,.016,.48,7.20,.61,-3.55,mat('#f0ece6',.30),false,.065)  // slim WC seat
  box(.155,.08,.010,7.72,.88,-3.55,bathChrome,false,.005)         // flush plate
  obstacles.push({x:7.22,z:-3.55,w:.98,d:.66})

  // ── Heated towel rail (east wall, ladder-style brass) ────────────────────────────
  for(const zr of [-5.72,-5.24])cylinder(.019,.019,1.35,7.76,1.15,zr,bathBrass)
  for(const zb of [-5.72,-5.48,-5.24])cylinder(.019,.019,.50,7.76,1.1,zb,bathBrass)
  box(.014,.38,.50,7.76,1.19,-5.48,tactile('#e8e4de','cloth'),false,.006) // hung towel

  // ── Vanity accessories ───────────────────────────────────────────────────────────
  cylinder(.042,.050,.14,5.62,1.075,-7.26,bathChrome)     // soap dispenser (left sink)
  cylinder(.013,.013,.055,5.62,1.205,-7.26,bathBrass)
  cylinder(.042,.050,.14,7.18,1.075,-7.26,bathChrome)     // soap dispenser (right sink)
  cylinder(.013,.013,.055,7.18,1.205,-7.26,bathBrass)
  // Small potted plant on vanity
  cylinder(.06,.08,.12,6.72,1.06,-7.26,mat('#7a5a35',.72))
  cylinder(.02,.018,.9,6.72,1.18,-7.26,mat('#2f6040',.72))
  for(let bi=0;bi<5;bi++){const ba=bi*1.26;ball(.055,6.72+Math.sin(ba)*.055,1.30+bi*.035,-7.26+Math.cos(ba)*.055,mat('#3d7050'),.38,1.8,.38)}
  // Floating shelf on east wall with decor
  box(1.0,.045,.20,7.3,1.55,-5.5,bathVanityWood,false,.008)
  cylinder(.055,.065,.15,7.55,1.62,-5.46,mat('#b0a090',.62))  // stone jar
  cylinder(.038,.038,.22,7.08,1.62,-5.46,bathPorcelain)       // bud vase

  // ── Bathroom lighting ────────────────────────────────────────────────────────────
  // Recessed ceiling spots over vanity
  for(const lx of [5.44,6.22,7.0]){
    cylinder(.052,.052,.014,lx,3.48,-7.18,bathLED)
    const vs=new THREE.SpotLight('#fff8e8',9,5.5,.36,.72,2);vs.position.set(lx,3.42,-7.08);vs.target.position.set(lx,1.04,-7.32);scene.add(vs,vs.target)
  }
  cylinder(.052,.052,.014,4,3.48,-5.5,bathLED)            // over bathtub
  const tl=new THREE.PointLight('#fff4ec',5.5,5,2);tl.position.set(4,3.05,-5.5);scene.add(tl)
  cylinder(.052,.052,.014,1.0,3.48,-6.87,bathLED)         // shower zone
  const sl=new THREE.PointLight('#f0f8ff',4,3.5,2);sl.position.set(1.0,3.2,-6.87);scene.add(sl)
  const ml=new THREE.PointLight('#fffaf0',3.5,3,2);ml.position.set(6.22,1.42,-7.52);scene.add(ml)  // mirror fill
  const bf=new THREE.PointLight('#fff8f4',2.5,9,1.6);bf.position.set(4.5,2.6,-4.8);scene.add(bf)  // ambient fill
  for(const x of [-4,4]){
    box(7.5,.016,.04,x,3.42,-7.79,glow)
    box(7.6,.06,.20,x,3.46,-7.79,plaster)
  }
  function pickWall(raycaster:THREE.Raycaster){for(const hit of raycaster.intersectObjects(wallMeshes,false)){const id=(hit.object as THREE.Mesh).userData.wallFaces?.[hit.face?.materialIndex??-1];if(typeof id==='number')return id}return null}
  function canStand(x:number,z:number){return x> -7.65&&x<7.65&&z> -7.65&&z<7.65&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.22&&Math.abs(z-o.z)<o.d/2+.22)}
  function dispose(){disposed=true;scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}});floorMaps.forEach(t=>t?.dispose());floorDetailMaps.forEach(maps=>maps?.forEach(map=>map.dispose()));wallImageMaps.forEach(map=>map?.dispose());textures.forEach(t=>t.dispose());envTarget.dispose()}
  return {scene,applyTile,setWallStyle,pickWall,canStand,floorMeshes,dispose}
}
