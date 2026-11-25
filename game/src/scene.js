// scene.js — builds the Chef-RPG-style dining room in 3D:
// warm wooden plank floor, kitchen strip along the back wall, a long cream
// serving counter on the left, dark dining tables with chairs, barrels and
// potted plants. All models are procedural boxes/cylinders/spheres.

import * as THREE from 'three';

// ---- pixel-art texture cache (local PNGs under game/pixel/, nearest filter) ----
const _texLoader = new THREE.TextureLoader();
const _texCache = {};
export function pixelTex(path) {
  if (!_texCache[path]) {
    const t = _texLoader.load(path);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    _texCache[path] = t;
  }
  return _texCache[path];
}

// A camera-facing pixel-art sprite (character / prop), crisp pixels.
export function pixelSprite(path, w, h) {
  const m = new THREE.SpriteMaterial({ map: pixelTex(path), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(m);
  sp.scale.set(w, h, 1);
  return sp;
}

function mat(color, rough = 0.85, metal = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function box(w, h, d, color, x = 0, y = 0, z = 0, rough = 0.85) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, 0.8));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sph(r, color, x = 0, y = 0, z = 0, rough = 0.7) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color, rough));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Small floating text label (canvas sprite, always faces the camera).
export function makeLabel(text, scale = 1, fg = '#3a2a12', bg = '#fff3d6') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.strokeStyle = '#8a6a35'; g.lineWidth = 5;
  g.beginPath(); g.roundRect(4, 6, 248, 60, 14); g.fill(); g.stroke();
  g.fillStyle = fg; g.font = 'bold 34px Trebuchet MS, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.0 * scale, 0.56 * scale, 1);
  return sp;
}

// Wooden plank floor texture, drawn on a canvas (procedural, no files).
function floorTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 384;
  const g = c.getContext('2d');
  const tones = ['#b98a4e', '#a97a42', '#c1935c', '#9c6f3c'];
  const rowH = 48;
  for (let r = 0; r < 8; r++) {
    for (let x = 0; x < 512; x += 128) {
      g.fillStyle = tones[(r + (x / 128)) % tones.length];
      g.fillRect(x, r * rowH, 128, rowH);
      g.fillStyle = 'rgba(0,0,0,0.10)';
      g.fillRect(x, r * rowH, 128, 3);
      g.fillRect(x, r * rowH, 3, rowH);
      // grain strokes
      g.strokeStyle = 'rgba(90,50,10,0.25)'; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const y = r * rowH + 10 + i * 14 + Math.random() * 6;
        g.beginPath(); g.moveTo(x + 8, y);
        g.bezierCurveTo(x + 40, y + 3, x + 80, y - 3, x + 120, y + 2); g.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 4;
  return tex;
}

// A small food picture for the plate / crates: flat pixel-art plane lying
// on the surface (reads like food on a plate from the top-down camera).
export function foodMesh(kind, scale = 1) {
  const g = new THREE.Group();
  const tex = pixelTex('pixel/food_' + kind + '.png');
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  g.add(m);
  g.scale.setScalar(scale);
  return g;
}

export function buildRoom(G) {
  const S = G.scene;
  G.clickables = [];
  G.seats = [];
  G.tables = [];
  G.stations = {};
  G.crates = {};

  // ---- floor & walls (pixel-art wooden planks) ----
  const floorTex = pixelTex('pixel/floor.png');
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(23, 14.5),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  S.add(floor);
  const backWall = box(23, 3.2, 0.5, 0x7c4a26, 0, 1.6, -7.0);
  backWall.castShadow = false; S.add(backWall);
  const leftWall = box(0.5, 3.2, 14.5, 0x6b3f20, -11.4, 1.6, 0);
  leftWall.castShadow = false; S.add(leftWall);
  const rightWall = box(0.5, 3.2, 14.5, 0x6b3f20, 11.4, 1.6, 0);
  rightWall.castShadow = false; S.add(rightWall);
  // warm rug under the dining area
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 9.5),
    new THREE.MeshStandardMaterial({ color: 0x8a2f28, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(1.2, 0.02, 1.2); rug.receiveShadow = true;
  S.add(rug);
  const rugIn = new THREE.Mesh(new THREE.PlaneGeometry(14.3, 8.3),
    new THREE.MeshStandardMaterial({ color: 0xa8443a, roughness: 1 }));
  rugIn.rotation.x = -Math.PI / 2; rugIn.position.set(1.2, 0.035, 1.2); rugIn.receiveShadow = true;
  S.add(rugIn);

  // ---- kitchen counter along the back wall (low enough to clear the HUD) ----
  const counter = box(21, 1.0, 1.3, 0x8a5a30, 0, 0.5, -4.2);
  S.add(counter);
  const counterTop = box(21, 0.12, 1.4, 0x4a4a55, 0, 1.06, -4.2, 0.4);
  counterTop.material.metalness = 0.5;
  S.add(counterTop);

  // ---- ingredient crates on the kitchen counter ----
  const crateDefs = [
    { ing: 'tomato', label: 'Tomat', x: -8.6, color: 0xd9382b },
    { ing: 'lettuce', label: 'Selada', x: -6.6, color: 0x58b368 },
    { ing: 'fish', label: 'Ikan', x: -4.6, color: 0x5a9fd4 },
    { ing: 'bread', label: 'Roti', x: -2.6, color: 0xe0aa5e },
    { ing: 'patty', label: 'Patty', x: -0.6, color: 0x7a4a22 },
  ];
  for (const cd of crateDefs) {
    const grp = new THREE.Group();
    grp.position.set(cd.x, 1.12, -4.2);
    const base = box(1.5, 0.5, 1.1, 0x9a6a35, 0, 0.25, 0);
    grp.add(base);
    // pixel-art food pictures lying on top of the crate
    for (let i = 0; i < 3; i++) {
      const fm = foodMesh(cd.ing, 0.75);
      fm.position.set(-0.4 + i * 0.4, 0.52, (i % 2 === 0 ? -0.2 : 0.2));
      grp.add(fm);
    }
    const lab = makeLabel(cd.label, 0.85); lab.position.set(0, 1.35, 0); grp.add(lab);
    grp.traverse(o => { o.userData = { kind: 'crate', ing: cd.ing }; });
    grp.userData = { kind: 'crate', ing: cd.ing };
    S.add(grp);
    G.crates[cd.ing] = grp;
    G.clickables.push(grp);
  }

  // ---- cooking stations on the kitchen counter ----
  const stationDefs = [
    { id: 'board', label: 'Talenan', x: 2.2, build: g => {
      g.add(box(1.6, 0.14, 1.0, 0xd9b380, 0, 0.08, 0));
      g.add(box(0.5, 0.1, 0.7, 0xe8e8e8, -0.35, 0.18, 0)); // knife hint
    } },
    { id: 'stove', label: 'Kompor', x: 5.0, build: g => {
      g.add(box(1.7, 0.5, 1.1, 0x2e2e34, 0, 0.25, 0, 0.4));
      g.add(cyl(0.42, 0.42, 0.08, 0x111116, -0.4, 0.54, 0));
      g.add(cyl(0.42, 0.42, 0.08, 0x111116, 0.4, 0.54, 0));
      const flame = cyl(0.3, 0.3, 0.05, 0xff8c2a, -0.4, 0.6, 0);
      flame.material = new THREE.MeshStandardMaterial({ color: 0xff8c2a, emissive: 0xff6a00, emissiveIntensity: 1.2 });
      g.add(flame);
    } },
    { id: 'pot', label: 'Panci Sup', x: 7.8, build: g => {
      g.add(cyl(0.62, 0.55, 0.7, 0x3a3a44, 0, 0.35, 0, 16));
      const soup = cyl(0.5, 0.5, 0.06, 0xe86a2a, 0, 0.68, 0);
      soup.material = new THREE.MeshStandardMaterial({ color: 0xe86a2a, emissive: 0x903a00, emissiveIntensity: 0.35 });
      g.add(soup);
    } },
  ];
  for (const sd of stationDefs) {
    const grp = new THREE.Group();
    grp.position.set(sd.x, 1.12, -4.2);
    sd.build(grp);
    const lab = makeLabel(sd.label, 0.85); lab.position.set(0, 1.45, 0); grp.add(lab);
    // progress bar above the station
    const barBg = box(1.5, 0.16, 0.06, 0x222222, 0, 1.05, 0.6);
    barBg.material = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const barFg = box(1.44, 0.1, 0.07, 0x58b368, -0.72, 1.05, 0.6);
    barFg.material = new THREE.MeshBasicMaterial({ color: 0xffb63c });
    barFg.geometry.translate(0.72, 0, 0); // scale from left
    barFg.scale.x = 0.0001;
    grp.add(barBg); grp.add(barFg);
    grp.traverse(o => { o.userData = { kind: 'station', id: sd.id }; });
    grp.userData = { kind: 'station', id: sd.id };
    S.add(grp);
    G.stations[sd.id] = { group: grp, barFg, input: null, progress: 0, duration: 0, done: false };
    G.clickables.push(grp);
  }

  // ---- long cream serving counter (the pass) on the left ----
  const pass = new THREE.Group();
  pass.position.set(-9.9, 0, 0.4);
  pass.add(box(1.6, 1.0, 7.2, 0x8a5a30, 0, 0.5, 0));
  pass.add(box(1.8, 0.12, 7.4, 0xe8dcc0, 0, 1.06, 0, 0.5));
  // three white plates waiting on the pass
  const plateZ = [-2.2, 0, 2.2];
  G.passPlates = [];
  for (const pz of plateZ) {
    const plate = cyl(0.62, 0.5, 0.08, 0xffffff, 0, 1.16, pz, 20);
    plate.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    pass.add(plate);
    G.passPlates.push({ mesh: plate, z: pz, items: [] });
  }
  const passLab = makeLabel('MEJA SAJI', 1.0); passLab.position.set(0, 2.1, 0); pass.add(passLab);
  pass.traverse(o => { o.userData = { kind: 'pass' }; });
  pass.userData = { kind: 'pass' };
  S.add(pass);
  G.clickables.push(pass);
  G.passGroup = pass;

  // ---- dining tables + chairs ----
  const tableDefs = [
    { x: -4.5, z: -0.7 }, { x: 0.5, z: -0.7 }, { x: 5.5, z: -0.7 },
    { x: -2.0, z: 3.7 }, { x: 3.5, z: 3.7 },
  ];
  for (const td of tableDefs) {
    const t = new THREE.Group();
    t.position.set(td.x, 0, td.z);
    const tableTex = pixelTex('pixel/table.png');
    const topSide = mat(0x2e2018, 0.6);
    const topMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 2.0),
      [topSide, topSide, topMat, topSide, topSide, topSide]);
    top.position.y = 0.95; top.castShadow = true; top.receiveShadow = true;
    t.add(top);
    for (const [lx, lz] of [[-1.5, -0.8], [1.5, -0.8], [-1.5, 0.8], [1.5, 0.8]])
      t.add(box(0.16, 0.95, 0.16, 0x241812, lx, 0.48, lz));
    // place setting: tiny plates + glasses
    for (const [px, pz] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) {
      t.add(cyl(0.22, 0.18, 0.04, 0xf5f0e0, px, 1.05, pz, 12));
    }
    // chairs: two per side (north & south), facing the table
    const chairSpots = [[-0.9, -1.55, 0], [0.9, -1.55, 0], [-0.9, 1.55, Math.PI], [0.9, 1.55, Math.PI]];
    for (const [cx, cz, rot] of chairSpots) {
      const ch = new THREE.Group();
      ch.position.set(cx, 0, cz); ch.rotation.y = rot;
      ch.add(box(0.7, 0.1, 0.7, 0x7a3a22, 0, 0.5, 0));
      ch.add(box(0.7, 0.9, 0.1, 0x7a3a22, 0, 0.95, -0.32));
      for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]])
        ch.add(box(0.08, 0.5, 0.08, 0x5a2a18, lx, 0.25, lz));
      t.add(ch);
      G.seats.push({ pos: new THREE.Vector3(td.x + cx, 0, td.z + cz), rotY: rot, table: t, taken: null });
    }
    t.traverse(o => { o.userData = { kind: 'table' }; });
    t.userData = { kind: 'table' };
    S.add(t);
    G.tables.push(t);
  }

  // ---- barrels (pixel-art sprites, bottom-left decor) ----
  for (const [bx, bz] of [[-9.6, 5.6], [-7.9, 5.95]]) {
    const b = pixelSprite('pixel/barrel.png', 1.7, 1.7);
    b.position.set(bx, 0.85, bz);
    S.add(b);
  }

  // ---- potted plants (pixel-art sprites) ----
  for (const [px, pz] of [[-5.2, 6.1], [8.8, 5.7], [9.9, -4.6]]) {
    const p = pixelSprite('pixel/plant.png', 1.7, 1.7);
    p.position.set(px, 0.85, pz);
    S.add(p);
  }

  // ---- chef standing at the kitchen (pixel-art sprite) ----
  const chef = pixelSprite('pixel/chef.png', 2.0, 3.0);
  chef.position.set(10.4, 1.5, -4.2);
  S.add(chef);

  // ---- pendant lamps over the dining area ----
  for (const [lx, lz] of [[-2, -1.8], [3, -1.8], [0.8, 3.0]]) {
    const cord = cyl(0.03, 0.03, 1.6, 0x222222, lx, 2.4, lz, 6);
    S.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.4, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
    shade.position.set(lx, 1.6, lz); shade.castShadow = true; S.add(shade);
    const bulb = sph(0.14, 0xffe9a0, lx, 1.45, lz);
    bulb.material = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc94d, emissiveIntensity: 2 });
    S.add(bulb);
  }

  // ---- menu board on the back wall ----
  const menu = box(3.4, 1.6, 0.1, 0x2e2018, -9.0, 2.2, -6.7, 0.7);
  S.add(menu);
  const menuLab = makeLabel('MENU', 0.9, '#ffd23c', '#2e2018'); menuLab.position.set(-9.0, 2.5, -6.55); S.add(menuLab);
}
