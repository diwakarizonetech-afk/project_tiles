import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy, Expand, Eye, Footprints, Grid2X2, Heart, Home, Lock, Mail, MapPin, Menu, MonitorSmartphone, MoveRight, Paintbrush, Phone, QrCode, RefreshCw, Search, Share2, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Sun, Upload, User, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { families, formatTileSizeLabel, getFloorDisplayLabel, getSizeVariationKey, getTileDetailSize, getTileDisplayCategory, getTileDisplayColor, getTileDisplayFinish, getTileDisplaySize, getTileDisplayType, isSlab2x4, is1x1_5, is2x2, isBathroomTile, roomNames, sampleUrl, SIZE_VARIATIONS, STANDARD_DIMENSIONS, TILE_SIZES, type Family, type SurfaceUse, type Tile, type TileSize, type TileOrientation } from './catalog'
import { Walkthrough, type ViewHandle } from './Walkthrough'
import { wallDesigns, wallSides, type WallDesign, type WallStyle } from './house'
import { articles } from './journal'
import { fetchTiles, saveCustomTile, saveInquiry } from './api'
import './tailwind.css'
import './wall-collection.css'
import './styles.css'
import './styles.css'
import './showroom.css'


import './brand.css'
import './layout-fix.css'
import './scene-nav.css'
import './collection-scroll.css'
import './home.css'
import { ExploreLoginModal } from './ExploreLoginModal'
import { isExploreSessionValid, clearExploreSession, EXPLORE_SESSION_EXPIRY_HOURS, getRemainingSessionMinutes } from './authSession'

function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const panel=useRef<HTMLDivElement>(null)
  useEffect(()=>{const previous=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';if(document.pointerLockElement)document.exitPointerLock();panel.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const elements=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href], [tabindex="0"]');if(!elements?.length)return;const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()}},[])
  return createPortal(<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><div className={`modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}><div className="modal-heading"><div><p className="overline">MJP CERAMICS / MATERIAL STUDIO</p><h2>{title}</h2></div><button className="round-button" aria-label="Close dialog" onClick={onClose}><X size={21}/></button></div>{children}</div></div>,document.fullscreenElement??document.body)
}
type VRCheck = {secure:boolean;webgl:boolean;webxr:boolean;headset:boolean|null;checking:boolean}
function VRCompatibility({active,onEnter,onStereo}:{active:boolean;onEnter:()=>void;onStereo:()=>void}){
  const [check,setCheck]=useState<VRCheck>({secure:window.isSecureContext,webgl:false,webxr:'xr' in navigator,headset:null,checking:true})
  const [copied,setCopied]=useState(false)
  const publicOrigin=/^(localhost|127\.0\.0\.1)$/i.test(location.hostname)?(import.meta.env.VITE_PUBLIC_SITE_URL||'https://project-tiles-iota.vercel.app'):location.origin
  const launchUrl=publicOrigin.replace(/\/$/,'')+location.pathname+location.search
  const runCheck=async()=>{let webgl=false;try{const canvas=document.createElement('canvas');webgl=Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl'))}catch{/* Report failed graphics capability. */}const webxr='xr' in navigator;setCheck({secure:window.isSecureContext,webgl,webxr,headset:null,checking:webxr});if(!webxr)return;try{const headset=await navigator.xr!.isSessionSupported('immersive-vr');setCheck(current=>({...current,headset,checking:false}))}catch{setCheck(current=>({...current,headset:false,checking:false}))}}
  useEffect(()=>{void runCheck()},[])
  const rows=[{label:'Secure connection',detail:check.secure?'HTTPS is ready for WebXR':'Open the hosted HTTPS website',ok:check.secure},{label:'3D graphics',detail:check.webgl?'WebGL renderer is available':'Enable browser hardware acceleration',ok:check.webgl},{label:'WebXR browser',detail:check.webxr?'This browser exposes WebXR':'Use Meta Quest Browser or a WebXR browser',ok:check.webxr}]
  const copyLink=async()=>{try{await navigator.clipboard.writeText(launchUrl);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{/* Visible URL remains available. */}}
  const ready=check.secure&&check.webgl&&check.webxr&&check.headset===true
  return <div className="vr-checker"><div className="vr-checker-grid"><section className="vr-diagnostics" aria-label="VR compatibility results"><div className="vr-section-title"><ShieldCheck size={17}/><span>DEVICE READINESS</span><button onClick={()=>void runCheck()} aria-label="Run VR check again"><RefreshCw className={check.checking?'is-spinning':''} size={15}/></button></div><div className="vr-check-list">{rows.map(row=><div key={row.label} className={row.ok?'pass':'fail'}>{row.ok?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}<span><b>{row.label}</b><small>{row.detail}</small></span></div>)}<div className={check.headset===true?'pass':check.checking?'checking':'warn'}>{check.headset===true?<CheckCircle2 size={18}/>:check.checking?<RefreshCw className="is-spinning" size={18}/>:<MonitorSmartphone size={18}/>}<span><b>VR headset</b><small>{check.checking?'Checking immersive VR support…':check.headset===true?'Connected and ready to enter':check.webxr?'Not detected on this device — scan the QR inside Quest':'Check again from inside the headset browser'}</small></span></div></div><div className={'vr-verdict '+(ready?'ready':check.headset===false?'device-needed':'setup-needed')}><span>{ready?'READY FOR VR':check.headset===false?'HEADSET NOT CONNECTED HERE':'SETUP REQUIRED'}</span><p>{ready?'Your browser can start an immersive session now.':'This does not mean the website is broken. Open this link directly in your headset browser.'}</p></div></section><section className="vr-quest-card" aria-label="Open showroom in VR headset"><div className="vr-section-title"><QrCode size={17}/><span>OPEN ON YOUR HEADSET</span></div><div className="vr-qr"><QRCodeSVG value={launchUrl} size={154} level="M" bgColor="#fffdf8" fgColor="#123f36" marginSize={2}/></div><h3>Scan in Meta Quest</h3><p>Use the Quest camera, open this link in Meta Quest Browser, then tap VR Mode.</p><button className="vr-copy" onClick={()=>void copyLink()}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'LINK COPIED':'COPY VR LINK'}</button></section></div><div className="vr-actions"><button disabled={!ready&&check.webxr} onClick={onEnter}><span className="headset-icon">◉◉</span><div><h3>{active?'Exit headset VR':'Enter headset VR'}</h3><p>{ready?'Headset detected · immersive session ready':check.webxr?'Open this page inside the headset to enable':'Compatible WebXR browser required'}</p></div><ArrowUpRight size={20}/></button><button onClick={onStereo}><Eye size={25}/><div><h3>Stereo preview</h3><p>Desktop preview only · it does not test headset tracking</p></div><ArrowUpRight size={20}/></button></div><ol className="vr-steps"><li><b>1</b> Connect Quest to Wi-Fi</li><li><b>2</b> Scan the QR code</li><li><b>3</b> Open in Quest Browser</li><li><b>4</b> Tap VR Mode → Enter VR</li></ol></div>
}
function initialTiles(catalog:Tile[]){
  const tiles=catalog.filter(tile=>tile.surface!=='Wall'),ids=new URLSearchParams(location.search).get('surfaces')?.split(',');
  const defaultSlabs = [
    'MJP-GR-01', // Cozy Living Room: Altic Black
    'MJP-GR-02', // Modern Bedroom: Altic Gold
    'MJP-GR-04', // VR Gallery: Crystal Aqua
    'MJP-GR-05', // Cooking Club: Crystal Blue
    'MJP-GR-10', // Modern Bathroom: Granite Aqua
    'MJP-GR-07', // Hall: Crystal Nut
    'MJP-GR-08', // Entrance: Globle Aqua
    'MJP-GR-03', // Car Parking: Black Basle
    'MJP-GR-13', // Portico: Granite Brown
  ];
  const result=roomNames.map((_,i)=>{
    if(ids?.[i]){const found=tiles.find(t=>t.id===ids[i]);if(found)return found}
    if(i===4){
      const bathTile=tiles.find(t=>isBathroomTile(t)&&(t.surface==='Floor'||t.surface==='Both'))??tiles.find(t=>t.id==='BT-W-201')
      if(bathTile)return bathTile
    }
    if(i===1){
      const woodTile=tiles.find(t=>t.id==='AT-2053'||t.family==='Wood'||/wood|oak/i.test(t.name))
      if(woodTile)return woodTile
    }
    const defaultCode = defaultSlabs[i];
    if(defaultCode){
      const match = tiles.find(t=>t.id===defaultCode);
      if(match) return match;
    }
    return tiles[i % tiles.length] ?? tiles[0];
  });
  for(let extra = 6; extra <= 8; extra++){
    const code = defaultSlabs[extra];
    const match = tiles.find(t=>t.id===code) ?? tiles[extra % tiles.length] ?? tiles[0];
    result.push(match);
  }
  return result;
}
const defaultWalls=['#f5f0e6','#ede8e0','#f8f6f0','#ddd2bf','#f0ece6','#f4f1ea','#d5d1c8','#e1ddd2','#c9d0c3','#eee9df','#e6e1d8']
const paintSwatches=[{name:'Alabaster Plaster',color:'#f8f6f0'},{name:'Ivory Chuna',color:'#fbf8f1'},{name:'Warm Linen',color:'#f2ede4'},{name:'Nordic Greige',color:'#e6e1d8'},{name:'Pale Cashmere',color:'#ded7cb'},{name:'Jaipur Sandstone',color:'#e4ccb1'},{name:'Calming Sage',color:'#7c8874'},{name:'Mediterranean Terracotta',color:'#b56c54'},{name:'Coastal Slate',color:'#687680'},{name:'Deep Olive',color:'#495543'},{name:'Peacock Teal',color:'#1e5553'},{name:'Charcoal Slate',color:'#323639'}]
const finishNames:Record<WallDesign,string>={paint:'Smooth paint',limewash:'Limewash',linen:'Linen texture',stripes:'Fine stripes',arches:'Art deco arches',subway:'Subway tile',herringbone:'Herringbone tile',terrazzo:'Terrazzo fleck',hexagon:'Hexagon tile',zellige:'Zellige tile',kitkat:'KitKat finger tile',travertine:'Travertine slab',marble:'Marble vein',checker:'Checker tile',mosaic:'Mosaic tile',chevron:'Chevron tile',fishscale:'Fish scale tile',concrete:'Concrete finish',fluted:'Fluted wall tile',grid:'Large grid tile'}
function isBathroomWallId(id:number):boolean{return (id>=160&&id<=206)||(id>=16&&id<=20)}
const roomWallId=(room:number,side:number)=>room*4+side
function getBathroomBaseAndLayer(id:number):{baseWall:number;layer:number}{
  if(id>=160&&id<=206)return {baseWall:Math.floor(id/10),layer:id%10}
  if(id>=16&&id<=20)return {baseWall:id,layer:0}
  return {baseWall:16,layer:0}
}
const bathroomSectionLabels = [
  '01 Top (6-7 ft)',
  '02 Upper (5-6 ft)',
  '03 Mid-High (4-5 ft)',
  '04 Mid (3-4 ft)',
  '05 Mid-Low (2-3 ft)',
  '06 Lower (1-2 ft)',
  '07 Bottom (0-1 ft)'
]
function initialWalls():Record<number,WallStyle>{
  let saved:Record<number,Partial<WallStyle>>={}
  try{const value=JSON.parse(localStorage.getItem('aura-wall-styles')??'{}');if(typeof value==='object'&&value!==null)saved=value}catch{}
  const result:Record<number,WallStyle>={}
  for(let i=0;i<roomNames.length*4+10;i++){
    const room=Math.min(roomNames.length-1,Math.floor(i/4))
    result[i]={color:typeof saved[i]?.color==='string'?saved[i]!.color!:defaultWalls[room],design:wallDesigns.includes(saved[i]?.design as WallDesign)?saved[i]!.design as WallDesign:'paint',...(saved[i]?.image?{image:saved[i]!.image,normal:saved[i]!.normal,roughness:saved[i]!.roughness,repeat:saved[i]!.repeat,size:saved[i]!.size}:{})}
  }
  const bathroomDefaults=['#e6e1d8','#ded7cb','#f8f6f0','#f2ede4','#ede8e0','#e2dcd2','#dcd6cb']
  for(let bw=16;bw<=20;bw++){
    for(let l=0;l<7;l++){
      const id=bw*10+l
      const savedItem = saved[id]?.image ? saved[id] : (bw === 20 && saved[160 + l]?.image ? saved[160 + l] : saved[id])
      result[id]={color:typeof savedItem?.color==='string'?savedItem!.color!:bathroomDefaults[l],design:wallDesigns.includes(savedItem?.design as WallDesign)?savedItem!.design as WallDesign:'paint',...(savedItem?.image?{image:savedItem!.image,normal:savedItem!.normal,roughness:savedItem!.roughness,repeat:savedItem!.repeat,size:savedItem!.size,orientation:savedItem!.orientation}:{})}
    }
  }
  return result
}

function SelectedTileCard({
  tile,
  isWall,
  onClose,
  onSelectSize,
  onSelectOrientation,
}: {
  tile: Tile | null | undefined
  isWall?: boolean
  onClose: () => void
  onSelectSize?: (sizeKey: '4x2' | '2x2' | '1x1') => void
  onSelectOrientation?: (orientation: 'Landscape' | 'Portrait') => void
}) {
  if (!tile) return null

  const currentSizeKey = getSizeVariationKey(tile.size)
  const detailSize = getTileDetailSize(tile.size)
  const displayType = getTileDisplayType(tile.surface, isWall)
  const displayFinish = getTileDisplayFinish(tile.finish)
  const displayColor = getTileDisplayColor(tile)
  const displayCategory = getTileDisplayCategory(tile)
  const currentOrientation = tile.orientation ?? 'Landscape'
  const showOrientationOption = Boolean(isWall && currentSizeKey === '4x2')

  return (
    <div className="selected-tile-card" role="region" aria-label="Selected tile preview and details">
      <div className="selected-tile-header">
        <h3>Selected Tile</h3>
        <button
          type="button"
          className="selected-tile-close"
          aria-label="Close selected tile preview"
          onClick={onClose}
        >
          <X size={13} />
        </button>
      </div>

      <div className="selected-tile-preview-row">
        <img
          src={sampleUrl(tile)}
          alt={tile.name}
          className="selected-tile-img"
        />
        <div className="selected-tile-meta">
          <span className="selected-tile-name" title={tile.name}>{tile.name}</span>
          <div className="selected-tile-size-selector" role="group" aria-label="Select tile size variation">
            {SIZE_VARIATIONS.map(opt => {
              const active = currentSizeKey === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`selected-tile-size-pill ${active ? 'active' : ''}`}
                  onClick={() => onSelectSize?.(opt.id)}
                  aria-pressed={active}
                  title={`Apply ${opt.label} size (${opt.metric})`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {showOrientationOption && (
            <div className="selected-tile-orientation-selector" role="group" aria-label="Select 4x2 layout orientation">
              <span className="selected-tile-layout-tag">LAYOUT:</span>
              <button
                type="button"
                className={`selected-tile-orientation-pill ${currentOrientation === 'Landscape' ? 'active' : ''}`}
                onClick={() => onSelectOrientation?.('Landscape')}
                aria-pressed={currentOrientation === 'Landscape'}
                title="Horizontal layout (1200 mm wide × 600 mm high)"
              >
                Horizontal
              </button>
              <button
                type="button"
                className={`selected-tile-orientation-pill ${currentOrientation === 'Portrait' ? 'active' : ''}`}
                onClick={() => onSelectOrientation?.('Portrait')}
                aria-pressed={currentOrientation === 'Portrait'}
                title="Vertical layout (600 mm wide × 1200 mm high)"
              >
                Vertical
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="selected-tile-divider" />

      <h4 className="selected-tile-details-title">Tile Details</h4>

      <div className="selected-tile-details-list">
        <div className="selected-tile-detail-row">
          <span className="selected-tile-detail-label">Name</span>
          <span className="selected-tile-detail-val" title={tile.name}>{tile.name}</span>
        </div>
        <div className="selected-tile-detail-row">
          <span className="selected-tile-detail-label">Size</span>
          <span className="selected-tile-detail-val">{detailSize}</span>
        </div>
        {showOrientationOption && (
          <div className="selected-tile-detail-row">
            <span className="selected-tile-detail-label">Layout</span>
            <span className="selected-tile-detail-val">{currentOrientation === 'Portrait' ? 'Vertical' : 'Horizontal'}</span>
          </div>
        )}
        <div className="selected-tile-detail-row">
          <span className="selected-tile-detail-label">Type</span>
          <span className="selected-tile-detail-val">{displayType}</span>
        </div>
        <div className="selected-tile-detail-row">
          <span className="selected-tile-detail-label">Finish</span>
          <span className="selected-tile-detail-val">{displayFinish}</span>
        </div>
        <div className="selected-tile-detail-row">
          <span className="selected-tile-detail-label">Color</span>
          <span className="selected-tile-detail-val">{displayColor}</span>
        </div>
        <div className="selected-tile-detail-row">
          <span className="selected-tile-detail-label">Category</span>
          <span className="selected-tile-detail-val">{displayCategory}</span>
        </div>
      </div>
    </div>
  )
}

function App(){
  const [isExploreAuthorized, setIsExploreAuthorized] = useState<boolean>(() => isExploreSessionValid())
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authTargetTile, setAuthTargetTile] = useState<Tile | null>(null)
  const [pendingExploreCallback, setPendingExploreCallback] = useState<(() => void) | null>(null)

  const requestStepInside = (action?: () => void, targetTile?: Tile) => {
    if (isExploreSessionValid()) {
      setIsExploreAuthorized(true)
      if (action) action()
      else view.current?.enter()
    } else {
      setIsExploreAuthorized(false)
      setAuthTargetTile(targetTile ?? null)
      setPendingExploreCallback(() => () => {
        if (action) action()
        else view.current?.enter()
      })
      setAuthModalOpen(true)
    }
  }

  const lockExplore = (customNotice?: unknown) => {
    clearExploreSession()
    setIsExploreAuthorized(false)
    if (walking) setWalking(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setNotice(typeof customNotice === 'string' ? customNotice : '3D Studio session locked.')
  }

  const handleAuthSuccess = () => {
    setIsExploreAuthorized(true)
    setAuthModalOpen(false)
    if (pendingExploreCallback) {
      pendingExploreCallback()
      setPendingExploreCallback(null)
    } else {
      view.current?.enter()
    }
    setAuthTargetTile(null)
  }

  const [collectionSurface,setCollectionSurface]=useState<'All'|'Floor'|'Wall'>('All')
  const roomParam=new URLSearchParams(location.search).get('room'),initialRoomParam=roomParam===null?3:Number(roomParam)
  const defaultRoom=Number.isInteger(initialRoomParam)&&initialRoomParam>=0&&initialRoomParam<roomNames.length?initialRoomParam:3
  const view=useRef<ViewHandle>(null);const [selected,setSelected]=useState<Tile[]>([]);const [room,setRoom]=useState(defaultRoom);const [activeSouthIndianFloor,setActiveSouthIndianFloor]=useState<number>(5);const [walking,setWalking]=useState(false);const [stereo,setStereo]=useState(false);const [gyro,setGyro]=useState(false);const [xr,setXR]=useState(false);const [ready,setReady]=useState(false)
  const [menu,setMenu]=useState(false);const [modal,setModal]=useState<null|'collections'|'details'|'guide'|'inspiration'|'vr'|'blog'|'upload'>(null);const [articleId,setArticleId]=useState(articles[0].id);const [filter,setFilter]=useState('All');const [query,setQuery]=useState('');const [onlySaved,setOnlySaved]=useState(false);const [scope,setScope]=useState('room');const [brightness,setBrightness]=useState(.95);const [floorGlare,setFloorGlare]=useState(.35);const [notice,setNotice]=useState('');const [wallStyles,setWallStyles]=useState<Record<number,WallStyle>>(initialWalls);const [activeWall,setActiveWall]=useState(defaultRoom===4?160:defaultRoom*4);const [paintOpen,setPaintOpen]=useState(false);const [quickPaint,setQuickPaint]=useState(false);const [quickFloorRoom,setQuickFloorRoom]=useState<number|null>(defaultRoom);const [selectedTileCardOpen,setSelectedTileCardOpen]=useState(true);const [selectedWallTile,setSelectedWallTile]=useState<Tile|null>(null);const [catalogTiles,setCatalogTiles]=useState<Tile[]>([]);const [catalogError,setCatalogError]=useState('');const [uploadImage,setUploadImage]=useState('');const [uploadName,setUploadName]=useState('');const [uploadCode,setUploadCode]=useState('');const [uploadFamily,setUploadFamily]=useState<Family>('Pattern');const [uploadFinish,setUploadFinish]=useState('Matt');const [uploadSurface,setUploadSurface]=useState<SurfaceUse>('Both');const [uploadSize,setUploadSize]=useState<TileSize>("2' × 2' (600 × 600 mm)")
  const [uploadOrientation,setUploadOrientation]=useState<TileOrientation>('Landscape');
  const [saved,setSaved]=useState<string[]>(()=>{try{const s=JSON.parse(localStorage.getItem('aura-favorites')??'[]');return Array.isArray(s)?s.filter((v:unknown)=>typeof v==='string'):[]}catch{return []}})
  const currentFloorIndex=quickFloorRoom!==null?quickFloorRoom:(room===5?activeSouthIndianFloor:room)
  const [applied,setApplied]=useState('');
  const isCurrentRoomBathroom = room === 4
  const tiles=catalogTiles.filter(item=>(item.surface==='Floor'||item.surface==='Both') && (isCurrentRoomBathroom ? true : !isBathroomTile(item))),wallTiles=catalogTiles.filter(item=>(item.surface==='Wall'||item.surface==='Both') && (isCurrentRoomBathroom ? true : !isBathroomTile(item))).sort((a,b)=>Number(a.builtIn)-Number(b.builtIn)||a.sortOrder-b.sortOrder),quickFloorTiles=[...tiles].sort((a,b)=>Number(a.builtIn)-Number(b.builtIn)||a.sortOrder-b.sortOrder),tile=selected[currentFloorIndex]??selected[room];const current=tiles.findIndex(item=>item.id===tile?.id);const isLiked=tile?saved.includes(tile.id):false;const article=articles.find(item=>item.id===articleId)??articles[0]
  const bathroomShowerWallId=20,backsplashId=21
  const isBathroomLayer=activeWall>=160&&activeWall<=206
  let activeWallRoom:number,activeWallLabel:string
  if(activeWall===backsplashId){activeWallRoom=3;activeWallLabel='Backsplash'}
  else if(isBathroomLayer||(activeWall>=16&&activeWall<=20)){activeWallRoom=4;const {baseWall,layer}=getBathroomBaseAndLayer(activeWall);const baseLabel=baseWall===20?'Shower wall':wallSides[baseWall%4];activeWallLabel=`${baseLabel} — Section ${layer+1} of 7`}
  else{activeWallRoom=Math.floor(activeWall/4);activeWallLabel=wallSides[activeWall%4]}

  // Periodic session validity check (auto-expires after 1 hour configured in .env)
  useEffect(() => {
    const checkExpiry = () => {
      if (isExploreAuthorized) {
        if (!isExploreSessionValid()) {
          setIsExploreAuthorized(false)
          setWalking(false)
          setNotice(`3D Walkthrough session expired (${EXPLORE_SESSION_EXPIRY_HOURS} hour limit). Please sign in to step inside again.`)
        }
      }
    }
    const interval = setInterval(checkExpiry, 15000)
    return () => clearInterval(interval)
  }, [isExploreAuthorized])

  useEffect(()=>{try{localStorage.setItem('aura-favorites',JSON.stringify(saved))}catch{/* favorites still work for this visit */}},[saved])
  useEffect(()=>{
    try{
      const keys = Object.keys(wallStyles).map(Number)
      const maxKey = keys.length ? Math.max(...keys) : 0
      const arr = Array.from({ length: maxKey + 1 }, (_, i) => wallStyles[i] ?? { color: '#f5f0e6', design: 'paint' as WallDesign })
      localStorage.setItem('aura-wall-styles', JSON.stringify(arr))
    }catch{/* Wall styles still work for this visit. */}
  },[wallStyles])
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),6500);return()=>clearTimeout(timer)},[notice])
  useEffect(()=>{void fetchTiles().then(catalog=>{setCatalogTiles(catalog);setSelected(initialTiles(catalog))}).catch(()=>{import('./fallbackTiles').then(m=>{setCatalogTiles(m.fallbackTiles);setSelected(initialTiles(m.fallbackTiles));setCatalogError('Using local fallback tiles. (API unavailable)')})})},[])
  useEffect(()=>{if(!ready)return;view.current?.goTo(defaultRoom)},[ready])
  const apply = (value: Tile, forcedTarget?: SurfaceUse) => {
    if (isBathroomTile(value) && (forcedTarget !== 'Wall' && collectionSurface !== 'Wall') && room !== 4 && scope !== 'room') {
      setNotice('Bathroom-restricted tiles can only be applied to the bathroom.')
      return
    }
    const isWallScope = forcedTarget === 'Wall' || collectionSurface === 'Wall'
    const target = forcedTarget ?? (isWallScope ? 'Wall' : (!value.builtIn ? 'Both' : value.surface)), wallTarget = activeWall
    if (target !== 'Wall' && !isWallScope) {
      setSelected(previous => previous.map((old, i) => {
        if (scope === 'all') {
          return (isBathroomTile(value) && i !== 4) ? old : value
        }
        return (room === 5 ? i === activeSouthIndianFloor : i === room) ? value : old
      }))
    }
    if (value.image && (target !== 'Floor' || isWallScope)) {
      const tileIs1x1_5 = is1x1_5(value.size)
      const tileOrientation = tileIs1x1_5 ? 'Landscape' : (value.orientation ?? 'Landscape')
      setWallStyles(previous => {
        const cur = previous[wallTarget] ?? { color: '#ffffff', design: 'paint' }
        return { ...previous, [wallTarget]: { ...cur, color: '#ffffff', design: 'paint', image: value.image, normal: value.normal, roughness: value.roughness, repeat: value.repeat, size: value.size, orientation: tileOrientation } }
      })
      setSelectedWallTile(value)
      setSelectedTileCardOpen(true)
    } else if (!isWallScope) {
      setSelectedWallTile(null)
      setSelectedTileCardOpen(true)
    }
    const targetLabel = (target === 'Wall' || isWallScope) ? 'the selected wall section' : target === 'Both' ? 'the selected wall section and floor' : scope === 'all' ? 'the whole house' : (room === 5 ? getFloorDisplayLabel(activeSouthIndianFloor).toLowerCase() : roomNames[room].toLowerCase())
    setApplied(`${value.name} applied to ${targetLabel}`)
    if (modal !== 'collections') {
      setModal(null)
      document.getElementById('showroom')?.scrollIntoView({ behavior: 'smooth' })
    }
  }
  const toggleSave=(id:string)=>setSaved(s=>s.includes(id)?s.filter(item=>item!==id):[...s,id])
  const openCatalog=(favorites=false,surface:'All'|'Floor'|'Wall'='All')=>{setCollectionSurface(surface);setModal('collections');setOnlySaved(favorites);setFilter('All');setQuery('');setMenu(false)}
  const jump=(i:number)=>{view.current?.goTo(i);setRoom(i);setActiveWall(i===4?160:i===5?24:i*4);setQuickPaint(false);if(quickFloorRoom!==null)setQuickFloorRoom(i===5?activeSouthIndianFloor:i)}
  const setTileDimension=(newSizeStr:string)=>{
    if(!tile)return
    setSelected(previous=>previous.map((old,i)=>(scope==='all'||(room===5?i===activeSouthIndianFloor:i===room))?{...old,size:newSizeStr}:old))
    setApplied(`${tile.name} size updated to ${formatTileSizeLabel(newSizeStr)} (${newSizeStr})`)
  }
  const styleWall = (patch: Partial<WallStyle>, clearTile = false) => {
    const wallTarget = activeWall
    setWallStyles(previous => {
      const cur = previous[wallTarget] ?? { color: defaultWalls[activeWallRoom], design: 'paint' }
      const next = { ...cur, ...patch }
      if (clearTile) {
        delete next.image
        delete next.normal
        delete next.roughness
        delete next.repeat
        delete next.size
        delete next.orientation
      }
      return { ...previous, [wallTarget]: next }
    })
  }
  const findWallTile = (wId: number, styles = wallStyles): Tile | null => {
    const style = styles[wId]
    if (!style?.image) return null
    const matched = wallTiles.find(t => t.image === style.image)
    const size = style.size || matched?.size || "4' × 2' (1200 × 600 mm)"
    const orientation = style.orientation || matched?.orientation || 'Landscape'
    if (matched) return { ...matched, size, orientation }
    return {
      id: `WALL-${wId}`,
      name: 'Wall Tile',
      family: 'Pattern',
      color: '#ffffff',
      vein: '#ffffff',
      finish: 'Gloss',
      size,
      orientation,
      image: style.image,
      repeat: style.repeat ?? 4,
      surface: 'Wall' as const,
      builtIn: false,
      sortOrder: 999
    }
  }
  const handleSelectSize = (sizeKey: '4x2' | '2x2' | '1x1') => {
    const match = SIZE_VARIATIONS.find(v => v.id === sizeKey)
    const sizeStr = match ? match.sizeString : "4' × 2' (1200 × 600 mm)"

    if (isViewingWall && activeWallTile) {
      setSelectedWallTile(prev => prev ? { ...prev, size: sizeStr } : { ...activeWallTile, size: sizeStr })
      styleWall({ size: sizeStr })
      if (isBathroomLayer || (activeWall >= 16 && activeWall <= 20)) {
        const { baseWall } = getBathroomBaseAndLayer(activeWall)
        const currentImg = wallStyles[activeWall]?.image
        if (currentImg) {
          setWallStyles(prev => {
            const next = { ...prev }
            for (let l = 0; l < 7; l++) {
              const layerId = baseWall * 10 + l
              if (next[layerId]?.image === currentImg) {
                next[layerId] = { ...next[layerId], size: sizeStr }
              }
            }
            return next
          })
        }
      }
      setApplied(`${activeWallTile.name} wall tile size updated to ${formatTileSizeLabel(sizeStr)} (${sizeStr})`)
    } else {
      setSelected(previous => previous.map((old, i) => (scope === 'all' || (room === 5 ? i === activeSouthIndianFloor : i === currentFloorIndex)) ? { ...old, size: sizeStr } : old))
      setApplied(`${activeSelectedTile?.name ?? 'Tile'} size updated to ${formatTileSizeLabel(sizeStr)} (${sizeStr})`)
    }
  }
  const handleSelectOrientation = (orientation: 'Landscape' | 'Portrait') => {
    if (isViewingWall && activeWallTile) {
      setSelectedWallTile(prev => prev ? { ...prev, orientation } : { ...activeWallTile, orientation })
      styleWall({ orientation })
      if (isBathroomLayer || (activeWall >= 16 && activeWall <= 20)) {
        const { baseWall } = getBathroomBaseAndLayer(activeWall)
        const currentImg = wallStyles[activeWall]?.image
        if (currentImg) {
          setWallStyles(prev => {
            const next = { ...prev }
            for (let l = 0; l < 7; l++) {
              const layerId = baseWall * 10 + l
              if (next[layerId]?.image === currentImg) {
                next[layerId] = { ...next[layerId], orientation }
              }
            }
            return next
          })
        }
      }
      setApplied(`${activeWallTile.name} wall layout updated to ${orientation === 'Portrait' ? 'Vertical' : 'Horizontal'}`)
    }
  }
  const useOnWall=(value:Tile, orientationOverride?:TileOrientation)=>{
    if(!value.image)return;
    const tileIs1x1_5 = is1x1_5(value.size)
    const effectiveOrientation = tileIs1x1_5 ? 'Landscape' : (orientationOverride ?? value.orientation ?? 'Landscape')
    setSelectedWallTile(value);
    setSelectedTileCardOpen(true);
    styleWall({color:'#ffffff',design:'paint',image:value.image,normal:value.normal,roughness:value.roughness,repeat:value.repeat,size:value.size,orientation:effectiveOrientation});
    setApplied(`${value.name} (${effectiveOrientation.toLowerCase()}) applied to the selected wall section`);
    setModal(null)
  }
  const useOnFloor=(value:Tile,targetRoom:number)=>{
    if (isBathroomTile(value) && targetRoom !== 4) {
      setNotice('Bathroom tiles can only be placed in the bathroom.')
      return
    }
    const actualRoom=targetRoom>=5&&targetRoom<=8?5:targetRoom;
    setSelected(previous=>previous.map((old,i)=>i===targetRoom?value:old));
    setRoom(actualRoom);
    if(targetRoom>=5&&targetRoom<=8)setActiveSouthIndianFloor(targetRoom);
    setSelectedWallTile(null);
    setSelectedTileCardOpen(true);
    setApplied(`${value.name} applied to ${(targetRoom>=5&&targetRoom<=8?getFloorDisplayLabel(targetRoom):roomNames[targetRoom]).toLowerCase()}`)
  }
  const readUpload=(file:File|undefined)=>{if(!file)return;if(!file.type.startsWith('image/'))return setNotice('Please choose a JPG, PNG or WebP texture image.');if(file.size>5*1024*1024)return setNotice('Please use an image below 5 MB for a smooth preview.');const reader=new FileReader();reader.onload=()=>setUploadImage(String(reader.result));reader.readAsDataURL(file)}
  const addDesign=async()=>{
    const code=uploadCode.trim().toUpperCase();if(!uploadImage||!uploadName.trim()||!code)return setNotice('Add a tile code, design name and texture image first.');
    if(!/^[A-Z0-9][A-Z0-9-]{2,24}$/.test(code))return setNotice('Use a code like AT-W-1001: letters, numbers and hyphens only.');
    const existing=catalogTiles.find(tile=>tile.id.toUpperCase()===code);
    if(existing?.builtIn)return setNotice(`${code} belongs to the built-in catalog. Use your own code.`);
    const tileIs1x1_5 = is1x1_5(uploadSize)
    const effectiveOrientation = tileIs1x1_5 ? 'Landscape' : uploadOrientation
    const draft:Tile={id:code,name:uploadName.trim(),family:uploadFamily,color:'#d8d4cb',vein:'#7e786f',finish:uploadFinish.trim()||'Matt',size:uploadSize,image:uploadImage,repeat:2.5,surface:uploadSurface,orientation:effectiveOrientation,builtIn:false,sortOrder:1000,isBathroomOnly:tileIs1x1_5};
    try{const design=await saveCustomTile(draft);setCatalogTiles(previous=>existing?previous.map(item=>item.id===design.id?design:item):[...previous,design]);apply(design);setUploadImage('');setUploadName('');setUploadCode('');setUploadFinish('Matt');setUploadSize(TILE_SIZES[0]);setUploadOrientation('Landscape');setCollectionSurface(uploadSurface==='Wall'?'Wall':uploadSurface==='Floor'?'Floor':'All');setFilter('All');setQuery('');setOnlySaved(false);setUploadSurface('Both');setModal('collections');setNotice(`${design.name} (${code}) [${uploadSize}] ${existing?'updated':'saved'} permanently for wall and floor preview.`)}catch{setNotice('Could not save this tile. Check the FastAPI backend and try again.')}
  }
  const share=async()=>{const url=new URL(location.href);url.searchParams.set('surfaces',selected.map(t=>t.id).join(','));url.searchParams.set('walls',Object.values(wallStyles).map(s=>s.color).join(','));url.searchParams.set('patterns',Object.values(wallStyles).map(s=>s.design).join(','));url.searchParams.set('room',String(room));try{await navigator.clipboard.writeText(url.toString());setNotice('Design link copied with every wall colour, finish and tile.')}catch{setNotice('Copy this design link from the address bar.');history.replaceState(null,'',url)}}
  const toggleGyro=async()=>{if(gyro){setGyro(false);setNotice('Gyroscope look disabled.');return}if(!('DeviceOrientationEvent' in window)){setNotice('This phone/browser does not expose a gyroscope. Touch drag is still available.');return}const requestPermission=(DeviceOrientationEvent as unknown as {requestPermission?:()=>Promise<string>}).requestPermission;if(requestPermission){try{if(await requestPermission()!=='granted'){setNotice('Motion permission was denied. Enable it in browser settings to use gyro look.');return}}catch{setNotice('Motion permission could not be requested. Tap the button again.');return}}setWalking(true);setGyro(true);setNotice('Gyroscope look enabled. Move your phone to look around.')}
  if(!tile)return <main className="app min-h-screen"><div className="loading-view" role="status"><span className="loading-orbit"/><p>{catalogError||'Loading the MJP Ceramics catalog from the showroom server…'}</p>{catalogError&&<button className="dark-button" onClick={()=>location.reload()}>RETRY CATALOG</button>}</div></main>
  const filtered=catalogTiles.filter(t=>{
    const surfaceMatches = collectionSurface==='All'||!t.builtIn||(collectionSurface==='Wall'?(t.surface==='Wall'||t.surface==='Both'):t.surface!=='Wall')
    const familyMatches = filter==='All'||t.family===filter
    const savedMatches = !onlySaved||saved.includes(t.id)
    const queryMatches = `${t.name} ${t.family} ${t.id}`.toLowerCase().includes(query.toLowerCase())
    const bathroomMatches = isBathroomTile(t) ? (activeWallRoom===4 || room===4) : true
    return surfaceMatches && familyMatches && savedMatches && queryMatches && bathroomMatches
  })
  const previewTiles=tiles.slice(0,7),remainingTiles=Math.max(0,tiles.length-previewTiles.length)
  const activeWallStyle=wallStyles[activeWall]??{color:defaultWalls[activeWallRoom]??'#ffffff',design:'paint'}
  const activeWallTile=selectedWallTile??(activeWallStyle.image?findWallTile(activeWall):null)
  const isViewingWall=Boolean(selectedWallTile||(quickPaint&&activeWallStyle.image))
  const activeSelectedTile=(isViewingWall&&activeWallTile)?activeWallTile:(selected[currentFloorIndex]??tile)

  return <main className="app min-h-screen">
    <header className="topbar tv-header-nav">
      <a
        className="tv-topbar-brand"
        href="#"
        aria-label="MJP Ceramics home"
        onClick={(e) => {
          e.preventDefault()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      >
        <div className="tv-logo-diamond-icon" aria-hidden="true">
          <span className="tv-d1" />
          <span className="tv-d2" />
          <span className="tv-d3" />
          <span className="tv-d4" />
        </div>
        <div className="tv-brand-text">
          <span className="tv-brand-title">MJP Ceramics</span>
          <span className="tv-brand-subtitle">TILES &amp; MORE</span>
        </div>
      </a>

      <nav aria-label="Main navigation" className={`tv-main-nav ${menu ? 'open' : ''}`}>
        <button
          type="button"
          className="tv-nav-link active"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            setMenu(false)
          }}
        >
          Home
        </button>
        <button
          type="button"
          className="tv-nav-link"
          aria-label="COLLECTIONS"
          onClick={() => {
            openCatalog()
            setMenu(false)
          }}
        >
          Collections
        </button>
        <button
          type="button"
          className="tv-nav-link"
          onClick={() => {
            openCatalog(false, 'Wall')
            setMenu(false)
          }}
        >
          Wall Tiles
        </button>
        <button
          type="button"
          className="tv-nav-link"
          onClick={() => {
            setModal('inspiration')
            setMenu(false)
          }}
        >
          Inspiration
        </button>
        <button
          type="button"
          className="tv-nav-link"
          onClick={() => {
            document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth' })
            setMenu(false)
          }}
        >
          Journal
        </button>
        <button
          type="button"
          className="tv-nav-link"
          onClick={() => {
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
            setMenu(false)
          }}
        >
          Contact
        </button>
        <button
          type="button"
          className="tv-nav-explore-btn"
          aria-label="Step inside 3D Walkthrough"
          onClick={() => {
            requestStepInside()
            setMenu(false)
          }}
          title="Step inside 3D Walkthrough (Requires login)"
        >
          <Footprints size={14} className="text-amber-400" />
          <span>STEP INSIDE</span>
        </button>
      </nav>

      <div className="tv-header-actions">
        <div className="header-tile-size-pill" title={`Current tile size: ${formatTileSizeLabel(tile.size)} (${tile.size})`}>
          <Grid2X2 size={13} />
          <span className="size-tag">SIZE</span>
          <span className="size-val">{formatTileSizeLabel(tile.size)}</span>
        </div>
        <button
          type="button"
          className="tv-header-icon-btn"
          title="Search Tiles"
          aria-label="Search Tiles"
          onClick={() => openCatalog()}
        >
          <Search size={19} />
        </button>
        <button
          type="button"
          className={`tv-header-icon-btn ${isExploreAuthorized ? 'tv-auth-active' : ''}`}
          title={isExploreAuthorized ? `3D Studio Authorized · ${getRemainingSessionMinutes()} min remaining (Click to lock)` : 'Showroom Access (Sign in)'}
          aria-label="User Account"
          onClick={() => {
            if (isExploreAuthorized) {
              lockExplore()
            } else {
              setAuthModalOpen(true)
            }
          }}
        >
          <User size={19} />
          {isExploreAuthorized && <span className="tv-auth-dot" />}
        </button>
        <button
          type="button"
          className="tv-header-icon-btn tv-cart-icon-btn"
          title={`Saved Favorites (${saved.length})`}
          aria-label={`Saved Favorites, ${saved.length}`}
          onClick={() => openCatalog(true)}
        >
          <ShoppingBag size={19} />
          <span className="tv-cart-badge">{saved.length}</span>
        </button>
        {isExploreAuthorized && (
          <button
            type="button"
            className="tv-header-icon-btn"
            title="Lock 3D Studio (Sign out)"
            aria-label="Lock 3D Studio"
            onClick={() => lockExplore()}
          >
            <Lock size={17} />
          </button>
        )}
        <button
          type="button"
          className="tv-menu-toggle-btn"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
    <section id="showroom" className={`viewer live-viewer ${walking?'is-walking':''} ${gyro?'is-gyro':''} ${stereo?'is-stereo':''} ${paintOpen?'paint-open':''} ${quickPaint?'quick-paint-open':''} ${quickFloorRoom!==null?'quick-floor-open':''}`} aria-label="3D tile showroom">
      <Walkthrough onBrowse={()=>openCatalog()} ref={view} selected={selected} wallStyles={wallStyles} walking={walking} stereo={stereo} gyro={gyro} brightness={brightness} floorGlare={floorGlare} initialRoom={defaultRoom} paused={false} onRoom={setRoom} onWallPick={id=>{setActiveWall(id);setPaintOpen(false);setQuickFloorRoom(null);setQuickPaint(true);const wt=findWallTile(id);setSelectedWallTile(wt);setSelectedTileCardOpen(true)}} onFloorPick={id=>{const isSouthIndian=id>=5&&id<=8;setRoom(isSouthIndian?5:id);if(isSouthIndian)setActiveSouthIndianFloor(id);setPaintOpen(false);setQuickPaint(false);setQuickFloorRoom(id);setSelectedWallTile(null);setSelectedTileCardOpen(true)}} onWalking={setWalking} onGyro={setGyro} onNotice={setNotice} onReady={()=>setReady(true)} onXR={setXR}/>
      {!ready&&<div className="loading-view" role="status"><span className="loading-orbit"/>Opening your residence…</div>}
      {!walking&&!stereo&&<div className="title-block"><p className="eyebrow"><span/> MJP CERAMICS / THE LIVE DESIGN STUDIO</p><h1>Make room for<br/><i>your vision.</i></h1><p className="subcopy">Choose the tile. Paint the walls.<br/>Walk through a home that feels like yours.</p><button className="enter-button" disabled={!ready} onClick={()=>requestStepInside()}><Footprints size={17}/> STEP INSIDE <MoveRight size={18}/></button><small className="drag-hint">Or drag the room to look around</small></div>}
      {gyro&&<button className="gyro-exit" onClick={()=>void toggleGyro()} aria-label="Exit gyroscope look"><Smartphone size={15}/> EXIT GYRO</button>}
      <div className="mode-switch"><button className={!stereo?'selected':''} onClick={()=>setStereo(false)}><Eye size={15}/> Normal view</button><button className={stereo?'selected':''} onClick={()=>setModal('vr')}><span className="headset-icon" aria-hidden="true">◉◉</span> VR mode</button></div>
      <div className="view-tools"><button title={gyro?'Disable gyroscope look':'Enable gyroscope look'} aria-label={gyro?'Disable gyroscope look':'Enable gyroscope look'} aria-pressed={gyro} className={gyro?'tool-active gyro-tool':''} onClick={()=>void toggleGyro()}><Smartphone size={18}/></button><button title="How to explore" aria-label="Walkthrough instructions" onClick={()=>setModal('guide')}><Footprints size={18}/></button><button title="Fullscreen" aria-label="Toggle fullscreen" onClick={()=>view.current?.fullscreen()}><Expand size={18}/></button><button title="Share your design" aria-label="Copy design link" onClick={()=>void share()}><Share2 size={18}/></button><button title="Lock 3D Studio" aria-label="Lock 3D Studio" onClick={() => lockExplore()}><Lock size={18}/></button></div>
      {selectedTileCardOpen && !stereo && !paintOpen && !gyro && (
        <SelectedTileCard
          tile={activeSelectedTile}
          isWall={isViewingWall}
          onClose={()=>setSelectedTileCardOpen(false)}
          onSelectSize={handleSelectSize}
          onSelectOrientation={handleSelectOrientation}
        />
      )}
      {quickPaint&&<div className="wall-quickbar" aria-label="Selected wall quick colours and designs">
        <div className="quickbar-top"><span><Paintbrush size={14}/> {roomNames[activeWallRoom]} / {activeWallLabel}</span><button aria-label="Close wall colours" onClick={()=>setQuickPaint(false)}><X size={15}/></button></div>
        <div className="quickbar-wall-tabs" aria-label="Choose which wall to customize">
          {activeWallRoom===4?([16,17,18,19,20].map(bw=>{const bLabel=bw===20?'Shower':wallSides[bw%4].replace(' wall','');const {baseWall,layer}=getBathroomBaseAndLayer(activeWall);const isActive=baseWall===bw;return <button key={bw} className={`quick-wall-btn ${isActive?'active':''}`} onClick={()=>{const targetId=bw*10+layer;setActiveWall(targetId);setSelectedWallTile(findWallTile(targetId))}}>{bLabel}</button>})):(wallSides.map((side,sIdx)=><button key={side} className={`quick-wall-btn ${(activeWall<20?activeWall%4===sIdx:roomWallId(activeWallRoom,sIdx)===activeWall)?'active':''}`} onClick={()=>{const targetId=roomWallId(activeWallRoom,sIdx);setActiveWall(targetId);setSelectedWallTile(findWallTile(targetId))}}>{side.replace(' wall','')}{sIdx===2?' ★':''}</button>))}
        </div>
        {activeWallRoom===4&&<div className="layer-selector-bar" aria-label="Bathroom 7 horizontal wall sections"><span className="layer-bar-title">7 FT WALL SECTION:</span>{[0,1,2,3,4,5,6].map(lIdx=>{const {baseWall,layer}=getBathroomBaseAndLayer(activeWall);const targetId=baseWall*10+lIdx;const isActive=layer===lIdx;return <button key={lIdx} className={`layer-btn ${isActive?'active':''}`} aria-pressed={isActive} title={bathroomSectionLabels[lIdx]} onClick={()=>{setActiveWall(targetId);setSelectedWallTile(findWallTile(targetId))}}>Sec {lIdx+1}</button>})}</div>}
        <div className="quick-colours">{paintSwatches.map(s=><button key={s.color} className={activeWallStyle.color.toLowerCase()===s.color.toLowerCase()?'active':''} title={s.name} aria-label={`${s.name} wall colour`} aria-pressed={activeWallStyle.color.toLowerCase()===s.color.toLowerCase()} style={{backgroundColor:s.color}} onClick={()=>{styleWall({color:s.color},true);setSelectedWallTile(null)}}/>) }<label className="quick-custom" title="Custom wall colour"><input type="color" aria-label="Custom selected wall colour" value={activeWallStyle.color} onChange={e=>{styleWall({color:e.target.value},true);setSelectedWallTile(null)}}/><Paintbrush size={14}/></label></div>
        {activeWallRoom===4?(<div className="quickbar-batch-actions" style={{margin:'12px 0 6px'}}><button onClick={()=>{const {baseWall}=getBathroomBaseAndLayer(activeWall);const cur=wallStyles[activeWall];setWallStyles(prev=>{const next={...prev};for(let l=0;l<7;l++)next[baseWall*10+l]={...cur};return next});setApplied('Applied style to all 7 sections of this wall')}}>Apply to all 7 sections</button><button onClick={()=>{const cur=wallStyles[activeWall];setWallStyles(prev=>{const next={...prev};for(let bw=16;bw<=20;bw++)for(let l=0;l<7;l++)next[bw*10+l]={...cur};return next});setApplied('Applied style to all bathroom wall sections')}}>Apply to all bathroom walls</button></div>):(<div className="quickbar-batch-actions" style={{margin:'12px 0 6px',display:activeWall===bathroomShowerWallId||activeWall===backsplashId?'none':undefined}}><button onClick={()=>{const base=Math.floor(activeWall/4)*4,count=4,cur=wallStyles[activeWall];setWallStyles(prev=>{const next={...prev};for(let i=base;i<base+count;i++)next[i]={...cur};return next});setApplied(`Applied style to all 4 walls in ${roomNames[activeWallRoom]}`)}}>Apply to all 4 walls</button><button onClick={()=>{const base=Math.floor(activeWall/4)*4,count=4,def=defaultWalls[activeWallRoom];setWallStyles(prev=>{const next={...prev};for(let i=base;i<base+count;i++)next[i]={color:def,design:'paint'};return next});setApplied(`Reset walls in ${roomNames[activeWallRoom]} to designer palette`)}}>Reset room palette</button></div>)}
        <div className="surface-quick-label"><span>WALL TILES</span><button onClick={()=>openCatalog(false,'Wall')}>VIEW ALL</button></div>
        <div className="surface-quick-list" aria-label="Wall tile designs">{wallTiles.map(t=>{
          const tileIs1x1_5 = is1x1_5(t.size)
          const tileIs2x2 = is2x2(t.size)
          const isSelected = (Boolean(activeWallStyle.image) && activeWallStyle.image === t.image) || (selectedWallTile?.id === t.id)
          const displaySize = getTileDisplaySize(t.size)
          return <div key={t.id} className="quick-wall-tile-item" style={{display:'flex',flexDirection:'column',gap:3}}>
            <button className={isSelected?'active':''} aria-label={`Apply ${t.name} to selected wall`} title={`${t.name} · ${t.id} (${displaySize})`} onClick={()=>{useOnWall(t);setSelectedWallTile(t);setSelectedTileCardOpen(true)}}>
              <img src={sampleUrl(t)} alt=""/><div className="floor-tile-info"><span className="floor-tile-name">{t.name}</span><span className="floor-tile-size-badge">{displaySize}</span></div>
            </button>
            {tileIs2x2 && <div className="tile-orientation-btns" style={{display:'flex',gap:2,padding:'0 4px'}}>
              <button style={{fontSize:'8px',padding:'2px 4px',background:'#ece5d8',border:'1px solid #ccc',flex:1}} onClick={(e)=>{e.stopPropagation();useOnWall(t,'Landscape');setSelectedWallTile(t);setSelectedTileCardOpen(true)}}>Horiz</button>
              <button style={{fontSize:'8px',padding:'2px 4px',background:'#ece5d8',border:'1px solid #ccc',flex:1}} onClick={(e)=>{e.stopPropagation();useOnWall(t,'Portrait');setSelectedWallTile(t);setSelectedTileCardOpen(true)}}>Vert</button>
            </div>}
            {tileIs1x1_5 && <span style={{fontSize:'7.5px',color:'#758273',textAlign:'center'}}>Horizontal Only</span>}
          </div>
        })}</div>
        <div className="quick-designs" aria-label="Selected wall design">{wallDesigns.map(design=><button key={design} aria-pressed={activeWallStyle.design===design} className={activeWallStyle.design===design?'active':''} onClick={()=>styleWall({design})}>{finishNames[design]}</button>)}</div>
      </div>}
      {quickFloorRoom!==null&&<div className="floor-quickbar" aria-label="Floor tile quick selector">
        <div className="quickbar-top">
          <span><Grid2X2 size={14}/> {quickFloorRoom>=5&&quickFloorRoom<=8?`Modern House Entrance / ${getFloorDisplayLabel(quickFloorRoom).toUpperCase()}`:`${roomNames[quickFloorRoom]} / FLOOR TILES`}</span>
          <button aria-label="Close floor tiles" onClick={()=>setQuickFloorRoom(null)}><X size={15}/></button>
        </div>
        {quickFloorRoom>=5&&quickFloorRoom<=8&&(
          <div className="floor-surface-tabs" aria-label="Choose which floor surface to tile">
            {[
              {id:5,label:'Hall Floor'},
              {id:6,label:'Entrance'},
              {id:7,label:'Car Parking'},
              {id:8,label:'Portico'}
            ].map(tab=>(
              <button
                key={tab.id}
                className={`floor-surface-tab-btn ${quickFloorRoom===tab.id?'active':''}`}
                onClick={()=>{
                  setQuickFloorRoom(tab.id)
                  setActiveSouthIndianFloor(tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="surface-quick-list floor-list">{quickFloorTiles.map(t=>{const isSelected=selected[quickFloorRoom]?.id===t.id;const displaySize=getTileDisplaySize(t.size);return <button key={t.id} className={isSelected?'active':''} aria-label={`Apply ${t.name} (${displaySize}) to ${getFloorDisplayLabel(quickFloorRoom).toLowerCase()}`} aria-pressed={isSelected} title={`${t.name} – ${displaySize}`} onClick={()=>{useOnFloor(t,quickFloorRoom);setSelectedTileCardOpen(true)}}><img src={sampleUrl(t)} alt=""/><div className="floor-tile-info"><span className="floor-tile-name">{t.name}</span><span className="floor-tile-size-badge">{displaySize}</span></div></button>})}</div>
        <div className="floor-quick-footer"><span>{selected[quickFloorRoom]?.name} · {selected[quickFloorRoom]?.id}</span><div className="floor-quick-footer-actions"><button onClick={()=>openCatalog(false,'Floor')}>VIEW ALL <MoveRight size={14}/></button></div></div>
      </div>}

      {paintOpen&&<div className="paint-panel" aria-label="Wall colour studio"><div className="paint-panel-heading"><span>01 / WALL STUDIO</span><button aria-label="Close wall colours" onClick={()=>setPaintOpen(false)}><X size={17}/></button></div><h2>Make every wall yours.</h2><p>Click a wall in the 3D home, or select it below. Colour and design apply only to that wall.</p><div className="paint-rooms" aria-label="Choose room to paint">{roomNames.map((name,i)=><button key={name} className={activeWallRoom===i?'active':''} aria-pressed={activeWallRoom===i} onClick={()=>jump(i)}>{name}</button>)}</div><div className="wall-selector" aria-label="Choose an individual wall">{activeWallRoom===4?([16,17,18,19,20].map(bw=>{const bLabel=bw===20?'Shower wall':wallSides[bw%4];const {baseWall,layer}=getBathroomBaseAndLayer(activeWall);const isActive=baseWall===bw;return <button key={bw} className={isActive?'active':''} aria-pressed={isActive} onClick={()=>setActiveWall(bw*10+layer)}>{bLabel}</button>})):(wallSides.map((side,i)=><button key={side} className={activeWall===roomWallId(activeWallRoom,i)?'active':''} aria-pressed={activeWall===roomWallId(activeWallRoom,i)} onClick={()=>setActiveWall(roomWallId(activeWallRoom,i))}>{side}</button>))}{activeWallRoom===3&&<button className={activeWall===backsplashId?'active':''} aria-pressed={activeWall===backsplashId} onClick={()=>setActiveWall(backsplashId)}>Backsplash</button>}</div>{activeWallRoom===4&&<div className="layer-selector-bar" aria-label="Bathroom 7 horizontal wall sections"><span className="layer-bar-title">7 FT WALL SECTION:</span>{[0,1,2,3,4,5,6].map(lIdx=>{const {baseWall,layer}=getBathroomBaseAndLayer(activeWall);const targetId=baseWall*10+lIdx;const isActive=layer===lIdx;return <button key={lIdx} className={`layer-btn ${isActive?'active':''}`} aria-pressed={isActive} title={bathroomSectionLabels[lIdx]} onClick={()=>setActiveWall(targetId)}>Sec {lIdx+1}</button>})}</div>}<span className="paint-section-label">COLOUR / {roomNames[activeWallRoom].toUpperCase()} · {activeWallLabel.toUpperCase()}</span><div className="paint-swatches" aria-label="Wall colour presets">{paintSwatches.map(s=><button key={s.color} title={s.name} aria-label={`${s.name} wall colour`} aria-pressed={activeWallStyle.color.toLowerCase()===s.color} style={{backgroundColor:s.color}} onClick={()=>styleWall({color:s.color})}>{activeWallStyle.color.toLowerCase()===s.color&&<Check size={14}/>}</button>)}</div><label className="custom-paint"><span><Paintbrush size={15}/> CUSTOM COLOUR</span><input type="color" aria-label={`Custom wall colour for ${roomNames[activeWallRoom]} ${activeWallLabel}`} value={activeWallStyle.color} onChange={e=>styleWall({color:e.target.value})}/><b>{activeWallStyle.color.toUpperCase()}</b></label>{activeWallRoom===4?(<div className="quickbar-batch-actions" style={{margin:'12px 0 6px'}}><button onClick={()=>{const {baseWall}=getBathroomBaseAndLayer(activeWall);const cur=wallStyles[activeWall];setWallStyles(prev=>{const next={...prev};for(let l=0;l<7;l++)next[baseWall*10+l]={...cur};return next});setApplied('Applied style to all 7 sections of this wall')}}>Apply to all 7 sections</button><button onClick={()=>{const cur=wallStyles[activeWall];setWallStyles(prev=>{const next={...prev};for(let bw=16;bw<=20;bw++)for(let l=0;l<7;l++)next[bw*10+l]={...cur};return next});setApplied('Applied style to all bathroom wall sections')}}>Apply to all bathroom walls</button></div>):(<div className="quickbar-batch-actions" style={{margin:'12px 0 6px',display:activeWall===bathroomShowerWallId||activeWall===backsplashId?'none':undefined}}><button onClick={()=>{const base=Math.floor(activeWall/4)*4,count=4,cur=wallStyles[activeWall];setWallStyles(prev=>{const next={...prev};for(let i=base;i<base+count;i++)next[i]={...cur};return next});setApplied(`Applied style to all 4 walls in ${roomNames[activeWallRoom]}`)}}>Apply to all 4 walls</button><button onClick={()=>{const base=Math.floor(activeWall/4)*4,count=4,def=defaultWalls[activeWallRoom];setWallStyles(prev=>{const next={...prev};for(let i=base;i<base+count;i++)next[i]={color:def,design:'paint'};return next});setApplied(`Reset walls in ${roomNames[activeWallRoom]} to designer palette`)}}>Reset room palette</button></div>)}<button className="reset-paint" onClick={()=>styleWall({color:defaultWalls[activeWallRoom],design:'paint'})}>Reset selected wall</button></div>}
      <div className="scene-status"><span/> LIVE 3D <i/> {room===5?`Modern House Entrance · ${getFloorDisplayLabel(activeSouthIndianFloor)}`:roomNames[room]}</div>
      {walking&&<button className="exit-walk" onClick={()=>setWalking(false)}><X size={15}/> Exit walkthrough</button>}
      <div className="room-nav"><p>EXPLORE THE HOME <span className="room-nav-note">/ SELECT A ROOM OR WALK THROUGH</span></p><div>{roomNames.map((name,i)=><button key={name} className={room===i?'current':''} aria-pressed={room===i} onClick={()=>jump(i)}><span className="room-number">0{i+1}</span><span>{name}</span></button>)}</div></div>
      <div className="viewer-lighting-controls">
        <label className="daylight-control"><Sun size={16}/><span>DAYLIGHT</span><input type="range" aria-label="Room brightness" min="0.55" max="1.45" step="0.05" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>
        <label className="daylight-control floor-glare-control"><Sparkles size={15}/><span>FLOOR GLARE</span><input type="range" aria-label="Floor glare / reflection" min="0" max="1" step="0.05" value={floorGlare} onChange={e=>setFloorGlare(Number(e.target.value))}/></label>
      </div>
    </section>
    <section className="selection-panel">
      <div className="collection-title"><p>CURATED FOR YOUR HOME</p><h2>Made for <i>moments</i><br/>that matter.</h2><button className="all-tiles" onClick={()=>openCatalog()}>EXPLORE ALL {tiles.length} SURFACES <MoveRight size={17}/></button><div className="material-dots">{previewTiles.map(t=><button key={t.id} aria-label={`Apply ${t.name}`} aria-pressed={t.id===tile.id} onClick={()=>apply(t)} style={{backgroundImage:`url(${sampleUrl(t)})`}}/>)}{remainingTiles>0&&<button className="more-dots" aria-label={`Show all ${tiles.length} floor tile designs`} onClick={()=>openCatalog()}>+{remainingTiles}</button>}</div></div>
      <div className="tile-stage"><button className="tile-swatch real-swatch" style={{backgroundImage:`url(${sampleUrl(tile)})`}} aria-label={`View ${tile.name} details`} onClick={()=>setModal('details')}><span>MJP CERAMICS / {tile.id}</span><ArrowUpRight size={18}/></button><div className="tile-arrows"><button aria-label="Previous tile" onClick={()=>apply(tiles[(current+tiles.length-1)%tiles.length])}><ChevronLeft size={22}/></button><span>{String(current+1).padStart(2,'0')} <i>/</i> {tiles.length}</span><button aria-label="Next tile" onClick={()=>apply(tiles[(current+1)%tiles.length])}><ChevronRight size={22}/></button></div></div>
      <div className="product-info"><div className="product-heading"><p>YOUR SELECTED SURFACE</p><h3>{tile.name}</h3><span>{tile.id} · {tile.size}</span></div><p className="description">{tile.family} inspired porcelain. A {tile.finish.toLowerCase()} finish, considered in every detail. See this surface at scale as you move through your home.</p><label className="apply-scope">APPLY TO <select aria-label="Tile application scope" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Whole house</option><option value="room">{room===5?`${getFloorDisplayLabel(activeSouthIndianFloor)} only`:`${roomNames[room]} only`}</option></select></label><div className="info-footer"><button className="details" onClick={()=>setModal('details')}>SURFACE DETAILS <MoveRight size={16}/></button><button className={isLiked?'heart liked':'heart'} aria-label={isLiked?'Unsave selected tile':'Save selected tile'} aria-pressed={isLiked} onClick={()=>toggleSave(tile.id)}><Heart fill={isLiked?'currentColor':'none'} size={20}/></button></div><p className="applied-note" aria-live="polite"><Check size={12}/>{applied||'Surface applied throughout the residence'}</p></div>
    </section>
    <section id="journal" className="journal-section"><div className="section-intro"><p>MJP CERAMICS / DESIGN JOURNAL</p><h2>Ideas for a home<br/><i>made personal.</i></h2><span>Practical material guidance, colour pairings and thoughtful ways to use tile.</span></div><div className="journal-grid">{articles.map((item,index)=><article key={item.id} className={index===0?'featured':''}><button className="journal-image" onClick={()=>{setArticleId(item.id);setModal('blog')}}><img src={item.image} alt={item.imageAlt} loading="lazy"/><span>{item.category}</span></button><div><small>{item.readTime}</small><h3>{item.title}</h3><p>{item.excerpt}</p><button className="read-article" onClick={()=>{setArticleId(item.id);setModal('blog')}}>READ STORY <ArrowUpRight size={15}/></button></div></article>)}</div></section>
    <section id="contact" className="relative isolate overflow-hidden bg-[#073d37] px-5 py-20 text-[#f7f2e8] sm:px-8 lg:px-[7vw] lg:py-28">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px)',backgroundSize:'52px 52px'}}/>
      <div className="pointer-events-none absolute -right-36 -top-44 h-[520px] w-[520px] rounded-full bg-[#16a394]/25 blur-3xl"/>
      <div className="relative mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
        <div className="flex flex-col justify-between">
          <div>
            <p className="mb-7 flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[.24em] text-[#ffb65e]"><span className="h-px w-9 bg-[#ffb65e]"/>MJP CERAMICS · THIRUVERUMBUR</p>
            <h2 className="max-w-xl font-serif text-[clamp(46px,5.2vw,78px)] font-medium leading-[.94] tracking-[-.045em] text-white">Let’s shape your<br/><i className="font-normal text-[#ffd18a]">space together.</i></h2>
            <p className="mt-8 max-w-lg text-[15px] leading-7 text-[#d7e6df]">Bring your room measurements, references or saved MJP design. Our surface specialists will help you move confidently from digital preview to physical sample.</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-lg">
            {['Expert tile guidance','Physical samples','Room-wise planning','VR design preview'].map((service,index)=><div key={service} className="flex items-center gap-3 border border-white/15 bg-white/[.055] px-4 py-3 text-[11px] text-[#e4eee8] backdrop-blur-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#ffb65e] font-mono text-[9px] font-bold text-[#173d36]">0{index+1}</span>{service}</div>)}
          </div>
        </div>
        <div className="rounded-sm border border-white/15 bg-[#f7f3e9] p-5 text-[#173d36] shadow-[0_30px_90px_rgba(0,0,0,.28)] sm:p-8">
          <div className="mb-7 flex flex-col justify-between gap-3 border-b border-[#d7ddd5] pb-6 sm:flex-row sm:items-end">
            <div><p className="font-mono text-[9px] font-bold tracking-[.18em] text-[#e76f4e]">BOOK A SHOWROOM CONSULTATION</p><h3 className="mt-2 font-serif text-3xl tracking-[-.03em] text-[#123d36]">Start your surface story.</h3></div>
            <span className="text-[11px] text-[#6b7972]">We usually respond within one business day.</span>
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            <a href="tel:+919000000000" className="group flex min-h-20 items-start gap-3 border border-[#d6ddd6] bg-white/70 p-4 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-[#e99a57] hover:shadow-md"><Phone className="mt-0.5 text-[#e76f4e]" size={18}/><span className="text-[12px] leading-5"><small className="block font-mono text-[8px] font-bold tracking-[.13em] text-[#76847c]">CALL / WHATSAPP · DEMO</small>+91 90000 00000</span></a>
            <a href="mailto:hello@mjpceramics.example" className="group flex min-h-20 items-start gap-3 border border-[#d6ddd6] bg-white/70 p-4 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-[#e99a57] hover:shadow-md"><Mail className="mt-0.5 text-[#e76f4e]" size={18}/><span className="break-all text-[12px] leading-5"><small className="block font-mono text-[8px] font-bold tracking-[.13em] text-[#76847c]">EMAIL · DEMO</small>hello@mjpceramics.example</span></a>
            <div className="flex min-h-24 items-start gap-3 border border-[#d6ddd6] bg-white/70 p-4"><MapPin className="mt-0.5 shrink-0 text-[#e76f4e]" size={18}/><span className="text-[11px] leading-[1.55]"><small className="block font-mono text-[8px] font-bold tracking-[.13em] text-[#76847c]">MJP CERAMICS SHOWROOM</small>Shri Erumbeeswarar Temple, State Highway 49, Malaikoil, Thiruverumbur, Tamil Nadu 620013</span></div>
            <div className="flex min-h-24 items-start gap-3 border border-[#d6ddd6] bg-white/70 p-4"><Clock3 className="mt-0.5 text-[#e76f4e]" size={18}/><span className="text-[12px] leading-5"><small className="block font-mono text-[8px] font-bold tracking-[.13em] text-[#76847c]">OPENING HOURS · DEMO</small>Monday–Saturday<br/>9:30 AM–7:30 PM</span></div>
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={async e=>{
            e.preventDefault();
            const fd = new FormData(e.target as HTMLFormElement);
            try {
              await saveInquiry({
                name: fd.get('name') as string,
                contact: fd.get('contact') as string,
                message: fd.get('message') as string
              });
              setNotice('Your consultation request has been sent successfully.');
              (e.target as HTMLFormElement).reset();
            } catch (err) {
              setNotice('Could not send your request at this time.');
            }
          }}>
            <label className="font-mono text-[9px] font-bold tracking-[.12em] text-[#53655c]">YOUR NAME<input className="mt-2 block w-full border border-[#cad4cd] bg-white px-4 py-3.5 font-sans text-[13px] font-normal tracking-normal text-[#173d36] outline-none transition placeholder:text-[#9aa59f] focus:border-[#0a7e73] focus:ring-2 focus:ring-[#0a7e73]/15" required name="name" placeholder="Name"/></label>
            <label className="font-mono text-[9px] font-bold tracking-[.12em] text-[#53655c]">PHONE / EMAIL<input className="mt-2 block w-full border border-[#cad4cd] bg-white px-4 py-3.5 font-sans text-[13px] font-normal tracking-normal text-[#173d36] outline-none transition placeholder:text-[#9aa59f] focus:border-[#0a7e73] focus:ring-2 focus:ring-[#0a7e73]/15" required name="contact" placeholder="Best way to reach you"/></label>
            <label className="font-mono text-[9px] font-bold tracking-[.12em] text-[#53655c] sm:col-span-2">YOUR PROJECT<textarea className="mt-2 block min-h-28 w-full resize-y border border-[#cad4cd] bg-white px-4 py-3.5 font-sans text-[13px] font-normal leading-6 tracking-normal text-[#173d36] outline-none transition placeholder:text-[#9aa59f] focus:border-[#0a7e73] focus:ring-2 focus:ring-[#0a7e73]/15" name="message" rows={3} placeholder="Rooms, measurements and surfaces you are considering"/></label>
            <button className="group mt-1 flex w-full items-center justify-center gap-3 bg-gradient-to-r from-[#ec704e] to-[#f4b34f] px-6 py-4 font-mono text-[10px] font-extrabold tracking-[.12em] text-[#173d36] shadow-[0_12px_28px_rgba(231,111,78,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(231,111,78,.35)] sm:col-span-2 sm:w-max" type="submit">REQUEST A CONSULTATION <MoveRight className="transition group-hover:translate-x-1" size={17}/></button>
          </form>
        </div>
      </div>
    </section>
    <section className="grid gap-px bg-[#315d55] text-[#e9f2ed] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr_auto]"><div className="flex items-center justify-center gap-3 bg-[#0a302c] px-5 py-6 font-mono text-[9px] tracking-[.12em]"><Grid2X2 size={17}/><span><b className="text-[#ffd18a]">{catalogTiles.length}</b> CURATED SURFACES</span></div><div className="flex items-center justify-center gap-3 bg-[#0a302c] px-5 py-6 font-mono text-[9px] tracking-[.12em]"><Sparkles size={17}/><span>REAL-TIME <b className="text-[#ffd18a]">MATERIALS</b></span></div><div className="flex items-center justify-center gap-3 bg-[#0a302c] px-5 py-6 font-mono text-[9px] tracking-[.12em]"><Home size={17}/><span><b className="text-[#ffd18a]">8</b> 3D INTERIORS</span></div><button className="flex items-center justify-center gap-3 bg-[#0d554e] px-7 py-6 font-mono text-[9px] font-bold tracking-[.12em] text-white transition hover:bg-[#117066]" onClick={()=>{document.getElementById('showroom')?.scrollIntoView({behavior:'smooth'});requestStepInside()}}>WALK THROUGH YOUR HOME <MoveRight size={17}/></button><a className="flex items-center justify-center bg-[#0a302c] px-7 py-5 font-mono text-[8px] tracking-[.1em] text-[#b9cbc3] underline-offset-4 hover:text-white hover:underline sm:col-span-2 lg:col-span-1" href="/ASSET_CREDITS.txt" target="_blank" rel="noreferrer">3D ASSET CREDITS</a></section>
    {notice&&<div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    {modal==='collections'&&<Modal title="Find your kind of beautiful." wide onClose={()=>setModal(null)}>
      <div className="wall-collection-tools">
        <div className="filter-row" aria-label="Surface collections">
          {(['All','Floor','Wall'] as const).map(surface=><button key={surface} className={collectionSurface===surface?'chosen':''} aria-pressed={collectionSurface===surface} onClick={()=>{setCollectionSurface(surface);setQuery('');setFilter('All')}}>{surface==='All'?'All surfaces':`${surface} tiles`}</button>)}
        </div>
      </div>
      {collectionSurface==='Wall'&&<div className="wall-target">
        <p>Photographic texture references. Upload your original product photo with its tile code for your showroom collection. Confirm physical samples and wall suitability with your supplier.</p>
        <label>APPLY TO WALL
          <select aria-label="Wall tile target" value={activeWall} onChange={e=>setActiveWall(Number(e.target.value))}>
            {roomNames.slice(0,4).flatMap((name,r)=>wallSides.map((side,s)=><option key={r*4+s} value={r*4+s}>{name} / {side}</option>))}
            <option value={backsplashId}>Cooking Club / Backsplash</option>
            {[16,17,18,19,20].flatMap(bw=>{
              const bLabel=bw===20?'Shower wall':wallSides[bw%4]
              return [0,1,2,3,4,5,6].map(l=><option key={bw*10+l} value={bw*10+l}>Modern Bathroom / {bLabel} — Section {l+1} of 7 ({bathroomSectionLabels[l]})</option>)
            })}
          </select>
        </label>
      </div>}
      <div className="catalog-topline">
        <p>{filtered.length} surfaces. Find your floor or wall finish.</p>
        <label>APPLY TO<select aria-label="Collection application scope" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Whole house</option><option value="room">{roomNames[room]} only</option></select></label>
      </div>
      <div className="catalog-search">
        <Search size={18}/>
        <input aria-label="Search tile collections" placeholder="Search by name, material or code…" value={query} onChange={e=>setQuery(e.target.value)}/>
        <button aria-pressed={onlySaved} className={onlySaved?'chosen':''} onClick={()=>setOnlySaved(!onlySaved)}><Heart size={16} fill={onlySaved?'currentColor':'none'}/> Saved ({saved.length})</button>
      </div>
      <div className="filter-row" aria-label="Material filters">
        {['All',...families].map(f=><button key={f} className={filter===f?'chosen':''} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}
        <span>{filtered.length} surfaces</span>
      </div>
      <div className="catalog-grid">
        {filtered.map(t=>{
          const isChosen = t.surface==='Wall' ? wallStyles[activeWall]?.image===t.image : tile.id===t.id
          return <article className={`catalog-card ${isChosen?'chosen':''}`} key={t.id}>
            <button className="sample-select" aria-label={`Apply ${t.name}`} onClick={()=>apply(t)}>
              <img src={sampleUrl(t)} alt={`${t.name} ${t.family.toLowerCase()} tile texture`} loading="lazy"/>
              {isChosen&&<span className="selected-badge"><Check size={13}/> APPLIED</span>}
              <span className="sample-action">APPLY IN YOUR HOME <MoveRight size={15}/></span>
            </button>
            <div className="card-caption">
              <button onClick={()=>apply(t)}>
                <h3>{t.name}</h3>
                <p>{t.id} · {t.surface??'Floor'}</p>
                <p>{t.family} · {t.finish}</p>
                {t.size&&<p className="card-size"><span>📐</span> {t.size}</p>}
              </button>
              <button className="save-card" aria-label={`${saved.includes(t.id)?'Unsave':'Save'} ${t.name}`} aria-pressed={saved.includes(t.id)} onClick={()=>toggleSave(t.id)}>
                <Heart size={17} fill={saved.includes(t.id)?'currentColor':'none'}/>
              </button>
            </div>
          </article>
        })}
      </div>
      {filtered.length===0&&<div className="empty-state">
        <Search size={30}/>
        <h3>No surfaces here yet.</h3>
        <p>{onlySaved?'Save a tile with the heart icon, or explore the full collection.':'Try a different name or material.'}</p>
        <button onClick={()=>{setQuery('');setFilter('All');setOnlySaved(false)}}>Show all surfaces</button>
      </div>}
      <div className="catalog-bottom">
        <span aria-live="polite"><Check size={15}/> {applied||`${tile.name} is selected`}</span>
        <button className="dark-button" onClick={()=>{setModal(null);requestStepInside(()=>{setWalking(true);document.getElementById('showroom')?.scrollIntoView({behavior:'smooth'})})}}>VIEW IN YOUR HOME <MoveRight size={16}/></button>
      </div>
    </Modal>}
    {modal==='details'&&<Modal title={tile.name} onClose={()=>setModal(null)}><img className="detail-image" src={sampleUrl(tile)} alt={`${tile.name} tile sample`}/><dl className="specs"><div><dt>Collection</dt><dd>{tile.family}</dd></div><div><dt>Finish</dt><dd>{tile.finish}</dd></div><div><dt>Dimensions</dt><dd>{tile.size}</dd></div><div><dt>Design reference</dt><dd>{tile.id}</dd></div></dl><p className="fine-print">Illustrative digital collection. Colour and finish on a screen can differ from a physical sample.</p><button className="dark-button full-width" onClick={()=>toggleSave(tile.id)}><Heart size={16} fill={isLiked?'currentColor':'none'}/>{isLiked?'REMOVE FROM SAVED':'SAVE THIS SURFACE'}</button></Modal>}
    {modal==='guide'&&<Modal title="Make yourself at home." onClose={()=>setModal(null)}><div className="guide-steps"><article><b>01</b><div><h3>Step inside</h3><p>Click Step inside, then use W/A/S/D or the arrow keys to walk. Move your mouse to look. Press Esc to release the mouse. You can also drag the view.</p></div></article><article><b>02</b><div><h3>Explore every room</h3><p>Walk through the open doorways or use the room buttons to jump directly. The floor plan shows where you are. On mobile, drag to look and hold the arrow buttons to move.</p></div></article><article><b>03</b><div><h3>Make it yours</h3><p>Open Collections and choose a surface. Apply it to the whole house or just your current room. Save favourites with the heart, or share a link to your design.</p></div></article></div><button className="dark-button full-width" onClick={()=>{setModal(null);requestStepInside()}}>LET’S EXPLORE <MoveRight size={16}/></button></Modal>}
    {modal==='inspiration'&&<Modal title="A feeling for every home." onClose={()=>setModal(null)}><p className="modal-description">Start with a considered granite palette. Choose a room-specific reference look, or a curated palette across all showroom environments. Your other rooms stay unchanged when applying a room preset.</p><div className="palette-list">{[
      {name:'Executive Suite Bedroom',room:1,tileIndex:1,wallColor:'#ded7cb',text:'Altic Gold luxury granite floor with warm layered lighting.'},
      {name:'Modern Oceanic VR Gallery',room:2,tileIndex:13,wallColor:'#ced7de',text:'A serene contemporary exhibition palette featuring deep Granite Ocean.'},
      {name:'Grand Stone Living Room',room:0,tileIndex:0,wallColor:'#e5ddd0',text:'Altic Black polished granite floor with warm ivory wall relief accents.'}
    ].map(p=>{
      const targetTile=tiles[p.tileIndex%tiles.length]??tiles[0];
      return <button key={p.name} onClick={()=>{if(targetTile)setSelected(previous=>previous.map((t,i)=>i===p.room?targetTile:t));setWallStyles(previous=>{const next={...previous};Object.keys(next).forEach(k=>{const idx=Number(k);if(Math.floor(idx/4)===p.room){next[idx]={...next[idx],color:p.wallColor,design:'paint'}}});return next});setBrightness(.95);jump(p.room);setModal(null);setApplied(p.name+' applied')}}><h3>{p.name} <ArrowUpRight size={18}/></h3><p>{p.text} Styles this room only.</p></button>
    })}{[
      {name:'Classic Luxury Granite',ids:[0,1,2,6],text:'High-contrast elegance featuring Altic Black, Altic Gold and Crystal Nut.'},
      {name:'Oceanic & Crystal Blues',ids:[3,4,8,13],text:'Fresh cool tones with Crystal Aqua, Crystal Blue and Granite Ocean.'},
      {name:'Earth & Natural Harmony',ids:[5,6,12,1],text:'Warm organic depth with Crystal Green, Crystal Nut and Granite Brown.'}
    ].map(p=><button key={p.name} onClick={()=>{setSelected(roomNames.map((_,i)=>{const idx=p.ids[i%p.ids.length]%tiles.length;return tiles[idx]??tiles[0]}));setApplied(`${p.name} applied across all environments`);setModal(null)}}><div className="palette-swatches">{p.ids.slice(0,Math.min(4,tiles.length)).map((idIdx,swatchIdx)=>{const swatchTile=tiles[idIdx%tiles.length]??tiles[0];return <img src={sampleUrl(swatchTile)} key={swatchIdx} alt={swatchTile?.name??'Granite tile'}/>})}</div><h3>{p.name} <ArrowUpRight size={18}/></h3><p>{p.text}</p></button>)}</div></Modal>}
    {modal==='vr'&&<Modal title="Is your device ready for VR?" wide onClose={()=>setModal(null)}><p className="modal-description">Check this browser, send the live showroom to a headset, or use Stereo preview without VR hardware.</p><VRCompatibility active={xr} onEnter={()=>{setModal(null);requestStepInside(()=>void view.current?.enterVR())}} onStereo={()=>{requestStepInside(()=>{setStereo(!stereo);setWalking(true);setModal(null)})}}/><p className="fine-print">In headset: left thumbstick to move, right thumbstick to turn. Point a controller at a clear floor area and press its trigger to teleport. Your headset's system menu exits VR.</p></Modal>}
    {modal==='blog'&&<Modal title={article.title} wide onClose={()=>setModal(null)}><div className="article-layout"><img src={article.image} alt={article.imageAlt}/><article><div className="article-meta">{article.category} · {article.readTime}</div><p className="article-lead">{article.excerpt}</p>{article.sections.map(section=><section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}<p className="fine-print">Digital previews are for visual planning. Always check the final product’s physical sample, technical data and suitability with your tile supplier.</p></article></div></Modal>}
    {modal==='upload'&&<Modal title="Add your tile design." onClose={()=>setModal('collections')}><form className="upload-design-form" onSubmit={e=>{e.preventDefault();addDesign()}}><p>Upload a seamless JPG, PNG or WebP texture. Maximum 5 MB. Choose whether it is for the floor, wall or both.</p><label className="upload-dropzone"><input aria-label="Upload tile texture image" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>readUpload(e.target.files?.[0])}/>{uploadImage?<img src={uploadImage} alt="Your uploaded tile texture preview"/>:<><Upload size={24}/><b>CHOOSE TEXTURE IMAGE</b><small>JPG · PNG · WebP · up to 5 MB</small></>}</label><div className="upload-fields"><label>TILE CODE<input aria-label="Custom tile code" required value={uploadCode} onChange={e=>setUploadCode(e.target.value.toUpperCase())} placeholder="Example: AT-W-1001"/></label><label>DESIGN NAME<input aria-label="Custom tile design name" required value={uploadName} onChange={e=>setUploadName(e.target.value)} placeholder="Example: Ocean Blue KitKat"/></label></div><div className="upload-fields"><label>COLLECTION<select aria-label="Custom tile family" value={uploadFamily} onChange={e=>setUploadFamily(e.target.value as Family)}>{families.map(f=><option key={f}>{f}</option>)}</select></label><label>FINISH<input aria-label="Custom tile finish" value={uploadFinish} onChange={e=>setUploadFinish(e.target.value)} placeholder="Matt / Polished"/></label></div><div className="upload-fields"><label>TILE SIZE<select aria-label="Tile size format" value={uploadSize} onChange={e=>setUploadSize(e.target.value as TileSize)}>{TILE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select></label></div><fieldset><legend>USE THIS DESIGN ON</legend>{(['Floor','Wall','Both'] as SurfaceUse[]).map(value=><label key={value}><input type="radio" name="surface" checked={uploadSurface===value} onChange={()=>setUploadSurface(value)}/>{value}</label>)}</fieldset><button className="dark-button full-width" type="submit"><Upload size={16}/> ADD TO COLLECTION</button></form></Modal>}
    <ExploreLoginModal
      isOpen={authModalOpen}
      onClose={() => {
        setAuthModalOpen(false)
        setPendingExploreCallback(null)
        setAuthTargetTile(null)
      }}
      onSuccess={handleAuthSuccess}
      targetTileName={authTargetTile?.name}
    />
  </main>
}
import Admin from './Admin'

const Root = () => {
  return window.location.pathname === '/admin' ? <Admin /> : <App />;
};

createRoot(document.getElementById('root')!).render(<Root/> )
