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
export type WallStyle={color:string;design:WallDesign;image?:string;normal?:string;roughness?:string;repeat?:number}
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
  const defaultWallColours=['#aa5946','#33757a','#75566e','#347284']
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
  // Reference-inspired bedroom. One bed only; no overlapping imported bed.
  const bedding=tactile('#ded5c7','cloth'),walnut=tactile('#685040','wood'),charcoal=tactile('#393934','cloth')
  const headwall=box(5.4,3.35,.12,-4,1.675,-7.68,wallMaterials[10])
  headwall.userData.wallFaces={0:10,1:10,2:10,3:10,4:10,5:10};wallMeshes.push(headwall)
  box(2.86,1.35,.22,-4,.9,-7.43,charcoal,false,.09)
  box(2.75,.36,3.1,-4,.28,-5.85,walnut,true,.08)
  box(2.7,.3,3.02,-4,.60,-5.85,bedding,false,.13)
  // Subdivided cloth with a rounded drape and shallow deterministic folds.
  const quiltGeometry=new THREE.PlaneGeometry(3.22,2.58,52,44)
  const quiltPositions=quiltGeometry.attributes.position
  for(let i=0;i<quiltPositions.count;i++){
    const x=quiltPositions.getX(i),v=quiltPositions.getY(i)
    const edge=Math.max(0,Math.abs(x)-1.22)
    const foot=Math.max(0,-v-.86)
    const folds=.018*Math.sin(x*21+v*6)+.014*Math.sin(v*26+x*4)
    quiltPositions.setXYZ(i,x,.83-edge*1.18-foot*.75+folds,-5.25-v)
  }
  quiltGeometry.computeVertexNormals()
  const quilt=new THREE.Mesh(quiltGeometry,bedding);quilt.position.x=-4;quilt.castShadow=true;quilt.receiveShadow=true;scene.add(quilt)
  for(const x of [-4.7,-3.3]){
    const pillow=box(1.12,.22,.68,x,.89,-6.87,bedding,false,.11);pillow.rotation.x=.22
    const cushion=box(.64,.52,.19,x,1.05,-6.61,charcoal,false,.08);cushion.rotation.x=-.14
  }
  const accent=box(.56,.39,.19,-3.9,.99,-6.36,tactile('#b59a65','cloth'),false,.08);accent.rotation.z=.08
  for(const x of [-5.95,-2.05]){
    box(.76,.52,.7,x,.37,-6.86,walnut,true,.035)
    box(.66,.018,.018,x,.46,-6.493,brass)
    cylinder(.12,.14,.028,x,.656,-6.86,brass);cylinder(.019,.019,.36,x,.85,-6.86,brass)
    cylinder(.20,.24,.28,x,1.13,-6.86,tactile('#e6d8bb','cloth'))
    cylinder(.12,.12,.015,x,.989,-6.86,glow)
  }
  box(3.85,.018,3.7,-4,.019,-4.95,tactile('#aaa08f','cloth'),false,.008)
  // Warm headboard washers: no extra shadow maps.
  for(const x of [-5.7,-4,-2.3]){
    cylinder(.08,.08,.025,x,3.43,-7.08,brass)
    cylinder(.058,.058,.027,x,3.411,-7.08,glow)
    const light=new THREE.SpotLight('#ffe1ab',5,4,.48,.75,1.6);light.position.set(x,3.35,-7.08);light.target.position.set(x,1.6,-7.62);scene.add(light,light.target)
  }
  artwork(-7.84,2,-4.5,1.3,1.7,'/art/botanical.png')
  // Bathroom: dry vanity on the right, open shower on the left; window stays clear.
  const bathWood=tactile('#aa8968','wood'),stone=mat('#cbbda7',.8),porcelain=mat('#f0eee7',.2)
  box(2.12,.53,.65,6.18,.77,-7.44,bathWood,true,.025)
  for(let x=5.17;x<7.23;x+=.045)box(.022,.46,.025,x,.79,-7.102,bathWood,false,.007)
  box(2.2,.065,.76,6.18,1.068,-7.42,countertop,false,.022)
  box(1.96,.018,.035,6.18,.491,-7.12,glow)
  // Lathed hollow ceramic basin, with a real rim instead of a solid cylinder.
  const basinPoints=[new THREE.Vector2(.035,0),new THREE.Vector2(.22,0),new THREE.Vector2(.34,.13),new THREE.Vector2(.35,.17),new THREE.Vector2(.327,.175),new THREE.Vector2(.305,.14),new THREE.Vector2(.19,.03),new THREE.Vector2(.035,.028)]
  const basin=new THREE.Mesh(new THREE.LatheGeometry(basinPoints,48),porcelain);basin.position.set(6.18,1.105,-7.32);scene.add(basin)
  cylinder(.028,.028,.006,6.18,1.138,-7.32,brass)
  cylinder(.022,.022,.34,6.18,1.28,-7.69,brass);box(.035,.035,.23,6.18,1.445,-7.585,brass,false,.01)
  function wallDisc(radius:number,depth:number,x:number,y:number,z:number,material:THREE.Material){
    const disc=cylinder(radius,radius,depth,x,y,z,material);disc.rotation.x=Math.PI/2;return disc
  }
  wallDisc(.735,.035,6.18,2.14,-7.82,glow)
  wallDisc(.705,.045,6.18,2.14,-7.787,brass)
  // Environment-lit metal surface; avoids a costly second scene render in VR.
  wallDisc(.684,.047,6.18,2.14,-7.755,mat('#b8bbb4',.075,1))
  cylinder(.065,.07,.17,7.04,1.19,-7.4,mat('#655b42',.28));cylinder(.028,.028,.04,7.04,1.295,-7.4,brass)
  box(2.25,.045,2.5,1.35,.028,-6.56,stone,false,.02)
  box(.018,2.62,2.46,2.49,1.34,-6.56,glass,true)
  for(const z of [-7.79,-5.33])box(.018,2.65,.024,2.49,1.34,z,brass)
  box(.024,.022,2.46,2.49,2.66,-6.56,brass)
  // Shower head, mixer, hose and a narrow stone shelf.
  cylinder(.02,.02,1.23,.35,1.93,-7.74,brass)
  box(.76,.03,.03,.72,2.55,-7.74,brass)
  cylinder(.22,.22,.026,1.08,2.53,-7.74,brass)
  wallDisc(.075,.055,.35,1.25,-7.71,brass)
  const hoseCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.35,1.22,-7.65),new THREE.Vector3(.50,.73,-7.59),new THREE.Vector3(.78,.81,-7.59),new THREE.Vector3(.71,1.51,-7.65)])
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve,28,.009,6,false),brass))
  box(.9,.05,.19,1.35,1.34,-7.77,stone,false,.014)
  for(const x of [1.12,1.37]){cylinder(.044,.045,.16,x,1.445,-7.74,mat('#676553'));cylinder(.021,.021,.026,x,1.54,-7.74,brass)}
  box(1.45,.008,.055,1.28,.055,-7.62,mat('#55524a',.3,.5))
  // Wall-hung WC faces into the room from the east wall.
  box(.32,1.16,1.15,7.73,.58,-3.66,wallMaterials[13],true,.025)
  const wc=ball(.4,7.31,.46,-3.66,porcelain,1.25,.68,.83)
  wc.receiveShadow=true
  const seat=new THREE.Mesh(new THREE.TorusGeometry(.27,.038,10,40),porcelain)
  seat.rotation.x=Math.PI/2;seat.scale.y=1.4;seat.position.set(7.20,.66,-3.66);scene.add(seat)
  box(.51,.045,.62,7.23,.695,-3.66,porcelain,false,.10)
  box(.018,.18,.28,7.551,.98,-3.66,brass,false,.02)
  obstacles.push({x:7.24,z:-3.66,w:1.15,d:.8})
  box(1.65,.018,.9,6.05,.02,-6.05,tactile('#c9c0ad','cloth'),false,.008)
  for(const x of [-4,4]){
    box(7.5,.016,.04,x,3.42,-7.79,glow)
    box(7.6,.06,.20,x,3.46,-7.79,plaster)
  }
  function pickWall(raycaster:THREE.Raycaster){for(const hit of raycaster.intersectObjects(wallMeshes,false)){const id=(hit.object as THREE.Mesh).userData.wallFaces?.[hit.face?.materialIndex??-1];if(typeof id==='number')return id}return null}
  function canStand(x:number,z:number){return x> -7.65&&x<7.65&&z> -7.65&&z<7.65&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.22&&Math.abs(z-o.z)<o.d/2+.22)}
  function dispose(){disposed=true;scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}});floorMaps.forEach(t=>t?.dispose());floorDetailMaps.forEach(maps=>maps?.forEach(map=>map.dispose()));wallImageMaps.forEach(map=>map?.dispose());textures.forEach(t=>t.dispose());envTarget.dispose()}
  return {scene,applyTile,setWallStyle,pickWall,canStand,floorMeshes,dispose}
}
