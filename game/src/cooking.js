// cooking.js — dishes, orders, stations, hand, plating, serving, scoring.
// The loop: take ingredient -> cook at a station -> plate it on the pass ->
// serve the customer who ordered that dish before their patience runs out.

import { foodMesh } from './scene.js';
import { setBubble, hideBubble, happyBubble, spawnCustomer, removeCustomer } from './people.js';
import * as sfx from './audio.js';

export const INGREDIENTS = { tomato: 'Tomat', lettuce: 'Selada', fish: 'Ikan', bread: 'Roti', patty: 'Patty' };
export const COOKED_NAMES = {
  soup: 'Sup Tomat', cookedFish: 'Ikan Bakar', choppedLettuce: 'Selada Potong',
  choppedTomato: 'Tomat Potong', cookedPatty: 'Patty Matang',
};
export const DISHES = {
  soup: { name: 'Sup Tomat', price: 12, needs: ['soup'] },
  fish: { name: 'Ikan Bakar', price: 18, needs: ['cookedFish'] },
  salad: { name: 'Salad Taman', price: 15, needs: ['choppedLettuce', 'choppedTomato'] },
  burger: { name: 'Burger Ceria', price: 24, needs: ['cookedPatty', 'bread'], unlockAt: 60 },
};

// station id -> raw ingredient -> { out, seconds }
const STATION_RECIPES = {
  board: { lettuce: { out: 'choppedLettuce', seconds: 3 }, tomato: { out: 'choppedTomato', seconds: 3 } },
  stove: { fish: { out: 'cookedFish', seconds: 7 }, patty: { out: 'cookedPatty', seconds: 6 } },
  pot: { tomato: { out: 'soup', seconds: 6 } },
};
const STATION_NAMES = { board: 'Talenan', stove: 'Kompor', pot: 'Panci Sup' };

export function dishName(key) { return DISHES[key].name; }
export function componentName(key) { return COOKED_NAMES[key] || INGREDIENTS[key] || key; }

export function availableDishes(G) {
  return Object.keys(DISHES).filter(k => !DISHES[k].unlockAt || G.elapsed >= DISHES[k].unlockAt);
}

export function initCooking(G) {
  G.hand = [];
  G.plate = [];
  G.plateDish = null;
  G.score = 0; G.coins = 0; G.combo = 0; G.bestCombo = 0;
  G.hearts = 3; G.timeLeft = 180; G.elapsed = 0; G.served = 0; G.lost = 0;
  G.plateVisuals = [];
  G.spawnTimer = 0;
  for (const c of G.customers) assignOrder(G, c);
}

export function assignOrder(G, c) {
  const dishes = availableDishes(G);
  const dish = dishes[Math.floor(Math.random() * dishes.length)];
  const max = 45 + Math.random() * 15;
  c.order = { dish, patience: max, max };
  setBubble(c, `<b>${DISHES[dish].name}</b><small>${DISHES[dish].price} koin</small><div class="bpat"><i style="width:100%"></i></div>`);
  sfx.sfxOrder();
}

function plateMatches(plate, needs) {
  if (plate.length !== needs.length) return false;
  const rest = [...needs];
  for (const p of plate) {
    const i = rest.indexOf(p);
    if (i < 0) return false;
    rest.splice(i, 1);
  }
  return true;
}

function checkPlate(G) {
  G.plateDish = null;
  for (const key of Object.keys(DISHES)) {
    if (plateMatches(G.plate, DISHES[key].needs)) { G.plateDish = key; break; }
  }
}

function addPlateVisual(G, item) {
  const slot = G.passPlates.find(p => p.items.length === 0);
  if (!slot) return;
  const mesh = foodMesh(item, 1.15);
  mesh.position.set(-9.9, 1.22, 1.4 + slot.z);
  G.scene.add(mesh);
  slot.items.push(item);
  G.plateVisuals.push(mesh);
}

function clearPlateVisual(G) {
  for (const m of G.plateVisuals) G.scene.remove(m);
  G.plateVisuals = [];
  for (const p of G.passPlates) p.items = [];
}

function toast(G, msg) { if (G.hud) G.hud.toast(msg); }

export function tryInteract(G, hit) {
  if (G.state !== 'playing') return;
  const kind = hit.kind;
  if (kind === 'crate') takeIngredient(G, hit.ing);
  else if (kind === 'station') useStation(G, hit.id);
  else if (kind === 'pass') plateHand(G);
  else if (kind === 'customer') serveCustomer(G, hit.customer);
}

function takeIngredient(G, ing) {
  if (G.hand.length >= 3) { toast(G, 'Tangan penuh! (max 3)'); sfx.sfxBad(); return; }
  G.hand.push(ing);
  sfx.sfxPickup();
}

function useStation(G, id) {
  const st = G.stations[id];
  if (!st) return;
  if (st.done) {
    if (G.hand.length >= 3) { toast(G, 'Tangan penuh!'); return; }
    G.hand.push(st.output);
    st.input = null; st.output = null; st.done = false; st.progress = 0;
    st.barFg.scale.x = 0.0001;
    toast(G, componentName(st.output || G.hand[G.hand.length - 1]) + ' diambil');
    sfx.sfxPickup();
    return;
  }
  if (st.input) { toast(G, STATION_NAMES[id] + ' masih memasak…'); return; }
  const recipes = STATION_RECIPES[id];
  // find a matching raw ingredient in hand
  const idx = G.hand.findIndex(h => recipes[h]);
  if (idx < 0) {
    const need = Object.keys(recipes).map(r => INGREDIENTS[r]).join(' / ');
    toast(G, STATION_NAMES[id] + ' butuh: ' + need);
    sfx.sfxBad();
    return;
  }
  const raw = G.hand.splice(idx, 1)[0];
  const rec = recipes[raw];
  st.input = raw; st.output = rec.out; st.duration = rec.seconds; st.progress = 0;
  sfx.sfxCook();
  toast(G, componentName(rec.out) + ' dimasak…');
}

function plateHand(G) {
  if (G.hand.length === 0) { toast(G, 'Tangan kosong — ambil bahan dulu'); return; }
  for (const item of G.hand) { G.plate.push(item); addPlateVisual(G, item); }
  G.hand = [];
  checkPlate(G);
  sfx.sfxClick();
  if (G.plateDish) toast(G, DISHES[G.plateDish].name + ' SIAP! Sajikan ke pelanggan ✓');
  else toast(G, 'Piring dirakit — tambah bahan yang kurang');
}

function serveCustomer(G, c) {
  if (!c || !c.order) return;
  if (!G.plateDish) { toast(G, 'Piring belum jadi hidangan yang cocok'); sfx.sfxBad(); return; }
  if (G.plateDish !== c.order.dish) {
    G.combo = 0;
    toast(G, 'Salah hidangan! Combo hilang');
    sfx.sfxBad();
    return;
  }
  const dish = DISHES[c.order.dish];
  const mult = Math.min(1 + G.combo, 5);
  const gain = dish.price * mult;
  G.score += gain; G.coins += dish.price; G.served += 1;
  G.combo += 1; G.bestCombo = Math.max(G.bestCombo, G.combo);
  const servedDish = c.order.dish;
  c.order = null;
  clearPlateVisual(G);
  G.plate = []; G.plateDish = null;
  happyBubble(G, c);
  if (G.hud && G.hud.bigBubbleNow) G.hud.bigBubbleNow('I love this dish too!', performance.now() / 1000);
  sfx.sfxServe();
  toast(G, `+${gain} • ${dish.name} disajikan! (combo x${Math.min(mult, 5)})`);
  G.servedDish = servedDish;
}

function expireOrder(G, c) {
  c.order = null;
  G.hearts -= 1; G.combo = 0; G.lost += 1;
  setBubble(c, 'Huh! Kelamaan…', true);
  c.happyUntil = performance.now() / 1000 + 2.5;
  sfx.sfxHeart();
  toast(G, 'Pelanggan pergi — hati -1 ❤');
  if (G.hearts <= 0) gameOver(G, 'Semua hati habis!');
}

export function gameOver(G, reason) {
  if (G.state !== 'playing') return;
  G.state = 'over';
  G.overReason = reason;
  if (G.hud) G.hud.showGameOver(G);
}

export function updateCooking(G, dt) {
  if (G.state !== 'playing') return;
  G.elapsed += dt;
  G.timeLeft -= dt;
  if (G.timeLeft <= 0) { G.timeLeft = 0; gameOver(G, 'Shift 3 menit selesai!'); return; }
  // stations
  for (const id of Object.keys(G.stations)) {
    const st = G.stations[id];
    if (st.input && !st.done) {
      st.progress += dt;
      st.barFg.scale.x = Math.max(0.0001, Math.min(1, st.progress / st.duration));
      if (st.progress >= st.duration) {
        st.done = true;
        st.barFg.scale.x = 1;
        sfx.sfxDone();
        toast(G, componentName(st.output) + ' MATANG! Klik stasiun untuk ambil');
      }
    }
  }
  // orders patience
  for (const c of [...G.customers]) {
    if (c.order) {
      c.order.patience -= dt;
      if (c.order.patience <= 0) expireOrder(G, c);
    }
  }
  // spawn new customers at free seats
  G.spawnTimer -= dt;
  const freeSeats = G.seats.filter(s => !s.taken);
  if (G.spawnTimer <= 0 && freeSeats.length > 0 && G.customers.length < 7) {
    const seat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
    const c = spawnCustomer(G, seat);
    if (c) assignOrder(G, c);
    G.spawnTimer = 3 + Math.random() * 3;
  }
}
