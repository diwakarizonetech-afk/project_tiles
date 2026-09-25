import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import type { Tile } from './catalog'
import type { WallStyle } from './house'

const interiors = [
  {url:'/models/mjp-cozy-living.glb',label:'Cozy living room',viewZ:2.25,yaw:0,maxSpan:7,walkX:2.75,walkZ:2.45},
  {url:'/models/mjp-modern-bedroom.glb',label:'Modern bedroom',viewZ:2.05,yaw:0,maxSpan:7,walkX:2.4,walkZ:2.4},
  {url:'/models/mjp-simple-living.glb',label:'Simple living room',viewZ:2.15,yaw:0,maxSpan:7,walkX:2.6,walkZ:2.6},
  {url:'/models/mjp-gallery-hall.glb',label:'Gallery hall',viewZ:5.2,yaw:0,maxSpan:24,walkX:8,walkZ:5.5},
  {url:'/models/mjp-empty-bathroom.glb',label:'Bathroom',viewZ:2.0,yaw:0,maxSpan:7,walkX:2.3,walkZ:2.6},
  {url:'/models/mjp-empty-office.glb',label:'Office space',viewZ:0,yaw:0,maxSpan:7,walkX:2.1,walkZ:3.2},
  {url:'/models/mjp-vr-gallery.glb',label:'VR gallery',viewZ:2.3,yaw:0,maxSpan:7,walkX:2.8,walkZ:2.8},
  {url:'/models/mjp-cooking-club.glb',label:'Cooking club',viewZ:0,yaw:Math.PI/2,maxSpan:12,walkX:5,walkZ:3.7},
] as const
const centres=interiors.map((_,index)=>index*18)
export const importedViewpoints=interiors.map((entry,index)=>({x:0,z:centres[index]+entry.viewZ,yaw:entry.yaw,pitch:-.08}))
export const importedRoomAt=(_x:number,z:number)=>centres.reduce((closest,centre,index)=>Math.abs(z-centre)<Math.abs(z-centres[closest])?index:closest,0)

export function buildImportedHouse(renderer:THREE.WebGLRenderer) {
  let disposed=false
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c8d1cb')
  const textures=new Set<THREE.Texture>(),materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>()
  const pmrem=new THREE.PMREMGenerator(renderer);let environment:THREE.WebGLRenderTarget|null=null
  const loadEnvironment=(attempt=0)=>new HDRLoader().load('/hdr/modern_bathroom_2k.hdr',hdr=>{if(disposed){hdr.dispose();pmrem.dispose();return}environment=pmrem.fromEquirectangular(hdr);hdr.dispose();scene.environment=environment.texture;scene.environmentIntensity=.82;pmrem.dispose()},undefined,error=>{if(disposed){pmrem.dispose();return}if(attempt<2){window.setTimeout(()=>loadEnvironment(attempt+1),1200*(attempt+1));return}console.warn('HDR environment unavailable after retries',error);pmrem.dispose()})
  loadEnvironment()
  scene.add(new THREE.HemisphereLight('#fff7e9','#6e756f',2.25))
  const sun=new THREE.DirectionalLight('#fff0d4',2.7);sun.position.set(-5,8,5);scene.add(sun)
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const textureLoader=new THREE.TextureLoader(),textureCache=new Map<string,Promise<THREE.Texture>>(),cachedTextures=new Set<THREE.Texture>()
  // Tile URLs are also used by regular image previews. Chrome can reuse a
  // non-CORS image-cache entry for Three.js and reject it even after a 200.
  // Fetch a fresh CORS response and decode a local blob URL for WebGL.
  const fetchTexture=async(url:string)=>{
    const response=await fetch(url,{mode:'cors',cache:'no-store'})
    if(!response.ok)throw new Error(`Texture request failed (${response.status})`)
    const objectUrl=URL.createObjectURL(await response.blob())
    try{return await textureLoader.loadAsync(objectUrl)}finally{URL.revokeObjectURL(objectUrl)}
  }
  const loadTexture=(url:string,repeat:number,color=false)=>{
    const key=`${url}|${repeat}|${color}`;let pending=textureCache.get(key)
    if(!pending){pending=fetchTexture(url).then(texture=>{texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)texture.colorSpace=THREE.SRGBColorSpace;cachedTextures.add(texture);return texture}).catch(error=>{textureCache.delete(key);throw error});textureCache.set(key,pending)}
    return pending.then(texture=>{const instance=texture.clone();instance.needsUpdate=true;return instance})
  }
  const floorMeshes:THREE.Mesh[]=[]
  const floorMaterials:THREE.MeshStandardMaterial[]=[]
  const floorMaps:THREE.Texture[][]=interiors.map(()=>[])
  const floorTargets:THREE.Mesh[][]=interiors.map(()=>[])
  const floorLoads=interiors.map(()=>0)
  const wallMeshes:THREE.Mesh[]=[]
  const wallMaterials:THREE.MeshStandardMaterial[]=[]
  const wallMaps:(THREE.Texture|undefined)[]=Array(interiors.length*4)
  const wallDetailMaps:THREE.Texture[][]=Array.from({length:interiors.length*4},()=>[])
  const wallLoads=Array(interiors.length*4).fill(0)
  const wallSeen=Array(interiors.length*4).fill(false)
  const modelLoads:Array<()=>Promise<void>>=[]
  const makeWallPattern=(style:WallStyle,repeat:number)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#626a65';ctx.fillStyle='#8e9690';ctx.lineWidth=3
    const grid=(w:number,h=w,stagger=false)=>{for(let y=0;y<=256;y+=h){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=stagger&&Math.floor(y/h)%2?w/2:0;x<=256;x+=w){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.stroke()}}}
    if(style.design==='subway')grid(64,36,true)
    else if(style.design==='grid'||style.design==='zellige')grid(style.design==='grid'?64:38)
    else if(style.design==='kitkat'||style.design==='fluted'||style.design==='stripes'){const gap=style.design==='stripes'?28:style.design==='kitkat'?14:10;for(let x=0;x<256;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke()}if(style.design==='kitkat')grid(256,42)}
    else if(style.design==='checker'){for(let y=0;y<256;y+=42)for(let x=0;x<256;x+=42)if((x/42+y/42)%2<1)ctx.fillRect(x,y,42,42);grid(42)}
    else if(style.design==='herringbone'||style.design==='chevron'){for(let y=-48;y<304;y+=32)for(let x=-48;x<304;x+=64){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+32,y+16);ctx.lineTo(x,y+32);if(style.design==='chevron')ctx.lineTo(x-32,y+16);ctx.stroke()}}
    else if(style.design==='hexagon'||style.design==='fishscale'){for(let y=-20;y<286;y+=36)for(let x=-20;x<286;x+=42){ctx.beginPath();if(style.design==='fishscale')ctx.arc(x+(Math.floor(y/36)%2)*21,y,20,0,Math.PI);else for(let p=0;p<7;p++){const a=p*Math.PI/3,px=x+18*Math.cos(a),py=y+18*Math.sin(a);p?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}}
    else if(style.design==='arches'){for(let y=-48;y<304;y+=64)for(let x=0;x<304;x+=64){ctx.beginPath();ctx.arc(x+32,y+32,27,Math.PI,0);ctx.lineTo(x+59,y+64);ctx.stroke()}}
    else if(style.design==='marble'||style.design==='travertine'){for(let i=0;i<18;i++){ctx.beginPath();ctx.moveTo(-20,i*17);ctx.bezierCurveTo(70,i*11+35,155,i*19-28,276,i*14+18);ctx.stroke()}if(style.design==='travertine')grid(256,48)}
    else if(style.design==='linen'){ctx.lineWidth=1;for(let i=0;i<256;i+=7){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke()}}
    else {let seed=style.design.length*991;for(let i=0;i<850;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed/4294967296*256;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed/4294967296*256;ctx.globalAlpha=.12+(i%5)*.035;ctx.fillRect(x,y,2+i%6,2+i%4)}ctx.globalAlpha=1}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,2.4);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture
  }
  interiors.forEach((entry,index)=>{
    const group=new THREE.Group();group.position.z=centres[index];group.userData.room=index;group.name=entry.label;scene.add(group)
    const floorMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.64,metalness:.015,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(entry.walkX*2,entry.walkZ*2),floorMaterial)
    floor.rotation.x=-Math.PI/2;floor.position.y=.125;floor.visible=false;floor.receiveShadow=true;floor.renderOrder=2;floor.userData.floor=true;floor.userData.room=index;group.add(floor);floorMeshes.push(floor);floorMaterials.push(floorMaterial)
    const wallGroup=new THREE.Group();group.add(wallGroup)
    const addWall=(side:number,width:number,x:number,z:number,rotationY:number)=>{
      const id=index*4+side
      const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.72,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
      // Gallery Hall is an arched, irregular model. A rectangular four-wall cage cuts
      // through the hall, so it gets one deliberate rear feature panel instead.
      const galleryFeature=index===3,enabled=!galleryFeature||side===2,displayWidth=galleryFeature?5.8:width,displayHeight=galleryFeature?2.65:3.1
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(displayWidth,displayHeight),material)
      wall.position.set(x,galleryFeature?1.43:1.655,z);wall.rotation.y=rotationY;wall.visible=enabled;wall.userData.wallId=id;wall.userData.repeat=Math.max(2,displayWidth*.72);wallGroup.add(wall);wallMeshes.push(wall);wallMaterials[id]=material
    }
    addWall(0,entry.walkZ*2,-entry.walkX+.045,0,Math.PI/2)
    addWall(1,entry.walkZ*2,entry.walkX-.045,0,-Math.PI/2)
    addWall(2,entry.walkX*2,0,-entry.walkZ+.045,0)
    addWall(3,entry.walkX*2,0,entry.walkZ-.045,Math.PI)
    const loadModel=()=>new Promise<void>(resolve=>{const attemptLoad=(attempt:number)=>loader.load(entry.url,gltf=>{
      if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});resolve();return}
      const model=gltf.scene,bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
      const scale=Math.min(1,entry.maxSpan/Math.max(size.x,size.z),3.45/size.y)
      model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale)
      group.add(model);group.updateMatrixWorld(true)
      model.updateMatrixWorld(true)
      let authoredFloorY=.105
      const detectedFloors=new Set<THREE.Mesh>()
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh)||!/(floor|planks|ground)/i.test(object.name)||/(lamp|floor_lamp)/i.test(object.name))return
        const floorBounds=new THREE.Box3().setFromObject(object),floorSize=floorBounds.getSize(new THREE.Vector3())
        if(floorSize.x>.8&&floorSize.z>.8){detectedFloors.add(object);authoredFloorY=Math.max(authoredFloorY,Math.min(1.5,floorBounds.max.y+.045))}
      })
      // Generic imported meshes often do not contain "floor" in their name.
      // Sample upward-facing geometry to find the actual walkable surface.
      const raycaster=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),normalMatrix=new THREE.Matrix3()
      const levels=new Map<number,{count:number,total:number,objects:Set<THREE.Mesh>}>()
      for(let gx=-4;gx<=4;gx++)for(let gz=-4;gz<=4;gz++){
        raycaster.set(new THREE.Vector3(entry.walkX*gx/5,5,centres[index]+entry.walkZ*gz/5),down)
        const candidates=raycaster.intersectObject(model,true).filter(hit=>{
          if(hit.point.y<-.02||hit.point.y>1.5||!hit.face)return false
          normalMatrix.getNormalMatrix(hit.object.matrixWorld)
          return hit.face.normal.clone().applyMatrix3(normalMatrix).normalize().y>.72
        })
        if(!candidates.length)continue
        const floorHit=candidates.reduce((lowest,hit)=>hit.point.y<lowest.point.y?hit:lowest),y=floorHit.point.y,key=Math.round(y/.025)
        const level=levels.get(key)??{count:0,total:0,objects:new Set<THREE.Mesh>()};level.count++;level.total+=y;level.objects.add(floorHit.object as THREE.Mesh);levels.set(key,level)
      }
      const sampled=[...levels.values()].sort((a,b)=>b.count-a.count)[0]
      if(sampled&&sampled.count>=4)authoredFloorY=Math.max(.045,Math.min(1.5,sampled.total/sampled.count+.045))
      sampled?.objects.forEach(object=>detectedFloors.add(object))
      floor.position.y=authoredFloorY;wallGroup.position.y=authoredFloorY-.105
      model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.castShadow=false;object.receiveShadow=true;geometries.add(object.geometry);const list=Array.isArray(object.material)?object.material:[object.material];list.forEach(material=>{materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value)})})
      const targets=[...detectedFloors].filter(object=>{const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());return size.x>.8&&size.z>.8&&size.y<.45})
      floorTargets[index]=targets
      if(targets.length){targets.forEach(object=>{
        // Imported floors often have missing/degenerate UVs. Project stable UVs
        // from world X/Z so every backend texture is visible at a true scale.
        const source=object.geometry,geometry=source.clone(),position=geometry.getAttribute('position'),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),point=new THREE.Vector3(),uv=new Float32Array(position.count*2)
        for(let vertex=0;vertex<position.count;vertex++){point.fromBufferAttribute(position,vertex).applyMatrix4(object.matrixWorld);uv[vertex*2]=(point.x-bounds.min.x)/Math.max(size.x,.001);uv[vertex*2+1]=(point.z-bounds.min.z)/Math.max(size.z,.001)}
        geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));object.geometry=geometry;geometries.add(geometry);object.material=floorMaterial;object.receiveShadow=true
      });floor.visible=false}
      const fill=new THREE.PointLight(index===0?'#ffe0ad':'#fff0d7',index===0?5:3.7,8,2);fill.position.set(0,2.45,.4);group.add(fill)
      resolve()
    },undefined,error=>{if(disposed){resolve();return}if(attempt<2){window.setTimeout(()=>attemptLoad(attempt+1),1200*(attempt+1));return}console.error(`Could not load ${entry.label} after retries`,error);resolve()});attemptLoad(0)})
    modelLoads.push(loadModel)
  })
  // Load one room at a time. This avoids several large GLB/HDR responses
  // competing on the same HTTP/2 connection on hosted storefronts.
  void (async()=>{for(const load of modelLoads){if(disposed)break;await load()}})()
  function applyTile(room:number,tile:Tile){
    const material=floorMaterials[room],entry=interiors[room]
    if(!material||!entry)return
    const request=++floorLoads[room]
    const scan={diffuse:tile.image,normal:tile.normal,roughness:tile.roughness,repeat:tile.repeat}
    void Promise.all([loadTexture(scan.diffuse,scan.repeat,true),scan.normal?loadTexture(scan.normal,scan.repeat):Promise.resolve(null),scan.roughness?loadTexture(scan.roughness,scan.repeat):Promise.resolve(null)]).then(([texture,normal,roughness])=>{
      if(disposed||request!==floorLoads[room])return
      floorMaps[room]=[texture,...(normal?[normal]:[]),...(roughness?[roughness]:[])]
      floorMeshes[room].visible=floorTargets[room].length===0
      material.color.set('#ffffff');material.map=texture;material.normalMap=normal;material.roughnessMap=roughness
      material.roughness=tile.finish==='Polished'?.24:tile.family==='Wood'?.72:.58;material.metalness=tile.finish==='Polished'?.06:.015;material.needsUpdate=true
      if(normal)material.normalScale.set(.42,.42)
    }).catch(error=>console.error(`Could not load tile ${tile.id}`,error))
  }
  function setWallStyle(wall:number,style:WallStyle){
    const material=wallMaterials[wall],mesh=wallMeshes.find(item=>item.userData.wallId===wall)
    if(!material||!mesh||!mesh.visible||!/^#[\da-fA-F]{6}$/.test(style.color))return
    const first=!wallSeen[wall];wallSeen[wall]=true
    const request=++wallLoads[wall]
    wallMaps[wall]?.dispose();wallMaps[wall]=undefined;wallDetailMaps[wall].forEach(map=>map.dispose());wallDetailMaps[wall]=[]
    material.map=null;material.bumpMap=null;material.normalMap=null;material.roughnessMap=null;material.color.set(style.color);material.roughness=.82;material.needsUpdate=true
    // Keep the imported Gallery architecture clean until a real tile/design is chosen.
    if(Math.floor(wall/4)===3&&style.design==='paint'&&!style.image){material.opacity=0;material.depthWrite=false;return}
    if(!first||style.image||style.design!=='paint'){material.opacity=style.image||style.design!=='paint'?1:.9;material.depthWrite=true}
    if(!style.image&&style.design!=='paint'){
      const texture=makeWallPattern(style,mesh.userData.repeat);wallMaps[wall]=texture
      material.map=texture;material.bumpMap=texture;material.bumpScale=.004;material.roughness=.7;material.needsUpdate=true;return
    }
    if(!style.image)return
    const repeat=style.repeat??mesh.userData.repeat
    void Promise.all([fetchTexture(style.image),style.normal?fetchTexture(style.normal):Promise.resolve(null),style.roughness?fetchTexture(style.roughness):Promise.resolve(null)]).then(([texture,normal,roughness])=>{
      if(disposed||request!==wallLoads[wall]){texture.dispose();normal?.dispose();roughness?.dispose();return}
      wallMaps[wall]=texture;wallDetailMaps[wall]=[...(normal?[normal]:[]),...(roughness?[roughness]:[])]
      for(const map of [texture,normal,roughness])if(map){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeat,repeat);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())}
      texture.colorSpace=THREE.SRGBColorSpace
      material.color.set('#ffffff');material.map=texture;material.bumpMap=normal?null:texture;material.bumpScale=.006;material.normalMap=normal;material.roughnessMap=roughness;material.roughness=.66;material.opacity=1;material.depthWrite=true;material.needsUpdate=true
      if(normal)material.normalScale.set(.5,.5)
    }).catch(error=>console.error(`Could not load wall tile for wall ${wall}`,error))
  }
  function pickWall(raycaster:THREE.Raycaster){const hit=raycaster.intersectObjects(wallMeshes,false)[0];return typeof hit?.object.userData.wallId==='number'?hit.object.userData.wallId:null}
  function canStand(x:number,z:number){const room=importedRoomAt(x,z),entry=interiors[room];return Math.abs(x)<entry.walkX&&Math.abs(z-centres[room])<entry.walkZ}
  function dispose(){disposed=true;geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());cachedTextures.forEach(texture=>texture.dispose());wallMaps.forEach(texture=>texture?.dispose());wallDetailMaps.forEach(maps=>maps.forEach(texture=>texture.dispose()));floorMeshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose()});wallMeshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose()});environment?.dispose()}
  return {scene,applyTile,setWallStyle,pickWall,canStand,floorMeshes,dispose}
}
