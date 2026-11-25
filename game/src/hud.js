// hud.js — DOM HUD: order tickets, cooking panel, timer/score/combo/hearts,
// hand + plate status, toasts, title and game-over overlays.

import { DISHES, componentName } from './cooking.js';

let els = {};
let lastSig = '';
let lastCookSig = '';
let toastTimer = null;

export function initHud(G) {
  els = {
    timer: document.getElementById('timer'),
    score: document.getElementById('score'),
    coins: document.getElementById('coins'),
    combo: document.getElementById('combo'),
    hearts: document.getElementById('hearts'),
    handBar: document.getElementById('handBar'),
    plateBar: document.getElementById('plateBar'),
    tickets: document.getElementById('tickets'),
    cookList: document.getElementById('cookList'),
    toast: document.getElementById('toast'),
    title: document.getElementById('titleScreen'),
    end: document.getElementById('endScreen'),
    endStats: document.getElementById('endStats'),
  };
  document.getElementById('startBtn').addEventListener('click', () => G.startGame());
  document.getElementById('againBtn').addEventListener('click', () => G.restartGame());
}

export function toast(msg) {
  els.toast.textContent = msg;
  els.toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.style.opacity = '0'; }, 1600);
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

export function refresh(G) {
  // timer / score / combo / hearts
  const t = fmtTime(Math.max(0, G.timeLeft));
  if (els.timer.textContent !== t) els.timer.textContent = t;
  els.timer.classList.toggle('low', G.timeLeft <= 30);
  els.score.textContent = G.score;
  els.coins.textContent = G.coins;
  els.combo.textContent = G.combo > 1 ? '🔥 COMBO x' + Math.min(G.combo, 5) : '';
  els.hearts.textContent = '❤'.repeat(Math.max(0, G.hearts)) + '🤍'.repeat(Math.max(0, 3 - G.hearts));

  // hand slots
  const handHtml = [0, 1, 2].map(i =>
    `<span class="slot${G.hand[i] ? ' full' : ''}">${G.hand[i] ? componentName(G.hand[i]) : '—'}</span>`
  ).join('');
  if (els.handBar.dataset.sig !== handHtml) { els.handBar.dataset.sig = handHtml; els.handBar.innerHTML = 'Tangan: ' + handHtml; }

  // plate status
  let plateHtml = '';
  if (G.plateDish) plateHtml = `<span class="ready">🍽 ${DISHES[G.plateDish].name} SIAP DISAJIKAN!</span>`;
  else if (G.plate.length) plateHtml = `<span class="mid">🍽 Piring: ${G.plate.map(componentName).join(' + ')} — belum lengkap</span>`;
  else plateHtml = '<span style="color:#b99b6b">🍽 Piring kosong</span>';
  if (els.plateBar.dataset.sig !== plateHtml) { els.plateBar.dataset.sig = plateHtml; els.plateBar.innerHTML = plateHtml; }

  // order tickets
  const DISH_ICON = { soup: 'food_soup', fish: 'food_cookedFish', salad: 'food_choppedLettuce', burger: 'food_cookedPatty' };
  const sig = G.customers.map(c => (c.order ? c.order.dish + ':' + Math.ceil(c.order.patience) : 'none')).join('|');
  if (sig !== lastSig) {
    lastSig = sig;
    els.tickets.innerHTML = G.customers.filter(c => c.order).map(c => {
      const o = c.order;
      const pct = Math.max(0, (o.patience / o.max) * 100);
      return `<div class="ticket"><img class="tic" src="pixel/${DISH_ICON[o.dish]}.png" alt=""><b>${DISHES[o.dish].name}</b><span class="price">${DISHES[o.dish].price} koin</span><div class="pat"><i class="${pct < 30 ? 'low' : ''}" style="width:${pct}%"></i></div></div>`;
    }).join('') || '<div style="color:#b99b6b;font-size:12px">Belum ada pesanan…</div>';
  } else {
    // update patience bars in place
    const bars = els.tickets.querySelectorAll('.ticket .pat i');
    const orders = G.customers.filter(c => c.order);
    bars.forEach((b, i) => {
      if (!orders[i]) return;
      const pct = Math.max(0, (orders[i].order.patience / orders[i].order.max) * 100);
      b.style.width = pct + '%';
      b.classList.toggle('low', pct < 30);
    });
  }

  // cooking panel
  const cookSig = Object.keys(G.stations).map(id => {
    const st = G.stations[id];
    return id + ':' + (st.done ? 'done' : st.input ? Math.floor((st.progress / st.duration) * 20) : 'idle');
  }).join('|');
  if (cookSig !== lastCookSig) {
    lastCookSig = cookSig;
    const names = { board: 'Talenan', stove: 'Kompor', pot: 'Panci Sup' };
    els.cookList.innerHTML = Object.keys(G.stations).map(id => {
      const st = G.stations[id];
      if (st.done) return `<div class="st">✅ ${names[id]}: <b style="color:#7dff8a">${componentName(st.output)} SIAP!</b></div>`;
      if (st.input) {
        const pct = Math.round((st.progress / st.duration) * 100);
        return `<div class="st">${names[id]}: ${componentName(st.output)} ${pct}%<div class="bar"><i style="width:${pct}%"></i></div></div>`;
      }
      return `<div class="st idle">${names[id]}: —</div>`;
    }).join('');
  }
}

export function showTitle() {
  els.title.classList.remove('hidden');
  els.end.classList.add('hidden');
}
export function hideTitle() { els.title.classList.add('hidden'); }

export function showGameOver(G) {
  els.endStats.innerHTML =
    `Skor akhir: <b>${G.score}</b><br>` +
    `Hidangan disajikan: <b>${G.served}</b> &nbsp;•&nbsp; Pesanan gagal: <b>${G.lost}</b><br>` +
    `Combo terbaik: <b>x${Math.min(Math.max(G.bestCombo, 1), 5)}</b> &nbsp;•&nbsp; Koin: <b>${G.coins}</b><br>` +
    `<span style="font-size:15px;color:#ffd23c">${G.overReason || ''}</span>`;
  els.end.classList.remove('hidden');
}
