/**
 * Portfolio v2: two real-time 3D scenes (Three.js, built from code, no model files).
 *  1. Hero: a liquid-chrome "AI core" with orbiting data rings that follows the pointer.
 *  2. Featured work: a 3D phone showing the real assistant answering a question,
 *     with floating cards for features it really has. Drag to rotate it.
 * Scenes start when scrolled near, pause when off screen or the tab is hidden, cap the pixel
 * ratio on phones, and fall back to plain CSS if WebGL is missing.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = window.matchMedia('(max-width: 760px)').matches;
const dprCap = isSmall ? 1.5 : 2;

/* ---------- shared helpers ---------- */
function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}
function environmentFor(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();
}
/** A bright studio environment drawn on a canvas (soft boxes plus blue and lime bounce light). */
function studioEnvironment(renderer, scene) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#ffffff'); sky.addColorStop(0.42, '#dfe2f3'); sky.addColorStop(0.5, '#8d93c9'); sky.addColorStop(0.62, '#2a2d45'); sky.addColorStop(1, '#0d0d0f');
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
  const box = (x, y, w, h, col, a) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(x, y, w, h); g.globalAlpha = 1; };
  box(120, 70, 220, 90, '#ffffff', 1); box(560, 50, 300, 70, '#ffffff', 1); box(380, 190, 90, 150, '#2b3cff', 0.9); box(800, 215, 60, 70, '#d5ff3f', 0.8); box(0, 250, 1024, 8, '#ffffff', 0.7);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
}
/** Runs `tick` every frame while `host` is on screen and the tab is visible. */
function runWhileVisible(host, tick) {
  let visible = false, raf = 0, last = performance.now();
  const loop = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tick(now / 1000, dt);
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; start(); }, { rootMargin: '120px' }).observe(host);
  document.addEventListener('visibilitychange', start);
  return { renderOnce: () => tick(0, 0) };
}
function fitCanvas(host, renderer, camera) {
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();
}
function pointerState(host) {
  const p = { x: 0, y: 0, tx: 0, ty: 0, speed: 0 };
  let lx = 0, ly = 0;
  window.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    p.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    p.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    p.speed = Math.min(p.speed + Math.hypot(e.clientX - lx, e.clientY - ly) * 0.004, 1.2);
    lx = e.clientX; ly = e.clientY;
  }, { passive: true });
  return p;
}

/* ---------- 1. hero: the AI core ---------- */
function heroScene() {
  const host = document.getElementById('heroStage');
  const canvas = document.getElementById('heroCanvas');
  if (!host || !canvas) return;
  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { host.classList.add('no-webgl'); return; }

  const scene = new THREE.Scene();
  studioEnvironment(renderer, scene);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 10.6);

  // core: a smooth, indexed icosphere we ripple on the CPU every frame
  let geo = new THREE.IcosahedronGeometry(1.45, isSmall ? 9 : 16);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const dirs = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), l = Math.hypot(x, y, z);
    dirs[i * 3] = x / l; dirs[i * 3 + 1] = y / l; dirs[i * 3 + 2] = z / l;
  }
  const core = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.06, envMapIntensity: 1.25,
    iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 380], clearcoat: 0.4, clearcoatRoughness: 0.1,
  }));
  const group = new THREE.Group();
  group.add(core);

  // orbiting rings with data nodes
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x0d0d0f });
  const nodeColors = [0x2b3cff, 0xd5ff3f, 0x2b3cff, 0x0d0d0f];
  const rings = [];
  [[2.15, 0.9, 0.2], [2.55, -0.5, 1.1], [2.95, 0.2, -0.7]].forEach(([r, rx, rz], i) => {
    const holder = new THREE.Group();
    holder.rotation.set(rx, 0, rz);
    holder.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 8, 220), ringMat));
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.075 + i * 0.015, 20, 20),
      new THREE.MeshStandardMaterial({ color: nodeColors[i], metalness: 0.2, roughness: 0.35, emissive: nodeColors[i], emissiveIntensity: i === 1 ? 0.55 : 0.25 }));
    const spin = new THREE.Group();
    spin.add(node); node.position.set(r, 0, 0);
    holder.add(spin);
    group.add(holder);
    rings.push({ spin, speed: 0.5 + i * 0.22, dir: i % 2 ? -1 : 1, phase: i * 2.1 });
  });
  scene.add(group);

  const blue = new THREE.PointLight(0x2b3cff, 60, 20); blue.position.set(4.2, 2.4, 3.5); scene.add(blue);
  const lime = new THREE.PointLight(0xd5ff3f, 40, 20); lime.position.set(-4.5, -2.5, 3); scene.add(lime);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  fitCanvas(host, renderer, camera);
  const ptr = pointerState(host);

  const tick = (t, dt) => {
    // ripple
    const amp = 0.17 + ptr.speed * 0.2;
    for (let i = 0; i < pos.count; i++) {
      const dx = dirs[i * 3], dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
      const n = Math.sin(dx * 2.3 + t * 0.9) * Math.sin(dy * 2.1 + t * 0.7) * Math.sin(dz * 2.5 + t * 0.8) * 0.62
              + Math.sin(dx * 4.4 - t * 1.1 + dy * 3.1) * 0.22 + Math.sin(dz * 5.2 + t * 1.3 - dx * 2.0) * 0.12;
      const rad = 1.45 + n * amp;
      pos.setXYZ(i, dx * rad, dy * rad, dz * rad);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05; ptr.speed *= 0.94;
    group.rotation.y += (ptr.x * 0.7 - group.rotation.y) * 0.04 + dt * 0.12;
    group.rotation.x += (ptr.y * 0.35 - group.rotation.x) * 0.04;
    rings.forEach((r) => { r.spin.rotation.z = r.phase + t * r.speed * r.dir; });
    const sc = Math.min(window.scrollY / window.innerHeight, 1);
    group.position.y = -sc * 0.9;
    renderer.render(scene, camera);
  };
  const ctl = runWhileVisible(host, tick);
  if (reduceMotion) ctl.renderOnce();
}

/* ---------- 2. featured work: the 3D phone ---------- */
function cardTexture(title, sub, accent) {
  const w = 560, h = 190, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  rr(6, 6, w - 12, h - 12, 38); g.fillStyle = '#fbfaf6'; g.fill();
  g.lineWidth = 3; g.strokeStyle = '#0d0d0f'; g.stroke();
  g.fillStyle = accent; g.beginPath(); g.arc(58, h / 2, 22, 0, Math.PI * 2); g.fill();
  g.lineWidth = 3; g.strokeStyle = '#0d0d0f'; g.stroke();
  g.fillStyle = '#0d0d0f'; g.font = '700 36px Inter, system-ui, sans-serif'; g.textBaseline = 'alphabetic';
  g.fillText(title, 102, h / 2 - 4);
  g.fillStyle = '#5c5c66'; g.font = '500 26px Inter, system-ui, sans-serif';
  g.fillText(sub, 102, h / 2 + 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function phoneScene() {
  const host = document.getElementById('phoneStage');
  const canvas = document.getElementById('phoneCanvas');
  if (!host || !canvas) return;
  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { host.classList.add('no-webgl'); return; }

  const scene = new THREE.Scene();
  environmentFor(renderer, scene);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 10.2);

  const W = 1.62, H = 3.3, D = 0.17;
  const phone = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, 0.24),
    new THREE.MeshPhysicalMaterial({ color: 0x15161b, metalness: 1, roughness: 0.28, envMapIntensity: 1.2, clearcoat: 0.5 }));
  phone.add(body);

  // screen: a rounded rectangle with the real assistant screenshot mapped onto it
  const sw = W - 0.14, sh = H - 0.14;
  const sg = new THREE.ShapeGeometry(roundedRectShape(sw, sh, 0.19), 10);
  const uv = sg.attributes.uv, sp = sg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (sp.getX(i) + sw / 2) / sw, (sp.getY(i) + sh / 2) / sh);
  const tex = new THREE.TextureLoader().load('assets/img/assistant-chat.jpg', () => { if (reduceMotion) renderOnceNow(); });
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const screen = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = D / 2 + 0.002;
  phone.add(screen);
  const island = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 4, 12), new THREE.MeshBasicMaterial({ color: 0x050507 }));
  island.rotation.z = Math.PI / 2; island.position.set(0, sh / 2 - 0.2, D / 2 + 0.006);
  phone.add(island);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2a2b31, metalness: 1, roughness: 0.35 });
  [[0.5, 0.42], [-0.05, 0.28], [-0.45, 0.28]].forEach(([y, len]) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.035, len, 0.05, 2, 0.015), btnMat);
    b.position.set(y > 0.4 ? W / 2 + 0.008 : -W / 2 - 0.008, y > 0.4 ? 0.45 : y * 2.2 + 0.6, 0);
    phone.add(b);
  });

  // floating cards (all describe things the assistant really does)
  const cardDefs = [
    ['Answers from your docs', 'Not a generic bot', '#d5ff3f', -1.3, 1.0, 0.55, -0.12],
    ['Lead captured', 'Emailed to the owner', '#2b3cff', 1.3, -0.2, 0.9, 0.1],
    ['Replies in Spanish', 'Matches the visitor', '#ffffff', -1.25, -1.2, 0.35, -0.06],
  ];
  const cards = cardDefs.map(([title, sub, accent, x, y, z, rot], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.509),
      new THREE.MeshBasicMaterial({ map: cardTexture(title, sub, accent), transparent: true, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.z = rot;
    phone.add(m);
    return { m, y, phase: i * 1.7 };
  });

  // soft ground shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sg2 = sc.getContext('2d'); const gr = sg2.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg2.fillStyle = gr; sg2.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.15;
  scene.add(shadow);

  const root = new THREE.Group();
  root.add(phone);
  scene.add(root);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.PointLight(0x2b3cff, 55, 20); rim.position.set(-4, 1, -2); scene.add(rim);
  const lime = new THREE.PointLight(0xd5ff3f, 30, 20); lime.position.set(4, -3, 2); scene.add(lime);

  fitCanvas(host, renderer, camera);

  // drag to rotate, spring back on release
  const ptr = pointerState(host);
  let dragging = false, yaw = 0, lastX = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (dragging) { yaw = Math.max(-1.1, Math.min(1.1, yaw + (e.clientX - lastX) * 0.012)); lastX = e.clientX; } });
  const release = () => { dragging = false; };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);

  const tick = (t) => {
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    if (!dragging) yaw *= 0.94;
    const sway = reduceMotion ? 0 : Math.sin(t * 0.7) * 0.12;
    phone.rotation.y = -0.38 + yaw + ptr.x * 0.28 + sway;
    phone.rotation.x = ptr.y * 0.12;
    phone.rotation.z = -0.04;
    root.position.y = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.1;
    cards.forEach((c) => { c.m.position.y = c.y + (reduceMotion ? 0 : Math.sin(t * 0.9 + c.phase) * 0.07); });
    renderer.render(scene, camera);
  };
  const renderOnceNow = () => tick(0);
  const ctl = runWhileVisible(host, tick);
  if (reduceMotion) ctl.renderOnce();
}

/* ---------- start when the browser is idle ---------- */
function start() {
  try { heroScene(); } catch (e) { console.warn('hero scene failed', e); document.getElementById('heroStage')?.classList.add('no-webgl'); }
  try { phoneScene(); } catch (e) { console.warn('phone scene failed', e); document.getElementById('phoneStage')?.classList.add('no-webgl'); }
}
if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 }); else setTimeout(start, 200);
