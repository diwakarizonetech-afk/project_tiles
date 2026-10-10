import { useState, useEffect } from 'react';
import { useMemo, useRef } from 'react';
import { Trash2, Upload, LogIn, Grid, Settings, Home, LogOut, Mail, Phone, MessageSquare, Clock, ArrowLeft, RotateCcw, Expand, Footprints } from 'lucide-react';
import { fetchTiles, deleteCustomTile, saveCustomTile, fetchInquiries } from './api';
import { type Tile, families, TILE_SIZES, roomNames, type Family, type SurfaceUse, type TileSize, type TileOrientation } from './catalog';
import { Walkthrough, type ViewHandle } from './Walkthrough';
import type { WallStyle } from './house';
import './tailwind.css';

const noop=()=>{};

function AdminTilePreview({tile,tiles,onExit}:{tile:Tile;tiles:Tile[];onExit:()=>void}){
  const view=useRef<ViewHandle>(null);
  const supportsWall=tile.surface!=='Floor',supportsFloor=tile.surface!=='Wall';
  const [surface,setSurface]=useState<'Wall'|'Floor'>(tile.surface==='Floor'?'Floor':'Wall');
  const [walking,setWalking]=useState(false);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const floorFallback=tiles.find(item=>item.surface==='Floor'||item.surface==='Both');
  const selected=useMemo(()=>Array.from({length:roomNames.length},(_,room)=>room===4&&surface==='Floor'?tile:floorFallback??tile),[tile,surface,floorFallback]);
  const wallStyles=useMemo<WallStyle[]>(()=>Array.from({length:roomNames.length*4+2},(_,index)=>index>=16&&index<=20&&surface==='Wall'?{
    color:'#ffffff',design:'paint',image:tile.image,normal:tile.normal,roughness:tile.roughness,repeat:tile.repeat,size:tile.size,orientation:tile.orientation??'Landscape'
  }:{color:'#f0ece6',design:'paint'}),[tile,surface]);
  useEffect(()=>{view.current?.reset()},[surface]);
  const onError=(message:string)=>setError(message);
  const canPreview=surface==='Wall'?supportsWall:supportsFloor;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onExit} className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50" aria-label="Exit tile preview"><ArrowLeft size={18}/></button><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Interactive showroom preview</p><h2 className="truncate text-xl font-semibold text-gray-900">{tile.name}</h2></div></div>
      <button type="button" onClick={onExit} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Exit Preview</button>
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-900 shadow-sm">
        <div className="live-viewer is-walking" style={{position:'relative',height:'min(68vh,720px)',minHeight:380,overflow:'hidden'}}>
          <Walkthrough ref={view} selected={selected} wallStyles={wallStyles} walking={walking} stereo={false} gyro={false} brightness={.95} floorGlare={.35} initialRoom={4} previewMode previewSurface={surface} onBrowse={noop} onRoom={noop} onWallPick={noop} onFloorPick={noop} onWalking={setWalking} onGyro={noop} onNotice={onError} onReady={()=>setReady(true)} onXR={noop}/>
          <div className="absolute left-3 top-3 z-[8] flex flex-wrap gap-2 sm:left-4 sm:top-4">
            <button type="button" onClick={onExit} className="flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-gray-800 shadow hover:bg-white">Exit Preview</button>
            <button type="button" onClick={()=>view.current?.reset()} className="flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-gray-800 shadow hover:bg-white"><RotateCcw size={15}/> Reset view</button>
            <button type="button" aria-pressed={walking} onClick={()=>{if(!walking)view.current?.enter();else setWalking(false)}} className="flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-gray-800 shadow hover:bg-white"><Footprints size={15}/> {walking?'Stop walking':'Walk'}</button>
            <button type="button" onClick={()=>view.current?.fullscreen()} className="flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-gray-800 shadow hover:bg-white"><Expand size={15}/> Fullscreen</button>
          </div>
          {tile.surface==='Both'&&<label className="absolute right-3 top-3 z-[8] rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-gray-800 shadow sm:right-4 sm:top-4">Surface <select aria-label="Preview surface" value={surface} onChange={event=>setSurface(event.target.value as 'Wall'|'Floor')} className="ml-2 rounded border border-gray-300 bg-white px-2 py-1"><option value="Wall">Wall</option><option value="Floor">Floor</option></select></label>}
          {!ready&&!error&&<div className="absolute inset-0 z-[7] flex items-center justify-center bg-gray-900/60 text-sm text-white">Loading the showroom…</div>}
          {error&&<div role="alert" className="absolute inset-x-4 top-20 z-[9] rounded-md bg-red-50 p-3 text-sm text-red-800 shadow">{error} You can exit preview at any time.</div>}
        </div>
      </div>
      <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Tile details</h3>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Product code</dt><dd className="mt-1 text-gray-900">{tile.id}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Target surface</dt><dd className="mt-1 text-gray-900">{tile.surface==='Both'?'Both Wall and Floor':tile.surface==='Wall'?'Wall Only':'Floor Only'}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Dimensions</dt><dd className="mt-1 text-gray-900">{tile.size}</dd></div>
          {tile.surface==='Wall'&&<div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Tile orientation</dt><dd className="mt-1 text-gray-900">{tile.orientation??'Landscape'}</dd></div>}
        </dl>
        {!canPreview&&<p role="alert" className="mt-4 text-sm text-red-700">This tile cannot be previewed on the selected surface.</p>}
        <p className="mt-5 text-xs leading-5 text-gray-500">Preview changes are temporary. Exiting closes this showroom session and leaves catalog and public showroom settings untouched.</p>
      </aside>
    </div>
  </div>;
}

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'inquiries'>('catalog');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [previewTile,setPreviewTile]=useState<Tile|null>(null);
  
  // Upload State
  const [uploadImage, setUploadImage] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadCode, setUploadCode] = useState('');
  const [uploadFamily, setUploadFamily] = useState<Family>('Pattern');
  const [uploadFinish, setUploadFinish] = useState('Matt');
  const [uploadSurface, setUploadSurface] = useState<SurfaceUse>('Both');
  const [uploadOrientation,setUploadOrientation]=useState<TileOrientation>('Landscape');
  const [uploadSize, setUploadSize] = useState<TileSize>("2' × 2' (600 × 600 mm)");

  const loadData = async () => {
    try {
      const [t, i] = await Promise.all([fetchTiles(), fetchInquiries()]);
      setTiles(t);
      setInquiries(i);
    } catch {
      setNotice('Could not load data');
    }
  };

  useEffect(() => {
    if (loggedIn) loadData();
  }, [loggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@admin.com' && password === 'admin') {
      setLoggedIn(true);
    } else {
      setNotice('Invalid credentials (use admin@admin.com / admin)');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete ${code}?`)) return;
    try {
      await deleteCustomTile(code);
      setNotice(`${code} deleted`);
      loadData();
    } catch (err: any) {
      setNotice(err.message || 'Could not delete');
    }
  };

  const readUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setNotice('Choose an image');
    const reader = new FileReader();
    reader.onload = () => setUploadImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const draft: Tile = {
        id: uploadCode,
        name: uploadName,
        family: uploadFamily,
        color: '#ffffff',
        vein: '#ffffff',
        finish: uploadFinish,
        size: uploadSize,
        image: uploadImage,
        repeat: 2.5,
        surface: uploadSurface,
        orientation: uploadSurface==='Wall'?uploadOrientation:'Landscape',
        builtIn: false,
        sortOrder: 1000
      };
      await saveCustomTile(draft);
      setNotice('Tile uploaded successfully!');
      setUploadImage('');
      setUploadName('');
      setUploadCode('');
      setUploadOrientation('Landscape');
      loadData();
    } catch (err: any) {
      setNotice(err.message || 'Upload failed');
    } finally {
      setLoading(false);
      setTimeout(() => setNotice(''), 3000);
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-6 text-teal-700">
            <Settings size={48} />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">MJP Ceramics</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Admin Portal Login</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                  <input type="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@admin.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1">
                  <input type="password" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>

              <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition">
                  Sign in
                </button>
              </div>
            </form>
            {notice && <div className="mt-4 text-center text-sm text-red-600 bg-red-50 p-2 rounded">{notice}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-2 gap-[1px] w-6 h-6">
                <div className="bg-teal-700 rounded-sm"></div>
                <div className="bg-teal-600 rounded-sm"></div>
                <div className="bg-teal-500 rounded-sm"></div>
                <div className="bg-teal-400 rounded-sm"></div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                MJP Ceramics <span className="text-gray-400 font-normal text-sm">/</span> <span className="text-teal-700 font-medium">Admin Workspace</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => {setPreviewTile(null);setActiveTab('catalog')}} className={`text-sm font-medium px-3 py-1.5 rounded-md transition ${activeTab === 'catalog' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>Catalog</button>
              <button onClick={() => {setPreviewTile(null);setActiveTab('inquiries')}} className={`text-sm font-medium px-3 py-1.5 rounded-md transition flex items-center gap-2 ${activeTab === 'inquiries' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>Inquiries {inquiries.length > 0 && <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{inquiries.length}</span>}</button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <a href="/" className="text-gray-500 hover:text-gray-900 transition flex items-center gap-1 text-sm font-medium">
                <Home size={16} /> Showroom
              </a>
              <button onClick={() => setLoggedIn(false)} className="text-gray-500 hover:text-red-600 transition flex items-center gap-1 text-sm font-medium bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-md">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {notice && (
          <div className="mb-6 bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-md shadow-sm">
            <p className="text-sm text-teal-700 font-medium">{notice}</p>
          </div>
        )}

        {previewTile ? <AdminTilePreview key={previewTile.id} tile={previewTile} tiles={tiles} onExit={()=>setPreviewTile(null)}/> : activeTab === 'catalog' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* UPLOAD PANEL (Left) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Upload size={18} className="text-teal-600" /> Upload New Asset
                  </h2>
                </div>
                <form onSubmit={handleUpload} className="p-6 flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Texture Image</label>
                    <label className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-teal-500 hover:bg-gray-50 transition group">
                      <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={e => readUpload(e.target.files?.[0])} />
                      {uploadImage ? (
                        <div className="relative">
                          <img src={uploadImage} alt="preview" className="h-32 rounded object-cover shadow-sm" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded flex items-center justify-center text-white text-xs font-semibold">Replace</div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-10 w-10 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <span className="relative bg-transparent rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none">Upload a file</span>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
                      <input required placeholder="AT-123" value={uploadCode} onChange={e => setUploadCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                      <input required placeholder="Ocean Blue" value={uploadName} onChange={e => setUploadName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
                      <select value={uploadFamily} onChange={e => setUploadFamily(e.target.value as Family)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white">
                        {families.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Finish Details</label>
                      <input placeholder="Matt / Polished" value={uploadFinish} onChange={e => setUploadFinish(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                      <select value={uploadSize} onChange={e => setUploadSize(e.target.value as TileSize)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white">
                        {TILE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Surface</label>
                      <select value={uploadSurface} onChange={e => {setUploadSurface(e.target.value as SurfaceUse);setUploadOrientation('Landscape')}} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white">
                        <option value="Both">Both (Floor & Wall)</option>
                        <option value="Floor">Floor Only</option>
                        <option value="Wall">Wall Only</option>
                      </select>
                    </div>
                  </div>

                  {uploadSurface==='Wall'&&<div className="grid grid-cols-2 gap-4"><div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="upload-tile-orientation">Tile Orientation</label>
                    <select id="upload-tile-orientation" value={uploadOrientation} onChange={e=>setUploadOrientation(e.target.value as TileOrientation)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"><option value="Landscape">Landscape</option><option value="Portrait">Portrait</option></select>
                  </div></div>}

                  <div className="pt-2">
                    <button disabled={loading} type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Processing Upload...' : 'Publish to Showroom'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ASSET MANAGEMENT (Right) */}
            <div className="lg:col-span-7">
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Grid size={18} className="text-teal-600" /> Manage Catalog Assets
                  </h2>
                  <span className="bg-gray-200 text-gray-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                    {tiles.filter(t => !t.builtIn).length} Custom Tiles
                  </span>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  {['Floor', 'Wall'].map(surface => {
                    const surfaceTiles = tiles.filter(t => (t.surface === surface || t.surface === 'Both') && !t.builtIn);
                    if (surfaceTiles.length === 0) return null;
                    return (
                      <div key={surface} className="mb-8 last:mb-0">
                        <h3 className="text-sm font-bold tracking-wider text-gray-500 uppercase border-b border-gray-200 pb-2 mb-4">{surface} Tiles</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {surfaceTiles.map(t => (
                            <div key={t.id + surface} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-teal-400 hover:shadow-md transition bg-white group">
                              <button type="button" onClick={()=>setPreviewTile(t)} aria-label={`Preview ${t.name} (${t.id}) in the showroom`} className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded text-left focus:outline-none focus:ring-2 focus:ring-teal-500">
                                {t.image ? (
                                  <img src={t.image} alt={t.name} className="w-12 h-12 rounded object-cover border border-gray-200 shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400"><Grid size={16} /></div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate" title={t.name}>{t.name}</div>
                                  <div className="text-xs text-gray-500 flex gap-2">
                                    <span>{t.id}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{t.family}</span>
                                    {t.orientation&&<span>{t.orientation}</span>}
                                  </div>
                                </div>
                              </button>
                              <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100" title="Delete Asset">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {tiles.filter(t => !t.builtIn).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                      <Grid size={48} className="mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500">Catalog is empty</p>
                      <p className="text-sm">Upload custom tiles using the form to see them here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden min-h-[calc(100vh-12rem)] flex flex-col">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Mail size={18} className="text-teal-600" /> Customer Inquiries
              </h2>
              <span className="bg-gray-200 text-gray-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {inquiries.length} Total
              </span>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              {inquiries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <MessageSquare size={48} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">No Inquiries Yet</p>
                  <p className="text-sm">Customer consultation requests will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {inquiries.map(inq => (
                    <div key={inq.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{inq.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Phone size={14} /> {inq.contact}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={12} /> {new Date(inq.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
                        {inq.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
