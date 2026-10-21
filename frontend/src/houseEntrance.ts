import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export type HouseEntranceScene = {
  root: THREE.Group
  floors: THREE.Mesh[]
  walls: THREE.Mesh[]
  obstacles: THREE.Box3[]
  walkAreas: THREE.Box2[]
  materials: { pillarStone: THREE.MeshStandardMaterial; doorWood: THREE.MeshStandardMaterial }
}

export const HOUSE_ENTRANCE_DIMENSIONS = {
  hall: { width: 16, depth: 10, height: 3.35 },
  parking: { width: 8, depth: 9, height: 3.35 },
  entrance: { width: 8, depth: 9, height: 3.35 },
  portico: { width: 6.4, depth: 4, height: 3.35 },
  wallThickness: .2,
} as const

function surfaceTexture(kind:'plaster'|'limestone'|'timber'|'asphalt'|'grass',base:string,repeat:number){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256
  const context=canvas.getContext('2d',{willReadFrequently:true})!
  context.fillStyle=base;context.fillRect(0,0,256,256)
  let seed=kind==='limestone'?173:kind==='timber'?433:kind==='grass'?791:kind==='asphalt'?293:101
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  const pixels=context.getImageData(0,0,256,256),data=pixels.data
  for(let i=0;i<data.length;i+=4){const n=(random()-.5)*(kind==='plaster'?8:kind==='asphalt'?22:14);data[i]=THREE.MathUtils.clamp(data[i]+n,0,255);data[i+1]=THREE.MathUtils.clamp(data[i+1]+n,0,255);data[i+2]=THREE.MathUtils.clamp(data[i+2]+n,0,255)}
  context.putImageData(pixels,0,0)
  if(kind==='limestone'){
    context.strokeStyle='rgba(66,57,46,.36)';context.lineWidth=3
    for(const y of [0,84,170,255]){context.beginPath();context.moveTo(0,y);context.lineTo(256,y);context.stroke()}
    for(const [x,y] of [[0,0],[128,84],[70,170],[200,0],[8,170],[155,255]]){context.beginPath();context.moveTo(x,y);context.lineTo(x,y+84);context.stroke()}
    context.strokeStyle='rgba(255,250,240,.25)';context.lineWidth=1
    for(let i=0;i<500;i++){const x=random()*256,y=random()*256;context.beginPath();context.moveTo(x,y);context.lineTo(x+(random()-.5)*18,y+(random()-.5)*8);context.stroke()}
  } else if(kind==='timber'){
    for(let i=0;i<75;i++){const y=random()*256;context.strokeStyle=`rgba(${random()>.5?'255,220,170':'35,20,10'},${.025+random()*.11})`;context.lineWidth=.5+random()*2;context.beginPath();context.moveTo(0,y);context.bezierCurveTo(70,y-5,180,y+5,256,y+(random()-.5)*8);context.stroke()}
    context.strokeStyle='rgba(42,24,14,.16)';context.lineWidth=1;for(const y of [0,255]){context.beginPath();context.moveTo(0,y);context.lineTo(256,y);context.stroke()}
  } else if(kind==='grass'||kind==='asphalt'){
    for(let i=0;i<5200;i++){const c=kind==='grass'?(random()>.5?'rgba(212,207,131,.14)':'rgba(20,50,24,.18)'):'rgba(15,18,20,.20)';context.fillStyle=c;const x=random()*256,y=random()*256,s=kind==='grass'?1+random()*2:1+random();context.fillRect(x,y,s,s)}
  } else {
    context.strokeStyle='rgba(115,98,74,.04)';context.lineWidth=1
    for(let i=0;i<240;i++){const x=random()*256,y=random()*256;context.beginPath();context.moveTo(x,y);context.lineTo(x+(random()-.5)*24,y+(random()-.5)*10);context.stroke()}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=4
  return texture
}

export function canStandInHouseEntrance(x: number, z: number, walkAreas: THREE.Box2[], obstacles: THREE.Box3[]) {
  if(!walkAreas.some(area=>area.containsPoint(new THREE.Vector2(x,z))))return false
  return !obstacles.some(box=>box.max.y>.14&&box.min.y<1.9&&x>box.min.x-.22&&x<box.max.x+.22&&z>box.min.z-.22&&z<box.max.z+.22)
}

/** A modular, meter-scaled concept residence. Front faces +Z. */
export function createHouseEntrance(): HouseEntranceScene {
  const root = new THREE.Group()
  root.name = 'Modern House Entrance / procedural architecture'
  const floors: THREE.Mesh[] = [], walls: THREE.Mesh[] = [], obstacles: THREE.Box3[] = [], walkAreas: THREE.Box2[] = []
  const limestoneMap=surfaceTexture('limestone','#b1a592',1),limestoneBump=limestoneMap.clone();limestoneBump.colorSpace=THREE.NoColorSpace
  const mats = {
    plaster: new THREE.MeshStandardMaterial({ color: '#f0ece4', map:surfaceTexture('plaster','#f0ece4',3), roughness: .88, side: THREE.DoubleSide }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f4f0e9', roughness: .92, side: THREE.DoubleSide }),
    soffit: new THREE.MeshStandardMaterial({ color: '#76543a', map:surfaceTexture('timber','#76543a',1), roughness:.68 }),
    stone: new THREE.MeshStandardMaterial({ color: '#b1a592', map:limestoneMap, bumpMap:limestoneBump, roughness: .9, bumpScale:.018 }),
    pillarStone: new THREE.MeshStandardMaterial({ color: '#c1b9ab', map:limestoneMap.clone(), bumpMap:limestoneBump.clone(), roughness: .84, bumpScale:.014 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: '#d2c8b7', map:surfaceTexture('limestone','#d2c8b7',1), roughness: .82 }),
    wood: new THREE.MeshStandardMaterial({ color: '#80583a', map:surfaceTexture('timber','#80583a',1), roughness: .48, metalness:.01 }),
    doorWood: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .42, metalness:.01, clearcoat:.12, clearcoatRoughness:.48 }),
    woodLight: new THREE.MeshStandardMaterial({ color: '#a7805b', map:surfaceTexture('timber','#a7805b',1), roughness: .55 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#c7dce0', roughness: .12, metalness: .03, transmission: .28, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide, envMapIntensity:.7 }),
    dark: new THREE.MeshStandardMaterial({ color: '#303a3d', roughness: .38, metalness: .45 }),
    grass: new THREE.MeshStandardMaterial({ color: '#6f8051', map:surfaceTexture('grass','#78865b',.4), roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({color:'#424544',map:surfaceTexture('asphalt','#4a4c4a',12),roughness:.94}),
    leaf: new THREE.MeshStandardMaterial({ color:'#ffffff', roughness:.88, transparent:true, alphaTest:.3, side:THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: '#81965b', roughness: .9 }),
    soil: new THREE.MeshStandardMaterial({ color: '#44372a', roughness: 1 }),
    linen: new THREE.MeshStandardMaterial({ color: '#c5b8a6', roughness: .94 }),
    cushion: new THREE.MeshStandardMaterial({ color: '#ded3c3', roughness: .98 }),
    car: new THREE.MeshStandardMaterial({ color: '#a9b4b6', metalness: .72, roughness: .22, envMapIntensity:1.15 }),
    tire: new THREE.MeshStandardMaterial({ color: '#191b1b', roughness: .78 }),
    chrome: new THREE.MeshStandardMaterial({color:'#b8c0c0',metalness:.92,roughness:.2}),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff1c8', emissive: '#ffbd64', emissiveIntensity: .7, roughness: .22 }),
  }
  const leafCanvas=document.createElement('canvas');leafCanvas.width=128;leafCanvas.height=256
  const leafContext=leafCanvas.getContext('2d')!,leafGradient=leafContext.createLinearGradient(30,10,96,246)
  leafGradient.addColorStop(0,'#879c53');leafGradient.addColorStop(.5,'#537b3c');leafGradient.addColorStop(1,'#304f2d')
  leafContext.beginPath();leafContext.moveTo(64,4);leafContext.bezierCurveTo(112,52,126,172,64,252);leafContext.bezierCurveTo(2,172,16,52,64,4);leafContext.fillStyle=leafGradient;leafContext.fill()
  leafContext.strokeStyle='rgba(218,221,158,.7)';leafContext.lineWidth=2;leafContext.beginPath();leafContext.moveTo(64,12);leafContext.lineTo(64,246);leafContext.stroke()
  for(const y of [42,72,102,132,162,192,218])for(const side of [-1,1]){leafContext.strokeStyle='rgba(220,224,160,.3)';leafContext.lineWidth=1;leafContext.beginPath();leafContext.moveTo(64,y);leafContext.quadraticCurveTo(64+side*15,y-8,64+side*25,y-21);leafContext.stroke()}
  const leafMap=new THREE.CanvasTexture(leafCanvas);leafMap.colorSpace=THREE.SRGBColorSpace;mats.leaf.map=leafMap
  // A restrained sky card gives the open portico and garden a daylight backdrop.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256
  const skyContext=skyCanvas.getContext('2d')!,skyGradient=skyContext.createLinearGradient(0,0,0,256)
  skyGradient.addColorStop(0,'#8ab8d2');skyGradient.addColorStop(.62,'#c2d2ce');skyGradient.addColorStop(1,'#e4d9c5');skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,512,256)
  for(let cloud=0;cloud<24;cloud++){const x=(cloud*97)%512,y=35+(cloud*53)%115,g=skyContext.createRadialGradient(x,y,4,x,y,35+(cloud%3)*13);g.addColorStop(0,'rgba(255,255,255,.24)');g.addColorStop(1,'rgba(255,255,255,0)');skyContext.fillStyle=g;skyContext.fillRect(x-55,y-40,110,80)}
  const skyMap=new THREE.CanvasTexture(skyCanvas);skyMap.colorSpace=THREE.SRGBColorSpace
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(120,60),new THREE.MeshBasicMaterial({map:skyMap,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));sky.position.set(0,16,-23);sky.name='House entrance distant sky backdrop';sky.renderOrder=-2;root.add(sky)
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3, target = root, cast = false) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(position); mesh.castShadow = cast; mesh.receiveShadow = true; target.add(mesh); return mesh
  }
  // The global showroom sun is aimed at room 01 near world origin. A local
  // exterior key light gives room 06 correctly framed daylight and shadows.
  const daylight=new THREE.DirectionalLight('#fff3df',2.35)
  daylight.position.set(-8,14,15);daylight.target.position.set(0,0,3);daylight.castShadow=true
  daylight.shadow.mapSize.set(2048,2048);daylight.shadow.camera.near=.5;daylight.shadow.camera.far=48
  daylight.shadow.camera.left=-19;daylight.shadow.camera.right=19;daylight.shadow.camera.top=24;daylight.shadow.camera.bottom=-19
  daylight.shadow.bias=-.00012;daylight.shadow.normalBias=.018;daylight.shadow.radius=4
  root.add(daylight,daylight.target)
  root.add(new THREE.HemisphereLight('#dbe9f3','#756a4c',.62))
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, target = root, collision = false, cast = false) => {
    const mesh = add(new THREE.BoxGeometry(w, h, d), material, new THREE.Vector3(x, y, z), target, cast)
    if (collision) { target.updateMatrixWorld(true);mesh.updateMatrixWorld(true);obstacles.push(new THREE.Box3().setFromObject(mesh)) }
    return mesh
  }
  const floor = (w: number, d: number, x: number, z: number, material: THREE.Material, room = true, level = .04) => {
    const geo = new THREE.PlaneGeometry(w, d), pos = geo.getAttribute('position'), uv = new Float32Array(pos.count * 2)
    for (let i=0;i<pos.count;i++) { uv[i*2] = pos.getX(i) + x; uv[i*2+1] = pos.getY(i) + z }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    const mesh = add(geo, material, new THREE.Vector3(x, level, z)); mesh.rotation.x = -Math.PI/2
    mesh.userData.floor = true; mesh.userData.floorRoom = 5; mesh.userData.room = 5; mesh.userData.physicalUV = true
    if (room) { floors.push(mesh); walkAreas.push(new THREE.Box2(new THREE.Vector2(x-w/2,z-d/2),new THREE.Vector2(x+w/2,z+d/2))) }
    return mesh
  }
  const wallSurface = (side: number, w: number, h: number, x: number, y: number, z: number, rotationY: number) => {
    const geometry = new THREE.PlaneGeometry(w,h), p = geometry.getAttribute('position'), uv = new Float32Array(p.count*2)
    for (let i=0;i<p.count;i++) {
      const point = new THREE.Vector3(p.getX(i),p.getY(i),0).applyAxisAngle(new THREE.Vector3(0,1,0),rotationY).add(new THREE.Vector3(x,y,z))
      uv[i*2] = Math.abs(Math.cos(rotationY))>.5?point.x:point.z; uv[i*2+1] = point.y
    }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2))
    const mesh=add(geometry,mats.plaster,new THREE.Vector3(x,y,z));mesh.rotation.y=rotationY
    mesh.userData.wallId=24+side;mesh.userData.repeat=1;mesh.userData.bathroomMetricUV=true;mesh.userData.houseEntranceWall=true
    walls.push(mesh);return mesh
  }
  const structuralWall = (side:number,w:number,h:number,x:number,y:number,z:number,depth:number,rotationY:number) => {
    const body=add(new THREE.BoxGeometry(w,h,depth),mats.plaster,new THREE.Vector3(x,y,z),root,true);body.rotation.y=rotationY
    const halfX=(Math.abs(Math.cos(rotationY))*w+Math.abs(Math.sin(rotationY))*depth)/2,halfZ=(Math.abs(Math.sin(rotationY))*w+Math.abs(Math.cos(rotationY))*depth)/2
    obstacles.push(new THREE.Box3(new THREE.Vector3(x-halfX,y-h/2,z-halfZ),new THREE.Vector3(x+halfX,y+h/2,z+halfZ)))
    const faceRotation=side===3?rotationY+Math.PI:rotationY
    for(const sign of [-1,1])wallSurface(side,w,h,x+Math.sin(faceRotation)*depth*.51*sign,y,z+Math.cos(faceRotation)*depth*.51*sign,sign===1?faceRotation:faceRotation+Math.PI)
  }

  // Soft landscaped apron and front approach. It is outside the tile target set.
  floor(100,100,0,0,mats.grass,false,-.18)
  floor(5.6,7,4,14.7,mats.stoneLight,false,.06)
  floor(3.1,14,4,20.7,mats.stoneLight,false,.055)
  floor(6.2,4,-4,16.8,mats.asphalt,false,.035)
  box(34,.75,.22,0,.36,-12.05,mats.stone,root,true)
  // Hall, parking, and entrance share a single level; portico steps rise gently.
  floor(HOUSE_ENTRANCE_DIMENSIONS.hall.width,HOUSE_ENTRANCE_DIMENSIONS.hall.depth,0,-4,mats.plaster)
  const parkingSurface=floor(HOUSE_ENTRANCE_DIMENSIONS.parking.width,HOUSE_ENTRANCE_DIMENSIONS.parking.depth,-4,5,mats.asphalt,false,.055)
  parkingSurface.name='House entrance / separate parking paving';parkingSurface.userData.parkingSurface=true
  walkAreas.push(new THREE.Box2(new THREE.Vector2(-8, .5),new THREE.Vector2(0,9.5)))
  floor(HOUSE_ENTRANCE_DIMENSIONS.entrance.width,HOUSE_ENTRANCE_DIMENSIONS.entrance.depth,4,5,mats.plaster)
  floor(HOUSE_ENTRANCE_DIMENSIONS.portico.width,HOUSE_ENTRANCE_DIMENSIONS.portico.depth,4,11,mats.plaster)
  box(HOUSE_ENTRANCE_DIMENSIONS.hall.width,.24,HOUSE_ENTRANCE_DIMENSIONS.hall.depth,0,-.08,-4,mats.stone)
  box(HOUSE_ENTRANCE_DIMENSIONS.parking.width,.12,HOUSE_ENTRANCE_DIMENSIONS.parking.depth,-4,-.08,5,mats.dark)
  box(HOUSE_ENTRANCE_DIMENSIONS.entrance.width,.24,HOUSE_ENTRANCE_DIMENSIONS.entrance.depth,4,-.08,5,mats.stone)
  box(HOUSE_ENTRANCE_DIMENSIONS.portico.width,.24,HOUSE_ENTRANCE_DIMENSIONS.portico.depth,4,-.08,11,mats.stone)
  floor(6.8,1.35,4,13.35,mats.stoneLight,false,.16)
  box(6.8,.16,1.35,4,.08,13.35,mats.stoneLight)
  floor(7.4,.55,4,14.25,mats.stone,false,.08)
  box(7.4,.16,.55,4,0,14.25,mats.stone)
  walkAreas.push(new THREE.Box2(new THREE.Vector2(2.3,13.2),new THREE.Vector2(5.7,28)))
  // Dark separate parking paving, with an inset kerb and subtle bay lines.
  box(8.12,.12,9.12,-4,-.035,5,mats.dark)
  for(const x of [-7.62,-.38])box(.045,.009,8.65,x,.054,5,new THREE.MeshStandardMaterial({color:'#b8b2a6',roughness:.86}),root,false)
  // Exterior shell, with segmented openings for two broad windows and the front door.
  structuralWall(0,18,3.35,-8,1.68,0,.2,Math.PI/2)
  structuralWall(1,4.625,3.35,8,1.68,-6.6875,.2,-Math.PI/2)
  structuralWall(1,6.6,3.35,8,1.68,.475,.2,-Math.PI/2)
  structuralWall(1,3.775,3.35,8,1.68,7.1125,.2,-Math.PI/2)
  structuralWall(2,2.825,3.35,-6.5875,1.68,-9,.2,0)
  structuralWall(2,10.825,3.35,2.5875,1.68,-9,.2,0)
  structuralWall(2,2.35,.71,-4,2.995,-9,.2,0)
  structuralWall(2,2.35,1.36,-4,.68,-9,.2,0)
  for(const z of [-3.6,4.5]){
    structuralWall(1,1.55,1.375,8,.6875,z,.2,-Math.PI/2)
    structuralWall(1,1.55,.625,8,3.0375,z,.2,-Math.PI/2)
  }
  structuralWall(3,3.1,3.35,1.55,1.68,9,.2,0)
  structuralWall(3,3.1,3.35,6.45,1.68,9,.2,0)
  structuralWall(3,1.8,1.15,4,2.78,9,.2,0)
  structuralWall(3,1.8,.08,4,.04,9,.2,0)
  // Partition between hall and the two front zones; a framed door connects hall to entrance.
  structuralWall(4,2.8,3.2,-6.6,1.64,1,.18,0)
  structuralWall(4,7.45,3.2,-.325,1.64,1,.18,0)
  structuralWall(4,2.75,3.2,6.625,1.64,1,.18,0)
  structuralWall(4,.625,3.2,4.9375,1.64,1,.18,0)
  structuralWall(4,1.25,.95,4,2.72,1,.18,0)
  structuralWall(4,1.25,.08,4,.04,1,.18,0)
  structuralWall(5,8,3.2,0,1.62,5,.18,Math.PI/2)
  // Continuous ceiling/roof over the indoor rooms and sheltered parking.
  box(16,.18,10,0,3.42,-4,mats.ceiling)
  box(8,.18,9,-4,3.42,5,mats.ceiling)
  box(8,.18,9,4,3.42,5,mats.ceiling)
  box(7.3,.32,5.5,4,3.46,10.9,mats.ceiling)

  // Windows: real inset panes, outer frames, sills, and a central mullion.
  const makeWindow=(x:number,y:number,z:number,w:number,h:number,rot:number)=>{
    const pane=add(new THREE.PlaneGeometry(w,h),mats.glass,new THREE.Vector3(x,y,z));pane.rotation.y=rot;pane.userData.environmentFixture=true
    const frameMat=mats.dark,th=.075
    for(const sx of [-1,1])box(th,h+.16,.12,x+sx*w/2,y,z,frameMat)
    for(const sy of [-1,1])box(w+.14,th,.12,x,y+sy*h/2,z,frameMat)
    box(.045,h,.13,x,y,z,frameMat)
  }
  makeWindow(-4,2,-8.87,2.35,1.28,0)
  makeWindow(7.87,2.05,-3.6,1.55,1.35,Math.PI/2)
  makeWindow(7.87,2.05,4.5,1.45,1.3,Math.PI/2)

  // Timber interior and entrance doors with visible rails, panels, and handles.
  const makeDoor=(x:number,z:number,yaw:number,hinge:number,frameHalfWidth=.9)=>{
    box(.13,2.45,.24,x-frameHalfWidth,1.225,z,mats.woodLight)
    box(.13,2.45,.24,x+frameHalfWidth,1.225,z,mats.woodLight)
    box(frameHalfWidth*2+.12,.15,.24,x,2.52,z,mats.woodLight)
    const door=new THREE.Group();door.position.set(hinge,0,z);door.rotation.y=yaw;root.add(door)
    box(1.2,2.3,.11,x-hinge,1.2,0,mats.doorWood,door)
    for(const yy of [.58,1.58]){
      box(.86,.66,.028,x-hinge,yy,.069,mats.woodLight,door)
      box(.78,.58,.026,x-hinge,yy,.088,mats.doorWood,door)
    }
    for(const yy of [.32,1.06,2.02]){
      const hingePlate=box(.075,.19,.035,x-hinge-.53,yy,.076,mats.chrome,door);hingePlate.castShadow=false
    }
    const handle=new THREE.Mesh(new RoundedBoxGeometry(.055,.42,.06,3,.02),mats.chrome);handle.position.set(x-hinge+.42,1.18,.11);door.add(handle)
    box(.13,.13,.025,x-hinge+.42,1.18,.11,mats.chrome,door)
    const knob=add(new THREE.SphereGeometry(.045,16,12),mats.lamp,new THREE.Vector3(x-hinge+.42,1.1,.14),door)
    door.userData.door=true
    return knob
  }
  makeDoor(4,1,.12,3.4)
  makeDoor(4,9,-.72,3.4)
  // A small service door from hall to the covered parking.
  makeDoor(-4.6,1,0,-5.2,.6)

  // Continuous interior skirting hides the floor-to-wall join and grounds the plaster shell.
  const skirting=new THREE.MeshStandardMaterial({color:'#d5cabb',roughness:.72})
  for(const z of [-8.82,8.82])box(15.55,.12,.045,0,.14,z,skirting)
  for(const x of [-7.82,7.82])box(.045,.12,17.55,x,.14,0,skirting)

  // Two square, stone-faced porch columns with individual ashlar blocks and a plinth.
  for(const x of [1,7]){
    box(.82,.22,.82,x,.14,11.9,mats.stoneLight,root,true)
    box(.66,2.78,.66,x,1.64,11.9,mats.pillarStone,root,true,true)
    box(.78,.12,.78,x,3.05,11.9,mats.stoneLight,root,false,true)
    box(.96,.2,.96,x,3.19,11.9,mats.stoneLight,root,false,true)
    for(const y of [.28,2.98])box(.69,.025,.69,x,y,11.9,new THREE.MeshStandardMaterial({color:'#756b5d',roughness:.92}))
    const fixture=box(.12,.34,.055,x+(x<4?-.43:.43),2.12,11.5,mats.dark)
    box(.07,.22,.035,fixture.position.x,2.12,11.465,mats.lamp)
    const light=new THREE.PointLight('#ffedcc',.45,2.8,2);light.position.set(fixture.position.x,2.12,11.3);root.add(light)
  }
  // A modest open front roof over the portico is held by those columns.
  box(7.8,.34,5.5,4,3.48,10.8,mats.ceiling,root,false,true)
  box(7.96,.10,5.64,4,3.265,10.8,mats.stoneLight,root,false,true)
  box(7.45,.045,5.18,4,3.29,10.8,mats.soffit)
  for(let i=0;i<19;i++)box(.018,.012,5.02,.42+i*.395,3.263,10.8,mats.woodLight)

  // Living hall furniture and TV wall.
  box(3.2,.43,1.05,-3.2,.48,-3,mats.linen,root,true)
  box(.28,.82,1.18,-4.67,.66,-3,mats.linen,root,true)
  for(const z of [-3.45,-2.55])box(.16,.38,.48,-3.2,.8,z,mats.cushion)
  box(1.25,.34,.78,-3.2,.33,-.75,mats.woodLight,root,true)
  for(const x of [-3.65,-2.75])box(.07,.28,.07,x,.14,-.75,mats.wood)
  box(2.5,.48,.16,-4.2,1.9,-8.78,mats.wood)
  box(1.7,.88,.075,-4.2,2.61,-8.77,mats.dark)
  box(1.57,.73,.025,-4.2,2.61,-8.72,new THREE.MeshBasicMaterial({color:'#202c31'}))
  const vase=add(new THREE.CylinderGeometry(.11,.16,.28,16),mats.stoneLight,new THREE.Vector3(-2.9,.75,-8.2))
  vase.userData.environmentFixture=true

  // Low, rounded compact sedan. The chamfered shell, inset windows, trim and wheels
  // read as a vehicle at room scale without adding a heavy external model.
  const car=new THREE.Group();car.position.set(-4,.04,5.6);root.add(car)
  const lower=new THREE.Mesh(new RoundedBoxGeometry(1.82,.58,4.22,5,.19),mats.car);lower.position.y=.61;lower.castShadow=true;lower.receiveShadow=true;car.add(lower)
  const cabin=new THREE.Mesh(new RoundedBoxGeometry(1.42,.74,2.12,5,.2),mats.car);cabin.position.set(0,1.19,-.17);cabin.castShadow=true;car.add(cabin)
  const roof=new THREE.Mesh(new RoundedBoxGeometry(1.25,.08,1.48,4,.05),mats.car);roof.position.set(0,1.59,-.16);roof.castShadow=true;car.add(roof)
  const windscreenMat=new THREE.MeshPhysicalMaterial({color:'#75939a',roughness:.16,metalness:.13,transparent:true,opacity:.78,side:THREE.DoubleSide,envMapIntensity:1})
  const windshield=new THREE.Mesh(new THREE.PlaneGeometry(1.22,.64),windscreenMat);windshield.position.set(0,1.24,1.08);windshield.rotation.x=-.30;car.add(windshield)
  const rearGlass=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.58),windscreenMat);rearGlass.position.set(0,1.24,-1.4);rearGlass.rotation.x=Math.PI+.3;car.add(rearGlass)
  for(const x of [-.72,.72]){
    for(const z of [-.77,.48]){
      const sideWindow=new THREE.Mesh(new THREE.PlaneGeometry(.86,.45),windscreenMat);sideWindow.position.set(x,1.26,z);sideWindow.rotation.y=x<0?Math.PI/2:-Math.PI/2;car.add(sideWindow)
    }
    const mirror=new THREE.Mesh(new RoundedBoxGeometry(.2,.12,.24,3,.045),mats.car);mirror.position.set(x*1.23,1.12,.68);car.add(mirror)
  }
  for(const x of [-.91,.91])for(const z of [-1.35,1.35]){
    const tire=add(new THREE.CylinderGeometry(.32,.32,.2,32),mats.tire,new THREE.Vector3(x,.36,z),car);tire.rotation.z=Math.PI/2
    const rim=add(new THREE.CylinderGeometry(.195,.195,.207,24),mats.chrome,new THREE.Vector3(x*1.01,.36,z),car);rim.rotation.z=Math.PI/2
    for(let spoke=0;spoke<5;spoke++){const angle=spoke*Math.PI*2/5,bar=box(.035,.29,.025,x*1.14,.36+Math.cos(angle)*.02,z+Math.sin(angle)*.09,mats.chrome,car);bar.rotation.x=angle}
  }
  for(const x of [-.58,.58]){
    const head=add(new THREE.BoxGeometry(.38,.14,.035),mats.lamp,new THREE.Vector3(x,.7,2.13),car,false);head.material=new THREE.MeshPhysicalMaterial({color:'#fff4d5',emissive:'#fff0bd',emissiveIntensity:.35,roughness:.18,clearcoat:.7})
    box(.38,.1,.035,x,.49,-2.13,mats.wood,car)
  }
  box(.7,.15,.08,0,.63,2.14,mats.dark,car);box(.65,.12,.055,0,.62,-2.14,mats.dark,car)
  for(const side of [-1,1])for(const z of [-.75,.25,1.05]){
    const seam=box(.012,.32,.012,side*.916,.62,z,mats.dark,car);seam.castShadow=false
  }
  obstacles.push(new THREE.Box3(new THREE.Vector3(-5.08,.04,3.42),new THREE.Vector3(-2.92,1.85,7.78)))

  // Planters, shrubs, small trees, and low boundary rails along the approach.
  const planter=(x:number,z:number,scale=1)=>{
    const pot=add(new THREE.CylinderGeometry(.28*scale,.22*scale,.42*scale,8),mats.stone,new THREE.Vector3(x,.21*scale,z));pot.userData.environmentFixture=true
    add(new THREE.CylinderGeometry(.04*scale,.055*scale,1.1*scale,7),mats.wood,new THREE.Vector3(x,.92*scale,z))
  }
  const leafShape=new THREE.Shape();leafShape.moveTo(0,-.52);leafShape.bezierCurveTo(-.28,-.18,-.27,.3,0,.52);leafShape.bezierCurveTo(.27,.3,.28,-.18,0,-.52)
  const foliageGeometry=new THREE.ShapeGeometry(leafShape,8),leafInstances=new THREE.InstancedMesh(foliageGeometry,mats.leaf,120),shrubInstances=new THREE.InstancedMesh(foliageGeometry,mats.leaf,512),treeInstances=new THREE.InstancedMesh(foliageGeometry,mats.leaf,240)
  const dummy=new THREE.Object3D(),leafTint=new THREE.Color();let leafCount=0,shrubCount=0,treeCount=0
  for(const z of [-7,-3,2,7,12]){planter(-9.1,z,.72);planter(9.1,z,.72)}
  // Repeated garden foliage uses instancing to keep draw calls low.
  for(const x of [-12,-7,10,14])for(const z of [-6,-1,5,10]){
    for(let leaf=0;leaf<24;leaf++){
      const a=leaf*2.399,cluster=leaf>0,r=cluster ? .27+(leaf%3)*.045 : 0
      dummy.position.set(x+Math.cos(a)*r,cluster ? .37+(leaf%5)*.075 : .4,z+Math.sin(a)*r);dummy.rotation.set(.35+((leaf*17)%9)*.08,a+Math.PI/2,((leaf*13)%7-3)*.12);dummy.scale.set(.55,.46,.45);dummy.updateMatrix();shrubInstances.setMatrixAt(shrubCount,dummy.matrix);leafTint.set(leaf%3?'#ffffff':'#dce7bf');shrubInstances.setColorAt(shrubCount,leafTint);shrubCount++
    }
  }
  for(const [x,z] of [[-12,-9],[13,-8],[-12,9],[13,9]] as const){
    add(new THREE.CylinderGeometry(.14,.24,2.4,8),mats.wood,new THREE.Vector3(x,1.2,z))
    for(let i=0;i<56;i++){const a=i*2.399,r=.22+(i%7)*.15;dummy.position.set(x+Math.cos(a)*r,2.42+(i%9)*.17,z+Math.sin(a)*r);dummy.rotation.set(.3+((i*17)%9)*.09,a+Math.PI/2,((i*13)%7-3)*.14);dummy.scale.set(.72+(i%3)*.07,.56+(i%4)*.04,.6);dummy.updateMatrix();treeInstances.setMatrixAt(treeCount,dummy.matrix);leafTint.set(i%3?'#ffffff':'#e4ebc9');treeInstances.setColorAt(treeCount,leafTint);treeCount++}
  }
  for(let i=0;i<7*10;i++){
    const planterIndex=Math.floor(i/7),leaf=i%7,x=planterIndex%2?-9.1:9.1,z=[-7,-3,2,7,12][Math.floor(planterIndex/2)],scale=.72,a=leaf*2.399
    dummy.position.set(x+Math.cos(a)*.24*scale,1.03*scale+(leaf%3)*.08,z+Math.sin(a)*.24*scale);dummy.scale.set(.19*scale,.34*scale,.19*scale);dummy.updateMatrix();leafInstances.setMatrixAt(leafCount,dummy.matrix);leafTint.set(leaf%3?'#41653c':'#82975c');leafInstances.setColorAt(leafCount,leafTint);leafCount++
  }
  leafInstances.count=leafCount;shrubInstances.count=shrubCount;treeInstances.count=treeCount
  // Alpha-tested leaf cards can be costly in software VR/headless renderers;
  // the architecture and car remain the authored shadow casters.
  for(const instances of [leafInstances,shrubInstances,treeInstances]){instances.castShadow=false;instances.receiveShadow=true;root.add(instances)}
  // Front gate posts and a simple slatted gate, leaving the paved drive centered.
  for(const x of [-7.5,7.5]){
    box(.48,1.75,.48,x,.88,17,mats.stone,root,true)
    box(.62,.15,.62,x,1.82,17,mats.stoneLight)
  }
  for(let i=0;i<13;i++)box(.045,1.32,.075,-3.1+i*.52,.66,17,mats.dark)
  box(6.5,.065,.09,0,.4,17,mats.dark)
  box(6.5,.065,.09,0,1.15,17,mats.dark)

  return { root, floors, walls, obstacles, walkAreas, materials:{pillarStone:mats.pillarStone,doorWood:mats.doorWood} }
}
