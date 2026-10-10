import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { isSlab2x4, type Tile } from './catalog'
import type { WallStyle } from './house'

const interiors = [
  {url:'/models/mjp-cozy-living.glb',label:'Cozy living room',viewZ:2.25,yaw:0,maxSpan:7,walkX:2.75,walkZ:2.45},
  {url:'/models/mjp-modern-bedroom.glb',label:'Modern bedroom',viewZ:2.15,yaw:0,maxSpan:7,walkX:2.85,walkZ:2.65},
  {url:'/models/mjp-vr-gallery.glb',label:'VR gallery',viewZ:2.3,yaw:0,maxSpan:7,walkX:2.8,walkZ:2.8},
  {url:'/models/modern_scandinavian_kitchen_island.glb',label:'Cooking Club',environmentType:'cooking-club',viewZ:0,yaw:0,maxSpan:12,walkX:5,walkZ:3.7},
  {url:'/models/modern-bathroom.glb',label:'Modern Bathroom',environmentType:'modern-bathroom',viewZ:0,yaw:Math.PI,maxSpan:10,walkX:1.9,walkZ:3.5},
] as const
const centres=interiors.map((_,index)=>index*18)
const walkBounds:{walkX:number;walkZ:number}[]=interiors.map(entry=>({walkX:entry.walkX,walkZ:entry.walkZ}))
export const importedViewpoints=interiors.map((entry,index)=>({x:0,z:centres[index]+(index===0?1.85:entry.viewZ),yaw:entry.yaw,pitch:index===1?-0.08:index===3?0:-.10}))
export const importedRoomAt=(_x:number,z:number)=>centres.reduce((closest,centre,index)=>Math.abs(z-centre)<Math.abs(z-centres[closest])?index:closest,0)

export function buildImportedHouse(renderer:THREE.WebGLRenderer,onAssetError?:(message:string)=>void) {
  let disposed=false
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c8d1cb')
  const textures=new Set<THREE.Texture>(),materials=new Set<THREE.Material>(),geometries=new Set<THREE.BufferGeometry>()
  const pmrem=new THREE.PMREMGenerator(renderer);let environment:THREE.WebGLRenderTarget|null=null
  const loadEnvironment=(attempt=0)=>new HDRLoader().load('/hdr/modern_bathroom_2k.hdr',hdr=>{if(disposed){hdr.dispose();pmrem.dispose();return}environment=pmrem.fromEquirectangular(hdr);hdr.dispose();scene.environment=environment.texture;scene.environmentIntensity=.52;pmrem.dispose()},undefined,error=>{if(disposed){pmrem.dispose();return}if(attempt<2){window.setTimeout(()=>loadEnvironment(attempt+1),1200*(attempt+1));return}console.warn('HDR environment unavailable after retries',error);pmrem.dispose()})
  loadEnvironment()
  // Global scene fill — kept deliberately low so per-room lights can shape the mood
  scene.add(new THREE.HemisphereLight('#e8dfd4','#3a3830',0.55))
  scene.add(new THREE.AmbientLight('#f5eed8',0.12))
  const sun=new THREE.DirectionalLight('#fff2d8',1.2);sun.position.set(-4,7,5)
  sun.castShadow=true;sun.shadow.mapSize.width=2048;sun.shadow.mapSize.height=2048
  sun.shadow.camera.near=0.5;sun.shadow.camera.far=24
  sun.shadow.camera.left=-4.5;sun.shadow.camera.right=4.5;sun.shadow.camera.top=4.5;sun.shadow.camera.bottom=-4.5
  sun.shadow.bias=-0.00015;sun.shadow.normalBias=0.025
  scene.add(sun)
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'KHR_materials_pbrSpecularGlossiness'}))
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
  const loadTexture=(url:string,repeatX:number,repeatY=repeatX,color=false,orientation:Tile['orientation']='Landscape')=>{
    const key=`${url}|${repeatX}|${repeatY}|${color}|${orientation}`;let pending=textureCache.get(key)
    if(!pending){pending=fetchTexture(url).then(texture=>{if(disposed){texture.dispose();throw new Error('Showroom disposed while loading a texture.')}texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)texture.colorSpace=THREE.SRGBColorSpace;cachedTextures.add(texture);return texture}).catch(error=>{textureCache.delete(key);throw error});textureCache.set(key,pending)}
    return pending.then(texture=>{const instance=texture.clone();instance.center.set(.5,.5);instance.rotation=orientation==='Portrait'?Math.PI/2:0;instance.needsUpdate=true;return instance})
  }
  const restoreSpecularGlossiness=async(gltf:GLTF)=>{
    const fixed=new Set<THREE.Material>(),definitions=gltf.parser.json.materials??[]
    const makeRoughnessMap=(source:THREE.Texture,channel:number,glossiness:number)=>{
      const image=source.image as CanvasImageSource&{width?:number;height?:number},width=image.width??0,height=image.height??0
      if(!width||!height)return undefined
      const scale=Math.min(1,512/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale))
      const context=canvas.getContext('2d');if(!context)return undefined
      context.drawImage(image,0,0,canvas.width,canvas.height)
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data
      for(let offset=0;offset<data.length;offset+=4){const value=255-Math.round(data[offset+3]*glossiness);data[offset]=data[offset+1]=data[offset+2]=value;data[offset+3]=255}
      context.putImageData(pixels,0,0)
      const roughness=new THREE.CanvasTexture(canvas);roughness.channel=channel;roughness.colorSpace=THREE.NoColorSpace;roughness.wrapS=source.wrapS;roughness.wrapT=source.wrapT;roughness.repeat.copy(source.repeat);roughness.offset.copy(source.offset);roughness.center.copy(source.center);roughness.rotation=source.rotation;roughness.flipY=source.flipY;roughness.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return roughness
    }
    const restore=async(material:THREE.Material)=>{
      if(fixed.has(material))return
      const association=gltf.parser.associations.get(material),definition=typeof association?.materials==='number'?definitions[association.materials]:undefined
      // The authored ShowerScreen material has alpha=0. It is replaced with a
      // physical glass material on the same mesh after the GLB is parsed.
      if(definition?.name==='ShowerScreen')return
      const extension=definition?.extensions?.KHR_materials_pbrSpecularGlossiness
      if(!extension||!(material instanceof THREE.MeshStandardMaterial))return
      fixed.add(material)
      const factor=extension.diffuseFactor??[1,1,1,1],glossiness=extension.glossinessFactor??1
      material.color.setRGB(factor[0],factor[1],factor[2],THREE.LinearSRGBColorSpace);material.opacity=factor[3];material.transparent=definition.alphaMode==='BLEND'||factor[3]<1;material.depthWrite=!material.transparent;material.metalness=0;material.roughness=THREE.MathUtils.clamp(1-glossiness,0.04,1)
      if(extension.diffuseTexture){const texture=await gltf.parser.getDependency('texture',extension.diffuseTexture.index) as THREE.Texture;if(disposed){texture.dispose();return}texture.channel=extension.diffuseTexture.texCoord??0;texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;textures.add(texture)}
      if(extension.specularGlossinessTexture){
        const textureInfo=extension.specularGlossinessTexture,source=await gltf.parser.getDependency('texture',textureInfo.index) as THREE.Texture;if(disposed){source.dispose();return}textures.add(source);const roughness=makeRoughnessMap(source,textureInfo.texCoord??0,glossiness)
        if(roughness){if(disposed)roughness.dispose();else{material.roughnessMap=roughness;textures.add(roughness)}}
      }
      material.needsUpdate=true
    }
    const jobs:Promise<void>[]=[]
    gltf.scene.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])jobs.push(restore(material))})
    await Promise.all(jobs)
  }
  const configureBathroomGlass=(model:THREE.Group)=>{
    const screen=model.getObjectByName('Modern_Bathroom_ShowerScreen_0')
    if(!(screen instanceof THREE.Mesh))return
    const previous=Array.isArray(screen.material)?screen.material:[screen.material]
    const glass=new THREE.MeshPhysicalMaterial({
      color:'#e4f1f3',metalness:0,roughness:.11,ior:1.45,
      transmission:.9,thickness:.006,attenuationColor:'#eaf5f6',attenuationDistance:6,
      clearcoat:.18,clearcoatRoughness:.12,specularIntensity:.85,
      envMapIntensity:1.1,side:THREE.DoubleSide,
      transparent:false,opacity:1,depthTest:true,depthWrite:true,
    })
    screen.material=glass
    previous.forEach(material=>{for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);material.dispose()})
    screen.castShadow=false
    screen.receiveShadow=false
    screen.userData.environmentFixture=true
    materials.add(glass)
  }
  const floorPhysicalDimensions=interiors.map(entry=>({width:entry.walkX*2,depth:entry.walkZ*2}))
  const getFloorDimensions=(room:number)=>{
    if(room===0)return {width:6.2,depth:5.2}
    if(room===1)return {width:5.7,depth:5.3}
    if(room===3)return floorPhysicalDimensions[room]
    const entry=interiors[room]
    return {width:(entry?.walkX??2.8)*2,depth:(entry?.walkZ??2.8)*2}
  }
  const getTileRepeats=(room:number,tile:Tile)=>{
    const dims=getFloorDimensions(room)
    if(tile.family==='Wood'){
      return {repeatX:Math.round(dims.width/0.45*10)/10,repeatY:Math.round(dims.depth/1.8*10)/10}
    }
    const is2x4=isSlab2x4(tile.size)
    if(is2x4){
      // 2' x 4' (600 x 1200 mm) Large Format Slab
      return {repeatX:Math.max(1,Math.round(dims.width/0.60*10)/10),repeatY:Math.max(1,Math.round(dims.depth/1.20*10)/10)}
    }
    // 2' x 2' (600 x 600 mm) Square Tile
    return {repeatX:Math.max(1,Math.round(dims.width/0.60*10)/10),repeatY:Math.max(1,Math.round(dims.depth/0.60*10)/10)}
  }
  const groutBumpCache=new Map<string,THREE.Texture>()
  const getGroutBump=(is2x4:boolean,repX:number,repY:number)=>{
    const key=`${is2x4?'2x4':'2x2'}|${repX}|${repY}`
    const existing=groutBumpCache.get(key)
    if(existing)return existing
    const w=512,h=is2x4?1024:512
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h)
    ctx.strokeStyle='#3a3a3a';ctx.lineWidth=8;ctx.strokeRect(0,0,w,h)
    ctx.strokeStyle='#999999';ctx.lineWidth=4;ctx.strokeRect(4,4,w-8,h-8)
    const texture=new THREE.CanvasTexture(canvas)
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repX,repY)
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())
    groutBumpCache.set(key,texture)
    return texture
  }
  const floorMeshes:THREE.Mesh[]=[]
  const floorMaterials:THREE.MeshStandardMaterial[]=[]
  const floorAppliedTiles:(Tile|undefined)[]=interiors.map(()=>undefined)
  let floorReflectionLevel=0.35
  const floorMaps:THREE.Texture[][]=interiors.map(()=>[])
  const floorTargets:THREE.Mesh[][]=interiors.map(()=>[])
  const floorLoads=interiors.map(()=>0)
  const wallMeshes:THREE.Mesh[]=[]
  const bathroomSurfaceMap=new Map<number,THREE.Mesh[]>()
  const wallMaterials:THREE.MeshStandardMaterial[]=[]
  const wallMaps:(THREE.Texture|undefined)[]=Array(interiors.length*4+2)
  const wallDetailMaps:THREE.Texture[][]=Array.from({length:interiors.length*4+2},()=>[])
  const wallLoads=Array(interiors.length*4+2).fill(0)
  const wallSeen=Array(interiors.length*4+2).fill(false)
  const modelLoads:Array<()=>Promise<void>>=[]
  const cookingSurfaces:{floor:THREE.Mesh[];walls:THREE.Mesh[];backsplash:THREE.Mesh[]}={floor:[],walls:[],backsplash:[]}
  const walkObstacles:THREE.Box3[]=[]
  const walkObstacleNames:string[]=[]
  const kitchenWalkTriangles:{a:THREE.Vector2;b:THREE.Vector2;c:THREE.Vector2;bounds:THREE.Box2}[]=[]
  const bathroomObstacles:THREE.Box3[]=[]
  let kitchenFloorY=0
  let kitchenStart:{x:number;z:number;yaw:number}|null=null
  let bathroomFloorY=0
  let bathroomStart:{x:number;z:number;yaw:number}|null=null
  const disposeLoadedGltf=(gltf:GLTF)=>{const pendingTextures=new Set<THREE.Texture>(),pendingMaterials=new Set<THREE.Material>(),pendingGeometry=new Set<THREE.BufferGeometry>();gltf.scene.traverse(object=>{if(!(object instanceof THREE.Mesh))return;pendingGeometry.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){pendingMaterials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)pendingTextures.add(value)}});pendingGeometry.forEach(geometry=>geometry.dispose());pendingMaterials.forEach(material=>material.dispose());pendingTextures.forEach(texture=>texture.dispose())}

  // Procedural normal and bump map generators for realistic tactile materials
  const createProceduralTexture=(draw:(ctx:CanvasRenderingContext2D,w:number,h:number)=>void,w=512,h=w)=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
    const ctx=canvas.getContext('2d')!;draw(ctx,w,h)
    const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping
    tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return tex
  }

  const fabricBump=createProceduralTexture((ctx,w,h)=>{
    ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h)
    const idata=ctx.createImageData(w,h)
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4
        const v=128+Math.sin(x*1.57)*25+Math.sin(y*1.57)*25+((x%3===0?1:-1)+(y%3===0?1:-1))*8
        idata.data[i]=idata.data[i+1]=idata.data[i+2]=Math.min(255,Math.max(0,v))
        idata.data[i+3]=255
      }
    }
    ctx.putImageData(idata,0,0)
  })
  fabricBump.repeat.set(16,16)

  const hammeredBrassBump=createProceduralTexture((ctx,w,h)=>{
    ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h)
    for(let i=0;i<480;i++){
      const x=(i*67)%w,y=(i*131)%h,r=6+(i%6)
      const grad=ctx.createRadialGradient(x,y,0,x,y,r)
      grad.addColorStop(0,'#545454');grad.addColorStop(.65,'#767676');grad.addColorStop(1,'#808080')
      ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()
    }
  })
  hammeredBrassBump.repeat.set(4,4)

  const setupModernLuxuryLivingRoom=(group:THREE.Group,model:THREE.Group,authoredFloorY:number,floor:THREE.Mesh,floorMaterial:THREE.MeshStandardMaterial)=>{
    // Hide original low-fidelity GLB room meshes; construct photorealistic luxury living room
    model.traverse(obj=>{ if(obj instanceof THREE.Mesh)obj.visible=false })
    const F=authoredFloorY

    // Connect room floor directly to the customizable floorMaterial so any catalog tile renders seamlessly
    floor.visible=true;floor.position.y=F;floor.receiveShadow=true;floor.castShadow=false;floor.material=floorMaterial;floor.userData.floorRoom=0;floor.userData.floor=true
    // Expand the floor so it fills the full room footprint
    floor.geometry=new THREE.PlaneGeometry(6.2,5.2)

    // ── PROCEDURAL ACCENT TEXTURES ────────────────────────────────────────────
    const walnutTex=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#5a3014';ctx.fillRect(0,0,w,h)
      for(let i=0;i<220;i++){
        const y0=(i*11)%h,amp=2+(i%7),freq=.05+(i%5)*.012
        ctx.beginPath();ctx.moveTo(0,y0)
        for(let x=0;x<=w;x+=4)ctx.lineTo(x,y0+Math.sin(x*freq+i*.9)*amp+Math.sin(x*.02)*5)
        ctx.strokeStyle=i%3===0?'rgba(175,105,50,0.22)':i%3===1?'rgba(35,16,6,0.20)':'rgba(205,140,65,0.12)'
        ctx.lineWidth=.6+(i%4)*.4;ctx.stroke()
      }
      for(let p=0;p<360;p++){const px=(p*97)%w,py=(p*61)%h;ctx.fillStyle='rgba(25,12,4,0.09)';ctx.beginPath();ctx.ellipse(px,py,2+(p%3),.6,p*.4,0,Math.PI*2);ctx.fill()}
    },1024)
    walnutTex.wrapS=walnutTex.wrapT=THREE.RepeatWrapping;walnutTex.colorSpace=THREE.SRGBColorSpace

    const stuccoTex=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#d5c9b5';ctx.fillRect(0,0,w,h)
      for(let i=0;i<240;i++){const x=(i*47)%w,y=(i*83)%h,rx=14+(i%24),ry=8+(i%16);const g=ctx.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,i%4===0?'rgba(50,38,24,.05)':'rgba(255,248,236,.07)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,ry,i*.48,0,Math.PI*2);ctx.fill()}
    },512)
    stuccoTex.wrapS=stuccoTex.wrapT=THREE.RepeatWrapping

    const linenBump=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#888';ctx.fillRect(0,0,w,h)
      const d=ctx.createImageData(w,h)
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){const i=(y*w+x)*4;const v=128+Math.sin(x*4.71)*16+Math.sin(y*4.71)*16+((x+y)%2===0?8:-8);d.data[i]=d.data[i+1]=d.data[i+2]=Math.min(255,Math.max(0,v));d.data[i+3]=255}
      ctx.putImageData(d,0,0)
    },512)
    linenBump.wrapS=linenBump.wrapT=THREE.RepeatWrapping;linenBump.repeat.set(24,24)

    // ── SHARED PBR MATERIALS ──────────────────────────────────────────────────
    const walnutMat=new THREE.MeshStandardMaterial({map:walnutTex,color:'#633516',roughness:.30,metalness:.02,envMapIntensity:1.4})
    const brassMat=new THREE.MeshStandardMaterial({color:'#cbb05a',metalness:.92,roughness:.22,bumpMap:hammeredBrassBump,bumpScale:.002,envMapIntensity:2.4})
    const slatMat=new THREE.MeshStandardMaterial({map:walnutTex,color:'#4f2910',roughness:.32,metalness:.02,envMapIntensity:1.5})
    slatMat.map!.repeat.set(.4,6)
    const ceramicMat=new THREE.MeshStandardMaterial({color:'#f3eee4',roughness:.72,metalness:.02,envMapIntensity:.8})
    const baseboardMat=new THREE.MeshStandardMaterial({color:'#eee9df',roughness:.75,metalness:.01})

    // ── 1. FURNITURE (no area rug — floor tile shows through cleanly) ──────────

    // ── 2. PHOTOREALISTIC DESIGNER FURNITURE (GLTF MODELS) ────────────────────
    // A) Scanned Scandinavian Sofa — placed with bounding-box auto-grounding
    loader.load('/models/sofa-03/sofa_03_1k.gltf',gltf=>{
      if(disposed)return
      const sofa=gltf.scene
      sofa.traverse(o=>{ if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;geometries.add(o.geometry);if(o.material)materials.add(o.material)} })
      // Auto-ground: lift by negative min-Y so base touches floor
      const sofaBounds=new THREE.Box3().setFromObject(sofa)
      sofa.position.set(0.12,F-sofaBounds.min.y,0.52);sofa.rotation.y=Math.PI;group.add(sofa)
    })

    // B) Scanned Modern Walnut Coffee Table
    loader.load('/models/coffee-table/modern_coffee_table_01_1k.gltf',gltf=>{
      if(disposed)return
      const ct=gltf.scene
      ct.traverse(o=>{ if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;geometries.add(o.geometry);if(o.material)materials.add(o.material)} })
      const ctBounds=new THREE.Box3().setFromObject(ct)
      ct.position.set(0.12,F-ctBounds.min.y,-0.50);group.add(ct)
    })

    // C) Scanned Designer Arm Chair
    loader.load('/models/modern-arm-chair/modern_arm_chair_01_1k.gltf',gltf=>{
      if(disposed)return
      const chair=gltf.scene
      chair.traverse(o=>{ if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;geometries.add(o.geometry);if(o.material)materials.add(o.material)} })
      const chairBounds=new THREE.Box3().setFromObject(chair)
      chair.position.set(-1.62,F-chairBounds.min.y,0.18);chair.rotation.y=Math.PI*0.32;group.add(chair)
    })

    // D) Designer Ceiling Pendant Lamp
    loader.load('/models/modern-ceiling-lamp/modern_ceiling_lamp_01_1k.gltf',gltf=>{
      if(disposed)return
      const lamp=gltf.scene
      lamp.traverse(o=>{ if(o instanceof THREE.Mesh){o.castShadow=true;geometries.add(o.geometry)} })
      lamp.position.set(0.10,F+2.72,-0.42);lamp.scale.setScalar(1.22);group.add(lamp)
    })

    // ── 3. COFFEE TABLE TASTEFUL DECOR ────────────────────────────────────────
    // Use a fixed table-top height estimate (typical coffee table ~43 cm)
    const CT_Y=F+.43,CT_X=0.12,CT_Z=-0.50
    // Ceramic bowl with warm brass rim
    const bwl=new THREE.Mesh(new THREE.CylinderGeometry(.12,.08,.055,20),ceramicMat)
    bwl.position.set(CT_X+.26,CT_Y+.028,CT_Z+.08);bwl.castShadow=true;group.add(bwl)
    const bwlRim=new THREE.Mesh(new THREE.TorusGeometry(.118,.006,8,24),brassMat)
    bwlRim.rotation.x=Math.PI/2;bwlRim.position.set(CT_X+.26,CT_Y+.055,CT_Z+.08);group.add(bwlRim)
    // Architectural hardcover monographs
    const b1=new THREE.Mesh(new THREE.BoxGeometry(.25,.028,.18),new THREE.MeshStandardMaterial({color:'#3a3e3b',roughness:.85}))
    b1.position.set(CT_X-.28,CT_Y+.014,CT_Z-.06);b1.rotation.y=.14;b1.castShadow=true;group.add(b1)
    const b2=new THREE.Mesh(new THREE.BoxGeometry(.23,.024,.16),new THREE.MeshStandardMaterial({color:'#e2dcd2',roughness:.82}))
    b2.position.set(CT_X-.27,CT_Y+.038,CT_Z-.05);b2.rotation.y=.08;b2.castShadow=true;group.add(b2)
    // Small vase with delicate foliage
    const vM=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,.18,16),ceramicMat)
    vM.position.set(CT_X-.02,CT_Y+.09,CT_Z+.12);vM.castShadow=true;group.add(vM)
    for(let i=0;i<4;i++){
      const a=i*Math.PI*2/4+.4,st=new THREE.Mesh(new THREE.CylinderGeometry(.002,.003,.16,6),new THREE.MeshStandardMaterial({color:'#37522d',roughness:.7}))
      st.position.set(CT_X-.02+Math.cos(a)*.012,CT_Y+.18+.08,CT_Z+.12+Math.sin(a)*.012);st.rotation.set(Math.cos(a)*.35,0,Math.sin(a)*.35);group.add(st)
    }

    // ── 4. FEATURE WALL (NORTH WALL) ARCHITECTURAL SETUP ──────────────────────
    // Place everything relative to the north wall at z = -(entry.walkZ - 0.045)
    const WALL_N_Z=-2.49  // north wall face Z
    const TV_X=0.38,TV_Z=WALL_N_Z+.016,TV_Y=F+1.44
    // Acoustic Walnut Vertical Slats on left 1/3 of feature wall
    const SLAT_N=16,SLAT_W=.038,SLAT_H=2.78,SLAT_D=.022,PNL_W=1.28,PNL_X=-2.18,PNL_Z=WALL_N_Z+.016
    for(let s=0;s<SLAT_N;s++){
      const slat=new THREE.Mesh(new THREE.BoxGeometry(SLAT_W,SLAT_H,SLAT_D),slatMat)
      slat.position.set(PNL_X+(s/(SLAT_N-1))*PNL_W,F+SLAT_H/2,PNL_Z)
      slat.castShadow=true;slat.receiveShadow=true;group.add(slat)
    }
    const slatBack=new THREE.Mesh(new THREE.BoxGeometry(PNL_W+.06,SLAT_H,.012),new THREE.MeshStandardMaterial({color:'#23160c',roughness:.85}))
    slatBack.position.set(PNL_X+PNL_W/2,F+SLAT_H/2,PNL_Z-.012);group.add(slatBack)

    // Floating Walnut Media Console — hugs the north wall
    const CON_W=1.86,CON_H=.28,CON_D=.36,CON_Y=F+.50,CON_Z=WALL_N_Z+CON_D/2+.01
    const conGrp=new THREE.Group();conGrp.name='Floating Media Console';conGrp.position.set(TV_X,CON_Y,CON_Z)
    const conBody=new THREE.Mesh(new THREE.BoxGeometry(CON_W,CON_H,CON_D),walnutMat)
    conBody.castShadow=true;conBody.receiveShadow=true;conGrp.add(conBody)
    // Thin brass top-lip
    const conLip=new THREE.Mesh(new THREE.BoxGeometry(CON_W+.006,.008,CON_D+.006),brassMat)
    conLip.position.y=CON_H/2+.004;conGrp.add(conLip)
    // Floating legs
    ;[-CON_W/2+.12,CON_W/2-.12].forEach(dx=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,CON_Y-F-CON_H/2-0.004,.06),new THREE.MeshStandardMaterial({color:'#141414',metalness:.7,roughness:.3}))
      leg.position.set(dx,-(CON_Y-F-CON_H/2)/2+.002,0);conGrp.add(leg)
    })
    // Drawer fronts
    ;[-0.56,0,0.56].forEach(dx=>{
      const drw=new THREE.Mesh(new THREE.BoxGeometry(.54,CON_H*.72,.01),walnutMat)
      drw.position.set(dx,0,CON_D/2+.002);conGrp.add(drw)
      const hdl=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.10,10),brassMat)
      hdl.rotation.z=Math.PI/2;hdl.position.set(dx,.012,CON_D/2+.014);conGrp.add(hdl)
    })
    group.add(conGrp)
    // Soft under-console warm cove light
    const conLED=new THREE.PointLight('#ffc87a',0.72,1.8,2)
    conLED.position.set(TV_X,F+.06,CON_Z);group.add(conLED)

    // Samsung Frame TV — flush to feature wall
    const artCanvas=document.createElement('canvas');artCanvas.width=1024;artCanvas.height=576
    const actx=artCanvas.getContext('2d')!
    actx.fillStyle='#f9f6ef';actx.fillRect(0,0,1024,576)
    actx.strokeStyle='#ddd5c7';actx.lineWidth=2;actx.strokeRect(40,40,944,496)
    const ax=72,ay=64,aw=880,ah=448
    const artGrad=actx.createLinearGradient(ax,ay,ax,ay+ah)
    artGrad.addColorStop(0,'#32526e');artGrad.addColorStop(.4,'#675577');artGrad.addColorStop(.75,'#b8657d');artGrad.addColorStop(1,'#f3ad92')
    actx.fillStyle=artGrad;actx.fillRect(ax,ay,aw,ah)
    const sunGrad=actx.createRadialGradient(ax+aw*.65,ay+ah*.45,10,ax+aw*.65,ay+ah*.45,170)
    sunGrad.addColorStop(0,'rgba(255,245,225,0.95)');sunGrad.addColorStop(.6,'rgba(255,200,140,0.45)');sunGrad.addColorStop(1,'transparent')
    actx.fillStyle=sunGrad;actx.beginPath();actx.arc(ax+aw*.65,ay+ah*.45,170,0,Math.PI*2);actx.fill()
    actx.fillStyle='#273849';actx.beginPath();actx.moveTo(ax,ay+ah);actx.bezierCurveTo(ax+240,ay+ah-135,ax+500,ay+ah-60,ax+aw,ay+ah-175);actx.lineTo(ax+aw,ay+ah);actx.closePath();actx.fill()
    actx.fillStyle='#18232e';actx.beginPath();actx.moveTo(ax,ay+ah);actx.bezierCurveTo(ax+320,ay+ah-65,ax+640,ay+ah-125,ax+aw,ay+ah-85);actx.lineTo(ax+aw,ay+ah);actx.closePath();actx.fill()
    actx.fillStyle='#7e796e';actx.font='13px "DM Sans",sans-serif';actx.textAlign='center'
    actx.fillText('ARCHITECTURAL HORIZONS · MJP PRIVATE COLLECTION',512,544)
    const artTex=new THREE.CanvasTexture(artCanvas);artTex.colorSpace=THREE.SRGBColorSpace
    const TV_W=1.72,TV_H=.98,TV_D=.024
    const tvGrp=new THREE.Group();tvGrp.name='Frame TV';tvGrp.position.set(TV_X,TV_Y,TV_Z)
    tvGrp.add(new THREE.Mesh(new THREE.BoxGeometry(TV_W,TV_H,TV_D),new THREE.MeshStandardMaterial({color:'#141414',roughness:.45,metalness:.6})))
    const artMesh=new THREE.Mesh(new THREE.PlaneGeometry(TV_W-.024,TV_H-.024),new THREE.MeshStandardMaterial({map:artTex,roughness:.65,metalness:.02}))
    artMesh.position.z=TV_D/2+.001;tvGrp.add(artMesh)
    group.add(tvGrp)
    // Ambient TV backlight glow (Ambilight effect)
    const tvBacklight=new THREE.PointLight('#ffe4b8',0.55,1.8,2)
    tvBacklight.position.set(TV_X,TV_Y,TV_Z+.12);group.add(tvBacklight)

    // ── 5. (Plant removed per user request) ────────────────────────────────────

    // ── 6. ARCHITECTURAL SKIRTING (BASEBOARDS) ────────────────────────────────
    // Baseboards sit exactly at floor level, covering the wall/floor seam
    const BB_H=.09,BB_T=.018,BB_Y=F+BB_H/2
    const ROOM_W=5.50,ROOM_D=5.18  // matches 2*walkX, 2*walkZ
    const bbN=new THREE.Mesh(new THREE.BoxGeometry(ROOM_W,BB_H,BB_T),baseboardMat)
    bbN.position.set(0,BB_Y,-(ROOM_D/2));bbN.receiveShadow=true;group.add(bbN)
    const bbE=new THREE.Mesh(new THREE.BoxGeometry(BB_T,BB_H,ROOM_D),baseboardMat)
    bbE.position.set(ROOM_W/2,BB_Y,0);bbE.receiveShadow=true;group.add(bbE)
    const bbW=new THREE.Mesh(new THREE.BoxGeometry(BB_T,BB_H,ROOM_D),baseboardMat)
    bbW.position.set(-ROOM_W/2,BB_Y,0);bbW.receiveShadow=true;group.add(bbW)
    const bbS=new THREE.Mesh(new THREE.BoxGeometry(ROOM_W,BB_H,BB_T),baseboardMat)
    bbS.position.set(0,BB_Y,ROOM_D/2);bbS.receiveShadow=true;group.add(bbS)

    // ── 7. WEST WINDOW WITH SHEER LINEN CURTAINS ──────────────────────────────
    const WIN_X=-2.76,WIN_H=2.60,WIN_W_GLASS=2.0
    const winGrp=new THREE.Group();winGrp.position.set(WIN_X,F+WIN_H/2+.22,0)
    const frameMat=new THREE.MeshStandardMaterial({color:'#1e2421',roughness:.32,metalness:.82})
    // Helper: create a frame member and add it to winGrp
    const addFrame=(w:number,h:number,x:number,y:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.055),frameMat);m.position.set(x,y,0);winGrp.add(m)}
    addFrame(.05,WIN_H+.08,-WIN_W_GLASS/2,0)  // left jamb
    addFrame(.05,WIN_H+.08, WIN_W_GLASS/2,0)  // right jamb
    addFrame(WIN_W_GLASS+.05,.05,0, WIN_H/2)  // head
    addFrame(WIN_W_GLASS+.05,.05,0,-WIN_H/2)  // sill
    addFrame(.04,WIN_H,0,0)                    // centre mullion
    // Frosted glass pane (lets light through, prevents seeing outside)
    const glassMat=new THREE.MeshStandardMaterial({color:'#d6ecf0',roughness:.06,metalness:.0,transparent:true,opacity:.28,side:THREE.DoubleSide})
    const glass=new THREE.Mesh(new THREE.PlaneGeometry(WIN_W_GLASS-.08,WIN_H-.06),glassMat)
    glass.position.z=.012;winGrp.add(glass)
    // Sheer drop curtains
    const curtainMat=new THREE.MeshStandardMaterial({color:'#faf6ee',roughness:.92,transparent:true,opacity:.82,bumpMap:linenBump,bumpScale:.005,side:THREE.DoubleSide})
    const curtainL=new THREE.Mesh(new THREE.PlaneGeometry(.68,WIN_H+.32),curtainMat)
    curtainL.rotation.y=Math.PI/2;curtainL.position.set(.03,-.04,-WIN_W_GLASS/2-.30);winGrp.add(curtainL)
    const curtainR=new THREE.Mesh(new THREE.PlaneGeometry(.68,WIN_H+.32),curtainMat)
    curtainR.rotation.y=Math.PI/2;curtainR.position.set(.03,-.04, WIN_W_GLASS/2+.30);winGrp.add(curtainR)
    // Curtain rod
    const rodMat=new THREE.MeshStandardMaterial({color:'#b8960c',metalness:.88,roughness:.18})
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,WIN_W_GLASS+1.0,12),rodMat)
    rod.rotation.z=Math.PI/2;rod.position.set(0,WIN_H/2+.14,0);winGrp.add(rod)
    group.add(winGrp)

    // Volumetric light shaft coming through the west window
    const shaftGeo=new THREE.ConeGeometry(.45,2.2,8,1,true)
    const shaftMat=new THREE.MeshBasicMaterial({color:'#fff8e7',transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false})
    const shaft=new THREE.Mesh(shaftGeo,shaftMat)
    shaft.rotation.z=-Math.PI/2;shaft.position.set(WIN_X+1.25,F+1.35,0.18);group.add(shaft)
    // Sun dust particles (tiny spheres flickering softly)
    for(let p=0;p<18;p++){
      const d=new THREE.Mesh(new THREE.SphereGeometry(.008+(p%4)*.003,4,4),new THREE.MeshBasicMaterial({color:'#fff8d0',transparent:true,opacity:.35+(p%5)*.06,depthWrite:false}))
      d.position.set(WIN_X+.55+(p%5)*.2+(Math.sin(p)*0.15),F+.38+(p%4)*.38+(Math.cos(p)*0.22),((p%7)-3)*.28);group.add(d)
    }

    // ── 8. BALANCED CINEMATIC ARCHITECTURAL LIGHTING ─────────────────────────
    // Strong warm directional sun — enters from west window at a low angle
    const sunKey=new THREE.DirectionalLight('#fff5d8',2.1)
    sunKey.position.set(-7,4.2,0.8);sunKey.castShadow=true
    sunKey.shadow.mapSize.set(2048,2048);sunKey.shadow.bias=-.0002;sunKey.shadow.normalBias=0.02
    sunKey.shadow.camera.left=-4;sunKey.shadow.camera.right=4
    sunKey.shadow.camera.top=4;sunKey.shadow.camera.bottom=-4
    group.add(sunKey)
    // Warm focused downlight from pendant lamp over seating area
    const lampLight=new THREE.SpotLight('#ffeacc',1.4,5.5,Math.PI/3.8,.65,1.5)
    lampLight.position.set(0.10,F+2.72,-0.42);lampLight.target.position.set(0.10,F,-0.42)
    lampLight.castShadow=true;lampLight.shadow.mapSize.set(512,512);lampLight.shadow.bias=-.0004
    group.add(lampLight);group.add(lampLight.target)
    // Cool sky fill from the right (east) for colour contrast / realism
    const skyFill=new THREE.DirectionalLight('#c8d8f0',0.55)
    skyFill.position.set(5,3.5,-1);group.add(skyFill)
    // Warm residential point fill — bounced ceiling light
    const ambientWarm=new THREE.PointLight('#fff4e2',0.95,8.5,2)
    ambientWarm.position.set(0,F+2.65,0.4);group.add(ambientWarm)
    const rimLight=new THREE.PointLight('#ffe8c8',0.48,3.5,2)
    rimLight.position.set(0,F+1.8,-2.2);group.add(rimLight)
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // REALISTIC LUXURY MASTER BEDROOM SUITE (ROOM 1)
  // Tailored specifically for tile fixing, checking, and visual inspection:
  // - Expansive, unobstructed floor tile layout clearly visible from entry
  // - Clean perimeter baseboards framing the floor-to-wall transitions
  // - Floating architectural bed with under-bed LED floor wash highlighting tile finish
  // - High-end channel-tufted bouclé headboard & realistically draped linen bedding
  // - North feature wall tile prominently displayed & washed with warm cove lighting
  // - Italian smoked-glass wardrobe and minimalist floating vanity on East wall
  // - Scanned designer lounge chair tucked gracefully by the sunlit panoramic window
  // ═════════════════════════════════════════════════════════════════════════════
  const setupRealisticModernBedroom=(
    group:THREE.Group,
    model:THREE.Group,
    authoredFloorY:number,
    floor:THREE.Mesh,
    floorMaterial:THREE.MeshStandardMaterial,
    wallMaterials:THREE.MeshStandardMaterial[],
    wallMeshes:THREE.Mesh[]
  )=>{
    // 1. Hide original low-fidelity GLB room meshes
    model.traverse(obj=>{ if(obj instanceof THREE.Mesh) obj.visible=false })
    const F=authoredFloorY

    // 2. Connect customizable floor tile directly to the room floor
    // Floor is open, expansive, and perfectly planar for tile inspection
    floor.visible=true
    floor.position.set(0,F,0)
    floor.receiveShadow=true
    floor.castShadow=false
    floor.material=floorMaterial
    floor.userData.floorRoom=1
    floor.userData.floor=true
    floor.geometry=new THREE.PlaneGeometry(5.70,5.30)

    // ── PROCEDURAL ACCENT TEXTURES ──────────────────────────────────────────
    // A) Natural White Oak Wood Texture with grain & subtle knots
    const oakWoodTex=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#be9b7b';ctx.fillRect(0,0,w,h)
      for(let i=0;i<260;i++){
        const y0=(i*13)%h,amp=1.5+(i%6),freq=.04+(i%4)*.01
        ctx.beginPath();ctx.moveTo(0,y0)
        for(let x=0;x<=w;x+=4)ctx.lineTo(x,y0+Math.sin(x*freq+i*.7)*amp+Math.sin(x*.015)*4)
        ctx.strokeStyle=i%3===0?'rgba(120,80,50,0.18)':i%3===1?'rgba(70,45,25,0.14)':'rgba(215,185,150,0.12)'
        ctx.lineWidth=.5+(i%4)*.35;ctx.stroke()
      }
      for(let p=0;p<300;p++){const px=(p*83)%w,py=(p*53)%h;ctx.fillStyle='rgba(60,35,18,0.07)';ctx.beginPath();ctx.ellipse(px,py,1.5+(p%2),.5,p*.3,0,Math.PI*2);ctx.fill()}
    },512)
    oakWoodTex.wrapS=oakWoodTex.wrapT=THREE.RepeatWrapping;oakWoodTex.colorSpace=THREE.SRGBColorSpace

    // B) Tactile Bouclé Fabric Bump with realistic looping yarns
    const boucleBump=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h)
      const d=ctx.createImageData(w,h)
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const i=(y*w+x)*4
        const v=128+Math.sin(x*2.8)*18+Math.sin(y*2.8)*18+Math.sin((x+y)*5.5)*12+((x*3+y*7)%5===0?10:-10)
        d.data[i]=d.data[i+1]=d.data[i+2]=Math.min(255,Math.max(0,v))
        d.data[i+3]=255
      }
      ctx.putImageData(d,0,0)
    },256)
    boucleBump.wrapS=boucleBump.wrapT=THREE.RepeatWrapping;boucleBump.repeat.set(12,12)

    // C) Soft Linen Bedding Bump
    const bedLinenBump=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h)
      const d=ctx.createImageData(w,h)
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const i=(y*w+x)*4
        const v=128+Math.sin(x*5.2)*12+Math.sin(y*5.2)*12+((x+y)%2===0?6:-6)
        d.data[i]=d.data[i+1]=d.data[i+2]=Math.min(255,Math.max(0,v))
        d.data[i+3]=255
      }
      ctx.putImageData(d,0,0)
    },256)
    bedLinenBump.wrapS=bedLinenBump.wrapT=THREE.RepeatWrapping;bedLinenBump.repeat.set(16,16)

    // D) Waffle Throw Blanket Texture
    const waffleBump=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h)
      const d=ctx.createImageData(w,h)
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const i=(y*w+x)*4
        const gx=(x%16)<3||(x%16)>13?26:-16
        const gy=(y%16)<3||(y%16)>13?26:-16
        const v=128+gx+gy
        d.data[i]=d.data[i+1]=d.data[i+2]=Math.min(255,Math.max(0,v))
        d.data[i+3]=255
      }
      ctx.putImageData(d,0,0)
    },256)
    waffleBump.wrapS=waffleBump.wrapT=THREE.RepeatWrapping;waffleBump.repeat.set(16,16)

    // E) Sunlit Mediterranean Garden & Balcony Vista
    const gardenVistaTex=createProceduralTexture((ctx,w,h)=>{
      const skyGrad=ctx.createLinearGradient(0,0,0,h*0.7)
      skyGrad.addColorStop(0,'#4a8bc2');skyGrad.addColorStop(0.5,'#7eb8e4');skyGrad.addColorStop(1,'#fff6e5')
      ctx.fillStyle=skyGrad;ctx.fillRect(0,0,w,h)
      const sx=w*0.72,sy=h*0.25
      const sGrad=ctx.createRadialGradient(sx,sy,10,sx,sy,220)
      sGrad.addColorStop(0,'rgba(255,255,245,1)');sGrad.addColorStop(0.2,'rgba(255,245,210,0.8)');sGrad.addColorStop(0.6,'rgba(255,220,160,0.3)');sGrad.addColorStop(1,'transparent')
      ctx.fillStyle=sGrad;ctx.beginPath();ctx.arc(sx,sy,220,0,Math.PI*2);ctx.fill()
      for(let i=0;i<40;i++){
        const tx=(i*27)%w,ty=h*0.62+(i%4)*6,tr=22+(i%16)
        ctx.fillStyle=i%3===0?'#2e4d26':i%3===1?'#3d6334':'#4e7a42'
        ctx.beginPath();ctx.arc(tx,ty,tr,0,Math.PI*2);ctx.fill()
      }
      ctx.fillStyle='#cf7e59';ctx.fillRect(0,h*0.76,w,h*0.24)
      ctx.fillStyle='#e8ded0';ctx.fillRect(0,h*0.74,w,10)
    },1024,512)
    gardenVistaTex.colorSpace=THREE.SRGBColorSpace

    // F) Contemporary Minimalist Fine Art Canvas for Frame TV
    const fineArtTex=createProceduralTexture((ctx,w,h)=>{
      ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,w,h)
      ctx.strokeStyle='#dfd7c8';ctx.lineWidth=2;ctx.strokeRect(30,30,w-60,h-60)
      const ax=50,ay=50,aw=w-100,ah=h-100
      const aGrad=ctx.createLinearGradient(ax,ay,ax,ay+ah)
      aGrad.addColorStop(0,'#3c4a4f');aGrad.addColorStop(0.5,'#5d6b70');aGrad.addColorStop(0.85,'#b89f82');aGrad.addColorStop(1,'#decbb7')
      ctx.fillStyle=aGrad;ctx.fillRect(ax,ay,aw,ah)
      const sunG=ctx.createRadialGradient(ax+aw*0.65,ay+ah*0.4,8,ax+aw*0.65,ay+ah*0.4,110)
      sunG.addColorStop(0,'rgba(255,240,210,0.95)');sunG.addColorStop(0.5,'rgba(215,140,80,0.6)');sunG.addColorStop(1,'transparent')
      ctx.fillStyle=sunG;ctx.beginPath();ctx.arc(ax+aw*0.65,ay+ah*0.4,110,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#1e272a';ctx.beginPath();ctx.moveTo(ax,ay+ah);ctx.bezierCurveTo(ax+150,ay+ah-90,ax+350,ay+ah-40,ax+aw,ay+ah-110);ctx.lineTo(ax+aw,ay+ah);ctx.closePath();ctx.fill()
      ctx.fillStyle='#857b70';ctx.font='12px "DM Sans",sans-serif';ctx.textAlign='center'
      ctx.fillText('MJP CERAMICS · ARCHITECTURAL SUITE NO. 02',w/2,h-36)
    },1024,576)
    fineArtTex.colorSpace=THREE.SRGBColorSpace

    // ── SHARED PBR MATERIALS ──────────────────────────────────────────────────
    // envMapIntensity=0 on all diffuse/light surfaces to prevent the white
    // bathroom HDR environment from creating bright white reflective halos.
    // Only metallic materials (brass, smoked glass, aluminum) keep envMap.
    const oakMat=new THREE.MeshStandardMaterial({map:oakWoodTex,color:'#c8a47e',roughness:.40,metalness:.02,envMapIntensity:0})
    const darkOakMat=new THREE.MeshStandardMaterial({map:oakWoodTex,color:'#3a2a1e',roughness:.55,metalness:.02,envMapIntensity:0})
    // Brass keeps envMap — it's metallic and should catch reflections, just not the white halo
    const brassMat=new THREE.MeshStandardMaterial({color:'#d4a84b',metalness:.90,roughness:.28,bumpMap:hammeredBrassBump,bumpScale:.004,envMapIntensity:0.8})
    // Bouclé: warm sand-stone — zero envMap stops HDR white bleeding into fabric
    const boucleMat=new THREE.MeshStandardMaterial({color:'#b8aa97',roughness:.96,bumpMap:boucleBump,bumpScale:.010,envMapIntensity:0})
    // Crisp ivory sheet — zero envMap, lit purely by scene lights
    const linenSheetMat=new THREE.MeshStandardMaterial({color:'#e8e0d4',roughness:.85,bumpMap:bedLinenBump,bumpScale:.005,envMapIntensity:0})
    // Natural linen duvet — warm greige
    const duvetLinenMat=new THREE.MeshStandardMaterial({color:'#cfc5b4',roughness:.92,bumpMap:bedLinenBump,bumpScale:.007,envMapIntensity:0})
    // Terracotta waffle throw — rich warm rust
    const waffleMat=new THREE.MeshStandardMaterial({color:'#8b4a2c',roughness:.95,bumpMap:waffleBump,bumpScale:.015,envMapIntensity:0})
    // Olive velvet — deep forest green-grey
    const oliveVelvetMat=new THREE.MeshStandardMaterial({color:'#3e4a38',roughness:.88,bumpMap:boucleBump,bumpScale:.008,envMapIntensity:0})
    // Smoked glass & clear glass keep low envMap for realistic shimmer
    const smokedGlassMat=new THREE.MeshStandardMaterial({color:'#1c1814',roughness:.12,metalness:.78,transparent:true,opacity:.55,envMapIntensity:0.5,side:THREE.DoubleSide})
    const clearGlassMat=new THREE.MeshStandardMaterial({color:'#c8e4ea',roughness:.04,metalness:.04,transparent:true,opacity:.18,envMapIntensity:0.3,side:THREE.DoubleSide})
    // Curtains — zero envMap (fabric never reflects HDR)
    const sheerCurtainMat=new THREE.MeshStandardMaterial({color:'#f2eddf',roughness:.95,transparent:true,opacity:.65,bumpMap:bedLinenBump,bumpScale:.004,envMapIntensity:0,side:THREE.DoubleSide})
    const drapeCurtainMat=new THREE.MeshStandardMaterial({color:'#a89e8e',roughness:.92,bumpMap:bedLinenBump,bumpScale:.008,envMapIntensity:0,side:THREE.DoubleSide})
    // Metal trim — low envMap, not zero, so it has metallic depth without blasting white
    const aluminumDark=new THREE.MeshStandardMaterial({color:'#1e2022',roughness:.32,metalness:.82,envMapIntensity:0.35})
    // Architectural surfaces — zero envMap, no white halo on walls/ceiling/skirting
    const baseboardMat=new THREE.MeshStandardMaterial({color:'#d8d0c4',roughness:.78,metalness:.01,envMapIntensity:0})
    const ceilingMat=new THREE.MeshStandardMaterial({color:'#f2efe8',roughness:.96,envMapIntensity:0})
    const wallDefaultMat=new THREE.MeshStandardMaterial({color:'#ddd8d0',roughness:.88,envMapIntensity:0,side:THREE.DoubleSide})

    // ── 3. INTERACTIVE CUSTOMIZABLE ARCHITECTURAL WALLS ────────────────────────
    // Footprint: Width 5.70m (X: -2.85 to +2.85), Depth 5.30m (Z: -2.65 to +2.65), Height 2.90m
    // Every wall is click-customizable and prominently showcases the selected tile/finish!
    // A) North Feature Wall (Headboard wall) – wallId: 1*4 + 2 (6)
    const northWallMat=wallMaterials[1*4+2]??wallDefaultMat
    const northWall=new THREE.Mesh(new THREE.PlaneGeometry(5.70,2.90),northWallMat)
    northWall.position.set(0,F+1.45,-2.645);northWall.receiveShadow=true;northWall.userData.wallId=1*4+2;northWall.userData.repeat=4
    group.add(northWall);wallMeshes.push(northWall)

    // B) East Wall (Wardrobe & Dressing wall) – wallId: 1*4 + 1 (5)
    const eastWallMat=wallMaterials[1*4+1]??wallDefaultMat
    const eastWall=new THREE.Mesh(new THREE.PlaneGeometry(5.30,2.90),eastWallMat)
    eastWall.rotation.y=-Math.PI/2;eastWall.position.set(2.845,F+1.45,0);eastWall.receiveShadow=true;eastWall.userData.wallId=1*4+1;eastWall.userData.repeat=4
    group.add(eastWall);wallMeshes.push(eastWall)

    // C) West Wall (Panoramic Window wall) – wallId: 1*4 + 0 (4)
    const westWallMat=wallMaterials[1*4+0]??wallDefaultMat
    const westBack=new THREE.Mesh(new THREE.PlaneGeometry(1.15,2.90),westWallMat)
    westBack.rotation.y=Math.PI/2;westBack.position.set(-2.845,F+1.45,-2.075);westBack.receiveShadow=true;westBack.userData.wallId=1*4+0;westBack.userData.repeat=2
    group.add(westBack);wallMeshes.push(westBack)
    const westFront=new THREE.Mesh(new THREE.PlaneGeometry(1.45,2.90),westWallMat)
    westFront.rotation.y=Math.PI/2;westFront.position.set(-2.845,F+1.45,1.925);westFront.receiveShadow=true;westFront.userData.wallId=1*4+0;westFront.userData.repeat=2
    group.add(westFront);wallMeshes.push(westFront)
    const westTop=new THREE.Mesh(new THREE.PlaneGeometry(2.70,0.35),westWallMat)
    westTop.rotation.y=Math.PI/2;westTop.position.set(-2.845,F+2.725,-0.15);westTop.userData.wallId=1*4+0
    group.add(westTop);wallMeshes.push(westTop)
    const westBtm=new THREE.Mesh(new THREE.PlaneGeometry(2.70,0.25),westWallMat)
    westBtm.rotation.y=Math.PI/2;westBtm.position.set(-2.845,F+0.125,-0.15);westBtm.receiveShadow=true;westBtm.userData.wallId=1*4+0
    group.add(westBtm);wallMeshes.push(westBtm)

    // D) South Wall (Entrance & Console wall) – wallId: 1*4 + 3 (7)
    const southWallMat=wallMaterials[1*4+3]??wallDefaultMat
    const southWall=new THREE.Mesh(new THREE.PlaneGeometry(5.70,2.90),southWallMat)
    southWall.rotation.y=Math.PI;southWall.position.set(0,F+1.45,2.645);southWall.receiveShadow=true;southWall.userData.wallId=1*4+3;southWall.userData.repeat=4
    group.add(southWall);wallMeshes.push(southWall)

    // ── 4. ARCHITECTURAL SKIRTING BOARDS (BASEBOARDS) ─────────────────────────
    // Frames the floor tile installation cleanly around all perimeter walls
    const BB_H=0.08,BB_T=0.016,BB_Y=F+BB_H/2
    const bbN=new THREE.Mesh(new THREE.BoxGeometry(5.70,BB_H,BB_T),baseboardMat);bbN.position.set(0,BB_Y,-2.64+BB_T/2);bbN.receiveShadow=true;group.add(bbN)
    const bbE=new THREE.Mesh(new THREE.BoxGeometry(BB_T,BB_H,5.30),baseboardMat);bbE.position.set(2.84-BB_T/2,BB_Y,0);bbE.receiveShadow=true;group.add(bbE)
    const bbW=new THREE.Mesh(new THREE.BoxGeometry(BB_T,BB_H,5.30),baseboardMat);bbW.position.set(-2.84+BB_T/2,BB_Y,0);bbW.receiveShadow=true;group.add(bbW)
    const bbS=new THREE.Mesh(new THREE.BoxGeometry(5.70,BB_H,BB_T),baseboardMat);bbS.position.set(0,BB_Y,2.64-BB_T/2);bbS.receiveShadow=true;group.add(bbS)

    // ── 5. ARCHITECTURAL TRAY CEILING WITH HIDDEN WARM COVE ILLUMINATION ──────
    const sofN=new THREE.Mesh(new THREE.BoxGeometry(5.70,0.12,0.40),ceilingMat);sofN.position.set(0,F+2.84,-2.45);group.add(sofN)
    const sofS=new THREE.Mesh(new THREE.BoxGeometry(5.70,0.12,0.40),ceilingMat);sofS.position.set(0,F+2.84,2.45);group.add(sofS)
    const sofE=new THREE.Mesh(new THREE.BoxGeometry(0.40,0.12,4.50),ceilingMat);sofE.position.set(2.65,F+2.84,0);group.add(sofE)
    const sofW=new THREE.Mesh(new THREE.BoxGeometry(0.40,0.12,4.50),ceilingMat);sofW.position.set(-2.65,F+2.84,0);group.add(sofW)
    const ceilCenter=new THREE.Mesh(new THREE.PlaneGeometry(4.90,4.50),ceilingMat)
    ceilCenter.rotation.x=Math.PI/2;ceilCenter.position.set(0,F+2.90,0);ceilCenter.receiveShadow=true;group.add(ceilCenter)
    const coveLight=new THREE.PointLight('#ffe2b8',0.70,7.0,2);coveLight.position.set(0,F+2.78,-0.2);group.add(coveLight)
    ;[[-1.5,-1.2],[1.5,-1.2],[-1.5,1.2],[1.5,1.2]].forEach(([dx,dz])=>{
      const dl=new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.042,0.02,16),brassMat)
      dl.position.set(dx,F+2.84,dz);group.add(dl)
      const dlLens=new THREE.Mesh(new THREE.CircleGeometry(0.035,16),new THREE.MeshBasicMaterial({color:'#fff7e0'}))
      dlLens.rotation.x=Math.PI/2;dlLens.position.set(dx,F+2.83,dz);group.add(dlLens)
    })

    // ── 6. BESPOKE NORTH FEATURE WALL ARCHITECTURAL SLAT PILASTERS ────────────
    // Flanking acoustic oak slats on far left and right edges frame the central feature wall,
    // leaving a wide 3.8m central span completely OPEN for the user to inspect wall tiles!
    const slatW=0.034,slatH=2.88,slatD=0.022
    ;[[-2.24,5], [2.10,5]].forEach(([startX,count])=>{
      for(let s=0;s<count;s++){
        const sx=startX+s*0.048
        const slat=new THREE.Mesh(new THREE.BoxGeometry(slatW,slatH,slatD),oakMat)
        slat.position.set(sx,F+slatH/2,-2.628)
        slat.castShadow=true;slat.receiveShadow=true;group.add(slat)
      }
    })

    // ── 7. LUXURY FLOATING PLATFORM BED & BESPOKE CHANNEL HEADBOARD ────────────
    const bedGrp=new THREE.Group();bedGrp.position.set(0,F,0)

    // A) Floating recessed plinth & under-bed ambient LED floor-wash
    // The gentle warm wash across the floor tile highlights specular sheen and texture!
    const plinth=new THREE.Mesh(new RoundedBoxGeometry(1.68,0.08,1.86,3,0.02),darkOakMat)
    plinth.position.set(0,0.04,-1.35);plinth.castShadow=true;bedGrp.add(plinth)
    const underBedLight=new THREE.PointLight('#ffca85',0.65,2.2,2);underBedLight.position.set(0,0.06,-1.30);bedGrp.add(underBedLight)

    // B) Upholstered Oatmeal Bouclé Platform Base (rounded, tactile edges)
    const baseW=2.04,baseL=2.16,baseH=0.22
    const bedPlatform=new THREE.Mesh(new RoundedBoxGeometry(baseW,baseH,baseL,4,0.035),boucleMat)
    bedPlatform.position.set(0,baseH/2+0.04,-1.32);bedPlatform.castShadow=true;bedPlatform.receiveShadow=true;bedGrp.add(bedPlatform)

    // C) Architectural Headboard Shelf & Channel-Tufted Cushions
    // Low-profile design leaves the entire upper feature wall tile prominently displayed!
    const hbShelfW=3.10,hbShelfH=1.12,hbShelfD=0.07
    const hbBack=new THREE.Mesh(new RoundedBoxGeometry(hbShelfW,hbShelfH,hbShelfD,4,0.02),darkOakMat)
    hbBack.position.set(0,hbShelfH/2,-2.58);hbBack.castShadow=true;hbBack.receiveShadow=true;bedGrp.add(hbBack)

    // Upward LED cove on top of headboard washing the customizable feature wall tile
    const hbLEDStrip=new THREE.Mesh(new THREE.BoxGeometry(hbShelfW-0.10,0.012,0.025),new THREE.MeshStandardMaterial({color:'#ffecc0',emissive:'#ffd990',emissiveIntensity:2.4}))
    hbLEDStrip.position.set(0,hbShelfH+0.006,-2.58);bedGrp.add(hbLEDStrip)
    const hbSlatLED=new THREE.PointLight('#ffd699',0.85,3.2,2);hbSlatLED.position.set(0,hbShelfH+0.25,-2.50);bedGrp.add(hbSlatLED)

    // 4 Softly curved, channel-tufted bouclé cushion pads (no hard flat white boxes!)
    const cushionW=0.72,cushionH=0.82,cushionD=0.08
    for(let c=0;c<4;c++){
      const cx=-1.125+c*0.75
      const csh=new THREE.Mesh(new RoundedBoxGeometry(cushionW,cushionH,cushionD,4,0.035),boucleMat)
      csh.position.set(cx,0.60,-2.53);csh.castShadow=true;csh.receiveShadow=true;bedGrp.add(csh)
      // Slim vertical brass divider reveal between cushion pads
      if(c<3){
        const div=new THREE.Mesh(new THREE.BoxGeometry(0.008,cushionH+0.04,0.015),brassMat)
        div.position.set(cx+cushionW/2+0.015,0.60,-2.53);bedGrp.add(div)
      }
    }
    const hbTopBrass=new THREE.Mesh(new THREE.BoxGeometry(hbShelfW+0.02,0.014,hbShelfD+0.02),brassMat)
    hbTopBrass.position.set(0,hbShelfH+0.01,-2.58);bedGrp.add(hbTopBrass)

    // D) Deep Plush King Mattress with Tailored Piping Seam
    const matW=1.82,matL=2.00,matH=0.25
    const mattress=new THREE.Mesh(new RoundedBoxGeometry(matW,matH,matL,4,0.03),linenSheetMat)
    mattress.position.set(0,0.36,-1.35);mattress.castShadow=true;mattress.receiveShadow=true;bedGrp.add(mattress)

    // E) Realistically Draped Natural Linen Duvet Comforter
    // Modeled with organic curvature and soft draped overhangs on sides and foot
    const duvW=1.86,duvL=1.58,duvH=0.14
    const duvet=new THREE.Mesh(new RoundedBoxGeometry(duvW,duvH,duvL,4,0.045),duvetLinenMat)
    duvet.position.set(0,0.48,-1.16);duvet.castShadow=true;duvet.receiveShadow=true;bedGrp.add(duvet)

    // Draped side falls with natural downward curvature
    const duvSideL=new THREE.Mesh(new RoundedBoxGeometry(0.09,0.24,duvL-0.02,4,0.035),duvetLinenMat)
    duvSideL.position.set(-duvW/2+0.01,0.39,-1.16);duvSideL.castShadow=true;bedGrp.add(duvSideL)
    const duvSideR=new THREE.Mesh(new RoundedBoxGeometry(0.09,0.24,duvL-0.02,4,0.035),duvetLinenMat)
    duvSideR.position.set(duvW/2-0.01,0.39,-1.16);duvSideR.castShadow=true;bedGrp.add(duvSideR)
    const duvFoot=new THREE.Mesh(new RoundedBoxGeometry(duvW,0.24,0.09,4,0.035),duvetLinenMat)
    duvFoot.position.set(0,0.39,-0.37);duvFoot.castShadow=true;bedGrp.add(duvFoot)

    // Folded-over crisp cotton sheet collar at head of bed
    const collar=new THREE.Mesh(new RoundedBoxGeometry(duvW+0.01,0.04,0.32,4,0.02),linenSheetMat)
    collar.position.set(0,0.52,-1.82);collar.castShadow=true;bedGrp.add(collar)

    // F) Terracotta Waffle-Weave Throw Blanket / Bed Runner across the foot
    const throwW=1.90,throwL=0.52
    const throwTop=new THREE.Mesh(new RoundedBoxGeometry(throwW,0.028,throwL,4,0.015),waffleMat)
    throwTop.position.set(0,0.56,-0.68);throwTop.castShadow=true;bedGrp.add(throwTop)
    const throwFlapL=new THREE.Mesh(new RoundedBoxGeometry(0.022,0.30,throwL-0.02,4,0.01),waffleMat)
    throwFlapL.position.set(-throwW/2+0.01,0.42,-0.68);throwFlapL.castShadow=true;bedGrp.add(throwFlapL)
    const throwFlapR=new THREE.Mesh(new RoundedBoxGeometry(0.022,0.30,throwL-0.02,4,0.01),waffleMat)
    throwFlapR.position.set(throwW/2-0.01,0.42,-0.68);throwFlapR.castShadow=true;bedGrp.add(throwFlapR)

    // G) Realistic Layered Pillows (Euro shams, sleeping pillows & accent cushions)
    ;[-0.48,0.48].forEach(px=>{
      const eu=new THREE.Mesh(new RoundedBoxGeometry(0.62,0.54,0.14,4,0.03),linenSheetMat)
      eu.position.set(px,0.72,-2.34);eu.rotation.x=-0.16;eu.castShadow=true;bedGrp.add(eu)
    })
    ;[-0.48,0.48].forEach(px=>{
      const kp=new THREE.Mesh(new RoundedBoxGeometry(0.72,0.38,0.13,4,0.03),linenSheetMat)
      kp.position.set(px,0.56,-2.12);kp.rotation.x=-0.22;kp.castShadow=true;bedGrp.add(kp)
    })
    ;[-0.40,0.40].forEach(px=>{
      const ac=new THREE.Mesh(new RoundedBoxGeometry(0.42,0.26,0.10,4,0.025),oliveVelvetMat)
      ac.position.set(px,0.53,-1.92);ac.rotation.x=-0.16;ac.castShadow=true;bedGrp.add(ac)
      const btn=new THREE.Mesh(new THREE.CylinderGeometry(0.010,0.010,0.11,12),brassMat)
      btn.rotation.x=Math.PI/2;btn.position.set(px,0.53,-1.92);bedGrp.add(btn)
    })
    group.add(bedGrp)

    // ── 8. FLOATING CANTILEVERED NIGHTSTANDS & BEDSIDE LIGHTING ───────────────
    const makeNightstand=(x:number,isLeft:boolean)=>{
      const nsGrp=new THREE.Group();nsGrp.position.set(x,F+0.42,-2.32)
      const body=new THREE.Mesh(new RoundedBoxGeometry(0.50,0.16,0.36,4,0.015),oakMat)
      body.castShadow=true;body.receiveShadow=true;nsGrp.add(body)
      const drw=new THREE.Mesh(new RoundedBoxGeometry(0.48,0.13,0.012,3,0.005),oakMat);drw.position.set(0,0,0.182);nsGrp.add(drw)
      const hdl=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.008,0.016),brassMat);hdl.position.set(0,0.055,0.188);nsGrp.add(hdl)
      const underLight=new THREE.PointLight('#ffc87a',0.40,1.2,2);underLight.position.set(0,-0.12,0);nsGrp.add(underLight)

      if(isLeft){
        const carafe=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.048,0.15,16),clearGlassMat)
        carafe.position.set(-0.12,0.15,-0.04);carafe.castShadow=true;nsGrp.add(carafe)
        const tumbler=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.024,0.07,14),clearGlassMat)
        tumbler.position.set(-0.03,0.115,-0.08);nsGrp.add(tumbler)
        const clock=new THREE.Mesh(new RoundedBoxGeometry(0.11,0.05,0.038,3,0.008),aluminumDark);clock.position.set(0.12,0.105,0.04);nsGrp.add(clock)
      } else {
        const vase=new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.046,0.13,16),new THREE.MeshStandardMaterial({color:'#e4ded4',roughness:.82}))
        vase.position.set(0.12,0.145,-0.04);vase.castShadow=true;nsGrp.add(vase)
        const sprig=new THREE.Mesh(new THREE.CylinderGeometry(0.002,0.003,0.24,6),new THREE.MeshStandardMaterial({color:'#4f5a43',roughness:.8}))
        sprig.position.set(0.12,0.26,-0.04);sprig.rotation.z=-0.14;nsGrp.add(sprig)
        const tray=new THREE.Mesh(new RoundedBoxGeometry(0.12,0.010,0.10,3,0.005),brassMat);tray.position.set(-0.06,0.085,0.04);nsGrp.add(tray)
      }
      group.add(nsGrp)

      // Designer brass drop pendant fixture with soft glowing frosted glass orb
      const pntGrp=new THREE.Group();pntGrp.position.set(x,F+2.85,-2.15)
      const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.002,0.002,1.45,8),aluminumDark);cable.position.y=-0.725;pntGrp.add(cable)
      const socket=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.10,16),brassMat);socket.position.y=-1.45;pntGrp.add(socket)
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.070,24,24),new THREE.MeshStandardMaterial({color:'#fff5e2',emissive:'#ffda94',emissiveIntensity:1.5,roughness:.3}))
      orb.position.y=-1.54;pntGrp.add(orb)
      const pntLight=new THREE.PointLight('#ffd699',0.65,2.4,2);pntLight.position.y=-1.54;pntGrp.add(pntLight)
      group.add(pntGrp)
    }
    makeNightstand(-1.32,true)
    makeNightstand(1.32,false)

    // ── 9. PANORAMIC PICTURE WINDOW & BALCONY GARDEN (WEST WALL) ──────────────
    const winX=-2.84,winY=F+1.45,winZ=-0.15,winW=2.70,winH=2.45
    const winFrame=new THREE.Group();winFrame.position.set(winX,winY,winZ)
    const wfT=0.06,wfD=0.07
    const wfTop=new THREE.Mesh(new THREE.BoxGeometry(wfD,wfT,winW),aluminumDark);wfTop.position.y=winH/2;winFrame.add(wfTop)
    const wfBtm=new THREE.Mesh(new THREE.BoxGeometry(wfD,wfT+0.02,winW+0.04),aluminumDark);wfBtm.position.y=-winH/2-0.01;winFrame.add(wfBtm)
    const wfL=new THREE.Mesh(new THREE.BoxGeometry(wfD,winH,wfT),aluminumDark);wfL.position.z=-winW/2;winFrame.add(wfL)
    const wfR=new THREE.Mesh(new THREE.BoxGeometry(wfD,winH,wfT),aluminumDark);wfR.position.z=winW/2;winFrame.add(wfR)
    ;[-0.60,0.60].forEach(mz=>{
      const mul=new THREE.Mesh(new THREE.BoxGeometry(wfD-0.01,winH,0.035),aluminumDark);mul.position.z=mz;winFrame.add(mul)
    })
    const glassPane=new THREE.Mesh(new THREE.PlaneGeometry(winW,winH),clearGlassMat)
    glassPane.rotation.y=Math.PI/2;winFrame.add(glassPane)
    group.add(winFrame)

    const vistaMesh=new THREE.Mesh(new THREE.PlaneGeometry(6.2,3.4),new THREE.MeshBasicMaterial({map:gardenVistaTex}))
    vistaMesh.rotation.y=Math.PI/2;vistaMesh.position.set(winX-0.65,winY+0.1,winZ);group.add(vistaMesh)

    const railGrp=new THREE.Group();railGrp.position.set(winX-0.25,F+0.55,winZ)
    const topRail=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.03,winW+0.4),aluminumDark);topRail.position.y=0.55;railGrp.add(topRail)
    for(let r=0;r<=14;r++){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,1.10,8),aluminumDark)
      post.position.z=-winW/2-0.15+r*(winW+0.3)/14;railGrp.add(post)
    }
    group.add(railGrp)
    const planter=new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.16,0.46,18),new THREE.MeshStandardMaterial({color:'#c27752',roughness:.85}))
    planter.position.set(winX-0.42,F+0.23,winZ-1.0);group.add(planter)
    const foliage=new THREE.Mesh(new THREE.SphereGeometry(0.26,12,10),new THREE.MeshStandardMaterial({color:'#3f5734',roughness:.9}))
    foliage.position.set(winX-0.42,F+0.72,winZ-1.0);foliage.scale.set(1,1.25,1);group.add(foliage)

    const curtGrp=new THREE.Group();curtGrp.position.set(winX+0.08,F,winZ)
    const sheer=new THREE.Mesh(new THREE.PlaneGeometry(winW+0.2,2.82),sheerCurtainMat)
    sheer.rotation.y=Math.PI/2;sheer.position.set(0,1.41,0);curtGrp.add(sheer)
    ;[-winW/2-0.12,winW/2+0.12].forEach(dz=>{
      const drp=new THREE.Mesh(new RoundedBoxGeometry(0.10,2.82,0.38,3,0.02),drapeCurtainMat)
      drp.position.set(0.02,1.41,dz);drp.castShadow=true;curtGrp.add(drp)
    })
    group.add(curtGrp)

    const sunBeam=new THREE.Mesh(new THREE.ConeGeometry(0.50,3.0,8,1,true),new THREE.MeshBasicMaterial({color:'#fffbe8',transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide}))
    sunBeam.rotation.z=-Math.PI/2;sunBeam.position.set(winX+1.5,F+1.35,winZ+0.2);group.add(sunBeam)

    // ── 10. REPOSITIONED SUNLIT READING NOOK (WEST WINDOW SIDE) ───────────────
    // Placed gracefully beside the window, COMPLETELY OPENING the central floor for tile checking!
    loader.load('/models/modern-arm-chair/modern_arm_chair_01_1k.gltf',gltf=>{
      if(disposed)return
      const chair=gltf.scene
      chair.traverse(o=>{ if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;geometries.add(o.geometry);if(o.material)materials.add(o.material)} })
      const b=new THREE.Box3().setFromObject(chair)
      chair.position.set(-2.05,F-b.min.y,0.15)
      chair.rotation.y=Math.PI*0.38
      chair.scale.setScalar(0.92)
      group.add(chair)
    })

    // Minimalist brass & glass accent side table (airy design leaves floor visible underneath)
    const tableGrp=new THREE.Group();tableGrp.position.set(-1.62,F,0.58)
    const tBase=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.016,24),brassMat);tBase.position.y=0.008;tableGrp.add(tBase)
    const tPole=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.44,12),brassMat);tPole.position.y=0.23;tableGrp.add(tPole)
    const tTop=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.014,24),smokedGlassMat);tTop.position.y=0.45;tableGrp.add(tTop)
    const tRim=new THREE.Mesh(new THREE.TorusGeometry(0.158,0.004,8,24),brassMat);tRim.rotation.x=Math.PI/2;tRim.position.y=0.45;tableGrp.add(tRim)
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.020,0.040,14),new THREE.MeshStandardMaterial({color:'#faf7f2',roughness:.6}))
    cup.position.set(0.02,0.48,-0.02);tableGrp.add(cup)
    group.add(tableGrp)

    // Slim architectural reading lamp
    const rLampGrp=new THREE.Group();rLampGrp.position.set(-2.45,F,0.72)
    const rlBase=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.016,20),aluminumDark);rlBase.position.y=0.008;rLampGrp.add(rlBase)
    const rlPole=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,1.48,10),aluminumDark);rlPole.position.y=0.75;rLampGrp.add(rlPole)
    const rlArm=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.26,8),brassMat);rlArm.rotation.z=-0.65;rlArm.position.set(0.08,1.46,0);rLampGrp.add(rlArm)
    const rlShade=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.12,16),aluminumDark);rlShade.rotation.z=-0.65;rlShade.position.set(0.18,1.41,0);rLampGrp.add(rlShade)
    const rlLight=new THREE.PointLight('#ffe6cc',0.65,2.0,2);rlLight.position.set(0.18,1.36,0);rLampGrp.add(rlLight)
    group.add(rLampGrp)

    // ── 11. LUXURY SMOKED-GLASS WARDROBE & FLOATING VANITY (EAST WALL) ─────────
    // Refined Italian design with warm smoked glass and internal LED lighting
    const wardGrp=new THREE.Group();wardGrp.position.set(2.56,F,-1.45)
    const wW=0.54,wL=1.95,wH=2.65
    const wCarcass=new THREE.Mesh(new RoundedBoxGeometry(wW,wH,wL,4,0.02),darkOakMat);wCarcass.position.set(0,wH/2,0);wCarcass.castShadow=true;wardGrp.add(wCarcass)
    const doorCount=3,doorW=wL/doorCount
    for(let d=0;d<doorCount;d++){
      const dz=-wL/2+doorW/2+d*doorW
      const gDoor=new THREE.Mesh(new THREE.PlaneGeometry(wH-0.08,doorW-0.02),smokedGlassMat)
      gDoor.rotation.z=Math.PI/2;gDoor.rotation.y=-Math.PI/2;gDoor.position.set(-wW/2-0.004,wH/2,dz);wardGrp.add(gDoor)
      const dFrame=new THREE.Mesh(new THREE.BoxGeometry(0.012,wH-0.06,0.014),aluminumDark);dFrame.position.set(-wW/2-0.006,wH/2,dz-doorW/2+0.01);wardGrp.add(dFrame)
    }
    const wLed=new THREE.PointLight('#ffd89c',0.60,2.0,2);wLed.position.set(-0.15,wH*0.65,0);wardGrp.add(wLed)
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,wL-0.12,12),brassMat);rail.rotation.x=Math.PI/2;rail.position.set(-0.12,wH*0.72,0);wardGrp.add(rail)
    const garColors=['#2b2d30','#48423b','#ded8ce','#3a474b']
    for(let g=0;g<5;g++){
      const gMat=new THREE.MeshStandardMaterial({color:garColors[g%garColors.length],roughness:.85})
      const garment=new THREE.Mesh(new RoundedBoxGeometry(0.34,0.68,0.05,3,0.01),gMat)
      garment.position.set(-0.12,wH*0.72-0.40,-wL/2+0.25+g*(wL-0.5)/4);wardGrp.add(garment)
    }
    group.add(wardGrp)

    // Floating Dressing Vanity in warm oak with travertine stone top
    const vanGrp=new THREE.Group();vanGrp.position.set(2.60,F+0.72,0.68)
    const vanDesk=new THREE.Mesh(new RoundedBoxGeometry(0.40,0.12,1.20,4,0.015),oakMat);vanDesk.castShadow=true;vanDesk.receiveShadow=true;vanGrp.add(vanDesk)
    const vanTopStone=new THREE.Mesh(new RoundedBoxGeometry(0.404,0.014,1.204,3,0.005),new THREE.MeshStandardMaterial({color:'#ded8ce',roughness:.60}))
    vanTopStone.position.y=0.066;vanGrp.add(vanTopStone)
    ;[-0.28,0.28].forEach(dz=>{
      const drw=new THREE.Mesh(new THREE.BoxGeometry(0.008,0.09,0.52),oakMat);drw.position.set(-0.204,-0.005,dz);vanGrp.add(drw)
      const hdl=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.09,8),brassMat);hdl.rotation.x=Math.PI/2;hdl.position.set(-0.212,-0.005,dz);vanGrp.add(hdl)
    })
    const perfume=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.075,12),clearGlassMat);perfume.position.set(-0.08,0.11,-0.30);vanGrp.add(perfume)
    const tray=new THREE.Mesh(new RoundedBoxGeometry(0.12,0.010,0.09,3,0.004),brassMat);tray.position.set(-0.06,0.078,0.28);vanGrp.add(tray)
    group.add(vanGrp)

    // Circular Halo Vanity Mirror with soft warm ambient glow (no harsh specular hotspot)
    const mirGrp=new THREE.Group();mirGrp.position.set(2.83,F+1.52,0.68)
    const mirFrame=new THREE.Mesh(new THREE.CylinderGeometry(0.40,0.40,0.022,36),brassMat);mirFrame.rotation.z=Math.PI/2;mirGrp.add(mirFrame)
    const mirDisc=new THREE.Mesh(new THREE.CircleGeometry(0.388,36),new THREE.MeshStandardMaterial({color:'#f4f4f4',roughness:.06,metalness:.92,envMapIntensity:1.5}))
    mirDisc.rotation.y=-Math.PI/2;mirDisc.position.x=-0.012;mirGrp.add(mirDisc)
    const mirHalo=new THREE.Mesh(new THREE.RingGeometry(0.40,0.43,36),new THREE.MeshBasicMaterial({color:'#ffdfa4',side:THREE.DoubleSide}))
    mirHalo.rotation.y=-Math.PI/2;mirHalo.position.x=-0.006;mirGrp.add(mirHalo)
    const mirLight=new THREE.PointLight('#ffdaa0',0.55,1.8,2);mirLight.position.set(-0.10,0,0);mirGrp.add(mirLight)
    group.add(mirGrp)

    // Bouclé vanity stool pouf with brass plinth base
    const pufGrp=new THREE.Group();pufGrp.position.set(2.40,F+0.21,0.68)
    const pufBase=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.025,24),brassMat);pufBase.position.y=-0.195;pufGrp.add(pufBase)
    const pufBody=new THREE.Mesh(new RoundedBoxGeometry(0.38,0.38,0.38,4,0.04),boucleMat);pufBody.position.y=0.005;pufBody.castShadow=true;pufGrp.add(pufBody)
    group.add(pufGrp)

    // ── 12. SOUTH WALL: ENTRANCE DOOR & SLIM MINIMAL DISPLAY CONSOLE ──────────
    const doorGrp=new THREE.Group();doorGrp.position.set(1.75,F+1.22,2.63)
    const dJambL=new THREE.Mesh(new THREE.BoxGeometry(0.04,2.45,0.05),darkOakMat);dJambL.position.x=-0.48;doorGrp.add(dJambL)
    const dJambR=new THREE.Mesh(new THREE.BoxGeometry(0.04,2.45,0.05),darkOakMat);dJambR.position.x=0.48;doorGrp.add(dJambR)
    const dHead=new THREE.Mesh(new THREE.BoxGeometry(1.00,0.04,0.05),darkOakMat);dHead.position.y=1.225;doorGrp.add(dHead)
    const dLeaf=new THREE.Mesh(new THREE.BoxGeometry(0.92,2.41,0.038),darkOakMat);dLeaf.position.z=-0.008;doorGrp.add(dLeaf)
    const dLever=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.11,8),brassMat);dLever.rotation.z=Math.PI/2;dLever.position.set(-0.38,-0.18,-0.035);doorGrp.add(dLever)
    group.add(doorGrp)

    // Floating display shelf for Samsung The Frame TV
    const tvW=1.38,tvH=0.80,tvD=0.020
    const tvGrp=new THREE.Group();tvGrp.position.set(0,F+1.46,2.63)
    const tvBezel=new THREE.Mesh(new RoundedBoxGeometry(tvW+0.016,tvH+0.016,tvD,3,0.004),oakMat);tvGrp.add(tvBezel)
    const tvCanvasMesh=new THREE.Mesh(new THREE.PlaneGeometry(tvW,tvH),new THREE.MeshStandardMaterial({map:fineArtTex,roughness:.65}))
    tvCanvasMesh.rotation.y=Math.PI;tvCanvasMesh.position.z=-tvD/2-0.002;tvGrp.add(tvCanvasMesh)
    const tvGlow=new THREE.PointLight('#ffe4b8',0.45,1.6,2);tvGlow.position.set(0,0,0.06);tvGrp.add(tvGlow)
    group.add(tvGrp)

    const crdGrp=new THREE.Group();crdGrp.position.set(0,F+0.46,2.50)
    const crdBody=new THREE.Mesh(new RoundedBoxGeometry(1.55,0.18,0.24,4,0.012),oakMat);crdBody.castShadow=true;crdGrp.add(crdBody)
    const crdLip=new THREE.Mesh(new THREE.BoxGeometry(1.554,0.006,0.244),brassMat);crdLip.position.y=0.093;crdGrp.add(crdLip)
    const sculp=new THREE.Mesh(new THREE.TorusGeometry(0.060,0.022,12,24),new THREE.MeshStandardMaterial({color:'#f4efe8',roughness:.6}))
    sculp.position.set(-0.48,0.15,0);crdGrp.add(sculp)
    const bk1=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.022,0.16),new THREE.MeshStandardMaterial({color:'#242629',roughness:.8}))
    bk1.position.set(0.44,0.102,0);crdGrp.add(bk1)
    group.add(crdGrp)

    // ── 13. CINEMATIC ARCHITECTURAL LIGHTING RIG ──────────────────────────────
    // PHILOSOPHY: One dominant key light from the window (golden morning sun),
    // a cool sky bounce from above-right, warm practical lights (pendants, cove),
    // and a very low ambient. Creates clear shadow direction & material depth.

    // A) WINDOW KEY LIGHT — warm golden morning sun entering from west (x=-2.84)
    // normalBias lowered to 0.004 to eliminate the bright white halo at shadow edges
    const sunKey=new THREE.DirectionalLight('#ffe5b0',1.8)
    sunKey.position.set(-9,5,0.8);sunKey.castShadow=true
    sunKey.shadow.mapSize.set(2048,2048)
    sunKey.shadow.bias=-0.0004;sunKey.shadow.normalBias=0.004
    sunKey.shadow.camera.left=-4.5;sunKey.shadow.camera.right=4.5
    sunKey.shadow.camera.top=4.5;sunKey.shadow.camera.bottom=-4.5
    group.add(sunKey)

    // B) COOL SKY BOUNCE — very subtle, kept low so shadow sides stay dark & realistic
    // Was 0.45 — reduced to 0.18 so shadow faces don't look white/overlit
    const skyFill=new THREE.DirectionalLight('#8aaac4',0.18)
    skyFill.position.set(6,3.5,-1.0);group.add(skyFill)

    // C) CEILING RECESSED SPOTLIGHTS — warm focused downlights over key zones
    // Each spot has a tight cone so it doesn't bleed across the whole room
    const makeSpot=(x:number,z:number,intensity:number,yTarget:number,color='#ffecd8')=>{
      const spot=new THREE.SpotLight(color,intensity,4.5,0.38,0.62,1.6)
      spot.position.set(x,F+2.80,z)
      spot.target.position.set(x,yTarget,z)
      spot.castShadow=false
      group.add(spot);group.add(spot.target)
    }
    makeSpot(0,-1.5,2.0,F+0.55)      // Over bed / headboard
    makeSpot(0, 0.4,0.18,F+0.10)     // Soft ambient fill - prevents specular floor glare blowout
    makeSpot(2.55,0.68,1.5,F+0.72)   // Over vanity & mirror
    makeSpot(-1.62,0.58,1.2,F+0.10)  // Reading nook corner

    // D) BEDSIDE PENDANT PRACTICAL GLOW — warm intimate pools near pillows
    // Complements the pendant orbs already on nightstands
    const bedLight1=new THREE.PointLight('#ffcc88',2.2,1.8,2)
    bedLight1.position.set(-1.32,F+1.30,-2.10);group.add(bedLight1)
    const bedLight2=new THREE.PointLight('#ffcc88',2.2,1.8,2)
    bedLight2.position.set(1.32,F+1.30,-2.10);group.add(bedLight2)

    // E) HEADBOARD COVE WASH — upward LED strip washing feature wall tile
    // Already placed on the LED strip geometry; this point light adds fill
    const coveWash=new THREE.PointLight('#ffd080',1.5,2.6,2)
    coveWash.position.set(0,F+1.30,-2.50);group.add(coveWash)

    // F) UNDER-BED AMBIENT FLOOR WASH — sweeps tile surface near bed
    const bedFloorGlow=new THREE.PointLight('#ffb85a',0.80,1.8,2)
    bedFloorGlow.position.set(0,F+0.10,-1.30);group.add(bedFloorGlow)

    // G) VANITY MIRROR HALO — warm fill illuminating the dressing zone
    const mirrorFill=new THREE.PointLight('#ffe0a0',1.8,2.2,2)
    mirrorFill.position.set(2.60,F+1.55,0.68);group.add(mirrorFill)

    // H) MINIMAL AMBIENT FILL — just enough to prevent pitch-black shadows
    // Very low so it doesn't wash out the directional light drama
    const ambFill=new THREE.PointLight('#e8d8c8',0.22,10,2)
    ambFill.position.set(0,F+2.80,0);group.add(ambFill)
  }
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
    else {
      // Authentic soft hand-troweled Indian lime plaster (Araish/Chuna) texture
      for(let i=0;i<160;i++){
        const x=(i*37)%256,y=(i*67)%256,rx=18+(i%24),ry=12+(i%16);
        const grad=ctx.createRadialGradient(x,y,0,x,y,rx);
        grad.addColorStop(0,i%2?'rgba(255,255,255,.07)':'rgba(70,60,50,.05)');
        grad.addColorStop(1,'transparent');
        ctx.fillStyle=grad;
        ctx.beginPath();
        ctx.ellipse(x,y,rx,ry,(i*0.4),0,Math.PI*2);
        ctx.fill();
      }
      const idata=ctx.getImageData(0,0,256,256);
      for(let p=0;p<idata.data.length;p+=4){
        const n=(Math.random()-.5)*6;
        idata.data[p]=Math.min(255,Math.max(0,idata.data[p]+n));
        idata.data[p+1]=Math.min(255,Math.max(0,idata.data[p+1]+n));
        idata.data[p+2]=Math.min(255,Math.max(0,idata.data[p+2]+n));
      }
      ctx.putImageData(idata,0,0);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,2.4);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture
  }
  interiors.forEach((entry,index)=>{
    const group=new THREE.Group();group.position.z=centres[index];group.userData.room=index;group.name=entry.label;scene.add(group)
    if(index===3)group.userData.environmentType='cooking-club'
    const floorMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.64,metalness:.015,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(entry.walkX*2,entry.walkZ*2),floorMaterial)
    floor.rotation.x=-Math.PI/2;floor.position.y=.125;floor.visible=false;floor.receiveShadow=true;floor.renderOrder=2;floor.userData.floor=true;floor.userData.room=index;group.add(floor);floorMeshes.push(floor);floorMaterials.push(floorMaterial)
    const wallGroup=new THREE.Group();group.add(wallGroup)
    const addWall=(side:number,width:number,x:number,z:number,rotationY:number)=>{
      const id=index*4+side
      const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.84,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
      const customRoom=index===1||index===3||index===4,displayWidth=width,displayHeight=3.15
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(displayWidth,displayHeight),material)
      wall.position.set(x,1.68,z);wall.rotation.y=rotationY;wall.visible=!customRoom;wall.userData.wallId=id;wall.userData.repeat=Math.max(2,displayWidth*.72);wallGroup.add(wall);wallMeshes.push(wall);wallMaterials[id]=material
    }
    addWall(0,entry.walkZ*2,-entry.walkX+.045,0,Math.PI/2)
    addWall(1,entry.walkZ*2,entry.walkX-.045,0,-Math.PI/2)
    addWall(2,entry.walkX*2,0,-entry.walkZ+.045,0)
    addWall(3,entry.walkX*2,0,entry.walkZ-.045,Math.PI)
    const loadModel=()=>new Promise<void>(resolve=>{const attemptLoad=(attempt:number)=>loader.load(entry.url,async gltf=>{
      if(disposed){disposeLoadedGltf(gltf);resolve();return}
      if(index===4)void restoreSpecularGlossiness(gltf).catch(error=>{console.warn('Could not restore the bathroom GLB material maps',error);onAssetError?.('Some Modern Bathroom material maps could not be loaded.')})
      const model=gltf.scene
      if(index===4)configureBathroomGlass(model)
      // The uploaded GLB is already Y-up; preserve its authored orientation.
      let bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3())
      const scale=Math.min(1,entry.maxSpan/Math.max(size.x,size.z),3.45/size.y)
      model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale)
      group.add(model);group.updateMatrixWorld(true)
      bounds=new THREE.Box3().setFromObject(model);size=bounds.getSize(new THREE.Vector3());center=bounds.getCenter(new THREE.Vector3())
      if(index===3||index===4){
        // Fit the walking boundary to the measured architectural footprint.
        walkBounds[index]={walkX:Math.max(.8,size.x/2-.12),walkZ:Math.max(.8,size.z/2-.12)}
      }
      let authoredFloorY=.105
      const detectedFloors=new Set<THREE.Mesh>()
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh)||!/(floor|planks|ground)/i.test(object.name)||/(lamp|floor_lamp)/i.test(object.name))return
        const floorBounds=new THREE.Box3().setFromObject(object),floorSize=floorBounds.getSize(new THREE.Vector3())
        if(floorSize.x>.8&&floorSize.z>.8){detectedFloors.add(object);authoredFloorY=Math.max(authoredFloorY,Math.min(1.5,floorBounds.max.y+.045))}
      })
      // Generic imported meshes often do not contain "floor" in their name.
      // Sample upward-facing geometry to find the actual walkable surface.
      if(index!==4){
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
      }
      if(index===3){
        const shellMeshes:THREE.Mesh[]=[]
        model.traverse(object=>{if(object instanceof THREE.Mesh&&object.name.startsWith('house_'))shellMeshes.push(object)})
        const project=(point:THREE.Vector3,axis:'floor'|'x-wall'|'z-wall')=>axis==='floor'?[(point.x/0.6),(point.z/0.6)]:axis==='x-wall'?[(point.z/0.6),(point.y/0.3)]:[(point.x/0.6),(point.y/0.3)]
        for(const source of shellMeshes){
          const geometry=source.geometry,indexAttribute=geometry.index
          if(!indexAttribute)continue
          source.updateWorldMatrix(true,false)
          const position=geometry.getAttribute('position'),buckets=new Map<string,{indices:number[];kind:'floor'|'wall'|'backsplash';wall:number;axis:'floor'|'x-wall'|'z-wall'}>(),remaining:number[]=[]
          for(let offset=0;offset<indexAttribute.count;offset+=3){
            const a=indexAttribute.getX(offset),b=indexAttribute.getX(offset+1),c=indexAttribute.getX(offset+2),pa=new THREE.Vector3().fromBufferAttribute(position,a).applyMatrix4(source.matrixWorld),pb=new THREE.Vector3().fromBufferAttribute(position,b).applyMatrix4(source.matrixWorld),pc=new THREE.Vector3().fromBufferAttribute(position,c).applyMatrix4(source.matrixWorld),normal=pb.clone().sub(pa).cross(pc.clone().sub(pa)).normalize(),center=pa.clone().add(pb).add(pc).multiplyScalar(1/3)
            let kind:'floor'|'wall'|'backsplash'|null=null,axis:'floor'|'x-wall'|'z-wall'='floor',wall=12
            if(Math.abs(normal.y)>.78&&center.y<=authoredFloorY+.18)kind='floor'
            else if(Math.abs(normal.y)<.22&&center.y>authoredFloorY+.22){axis=Math.abs(normal.x)>Math.abs(normal.z)?'x-wall':'z-wall';kind=center.y<authoredFloorY+1.55&&center.y>authoredFloorY+.72?'backsplash':'wall';wall=kind==='backsplash'?21:axis==='x-wall'?(normal.x<0?12:13):(normal.z<0?14:15)}
            if(!kind){remaining.push(a,b,c);continue}
            const key=`${kind}:${wall}`,bucket=buckets.get(key)??{indices:[],kind,wall,axis};bucket.indices.push(a,b,c);buckets.set(key,bucket)
          }
          if(!buckets.size)continue
          const rest=geometry.clone();rest.setIndex(remaining);rest.clearGroups();source.geometry=rest;geometries.add(rest)
        for(const bucket of buckets.values()){
              const surfaceGeometry=geometry.clone();surfaceGeometry.setIndex(bucket.indices);surfaceGeometry.clearGroups()
            const worldBounds=new THREE.Box3(),localBounds=new THREE.Box3(),vertexPoint=new THREE.Vector3();for(const vertex of bucket.indices){vertexPoint.fromBufferAttribute(position,vertex);localBounds.expandByPoint(vertexPoint);worldBounds.expandByPoint(vertexPoint.clone().applyMatrix4(source.matrixWorld))}
            surfaceGeometry.boundingBox=localBounds;surfaceGeometry.boundingSphere=localBounds.getBoundingSphere(new THREE.Sphere())
            const uv=new Float32Array(position.count*2),point=new THREE.Vector3()
            for(let vertex=0;vertex<position.count;vertex++){point.fromBufferAttribute(position,vertex).applyMatrix4(source.matrixWorld);const coords=project(point,bucket.axis);uv[vertex*2]=coords[0];uv[vertex*2+1]=coords[1]}
            surfaceGeometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));surfaceGeometry.computeVertexNormals();geometries.add(surfaceGeometry)
            let material:THREE.MeshStandardMaterial
            if(bucket.kind==='floor')material=floorMaterials[index]
            else{wallMaterials[bucket.wall]??=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.84,side:THREE.DoubleSide});material=wallMaterials[bucket.wall]}
            materials.add(material)
            const surface=new THREE.Mesh(surfaceGeometry,material);surface.name=`Cooking Club ${bucket.kind} ${bucket.wall}`;surface.position.copy(source.position);surface.quaternion.copy(source.quaternion);surface.scale.copy(source.scale);surface.userData.surfaceType=bucket.kind;surface.userData.repeat=1;surface.userData.physicalUV=true;surface.userData.floorRoom=index;surface.userData.floor=bucket.kind==='floor';surface.userData.wallId=bucket.wall;surface.castShadow=false;surface.receiveShadow=true;source.parent?.add(surface)
            if(bucket.kind==='floor')cookingSurfaces.floor.push(surface)
            else if(bucket.kind==='backsplash')cookingSurfaces.backsplash.push(surface)
            else cookingSurfaces.walls.push(surface)
            if(bucket.kind!=='floor')wallMeshes.push(surface)
          }
        }
        cookingSurfaces.walls.concat(cookingSurfaces.backsplash).forEach(mesh=>{const id=mesh.userData.wallId as number;wallMaterials[id]??=mesh.material as THREE.MeshStandardMaterial})
      }
      floor.position.y=authoredFloorY;wallGroup.position.y=authoredFloorY-.105
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return
        const isBackdrop=/(backdrop|window|glass)/i.test(object.name)
        object.castShadow=index===3||index===4?false:!isBackdrop;object.receiveShadow=true;geometries.add(object.geometry)
        const list=Array.isArray(object.material)?object.material:[object.material]
        list.forEach(material=>{materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value)})
      })
      let targets=index===3&&cookingSurfaces.floor.length?cookingSurfaces.floor:[...detectedFloors].filter(object=>{const meshBounds=new THREE.Box3().setFromObject(object),meshSize=meshBounds.getSize(new THREE.Vector3());return meshSize.x>.8&&meshSize.z>.8&&meshSize.y<.45})
      floorTargets[index]=targets
      if(index===4){
        // The bathroom shell is a single named mesh. Split its triangles using
        // measured world normals and positions; fixture meshes retain GLB mats.
        const source=model.getObjectByName('Modern_Bathroom_Structure_0')
        if(source instanceof THREE.Mesh&&source.geometry.index){
          source.updateWorldMatrix(true,false)
          const original=source.geometry,indices=original.index!,position=original.getAttribute('position')
          const buckets=new Map<string,{indices:number[];kind:'floor'|'wall'|'backsplash';wall:number;axis:'floor'|'x-wall'|'z-wall'}>(),remaining:number[]=[]
          const project=(point:THREE.Vector3,axis:'floor'|'x-wall'|'z-wall')=>axis==='floor'?[point.x,point.z]:axis==='x-wall'?[point.z,point.y]:[point.x,point.y]
          let measuredFloor=-Infinity
          for(let offset=0;offset<indices.count;offset+=3){
            const ia=indices.getX(offset),ib=indices.getX(offset+1),ic=indices.getX(offset+2)
            const a=new THREE.Vector3().fromBufferAttribute(position,ia).applyMatrix4(source.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(position,ib).applyMatrix4(source.matrixWorld),c=new THREE.Vector3().fromBufferAttribute(position,ic).applyMatrix4(source.matrixWorld)
            const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),center=a.clone().add(b).add(c).multiplyScalar(1/3)
            let kind:'floor'|'wall'|'backsplash'|null=null,axis:'floor'|'x-wall'|'z-wall'='floor',wall=21
            if(Math.abs(normal.y)>.78&&center.y<authoredFloorY+.2){kind='floor';measuredFloor=Math.max(measuredFloor,center.y)}
            else if(Math.abs(normal.y)<.22&&center.y>authoredFloorY+.2){
              axis=Math.abs(normal.x)>Math.abs(normal.z)?'x-wall':'z-wall'
              // The measured shower occupies the north end and west side.
              kind=(axis==='x-wall'?center.x < -1.25&&center.z-centres[index]>1.85:center.z-centres[index]>2.1)?'backsplash':'wall'
              wall=kind==='backsplash'?20:axis==='x-wall'?(normal.x<0?16:17):(normal.z<0?18:19)
            }
            if(!kind){remaining.push(ia,ib,ic);continue}
            const key=`${kind}:${wall}`,bucket=buckets.get(key)??{indices:[],kind,wall,axis};bucket.indices.push(ia,ib,ic);buckets.set(key,bucket)
          }
          if(buckets.size){
            const rest=original.clone();rest.setIndex(remaining);rest.clearGroups();source.geometry=rest;geometries.add(rest)
            const bathroomFloors:THREE.Mesh[]=[]
            for(const bucket of buckets.values()){
              const geometry=original.clone();geometry.setIndex(bucket.indices);geometry.clearGroups()
              const uv=new Float32Array(position.count*2),point=new THREE.Vector3()
              for(let vertex=0;vertex<position.count;vertex++){point.fromBufferAttribute(position,vertex).applyMatrix4(source.matrixWorld);const coords=project(point,bucket.axis);uv[vertex*2]=coords[0];uv[vertex*2+1]=coords[1]}
              geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.computeVertexNormals();geometries.add(geometry)
              const material=bucket.kind==='floor'?floorMaterial:(wallMaterials[bucket.wall]??=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.84,side:THREE.DoubleSide}))
              materials.add(material)
              const surface=new THREE.Mesh(geometry,material);surface.name=`Modern Bathroom ${bucket.kind} ${bucket.wall}`;surface.position.copy(source.position);surface.quaternion.copy(source.quaternion);surface.scale.copy(source.scale)
              surface.userData.surfaceType=bucket.kind;surface.userData.repeat=1;surface.userData.physicalUV=true;surface.userData.bathroomMetricUV=true;surface.userData.floorRoom=index;surface.userData.floor=bucket.kind==='floor';surface.userData.wallId=bucket.wall;surface.castShadow=false;surface.receiveShadow=true;source.parent?.add(surface)
              const mapped=bathroomSurfaceMap.get(bucket.wall)??[];mapped.push(surface);bathroomSurfaceMap.set(bucket.wall,mapped)
              if(bucket.kind==='floor')bathroomFloors.push(surface)
              else{wallMeshes.push(surface);wallMaterials[bucket.wall]=material;if(bucket.kind==='backsplash')cookingSurfaces.backsplash.push(surface)}
            }
            if(bathroomFloors.length){targets=bathroomFloors;floorTargets[index]=bathroomFloors}
          }
          const shellBounds=new THREE.Box3().setFromObject(model)
          const floorBounds=new THREE.Box3();floorTargets[index].forEach(target=>floorBounds.union(new THREE.Box3().setFromObject(target)))
          const shellSize=shellBounds.getSize(new THREE.Vector3()),walkSize=floorBounds.isEmpty()?shellSize:floorBounds.getSize(new THREE.Vector3())
          walkBounds[index]={walkX:Math.max(.8,walkSize.x/2-.12),walkZ:Math.max(.8,walkSize.z/2-.12)}
          bathroomFloorY=Number.isFinite(measuredFloor)?measuredFloor:(floorBounds.isEmpty()?authoredFloorY:floorBounds.max.y)
          const fixtureBounds:THREE.Box3[]=[]
          model.traverse(object=>{if(!(object instanceof THREE.Mesh)||object.userData.surfaceType||object===source)return;if(/(Bath|Toilet|Sink|Shower|Plant)_0/i.test(object.name)){const bounds=new THREE.Box3().setFromObject(object);if(bounds.getSize(new THREE.Vector3()).y>.2)fixtureBounds.push(bounds)}})
          bathroomObstacles.splice(0,bathroomObstacles.length,...fixtureBounds)
          let spawn:{x:number;z:number;clearance:number}|null=null
          const walkArea=floorBounds.isEmpty()?shellBounds:floorBounds,walkCenter=walkArea.getCenter(new THREE.Vector3())
          const tubBounds=fixtureBounds.find(bounds=>{const dimensions=bounds.getSize(new THREE.Vector3());return dimensions.x>1.6&&dimensions.z>.65&&dimensions.z<1.4&&dimensions.y<1.1})
          for(let x=walkArea.min.x+.35;x<=walkArea.max.x-.35;x+=.15)for(let z=walkArea.min.z+.35;z<=walkArea.max.z-.35;z+=.15){
            const occupied=fixtureBounds.some(bounds=>x>bounds.min.x-.3&&x<bounds.max.x+.3&&z>bounds.min.z-.3&&z<bounds.max.z+.3&&bounds.max.y>bathroomFloorY+.1&&bounds.min.y<bathroomFloorY+1.8)
            if(occupied)continue
            const clearance=fixtureBounds.reduce((near,bounds)=>Math.min(near,Math.hypot(Math.max(bounds.min.x-x,0,x-bounds.max.x),Math.max(bounds.min.z-z,0,z-bounds.max.z))),1.5),centerDistance=Math.hypot(walkCenter.x-x,walkCenter.z-z)
            if(!spawn||clearance>spawn.clearance||clearance===spawn.clearance&&centerDistance<Math.hypot(walkCenter.x-spawn.x,walkCenter.z-spawn.z))spawn={x,z,clearance}
          }
          const preferredX=tubBounds?Math.min(walkArea.max.x-.4,tubBounds.max.x+.36):walkCenter.x,preferredZ=tubBounds?tubBounds.getCenter(new THREE.Vector3()).z+tubBounds.getSize(new THREE.Vector3()).z*.75:walkCenter.z-Math.min(2,walkSize.z*.28),preferredInBounds=preferredX>walkArea.min.x+.35&&preferredX<walkArea.max.x-.35&&preferredZ>walkArea.min.z+.35&&preferredZ<walkArea.max.z-.35
          const preferredBlocked=fixtureBounds.some(bounds=>preferredX>bounds.min.x-.3&&preferredX<bounds.max.x+.3&&preferredZ>bounds.min.z-.3&&preferredZ<bounds.max.z+.3&&bounds.max.y>bathroomFloorY+.1&&bounds.min.y<bathroomFloorY+1.8)
          const viewTarget=new THREE.Vector3(),mainFixtures:THREE.Vector3[]=[]
          model.traverse(object=>{if(object instanceof THREE.Mesh&&/(?:_Sink_0|_Shower_0)/i.test(object.name))mainFixtures.push(new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()))})
          if(mainFixtures.length)viewTarget.copy(mainFixtures.reduce((sum,point)=>sum.add(point),new THREE.Vector3()).multiplyScalar(1/mainFixtures.length));else viewTarget.copy(walkCenter)
          if(preferredInBounds&&!preferredBlocked)bathroomStart={x:preferredX,z:preferredZ,yaw:Math.atan2(-(viewTarget.x-preferredX),-(viewTarget.z-preferredZ))}
          else if(spawn) bathroomStart={x:spawn.x,z:spawn.z,yaw:Math.PI}
          floorPhysicalDimensions[index]={width:walkSize.x,depth:walkSize.z}
          if(import.meta.env.DEV)console.info('[Modern Bathroom fit]',{size:shellSize.toArray(),walkSize:walkSize.toArray(),floorY:bathroomFloorY,spawn:bathroomStart,surfaces:[...buckets.keys()]})
        }
      }
      if(index===3&&targets.length){
        const floorBounds=new THREE.Box3();targets.forEach(target=>floorBounds.union(new THREE.Box3().setFromObject(target)))
        const floorSize=floorBounds.getSize(new THREE.Vector3()),floorCenter=floorBounds.getCenter(new THREE.Vector3())
        if(import.meta.env.DEV)console.info('Measured kitchen fit:',{scale,modelSize:size.toArray(),floorSize:floorSize.toArray(),floorCenter:floorCenter.toArray()})
        floorPhysicalDimensions[index]={width:floorSize.x,depth:floorSize.z}
        walkBounds[index]={walkX:Math.max(.25,floorSize.x/2-.3),walkZ:Math.max(.25,floorSize.z/2-.3)}
        model.position.x-=floorCenter.x;model.position.z-=floorCenter.z-centres[index];group.updateMatrixWorld(true)
        floorBounds.makeEmpty();targets.forEach(target=>floorBounds.union(new THREE.Box3().setFromObject(target)))
        kitchenFloorY=floorBounds.max.y
        kitchenWalkTriangles.length=0
        for(const mesh of targets){
          mesh.updateWorldMatrix(true,false)
          const positions=mesh.geometry.getAttribute('position'),indices=mesh.geometry.index
          if(!indices)continue
          const a3=new THREE.Vector3(),b3=new THREE.Vector3(),c3=new THREE.Vector3()
          for(let i=0;i<indices.count;i+=3){
            a3.fromBufferAttribute(positions,indices.getX(i)).applyMatrix4(mesh.matrixWorld)
            b3.fromBufferAttribute(positions,indices.getX(i+1)).applyMatrix4(mesh.matrixWorld)
            c3.fromBufferAttribute(positions,indices.getX(i+2)).applyMatrix4(mesh.matrixWorld)
            const a=new THREE.Vector2(a3.x,a3.z),b=new THREE.Vector2(b3.x,b3.z),c=new THREE.Vector2(c3.x,c3.z)
            kitchenWalkTriangles.push({a,b,c,bounds:new THREE.Box2().setFromPoints([a,b,c])})
          }
        }

        const cookingObjects:THREE.Mesh[]=[]
        model.traverse(object=>{if(object instanceof THREE.Mesh&&!object.userData.surfaceType&&!object.name.startsWith('house_'))cookingObjects.push(object)})
        const floorArea=Math.max(.1,floorSize.x*floorSize.z),solids:{bounds:THREE.Box3}[]=[]
        for(const object of cookingObjects){
          const name=object.name.toLowerCase(),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),area=size.x*size.z
          if(!/(wood_|table_|oven|bar_|cooking[_ ]bench|seat_)/i.test(name)||size.y<.22||area>floorArea*.4)continue
          walkObstacles.push(bounds);walkObstacleNames.push(object.name);solids.push({bounds})
        }
        const targetBounds=new THREE.Box3(),targetObjects=cookingObjects.filter(object=>/(oven_|bar_bar|cooking[_ ]bench)/i.test(object.name))
        targetObjects.forEach(object=>targetBounds.union(new THREE.Box3().setFromObject(object)))
        if(targetBounds.isEmpty())targetBounds.copy(floorBounds)
        const target=targetBounds.getCenter(new THREE.Vector3()),minX=floorBounds.min.x+.55,maxX=floorBounds.max.x-.55,minZ=floorBounds.min.z+.55,maxZ=floorBounds.max.z-.55
        let best:{x:number;z:number;score:number}|null=null,bestSafe:{x:number;z:number;clearance:number}|null=null
        for(let x=minX;x<=maxX;x+=.25)for(let z=minZ;z<=maxZ;z+=.25){
          const occupied=solids.some(({bounds})=>x>bounds.min.x-.28&&x<bounds.max.x+.28&&z>bounds.min.z-.28&&z<bounds.max.z+.28&&bounds.max.y>kitchenFloorY+.12&&bounds.min.y<kitchenFloorY+1.85)
          if(occupied)continue
          const distance=Math.hypot(target.x-x,target.z-z)
          const blocked=solids.some(({bounds})=>!bounds.containsPoint(target)&&new THREE.Box3(new THREE.Vector3(Math.min(x,target.x),bounds.min.y,Math.min(z,target.z)),new THREE.Vector3(Math.max(x,target.x),bounds.max.y,Math.max(z,target.z))).intersectsBox(bounds))
          const clearance=solids.reduce((nearest,{bounds})=>Math.min(nearest,Math.hypot(Math.max(bounds.min.x-x,0,x-bounds.max.x),Math.max(bounds.min.z-z,0,z-bounds.max.z))),1)
          if(!bestSafe||clearance>bestSafe.clearance)bestSafe={x,z,clearance}
          if(distance<1.45||distance>4.5)continue
          const score=Math.abs(distance-2.6)*2+(blocked?4:0)-clearance*.35
          if(!best||score<best.score)best={x,z,score}
        }
        const spawn=best??bestSafe??{x:floorCenter.x,z:floorCenter.z}
        kitchenStart={x:spawn.x,z:spawn.z,yaw:Math.atan2(-(target.x-spawn.x),-(target.z-spawn.z))}
      }
      if(targets.length&&index!==0&&index!==1&&index!==4){targets.forEach(object=>{
        // Imported floors often have missing/degenerate UVs. Project stable UVs
        // from world X/Z so every backend texture is visible at a true scale.
        const source=object.geometry,geometry=source.clone(),position=geometry.getAttribute('position'),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),point=new THREE.Vector3(),uv=new Float32Array(position.count*2)
        for(let vertex=0;vertex<position.count;vertex++){point.fromBufferAttribute(position,vertex).applyMatrix4(object.matrixWorld);uv[vertex*2]=(point.x-bounds.min.x)/Math.max(size.x,.001);uv[vertex*2+1]=(point.z-bounds.min.z)/Math.max(size.z,.001)}
        geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));object.geometry=geometry;geometries.add(geometry);object.material=floorMaterial;object.receiveShadow=true;object.userData.floorRoom=index
      });floor.visible=false}

      if(index===3){
        floor.visible=false
        const kitchenFill=new THREE.PointLight('#fff0d7',3.7,8,2);kitchenFill.position.set(0,2.45,.4);group.add(kitchenFill)
        if(import.meta.env.DEV)console.info('[Cooking Club navigation]',{floorHeight:kitchenFloorY,floorSize:floorPhysicalDimensions[index],walkBoundary:walkBounds[index],walkTriangles:kitchenWalkTriangles.length,colliders:walkObstacleNames})
      }else if(index===4){
        const bathFill=new THREE.PointLight('#fff0df',2.2,7,2);bathFill.position.set(0,2.2,centres[index]);group.add(bathFill)
      }else if(index===0){
        setupModernLuxuryLivingRoom(group,model,authoredFloorY,floor,floorMaterial)
      }else if(index===1){
        setupRealisticModernBedroom(group,model,authoredFloorY,floor,floorMaterial,wallMaterials,wallMeshes)
      }else{
        const fill=new THREE.PointLight('#fff0d7',3.7,8,2);fill.position.set(0,2.45,.4);group.add(fill)
      }
      model.updateMatrixWorld(true)
      resolve()
    },undefined,error=>{if(disposed){resolve();return}if(attempt<2){window.setTimeout(()=>attemptLoad(attempt+1),1200*(attempt+1));return}console.error(`Could not load ${entry.label} after retries`,error);onAssetError?.(`${entry.label} could not be loaded. Check the model asset and try again.`);resolve()});attemptLoad(0)})
    modelLoads.push(loadModel)
  })
  // Load one room at a time. This avoids several large GLB/HDR responses
  // competing on the same HTTP/2 connection on hosted storefronts.
  void (async()=>{for(const index of [3,0,1,2]){if(disposed)break;await modelLoads[index]()}})()
  let bathroomLoad:Promise<void>|null=null
  const ensureBathroom=()=>bathroomLoad??(bathroomLoad=modelLoads[4]())
  function updateFloorMaterial(room:number){
    const material=floorMaterials[room]
    if(!material)return
    const tile=floorAppliedTiles[room]
    const isPolished=tile?.finish==='Polished'
    const isWood=tile?.family==='Wood'
    const factor=THREE.MathUtils.clamp(floorReflectionLevel,0,1)

    if(isPolished){
      material.roughness=THREE.MathUtils.lerp(0.85,0.25,factor)
      material.metalness=THREE.MathUtils.lerp(0.004,0.03,factor)
      material.envMapIntensity=THREE.MathUtils.lerp(0.05,0.65,factor)
    }else if(isWood){
      material.roughness=THREE.MathUtils.lerp(0.92,0.55,factor)
      material.metalness=THREE.MathUtils.lerp(0.002,0.015,factor)
      material.envMapIntensity=THREE.MathUtils.lerp(0.0,0.35,factor)
    }else{
      material.roughness=THREE.MathUtils.lerp(0.88,0.42,factor)
      material.metalness=THREE.MathUtils.lerp(0.002,0.02,factor)
      material.envMapIntensity=THREE.MathUtils.lerp(0.0,0.45,factor)
    }
    material.needsUpdate=true
  }
  function setFloorReflection(factor:number){
    floorReflectionLevel=THREE.MathUtils.clamp(factor,0,1)
    for(let r=0;r<interiors.length;r++)updateFloorMaterial(r)
  }
  function applyTile(room:number,tile:Tile){
    const material=floorMaterials[room],entry=interiors[room]
    if(!material||!entry)return
    floorAppliedTiles[room]=tile
    const request=++floorLoads[room]
    let {repeatX,repeatY}=getTileRepeats(room,tile)
    if(floorTargets[room].some(mesh=>mesh.userData.bathroomMetricUV)){
      const dimensions=tile.size.match(/(\d{2,4})\s*[x×]\s*(\d{2,4})/i),tileWidth=dimensions?Number(dimensions[1])/1000:tile.family==='Wood'?.45:.6,tileHeight=dimensions?Number(dimensions[2])/1000:tile.family==='Wood'?1.8:.6
      repeatX=1/tileWidth;repeatY=1/tileHeight
    }
    const is2x4=isSlab2x4(tile.size)
    const groutBump=tile.family!=='Wood'?getGroutBump(is2x4,repeatX,repeatY):null
    const scan={diffuse:tile.image,normal:tile.normal,roughness:tile.roughness}
    void Promise.all([loadTexture(scan.diffuse,repeatX,repeatY,true),scan.normal?loadTexture(scan.normal,repeatX,repeatY):Promise.resolve(null),scan.roughness?loadTexture(scan.roughness,repeatX,repeatY):Promise.resolve(null)]).then(([texture,normal,roughness])=>{
      if(disposed||request!==floorLoads[room]){texture.dispose();normal?.dispose();roughness?.dispose();return}
      floorMaps[room].forEach(map=>map.dispose())
      floorMaps[room]=[texture,...(normal?[normal]:[]),...(roughness?[roughness]:[])]
      floorMeshes[room].visible=floorTargets[room].length===0||room===0||room===1
      material.color.set('#ffffff');material.map=texture;material.normalMap=normal;material.roughnessMap=roughness
      if(!normal&&groutBump){material.bumpMap=groutBump;material.bumpScale=0.0035}else if(normal){material.bumpMap=null}
      updateFloorMaterial(room)
      if(normal)material.normalScale.set(.62,.62)
    }).catch(error=>{console.error(`Could not load tile ${tile.id}`,error);onAssetError?.(`${tile.name} could not be loaded on the floor.`)})
  }
  function setWallStyle(wall:number,style:WallStyle){
    const material=wallMaterials[wall],mesh=bathroomSurfaceMap.get(wall)?.[0]??wallMeshes.find(item=>item.userData.wallId===wall&&item.userData.surfaceType==='wall')??wallMeshes.find(item=>item.userData.wallId===wall)
    // Note: we intentionally do NOT skip invisible meshes — the material update
    // must happen so that the style is live the moment the wall becomes visible.
    if(!material||!mesh||!/^#[\da-fA-F]{6}$/.test(style.color))return
    const request=++wallLoads[wall]
    wallMaps[wall]?.dispose();wallMaps[wall]=undefined;wallDetailMaps[wall].forEach(map=>map.dispose());wallDetailMaps[wall]=[]
    material.map=null;material.bumpMap=null;material.normalMap=null;material.roughnessMap=null;material.color.set(style.color);material.roughness=.84;material.opacity=1;material.transparent=false;material.depthWrite=true;material.needsUpdate=true

    if(!style.image&&style.design!=='paint'){
      const texture=makeWallPattern(style,mesh.userData.repeat);wallMaps[wall]=texture
      material.map=texture;material.bumpMap=texture;material.bumpScale=.005;material.roughness=.72;material.needsUpdate=true;return
    }
    if(!style.image){
      const bump=makeWallPattern(style,mesh.userData.repeat);wallMaps[wall]=bump
      material.bumpMap=bump;material.bumpScale=.003;material.roughness=.86;material.needsUpdate=true;return
    }
    const tileDimensions=style.size?.match(/(\d{2,4})\s*[\u0078\u00D7]\s*(\d{2,4})/i),sideA=tileDimensions?Number(tileDimensions[1])/1000:.6,sideB=tileDimensions?Number(tileDimensions[2])/1000:.6
    const tileWidth=style.orientation==='Portrait'?Math.min(sideA,sideB):Math.max(sideA,sideB),tileHeight=style.orientation==='Portrait'?Math.max(sideA,sideB):Math.min(sideA,sideB),repeatX=mesh.userData.bathroomMetricUV?(style.orientation==='Portrait'?1/tileHeight:1/tileWidth):mesh.userData.physicalUV?1:(style.repeat??mesh.userData.repeat),repeatY=mesh.userData.bathroomMetricUV?(style.orientation==='Portrait'?1/tileWidth:1/tileHeight):mesh.userData.physicalUV?1:(style.repeat??mesh.userData.repeat)
    const orientation=style.orientation??'Landscape'
    void Promise.all([loadTexture(style.image,repeatX,repeatY,true,orientation),style.normal?loadTexture(style.normal,repeatX,repeatY,false,orientation):Promise.resolve(null),style.roughness?loadTexture(style.roughness,repeatX,repeatY,false,orientation):Promise.resolve(null)]).then(([texture,normal,roughness])=>{
      if(disposed||request!==wallLoads[wall]){texture.dispose();normal?.dispose();roughness?.dispose();return}
      wallMaps[wall]?.dispose();wallDetailMaps[wall].forEach(map=>map.dispose())
      wallMaps[wall]=texture;wallDetailMaps[wall]=[...(normal?[normal]:[]),...(roughness?[roughness]:[])]
      for(const map of [texture,normal,roughness])if(map){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeatX,repeatY);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())}
      texture.colorSpace=THREE.SRGBColorSpace
      material.color.set('#ffffff');material.map=texture;material.bumpMap=normal?null:texture;material.bumpScale=.006;material.normalMap=normal;material.roughnessMap=roughness;material.roughness=.62;material.opacity=1;material.transparent=false;material.depthWrite=true;material.needsUpdate=true
      if(normal)material.normalScale.set(.5,.5)
    }).catch(error=>{console.error(`Could not load wall tile for wall ${wall}`,error);onAssetError?.(`The selected wall tile could not be loaded.`)})
  }
  function pickSurface(raycaster:THREE.Raycaster){
    const floors=floorTargets.flat().concat(floorMeshes.filter(mesh=>mesh.visible))
    const hit=raycaster.intersectObjects([...wallMeshes.filter(mesh=>mesh.visible),...floors],false)[0]
    if(hit?.object.userData.surfaceType==='backsplash')return {kind:'backsplash' as const,id:hit.object.userData.wallId as number}
    if(hit?.object.userData.floor)return {kind:'floor' as const,id:hit.object.userData.floorRoom as number}
    if(typeof hit?.object.userData.wallId==='number')return {kind:'wall' as const,id:hit.object.userData.wallId as number}
    const floorRoom=hit?.object.userData.floorRoom??hit?.object.userData.room
    return typeof floorRoom==='number'?{kind:'floor' as const,id:floorRoom as number}:null
  }
  function pointInKitchenFloor(x:number,z:number){return kitchenWalkTriangles.some(({a,b,c,bounds})=>{
    if(x<bounds.min.x-1e-5||x>bounds.max.x+1e-5||z<bounds.min.y-1e-5||z>bounds.max.y+1e-5)return false
    const abx=b.x-a.x,abz=b.y-a.y,bcx=c.x-b.x,bcz=c.y-b.y,cax=a.x-c.x,caz=a.y-c.y
    const apx=x-a.x,apz=z-a.y,bpx=x-b.x,bpz=z-b.y,cpx=x-c.x,cpz=z-c.y
    const d1=abx*apz-abz*apx,d2=bcx*bpz-bcz*bpx,d3=cax*cpz-caz*cpx
    return (d1>=-1e-5&&d2>=-1e-5&&d3>=-1e-5)||(d1<=1e-5&&d2<=1e-5&&d3<=1e-5)
  })}
  function canStand(x:number,z:number){
    const room=importedRoomAt(x,z),bounds=walkBounds[room]
    if(room!==3){
      if(Math.abs(x)>=bounds.walkX||Math.abs(z-centres[room])>=bounds.walkZ)return false
      if(room===4&&bathroomObstacles.some(box=>box.max.y>bathroomFloorY+.12&&box.min.y<bathroomFloorY+1.85&&x>box.min.x-.22&&x<box.max.x+.22&&z>box.min.z-.22&&z<box.max.z+.22))return false
      return true
    }
    if(!kitchenWalkTriangles.length){if(Math.abs(x)>=bounds.walkX||Math.abs(z-centres[room])>=bounds.walkZ)return false}
    else if(![[x,z],[x-.22,z],[x+.22,z],[x,z-.22],[x,z+.22]].every(([px,pz])=>pointInKitchenFloor(px!,pz!)))return false
    const radiusSq=.22*.22
    return !walkObstacles.some(box=>{
      if(box.max.y<=kitchenFloorY+.12||box.min.y>=kitchenFloorY+1.85)return false
      const nearestX=THREE.MathUtils.clamp(x,box.min.x,box.max.x),nearestZ=THREE.MathUtils.clamp(z,box.min.z,box.max.z)
      return (x-nearestX)**2+(z-nearestZ)**2<radiusSq
    })
  }
  function dispose(){disposed=true;geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());cachedTextures.forEach(texture=>texture.dispose());wallMaps.forEach(texture=>texture?.dispose());wallDetailMaps.forEach(maps=>maps.forEach(texture=>texture.dispose()));floorMeshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose()});wallMeshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose()});environment?.dispose()}
  function getBathroomPreviewView(surface:'Wall'|'Floor'){
    const floorBounds=new THREE.Box3();floorTargets[4].forEach(mesh=>floorBounds.union(new THREE.Box3().setFromObject(mesh)))
    if(floorBounds.isEmpty())return bathroomStart?{...bathroomStart,pitch:0,cameraHeight:1.65}:null
    if(surface==='Floor'){
      const center=floorBounds.getCenter(new THREE.Vector3()),size=floorBounds.getSize(new THREE.Vector3()),cameraHeight=THREE.MathUtils.clamp(Math.max(size.x,size.z)*.52,2,2.8),z=center.z+Math.min(size.z*.2,.7),horizontal=Math.abs(z-center.z)
      return {x:center.x,z,yaw:0,pitch:-Math.atan2(cameraHeight,horizontal),cameraHeight}
    }
    const walls=[...bathroomSurfaceMap.entries()].filter(([id])=>id>=16&&id<=19).flatMap(([id,meshes])=>meshes.map(mesh=>({id,mesh,bounds:new THREE.Box3().setFromObject(mesh)}))).filter(item=>!item.bounds.isEmpty()).sort((a,b)=>{
      const aSize=a.bounds.getSize(new THREE.Vector3()),bSize=b.bounds.getSize(new THREE.Vector3())
      return bSize.x*bSize.y+bSize.z*bSize.y-(aSize.x*aSize.y+aSize.z*aSize.y)
    })
    const chosen=walls[0]
    if(!chosen)return bathroomStart?{...bathroomStart,pitch:0,cameraHeight:1.65}:null
    const target=chosen.bounds.getCenter(new THREE.Vector3()),roomCenter=floorBounds.getCenter(new THREE.Vector3()),inward=new THREE.Vector3(roomCenter.x-target.x,0,roomCenter.z-target.z).normalize()
    if(inward.lengthSq()<.5)inward.set(0,0,-1)
    const horizontalDistance=THREE.MathUtils.clamp(Math.min(chosen.bounds.getSize(new THREE.Vector3()).x,chosen.bounds.getSize(new THREE.Vector3()).z)*.38,1.25,2.1)
    const x=target.x+inward.x*horizontalDistance,z=target.z+inward.z*horizontalDistance,dx=target.x-x,dz=target.z-z,dy=target.y-(bathroomFloorY+1.65),horizontal=Math.hypot(dx,dz)
    return {x,z,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,horizontal),cameraHeight:1.65,wallId:chosen.id}
  }
  return {scene,applyTile,setWallStyle,pickSurface,canStand,floorMeshes,setFloorReflection,loadRoom:(room:number)=>room===4?ensureBathroom():modelLoads[room](),getKitchenStart:()=>kitchenStart,getKitchenFloorHeight:()=>kitchenFloorY,getBathroomStart:()=>bathroomStart,getBathroomPreviewView,getBathroomFloorHeight:()=>bathroomFloorY,getKitchenNavigation:()=>({floorHeight:kitchenFloorY,floorSize:floorPhysicalDimensions[3],walkBoundary:walkBounds[3],colliders:walkObstacleNames}),dispose}
}
