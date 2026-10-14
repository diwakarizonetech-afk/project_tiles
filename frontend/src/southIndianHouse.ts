import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { Tile } from './catalog'
import type { WallStyle } from './house'

export interface SouthIndianFloors {
  hall: THREE.Mesh
  entrance: THREE.Mesh
  carParking: THREE.Mesh
  portico: THREE.Mesh
}

export function setupSouthIndianHouse(
  group: THREE.Group,
  centreZ: number,
  floorMeshes: THREE.Mesh[],
  floorMaterials: THREE.MeshStandardMaterial[],
  floorTargets: THREE.Mesh[][],
  wallMaterials: THREE.MeshStandardMaterial[],
  wallMeshes: THREE.Mesh[],
  textures: Set<THREE.Texture>,
  materials: Set<THREE.Material>,
  geometries: Set<THREE.BufferGeometry>,
  renderer: THREE.WebGLRenderer
): {
  floors: SouthIndianFloors
  walkBounds: { walkX: number; walkZ: number }
  spawn: { x: number; z: number; yaw: number; pitch: number }
} {
  // Clear any existing children in group
  while (group.children.length > 0) {
    const child = group.children[0]
    group.remove(child)
  }

  // Set group Z offset
  group.position.set(0, 0, centreZ)

  // -------------------------------------------------------------------------
  // 1. PROCEDURAL TEXTURE GENERATION
  // -------------------------------------------------------------------------
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  const createProceduralTexture = (
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    w = 512,
    h = w
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    draw(ctx, w, h)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = maxAnisotropy
    textures.add(tex)
    return tex
  }

  // Stone cladding texture for portico pillars & architectural accents
  const stoneCladdingTex = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = '#9e978c'
    ctx.fillRect(0, 0, w, h)
    const rows = 16
    const rowH = h / rows
    const stoneColors = [
      '#a8a196', '#948d82', '#b3aba0', '#8e877c',
      '#9c9489', '#a29a8f', '#888277', '#ada59a',
    ]

    for (let r = 0; r < rows; r++) {
      const y = r * rowH
      const cols = 4 + (r % 2)
      const colW = w / cols
      const offset = (r % 2 === 0 ? 0 : colW * 0.5)

      for (let c = -1; c <= cols + 1; c++) {
        const x = c * colW + offset
        const color = stoneColors[(r * 5 + c * 7 + 13) % stoneColors.length]
        ctx.fillStyle = color
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4)

        // Subtle chiseled stone surface noise
        for (let i = 0; i < 40; i++) {
          const nx = x + 3 + (i * 29) % (colW - 6)
          const ny = y + 3 + (i * 47) % (rowH - 6)
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'
          ctx.fillRect(nx, ny, 2, 2)
        }
      }

      // Mortar groove lines
      ctx.strokeStyle = '#5a544b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }, 1024, 1024)
  stoneCladdingTex.colorSpace = THREE.SRGBColorSpace

  const stoneCladdingBump = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    const rows = 16
    const rowH = h / rows

    for (let r = 0; r < rows; r++) {
      const y = r * rowH
      const cols = 4 + (r % 2)
      const colW = w / cols
      const offset = (r % 2 === 0 ? 0 : colW * 0.5)

      for (let c = -1; c <= cols + 1; c++) {
        const x = c * colW + offset
        // Raised stone face
        ctx.fillStyle = '#b0b0b0'
        ctx.fillRect(x + 3, y + 3, colW - 6, rowH - 6)
        // Deep mortar grooves
        ctx.strokeStyle = '#202020'
        ctx.lineWidth = 4
        ctx.strokeRect(x + 1, y + 1, colW - 2, rowH - 2)
      }
    }
  }, 1024, 1024)

  // Rich South Indian Teak Wood Texture
  const teakWoodTex = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = '#784620'
    ctx.fillRect(0, 0, w, h)

    // Wood longitudinal grain streaks
    for (let i = 0; i < 280; i++) {
      const y0 = (i * 7) % h
      const amp = 3 + (i % 6)
      const freq = 0.04 + (i % 5) * 0.015
      ctx.beginPath()
      ctx.moveTo(0, y0)
      for (let x = 0; x <= w; x += 6) {
        ctx.lineTo(x, y0 + Math.sin(x * freq + i) * amp)
      }
      ctx.strokeStyle = i % 3 === 0
        ? 'rgba(60,28,8,0.28)'
        : i % 2 === 0
        ? 'rgba(155,90,38,0.22)'
        : 'rgba(210,135,55,0.14)'
      ctx.lineWidth = 0.8 + (i % 4) * 0.5
      ctx.stroke()
    }
  }, 1024, 1024)
  teakWoodTex.colorSpace = THREE.SRGBColorSpace

  // Off-white wall plaster texture
  const stuccoTex = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = '#f5f2eb'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 300; i++) {
      const x = (i * 61) % w
      const y = (i * 97) % h
      const r = 8 + (i % 14)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, i % 3 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)')
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, 512, 512)
  stuccoTex.colorSpace = THREE.SRGBColorSpace

  // Driveway asphalt & pavers
  const drivewayTex = createProceduralTexture((ctx, w, h) => {
    ctx.fillStyle = '#3a3d3c'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 1500; i++) {
      const x = (i * 47) % w
      const y = (i * 83) % h
      ctx.fillStyle = i % 2 === 0 ? '#4d5150' : '#2b2d2c'
      ctx.fillRect(x, y, 2, 2)
    }
  }, 512, 512)

  // -------------------------------------------------------------------------
  // 2. SHARED PBR MATERIALS
  // -------------------------------------------------------------------------
  const wallMat = new THREE.MeshStandardMaterial({
    map: stuccoTex,
    color: '#f5f2eb',
    roughness: 0.86,
    metalness: 0.01,
  })
  materials.add(wallMat)

  const trimMat = new THREE.MeshStandardMaterial({
    color: '#2e3330', // Dark charcoal/slate parapet trim
    roughness: 0.5,
    metalness: 0.1,
  })
  materials.add(trimMat)

  const stonePillarMat = new THREE.MeshStandardMaterial({
    map: stoneCladdingTex,
    bumpMap: stoneCladdingBump,
    bumpScale: 0.008,
    color: '#d4cec5',
    roughness: 0.76,
    metalness: 0.02,
  })
  materials.add(stonePillarMat)

  const teakDoorMat = new THREE.MeshStandardMaterial({
    map: teakWoodTex,
    color: '#9c5a2b',
    roughness: 0.38,
    metalness: 0.02,
  })
  materials.add(teakDoorMat)

  const brassMat = new THREE.MeshStandardMaterial({
    color: '#dfc272',
    roughness: 0.22,
    metalness: 0.9,
  })
  materials.add(brassMat)

  const graniteStepMat = new THREE.MeshStandardMaterial({
    color: '#424546',
    roughness: 0.42,
    metalness: 0.05,
  })
  materials.add(graniteStepMat)

  const drivewayMat = new THREE.MeshStandardMaterial({
    map: drivewayTex,
    color: '#454846',
    roughness: 0.88,
    metalness: 0.02,
  })
  materials.add(drivewayMat)

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#e4f0ec',
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.88,
    thickness: 0.01,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  materials.add(glassMat)

  // -------------------------------------------------------------------------
  // 3. THE 4 CUSTOMIZABLE FLOOR SURFACES
  // -------------------------------------------------------------------------
  // Surface 1: Hall floor (room index 5)
  // Surface 2: Entrance floor (room index 6)
  // Surface 3: Car parking floor (room index 7)
  // Surface 4: Portico floor (room index 8)

  const createFloorMesh = (
    w: number,
    d: number,
    x: number,
    z: number,
    y: number,
    floorRoomId: number,
    surfaceLabel: string
  ): { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial } => {
    const geo = new THREE.PlaneGeometry(w, d)
    // Project exact meter metric UV coordinates
    const pos = geo.getAttribute('position')
    const uvs = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) + w * 0.5
      const py = pos.getY(i) + d * 0.5
      uvs[i * 2] = px / w
      uvs[i * 2 + 1] = py / d
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometries.add(geo)

    const mat = (floorMaterials[floorRoomId] ??= new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }))
    materials.add(mat)

    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, y, z)
    mesh.receiveShadow = true
    mesh.castShadow = false
    mesh.userData.floor = true
    mesh.userData.floorRoom = floorRoomId
    mesh.userData.floorName = surfaceLabel
    mesh.name = surfaceLabel

    group.add(mesh)
    floorMeshes[floorRoomId] = mesh
    floorTargets[floorRoomId] = [mesh]

    return { mesh, mat }
  }

  // Hall: top-left area, spanning wide across the back
  const hall = createFloorMesh(7.6, 5.0, -0.6, -3.1, 0.35, 5, 'Hall Floor')

  // Entrance: bottom-right foyer room
  const entrance = createFloorMesh(3.6, 3.2, 1.4, 1.0, 0.35, 6, 'Entrance Floor')

  // Car Parking: bottom-left bay at ground level
  const carParking = createFloorMesh(4.0, 5.4, -2.4, 2.1, 0.02, 7, 'Car Parking Floor')

  // Portico: front projecting porch with pillars
  const portico = createFloorMesh(3.6, 2.8, 1.4, 4.0, 0.35, 8, 'Portico Floor')

  // -------------------------------------------------------------------------
  // 4. FRONT DRIVEWAY & ELEVATED ENTRANCE STEPS
  // -------------------------------------------------------------------------
  // Front asphalt / stone driveway in front of portico and parking
  const drivewayGeo = new THREE.PlaneGeometry(12.0, 5.0)
  geometries.add(drivewayGeo)
  const drivewayMesh = new THREE.Mesh(drivewayGeo, drivewayMat)
  drivewayMesh.rotation.x = -Math.PI / 2
  drivewayMesh.position.set(-0.6, 0.0, 7.5)
  drivewayMesh.receiveShadow = true
  group.add(drivewayMesh)

  // Two wide polished granite entrance steps leading up to Portico
  const step1Geo = new THREE.BoxGeometry(3.8, 0.175, 0.45)
  geometries.add(step1Geo)
  const step1 = new THREE.Mesh(step1Geo, graniteStepMat)
  step1.position.set(1.4, 0.088, 5.62)
  step1.receiveShadow = true
  step1.castShadow = true
  group.add(step1)

  const step2Geo = new THREE.BoxGeometry(3.8, 0.175, 0.45)
  geometries.add(step2Geo)
  const step2 = new THREE.Mesh(step2Geo, graniteStepMat)
  step2.position.set(1.4, 0.263, 5.2)
  step2.receiveShadow = true
  step2.castShadow = true
  group.add(step2)

  // Base plinth foundation wall enclosing elevated floor
  const plinthGeo = new THREE.BoxGeometry(3.64, 0.35, 0.15)
  geometries.add(plinthGeo)
  const plinthFront = new THREE.Mesh(plinthGeo, graniteStepMat)
  plinthFront.position.set(1.4, 0.175, 5.42)
  group.add(plinthFront)

  // -------------------------------------------------------------------------
  // 5. CUTAWAY WALLS & ARCHITECTURAL ENCLOSURE
  // -------------------------------------------------------------------------
  const wallHeight = 2.8
  const wallThick = 0.22

  const addWallSegment = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d)
    geometries.add(geo)
    const mesh = new THREE.Mesh(geo, wallMat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)

    // Charcoal coping trim along top of cutaway wall
    const trimH = 0.08
    const trimGeo = new THREE.BoxGeometry(w + 0.04, trimH, d + 0.04)
    geometries.add(trimGeo)
    const trimMesh = new THREE.Mesh(trimGeo, trimMat)
    trimMesh.position.set(x, y + h * 0.5 + trimH * 0.5, z)
    group.add(trimMesh)

    return mesh
  }

  const centerY = 0.35 + wallHeight * 0.5

  // 1. North Wall (Back of Hall) - with central window opening
  addWallSegment(2.6, wallHeight, wallThick, -3.0, centerY, -5.6)
  addWallSegment(2.6, wallHeight, wallThick, 1.8, centerY, -5.6)
  // Window above/below sill
  addWallSegment(2.4, 0.9, wallThick, -0.6, 0.35 + 0.45, -5.6)
  addWallSegment(2.4, 0.5, wallThick, -0.6, 0.35 + 2.55, -5.6)
  // Window glass
  const northGlassGeo = new THREE.PlaneGeometry(2.4, 1.4)
  geometries.add(northGlassGeo)
  const northGlass = new THREE.Mesh(northGlassGeo, glassMat)
  northGlass.position.set(-0.6, 0.35 + 1.6, -5.6)
  group.add(northGlass)

  // 2. West Wall (Hall Left Wall) - with window
  addWallSegment(wallThick, wallHeight, 1.5, -4.4, centerY, -4.75)
  addWallSegment(wallThick, wallHeight, 1.5, -4.4, centerY, -1.45)
  addWallSegment(wallThick, 0.9, 2.0, -4.4, 0.35 + 0.45, -3.1)
  addWallSegment(wallThick, 0.5, 2.0, -4.4, 0.35 + 2.55, -3.1)
  const westGlassGeo = new THREE.PlaneGeometry(2.0, 1.4)
  geometries.add(westGlassGeo)
  const westGlass = new THREE.Mesh(westGlassGeo, glassMat)
  westGlass.rotation.y = Math.PI / 2
  westGlass.position.set(-4.4, 0.35 + 1.6, -3.1)
  group.add(westGlass)

  // 3. West Boundary Wall (Car Parking Left Wall)
  const boundH = 2.1
  const boundGeo = new THREE.BoxGeometry(wallThick, boundH, 5.4)
  geometries.add(boundGeo)
  const boundMesh = new THREE.Mesh(boundGeo, wallMat)
  boundMesh.position.set(-4.4, boundH * 0.5, 2.1)
  boundMesh.castShadow = true
  boundMesh.receiveShadow = true
  group.add(boundMesh)
  const boundTrimGeo = new THREE.BoxGeometry(wallThick + 0.04, 0.08, 5.44)
  geometries.add(boundTrimGeo)
  const boundTrim = new THREE.Mesh(boundTrimGeo, trimMat)
  boundTrim.position.set(-4.4, boundH + 0.04, 2.1)
  group.add(boundTrim)

  // 4. Dividing Wall between Hall and Car Parking
  addWallSegment(4.0, wallHeight, wallThick, -2.4, centerY, -0.6)

  // 5. Dividing Wall between Hall and Entrance Foyer (with doorway)
  addWallSegment(1.2, wallHeight, wallThick, 2.5, centerY, -0.6)
  addWallSegment(1.2, wallHeight, wallThick, 0.1, centerY, -0.6)
  addWallSegment(1.2, 0.6, wallThick, 1.3, 0.35 + 2.5, -0.6)

  // Teak door between Entrance and Hall (swung open slightly)
  const doorGeo = new THREE.BoxGeometry(1.05, 2.15, 0.06)
  geometries.add(doorGeo)
  const hallDoor = new THREE.Mesh(doorGeo, teakDoorMat)
  hallDoor.position.set(0.9, 0.35 + 1.075, -0.6)
  hallDoor.rotation.y = -0.45
  hallDoor.castShadow = true
  group.add(hallDoor)

  // 6. Dividing Wall between Car Parking and Entrance Foyer (with side door)
  addWallSegment(wallThick, wallHeight, 1.8, -0.4, centerY, 1.7)
  addWallSegment(wallThick, 0.6, 1.0, -0.4, 0.35 + 2.5, 0.3)
  addWallSegment(wallThick, wallHeight, 0.4, -0.4, centerY, -0.4)

  // 7. East Wall (Right Wall of Hall & Entrance)
  addWallSegment(wallThick, wallHeight, 4.8, 3.2, centerY, -3.2)
  addWallSegment(wallThick, wallHeight, 3.2, 3.2, centerY, 1.0)

  // 8. Front Wall of Entrance (between Entrance and Portico)
  addWallSegment(1.1, wallHeight, wallThick, -0.35, centerY, 2.6)
  addWallSegment(1.1, wallHeight, wallThick, 2.55, centerY, 2.6)
  addWallSegment(1.4, 0.5, wallThick, 1.1, 0.35 + 2.55, 2.6)

  // Main Teak Entrance Door with vertical brass handle
  const mainDoor = new THREE.Mesh(doorGeo, teakDoorMat)
  mainDoor.position.set(1.1, 0.35 + 1.075, 2.6)
  mainDoor.rotation.y = 0.55
  mainDoor.castShadow = true
  group.add(mainDoor)

  const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 12)
  geometries.add(handleGeo)
  const handle = new THREE.Mesh(handleGeo, brassMat)
  handle.position.set(0.48, 0.35 + 1.1, 2.63)
  handle.rotation.z = Math.PI / 2
  group.add(handle)

  // -------------------------------------------------------------------------
  // 6. PORTICO STONE PILLARS, BEAMS & SCONCE LIGHTS
  // -------------------------------------------------------------------------
  const pillarW = 0.52
  const pillarH = wallHeight

  const makeStonePillar = (px: number, pz: number) => {
    // Main shaft
    const shaftGeo = new THREE.BoxGeometry(pillarW, pillarH - 0.2, pillarW)
    geometries.add(shaftGeo)
    const shaft = new THREE.Mesh(shaftGeo, stonePillarMat)
    shaft.position.set(px, 0.35 + (pillarH - 0.2) * 0.5 + 0.1, pz)
    shaft.castShadow = true
    shaft.receiveShadow = true
    group.add(shaft)

    // Pillar base
    const baseGeo = new THREE.BoxGeometry(pillarW + 0.08, 0.12, pillarW + 0.08)
    geometries.add(baseGeo)
    const base = new THREE.Mesh(baseGeo, graniteStepMat)
    base.position.set(px, 0.35 + 0.06, pz)
    group.add(base)

    // Pillar capital
    const capGeo = new THREE.BoxGeometry(pillarW + 0.1, 0.14, pillarW + 0.1)
    geometries.add(capGeo)
    const cap = new THREE.Mesh(capGeo, graniteStepMat)
    cap.position.set(px, 0.35 + pillarH - 0.07, pz)
    group.add(cap)

    // Modern architectural black dual-beam sconce
    const sconceGeo = new THREE.BoxGeometry(0.1, 0.22, 0.08)
    geometries.add(sconceGeo)
    const sconce = new THREE.Mesh(sconceGeo, trimMat)
    sconce.position.set(px, 0.35 + 1.65, pz + pillarW * 0.5 + 0.04)
    group.add(sconce)

    // Warm sconce light casting up/down
    const light = new THREE.PointLight('#ffd294', 2.4, 4.8, 1.8)
    light.position.set(px, 0.35 + 1.65, pz + pillarW * 0.5 + 0.12)
    group.add(light)
  }

  // Two square pillars supporting front of Portico
  makeStonePillar(-0.15, 5.15)
  makeStonePillar(2.95, 5.15)

  // Portico roof projecting slab
  const roofSlabGeo = new THREE.BoxGeometry(3.64, 0.2, 2.9)
  geometries.add(roofSlabGeo)
  const roofSlab = new THREE.Mesh(roofSlabGeo, wallMat)
  roofSlab.position.set(1.4, 0.35 + wallHeight + 0.1, 4.05)
  roofSlab.castShadow = true
  group.add(roofSlab)

  const roofTrimGeo = new THREE.BoxGeometry(3.68, 0.08, 2.94)
  geometries.add(roofTrimGeo)
  const roofTrim = new THREE.Mesh(roofTrimGeo, trimMat)
  roofTrim.position.set(1.4, 0.35 + wallHeight + 0.24, 4.05)
  group.add(roofTrim)

  // Front beam connecting pillars
  const beamGeo = new THREE.BoxGeometry(3.64, 0.3, 0.52)
  geometries.add(beamGeo)
  const beam = new THREE.Mesh(beamGeo, wallMat)
  beam.position.set(1.4, 0.35 + wallHeight - 0.15, 5.15)
  beam.castShadow = true
  group.add(beam)

  // -------------------------------------------------------------------------
  // 7. REALISTIC MODERN CAR IN CAR PARKING BAY
  // -------------------------------------------------------------------------
  const carGroup = new THREE.Group()
  // Parked in center of parking bay, slightly angled
  carGroup.position.set(-2.4, 0.02, 2.1)
  carGroup.rotation.y = 0.02
  group.add(carGroup)

  const carPaintMat = new THREE.MeshPhysicalMaterial({
    color: '#9aa0a6', // Sleek metallic silver
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
  })
  materials.add(carPaintMat)

  const carDarkMat = new THREE.MeshStandardMaterial({
    color: '#1a1d1e',
    roughness: 0.6,
    metalness: 0.2,
  })
  materials.add(carDarkMat)

  const carGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#182024',
    roughness: 0.06,
    metalness: 0.1,
    transmission: 0.45,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })
  materials.add(carGlassMat)

  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e0e0e0',
    metalness: 0.95,
    roughness: 0.08,
  })
  materials.add(chromeMat)

  const tireMat = new THREE.MeshStandardMaterial({
    color: '#1c1c1c',
    roughness: 0.85,
    metalness: 0.05,
  })
  materials.add(tireMat)

  // Main lower body chassis
  const carBodyGeo = new RoundedBoxGeometry(1.75, 0.65, 3.9, 4, 0.08)
  geometries.add(carBodyGeo)
  const carBody = new THREE.Mesh(carBodyGeo, carPaintMat)
  carBody.position.set(0, 0.58, 0)
  carBody.castShadow = true
  carGroup.add(carBody)

  // Cabin / Greenhouse
  const carCabinGeo = new RoundedBoxGeometry(1.55, 0.58, 2.3, 4, 0.12)
  geometries.add(carCabinGeo)
  const carCabin = new THREE.Mesh(carCabinGeo, carGlassMat)
  carCabin.position.set(0, 1.1, -0.2)
  carCabin.castShadow = true
  carGroup.add(carCabin)

  // Roof panel
  const carRoofGeo = new RoundedBoxGeometry(1.48, 0.06, 1.95, 3, 0.03)
  geometries.add(carRoofGeo)
  const carRoof = new THREE.Mesh(carRoofGeo, carPaintMat)
  carRoof.position.set(0, 1.4, -0.25)
  carGroup.add(carRoof)

  // Front hood / bonnet slope
  const hoodGeo = new RoundedBoxGeometry(1.68, 0.18, 1.15, 3, 0.06)
  geometries.add(hoodGeo)
  const hood = new THREE.Mesh(hoodGeo, carPaintMat)
  hood.position.set(0, 0.82, 1.18)
  hood.rotation.x = -0.06
  carGroup.add(hood)

  // Headlights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#d8ecf8',
    emissiveIntensity: 0.6,
    roughness: 0.1,
  })
  materials.add(headlightMat)
  const hLightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08)
  geometries.add(hLightGeo)
  const hLightL = new THREE.Mesh(hLightGeo, headlightMat)
  hLightL.position.set(-0.62, 0.68, 1.92)
  carGroup.add(hLightL)
  const hLightR = new THREE.Mesh(hLightGeo, headlightMat)
  hLightR.position.set(0.62, 0.68, 1.92)
  carGroup.add(hLightR)

  // Front grille with chrome trim
  const grilleGeo = new THREE.BoxGeometry(0.72, 0.18, 0.05)
  geometries.add(grilleGeo)
  const grille = new THREE.Mesh(grilleGeo, carDarkMat)
  grille.position.set(0, 0.58, 1.94)
  carGroup.add(grille)

  // Taillights
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#cc1515',
    emissive: '#aa0a0a',
    emissiveIntensity: 0.4,
    roughness: 0.2,
  })
  materials.add(tailMat)
  const tLightGeo = new THREE.BoxGeometry(0.38, 0.12, 0.06)
  geometries.add(tLightGeo)
  const tLightL = new THREE.Mesh(tLightGeo, tailMat)
  tLightL.position.set(-0.62, 0.72, -1.93)
  carGroup.add(tLightL)
  const tLightR = new THREE.Mesh(tLightGeo, tailMat)
  tLightR.position.set(0.62, 0.72, -1.93)
  carGroup.add(tLightR)

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 20)
  geometries.add(wheelGeo)
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12)
  geometries.add(rimGeo)

  const makeWheel = (wx: number, wz: number) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(wx, 0.32, wz)
    wheel.castShadow = true
    carGroup.add(wheel)

    const rim = new THREE.Mesh(rimGeo, chromeMat)
    rim.rotation.z = Math.PI / 2
    rim.position.set(wx, 0.32, wz)
    carGroup.add(rim)
  }

  makeWheel(-0.84, 1.15)
  makeWheel(0.84, 1.15)
  makeWheel(-0.84, -1.15)
  makeWheel(0.84, -1.15)

  // -------------------------------------------------------------------------
  // 8. HALL INTERIOR FURNITURE & DECOR
  // -------------------------------------------------------------------------
  // Modern sectional sofa
  const sofaGroup = new THREE.Group()
  sofaGroup.position.set(-1.8, 0.35, -3.2)
  group.add(sofaGroup)

  const sofaFabMat = new THREE.MeshStandardMaterial({
    color: '#d6cfc4', // Warm oatmeal / beige linen
    roughness: 0.88,
    metalness: 0.01,
  })
  materials.add(sofaFabMat)

  // Sofa base
  const sofaBaseGeo = new RoundedBoxGeometry(2.3, 0.28, 0.95, 3, 0.05)
  geometries.add(sofaBaseGeo)
  const sofaBase = new THREE.Mesh(sofaBaseGeo, sofaFabMat)
  sofaBase.position.set(0, 0.24, 0)
  sofaBase.castShadow = true
  sofaGroup.add(sofaBase)

  // Sofa backrest
  const sofaBackGeo = new RoundedBoxGeometry(2.3, 0.48, 0.24, 3, 0.06)
  geometries.add(sofaBackGeo)
  const sofaBack = new THREE.Mesh(sofaBackGeo, sofaFabMat)
  sofaBack.position.set(0, 0.6, -0.35)
  sofaBack.castShadow = true
  sofaGroup.add(sofaBack)

  // Sofa cushions
  const cushionGeo = new RoundedBoxGeometry(0.72, 0.16, 0.72, 3, 0.04)
  geometries.add(cushionGeo)
  for (let c = 0; c < 3; c++) {
    const cushion = new THREE.Mesh(cushionGeo, sofaFabMat)
    cushion.position.set(-0.72 + c * 0.72, 0.44, 0.05)
    cushion.castShadow = true
    sofaGroup.add(cushion)
  }

  // Coffee Table
  const tableGroup = new THREE.Group()
  tableGroup.position.set(-1.8, 0.35, -1.8)
  group.add(tableGroup)

  const woodTopGeo = new RoundedBoxGeometry(1.4, 0.06, 0.7, 3, 0.02)
  geometries.add(woodTopGeo)
  const woodTop = new THREE.Mesh(woodTopGeo, teakDoorMat)
  woodTop.position.set(0, 0.36, 0)
  woodTop.castShadow = true
  tableGroup.add(woodTop)

  // Black metal legs
  const legGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.34, 10)
  geometries.add(legGeo)
  const makeLeg = (lx: number, lz: number) => {
    const leg = new THREE.Mesh(legGeo, trimMat)
    leg.position.set(lx, 0.17, lz)
    tableGroup.add(leg)
  }
  makeLeg(-0.62, -0.28)
  makeLeg(0.62, -0.28)
  makeLeg(-0.62, 0.28)
  makeLeg(0.62, 0.28)

  // Area Rug under sofa & coffee table
  const rugMat = new THREE.MeshStandardMaterial({
    color: '#c5bcb0',
    roughness: 0.95,
    metalness: 0.0,
  })
  materials.add(rugMat)
  const rugGeo = new THREE.PlaneGeometry(2.8, 2.4)
  geometries.add(rugGeo)
  const rug = new THREE.Mesh(rugGeo, rugMat)
  rug.rotation.x = -Math.PI / 2
  rug.position.set(-1.8, 0.355, -2.5)
  rug.receiveShadow = true
  group.add(rug)

  // Low-profile floating TV credenza along the East wall
  const tvConsoleGeo = new RoundedBoxGeometry(0.45, 0.42, 2.8, 3, 0.04)
  geometries.add(tvConsoleGeo)
  const tvConsole = new THREE.Mesh(tvConsoleGeo, teakDoorMat)
  tvConsole.position.set(2.95, 0.35 + 0.36, -3.1)
  tvConsole.castShadow = true
  group.add(tvConsole)

  // Wall-mounted 65" OLED TV
  const tvFrameGeo = new THREE.BoxGeometry(0.04, 1.05, 1.85)
  geometries.add(tvFrameGeo)
  const tvFrame = new THREE.Mesh(tvFrameGeo, trimMat)
  tvFrame.position.set(3.14, 0.35 + 1.45, -3.1)
  tvFrame.castShadow = true
  group.add(tvFrame)

  const tvScreenGeo = new THREE.PlaneGeometry(1.8, 1.0)
  geometries.add(tvScreenGeo)
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: '#0e1112',
    roughness: 0.1,
    metalness: 0.8,
  })
  materials.add(tvScreenMat)
  const tvScreen = new THREE.Mesh(tvScreenGeo, tvScreenMat)
  tvScreen.rotation.y = -Math.PI / 2
  tvScreen.position.set(3.118, 0.35 + 1.45, -3.1)
  group.add(tvScreen)

  // Large Fiddle Leaf Fig indoor potted plant in corner
  const plantGroup = new THREE.Group()
  plantGroup.position.set(-3.8, 0.35, -5.0)
  group.add(plantGroup)

  const potGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.52, 16)
  geometries.add(potGeo)
  const potMat = new THREE.MeshStandardMaterial({ color: '#f0ece4', roughness: 0.3 })
  materials.add(potMat)
  const pot = new THREE.Mesh(potGeo, potMat)
  pot.position.y = 0.26
  pot.castShadow = true
  plantGroup.add(pot)

  const leafMat = new THREE.MeshStandardMaterial({
    color: '#2d623b',
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide,
  })
  materials.add(leafMat)
  const leafGeo = new THREE.SphereGeometry(0.38, 7, 7)
  geometries.add(leafGeo)
  for (let l = 0; l < 5; l++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.scale.set(0.6, 1.2, 0.08)
    leaf.position.set(
      Math.sin(l * 1.3) * 0.15,
      0.6 + l * 0.22,
      Math.cos(l * 1.3) * 0.15
    )
    leaf.rotation.set(Math.sin(l) * 0.3, l * 0.9, Math.cos(l) * 0.3)
    leaf.castShadow = true
    plantGroup.add(leaf)
  }

  // -------------------------------------------------------------------------
  // 9. ENTRANCE FOYER DECOR
  // -------------------------------------------------------------------------
  const foyerGroup = new THREE.Group()
  foyerGroup.position.set(2.8, 0.35, 1.0)
  group.add(foyerGroup)

  // Entry console shelf
  const consoleGeo = new RoundedBoxGeometry(0.35, 0.06, 1.2, 2, 0.02)
  geometries.add(consoleGeo)
  const consoleTable = new THREE.Mesh(consoleGeo, teakDoorMat)
  consoleTable.position.set(0, 0.85, 0)
  foyerGroup.add(consoleTable)

  // Small foyer rug
  const foyerRugGeo = new THREE.PlaneGeometry(1.6, 1.0)
  geometries.add(foyerRugGeo)
  const foyerRug = new THREE.Mesh(foyerRugGeo, rugMat)
  foyerRug.rotation.x = -Math.PI / 2
  foyerRug.position.set(1.4, 0.355, 1.0)
  group.add(foyerRug)

  // -------------------------------------------------------------------------
  // 10. LIGHTING FOR SOUTH INDIAN HOME
  // -------------------------------------------------------------------------
  // Warm tropical sunlight casting shadows into the portico and hall
  const sunLight = new THREE.DirectionalLight('#fff2db', 1.8)
  sunLight.position.set(5.0, 9.0, 7.0)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 30
  sunLight.shadow.camera.left = -7
  sunLight.shadow.camera.right = 7
  sunLight.shadow.camera.top = 7
  sunLight.shadow.camera.bottom = -7
  sunLight.shadow.bias = -0.0002
  group.add(sunLight)

  // Ambient soft sky fill
  const skyFill = new THREE.HemisphereLight('#fbf6ee', '#6d726c', 0.65)
  group.add(skyFill)

  // Hall interior recessed warm ceiling downlights
  const hallLight = new THREE.PointLight('#fff1d8', 2.8, 8.0, 1.8)
  hallLight.position.set(-0.6, 2.7, -3.1)
  group.add(hallLight)

  // Entrance foyer warm light
  const entryLight = new THREE.PointLight('#ffeacc', 2.0, 5.0, 1.8)
  entryLight.position.set(1.4, 2.7, 1.0)
  group.add(entryLight)

  return {
    floors: {
      hall: hall.mesh,
      entrance: entrance.mesh,
      carParking: carParking.mesh,
      portico: portico.mesh,
    },
    walkBounds: {
      walkX: 5.2,
      walkZ: 6.8,
    },
    spawn: {
      // Perspective matching the reference isometric view
      x: 2.2,
      z: 6.8,
      yaw: 0.28,
      pitch: -0.22,
    },
  }
}
