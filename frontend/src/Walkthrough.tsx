import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import './graphics-fallback.css'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, RotateCcw } from 'lucide-react'
import type { WallStyle } from './house'
import { buildImportedHouse, importedRoomAt as roomAt, importedViewpoints as viewpoints } from './importedHouse'
import { roomNames, sampleUrl, type Tile } from './catalog'

export type ViewHandle = { enter:()=>void; goTo:(room:number)=>void; reset:()=>void; enterVR:()=>Promise<void>; fullscreen:()=>void }
type Props = { onBrowse:()=>void; selected:Tile[]; wallStyles:WallStyle[]; walking:boolean; stereo:boolean; brightness:number; onRoom:(room:number)=>void; onWallPick:(wall:number)=>void; onWalking:(active:boolean)=>void; onNotice:(text:string)=>void; onReady:()=>void; onXR:(active:boolean)=>void }
type Runtime = { goTo:(room:number)=>void; reset:()=>void; enter:()=>void; vr:()=>Promise<void>; apply:(room:number,tile:Tile)=>void; styleWall:(wall:number,style:WallStyle)=>void; renderer:THREE.WebGLRenderer }

export const Walkthrough=forwardRef<ViewHandle,Props>(function Walkthrough(props,ref){
  const host=useRef<HTMLDivElement>(null);const runtime=useRef<Runtime|null>(null);const live=useRef(props);const lastApplied=useRef(props.selected);live.current=props
  const [attempt,setAttempt]=useState(0)
  const movement=useRef({x:0,z:0});const [error,setError]=useState('');const [position,setPosition]=useState({x:-1.7,z:6.7,yaw:.57});const [locked,setLocked]=useState(false)
  useImperativeHandle(ref,()=>({
    enter:()=>runtime.current?.enter(),goTo:(i)=>runtime.current?.goTo(i),reset:()=>runtime.current?.reset(),
    enterVR:async()=>{await runtime.current?.vr()},fullscreen:()=>{const el=host.current?.parentElement;if(document.fullscreenElement)void document.exitFullscreen();else void el?.requestFullscreen().catch(()=>live.current.onNotice('Fullscreen is unavailable in this browser.'))},
  }),[])
  useEffect(()=>{
    setError('');const element=host.current!;let renderer:THREE.WebGLRenderer
    try {renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'default'})}catch {setError('This browser could not start 3D. Enable hardware acceleration or open this page in a WebGL-capable browser.');return}
    // A conservative pixel cap avoids WebGL context loss on integrated GPUs and VR browsers.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.25));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.08;renderer.xr.enabled=true
    element.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive 3D house. Drag to look. Enter walkthrough, then use W A S D or the arrow keys to move.');renderer.domElement.setAttribute('role','application')
    const house=buildImportedHouse(renderer);const camera=new THREE.PerspectiveCamera(68,1,.07,140);const rig=new THREE.Group();rig.add(camera);house.scene.add(rig);camera.rotation.order='YXZ'
    const stereoCamera=new THREE.StereoCamera();stereoCamera.eyeSep=.064
    const keys=new Set<string>();let pitch=-.14,last=0,uiTime=0,previousRoom=-1,disposed=false,width=1,height=1;let dragging=false,oldX=0,oldY=0
    const goTo=(i:number)=>{const p=viewpoints[i];rig.position.set(p.x,0,p.z);rig.rotation.y=p.yaw;pitch=p.pitch;if(!renderer.xr.isPresenting){camera.position.set(0,1.65,0);camera.rotation.set(pitch,0,0)}live.current.onRoom(i)}
    goTo(0)
    live.current.selected.forEach((tile,i)=>house.applyTile(i,tile))
    live.current.wallStyles.forEach((style,i)=>house.setWallStyle(i,style))
    function resize(){width=element.clientWidth;height=element.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix()}
    const observer=new ResizeObserver(resize);observer.observe(element);resize()
    function clear(){keys.clear();movement.current={x:0,z:0};dragging=false}
    function lockChange(){const active=document.pointerLockElement===renderer.domElement;setLocked(active);if(!active)clear()}
    function keyDown(event:KeyboardEvent){if(!live.current.walking||document.querySelector('[role="dialog"]')||['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement)?.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code)}}
    function keyUp(event:KeyboardEvent){keys.delete(event.code)}
    function look(dx:number,dy:number){if(renderer.xr.isPresenting)return;rig.rotation.y-=dx*.003;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.15,1.15);camera.rotation.x=pitch}
    function mouseMove(event:MouseEvent){if(document.pointerLockElement===renderer.domElement)look(event.movementX,event.movementY)}
    const wallRay=new THREE.Raycaster()
    function chooseWall(clientX:number,clientY:number){if(live.current.stereo||renderer.xr.isPresenting)return;const rect=renderer.domElement.getBoundingClientRect();wallRay.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height*2-1)),camera);const wall=house.pickWall(wallRay);if(wall!==null){if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();live.current.onWallPick(wall)}}
    let pointerStartX=0,pointerStartY=0
    function pointerDown(event:PointerEvent){if(document.pointerLockElement===renderer.domElement){const rect=renderer.domElement.getBoundingClientRect();chooseWall(rect.left+rect.width/2,rect.top+rect.height/2);return}dragging=true;oldX=pointerStartX=event.clientX;oldY=pointerStartY=event.clientY;renderer.domElement.setPointerCapture(event.pointerId);renderer.domElement.focus({preventScroll:true})}
    function pointerMove(event:PointerEvent){if(dragging&&document.pointerLockElement!==renderer.domElement){look(event.clientX-oldX,event.clientY-oldY);oldX=event.clientX;oldY=event.clientY}}
    function pointerUp(event:PointerEvent){if(dragging&&Math.hypot(event.clientX-pointerStartX,event.clientY-pointerStartY)<7)chooseWall(event.clientX,event.clientY);dragging=false}
    function contextLost(event:Event){event.preventDefault();clear();live.current.onWalking(false);setError('3D graphics paused while your device frees graphics memory. The showroom will try to recover automatically.')}
    function contextRestored(){setError('');resize();live.current.onNotice('3D graphics restored.')}
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);document.addEventListener('pointerlockchange',lockChange);document.addEventListener('mousemove',mouseMove)
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerUp);renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored)
    const raycaster=new THREE.Raycaster();const rotation=new THREE.Matrix4();const teleport=new THREE.Mesh(new THREE.RingGeometry(.2,.3,32),new THREE.MeshBasicMaterial({color:'#7dba9a',side:THREE.DoubleSide}));teleport.rotation.x=-Math.PI/2;teleport.visible=false;house.scene.add(teleport)
    function floorHit(controller:THREE.Object3D){controller.updateWorldMatrix(true,false);rotation.identity().extractRotation(controller.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation);const hit=raycaster.intersectObjects(house.scene.children,true).find(h=>h.object!==teleport&&h.object instanceof THREE.Mesh);return hit?.object.userData.floor&&house.canStand(hit.point.x,hit.point.z)?hit.point:null}
    const controllers=[renderer.xr.getController(0),renderer.xr.getController(1)]
    const selectCallbacks=controllers.map(controller=>{rig.add(controller);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-5)]),new THREE.LineBasicMaterial({color:'#96cdb0'}));controller.add(line);const select=()=>{const hit=floorHit(controller);if(hit){const head=new THREE.Vector3();camera.getWorldPosition(head);rig.position.x+=hit.x-head.x;rig.position.z+=hit.z-head.z}};controller.addEventListener('select',select);return select})
    const onStart=()=>{clear();camera.position.set(0,0,0);camera.rotation.set(0,0,0);live.current.onXR(true)}
    const onEnd=()=>{camera.position.set(0,1.65,0);camera.rotation.set(pitch,0,0);teleport.visible=false;live.current.onXR(false)}
    renderer.xr.addEventListener('sessionstart',onStart);renderer.xr.addEventListener('sessionend',onEnd)
    runtime.current={renderer,apply:house.applyTile,styleWall:house.setWallStyle,goTo,reset:()=>goTo(roomAt(rig.position.x,rig.position.z)),enter:()=>{live.current.onWalking(true);renderer.domElement.focus({preventScroll:true});if(matchMedia('(pointer:fine)').matches){const request=renderer.domElement.requestPointerLock?.();request?.catch(()=>live.current.onNotice('Drag the scene to look around. Use W/A/S/D to walk.'))}},vr:async()=>{
      if(!navigator.xr||!window.isSecureContext){live.current.onNotice('Headset VR needs a compatible WebXR browser on HTTPS or localhost. You can still walk through the house in normal mode.');return}
      try{if(renderer.xr.isPresenting){await renderer.xr.getSession()?.end();return}if(!await navigator.xr.isSessionSupported('immersive-vr')){live.current.onNotice('No compatible VR headset detected. Use Stereo preview to see both eye views, or continue in normal mode.');return}const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});if(disposed){await session.end();return}document.exitPointerLock();await renderer.xr.setSession(session)}catch{live.current.onNotice('VR could not start. Connect your headset and allow the browser’s VR permission, then try again.')}
    }}
    const direction=new THREE.Vector3();let snapReady=true
    function move(dx:number,dz:number,dt:number){const length=Math.hypot(dx,dz);if(length<.05)return;if(length>1){dx/=length;dz/=length}let yaw=rig.rotation.y;if(renderer.xr.isPresenting){camera.getWorldDirection(direction);yaw=Math.atan2(-direction.x,-direction.z)}const speed=2.5*dt;const x=(dx*Math.cos(yaw)+dz*Math.sin(yaw))*speed;const z=(-dx*Math.sin(yaw)+dz*Math.cos(yaw))*speed;if(house.canStand(rig.position.x+x,rig.position.z))rig.position.x+=x;if(house.canStand(rig.position.x,rig.position.z+z))rig.position.z+=z}
    renderer.setAnimationLoop((time)=>{
      if(disposed||renderer.getContext().isContextLost()||document.hidden)return;const dt=Math.min((time-last)/1000,.033);last=time;renderer.toneMappingExposure=live.current.brightness
      if(live.current.walking&&!document.querySelector('[role="dialog"]'))move((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+movement.current.x,(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+movement.current.z,dt)
      if(renderer.xr.isPresenting){const session=renderer.xr.getSession();let turning=0;for(const source of session?.inputSources??[]){const axes=source.gamepad?.axes;if(axes&&axes.length>=4){if(source.handedness==='left')move(axes[2],axes[3],dt);else turning=axes[2]}}if(Math.abs(turning)>.7&&snapReady){rig.rotation.y-=Math.sign(turning)*Math.PI/6;snapReady=false}if(Math.abs(turning)<.3)snapReady=true;const hit=floorHit(controllers[0])??floorHit(controllers[1]);teleport.visible=!!hit;if(hit)teleport.position.set(hit.x,.02,hit.z)}
      const current=roomAt(rig.position.x,rig.position.z);if(current!==previousRoom){live.current.onRoom(current);previousRoom=current}if(time-uiTime>140){setPosition({x:rig.position.x,z:rig.position.z,yaw:rig.rotation.y});uiTime=time}
      if(live.current.stereo&&!renderer.xr.isPresenting){camera.aspect=width/height;camera.updateProjectionMatrix();house.scene.updateMatrixWorld();stereoCamera.update(camera);renderer.setScissorTest(true);renderer.setViewport(0,0,width/2,height);renderer.setScissor(0,0,width/2,height);renderer.render(house.scene,stereoCamera.cameraL);renderer.setViewport(width/2,0,width/2,height);renderer.setScissor(width/2,0,width/2,height);renderer.render(house.scene,stereoCamera.cameraR);renderer.setScissorTest(false)}else{renderer.setViewport(0,0,width,height);renderer.render(house.scene,camera)}
    })
    live.current.onReady()
    return()=>{disposed=true;runtime.current=null;renderer.setAnimationLoop(null);void renderer.xr.getSession()?.end();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();observer.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);document.removeEventListener('pointerlockchange',lockChange);document.removeEventListener('mousemove',mouseMove);renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);controllers.forEach((c,i)=>c.removeEventListener('select',selectCallbacks[i]));renderer.xr.removeEventListener('sessionstart',onStart);renderer.xr.removeEventListener('sessionend',onEnd);house.dispose();renderer.dispose();renderer.forceContextLoss();element.replaceChildren()}
  },[attempt])
  useEffect(()=>{if(lastApplied.current===props.selected)return;lastApplied.current=props.selected;props.selected.forEach((tile,i)=>runtime.current?.apply(i,tile))},[props.selected])
  useEffect(()=>{props.wallStyles.forEach((style,i)=>runtime.current?.styleWall(i,style))},[props.wallStyles])
  useEffect(()=>{if(!props.walking){movement.current={x:0,z:0};if(document.pointerLockElement)document.exitPointerLock()}},[props.walking])
  const hold=(x:number,z:number)=>({onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);movement.current={x,z}},onPointerUp:()=>{movement.current={x:0,z:0}},onPointerCancel:()=>{movement.current={x:0,z:0}},onLostPointerCapture:()=>{movement.current={x:0,z:0}}})
  return <><div className="three-host" ref={host}/>{error&&<div className="graphics-error material-fallback" role="status"><div className="fallback-sample"><img src={sampleUrl(props.selected[roomAt(position.x,position.z)])} alt="Selected tile texture preview"/><span>2D MATERIAL PREVIEW</span></div><div className="fallback-copy"><p>MJP CERAMICS / MATERIAL STUDIO</p><h2>Your next favourite surface.</h2><p>3D is temporarily unavailable on this device. You can still explore tile designs and upload your own.</p><strong>{props.selected[roomAt(position.x,position.z)].name}</strong><div className="fallback-actions"><button onClick={props.onBrowse}>Explore tile collections</button><button onClick={()=>setAttempt(n=>n+1)}>Try 3D again</button></div><small>For 3D, enable browser graphics acceleration and close unused 3D tabs.</small></div></div>}
    {!error&&<div className="floorplan" aria-label={`Your location: ${roomNames[roomAt(position.x,position.z)]}`}><span>THE INTERIORS</span><svg viewBox="0 0 160 160" role="img" aria-label="Imported interior selector">{roomNames.map((label,i)=><g key={label}><rect x={i%2?83:5} y={9+Math.floor(i/2)*36} width="72" height="27" rx="2" fill={roomAt(position.x,position.z)===i?'#d9c28a':'#f5f0e5'} stroke="#8c887f"/><text x={i%2?119:41} y={26+Math.floor(i/2)*36}>{String(i+1).padStart(2,'0')}</text></g>)}</svg><small>{roomNames[roomAt(position.x,position.z)]}</small></div>}
    {props.walking&&<><span className="crosshair" aria-hidden="true">+</span><div className="walk-help">{locked?'W A S D to walk · Mouse to look · Esc to release':'Drag to look · W A S D / arrows to walk'}<button aria-label="Reset room viewpoint" onClick={()=>runtime.current?.reset()}><RotateCcw size={15}/></button></div><div className="move-pad" aria-label="Movement controls"><button className="forward" aria-label="Walk forward" {...hold(0,-1)}><ArrowUp/></button><button aria-label="Walk left" {...hold(-1,0)}><ArrowLeft/></button><button aria-label="Walk backward" {...hold(0,1)}><ArrowDown/></button><button aria-label="Walk right" {...hold(1,0)}><ArrowRight/></button></div></>}
    {props.stereo&&<div className="stereo-divider"><span>STEREO PREVIEW</span></div>}
  </>
})
