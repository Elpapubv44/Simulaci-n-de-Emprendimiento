import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================
   JOKER WASH & PLAY — maqueta 3D interactiva
   Exterior clickeable -> vuelo de cámara -> interior navegable
   ========================================================= */

const C = {
  rojo:0xe0203c, oro:0xf2c14e, cian:0x3fd8e8, humo:0xa88cff,
  negro:0x0c0a12, gris:0x2a2733, felt:0x14663f, piso:0x171520
};

/* ---------- Render / escena ---------- */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.Fog(0x05040a, 70, 190);

const camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 500);
camera.position.set(0, 30, 68);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI*0.495;
controls.minDistance = 4;
controls.maxDistance = 120;
controls.target.set(0, 6, 0);

/* ---------- Luces ---------- */
scene.add(new THREE.HemisphereLight(0x6a7ac0, 0x0d0b16, 0.85));
const moon = new THREE.DirectionalLight(0x9fb0ff, 0.95);
moon.position.set(40, 60, 30);
moon.castShadow = true;
moon.shadow.mapSize.set(2048,2048);
moon.shadow.camera.near = 10; moon.shadow.camera.far = 180;
const d = 60; Object.assign(moon.shadow.camera, {left:-d,right:d,top:d,bottom:-d});
moon.shadow.camera.updateProjectionMatrix();
scene.add(moon);

/* ---------- Helpers ---------- */
const M = (color, o={}) => new THREE.MeshStandardMaterial({ color, roughness:.7, metalness:.05, ...o });
const GLOW = (color, i=1.6) => new THREE.MeshStandardMaterial({
  color, emissive:color, emissiveIntensity:i, roughness:.4, metalness:0 });

function box(w,h,dp,mat,x=0,y=0,z=0,parent=null){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,dp), mat);
  m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true;
  (parent||scene).add(m); return m;
}
function cyl(rt,rb,h,seg,mat,x=0,y=0,z=0,parent=null){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true;
  (parent||scene).add(m); return m;
}
/** Textura de texto (carteles de neón) */
function textTex(txt, {fg='#fff', bg='rgba(0,0,0,0)', font=140, family='Bebas Neue, Impact, sans-serif',
                       w=1024, h=256, glow='#fff'}={}){
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0,0,w,h);
  g.font = `${font}px ${family}`; g.textAlign='center'; g.textBaseline='middle';
  g.shadowColor = glow; g.shadowBlur = 34;
  g.fillStyle = fg;
  g.fillText(txt, w/2, h/2+6);
  g.fillText(txt, w/2, h/2+6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function sign(txt, wm, hm, color='#ffffff', parent=scene){
  const tex = textTex(txt,{fg:color, glow:color, font:150});
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wm,hm),
    new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false}));
  parent.add(m); return m;
}
/** Textura de ficha / carta para el logo del edificio */
function jokerTex(){
  const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
  g.fillStyle='#12101a'; g.fillRect(0,0,512,512);
  g.strokeStyle='#f2c14e'; g.lineWidth=14; g.strokeRect(28,28,456,456);
  g.fillStyle='#e0203c';
  g.beginPath(); g.moveTo(256,150); g.bezierCurveTo(150,150,140,270,210,300);
  g.lineTo(190,400); g.lineTo(322,400); g.lineTo(302,300);
  g.bezierCurveTo(372,270,362,150,256,150); g.fill();
  const dots=[[150,120,'#3fd8e8'],[362,120,'#f2c14e'],[256,86,'#a88cff']];
  dots.forEach(([x,y,col])=>{g.fillStyle=col;g.beginPath();g.arc(x,y,30,0,7);g.fill();});
  g.fillStyle='#fff';
  g.beginPath(); g.arc(228,232,16,0,7); g.fill();
  g.beginPath(); g.arc(288,232,16,0,7); g.fill();
  g.fillStyle='#f2c14e'; g.font='bold 70px Bebas Neue, Impact, sans-serif';
  g.textAlign='center'; g.fillText('JOKER', 256, 468);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

const neonSigns = [];   // carteles que titilan
const marquee = new THREE.Group();   // cartel gigante del frente

/* =========================================================
   1. CALLE / VEREDA
   ========================================================= */
const W = 15, D = 22, H = 6.4;            // ala: ancho, profundidad, alto planta baja
const XW = { lavanderia:-15, casino:0, fumadores:15 };  // centro X de cada ala
const FRONT = D/2;                                       // z de la fachada

const world = new THREE.Group(); scene.add(world);

(function calle(){
  const asf = new THREE.Mesh(new THREE.PlaneGeometry(300,300), M(0x0e0d13,{roughness:.95}));
  asf.rotation.x = -Math.PI/2; asf.position.y = -0.02; asf.receiveShadow = true; world.add(asf);

  const vereda = box(60, .5, 34, M(0x24222c,{roughness:.9}), 0, .25, 0, world);
  vereda.receiveShadow = true;

  // línea de la calle
  for(let i=-8;i<=8;i++) box(3,.02,.35, GLOW(0xf2c14e,.35), i*7, .01, 30, world);

  // farolas
  [-30,-10,10,30].forEach(x=>{
    cyl(.16,.2,7,10,M(0x1b1a22,{metalness:.6,roughness:.4}), x, 3.5, 20, world);
    const l = cyl(.5,.35,.4,10, GLOW(0xffd9a0,2.2), x, 7.1, 20, world);
    const p = new THREE.PointLight(0xffcf9a, 26, 26, 2); p.position.set(x,6.8,20); world.add(p);
  });

  // maceteros de la vereda
  for(let i=0;i<6;i++){
    const x = -24 + i*9.6;
    box(1.6,1,1.6, M(0x2c2a34), x, .95, 14.4, world);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,0), M(0x1f5c3a,{flatShading:true}));
    bush.position.set(x,2.1,14.4); bush.castShadow=true; world.add(bush);
  }
})();

/* =========================================================
   2. CASCARÓN DEL EDIFICIO
   ========================================================= */
const shell = new THREE.Group(); world.add(shell);
const wings = {};   // { key: {group, ceiling, glass, interior} }

const matPared   = M(0x1a1822,{roughness:.85});
const matPared2  = M(0x221f2c,{roughness:.85});
const matVidrio  = new THREE.MeshPhysicalMaterial({ color:0x9fd8e6, transparent:true, opacity:.16,
                    roughness:.08, metalness:0, transmission:0, side:THREE.DoubleSide });

(function edificio(){
  // losa / piso general
  const losa = box(W*3+1.2, .6, D+1.2, M(0x15131c), 0, .3, 0, shell);
  losa.receiveShadow = true;

  Object.entries(XW).forEach(([key,cx],i)=>{
    const g = new THREE.Group(); shell.add(g);

    // piso interior
    box(W-.3, .12, D-.3, M(C.piso,{roughness:.55, metalness:.15}), cx, .62, 0, g);

    // pared trasera + laterales exteriores
    box(W, H, .5, matPared, cx, H/2+.6, -D/2, g);
    if(i===0) box(.5, H, D, matPared, cx-W/2, H/2+.6, 0, g);
    if(i===2) box(.5, H, D, matPared, cx+W/2, H/2+.6, 0, g);
    // tabique divisorio con paso de 4m en el medio
    if(i<2){
      box(.35, H, (D-4)/2, matPared2, cx+W/2, H/2+.6,  (D+4)/4, g);
      box(.35, H, (D-4)/2, matPared2, cx+W/2, H/2+.6, -(D+4)/4, g);
    }

    // fachada: marco + vidriera + puerta
    box(W, .9, .6, matPared2, cx, H+.15, FRONT, g);        // dintel
    box(.7, H, .6, matPared2, cx-W/2+.35, H/2+.6, FRONT, g);
    box(.7, H, .6, matPared2, cx+W/2-.35, H/2+.6, FRONT, g);
    box(W, .5, .6, matPared2, cx, .85, FRONT, g);          // zócalo
    const glass = box(W-1.4, H-1.4, .12, matVidrio, cx, H/2+.9, FRONT, g);
    glass.castShadow = false;
    // parantes
    for(let k=-1;k<=1;k++) box(.16, H-1.4, .2, M(0x3a3644,{metalness:.7,roughness:.35}), cx+k*4.2, H/2+.9, FRONT+.05, g);
    // puerta
    box(2.6, 3.2, .18, new THREE.MeshStandardMaterial({color:0x0d0c12, roughness:.3, metalness:.4,
        transparent:true, opacity:.55}), cx, 2.3, FRONT+.16, g);
    box(2.9, .18, .5, GLOW(0xf2c14e,1.2), cx, 4.05, FRONT+.2, g);

    // techo del ala (= piso de la terraza) — se desvanece al entrar
    const ceilMat = M(0x1e1b26,{roughness:.9, transparent:true, opacity:1});
    const ceiling = box(W, .5, D, ceilMat, cx, H+.85, 0, g);

    wings[key] = { group:g, ceiling, glass, interior:null };
  });

  // parapeto de la terraza
  const par = M(0x232029,{roughness:.9});
  const TW = W*3, TZ = D;
  box(TW+.6, 1.1, .4, par, 0, H+1.65,  TZ/2, shell);
  box(TW+.6, 1.1, .4, par, 0, H+1.65, -TZ/2, shell);
  box(.4, 1.1, TZ, par, -TW/2, H+1.65, 0, shell);
  box(.4, 1.1, TZ,  par,  TW/2, H+1.65, 0, shell);
})();

shell.add(marquee);

/* ---------- Carteles de fachada ---------- */
(function carteles(){
  const rot = 0;
  const s1 = sign('LAVANDERÍA', 11, 2.6, '#3fd8e8', shell);
  s1.position.set(XW.lavanderia, 5.1, FRONT+.35);
  const s2 = sign('CASINO', 8.5, 2.6, '#f2c14e', shell);
  s2.position.set(XW.casino, 5.1, FRONT+.35);
  const s3 = sign('FUMADORES', 10.5, 2.6, '#a88cff', shell);
  s3.position.set(XW.fumadores, 5.1, FRONT+.35);
  neonSigns.push(s1,s2,s3);

  // marquesina superior con el logo del joker
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.4,4.4),
    new THREE.MeshBasicMaterial({map:jokerTex(), transparent:true}));
  logo.position.set(0, H+3.9, FRONT+.25); marquee.add(logo);
  box(5.2, 5.2, .4, M(0x191722,{metalness:.4,roughness:.5}), 0, H+3.9, FRONT+.05, marquee);
  const big = sign('WASH & PLAY', 16, 3.4, '#e0203c', marquee);
  big.position.set(0, H+7.4, FRONT+.2);
  const big2 = sign('JOKER', 9, 4.4, '#f2c14e', marquee);
  big2.position.set(0, H+10.4, FRONT+.2);
  neonSigns.push(big, big2);
  // soporte del cartel
  box(.35, 8, .35, M(0x1b1a22), -5.5, H+7, FRONT-.1, marquee);
  box(.35, 8, .35, M(0x1b1a22),  5.5, H+7, FRONT-.1, marquee);

  // neón perimetral de la fachada
  const strip = GLOW(C.rojo, 2.4);
  box(W*3+1, .18, .18, strip, 0, H+1.1, FRONT+.32, shell);
  box(.18, H, .18, strip, -W*1.5, H/2+.6, FRONT+.32, shell);
  box(.18, H, .18, strip,  W*1.5, H/2+.6, FRONT+.32, shell);
})();

/* =========================================================
   3. MUEBLES REUTILIZABLES
   ========================================================= */
function silla(x,z,g,rot=0,col=0x3a2430){
  const s = new THREE.Group(); s.position.set(x,0,z); s.rotation.y = rot; g.add(s);
  cyl(.42,.36,.28,12, M(col), 0, 1.15, 0, s);
  cyl(.09,.09,.9,8, M(0x2a2733,{metalness:.6,roughness:.4}), 0, .78, 0, s);
  cyl(.42,.42,.08,12, M(0x2a2733,{metalness:.6}), 0, .38, 0, s);
  box(.8,.9,.16, M(col), 0, 1.75, -.36, s);
  return s;
}
function luzTecho(x,z,g,color=0xffffff,inten=1.4,w=3.4){
  box(w,.14,.4, GLOW(color,inten), x, H+.45, z, g);
}
function tragamonedas(x,z,g,rot=0,color=C.oro){
  const s = new THREE.Group(); s.position.set(x,0,z); s.rotation.y=rot; g.add(s);
  box(1.05,2.1,.85, M(0x201d29,{metalness:.35,roughness:.5}), 0, 1.7, 0, s);
  box(.95,.14,.9, GLOW(color,2.2), 0, 2.82, 0, s);             // corona de neon
  box(.8,.62,.06, GLOW(0x30e0a0,1.5), 0, 2.15, .45, s);        // pantalla
  box(.8,.5,.06,  GLOW(color,1.1),    0, 1.45, .45, s);        // rodillos
  box(.9,.2,.35, M(0x2e2b38,{metalness:.5}), 0, 1.05, .55, s); // botonera
  const pal = cyl(.05,.05,.5,8, M(0xb03040,{metalness:.6}), .62, 2.0, .18, s);
  pal.rotation.z = .35;
  return s;
}
function mesaPano(x,z,g,{r=1.9, semi=false, oval=false, col=C.felt}={}){
  const s = new THREE.Group(); s.position.set(x,0,z); g.add(s);
  const th = semi ? Math.PI : Math.PI*2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r,r,.22,40,1,false,0,th), M(col,{roughness:.95}));
  top.position.y = 1.6; top.castShadow = top.receiveShadow = true; s.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r,.1,8,40,th), M(0x3b2a1d,{roughness:.5}));
  rim.rotation.x = Math.PI/2; rim.position.y = 1.7; s.add(rim);
  cyl(.35,.55,1.5,12, M(0x241f2b), 0, .85, 0, s);
  if(oval) s.scale.set(1.45,1,1);
  return s;
}
function fichas(x,y,z,g,col){
  for(let i=0;i<5;i++) cyl(.16,.16,.05,14, GLOW(col,.35), x, y+i*.055, z, g);
}

/* =========================================================
   4. INTERIOR - LAVANDERIA
   ========================================================= */
function lavarropas(x,z,gg,rot=0,apilado=false){
  const s = new THREE.Group(); s.position.set(x,0,z); s.rotation.y = rot; gg.add(s);
  const alturas = apilado ? [1.6,3.35] : [1.6];
  alturas.forEach(y=>{
    box(1.7,1.65,1.55, M(0xdfe4ea,{roughness:.35,metalness:.25}), 0, y, 0, s);
    const puerta = new THREE.Mesh(new THREE.CircleGeometry(.56,26),
      new THREE.MeshStandardMaterial({color:0x0a1a22, roughness:.1, metalness:.6,
        emissive:0x0e5f72, emissiveIntensity:.7}));
    puerta.position.set(0,y,.79); s.add(puerta);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(.6,.07,8,26), M(0x9aa3ad,{metalness:.8,roughness:.25}));
    aro.position.set(0,y,.78); s.add(aro);
    box(1.4,.16,.05, GLOW(C.cian,1.2), 0, y+.66, .8, s);
  });
  return s;
}

function buildLavanderia(){
  const g = new THREE.Group(); const cx = XW.lavanderia; wings.lavanderia.group.add(g);
  box(W-.4, .06, D-.4, M(0x20303a,{roughness:.35,metalness:.2}), cx, .7, 0, g);

  for(let i=0;i<7;i++) lavarropas(cx-5.6+i*1.9, -9.6, g, 0);                  // lavarropas fondo
  for(let i=0;i<5;i++) lavarropas(cx-6.4, -5.6+i*1.9, g, Math.PI/2, true);    // secarropas apilados
  for(let i=0;i<5;i++) lavarropas(cx+6.4, -5.6+i*1.9, g, -Math.PI/2);

  // mesada de plegado + ropa doblada
  box(6.4,.25,1.6, M(0x8c6a45,{roughness:.6}), cx, 1.55, 3.4, g);
  box(6.4,1.4,1.4, M(0x2a2733), cx, .95, 3.4, g);
  [-2,-.4,1.2,2.6].forEach((o,i)=>{
    const col = [0xe0203c,0x3fd8e8,0xf2c14e,0xffffff][i];
    for(let k=0;k<3;k++) box(1.1,.18,.9, M(col,{roughness:.9}), cx+o, 1.78+k*.2, 3.4, g);
  });

  // perchero con cortinas y blanqueria colgada
  const barra = cyl(.07,.07,7.4,8, M(0xb9bfc7,{metalness:.8}), cx, 4.3, 7.4, g);
  barra.rotation.z = Math.PI/2;
  ['#d94f6a','#4fc3d9','#f0d38a','#8f7ad9','#e8e4dc'].forEach((c,i)=>{
    const cort = new THREE.Mesh(new THREE.PlaneGeometry(1.2,3.1),
      new THREE.MeshStandardMaterial({color:new THREE.Color(c), side:THREE.DoubleSide, roughness:.95}));
    cort.position.set(cx-2.8+i*1.4, 2.7, 7.4); cort.castShadow = true; g.add(cort);
  });

  // estanteria de zapatillas
  const est = new THREE.Group(); est.position.set(cx+5.4, 0, 6.8); g.add(est);
  for(let k=0;k<3;k++) box(3.4,.14,1.1, M(0x8c6a45), 0, 1.2+k*1.1, 0, est);
  box(.16,3.6,1.1, M(0x8c6a45), -1.7, 2.2, 0, est);
  box(.16,3.6,1.1, M(0x8c6a45),  1.7, 2.2, 0, est);
  for(let k=0;k<3;k++) for(let j=0;j<4;j++){
    const col=[0xe0203c,0xffffff,0x3fd8e8,0x2b2b33][j];
    box(.6,.34,.85, M(col,{roughness:.8}), -1.25+j*.82, 1.5+k*1.1, 0, est);
  }

  // espera + TV
  for(let i=0;i<3;i++) silla(cx-4+i*1.6, 8.6, g, Math.PI, 0x2f3b45);
  box(3.4,1.9,.16, GLOW(0x1b4f7a,.8), cx+3.2, 4.2, -10.5, g);
  box(3.7,2.2,.1, M(0x121118), cx+3.2, 4.2, -10.62, g);

  const s = sign('LAVADO - BLANQUERIA - CALZADO', 11, 1.9, '#3fd8e8', g);
  s.position.set(cx, 5.6, -10.4);
  luzTecho(cx-3.5,-6, g, 0xd8f4ff, 1.5); luzTecho(cx+3.5,-6, g, 0xd8f4ff, 1.5);
  luzTecho(cx-3.5, 4, g, 0xd8f4ff, 1.5); luzTecho(cx+3.5, 4, g, 0xd8f4ff, 1.5);
  const pl = new THREE.PointLight(0xbfe9ff, 40, 26, 2); pl.position.set(cx,4.6,-2); g.add(pl);

  wings.lavanderia.interior = g;
}

/* =========================================================
   5. INTERIOR - CASINO
   ========================================================= */
function buildCasino(){
  const g = new THREE.Group(); const cx = XW.casino; wings.casino.group.add(g);
  box(W-.4,.06,D-.4, M(0x5a1226,{roughness:.95}), cx, .7, 0, g);   // alfombra bordo
  for(let i=0;i<5;i++) box(W-.6,.02,.25, GLOW(C.oro,.5), cx, .74, -9+i*4.4, g);

  // ruleta
  const rul = mesaPano(cx-3.4, -5.6, g, {r:2.0});
  cyl(1.05,1.05,.3,32, M(0x241a12,{roughness:.4,metalness:.3}), 0, 1.85, 0, rul);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2;
    const sec = box(.34,.1,.9, i%2? GLOW(C.rojo,.6):M(0x111014),
      Math.cos(a)*.62, 2.0, Math.sin(a)*.62, rul);
    sec.rotation.y = -a;
  }
  cyl(.14,.22,.5,10, M(0xd8b45a,{metalness:.9,roughness:.2}), 0, 2.2, 0, rul);
  for(let i=0;i<6;i++) silla(cx-3.4+Math.cos(i/6*6.28)*3.1, -5.6+Math.sin(i/6*6.28)*3.1, g, -i/6*6.28+Math.PI/2, 0x4a1f2c);
  const sr = sign('RULETA', 3.4, 1.1, '#e0203c', g); sr.position.set(cx-3.4, 4.4, -5.6);

  // blackjack x2
  [[cx+4.2,-6.4],[cx+4.2,-1.2]].forEach(([x,z])=>{
    const m = mesaPano(x, z, g, {r:1.85, semi:true});
    m.rotation.y = Math.PI;
    fichas(x-.7, 1.72, z+.9, g, C.rojo); fichas(x+.7, 1.72, z+.9, g, C.cian);
    for(let k=0;k<4;k++) silla(x-1.9+k*1.25, z+2.5, g, Math.PI, 0x243a4a);
    box(.9,.06,.6, M(0xf2f0ea), x, 1.75, z-.6, g);
  });
  const sb = sign('BLACKJACK', 4.6, 1.2, '#f2c14e', g); sb.position.set(cx+4.2, 4.4, -8.8);

  // poker
  mesaPano(cx-3.2, 3.6, g, {r:1.8, oval:true, col:0x123c66});
  fichas(cx-4.6,1.72,4.6,g,C.oro); fichas(cx-2.0,1.72,4.6,g,C.humo);
  for(let i=0;i<7;i++){
    const a = i/7*Math.PI*2;
    silla(cx-3.2+Math.cos(a)*3.6, 3.6+Math.sin(a)*2.9, g, -a+Math.PI/2, 0x2c2440);
  }
  const sp = sign('POKER', 3.2, 1.1, '#3fd8e8', g); sp.position.set(cx-3.2, 4.4, 3.6);

  // tragamonedas / jackpot
  for(let i=0;i<6;i++) tragamonedas(cx-6.1+i*2.45, -10.0, g, 0, i%2?C.rojo:C.oro);
  const sj = sign('* JACKPOT *', 9, 2.2, '#f2c14e', g); sj.position.set(cx, 5.7, -10.5);
  neonSigns.push(sj);

  // barra
  box(6.2,1.5,1.2, M(0x2a1c26,{roughness:.6}), cx+4.6, 1.35, 8.2, g);
  box(6.4,.18,1.4, M(0x0f0e14,{metalness:.6,roughness:.2}), cx+4.6, 2.18, 8.2, g);
  box(6.2,.2,.2, GLOW(C.rojo,2.0), cx+4.6, .8, 7.62, g);
  for(let i=0;i<4;i++) cyl(.35,.3,.2,12, M(0x4a1f2c), cx+2.2+i*1.6, 1.9, 6.9, g);
  for(let i=0;i<10;i++) box(.22,.6,.22, GLOW([0xf2c14e,0xe0203c,0x3fd8e8][i%3],.7), cx+2+i*.55, 3.1, 8.8, g);

  // aranas de luz
  [[cx-3.4,-5.6],[cx+4.2,-3.8],[cx-3.2,3.6]].forEach(([x,z])=>{
    cyl(.05,.05,1.2,6, M(0x2a2733), x, H-.2, z, g);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1), GLOW(0xffe1a8,2.0));
    b.position.set(x,H-.9,z); g.add(b);
    const p = new THREE.PointLight(0xffd79a, 55, 22, 2); p.position.set(x,H-1.1,z); g.add(p);
  });
  luzTecho(cx,9, g, 0xff6a86, 1.2, 8);

  wings.casino.interior = g;
}

/* =========================================================
   6. INTERIOR - SALA DE FUMADORES
   ========================================================= */
let smokeSystem = null;

function buildFumadores(){
  const g = new THREE.Group(); const cx = XW.fumadores; wings.fumadores.group.add(g);
  box(W-.4,.06,D-.4, M(0x241a33,{roughness:.9}), cx, .7, 0, g);
  for(let i=0;i<4;i++) box(W-.6,.02,.2, GLOW(C.humo,.6), cx, .74, -8+i*5, g);

  // mampara vidriada hacia el casino (aislacion)
  const mamp = new THREE.Mesh(new THREE.PlaneGeometry(D-2, H-1),
    new THREE.MeshPhysicalMaterial({color:0xa88cff, transparent:true, opacity:.13,
      roughness:.05, side:THREE.DoubleSide}));
  mamp.rotation.y = Math.PI/2; mamp.position.set(cx-W/2+.4, H/2+.6, 0); g.add(mamp);

  // tragamonedas contra las dos paredes
  for(let i=0;i<5;i++) tragamonedas(cx-4.8+i*2.4, -9.9, g, 0, C.humo);
  for(let i=0;i<4;i++) tragamonedas(cx+6.2, -4.5+i*2.4, g, -Math.PI/2, i%2?C.rojo:C.humo);

  // mesa de poker + blackjack chico
  mesaPano(cx-2.2, -3.4, g, {r:1.7, oval:true, col:0x2a1747});
  fichas(cx-3.4,1.72,-2.6,g,C.humo); fichas(cx-1.1,1.72,-2.6,g,C.oro);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    silla(cx-2.2+Math.cos(a)*3.3, -3.4+Math.sin(a)*2.7, g, -a+Math.PI/2, 0x33254d);
  }
  const bj = mesaPano(cx-3.6, 4.6, g, {r:1.6, semi:true}); bj.rotation.y = Math.PI;
  for(let k=0;k<3;k++) silla(cx-4.8+k*1.25, 6.9, g, Math.PI, 0x33254d);

  // mesas altas con ceniceros
  [[cx+3.4,2.2],[cx+4.6,6.4],[cx+1.4,7.6]].forEach(([x,z])=>{
    cyl(.75,.75,.14,18, M(0x1d1a26,{metalness:.5,roughness:.35}), x, 2.35, z, g);
    cyl(.16,.22,2.3,10, M(0x2a2733,{metalness:.7}), x, 1.2, z, g);
    cyl(.6,.6,.06,16, M(0x2a2733), x, .1, z, g);
    const cen = cyl(.28,.22,.12,16, M(0x8d8a95,{metalness:.8,roughness:.3}), x, 2.5, z, g);
    cen.userData.humo = true;
    // cigarrillo encendido
    box(.06,.06,.3, M(0xf0ece4), x+.2, 2.53, z, g);
    box(.05,.05,.05, GLOW(0xff6a2a,2.5), x+.2, 2.53, z+.16, g);
  });

  // campanas extractoras en el techo
  for(let i=0;i<3;i++){
    const x = cx-4.5+i*4.5;
    const camp = new THREE.Mesh(new THREE.CylinderGeometry(1.5,.9,.9,6),
      M(0x3a3646,{metalness:.75,roughness:.3}));
    camp.position.set(x, H-.35, -1); camp.castShadow = true; g.add(camp);
    cyl(.35,.35,.7,10, M(0x2a2733,{metalness:.8}), x, H+.2, -1, g);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.35,.06,6,24), GLOW(C.humo,1.6));
    anillo.rotation.x = Math.PI/2; anillo.position.set(x, H-.75, -1); g.add(anillo);
  }

  const sf = sign('SALA FUMADORES', 9.5, 2.0, '#a88cff', g); sf.position.set(cx, 5.6, -10.4);
  neonSigns.push(sf);
  const sv = sign('VENTILACION 100%', 5.6, 1.1, '#3fd8e8', g); sv.position.set(cx, 4.0, -10.4);
  luzTecho(cx-3,-6,g,0xb69cff,1.3); luzTecho(cx+3,-6,g,0xb69cff,1.3);
  luzTecho(cx-3, 5,g,0xb69cff,1.3); luzTecho(cx+3, 5,g,0xb69cff,1.3);
  const pl = new THREE.PointLight(0xb69cff, 42, 24, 2); pl.position.set(cx,4.6,-1); g.add(pl);

  // ---- humo (particulas) ----
  const cv = document.createElement('canvas'); cv.width=cv.height=64;
  const ctx = cv.getContext('2d');
  const rg = ctx.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,'rgba(220,215,235,.55)'); rg.addColorStop(1,'rgba(220,215,235,0)');
  ctx.fillStyle = rg; ctx.fillRect(0,0,64,64);
  const tex = new THREE.CanvasTexture(cv);
  const N = 220, pos = new Float32Array(N*3), seed = new Float32Array(N);
  for(let i=0;i<N;i++){
    pos[i*3]   = cx + (Math.random()-.5)*11;
    pos[i*3+1] = 1.5 + Math.random()*(H-1.5);
    pos[i*3+2] = (Math.random()-.5)*18;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map:tex, size:1.5,
    transparent:true, opacity:.32, depthWrite:false, blending:THREE.AdditiveBlending }));
  g.add(pts);
  smokeSystem = { pts, seed, base:H };

  wings.fumadores.interior = g;
}

/* =========================================================
   7. TERRAZA
   ========================================================= */
const terraza = new THREE.Group(); shell.add(terraza);

function buildTerraza(){
  const TY = H + 1.1;                       // nivel del piso de la terraza
  const g = terraza;

  // deck de madera
  const deck = box(W*3-1, .12, D-1, M(0x6b4a30,{roughness:.85}), 0, TY+.06, 0, g);
  deck.receiveShadow = true;
  for(let i=0;i<14;i++) box(W*3-1,.02,.06, M(0x4e3524), 0, TY+.13, -10+i*1.5, g);

  // barra de la terraza
  box(9,1.4,1.3, M(0x2b2130,{roughness:.6}), -8, TY+.8, -8.4, g);
  box(9.3,.16,1.5, M(0x100f16,{metalness:.6,roughness:.2}), -8, TY+1.58, -8.4, g);
  box(9,.18,.18, GLOW(C.oro,2.0), -8, TY+.35, -7.8, g);
  for(let i=0;i<5;i++){
    cyl(.32,.28,.18,12, M(0x4a1f2c), -11+i*1.6, TY+1.35, -7.1, g);
    cyl(.09,.09,1.2,8, M(0x2a2733,{metalness:.7}), -11+i*1.6, TY+.7, -7.1, g);
  }
  const sb = sign('SKY BAR', 5.6, 1.6, '#f2c14e', g); sb.position.set(-8, TY+3.1, -9.1);
  neonSigns.push(sb);

  // mesas con sombrilla
  [[-2,4],[6,3],[13,-2],[-13,4],[3,-4],[16,6]].forEach(([x,z],i)=>{
    cyl(1.0,1.0,.12,18, M(0x8c6a45,{roughness:.7}), x, TY+1.15, z, g);
    cyl(.12,.16,1.1,10, M(0x2a2733,{metalness:.7}), x, TY+.6, z, g);
    cyl(.55,.55,.05,14, M(0x2a2733), x, TY+.06, z, g);
    for(let k=0;k<3;k++){
      const a = k/3*6.28;
      silla(x+Math.cos(a)*1.7, z+Math.sin(a)*1.7, g, -a+Math.PI/2, 0x3a3040).position.y = TY;
    }
    // sombrilla
    cyl(.07,.07,3,8, M(0x8c6a45), x, TY+1.6, z, g);
    const som = new THREE.Mesh(new THREE.ConeGeometry(2.1, .8, 8),
      M(i%2?0xe0203c:0x1f1d28,{roughness:.85, side:THREE.DoubleSide}));
    som.position.set(x, TY+3.2, z); som.castShadow = true; g.add(som);
  });

  // sillones lounge
  [[-16,7],[19,-7]].forEach(([x,z])=>{
    box(3.2,.7,1.6, M(0x2e2a3a), x, TY+.5, z, g);
    box(3.2,.9,.4, M(0x2e2a3a), x, TY+1.1, z-.6, g);
    box(1.1,.5,1.1, M(0x8c6a45), x+2.4, TY+.4, z, g);
  });

  // macetas
  for(let i=0;i<10;i++){
    const x = -20 + i*4.4, z = (i%2? 9.6 : -9.6);
    cyl(.6,.45,.9,10, M(0x3a3040), x, TY+.5, z, g);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.85,0), M(0x2b6b45,{flatShading:true}));
    b.position.set(x, TY+1.5, z); b.castShadow = true; g.add(b);
  }

  // guirnaldas de luces
  for(let f=0; f<3; f++){
    const z = -4 + f*5;
    for(let i=0;i<22;i++){
      const x = -20 + i*1.9;
      const y = TY + 4.2 - Math.sin(i/21*Math.PI)*.9 + Math.sin(f)*.1;
      const b = new THREE.Mesh(new THREE.SphereGeometry(.11,8,8), GLOW(0xffd9a0, 2.2));
      b.position.set(x, y, z); g.add(b);
    }
  }
  [-21,21].forEach(x=>{
    cyl(.12,.14,5,8, M(0x2a2733), x, TY+2.5, -4, g);
    cyl(.12,.14,5,8, M(0x2a2733), x, TY+2.5,  6, g);
  });
  const pl = new THREE.PointLight(0xffcf9a, 60, 40, 2); pl.position.set(0, TY+4.5, 0); g.add(pl);
  const pl2 = new THREE.PointLight(0xff6a86, 40, 30, 2); pl2.position.set(-8, TY+3, -6); g.add(pl2);
}

buildLavanderia();
buildCasino();
buildFumadores();
buildTerraza();

/* =========================================================
   8. SECCIONES / CAMARA / INTERACCION
   ========================================================= */
const EXT = { pos:new THREE.Vector3(6, 26, 62), target:new THREE.Vector3(0, 7, 0) };
/** en pantallas angostas hay que alejarse para que entre todo el edificio */
function extPos(){
  const f = Math.min(2.2, Math.max(1, 1.75/camera.aspect));
  return new THREE.Vector3(EXT.pos.x*f, 8 + (EXT.pos.y-8)*f, EXT.pos.z*f);
}

const SECTIONS = {
  lavanderia:{
    nombre:'Lavandería', acc:'#3fd8e8', kick:'ALA OESTE · PLANTA BAJA',
    desc:'Autoservicio 24 h con lavarropas industriales, secarropas apilados y estación de lavado especial. Dejás la carga, sacás el ticket y te vas a jugar mientras el tambor hace lo suyo.',
    items:['Ropa y jeans','Blanquería y acolchados','Cortinas','Zapatillas','Planchado y plegado','Delivery de bolsón'],
    cam:{ pos:[XW.lavanderia+.5, 4.4, 8.6], target:[XW.lavanderia, 2.2, -6] }
  },
  casino:{
    nombre:'Casino', acc:'#f2c14e', kick:'ALA CENTRAL · PLANTA BAJA',
    desc:'El corazón del local: mesas en vivo y máquinas conectadas al jackpot progresivo. Cada ciclo de lavado te suma créditos de bienvenida para jugar mientras esperás.',
    items:['Jackpot progresivo','Ruleta','Blackjack x2','Póker','Tragamonedas','Barra & tragos'],
    cam:{ pos:[XW.casino+.5, 4.6, 8.8], target:[XW.casino, 2.1, -5.5] }
  },
  fumadores:{
    nombre:'Sala Fumadores', acc:'#a88cff', kick:'ALA ESTE · PLANTA BAJA',
    desc:'Mismo casino, sala independiente con mampara vidriada y extracción de aire permanente. Mesas altas, ceniceros y las mismas apuestas que en el salón principal.',
    items:['Ventilación 100%','Tragamonedas','Póker','Blackjack','Mesas altas','Acceso directo a la barra'],
    cam:{ pos:[XW.fumadores-.5, 4.4, 8.4], target:[XW.fumadores, 2.1, -5] }
  },
  terraza:{
    nombre:'Terraza', acc:'#e0203c', kick:'PRIMER PISO · AIRE LIBRE',
    desc:'Deck al aire libre sobre las tres alas, con sky bar, mesas con sombrilla y guirnaldas. El lugar para esperar el último centrifugado con algo fresco.',
    items:['Sky bar','Mesas con sombrilla','Lounge','Música en vivo','Pantalla de jackpot','Vista a la calle'],
    cam:{ pos:[1, 13.2, 23], target:[-2, 8.2, -3] }
  }
};

/* --- hitboxes invisibles --- */
const picker = new THREE.Group(); scene.add(picker);
const hitMat = new THREE.MeshBasicMaterial({ visible:false });
const hits = [];
Object.entries(XW).forEach(([key,cx])=>{
  const h = new THREE.Mesh(new THREE.BoxGeometry(W-.6, H, D-.6), hitMat);
  h.position.set(cx, H/2+.6, 0); h.userData.key = key; picker.add(h); hits.push(h);
});
const ht = new THREE.Mesh(new THREE.BoxGeometry(W*3-1, 3.4, D-1), hitMat);
ht.position.set(0, H+2.6, 0); ht.userData.key = 'terraza'; picker.add(ht); hits.push(ht);

/* --- animación de cámara --- */
let fly = null, current = null;
const easeIO = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;

function flyTo(pos, target, dur=1700){
  fly = { t:0, dur, fp:camera.position.clone(), tp:new THREE.Vector3(...(pos.toArray?pos.toArray():pos)),
          ft:controls.target.clone(), tt:new THREE.Vector3(...(target.toArray?target.toArray():target)) };
  controls.enabled = false;
}
function flash(){
  const f = document.getElementById('flash');
  f.style.opacity = .55;
  setTimeout(()=>{ f.style.opacity = 0; }, 260);
}

function enter(key){
  if(key === current) return;
  const S = SECTIONS[key]; if(!S) return;
  flash();
  current = key;

  // abrir el techo del ala y esconder la terraza si entramos a planta baja
  Object.entries(wings).forEach(([k,w])=>{
    const dentro = (k === key);
    w.ceiling.material.transparent = true;
    w.ceiling.userData.to = dentro ? 0 : 1;
    w.glass.visible = !dentro;
  });
  terraza.visible = true;
  marquee.visible = (key !== 'terraza');
  if(key !== 'terraza') terraza.visible = false;
  document.getElementById('hint').style.opacity = 0;

  flyTo(S.cam.pos, S.cam.target);
  showPanel(S, key);
  markNav(key);
}

function exit(){
  current = null;
  Object.values(wings).forEach(w=>{ w.ceiling.userData.to = 1; w.glass.visible = true; });
  terraza.visible = true;
  marquee.visible = true;
  flash();
  flyTo(extPos(), EXT.target, 1500);
  document.getElementById('panel').classList.remove('show');
  document.getElementById('hint').style.opacity = 1;
  markNav('exterior');
}

/* =========================================================
   9. UI
   ========================================================= */
const logoSVG = document.getElementById('logo').innerHTML;
document.getElementById('logoSlot').innerHTML = logoSVG;
document.getElementById('logoSlot2').innerHTML = logoSVG;

const nav = document.getElementById('nav');
function mkBtn(label, key, acc){
  const b = document.createElement('button');
  b.textContent = label; b.dataset.key = key; b.style.setProperty('--acc', acc);
  b.onclick = () => key === 'exterior' ? exit() : enter(key);
  nav.appendChild(b); return b;
}
mkBtn('EXTERIOR','exterior','#e0203c');
Object.entries(SECTIONS).forEach(([k,S]) => mkBtn(S.nombre.toUpperCase(), k, S.acc));
function markNav(key){
  [...nav.children].forEach(b => b.classList.toggle('on', b.dataset.key === key));
}
markNav('exterior');

const panel = document.getElementById('panel');
function showPanel(S, key){
  panel.style.setProperty('--acc', S.acc);
  document.getElementById('pKick').textContent = S.kick;
  document.getElementById('pTitle').textContent = S.nombre;
  document.getElementById('pDesc').textContent = S.desc;
  const ul = document.getElementById('pList'); ul.innerHTML = '';
  S.items.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  panel.classList.add('show');
}
document.getElementById('pBack').onclick = exit;

/* --- picking --- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
const tip = document.getElementById('tip');
let down = null, hovered = null;

function pick(ev){
  mouse.x = (ev.clientX/innerWidth)*2 - 1;
  mouse.y = -(ev.clientY/innerHeight)*2 + 1;
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(hits, false)[0];
  return hit ? hit.object.userData.key : null;
}
addEventListener('pointermove', ev=>{
  if(current || fly){ tip.style.opacity = 0; hovered = null; return; }
  const k = pick(ev);
  hovered = k;
  if(k){
    tip.style.opacity = 1;
    tip.style.left = ev.clientX+'px'; tip.style.top = ev.clientY+'px';
    tip.textContent = 'ENTRAR A ' + SECTIONS[k].nombre.toUpperCase();
    tip.style.borderColor = SECTIONS[k].acc;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tip.style.opacity = 0; renderer.domElement.style.cursor = 'grab';
  }
});
addEventListener('pointerdown', ev=>{ down = {x:ev.clientX, y:ev.clientY}; });
addEventListener('pointerup', ev=>{
  if(!down) return;
  const moved = Math.hypot(ev.clientX-down.x, ev.clientY-down.y);
  down = null;
  if(moved > 6 || current || fly) return;
  const k = pick(ev);
  if(k){ tip.style.opacity = 0; enter(k); }
});
addEventListener('keydown', e=>{ if(e.key === 'Escape' && current) exit(); });
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if(!current && !fly){ camera.position.copy(extPos()); controls.target.copy(EXT.target); }
});

/* =========================================================
   10. LOOP
   ========================================================= */
camera.position.copy(extPos());
controls.target.copy(EXT.target);
Object.values(wings).forEach(w=>{ w.ceiling.userData.to = 1; w.ceiling.material.transparent = true; });

const clock = new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;

  // vuelo de camara
  if(fly){
    fly.t += dt*1000;
    const k = easeIO(Math.min(fly.t/fly.dur, 1));
    camera.position.lerpVectors(fly.fp, fly.tp, k);
    controls.target.lerpVectors(fly.ft, fly.tt, k);
    if(fly.t >= fly.dur){ fly = null; controls.enabled = true; }
  }

  // techos que se abren / cierran
  Object.values(wings).forEach(w=>{
    const to = w.ceiling.userData.to ?? 1;
    const m = w.ceiling.material;
    m.opacity += (to - m.opacity) * Math.min(dt*4, 1);
    w.ceiling.visible = m.opacity > .02;
  });

  // neones que titilan
  neonSigns.forEach((s,i)=>{
    s.material.opacity = .78 + .22*Math.sin(t*(2.2+i*.5) + i);
    s.material.transparent = true;
  });

  // humo de la sala de fumadores
  if(smokeSystem){
    const p = smokeSystem.pts.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      let y = p.getY(i) + dt*(.25 + smokeSystem.seed[i]*.45);
      if(y > smokeSystem.base) y = 1.4;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t*.6 + i)*dt*.12);
    }
    p.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}
tick();

setTimeout(()=>{ document.getElementById('load').classList.add('off'); }, 700);
