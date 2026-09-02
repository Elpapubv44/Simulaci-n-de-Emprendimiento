import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================
   JOKER WASH & PLAY — Versión 2.0 (Three.js)
   - Optimizaciones de rendimiento (sombras, niebla, segmentos, luces, caché)
   - Modo primera persona jugable (WASD + mouse look + colisiones)
   - 10 NPCs interactivos con roles, waypoints y estados
   - Vista aérea orbitable + click-to-flyTo preservado
   ========================================================= */

const C = {
  rojo: 0xe0203c, oro: 0xf2c14e, cian: 0x3fd8e8, humo: 0xa88cff,
  negro: 0x0c0a12, gris: 0x2a2733, felt: 0x14663f, piso: 0x171520, madera: 0x6b4a30
};

/* =========================================================
   1. RENDERER & ESCENA (Optimizaciones A1 y A2)
   ========================================================= */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

// Optimización A1: Shadow map a 1024x1024 con bias ajustado
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);

// Optimización A2: FogExp2 en lugar de Fog lineal
scene.fog = new THREE.FogExp2(0x05040a, 0.012);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 30, 68);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 4;
controls.maxDistance = 120;
controls.target.set(0, 6, 0);

/* ---------- Luces (Optimizaciones A1 y A4) ---------- */
scene.add(new THREE.HemisphereLight(0x6a7ac0, 0x0d0b16, 0.85));

const moon = new THREE.DirectionalLight(0x9fb0ff, 0.95);
moon.position.set(40, 60, 30);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024); // Reducido de 2048 a 1024
moon.shadow.bias = -0.0006;         // Bias para evitar shadow acne
moon.shadow.normalBias = 0.02;      // Bias normal para curvaturas
moon.shadow.camera.near = 10;
moon.shadow.camera.far = 180;
const d = 60;
Object.assign(moon.shadow.camera, { left: -d, right: d, top: d, bottom: -d });
moon.shadow.camera.updateProjectionMatrix();
scene.add(moon);

/* =========================================================
   2. HELPERS & CACHÉ DE TEXTURAS (Optimización A5)
   ========================================================= */
const textTexCache = new Map();
let cachedJokerTex = null;

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...o });
const GLOW = (color, i = 1.6) => new THREE.MeshStandardMaterial({
  color, emissive: color, emissiveIntensity: i, roughness: 0.4, metalness: 0
});

// Optimización A3: Geometrías con presupuestos de segmentos reducidos
function box(w, h, dp, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}

function cyl(rt, rb, h, seg = 8, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}

/** Textura de texto con caché para no recrear canvas idénticos */
function textTex(txt, {
  fg = '#fff', bg = 'rgba(0,0,0,0)', font = 140,
  family = 'Bebas Neue, Impact, sans-serif', w = 1024, h = 256, glow = '#fff'
} = {}) {
  const key = `${txt}|${fg}|${bg}|${font}|${glow}|${w}|${h}`;
  if (textTexCache.has(key)) return textTexCache.get(key);

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.font = `${font}px ${family}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = glow;
  g.shadowBlur = 34;
  g.fillStyle = fg;
  g.fillText(txt, w / 2, h / 2 + 6);
  g.fillText(txt, w / 2, h / 2 + 6);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textTexCache.set(key, t);
  return t;
}

function sign(txt, wm, hm, color = '#ffffff', parent = scene) {
  const tex = textTex(txt, { fg: color, glow: color, font: 150 });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(wm, hm),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  parent.add(m);
  return m;
}

function jokerTex() {
  if (cachedJokerTex) return cachedJokerTex;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#12101a';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#f2c14e';
  g.lineWidth = 14;
  g.strokeRect(28, 28, 456, 456);
  g.fillStyle = '#e0203c';
  g.beginPath();
  g.moveTo(256, 150);
  g.bezierCurveTo(150, 150, 140, 270, 210, 300);
  g.lineTo(190, 400);
  g.lineTo(322, 400);
  g.lineTo(302, 300);
  g.bezierCurveTo(372, 270, 362, 150, 256, 150);
  g.fill();
  const dots = [[150, 120, '#3fd8e8'], [362, 120, '#f2c14e'], [256, 86, '#a88cff']];
  dots.forEach(([x, y, col]) => {
    g.fillStyle = col; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill();
  });
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(228, 232, 16, 0, 7); g.fill();
  g.beginPath(); g.arc(288, 232, 16, 0, 7); g.fill();
  g.fillStyle = '#f2c14e';
  g.font = 'bold 70px Bebas Neue, Impact, sans-serif';
  g.textAlign = 'center';
  g.fillText('JOKER', 256, 468);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cachedJokerTex = t;
  return t;
}

const neonSigns = [];
const marquee = new THREE.Group();

/* =========================================================
   3. ARQUITECTURA DEL EDIFICIO
   ========================================================= */
const W = 15, D = 22, H = 6.4;
const XW = { lavanderia: -15, casino: 0, fumadores: 15 };
const FRONT = D / 2; // 11

const world = new THREE.Group();
scene.add(world);

// Calle y vereda
(function calle() {
  const asf = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M(0x0e0d13, { roughness: 0.95 }));
  asf.rotation.x = -Math.PI / 2;
  asf.position.y = -0.02;
  asf.receiveShadow = true;
  world.add(asf);

  const vereda = box(60, 0.5, 34, M(0x24222c, { roughness: 0.9 }), 0, 0.25, 0, world);
  vereda.receiveShadow = true;

  for (let i = -8; i <= 8; i++) {
    box(3, 0.02, 0.35, GLOW(0xf2c14e, 0.35), i * 7, 0.01, 30, world);
  }

  // Farolas con segmentos reducidos (8) y luces puntuales optimizadas (16 inten, 18 dist)
  [-30, -10, 10, 30].forEach(x => {
    cyl(0.16, 0.2, 7, 8, M(0x1b1a22, { metalness: 0.6, roughness: 0.4 }), x, 3.5, 20, world);
    cyl(0.5, 0.35, 0.4, 8, GLOW(0xffd9a0, 2.2), x, 7.1, 20, world);
    const p = new THREE.PointLight(0xffcf9a, 16, 18, 2);
    p.position.set(x, 6.8, 20);
    world.add(p);
  });

  // Maceteros
  for (let i = 0; i < 6; i++) {
    const x = -24 + i * 9.6;
    box(1.6, 1, 1.6, M(0x2c2a34), x, 0.95, 14.4, world);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), M(0x1f5c3a, { flatShading: true }));
    bush.position.set(x, 2.1, 14.4);
    bush.castShadow = true;
    world.add(bush);
  }
})();

// Cascarón
const shell = new THREE.Group();
world.add(shell);
const wings = {};

const matPared = M(0x1a1822, { roughness: 0.85 });
const matPared2 = M(0x221f2c, { roughness: 0.85 });
const matVidrio = new THREE.MeshPhysicalMaterial({
  color: 0x9fd8e6, transparent: true, opacity: 0.16,
  roughness: 0.08, metalness: 0, transmission: 0, side: THREE.DoubleSide
});

(function edificio() {
  const losa = box(W * 3 + 1.2, 0.6, D + 1.2, M(0x15131c), 0, 0.3, 0, shell);
  losa.receiveShadow = true;

  Object.entries(XW).forEach(([key, cx], i) => {
    const g = new THREE.Group();
    shell.add(g);

    // Piso interior
    box(W - 0.3, 0.12, D - 0.3, M(C.piso, { roughness: 0.55, metalness: 0.15 }), cx, 0.62, 0, g);

    // Pared trasera y laterales
    box(W, H, 0.5, matPared, cx, H / 2 + 0.6, -D / 2, g);
    if (i === 0) box(0.5, H, D, matPared, cx - W / 2, H / 2 + 0.6, 0, g);
    if (i === 2) box(0.5, H, D, matPared, cx + W / 2, H / 2 + 0.6, 0, g);

    // Tabique divisorio con paso central de 4m (abierto para tránsito libre entre alas)
    if (i < 2) {
      box(0.35, H, (D - 4) / 2, matPared2, cx + W / 2, H / 2 + 0.6, (D + 4) / 4, g);
      box(0.35, H, (D - 4) / 2, matPared2, cx + W / 2, H / 2 + 0.6, -(D + 4) / 4, g);
    }

    // Fachada: dintel, laterales, zócalo
    box(W, 0.9, 0.6, matPared2, cx, H + 0.15, FRONT, g);
    box(0.7, H, 0.6, matPared2, cx - W / 2 + 0.35, H / 2 + 0.6, FRONT, g);
    box(0.7, H, 0.6, matPared2, cx + W / 2 - 0.35, H / 2 + 0.6, FRONT, g);
    box(W, 0.5, 0.6, matPared2, cx, 0.85, FRONT, g);

    const glass = box(W - 1.4, H - 1.4, 0.12, matVidrio, cx, H / 2 + 0.9, FRONT, g);
    glass.castShadow = false;

    // Parantes
    for (let k = -1; k <= 1; k++) {
      box(0.16, H - 1.4, 0.2, M(0x3a3644, { metalness: 0.7, roughness: 0.35 }), cx + k * 4.2, H / 2 + 0.9, FRONT + 0.05, g);
    }

    // Puerta de entrada (hueco practicable para caminar)
    box(2.6, 3.2, 0.18, new THREE.MeshStandardMaterial({
      color: 0x0d0c12, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.35
    }), cx, 2.3, FRONT + 0.16, g);
    box(2.9, 0.18, 0.5, GLOW(0xf2c14e, 1.2), cx, 4.05, FRONT + 0.2, g);

    // Techo
    const ceilMat = M(0x1e1b26, { roughness: 0.9, transparent: true, opacity: 1 });
    const ceiling = box(W, 0.5, D, ceilMat, cx, H + 0.85, 0, g);

    wings[key] = { group: g, ceiling, glass, interior: null };
  });

  // Parapeto de la terraza
  const par = M(0x232029, { roughness: 0.9 });
  const TW = W * 3, TZ = D;
  box(TW + 0.6, 1.1, 0.4, par, 0, H + 1.65, TZ / 2, shell);
  box(TW + 0.6, 1.1, 0.4, par, 0, H + 1.65, -TZ / 2, shell);
  box(0.4, 1.1, TZ, par, -TW / 2, H + 1.65, 0, shell);
  box(0.4, 1.1, TZ, par, TW / 2, H + 1.65, 0, shell);
})();

shell.add(marquee);

// Carteles de fachada y marquesina
(function carteles() {
  const s1 = sign('LAVANDERÍA', 11, 2.6, '#3fd8e8', shell);
  s1.position.set(XW.lavanderia, 5.1, FRONT + 0.35);
  const s2 = sign('CASINO', 8.5, 2.6, '#f2c14e', shell);
  s2.position.set(XW.casino, 5.1, FRONT + 0.35);
  const s3 = sign('FUMADORES', 10.5, 2.6, '#a88cff', shell);
  s3.position.set(XW.fumadores, 5.1, FRONT + 0.35);
  neonSigns.push(s1, s2, s3);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: jokerTex(), transparent: true })
  );
  logo.position.set(0, H + 3.9, FRONT + 0.25);
  marquee.add(logo);
  box(5.2, 5.2, 0.4, M(0x191722, { metalness: 0.4, roughness: 0.5 }), 0, H + 3.9, FRONT + 0.05, marquee);

  const big = sign('WASH & PLAY', 16, 3.4, '#e0203c', marquee);
  big.position.set(0, H + 7.4, FRONT + 0.2);
  const big2 = sign('JOKER', 9, 4.4, '#f2c14e', marquee);
  big2.position.set(0, H + 10.4, FRONT + 0.2);
  neonSigns.push(big, big2);

  box(0.35, 8, 0.35, M(0x1b1a22), -5.5, H + 7, FRONT - 0.1, marquee);
  box(0.35, 8, 0.35, M(0x1b1a22), 5.5, H + 7, FRONT - 0.1, marquee);

  const strip = GLOW(C.rojo, 2.4);
  box(W * 3 + 1, 0.18, 0.18, strip, 0, H + 1.1, FRONT + 0.32, shell);
  box(0.18, H, 0.18, strip, -W * 1.5, H / 2 + 0.6, FRONT + 0.32, shell);
  box(0.18, H, 0.18, strip, W * 1.5, H / 2 + 0.6, FRONT + 0.32, shell);
})();

/* =========================================================
   4. MOBILIARIO OPTIMIZADO (Reducción de segmentos)
   ========================================================= */
function silla(x, z, g, rot = 0, col = 0x3a2430) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.y = rot;
  g.add(s);
  cyl(0.42, 0.36, 0.28, 8, M(col), 0, 1.15, 0, s);
  cyl(0.09, 0.09, 0.9, 6, M(0x2a2733, { metalness: 0.6, roughness: 0.4 }), 0, 0.78, 0, s);
  cyl(0.42, 0.42, 0.08, 8, M(0x2a2733, { metalness: 0.6 }), 0, 0.38, 0, s);
  box(0.8, 0.9, 0.16, M(col), 0, 1.75, -0.36, s);
  return s;
}

function luzTecho(x, z, g, color = 0xffffff, inten = 1.4, w = 3.4) {
  box(w, 0.14, 0.4, GLOW(color, inten), x, H + 0.45, z, g);
}

function tragamonedas(x, z, g, rot = 0, color = C.oro) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.y = rot;
  g.add(s);
  box(1.05, 2.1, 0.85, M(0x201d29, { metalness: 0.35, roughness: 0.5 }), 0, 1.7, 0, s);
  box(0.95, 0.14, 0.9, GLOW(color, 2.2), 0, 2.82, 0, s);
  box(0.8, 0.62, 0.06, GLOW(0x30e0a0, 1.5), 0, 2.15, 0.45, s);
  box(0.8, 0.5, 0.06, GLOW(color, 1.1), 0, 1.45, 0.45, s);
  box(0.9, 0.2, 0.35, M(0x2e2b38, { metalness: 0.5 }), 0, 1.05, 0.55, s);
  const pal = cyl(0.05, 0.05, 0.5, 6, M(0xb03040, { metalness: 0.6 }), 0.62, 2.0, 0.18, s);
  pal.rotation.z = 0.35;
  return s;
}

function mesaPano(x, z, g, { r = 1.9, semi = false, oval = false, col = C.felt } = {}) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  g.add(s);
  const th = semi ? Math.PI : Math.PI * 2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 18, 1, false, 0, th), M(col, { roughness: 0.95 }));
  top.position.y = 1.6;
  top.castShadow = top.receiveShadow = true;
  s.add(top);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 6, 20, th), M(0x3b2a1d, { roughness: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.7;
  s.add(rim);

  cyl(0.35, 0.55, 1.5, 8, M(0x241f2b), 0, 0.85, 0, s);
  if (oval) s.scale.set(1.45, 1, 1);
  return s;
}

function fichas(x, y, z, g, col) {
  for (let i = 0; i < 5; i++) cyl(0.16, 0.16, 0.05, 8, GLOW(col, 0.35), x, y + i * 0.055, z, g);
}

/* =========================================================
   5. INTERIORES DE LAS ALAS (Luces y geometrías optimizadas)
   ========================================================= */
function lavarropas(x, z, gg, rot = 0, apilado = false) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.y = rot;
  gg.add(s);
  const alturas = apilado ? [1.6, 3.35] : [1.6];
  alturas.forEach(y => {
    box(1.7, 1.65, 1.55, M(0xdfe4ea, { roughness: 0.35, metalness: 0.25 }), 0, y, 0, s);
    const puerta = new THREE.Mesh(
      new THREE.CircleGeometry(0.56, 16),
      new THREE.MeshStandardMaterial({
        color: 0x0a1a22, roughness: 0.1, metalness: 0.6,
        emissive: 0x0e5f72, emissiveIntensity: 0.7
      })
    );
    puerta.position.set(0, y, 0.79);
    s.add(puerta);

    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 6, 16), M(0x9aa3ad, { metalness: 0.8, roughness: 0.25 }));
    aro.position.set(0, y, 0.78);
    s.add(aro);
    box(1.4, 0.16, 0.05, GLOW(C.cian, 1.2), 0, y + 0.66, 0.8, s);
  });
  return s;
}

function buildLavanderia() {
  const g = new THREE.Group();
  const cx = XW.lavanderia;
  wings.lavanderia.group.add(g);

  box(W - 0.4, 0.06, D - 0.4, M(0x20303a, { roughness: 0.35, metalness: 0.2 }), cx, 0.7, 0, g);

  for (let i = 0; i < 7; i++) lavarropas(cx - 5.6 + i * 1.9, -9.6, g, 0);
  for (let i = 0; i < 5; i++) lavarropas(cx - 6.4, -5.6 + i * 1.9, g, Math.PI / 2, true);
  for (let i = 0; i < 5; i++) lavarropas(cx + 6.4, -5.6 + i * 1.9, g, -Math.PI / 2);

  // Mesada de plegado
  box(6.4, 0.25, 1.6, M(0x8c6a45, { roughness: 0.6 }), cx, 1.55, 3.4, g);
  box(6.4, 1.4, 1.4, M(0x2a2733), cx, 0.95, 3.4, g);
  [-2, -0.4, 1.2, 2.6].forEach((o, i) => {
    const col = [0xe0203c, 0x3fd8e8, 0xf2c14e, 0xffffff][i];
    for (let k = 0; k < 3; k++) box(1.1, 0.18, 0.9, M(col, { roughness: 0.9 }), cx + o, 1.78 + k * 0.2, 3.4, g);
  });

  // Perchero
  const barra = cyl(0.07, 0.07, 7.4, 6, M(0xb9bfc7, { metalness: 0.8 }), cx, 4.3, 7.4, g);
  barra.rotation.z = Math.PI / 2;
  ['#d94f6a', '#4fc3d9', '#f0d38a', '#8f7ad9', '#e8e4dc'].forEach((c, i) => {
    const cort = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 3.1),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(c), side: THREE.DoubleSide, roughness: 0.95 })
    );
    cort.position.set(cx - 2.8 + i * 1.4, 2.7, 7.4);
    cort.castShadow = true;
    g.add(cort);
  });

  // Estantería
  const est = new THREE.Group();
  est.position.set(cx + 5.4, 0, 6.8);
  g.add(est);
  for (let k = 0; k < 3; k++) box(3.4, 0.14, 1.1, M(0x8c6a45), 0, 1.2 + k * 1.1, 0, est);
  box(0.16, 3.6, 1.1, M(0x8c6a45), -1.7, 2.2, 0, est);
  box(0.16, 3.6, 1.1, M(0x8c6a45), 1.7, 2.2, 0, est);

  for (let i = 0; i < 3; i++) silla(cx - 4 + i * 1.6, 8.6, g, Math.PI, 0x2f3b45);
  box(3.4, 1.9, 0.16, GLOW(0x1b4f7a, 0.8), cx + 3.2, 4.2, -10.5, g);
  box(3.7, 2.2, 0.1, M(0x121118), cx + 3.2, 4.2, -10.62, g);

  const s = sign('LAVADO - BLANQUERÍA - CALZADO', 11, 1.9, '#3fd8e8', g);
  s.position.set(cx, 5.6, -10.4);
  luzTecho(cx - 3.5, -6, g, 0xd8f4ff, 1.3);
  luzTecho(cx + 3.5, -6, g, 0xd8f4ff, 1.3);
  luzTecho(cx - 3.5, 4, g, 0xd8f4ff, 1.3);
  luzTecho(cx + 3.5, 4, g, 0xd8f4ff, 1.3);

  // Optimización A4: Luz puntual reducida (22 inten, 18 dist)
  const pl = new THREE.PointLight(0xbfe9ff, 22, 18, 2);
  pl.position.set(cx, 4.6, -2);
  g.add(pl);

  wings.lavanderia.interior = g;
}

function buildCasino() {
  const g = new THREE.Group();
  const cx = XW.casino;
  wings.casino.group.add(g);

  box(W - 0.4, 0.06, D - 0.4, M(0x5a1226, { roughness: 0.95 }), cx, 0.7, 0, g);
  for (let i = 0; i < 5; i++) box(W - 0.6, 0.02, 0.25, GLOW(C.oro, 0.5), cx, 0.74, -9 + i * 4.4, g);

  // Ruleta
  const rul = mesaPano(cx - 3.4, -5.6, g, { r: 2.0 });
  cyl(1.05, 1.05, 0.3, 16, M(0x241a12, { roughness: 0.4, metalness: 0.3 }), 0, 1.85, 0, rul);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const sec = box(0.34, 0.1, 0.9, i % 2 ? GLOW(C.rojo, 0.6) : M(0x111014),
      Math.cos(a) * 0.62, 2.0, Math.sin(a) * 0.62, rul);
    sec.rotation.y = -a;
  }
  cyl(0.14, 0.22, 0.5, 8, M(0xd8b45a, { metalness: 0.9, roughness: 0.2 }), 0, 2.2, 0, rul);
  for (let i = 0; i < 6; i++) {
    silla(cx - 3.4 + Math.cos(i / 6 * 6.28) * 3.1, -5.6 + Math.sin(i / 6 * 6.28) * 3.1, g, -i / 6 * 6.28 + Math.PI / 2, 0x4a1f2c);
  }
  const sr = sign('RULETA', 3.4, 1.1, '#e0203c', g);
  sr.position.set(cx - 3.4, 4.4, -5.6);

  // Blackjack
  [[cx + 4.2, -6.4], [cx + 4.2, -1.2]].forEach(([x, z]) => {
    const m = mesaPano(x, z, g, { r: 1.85, semi: true });
    m.rotation.y = Math.PI;
    fichas(x - 0.7, 1.72, z + 0.9, g, C.rojo);
    fichas(x + 0.7, 1.72, z + 0.9, g, C.cian);
    for (let k = 0; k < 4; k++) silla(x - 1.9 + k * 1.25, z + 2.5, g, Math.PI, 0x243a4a);
    box(0.9, 0.06, 0.6, M(0xf2f0ea), x, 1.75, z - 0.6, g);
  });
  const sb = sign('BLACKJACK', 4.6, 1.2, '#f2c14e', g);
  sb.position.set(cx + 4.2, 4.4, -8.8);

  // Poker
  mesaPano(cx - 3.2, 3.6, g, { r: 1.8, oval: true, col: 0x123c66 });
  fichas(cx - 4.6, 1.72, 4.6, g, C.oro);
  fichas(cx - 2.0, 1.72, 4.6, g, C.humo);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    silla(cx - 3.2 + Math.cos(a) * 3.6, 3.6 + Math.sin(a) * 2.9, g, -a + Math.PI / 2, 0x2c2440);
  }
  const sp = sign('POKER', 3.2, 1.1, '#3fd8e8', g);
  sp.position.set(cx - 3.2, 4.4, 3.6);

  // Tragamonedas
  for (let i = 0; i < 6; i++) tragamonedas(cx - 6.1 + i * 2.45, -10.0, g, 0, i % 2 ? C.rojo : C.oro);
  const sj = sign('* JACKPOT *', 9, 2.2, '#f2c14e', g);
  sj.position.set(cx, 5.7, -10.5);
  neonSigns.push(sj);

  // Barra
  box(6.2, 1.5, 1.2, M(0x2a1c26, { roughness: 0.6 }), cx + 4.6, 1.35, 8.2, g);
  box(6.4, 0.18, 1.4, M(0x0f0e14, { metalness: 0.6, roughness: 0.2 }), cx + 4.6, 2.18, 8.2, g);
  box(6.2, 0.2, 0.2, GLOW(C.rojo, 2.0), cx + 4.6, 0.8, 7.62, g);
  for (let i = 0; i < 4; i++) cyl(0.35, 0.3, 0.2, 8, M(0x4a1f2c), cx + 2.2 + i * 1.6, 1.9, 6.9, g);
  for (let i = 0; i < 10; i++) box(0.22, 0.6, 0.22, GLOW([0xf2c14e, 0xe0203c, 0x3fd8e8][i % 3], 0.7), cx + 2 + i * 0.55, 3.1, 8.8, g);

  // Arañas de luz optimizadas (28 inten, 16 dist)
  [[cx - 3.4, -5.6], [cx + 4.2, -3.8], [cx - 3.2, 3.6]].forEach(([x, z]) => {
    cyl(0.05, 0.05, 1.2, 6, M(0x2a2733), x, H - 0.2, z, g);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), GLOW(0xffe1a8, 1.8));
    b.position.set(x, H - 0.9, z);
    g.add(b);
    const p = new THREE.PointLight(0xffd79a, 28, 16, 2);
    p.position.set(x, H - 1.1, z);
    g.add(p);
  });
  luzTecho(cx, 9, g, 0xff6a86, 1.1, 8);

  wings.casino.interior = g;
}

let smokeSystem = null;

function buildFumadores() {
  const g = new THREE.Group();
  const cx = XW.fumadores;
  wings.fumadores.group.add(g);

  box(W - 0.4, 0.06, D - 0.4, M(0x241a33, { roughness: 0.9 }), cx, 0.7, 0, g);
  for (let i = 0; i < 4; i++) box(W - 0.6, 0.02, 0.2, GLOW(C.humo, 0.6), cx, 0.74, -8 + i * 5, g);

  // Mampara vidriada
  const mamp = new THREE.Mesh(
    new THREE.PlaneGeometry(D - 2, H - 1),
    new THREE.MeshPhysicalMaterial({ color: 0xa88cff, transparent: true, opacity: 0.13, roughness: 0.05, side: THREE.DoubleSide })
  );
  mamp.rotation.y = Math.PI / 2;
  mamp.position.set(cx - W / 2 + 0.4, H / 2 + 0.6, 0);
  g.add(mamp);

  for (let i = 0; i < 5; i++) tragamonedas(cx - 4.8 + i * 2.4, -9.9, g, 0, C.humo);
  for (let i = 0; i < 4; i++) tragamonedas(cx + 6.2, -4.5 + i * 2.4, g, -Math.PI / 2, i % 2 ? C.rojo : C.humo);

  mesaPano(cx - 2.2, -3.4, g, { r: 1.7, oval: true, col: 0x2a1747 });
  fichas(cx - 3.4, 1.72, -2.6, g, C.humo);
  fichas(cx - 1.1, 1.72, -2.6, g, C.oro);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    silla(cx - 2.2 + Math.cos(a) * 3.3, -3.4 + Math.sin(a) * 2.7, g, -a + Math.PI / 2, 0x33254d);
  }

  const bj = mesaPano(cx - 3.6, 4.6, g, { r: 1.6, semi: true });
  bj.rotation.y = Math.PI;
  for (let k = 0; k < 3; k++) silla(cx - 4.8 + k * 1.25, 6.9, g, Math.PI, 0x33254d);

  // Mesas altas con ceniceros
  [[cx + 3.4, 2.2], [cx + 4.6, 6.4], [cx + 1.4, 7.6]].forEach(([x, z]) => {
    cyl(0.75, 0.75, 0.14, 12, M(0x1d1a26, { metalness: 0.5, roughness: 0.35 }), x, 2.35, z, g);
    cyl(0.16, 0.22, 2.3, 8, M(0x2a2733, { metalness: 0.7 }), x, 1.2, z, g);
    cyl(0.6, 0.6, 0.06, 10, M(0x2a2733), x, 0.1, z, g);
    cyl(0.28, 0.22, 0.12, 10, M(0x8d8a95, { metalness: 0.8, roughness: 0.3 }), x, 2.5, z, g);
    box(0.06, 0.06, 0.3, M(0xf0ece4), x + 0.2, 2.53, z, g);
    box(0.05, 0.05, 0.05, GLOW(0xff6a2a, 2.5), x + 0.2, 2.53, z + 0.16, g);
  });

  // Campanas extractoras
  for (let i = 0; i < 3; i++) {
    const x = cx - 4.5 + i * 4.5;
    const camp = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 0.9, 0.9, 6),
      M(0x3a3646, { metalness: 0.75, roughness: 0.3 })
    );
    camp.position.set(x, H - 0.35, -1);
    camp.castShadow = true;
    g.add(camp);
    cyl(0.35, 0.35, 0.7, 8, M(0x2a2733, { metalness: 0.8 }), x, H + 0.2, -1, g);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 6, 14), GLOW(C.humo, 1.6));
    anillo.rotation.x = Math.PI / 2;
    anillo.position.set(x, H - 0.75, -1);
    g.add(anillo);
  }

  const sf = sign('SALA FUMADORES', 9.5, 2.0, '#a88cff', g);
  sf.position.set(cx, 5.6, -10.4);
  neonSigns.push(sf);
  const sv = sign('VENTILACION 100%', 5.6, 1.1, '#3fd8e8', g);
  sv.position.set(cx, 4.0, -10.4);

  luzTecho(cx - 3, -6, g, 0xb69cff, 1.2);
  luzTecho(cx + 3, -6, g, 0xb69cff, 1.2);
  luzTecho(cx - 3, 5, g, 0xb69cff, 1.2);
  luzTecho(cx + 3, 5, g, 0xb69cff, 1.2);

  const pl = new THREE.PointLight(0xb69cff, 22, 16, 2);
  pl.position.set(cx, 4.6, -1);
  g.add(pl);

  // Optimización A7: Humo reducido de 220 a 80 partículas
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const rg = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(220,215,235,.55)');
  rg.addColorStop(1, 'rgba(220,215,235,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);

  const N = 80;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = cx + (Math.random() - 0.5) * 11;
    pos[i * 3 + 1] = 1.5 + Math.random() * (H - 1.5);
    pos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: tex, size: 1.6, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  g.add(pts);
  smokeSystem = { pts, seed, base: H };

  wings.fumadores.interior = g;
}

const terraza = new THREE.Group();
shell.add(terraza);

function buildTerraza() {
  const TY = H + 1.1;
  const g = terraza;

  const deck = box(W * 3 - 1, 0.12, D - 1, M(C.madera, { roughness: 0.85 }), 0, TY + 0.06, 0, g);
  deck.receiveShadow = true;
  for (let i = 0; i < 14; i++) box(W * 3 - 1, 0.02, 0.06, M(0x4e3524), 0, TY + 0.13, -10 + i * 1.5, g);

  // Barra Sky Bar
  box(9, 1.4, 1.3, M(0x2b2130, { roughness: 0.6 }), -8, TY + 0.8, -8.4, g);
  box(9.3, 0.16, 1.5, M(0x100f16, { metalness: 0.6, roughness: 0.2 }), -8, TY + 1.58, -8.4, g);
  box(9, 0.18, 0.18, GLOW(C.oro, 2.0), -8, TY + 0.35, -7.8, g);
  for (let i = 0; i < 5; i++) {
    cyl(0.32, 0.28, 0.18, 8, M(0x4a1f2c), -11 + i * 1.6, TY + 1.35, -7.1, g);
    cyl(0.09, 0.09, 1.2, 6, M(0x2a2733, { metalness: 0.7 }), -11 + i * 1.6, TY + 0.7, -7.1, g);
  }
  const sb = sign('SKY BAR', 5.6, 1.6, '#f2c14e', g);
  sb.position.set(-8, TY + 3.1, -9.1);
  neonSigns.push(sb);

  // Mesas con sombrilla
  [[-2, 4], [6, 3], [13, -2], [-13, 4], [3, -4], [16, 6]].forEach(([x, z], i) => {
    cyl(1.0, 1.0, 0.12, 12, M(0x8c6a45, { roughness: 0.7 }), x, TY + 1.15, z, g);
    cyl(0.12, 0.16, 1.1, 8, M(0x2a2733, { metalness: 0.7 }), x, TY + 0.6, z, g);
    cyl(0.55, 0.55, 0.05, 10, M(0x2a2733), x, TY + 0.06, z, g);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * 6.28;
      silla(x + Math.cos(a) * 1.7, z + Math.sin(a) * 1.7, g, -a + Math.PI / 2, 0x3a3040).position.y = TY;
    }
    cyl(0.07, 0.07, 3, 6, M(0x8c6a45), x, TY + 1.6, z, g);
    const som = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 0.8, 8),
      M(i % 2 ? 0xe0203c : 0x1f1d28, { roughness: 0.85, side: THREE.DoubleSide })
    );
    som.position.set(x, TY + 3.2, z);
    som.castShadow = true;
    g.add(som);
  });

  // Lounge
  [[-16, 7], [19, -7]].forEach(([x, z]) => {
    box(3.2, 0.7, 1.6, M(0x2e2a3a), x, TY + 0.5, z, g);
    box(3.2, 0.9, 0.4, M(0x2e2a3a), x, TY + 1.1, z - 0.6, g);
    box(1.1, 0.5, 1.1, M(0x8c6a45), x + 2.4, TY + 0.4, z, g);
  });

  // Macetas
  for (let i = 0; i < 10; i++) {
    const x = -20 + i * 4.4, z = (i % 2 ? 9.6 : -9.6);
    cyl(0.6, 0.45, 0.9, 8, M(0x3a3040), x, TY + 0.5, z, g);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), M(0x2b6b45, { flatShading: true }));
    b.position.set(x, TY + 1.5, z);
    b.castShadow = true;
    g.add(b);
  }

  // Guirnaldas
  for (let f = 0; f < 3; f++) {
    const z = -4 + f * 5;
    for (let i = 0; i < 18; i++) {
      const x = -19 + i * 2.2;
      const y = TY + 4.2 - Math.sin((i / 17) * Math.PI) * 0.9 + Math.sin(f) * 0.1;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), GLOW(0xffd9a0, 2.0));
      b.position.set(x, y, z);
      g.add(b);
    }
  }

  // Luces terraza optimizadas
  const pl = new THREE.PointLight(0xffcf9a, 30, 24, 2);
  pl.position.set(0, TY + 4.5, 0);
  g.add(pl);
  const pl2 = new THREE.PointLight(0xff6a86, 20, 18, 2);
  pl2.position.set(-8, TY + 3, -6);
  g.add(pl2);
}

buildLavanderia();
buildCasino();
buildFumadores();
buildTerraza();

/* =========================================================
   6. SISTEMA DE NPCs TRABAJADORES Y CLIENTES (Requerimiento C)
   ========================================================= */
const npcs = [];
const npcGroup = new THREE.Group();
scene.add(npcGroup);

function createNpcLabel(name, role, accColor = '#f2c14e') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 140;
  const ctx = c.getContext('2d');

  // Fondo estilizado semitransparente
  ctx.fillStyle = 'rgba(12, 10, 18, 0.88)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 120, 18);
  ctx.fill();

  ctx.strokeStyle = accColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Nombre
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 48);

  // Rol
  ctx.font = 'bold 24px Bebas Neue, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = accColor;
  ctx.fillText(role.toUpperCase(), 256, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.88, 1);
  sprite.position.y = 2.45;
  return sprite;
}

function createNPC({
  id, name, role, acc, x, y, z, rot = 0,
  torsoCol, pantsCol = 0x1b1924, hairCol = 0x221a14,
  waypoints = [], workAnim = 'idle', itemType = null
}) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rot;
  npcGroup.add(root);

  // Piernas
  const legL = cyl(0.09, 0.08, 0.8, 6, M(pantsCol), -0.15, 0.4, 0, root);
  const legR = cyl(0.09, 0.08, 0.8, 6, M(pantsCol), 0.15, 0.4, 0, root);

  // Torso
  const torso = box(0.48, 0.65, 0.28, M(torsoCol), 0, 1.1, 0, root);

  // Cabeza y cabello
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), M(0xf1c6a7, { roughness: 0.6 }));
  head.position.set(0, 1.65, 0);
  root.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 8), M(hairCol));
  hair.position.set(0, 1.7, -0.02);
  hair.scale.set(1.02, 0.8, 1.05);
  root.add(hair);

  // Brazos
  const armL = cyl(0.07, 0.06, 0.6, 6, M(torsoCol), -0.32, 1.1, 0, root);
  const armR = cyl(0.07, 0.06, 0.6, 6, M(torsoCol), 0.32, 1.1, 0, root);

  // Accesorio en mano
  let heldItem = null;
  if (itemType === 'tray') {
    heldItem = new THREE.Group();
    heldItem.position.set(0.35, 1.05, 0.3);
    root.add(heldItem);
    cyl(0.35, 0.35, 0.04, 8, M(0xc0c4cc, { metalness: 0.8 }), 0, 0, 0, heldItem);
    cyl(0.06, 0.04, 0.18, 6, GLOW(0x3fd8e8, 1.5), -0.1, 0.1, 0, heldItem);
    cyl(0.06, 0.04, 0.18, 6, GLOW(0xe0203c, 1.5), 0.1, 0.1, 0, heldItem);
  } else if (itemType === 'cloth') {
    heldItem = box(0.18, 0.05, 0.22, M(0xffffff), 0.32, 0.9, 0.2, root);
  } else if (itemType === 'tablet') {
    heldItem = box(0.25, 0.35, 0.03, GLOW(0x3fd8e8, 0.8), -0.32, 1.05, 0.2, root);
    heldItem.rotation.x = 0.5;
  } else if (itemType === 'drink') {
    heldItem = cyl(0.07, 0.05, 0.22, 6, GLOW(0xf2c14e, 1.4), 0.3, 0.95, 0.2, root);
  } else if (itemType === 'cig') {
    heldItem = box(0.04, 0.04, 0.16, M(0xf4f1ea), 0.25, 1.45, 0.18, root);
    box(0.04, 0.04, 0.04, GLOW(0xff5511, 2.5), 0.25, 1.45, 0.26, root);
  }

  // Label Sprite Billboard flotante sobre la cabeza
  const label = createNpcLabel(name, role, acc);
  root.add(label);

  const npcObj = {
    id, name, role, acc, root, legL, legR, armL, armR, heldItem,
    state: 'idle',
    timer: Math.random() * 2 + 1,
    waypoints: waypoints.length ? waypoints : [new THREE.Vector3(x, y, z)],
    wpIdx: 0,
    speed: 1.35 + Math.random() * 0.3,
    walkPhase: Math.random() * Math.PI,
    workAnim,
    baseY: y
  };

  npcs.push(npcObj);
  return npcObj;
}

// Inicialización de los 10 NPCs requeridos
function initNpcs() {
  // 1. Lavandería - Operador de mostrador
  createNPC({
    id: 'lav_mateo', name: 'Mateo', role: 'Operador Mostrador', acc: '#3fd8e8',
    x: XW.lavanderia - 1.0, y: 0.62, z: 4.4, rot: Math.PI,
    torsoCol: 0x2da8bb, pantsCol: 0x1d2228, hairCol: 0x241d18,
    waypoints: [
      new THREE.Vector3(XW.lavanderia - 1.8, 0.62, 4.4),
      new THREE.Vector3(XW.lavanderia, 0.62, 4.4),
      new THREE.Vector3(XW.lavanderia + 1.8, 0.62, 4.4)
    ],
    workAnim: 'fold'
  });

  // 2. Lavandería - Técnico de mantenimiento
  createNPC({
    id: 'lav_esteban', name: 'Esteban', role: 'Mantenimiento Técnico', acc: '#3fd8e8',
    x: XW.lavanderia - 3.0, y: 0.62, z: -7.5, rot: 0,
    torsoCol: 0x1b4260, pantsCol: 0x152c40, hairCol: 0x332822, itemType: 'tablet',
    waypoints: [
      new THREE.Vector3(XW.lavanderia - 5.0, 0.62, -8.0),
      new THREE.Vector3(XW.lavanderia - 1.0, 0.62, -8.0),
      new THREE.Vector3(XW.lavanderia + 3.0, 0.62, -5.5),
      new THREE.Vector3(XW.lavanderia - 3.0, 0.62, -6.0)
    ],
    workAnim: 'inspect'
  });

  // 3. Casino - Croupier de ruleta
  createNPC({
    id: 'cas_valentina', name: 'Valentina', role: 'Croupier Ruleta', acc: '#f2c14e',
    x: XW.casino - 3.4, y: 0.62, z: -3.8, rot: Math.PI,
    torsoCol: 0x5c1527, pantsCol: 0x121016, hairCol: 0x1a120c,
    waypoints: [
      new THREE.Vector3(XW.casino - 3.4, 0.62, -3.8),
      new THREE.Vector3(XW.casino - 2.8, 0.62, -4.0),
      new THREE.Vector3(XW.casino - 4.0, 0.62, -4.0)
    ],
    workAnim: 'deal'
  });

  // 4. Casino - Operador de tragamonedas
  createNPC({
    id: 'cas_rodrigo', name: 'Rodrigo', role: 'Operador Slots & RNG', acc: '#f2c14e',
    x: XW.casino - 2.0, y: 0.62, z: -8.6, rot: 0,
    torsoCol: 0x1a1924, pantsCol: 0x14131c, hairCol: 0x2e2520,
    waypoints: [
      new THREE.Vector3(XW.casino - 5.5, 0.62, -8.6),
      new THREE.Vector3(XW.casino - 1.0, 0.62, -8.6),
      new THREE.Vector3(XW.casino + 3.5, 0.62, -8.6)
    ],
    workAnim: 'inspect'
  });

  // 5. Casino / Bar - Bartender
  createNPC({
    id: 'bar_lucas', name: 'Lucas', role: 'Bartender Jefe', acc: '#e0203c',
    x: XW.casino + 4.6, y: 0.62, z: 9.0, rot: Math.PI,
    torsoCol: 0x111116, pantsCol: 0x1c1722, hairCol: 0x1e1511, itemType: 'drink',
    waypoints: [
      new THREE.Vector3(XW.casino + 3.2, 0.62, 9.0),
      new THREE.Vector3(XW.casino + 4.8, 0.62, 9.0),
      new THREE.Vector3(XW.casino + 6.2, 0.62, 9.0)
    ],
    workAnim: 'shake'
  });

  // 6. Casino / Bar - Garzón de sala
  createNPC({
    id: 'bar_camila', name: 'Camila', role: 'Garzón de Sala', acc: '#f2c14e',
    x: XW.casino + 1.0, y: 0.62, z: -1.0, rot: 0,
    torsoCol: 0x221a2c, pantsCol: 0x14101a, hairCol: 0x422617, itemType: 'tray',
    waypoints: [
      new THREE.Vector3(XW.casino + 4.0, 0.62, 7.0),
      new THREE.Vector3(XW.casino + 3.0, 0.62, 1.0),
      new THREE.Vector3(XW.casino + 3.8, 0.62, -4.5),
      new THREE.Vector3(XW.casino - 1.0, 0.62, -3.0)
    ],
    workAnim: 'serve'
  });

  // 7. Fumadores - Personal de limpieza
  createNPC({
    id: 'fum_dario', name: 'Darío', role: 'Limpieza & Sanitización', acc: '#a88cff',
    x: XW.fumadores + 1.0, y: 0.62, z: 3.0, rot: 0,
    torsoCol: 0x3f3258, pantsCol: 0x1b1928, hairCol: 0x1e1b24, itemType: 'cloth',
    waypoints: [
      new THREE.Vector3(XW.fumadores + 2.8, 0.62, 2.2),
      new THREE.Vector3(XW.fumadores + 4.0, 0.62, 6.4),
      new THREE.Vector3(XW.fumadores + 1.2, 0.62, 7.6),
      new THREE.Vector3(XW.fumadores - 2.0, 0.62, 0.0)
    ],
    workAnim: 'wipe'
  });

  // 8. Fumadores - Cliente fumando
  createNPC({
    id: 'fum_marcos', name: 'Marcos', role: 'Cliente Fumando', acc: '#a88cff',
    x: XW.fumadores + 3.4, y: 0.62, z: 1.4, rot: 0.2,
    torsoCol: 0x222228, pantsCol: 0x192233, hairCol: 0x1b191c, itemType: 'cig',
    waypoints: [
      new THREE.Vector3(XW.fumadores + 3.4, 0.62, 1.4),
      new THREE.Vector3(XW.fumadores + 2.8, 0.62, 0.8)
    ],
    workAnim: 'smoke'
  });

  // 9. Terraza - Mesero Sky Bar
  const TY = H + 1.1; // 7.5
  createNPC({
    id: 'ter_nicolas', name: 'Nicolás', role: 'Mesero Terraza', acc: '#e0203c',
    x: -4.0, y: TY, z: -2.0, rot: 0,
    torsoCol: 0xd6354b, pantsCol: 0x3b333a, hairCol: 0x261e19, itemType: 'tray',
    waypoints: [
      new THREE.Vector3(-7.5, TY, -6.6),
      new THREE.Vector3(-2.0, TY, 3.5),
      new THREE.Vector3(6.0, TY, 2.5),
      new THREE.Vector3(12.0, TY, -2.0)
    ],
    workAnim: 'serve'
  });

  // 10. Terraza - Cliente Lounge
  createNPC({
    id: 'ter_sofia', name: 'Sofía', role: 'Cliente Lounge', acc: '#3fd8e8',
    x: -15.5, y: TY, z: 6.2, rot: -0.6,
    torsoCol: 0x4fc3d9, pantsCol: 0x1a2833, hairCol: 0x422315, itemType: 'drink',
    waypoints: [
      new THREE.Vector3(-15.5, TY, 6.2),
      new THREE.Vector3(-13.5, TY, 4.8)
    ],
    workAnim: 'idle'
  });
}
initNpcs();

function updateNpcs(dt, t) {
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    npc.timer -= dt;

    if (npc.state === 'idle') {
      // Respiración sutil y oscilación leve
      npc.armL.rotation.x = Math.sin(t * 1.5) * 0.05;
      npc.armR.rotation.x = -Math.sin(t * 1.5) * 0.05;
      npc.legL.rotation.x = 0;
      npc.legR.rotation.x = 0;

      if (npc.timer <= 0) {
        npc.state = 'walk';
        npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        npc.timer = 8; // Límite de seguridad
      }
    } else if (npc.state === 'walk') {
      const target = npc.waypoints[npc.wpIdx];
      const dx = target.x - npc.root.position.x;
      const dz = target.z - npc.root.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.25 || npc.timer <= 0) {
        npc.state = npc.workAnim !== 'idle' ? 'work' : 'idle';
        npc.timer = 2.5 + Math.random() * 3.5;
      } else {
        // Rotación suave hacia el waypoint
        const targetRot = Math.atan2(dx, dz);
        let diff = targetRot - npc.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.root.rotation.y += diff * Math.min(dt * 6, 1);

        // Movimiento hacia adelante
        const step = Math.min(npc.speed * dt, dist);
        npc.root.position.x += Math.sin(npc.root.rotation.y) * step;
        npc.root.position.z += Math.cos(npc.root.rotation.y) * step;

        // Bamboleo procedural de marcha
        npc.walkPhase += dt * npc.speed * 4.5;
        const swing = Math.sin(npc.walkPhase) * 0.55;
        npc.legL.rotation.x = swing;
        npc.legR.rotation.x = -swing;

        if (npc.heldItem && npc.heldItem.parent === npc.root) {
          npc.armL.rotation.x = -swing * 0.4;
          npc.armR.rotation.x = 0.3; // Brazo sosteniendo objeto
        } else {
          npc.armL.rotation.x = -swing * 0.5;
          npc.armR.rotation.x = swing * 0.5;
        }
      }
    } else if (npc.state === 'work') {
      npc.legL.rotation.x = 0;
      npc.legR.rotation.x = 0;

      // Animaciones especializadas según el trabajo
      if (npc.workAnim === 'wipe') {
        npc.armR.rotation.x = 0.5 + Math.sin(t * 6) * 0.35;
        npc.armR.rotation.z = Math.cos(t * 6) * 0.25;
      } else if (npc.workAnim === 'shake') {
        npc.armL.rotation.x = 0.7 + Math.sin(t * 10) * 0.4;
        npc.armR.rotation.x = 0.7 - Math.sin(t * 10) * 0.4;
      } else if (npc.workAnim === 'deal') {
        npc.armR.rotation.x = 0.3 + Math.sin(t * 3) * 0.3;
        npc.armL.rotation.x = 0.2;
      } else if (npc.workAnim === 'fold') {
        npc.armL.rotation.x = 0.4 + Math.sin(t * 4) * 0.25;
        npc.armR.rotation.x = 0.4 + Math.sin(t * 4 + 1) * 0.25;
      } else if (npc.workAnim === 'smoke') {
        npc.armR.rotation.x = 0.8 + Math.sin(t * 0.8) * 0.2;
      } else if (npc.workAnim === 'inspect') {
        npc.armL.rotation.x = 0.6;
        npc.armR.rotation.x = 0.3 + Math.sin(t * 2) * 0.2;
      } else if (npc.workAnim === 'serve') {
        npc.armR.rotation.x = 0.4;
        npc.armL.rotation.x = Math.sin(t * 2) * 0.15;
      }

      if (npc.timer <= 0) {
        npc.state = 'walk';
        npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        npc.timer = 8;
      }
    }

    // Colisión / repulsión mutua entre NPCs
    for (let j = i + 1; j < npcs.length; j++) {
      const other = npcs[j];
      const dx = npc.root.position.x - other.root.position.x;
      const dz = npc.root.position.z - other.root.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.45 && d2 > 0.001) {
        const d = Math.sqrt(d2);
        const push = (0.67 - d) * 0.5 * dt;
        npc.root.position.x += (dx / d) * push;
        npc.root.position.z += (dz / d) * push;
        other.root.position.x -= (dx / d) * push;
        other.root.position.z -= (dz / d) * push;
      }
    }
  }
}

/* =========================================================
   7. CONTROLADOR EN PRIMERA PERSONA / FPS (Requerimiento B)
   ========================================================= */
let fpsMode = false;
let isLocked = false;
const playerPos = new THREE.Vector3(0, 2.2, 18); // Posición en la vereda
let cameraYaw = Math.PI; // Mirando hacia la fachada (Z negativa)
let cameraPitch = 0;
const playerRadius = 0.45;
const walkSpeed = 6.0;
const runSpeed = 10.0;

const keys = { forward: false, backward: false, left: false, right: false, run: false };
const crosshairEl = document.getElementById('crosshair');
const fpsHudEl = document.getElementById('fpsHud');

// AABBs de colisión física (paredes exteriores, tabiques divisorios y muebles clave)
const colliders = [
  // Pared trasera del complejo
  { minX: -23.0, maxX: 23.0, minZ: -11.6, maxZ: -10.7 },
  // Pared lateral izquierda (Ala Oeste)
  { minX: -23.0, maxX: -22.2, minZ: -11.0, maxZ: 11.5 },
  // Pared lateral derecha (Ala Este)
  { minX: 22.2, maxX: 23.0, minZ: -11.0, maxZ: 11.5 },

  // Fachada frontal (dejando abiertas las 3 puertas de acceso en x = -15, 0, +15)
  { minX: -23.0, maxX: -16.4, minZ: 10.7, maxZ: 11.4 },
  { minX: -13.6, maxX: -1.4, minZ: 10.7, maxZ: 11.4 },
  { minX: 1.4, maxX: 13.6, minZ: 10.7, maxZ: 11.4 },
  { minX: 16.4, maxX: 23.0, minZ: 10.7, maxZ: 11.4 },

  // Tabique divisorio Lavandería - Casino (x = -7.5 con puerta central abierta entre z = -2 y +2)
  { minX: -7.7, maxX: -7.3, minZ: -11.0, maxZ: -2.0 },
  { minX: -7.7, maxX: -7.3, minZ: 2.0, maxZ: 11.0 },

  // Tabique divisorio Casino - Fumadores (x = +7.5 con puerta central abierta entre z = -2 y +2)
  { minX: 7.3, maxX: 7.7, minZ: -11.0, maxZ: -2.0 },
  { minX: 7.3, maxX: 7.7, minZ: 2.0, maxZ: 11.0 },

  // Obstáculos de mobiliario sólido
  // Lavandería: mesada de atención
  { minX: XW.lavanderia - 3.2, maxX: XW.lavanderia + 3.2, minZ: 2.5, maxZ: 4.2 },
  // Casino: barra de tragos
  { minX: XW.casino + 1.5, maxX: XW.casino + 7.7, minZ: 7.5, maxZ: 8.9 },
  // Casino: mesa de ruleta
  { minX: XW.casino - 5.5, maxX: XW.casino - 1.3, minZ: -7.7, maxZ: -3.5 }
];

function checkCollision(x, z, r = playerRadius) {
  // Límites del mundo exterior transitable
  if (x < -28 || x > 28 || z < -10.8 || z > 32) return true;

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
      return true;
    }
  }
  return false;
}

function toggleFPS(force) {
  const targetState = force !== undefined ? force : !fpsMode;
  if (targetState === fpsMode) return;
  fpsMode = targetState;

  if (fpsMode) {
    // Entrar a primera persona
    controls.enabled = false;
    if (crosshairEl) crosshairEl.classList.add('active');
    if (fpsHudEl) fpsHudEl.classList.add('show');
    tip.style.opacity = 0;

    // Si la cámara estaba en órbita alta exterior, posicionar al jugador en la vereda
    if (camera.position.y > 6 || camera.position.z > 25) {
      playerPos.set(0, 2.2, 17);
      cameraYaw = Math.PI;
      cameraPitch = 0;
    } else {
      playerPos.copy(camera.position);
    }
    playerPos.y = getTargetEyeHeight(playerPos.x, playerPos.z);
    camera.position.copy(playerPos);

    renderer.domElement.requestPointerLock();
  } else {
    // Salir a órbita
    if (document.exitPointerLock) document.exitPointerLock();
    if (crosshairEl) crosshairEl.classList.remove('active');
    if (fpsHudEl) fpsHudEl.classList.remove('show');
    controls.enabled = true;
    controls.target.set(playerPos.x, 2, playerPos.z - 4);
    camera.position.set(playerPos.x, playerPos.y + 3, playerPos.z + 6);
  }
}

function getTargetEyeHeight(x, z) {
  // Si está dentro de la planta baja
  if (x > -22.5 && x < 22.5 && z < FRONT && z > -11) {
    return 0.62 + 1.7; // Piso planta baja + altura de ojos
  }
  // Vereda
  if (z <= 17) {
    return 0.5 + 1.7;
  }
  // Calle
  return 0.0 + 1.7;
}

// Mouse look
document.addEventListener('mousemove', ev => {
  if (!fpsMode || !isLocked) return;
  const sens = 0.0022;
  cameraYaw -= ev.movementX * sens;
  cameraPitch -= ev.movementY * sens;
  cameraPitch = Math.max(-1.42, Math.min(1.42, cameraPitch));
});

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === renderer.domElement;
  if (!isLocked && fpsMode) {
    // Si el usuario presionó ESC para liberar mouse, mantenemos FPS listo para reanudar al hacer click
  }
});

renderer.domElement.addEventListener('click', () => {
  if (fpsMode && !isLocked) {
    renderer.domElement.requestPointerLock();
  }
});

// Teclado WASD + F
window.addEventListener('keydown', e => {
  if (e.code === 'KeyW') keys.forward = true;
  if (e.code === 'KeyS') keys.backward = true;
  if (e.code === 'KeyA') keys.left = true;
  if (e.code === 'KeyD') keys.right = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.run = true;
  if (e.code === 'KeyF') {
    e.preventDefault();
    toggleFPS();
  }
  if (e.code === 'Escape' && fpsMode) {
    toggleFPS(false);
  }
});

window.addEventListener('keyup', e => {
  if (e.code === 'KeyW') keys.forward = false;
  if (e.code === 'KeyS') keys.backward = false;
  if (e.code === 'KeyA') keys.left = false;
  if (e.code === 'KeyD') keys.right = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.run = false;
});

function updateFPSPlayer(dt) {
  if (!fpsMode) return;

  // Orientación de cámara
  const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);

  // Vector de avance horizontal (ignora cabeceo pitch para no flotar ni enterrarse)
  const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
  const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

  const moveDir = new THREE.Vector3();
  if (keys.forward) moveDir.add(forward);
  if (keys.backward) moveDir.sub(forward);
  if (keys.right) moveDir.add(right);
  if (keys.left) moveDir.sub(right);

  if (moveDir.lengthSq() > 0.001) {
    moveDir.normalize();
    const currentSpeed = keys.run ? runSpeed : walkSpeed;
    const dx = moveDir.x * currentSpeed * dt;
    const dz = moveDir.z * currentSpeed * dt;

    // Desplazamiento eje X con colisión y deslizamiento
    if (!checkCollision(playerPos.x + dx, playerPos.z)) {
      playerPos.x += dx;
    }
    // Desplazamiento eje Z con colisión y deslizamiento
    if (!checkCollision(playerPos.x, playerPos.z + dz)) {
      playerPos.z += dz;
    }
  }

  // Ajuste suave de altura de ojos según el suelo
  const targetY = getTargetEyeHeight(playerPos.x, playerPos.z);
  playerPos.y += (targetY - playerPos.y) * Math.min(dt * 10, 1);
  camera.position.copy(playerPos);

  // Detección automática del ala en la que se encuentra el jugador
  if (playerPos.z < FRONT && playerPos.z > -10.5) {
    let activeKey = null;
    if (playerPos.x < -7.5) activeKey = 'lavanderia';
    else if (playerPos.x > 7.5) activeKey = 'fumadores';
    else activeKey = 'casino';

    if (activeKey && activeKey !== current) {
      enterSilently(activeKey);
    }
  } else if (playerPos.z >= FRONT && current) {
    exitSilently();
  }
}

/* =========================================================
   8. SECCIONES, CÁMARA & NAVEGACIÓN
   ========================================================= */
const EXT = { pos: new THREE.Vector3(6, 26, 62), target: new THREE.Vector3(0, 7, 0) };

function extPos() {
  const f = Math.min(2.2, Math.max(1, 1.75 / camera.aspect));
  return new THREE.Vector3(EXT.pos.x * f, 8 + (EXT.pos.y - 8) * f, EXT.pos.z * f);
}

const SECTIONS = {
  lavanderia: {
    nombre: 'Lavandería', acc: '#3fd8e8', kick: 'ALA OESTE · PLANTA BAJA',
    desc: 'Autoservicio 24 h con lavarropas industriales, secarropas apilados y estación de lavado especial. Dejás la carga, sacás el ticket y te vas a jugar mientras el tambor hace lo suyo.',
    items: ['Ropa y jeans', 'Blanquería y acolchados', 'Cortinas', 'Zapatillas', 'Planchado y plegado', 'Delivery de bolsón'],
    cam: { pos: [XW.lavanderia + 0.5, 4.4, 8.6], target: [XW.lavanderia, 2.2, -6] }
  },
  casino: {
    nombre: 'Casino', acc: '#f2c14e', kick: 'ALA CENTRAL · PLANTA BAJA',
    desc: 'El corazón del local: mesas en vivo y máquinas conectadas al jackpot progresivo. Cada ciclo de lavado te suma créditos de bienvenida para jugar mientras esperás.',
    items: ['Jackpot progresivo', 'Ruleta', 'Blackjack x2', 'Póker', 'Tragamonedas', 'Barra & tragos'],
    cam: { pos: [XW.casino + 0.5, 4.6, 8.8], target: [XW.casino, 2.1, -5.5] }
  },
  fumadores: {
    nombre: 'Sala Fumadores', acc: '#a88cff', kick: 'ALA ESTE · PLANTA BAJA',
    desc: 'Mismo casino, sala independiente con mampara vidriada y extracción de aire permanente. Mesas altas, ceniceros y las mismas apuestas que en el salón principal.',
    items: ['Ventilación 100%', 'Tragamonedas', 'Póker', 'Blackjack', 'Mesas altas', 'Acceso directo a la barra'],
    cam: { pos: [XW.fumadores - 0.5, 4.4, 8.4], target: [XW.fumadores, 2.1, -5] }
  },
  terraza: {
    nombre: 'Terraza', acc: '#e0203c', kick: 'PRIMER PISO · AIRE LIBRE',
    desc: 'Deck al aire libre sobre las tres alas, con sky bar, mesas con sombrilla y guirnaldas. El lugar para esperar el último centrifugado con algo fresco.',
    items: ['Sky bar', 'Mesas con sombrilla', 'Lounge', 'Música en vivo', 'Pantalla de jackpot', 'Vista a la calle'],
    cam: { pos: [1, 13.2, 23], target: [-2, 8.2, -3] }
  }
};

// Hitboxes de click
const picker = new THREE.Group();
scene.add(picker);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hits = [];
Object.entries(XW).forEach(([key, cx]) => {
  const h = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, H, D - 0.6), hitMat);
  h.position.set(cx, H / 2 + 0.6, 0);
  h.userData.key = key;
  picker.add(h);
  hits.push(h);
});
const ht = new THREE.Mesh(new THREE.BoxGeometry(W * 3 - 1, 3.4, D - 1), hitMat);
ht.position.set(0, H + 2.6, 0);
ht.userData.key = 'terraza';
picker.add(ht);
hits.push(ht);

let fly = null, current = null;
const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function flyTo(pos, target, dur = 1700) {
  fly = {
    t: 0, dur,
    fp: camera.position.clone(), tp: new THREE.Vector3(...(pos.toArray ? pos.toArray() : pos)),
    ft: controls.target.clone(), tt: new THREE.Vector3(...(target.toArray ? target.toArray() : target))
  };
  controls.enabled = false;
}

function flash() {
  const f = document.getElementById('flash');
  if (!f) return;
  f.style.opacity = 0.55;
  setTimeout(() => { f.style.opacity = 0; }, 260);
}

// Optimización A9: Frustum / Wing Culling manual al entrar a un ala
function applyWingCulling(key) {
  if (key === 'lavanderia') {
    if (wings.fumadores.interior) wings.fumadores.interior.visible = false;
    if (wings.lavanderia.interior) wings.lavanderia.interior.visible = true;
    if (wings.casino.interior) wings.casino.interior.visible = true;
  } else if (key === 'fumadores') {
    if (wings.lavanderia.interior) wings.lavanderia.interior.visible = false;
    if (wings.fumadores.interior) wings.fumadores.interior.visible = true;
    if (wings.casino.interior) wings.casino.interior.visible = true;
  } else if (key === 'terraza') {
    if (wings.lavanderia.interior) wings.lavanderia.interior.visible = false;
    if (wings.casino.interior) wings.casino.interior.visible = false;
    if (wings.fumadores.interior) wings.fumadores.interior.visible = false;
  } else {
    // Exterior o modo FPS libre: todas visibles
    if (wings.lavanderia.interior) wings.lavanderia.interior.visible = true;
    if (wings.casino.interior) wings.casino.interior.visible = true;
    if (wings.fumadores.interior) wings.fumadores.interior.visible = true;
  }
}

function enter(key) {
  if (key === current) return;
  const S = SECTIONS[key];
  if (!S) return;
  if (fpsMode) toggleFPS(false);

  flash();
  current = key;

  Object.entries(wings).forEach(([k, w]) => {
    const dentro = (k === key);
    w.ceiling.material.transparent = true;
    w.ceiling.userData.to = dentro ? 0 : 1;
    w.glass.visible = !dentro;
  });
  terraza.visible = (key === 'terraza');
  marquee.visible = (key !== 'terraza');
  document.getElementById('hint').style.opacity = 0;

  applyWingCulling(key);
  flyTo(S.cam.pos, S.cam.target);
  showPanel(S, key);
  markNav(key);
}

function enterSilently(key) {
  current = key;
  const S = SECTIONS[key];
  if (S) {
    showPanel(S, key);
    markNav(key);
  }
}

function exitSilently() {
  current = null;
  document.getElementById('panel').classList.remove('show');
  markNav('exterior');
}

function exit() {
  if (fpsMode) toggleFPS(false);
  current = null;
  Object.values(wings).forEach(w => {
    w.ceiling.userData.to = 1;
    w.glass.visible = true;
  });
  terraza.visible = true;
  marquee.visible = true;
  applyWingCulling(null);

  flash();
  flyTo(extPos(), EXT.target, 1500);
  document.getElementById('panel').classList.remove('show');
  document.getElementById('hint').style.opacity = 1;
  markNav('exterior');
}

/* =========================================================
   9. INTERFAZ DE USUARIO (UI)
   ========================================================= */
const logoSVG = document.getElementById('logo').innerHTML;
document.getElementById('logoSlot').innerHTML = logoSVG;
document.getElementById('logoSlot2').innerHTML = logoSVG;

const nav = document.getElementById('nav');
function mkBtn(label, key, acc, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.key = key;
  b.style.setProperty('--acc', acc);
  b.onclick = onClick || (() => key === 'exterior' ? exit() : enter(key));
  nav.appendChild(b);
  return b;
}

mkBtn('EXTERIOR', 'exterior', '#e0203c');
Object.entries(SECTIONS).forEach(([k, S]) => mkBtn(S.nombre.toUpperCase(), k, S.acc));

// Botón de alternancia de modo caminar en el menú superior
const fpsBtn = mkBtn('🚶 CAMINAR (F)', 'fps', '#f2c14e', () => toggleFPS());

function markNav(key) {
  [...nav.children].forEach(b => {
    if (b.dataset.key === 'fps') {
      b.classList.toggle('on', fpsMode);
    } else {
      b.classList.toggle('on', b.dataset.key === key);
    }
  });
}
markNav('exterior');

const panel = document.getElementById('panel');
function showPanel(S, key) {
  panel.style.setProperty('--acc', S.acc);
  document.getElementById('pKick').textContent = S.kick;
  document.getElementById('pTitle').textContent = S.nombre;
  document.getElementById('pDesc').textContent = S.desc;
  const ul = document.getElementById('pList');
  ul.innerHTML = '';
  S.items.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
  panel.classList.add('show');
}
document.getElementById('pBack').onclick = exit;

/* --- Picking optimizado (Optimización A6: throttle 33ms) --- */
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tip = document.getElementById('tip');
let down = null;
let lastRaycastTime = 0;

function pick(ev) {
  mouse.x = (ev.clientX / innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(hits, false)[0];
  return hit ? hit.object.userData.key : null;
}

window.addEventListener('pointermove', ev => {
  if (current || fly || fpsMode) {
    tip.style.opacity = 0;
    return;
  }

  // Throttle a ~30 fps
  const now = performance.now();
  if (now - lastRaycastTime < 33) return;
  lastRaycastTime = now;

  const k = pick(ev);
  if (k) {
    tip.style.opacity = 1;
    tip.style.left = ev.clientX + 'px';
    tip.style.top = ev.clientY + 'px';
    tip.textContent = 'ENTRAR A ' + SECTIONS[k].nombre.toUpperCase();
    tip.style.borderColor = SECTIONS[k].acc;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tip.style.opacity = 0;
    renderer.domElement.style.cursor = 'grab';
  }
});

window.addEventListener('pointerdown', ev => {
  down = { x: ev.clientX, y: ev.clientY };
});

window.addEventListener('pointerup', ev => {
  if (!down) return;
  const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
  down = null;
  if (moved > 6 || current || fly || fpsMode) return;
  const k = pick(ev);
  if (k) {
    tip.style.opacity = 0;
    enter(k);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (!current && !fly && !fpsMode) {
    camera.position.copy(extPos());
    controls.target.copy(EXT.target);
  }
});

/* =========================================================
   10. LOOP PRINCIPAL (Optimizaciones A8 y sincronización)
   ========================================================= */
camera.position.copy(extPos());
controls.target.copy(EXT.target);
Object.values(wings).forEach(w => {
  w.ceiling.userData.to = 1;
  w.ceiling.material.transparent = true;
});

// Optimización A8: Pausar el render loop cuando la pestaña no es visible
let isTabVisible = true;
document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden;
});

const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  if (!isTabVisible) return; // Ahorro de GPU al estar en segundo plano

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Actualización del personaje en primera persona (WASD)
  if (fpsMode) {
    updateFPSPlayer(dt);
  } else if (fly) {
    fly.t += dt * 1000;
    const k = easeIO(Math.min(fly.t / fly.dur, 1));
    camera.position.lerpVectors(fly.fp, fly.tp, k);
    controls.target.lerpVectors(fly.ft, fly.tt, k);
    if (fly.t >= fly.dur) {
      fly = null;
      controls.enabled = true;
    }
  } else {
    controls.update();
  }

  // Actualización de los 10 NPCs (rutinas y animaciones de trabajo)
  updateNpcs(dt, t);

  // Techos transparentes en transición
  Object.values(wings).forEach(w => {
    const to = w.ceiling.userData.to ?? 1;
    const m = w.ceiling.material;
    m.opacity += (to - m.opacity) * Math.min(dt * 4, 1);
    w.ceiling.visible = m.opacity > 0.02;
  });

  // Neones que titilan proceduralmente
  neonSigns.forEach((s, i) => {
    s.material.opacity = 0.78 + 0.22 * Math.sin(t * (2.2 + i * 0.5) + i);
    s.material.transparent = true;
  });

  // Partículas de humo (80 partículas optimizadas)
  if (smokeSystem) {
    const p = smokeSystem.pts.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * (0.25 + smokeSystem.seed[i] * 0.45);
      if (y > smokeSystem.base) y = 1.4;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t * 0.6 + i) * dt * 0.12);
    }
    p.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

tick();

setTimeout(() => {
  const loadEl = document.getElementById('load');
  if (loadEl) loadEl.classList.add('off');
}, 700);
