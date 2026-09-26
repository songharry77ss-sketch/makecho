import { useEffect, useRef, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Move, Box, LoaderCircle } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Action } from './engine';

type Props = { habitat: string; action: Action | null; name: string; onAction: (action: Action) => void; expedition?: boolean };
type Handle = { reset: () => void; zoom: (factor: number) => void };
const palettes: Record<string, { sky: number; fog: number; key: number; ambient: number; exposure: number }> = {
  meadow: { sky: 0xdcebdd, fog: 0xdcebdd, key: 0xffefcf, ambient: 0xddeedb, exposure: 1.12 },
  forest: { sky: 0x24473e, fog: 0x24473e, key: 0xc6e7d4, ambient: 0x86b8aa, exposure: 1.0 },
  sunset: { sky: 0xf3d7bd, fog: 0xf3d7bd, key: 0xffb982, ambient: 0xffe6d3, exposure: 1.12 },
};

/** Batches static mesh primitives by PBR material; Momo remains independently animated. */
function batchEnvironment(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const env = root.getObjectByName('Garden_Environment');
  if (!env) return;
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals = new Set<THREE.BufferGeometry>();
  env.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geo.applyMatrix4(object.matrixWorld);
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const bucket = buckets.get(object.material) ?? [];
    bucket.push(geo); buckets.set(object.material, bucket); originals.add(object.geometry);
  });
  const group = new THREE.Group(); group.name = 'Batched_Garden';
  buckets.forEach((geometries, material) => {
    const merged = mergeGeometries(geometries);
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = `Garden_${material.name}`;
      mesh.castShadow = material.name !== 'water'; mesh.receiveShadow = true;
      group.add(mesh);
    }
    geometries.forEach(g => g.dispose());
  });
  env.removeFromParent(); originals.forEach(g => g.dispose()); root.add(group);
}

export default function Garden3D({ habitat, action, name, onAction, expedition = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const props = useRef({ habitat, action, onAction, name }); props.current = { habitat, action, onAction, name };
  const handle = useRef<Handle | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [hint, setHint] = useState('드래그해서 정원을 돌려 보세요');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, frame = 0, loaded: THREE.Group | null = null;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    } catch { setStatus('fallback'); return; }
    setStatus('loading');
    const compact = window.matchMedia('(max-width: 700px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', '회전하고 확대할 수 있는 3D 정원. 딸기를 누르면 먹이를 주고, 모모를 누르면 놀아 줍니다.');
    renderer.domElement.setAttribute('role', 'img');
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 90);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .065;
    controls.enablePan = false; controls.minDistance = 7; controls.maxDistance = 22;
    controls.minPolarAngle = .32; controls.maxPolarAngle = Math.PI / 2.08;
    controls.rotateSpeed = .65; controls.zoomSpeed = .75;
    const reset = () => { camera.position.set(compact ? 10 : 8, compact ? 10 : 8, compact ? 14 : 11); controls.target.set(0, .7, 0); controls.update(); };
    reset();
    handle.current = { reset, zoom: factor => { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); } };
    const hemi = new THREE.HemisphereLight(0xe9f5e5, 0x736652, 2.05); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffefcf, 3.25); key.position.set(-5, 9, 6); key.castShadow = true;
    key.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
    key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
    key.shadow.normalBias = .035; key.shadow.bias = -.00015; key.shadow.radius = 3; scene.add(key);
    const rim = new THREE.DirectionalLight(0xd6ebfa, 1.2); rim.position.set(4, 4, -5); scene.add(rim);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xdcebdd, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.85; ground.receiveShadow = true; scene.add(ground);
    let palette = '';
    const applyPalette = () => {
      if (palette === props.current.habitat) return;
      palette = props.current.habitat;
      const p = palettes[palette] ?? palettes.meadow;
      scene.background = new THREE.Color(p.sky); scene.fog = new THREE.Fog(p.fog, 23, 48);
      ground.material.color.setHex(p.sky); key.color.setHex(p.key); hemi.color.setHex(p.ambient); renderer.toneMappingExposure = p.exposure;
      key.intensity = palette === 'forest' ? 2.3 : 3.25;
    };
    applyPalette();
    const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xf4dfa0 }), 32);
    const dummy = new THREE.Object3D(); particles.frustumCulled = false; scene.add(particles);
    const target = new THREE.Vector3(0, .85, .4);
    let momo: THREE.Object3D | undefined, wingL: THREE.Object3D | undefined, wingR: THREE.Object3D | undefined;
    let origin = new THREE.Vector3(), previousAction: Action | null = null, actionStart = 0, lastTime = 0;
    let restL = new THREE.Euler(), restR = new THREE.Euler();
    const clockStart = performance.now();
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const pointerDown = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.2);
    const clickPoint = new THREE.Vector3();
    const zones = [
      { center: new THREE.Vector3(2.1, .65, 1.55), radius: .85, action: 'feed' as const, label: '딸기를 먹으러 가요' },
      { center: new THREE.Vector3(-2.1, .3, 1.45), radius: .85, action: 'clean' as const, label: '연못에서 보송보송 씻어요' },
      { center: new THREE.Vector3(1.1, .45, -1), radius: .7, action: 'rest' as const, label: '잎사귀 침대에서 쉬어요' },
    ];
    const down = (e: PointerEvent) => { pointerDown.set(e.clientX, e.clientY); };
    const up = (e: PointerEvent) => {
      if (pointerDown.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 7 || !momo || props.current.action) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(momo, true).length) { props.current.onAction('play'); setHint(`${props.current.name}와 함께 날아 봐요`); return; }
      if (raycaster.ray.intersectPlane(floorPlane, clickPoint) && Math.hypot(clickPoint.x, clickPoint.z) < 4.05) {
        const zone = zones.find(z => Math.hypot(clickPoint.x-z.center.x, clickPoint.z-z.center.z) < z.radius);
        if (zone) { props.current.onAction(zone.action); setHint(zone.label); }
        else { target.set(clickPoint.x, .85, clickPoint.z); setHint(`${props.current.name}가 선택한 곳으로 날아가요`); }
      }
    };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
    const contextLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(frame); setStatus('fallback'); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const resize = () => { const { width, height } = element.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width/height; camera.updateProjectionMatrix(); renderer.setSize(width, height); };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize();
    let inView = true;
    const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; }); observer.observe(element);
    new GLTFLoader().load('./assets/models/makecho-garden.glb', gltf => {
      if (disposed) { disposeObject(gltf.scene); return; }
      loaded = gltf.scene;
      const remove: THREE.Object3D[] = [];
      loaded.traverse(o => { if (o instanceof THREE.Light || o instanceof THREE.Camera) remove.push(o); });
      remove.forEach(o => o.removeFromParent());
      batchEnvironment(loaded);
      loaded.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; if ((o.material as THREE.Material).name === 'wing') { const m = o.material as THREE.MeshStandardMaterial; m.side = THREE.DoubleSide; m.depthWrite = false; o.castShadow = false; } } });
      scene.add(loaded); momo = loaded.getObjectByName('Momo'); wingL = loaded.getObjectByName('Wing_L'); wingR = loaded.getObjectByName('Wing_R');
      if (momo) { origin.copy(momo.position); target.copy(origin); }
      if (wingL) restL.copy(wingL.rotation); if (wingR) restR.copy(wingR.rotation);
      setStatus('ready');
    }, undefined, () => { if (!disposed) setStatus('fallback'); });
    const render = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      if (!inView || document.hidden) { lastTime = now; return; }
      // Cap mobile render work at 30fps; interactions remain responsive.
      if (compact && now-lastTime < 30) return;
      const dt = Math.min(.05, Math.max(.001, (now-lastTime)/1000)); lastTime = now;
      const t = (now-clockStart)/1000; applyPalette();
      const active = props.current.action;
      if (active !== previousAction) {
        previousAction = active; actionStart = t;
        if (active === 'feed') target.set(1.65, 1.05, 1.4);
        if (active === 'clean') target.set(-1.75, .8, 1.4);
        if (active === 'rest') target.set(1.1, .7, -1);
        if (active === 'explore') target.set(-2, 1.35, -1.4);
        if (active === 'play') target.set(.2, 1.5, .3);
      }
      if (momo) {
        const delta = new THREE.Vector3().subVectors(target, momo.position);
        if (!reducedMotion.matches) {
          momo.position.lerp(target, 1-Math.exp(-dt*3));
          if (active === 'play' || active === 'explore') { momo.position.x += Math.sin((t-actionStart)*5)*dt*.75; momo.position.y += Math.sin(t*7)*dt*.3; }
          else if (active !== 'rest') momo.position.y += Math.sin(t*3)*dt*.065;
          if (Math.hypot(delta.x,delta.z)>.12) momo.rotation.y = THREE.MathUtils.lerp(momo.rotation.y,Math.atan2(delta.x,delta.z),1-Math.exp(-dt*5));
          else momo.rotation.y = THREE.MathUtils.lerp(momo.rotation.y, .2, dt);
          const flap = active === 'rest' ? .08 : Math.sin(t*(active?35:20))*.43;
          if (wingL) { wingL.rotation.copy(restL); wingL.rotation.z += flap; }
          if (wingR) { wingR.rotation.copy(restR); wingR.rotation.z -= flap; }
        } else momo.position.copy(target);
      }
      for (let i=0;i<32;i++) {
        const time = reducedMotion.matches ? 0 : t;
        const a=i*2.399;const r=2.5+(i%5)*.25;
        dummy.position.set(Math.cos(a+time*.025)*r,1+(i%7)*.25+Math.sin(time*.7+i)*.12,Math.sin(a+time*.025)*r);
        dummy.scale.setScalar(palette==='forest'?1.5:.65); dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;
      controls.update(); renderer.render(scene,camera);
      renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
      renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      disposeObject(scene); renderer.dispose(); renderer.domElement.remove(); handle.current = null;
    };
  }, [retry, expedition]);

  return <div className={`garden-3d ${expedition ? 'expedition-3d' : ''}`}>
    <div className="three-host" ref={host} />
    {status === 'loading' && <div className="three-loading" role="status"><LoaderCircle size={26}/><b>작은 세계를 깨우는 중</b><span>모모와 정원의 3D 모델을 불러오고 있어요</span></div>}
    {status === 'fallback' && <div className="three-fallback"><img src={habitat==='forest'?'./assets/forest.webp':'./assets/garden.webp'} alt="3D를 사용할 수 없을 때 표시하는 정원"/><div><p>이 환경에서는 3D 정원을 불러오지 못했어요.<br/>아래 돌봄 버튼으로 계속 플레이할 수 있어요.</p><button onClick={()=>setRetry(r=>r+1)}>3D 다시 불러오기</button></div></div>}
    {status === 'ready' && <><div className="three-badge"><Box size={13}/> LIVE 3D</div><div className="three-controls" aria-label="3D 카메라 조작"><button onClick={()=>handle.current?.zoom(.85)} aria-label="정원 확대"><ZoomIn size={17}/></button><button onClick={()=>handle.current?.zoom(1.15)} aria-label="정원 축소"><ZoomOut size={17}/></button><button onClick={()=>handle.current?.reset()} aria-label="카메라 초기화"><RotateCcw size={16}/></button></div><div className="three-hint"><Move size={13}/><span>{hint}</span></div><button className="three-pet-button" disabled={!!action} onClick={()=>onAction('play')}>{name}와 놀기 <span>♡</span></button></>}
  </div>;
}
function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
  materials.forEach(m=>Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);}));
  textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
