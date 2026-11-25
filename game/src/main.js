// main.js — bootstrap + game loop + input for Dapur Ceria (3D cooking game).
// Orthographic top-down camera over a busy dining room, mouse + keyboard play.

import * as THREE from 'three';
import { buildRoom } from './scene.js';
import { createCustomers, createWaiter, updatePeople, spawnCustomer, removeCustomer } from './people.js';
import { initCooking, assignOrder, tryInteract, updateCooking } from './cooking.js';
import * as hud from './hud.js';
import * as sfx from './audio.js';

const G = {
  state: 'title', // title | playing | paused | over
  score: 0, coins: 0, combo: 0, bestCombo: 0, hearts: 3,
  timeLeft: 180, elapsed: 0, served: 0, lost: 0,
  hand: [], plate: [], plateDish: null, overReason: '',
};

// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('app').appendChild(renderer.domElement);
G.renderer = renderer;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b4a2f);
scene.fog = new THREE.Fog(0x6b4a2f, 40, 70);
G.scene = scene;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.position.set(0, 26, 13);
camera.lookAt(0, 0, 0.3);
G.camera = camera;

function fitCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = 7.9;
  camera.left = -halfH * aspect; camera.right = halfH * aspect;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
fitCamera();
window.addEventListener('resize', fitCamera);

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0xffe0b0, 0.85));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
sun.position.set(7, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
sun.shadow.camera.far = 40;
scene.add(sun);
const warm1 = new THREE.PointLight(0xffb63c, 22, 16, 1.6);
warm1.position.set(-2, 4.5, -1.5); scene.add(warm1);
const warm2 = new THREE.PointLight(0xffb63c, 18, 16, 1.6);
warm2.position.set(3, 4.5, 3.2); scene.add(warm2);

// ---------- build the room & people ----------
buildRoom(G);
createCustomers(G, 12);
createWaiter(G);
hud.initHud(G);
G.hud = hud;
initCooking(G);

// ---------- game flow ----------
G.startGame = () => {
  sfx.unlockAudio();
  initCooking(G);
  G.state = 'playing';
  hud.hideTitle();
  hud.toast('Shift dimulai! Sajikan pelanggan secepatnya 🍳');
};
G.restartGame = () => {
  for (const c of [...G.customers]) removeCustomer(G, c);
  createCustomers(G, 12);
  initCooking(G);
  G.state = 'playing';
  hud.hideTitle();
  document.getElementById('endScreen').classList.add('hidden');
};

// ---------- input: mouse picking + keyboard ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pickAt(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(G.clickables, true);
  for (const h of hits) {
    let o = h.object;
    while (o && (!o.userData || !o.userData.kind)) o = o.parent;
    if (o && o.userData.kind && o.userData.kind !== 'table') return o.userData;
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  sfx.unlockAudio();
  if (G.state !== 'playing') return;
  const hit = pickAt(e.clientX, e.clientY);
  if (hit) tryInteract(G, hit);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (G.state !== 'playing') return;
  renderer.domElement.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : 'default';
});

const STATION_KEYS = { 1: 'board', 2: 'stove', 3: 'pot' };
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') { sfx.setMuted(!sfx.isMuted()); hud.toast(sfx.isMuted() ? 'Suara mati' : 'Suara hidup'); return; }
  if (e.key === 'r' || e.key === 'R') { if (G.state === 'playing' || G.state === 'over') G.restartGame(); return; }
  if (e.key === 'p' || e.key === 'P') {
    if (G.state === 'playing') { G.state = 'paused'; hud.toast('Jeda — tekan P untuk lanjut'); }
    else if (G.state === 'paused') { G.state = 'playing'; hud.toast('Lanjut!'); }
    return;
  }
  if (G.state !== 'playing') return;
  if (STATION_KEYS[e.key]) { tryInteract(G, { kind: 'station', id: STATION_KEYS[e.key] }); }
  else if (e.key === '4' || e.key === ' ') { e.preventDefault(); tryInteract(G, { kind: 'pass' }); }
});

// ---------- main loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = clock.elapsedTime;
  if (G.state === 'playing') updateCooking(G, dt);
  if (G.state === 'playing' || G.state === 'title') updatePeople(G, dt, now);
  if (G.state === 'playing') { hud.refresh(G); hud.updateBigBubble(G, now); }
  renderer.render(scene, camera);
}
animate();

// ---------- debug hooks for automated playtesting ----------
window.__dapur = {
  G,
  state: () => G.state,
  start: () => G.startGame(),
  setTimeLeft: (s) => { G.timeLeft = s; },
  toScreen: (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  },
  orders: () => G.customers.filter(c => c.order).map(c => ({
    dish: c.order.dish, patience: Math.round(c.order.patience),
    seat: { x: c.seat.pos.x, z: c.seat.pos.z },
  })),
  stations: () => Object.fromEntries(Object.entries(G.stations).map(([id, s]) => [id, {
    input: s.input, output: s.output, done: s.done,
    pos: { x: s.group.position.x, z: s.group.position.z },
  }])),
  crates: () => Object.fromEntries(Object.entries(G.crates).map(([ing, g]) => [ing, { x: g.position.x, z: g.position.z }])),
  passPos: () => ({ x: -9.9, z: 1.4 }),
  plate: () => ({ items: [...G.plate], dish: G.plateDish }),
  hand: () => [...G.hand],
  score: () => ({ score: G.score, coins: G.coins, combo: G.combo, hearts: G.hearts, served: G.served, timeLeft: Math.round(G.timeLeft) }),
  // Fast-forward game logic without waiting for real frames (software
  // rendering in this VM runs ~1 fps, so real-time waits are impractical).
  step: (seconds) => {
    const n = Math.ceil(seconds / 0.05);
    for (let i = 0; i < n; i++) {
      if (G.state === 'playing') updateCooking(G, 0.05);
      updatePeople(G, 0.05, performance.now() / 1000);
    }
    if (G.state === 'playing') { hud.refresh(G); hud.updateBigBubble(G, performance.now() / 1000); }
    renderer.render(scene, camera);
  },
};
