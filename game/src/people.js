// people.js — seated customers as pixel-art sprites, speech bubbles (HTML),
// and a waiter who walks between the tables (4-frame walk cycle).
// Sprites from tools/gen_pixel.py (pixel-art-assets skill): 32x48 chibi
// characters, 6 customer variants (blue/blonde/red/grey/brown/black hair).

import * as THREE from 'three';
import { pixelSprite, pixelTex } from './scene.js';

const CUSTOMER_SPRITES = [
  'pixel/cust_blue.png', 'pixel/cust_blonde.png', 'pixel/cust_red.png',
  'pixel/cust_grey.png', 'pixel/cust_brown.png', 'pixel/cust_black.png',
];
const WAITER_FRAMES = [
  'pixel/waiter_walk_0.png', 'pixel/waiter_walk_1.png',
  'pixel/waiter_walk_2.png', 'pixel/waiter_walk_3.png',
];

const HAPPY_LINES = ['I love this dish too!', 'Thank you for waiting!', 'Enak banget!', 'Yummy!', 'Terima kasih!'];

function makeBubbleEl() {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.display = 'none';
  document.getElementById('bubbles').appendChild(el);
  return el;
}

export function createCustomers(G, count) {
  G.customers = [];
  const freeSeats = G.seats.filter(s => !s.taken);
  for (let i = 0; i < count && freeSeats.length; i++) {
    const seat = freeSeats.splice(Math.floor(Math.random() * freeSeats.length), 1)[0];
    spawnCustomer(G, seat);
  }
}

export function spawnCustomer(G, seat) {
  if (!seat || seat.taken) return null;
  const tex = CUSTOMER_SPRITES[Math.floor(Math.random() * CUSTOMER_SPRITES.length)];
  const grp = new THREE.Group();
  const sp = pixelSprite(tex, 2.0, 3.0);
  sp.position.y = 1.5;
  grp.add(sp);
  grp.position.copy(seat.pos);
  G.scene.add(grp);
  const c = {
    group: grp, seat, order: null, bubbleEl: makeBubbleEl(),
    happyUntil: 0, leaving: false, leaveAt: 0, bobPhase: Math.random() * 6,
    seatJitter: (G.customers.length % 2) * 0.45,
  };
  seat.taken = c;
  G.customers.push(c);
  // clickable: whole character + a hit cylinder
  grp.traverse(o => { o.userData = { kind: 'customer', customer: c }; });
  grp.userData = { kind: 'customer', customer: c };
  G.clickables.push(grp);
  return c;
}

export function removeCustomer(G, c) {
  const i = G.customers.indexOf(c);
  if (i >= 0) G.customers.splice(i, 1);
  const ci = G.clickables.indexOf(c.group);
  if (ci >= 0) G.clickables.splice(ci, 1);
  if (c.seat) c.seat.taken = null;
  if (c.bubbleEl) c.bubbleEl.remove();
  G.scene.remove(c.group);
}

// The waiter: pixel-art sprite, white shirt + dark apron, walks a loop
// between the tables with a 4-frame walk cycle.
export function createWaiter(G) {
  const grp = new THREE.Group();
  const sp = pixelSprite(WAITER_FRAMES[0], 2.0, 3.0);
  sp.position.y = 1.5;
  grp.add(sp);
  grp.position.set(-7, 0, -2.8);
  G.scene.add(grp);
  const frameTex = WAITER_FRAMES.map(pixelTex);
  G.waiter = {
    group: grp, sprite: sp, frameTex, frame: 0,
    path: [
      new THREE.Vector3(-7, 0, -2.8), new THREE.Vector3(8.5, 0, -2.8),
      new THREE.Vector3(8.5, 0, 5.2), new THREE.Vector3(-7, 0, 5.2),
    ],
    seg: 0, t: 0, speed: 1.6, pause: 0, walkPhase: 0,
  };
}

function updateWaiter(G, dt) {
  const w = G.waiter;
  if (!w) return;
  if (w.pause > 0) { w.pause -= dt; return; }
  const a = w.path[w.seg];
  const b = w.path[(w.seg + 1) % w.path.length];
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  w.t += (w.speed * dt) / len;
  if (w.t >= 1) {
    w.t = 0; w.seg = (w.seg + 1) % w.path.length;
    if (Math.random() < 0.45) w.pause = 1 + Math.random() * 2; // linger at a table
    return;
  }
  const x = a.x + dx * w.t, z = a.z + dz * w.t;
  w.group.position.set(x, Math.abs(Math.sin(w.walkPhase)) * 0.05, z);
  w.walkPhase += dt * 9;
  // swap walk-cycle frame (4 frames, ~8 fps)
  const frame = Math.floor(w.walkPhase / 1.6) % 4;
  if (frame !== w.frame) {
    w.frame = frame;
    w.sprite.material.map = w.frameTex[frame];
    w.sprite.material.needsUpdate = true;
  }
}

export function setBubble(c, html, happy = false) {
  if (!c.bubbleEl) return;
  c.bubbleEl.innerHTML = html;
  c.bubbleEl.className = 'bubble' + (happy ? ' happy' : '');
  c.bubbleEl.style.display = 'block';
}
export function hideBubble(c) { if (c.bubbleEl) c.bubbleEl.style.display = 'none'; }
export function happyBubble(G, c) {
  const line = HAPPY_LINES[Math.floor(Math.random() * HAPPY_LINES.length)];
  setBubble(c, line, true);
  c.happyUntil = performance.now() / 1000 + 3;
}

export function updatePeople(G, dt, nowSec) {
  updateWaiter(G, dt);
  const w = G.renderer.domElement.clientWidth;
  const h = G.renderer.domElement.clientHeight;
  const v = new THREE.Vector3();
  for (const c of G.customers) {
    // gentle idle bob
    c.group.position.y = Math.sin(nowSec * 1.5 + c.bobPhase) * 0.02;
    // leaving: hop toward the front and shrink away
    if (c.leaving) {
      hideBubble(c);
      c.group.position.z += dt * 2.2;
      c.group.position.y = Math.abs(Math.sin(nowSec * 8)) * 0.08;
      c.group.scale.multiplyScalar(1 - dt * 0.8);
      if (nowSec > c.leaveAt) removeCustomer(G, c);
      continue;
    }
    // bubble above the head (staggered so neighbours overlap less)
    c.group.getWorldPosition(v); v.y += 2.9 + (c.seatJitter || 0);
    v.project(G.camera);
    if (v.z > 1) { hideBubble(c); continue; }
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    c.bubbleEl.style.left = x + 'px';
    c.bubbleEl.style.top = y + 'px';
    // patience bar inside the bubble
    if (c.order && c.bubbleEl.style.display !== 'none') {
      const bar = c.bubbleEl.querySelector('.bpat i');
      if (bar) bar.style.width = Math.max(0, (c.order.patience / c.order.max) * 100) + '%';
    }
    if (c.happyUntil && nowSec > c.happyUntil && c.order === null) {
      hideBubble(c);
      c.leaving = true;
      c.leaveAt = nowSec + 0.9;
    }  }
}
