/* ==========================================================================
   Moldable Crew — real-time 3D hero (Phase 01.3: soft jelly)
   Every character is built from its ORIGINAL Figma silhouette, then
   *inflated* like a cushion instead of extruded:
     outline (from the SVG path) → arc-length resample → gentle low-pass
     → radial mesh from the pole of inaccessibility
     → height = round profile of the distance to the edge, creases smoothed
     → mirrored, flatter back, one continuous surface with shared normals.
   No bevel rings, so no stepped bands; shading comes from smooth normals.
   Bundled with esbuild → ../hero3d.js (see build.sh).
   ========================================================================== */
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import paiSvg from "../assets/characters/pai.svg";
import actSvg from "../assets/characters/act.svg";
import famaiSvg from "../assets/characters/famai.svg";
import fahSvg from "../assets/characters/fah.svg";
import minSvg from "../assets/characters/min.svg";

/* Per-character art direction.
   grad   — the original gradient stops (Moldable primitives)
   soften — outline low-pass, in % of perimeter (higher = puffier tips)
   puff   — front height relative to the inscribed radius
   back   — back height relative to the front (flatter back sits nicer)
   round  — exponent on the balloon profile (lower = fuller, flatter top) */
const CHARACTERS = {
  pai:   { svg: paiSvg,   name: "PAI",   role: "Style Curator",          grad: ["#EFE3F1", "#9BB0DE"], soften: 1.4, puff: 0.95, back: 0.55, round: 0.85 },
  act:   { svg: actSvg,   name: "ACT",   role: "Typography Guide",       grad: ["#ABC2E5", "#5F8E98"], soften: 2.4, puff: 0.95, back: 0.6,  round: 0.9  },
  famai: { svg: famaiSvg, name: "FAMAI", role: "Color Explorer",         grad: ["#E2CCE6", "#D46085"], soften: 1.1, puff: 1.0,  back: 0.55, round: 0.8  },
  fah:   { svg: fahSvg,   name: "FAH",   role: "Accessibility Guardian", grad: ["#D3E1E4", "#8296D2"], soften: 1.3, puff: 0.92, back: 0.55, round: 0.85 },
  min:   { svg: minSvg,   name: "MIN",   role: "Component Maker",        grad: ["#E2CCE6", "#6978C2"], soften: 2.0, puff: 0.9,  back: 0.6,  round: 0.85 },
};

/* Hero composition (world units; camera at z=60, fov 32 → ~34.4 units tall at z=0).
   Two leads in front, three supporting at different depths; each breathes at its own pace. */
const LAYOUT = {
  min:   { pos: [16.2, -4.2, 4],   height: 12.6, rot: [0.05, -0.32, -0.05], float: { amp: 0.42, speed: 0.46, phase: 0.0 }, breath: 0.9 },
  fah:   { pos: [3.4, -9.0, 3],    height: 9.0,  rot: [0.04, 0.2, 0.04],    float: { amp: 0.36, speed: 0.58, phase: 1.9 }, breath: 1.15 },
  pai:   { pos: [-5.4, 8.6, -4],   height: 7.0,  rot: [0.02, 0.3, 0.1],     float: { amp: 0.48, speed: 0.52, phase: 3.1 }, breath: 1.3 },
  act:   { pos: [8.6, 7.0, -9],    height: 10.4, rot: [0.0, -0.16, 0.05],   float: { amp: 0.4,  speed: 0.4,  phase: 4.4 }, breath: 0.75 },
  famai: { pos: [21.0, 11.0, -3],  height: 6.4,  rot: [0.02, 0.12, -0.2],   float: { amp: 0.55, speed: 0.66, phase: 0.9 }, breath: 1.5 },
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- 2D helpers (outline in y-up space) ---------- */
const loader = new SVGLoader();

function classify(paths) {
  const out = { body: [], whites: [], pupils: [], mouths: [], strokes: [] };
  for (const p of paths) {
    const fill = (p.userData.style.fill || "").toLowerCase();
    const stroke = (p.userData.style.stroke || "").toLowerCase();
    if ((!fill || fill === "none") && stroke && stroke !== "none") { out.strokes.push(p); continue; }
    if (!fill || fill === "none") continue;
    if (fill.startsWith("url")) out.body.push(p);
    else if (fill === "#f5f5f5") out.whites.push(p);
    else if (fill === "#202429") out.pupils.push(p);
    else if (fill === "black" || fill === "#000000" || fill === "#000") out.mouths.push(p);
  }
  out.body.sort((a, b) => bboxArea(b) - bboxArea(a)); // largest gradient path = silhouette
  return out;
}
function bboxArea(path) {
  const box = new THREE.Box2();
  for (const sp of path.subPaths) for (const pt of sp.getPoints(8)) box.expandByPoint(pt);
  const s = box.getSize(new THREE.Vector2());
  return s.x * s.y;
}

/** Outer loop(s) of an SVG path as y-up point arrays. */
function outlines(path) {
  return SVGLoader.createShapes(path).map((shape) => {
    const pts = shape.getPoints(64).map((v) => new THREE.Vector2(v.x, -v.y));
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
    return pts;
  });
}
/** Closed centripetal spline, resampled to n evenly spaced points. */
function resample(pts, n) {
  const curve = new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(v.x, v.y, 0)), true, "centripetal");
  return curve.getSpacedPoints(n).slice(0, n).map((v) => new THREE.Vector2(v.x, v.y));
}
/** Circular gaussian low-pass: rounds tips and valleys without changing the silhouette's character. */
function soften(pts, percent) {
  const n = pts.length, sigma = Math.max(0.5, (percent / 100) * n);
  const r = Math.ceil(sigma * 3), w = [];
  let sum = 0;
  for (let k = -r; k <= r; k++) { const v = Math.exp(-(k * k) / (2 * sigma * sigma)); w.push(v); sum += v; }
  return pts.map((_, i) => {
    let x = 0, y = 0;
    for (let k = -r; k <= r; k++) { const p = pts[(i + k + n) % n]; x += p.x * w[k + r]; y += p.y * w[k + r]; }
    return new THREE.Vector2(x / sum, y / sum);
  });
}
function signedArea(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return a / 2; }
function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
function distToEdge(pts, x, y) {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy || 1;
    const t = THREE.MathUtils.clamp(((x - a.x) * dx + (y - a.y) * dy) / len, 0, 1);
    const ex = a.x + dx * t - x, ey = a.y + dy * t - y, d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
/** Pole of inaccessibility (coarse grid + local refine): the most "inside" point. */
function pole(pts) {
  const box = new THREE.Box2().setFromPoints(pts), size = box.getSize(new THREE.Vector2());
  let best = { x: 0, y: 0, d: -1 };
  const scan = (cx, cy, w, h, steps) => {
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
      const x = cx - w / 2 + (w * i) / steps, y = cy - h / 2 + (h * j) / steps;
      if (!inside(pts, x, y)) continue;
      const d = distToEdge(pts, x, y);
      if (d > best.d) best = { x, y, d };
    }
  };
  const c = box.getCenter(new THREE.Vector2());
  scan(c.x, c.y, size.x, size.y, 40);
  scan(best.x, best.y, size.x / 10, size.y / 10, 20);
  return best;
}

/* ---------- inflation ---------- */
/**
 * Balloon field: solve Δφ = −1 inside the outline (φ = 0 on the edge) on a regular grid.
 * √φ is a sphere for a circle and stays perfectly smooth for any outline — no medial-axis
 * creases, lobes and spikes inflate lower and rounder than the body, like a real cushion.
 */
function poissonField(pts, res = 120) {
  const box = new THREE.Box2().setFromPoints(pts), size = box.getSize(new THREE.Vector2());
  const pad = Math.max(size.x, size.y) * 0.03;
  const minX = box.min.x - pad, minY = box.min.y - pad;
  const cell = (Math.max(size.x, size.y) + pad * 2) / res;
  const nx = Math.ceil((size.x + pad * 2) / cell) + 1, ny = Math.ceil((size.y + pad * 2) / cell) + 1;
  const mask = new Uint8Array(nx * ny), phi = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = minX + i * cell, y = minY + j * cell, k = j * nx + i;
    if (!inside(pts, x, y)) continue;
    mask[k] = 1;
    const d = distToEdge(pts, x, y); phi[k] = d * d * 0.25;   // warm start (≈ the disk solution near the rim)
  }
  const h2 = cell * cell, omega = 1.9;
  for (let it = 0; it < 320; it++) {               // SOR
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i; if (!mask[k]) continue;
      const g = (phi[k - 1] + phi[k + 1] + phi[k - nx] + phi[k + nx] + h2) * 0.25;
      phi[k] += omega * (g - phi[k]);
    }
  }
  let max = 0; for (let k = 0; k < phi.length; k++) if (phi[k] > max) max = phi[k];
  const sample = (x, y) => {
    const fx = (x - minX) / cell, fy = (y - minY) / cell;
    const i = Math.floor(fx), j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return 0;
    const tx = fx - i, ty = fy - j, k = j * nx + i;
    const v = phi[k] * (1 - tx) * (1 - ty) + phi[k + 1] * tx * (1 - ty) + phi[k + nx] * (1 - tx) * ty + phi[k + nx + 1] * tx * ty;
    return v / max;
  };
  return { sample, cell };
}

/**
 * Inflate a closed outline into a soft, closed cushion.
 * Returns { geometry, heightAt(x,y), normalAt(x,y) } so the face can sit exactly on the surface.
 */
function inflate(rawPts, { soften: soft = 1.5, puff = 0.8, back = 0.55, round = 0.8, n = 280, rings = 40, res = 120, field: kind = "poisson", exact = false } = {}) {
  let pts = exact ? rawPts.map((p) => p.clone()) : soften(resample(rawPts, n), soft);
  if (exact) n = pts.length;
  if (signedArea(pts) < 0) pts.reverse(); // CCW, so triangle winding faces outward
  const c = pole(pts), D = c.d;
  const H = D * puff;

  // height in [0,1]: √φ for the body (balloon); a rounded distance profile for tiny face parts
  let raw;
  if (kind === "poisson") {
    const F = poissonField(pts, res);
    // near the rim the grid is coarse, so blend to the analytic edge behaviour (√distance) there
    raw = (x, y) => {
      const d = distToEdge(pts, x, y);
      const edge = Math.min(d / (F.cell * 2.5), 1);
      const phiN = F.sample(x, y);
      const nearRim = Math.sqrt(Math.max(0, d / D)) * 0.9;
      return Math.pow(Math.max(0, lerp(Math.min(nearRim, Math.sqrt(phiN)), Math.sqrt(phiN), edge)), round);
    };
  } else {
    raw = (x, y) => { const s = Math.min(distToEdge(pts, x, y) / (D * round), 1); return Math.sqrt(Math.max(0, 1 - (1 - s) * (1 - s))); };
  }
  const tAt = (k) => Math.sin((k / rings) * Math.PI / 2); // denser rings near the rim

  const pos = [];
  const idx = (k, i) => (k === 0 ? 0 : 1 + (k - 1) * n + i);
  const front = [];
  for (let k = 0; k <= rings; k++) {
    const t = tAt(k);
    if (k === 0) { const z = raw(c.x, c.y) * H; front.push(z); pos.push(c.x, c.y, z); continue; }
    for (let i = 0; i < n; i++) {
      const x = c.x + (pts[i].x - c.x) * t, y = c.y + (pts[i].y - c.y) * t;
      const z = k === rings ? 0 : raw(x, y) * H;
      front.push(z); pos.push(x, y, z);
    }
  }
  const backStart = pos.length / 3;
  const bidx = (k, i) => (k === rings ? idx(rings, i) : k === 0 ? backStart + (rings - 1) * n : backStart + (k - 1) * n + i);
  for (let k = 1; k < rings; k++) for (let i = 0; i < n; i++) {
    const v = idx(k, i);
    pos.push(pos[v * 3], pos[v * 3 + 1], -front[v] * back);
  }
  pos.push(c.x, c.y, -front[0] * back);

  const index = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    index.push(idx(0, 0), idx(1, i), idx(1, j));
    index.push(bidx(0, 0), bidx(1, j), bidx(1, i));
    for (let k = 1; k < rings; k++) {
      const a = idx(k, i), b = idx(k, j), c2 = idx(k + 1, i), d2 = idx(k + 1, j);
      index.push(a, c2, d2, a, d2, b);
      const ba = bidx(k, i), bb = bidx(k, j), bc = bidx(k + 1, i), bd = bidx(k + 1, j);
      index.push(ba, bd, bc, ba, bb, bd);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const heightAt = (x, y) => (inside(pts, x, y) ? raw(x, y) * H : 0);
  const normalAt = (x, y) => {
    const e = D * 0.04;
    const dzdx = (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e);
    const dzdy = (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e);
    return new THREE.Vector3(-dzdx, -dzdy, 1).normalize();
  };
  return { geometry, heightAt, normalAt, outline: pts, inscribed: D, height: H };
}

function paintGradient(geo, [topHex, bottomHex]) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const top = new THREE.Color(topHex), bottom = new THREE.Color(bottomHex), c = new THREE.Color();
  const pos = geo.getAttribute("position"), colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((max.y - pos.getY(i)) / (max.y - min.y), 0, 1);
    c.copy(top).lerp(bottom, THREE.MathUtils.smoothstep(t, 0.02, 1.05)); // gentle, banding-free ramp
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/* ---------- materials: one soft-jelly family ---------- */
function jellyMaterial(bounds) {
  const uniforms = { uTime: { value: 0 }, uJiggle: { value: 0 }, uMinY: { value: bounds.min }, uSpanY: { value: bounds.span } };
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true, color: 0xffffff,
    roughness: 0.6, metalness: 0,
    clearcoat: 0.16, clearcoatRoughness: 0.62,       // broad satin highlight, never wet plastic
    sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xf6f0ff),
    envMapIntensity: 0.55,
    dithering: true,                                   // kills 8-bit gradient banding
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uJiggle; uniform float uMinY; uniform float uSpanY;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        // jelly wobble: anchored at the base, strongest at the top, fades out after a poke
        float hN = clamp((position.y - uMinY) / uSpanY, 0.0, 1.0);
        float w = uJiggle * uSpanY * 0.045 * hN * hN;
        transformed.x += sin(uTime * 11.0 + position.y * 0.09) * w;
        transformed.z += cos(uTime * 8.5 + position.x * 0.07) * w * 0.6;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        // faux subsurface: the body's own colour glows softly, more at grazing angles (light through thin edges)
        float facing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float rim = pow(1.0 - facing, 2.2);
        totalEmissiveRadiance += vColor.rgb * (0.08 + 0.28 * rim);`);
  };
  m.userData.uniforms = uniforms;
  m.userData.bounds = bounds;
  return m;
}
const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xfbfafc, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25, dithering: true });
const inkMat = new THREE.MeshPhysicalMaterial({ color: 0x1f2329, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12, dithering: true });

/* Soft floating shadow as a sprite — art-directed, cheap, consistent. */
let shadowTex;
function shadowSprite() {
  if (!shadowTex) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(64,73,111,0.30)"); g.addColorStop(0.45, "rgba(64,73,111,0.13)"); g.addColorStop(1, "rgba(64,73,111,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    shadowTex = new THREE.CanvasTexture(c); shadowTex.colorSpace = THREE.SRGBColorSpace;
  }
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 1 }));
}

/** Place a small inflated face part on the body surface, tilted to the local normal. */
function facePart(group, body, rawPts, mat, { puff, lift }) {
  const part = inflate(rawPts, { soften: 0.4, puff, back: 0.15, round: 0.9, n: 96, rings: 14, field: "distance" });
  const box = new THREE.Box2().setFromPoints(part.outline), c = box.getCenter(new THREE.Vector2());
  part.geometry.translate(-c.x, -c.y, 0);
  const mesh = new THREE.Mesh(part.geometry, mat);
  const nrm = body.normalAt(c.x, c.y);
  mesh.position.set(c.x, c.y, body.heightAt(c.x, c.y) + lift);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
  group.add(mesh);
  return { mesh, top: part.height };
}

/** Build one character: a Group normalised to height 1, centred at origin. Geometry is cached per id. */
const built = {};
function buildCharacter(id) {
  if (built[id]) {                                  // reuse geometry; give the copy its own material (own jiggle)
    const g = built[id].clone(true);
    const body = g.children[0], src = built[id].children[0];
    body.material = jellyMaterial(src.material.userData.bounds);
    g.userData = { ...built[id].userData, uniforms: body.material.userData.uniforms };
    return g;
  }
  built[id] = buildFresh(id);
  return buildCharacter(id);
}
function buildFresh(id) {
  const spec = CHARACTERS[id];
  const parts = classify(loader.parse(spec.svg).paths);
  const silhouette = outlines(parts.body[0]).sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0];
  const body = inflate(silhouette, spec);
  paintGradient(body.geometry, spec.grad);
  body.geometry.computeBoundingBox();
  const bb = body.geometry.boundingBox;
  const mat = jellyMaterial({ min: bb.min.y, span: bb.max.y - bb.min.y });
  const bodyMesh = new THREE.Mesh(body.geometry, mat);
  bodyMesh.name = "body";

  const group = new THREE.Group();
  group.add(bodyMesh);

  // face: whites sit on the skin, pupils sit on the whites, mouths sit on the skin
  const whiteTops = [];
  for (const p of parts.whites) for (const o of outlines(p)) whiteTops.push({ pts: o, ...facePart(group, body, o, whiteMat, { puff: 0.35, lift: -0.05 }) });
  for (const p of parts.pupils) for (const o of outlines(p)) {
    const box = new THREE.Box2().setFromPoints(o), ctr = box.getCenter(new THREE.Vector2());
    const onWhite = whiteTops.find((w) => inside(w.pts, ctr.x, ctr.y));
    facePart(group, body, o, inkMat, { puff: 0.45, lift: onWhite ? onWhite.top * 0.85 : 0.1 });
  }
  for (const p of parts.mouths) for (const o of outlines(p)) facePart(group, body, o, inkMat, { puff: 0.4, lift: 0.0 });
  for (const p of parts.strokes) {
    const sw = p.userData.style.strokeWidth || 0.5;
    for (const sp of p.subPaths) {
      const pts = sp.getPoints(24).map((v) => new THREE.Vector3(v.x, -v.y, body.heightAt(v.x, -v.y) + 0.15));
      if (pts.length < 2) continue;
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, Math.max(0.36, sw * 0.8), 10, false);
      group.add(new THREE.Mesh(g, inkMat));
    }
  }

  // centre + normalise
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  group.children.forEach((ch) => ch.position.sub(centre));
  const s = 1 / size.y;
  group.scale.setScalar(s);
  group.userData = { id, name: spec.name, role: spec.role, aspect: size.x / size.y, unit: s, uniforms: mat.userData.uniforms };
  return group;
}

/* ---------- soft studio lighting ---------- */
function rig(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xfff6ee, 1.3); key.position.set(-9, 12, 11);   // big soft key
  const fill = new THREE.DirectionalLight(0xeef1ff, 0.5); fill.position.set(10, 2, 10);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 0.7); rim.position.set(4, 8, -10);     // gentle cool rim
  const hemi = new THREE.HemisphereLight(0xf4f6ff, 0xf2dce8, 0.8);                      // dreamy ambient
  scene.add(key, fill, rim, hemi);
}

/* ---------- hero scene ---------- */
/* domPicking: the page puts real buttons over the characters (hover, focus, click, keyboard) and drives
   hover()/react() itself; the canvas only draws. pointerTarget feeds the gentle parallax. */
export function mountHero({ canvas, labelEl, onHover, autoStart = true, domPicking = false, pointerTarget = null }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 400);
  camera.position.set(0, 0, 60);
  rig(scene, renderer);

  const world = new THREE.Group();
  scene.add(world);

  const chars = {};
  const pickables = [];
  for (const id of Object.keys(LAYOUT)) {
    const L = { ...LAYOUT[id], pos: [...LAYOUT[id].pos], rot: [...LAYOUT[id].rot] };
    const g = buildCharacter(id);
    const holder = new THREE.Group(); // holder = placement; g = scale / squash
    holder.position.set(...L.pos);
    holder.rotation.set(...L.rot);
    g.scale.multiplyScalar(L.height);
    holder.add(g);
    const sh = shadowSprite();
    sh.position.set(0.3, -L.height * 0.64, -1.2);
    holder.add(sh);
    world.add(holder);
    chars[id] = {
      id, holder, group: g, shadow: sh, L, height: L.height,
      squash: 0, squashV: 0, lift: 0, liftV: 0, spin: 0, spinV: 0, jiggle: 0, hover: 0, lean: 0,
    };
    g.traverse((o) => { if (o.isMesh) { o.userData.charId = id; pickables.push(o); } });
  }

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  const target = { rx: 0, ry: 0, px: 0, py: 0 };
  let hovered = null, running = false, raf = 0, t0 = performance.now(), last = t0;
  const motion = !reduced();

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth, h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const toScreen = (obj) => {
    const v = new THREE.Vector3(); obj.getWorldPosition(v); v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight };
  };
  /** Label above the character; flips below when it would collide with the navigation. */
  const placeLabel = (c, p) => {
    const half = c.height * 0.5 * (canvas.clientHeight / 34.4);
    const above = p.y - half - 18, below = above < 110;
    labelEl.classList.toggle("is-below", below);
    labelEl.style.left = `${p.x}px`;
    labelEl.style.top = `${below ? p.y + half + 14 : above}px`;
  };
  const setHover = (id) => {
    if (hovered === id) return;
    hovered = id;
    canvas.style.cursor = id ? "pointer" : "";
    if (labelEl) {
      if (id) { labelEl.textContent = `${CHARACTERS[id].name} · ${CHARACTERS[id].role}`; placeLabel(chars[id], toScreen(chars[id].holder)); labelEl.hidden = false; }
      else labelEl.hidden = true;
    }
    if (id && motion) { const c = chars[id]; c.squashV += 0.9; c.jiggle = Math.max(c.jiggle, 0.35); } // a soft "boop" on arrival
    onHover && onHover(id);
  };

  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.charId : null;
  };
  if (!domPicking) {
    canvas.addEventListener("pointermove", (e) => {
      const id = pick(e);
      if (motion) { target.ry = pointer.x * 0.08; target.rx = -pointer.y * 0.05; target.px = pointer.x; target.py = pointer.y; }
      setHover(id);
    });
    canvas.addEventListener("pointerleave", () => { setHover(null); target.rx = target.ry = target.px = target.py = 0; });
    canvas.addEventListener("pointerdown", (e) => { const id = pick(e); if (id) react(id); });
  } else if (pointerTarget) {
    pointerTarget.addEventListener("pointermove", (e) => {
      if (!motion) return;
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      target.ry = x * 0.05; target.rx = -y * 0.03; target.px = x * 0.6; target.py = y * 0.6;
    });
    pointerTarget.addEventListener("pointerleave", () => { target.rx = target.ry = target.px = target.py = 0; });
  }

  /** Place characters from page pixels: { id: { x, y, h } } — centre (x, y) and visible height h, in canvas CSS px.
      Depth (z) stays from the original composition, so overlaps and perspective keep their character. */
  function place(map) {
    const W = canvas.clientWidth || 1, H = canvas.clientHeight || 1, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    for (const id in map) {
      const c = chars[id]; if (!c) continue;
      const { x, y, h } = map[id], z = c.L.pos[2], halfH = (camera.position.z - z) * tan, halfW = halfH * (W / H);
      c.L.pos[0] = (x / W - 0.5) * 2 * halfW;
      c.L.pos[1] = (0.5 - y / H) * 2 * halfH;
      c.height = c.L.height = (h / H) * 2 * halfH;
    }
    if (!running) renderOnce();
  }

  /** Playful reaction: squish down, spring up, wobble while settling. */
  function react(id) {
    const c = chars[id]; if (!c || !motion) return;
    c.squashV = -3.4; c.liftV = 7.5; c.spinV = (Math.random() > 0.5 ? 1 : -1) * 1.6; c.jiggle = 1;
  }
  function celebrate() {
    if (!motion) return;
    Object.values(chars).forEach((c, i) => setTimeout(() => react(c.id), i * 45));
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = (now - t0) / 1000;
    world.rotation.y = lerp(world.rotation.y, target.ry, 0.05);
    world.rotation.x = lerp(world.rotation.x, target.rx, 0.05);
    for (const c of Object.values(chars)) {
      const { L } = c, f = L.float;
      const floatY = motion ? Math.sin(t * f.speed * 2 + f.phase) * f.amp : 0;
      const floatR = motion ? Math.sin(t * f.speed * 1.3 + f.phase) * 0.03 : 0;
      const breathe = motion ? Math.sin(t * L.breath * 2 + f.phase) * 0.012 : 0;
      // under-damped springs → elastic, jelly-like settling
      c.squashV += (-48 * c.squash - 4.2 * c.squashV) * dt; c.squash += c.squashV * dt;
      c.liftV += (-38 * c.lift - 5.5 * c.liftV) * dt; c.lift += c.liftV * dt;
      c.spinV += (-30 * c.spin - 5 * c.spinV) * dt; c.spin += c.spinV * dt;
      c.jiggle *= Math.exp(-dt * 2.6);
      c.hover = lerp(c.hover, hovered === c.id && motion ? 1 : 0, 0.1);
      c.lean = lerp(c.lean, hovered === c.id && motion ? target.px - (toScreenX(c) - 0.5) * 2 : 0, 0.08);

      const depthK = (c.holder.position.z + 12) / 20;
      const px = target.px * 0.8 * depthK, py = target.py * 0.45 * depthK;
      c.holder.position.x = L.pos[0] + px;
      c.holder.position.y = L.pos[1] + floatY + c.lift * 0.4 + py + c.hover * 0.45;
      c.holder.rotation.z = L.rot[2] + floatR + c.spin * 0.1 - c.lean * 0.06;
      c.holder.rotation.y = L.rot[1] + c.hover * 0.1 + target.px * 0.07;
      c.holder.rotation.x = L.rot[0] - c.hover * 0.05;

      // volume-preserving squash & stretch
      const sq = THREE.MathUtils.clamp(c.squash * 0.09 + breathe - c.hover * 0.018, -0.22, 0.22);
      const s = c.height * c.group.userData.unit * (1 + c.hover * 0.04);
      const sy = 1 - sq, sxz = 1 / Math.sqrt(sy);
      c.group.scale.set(s * sxz, s * sy, s * sxz);
      c.group.position.y = -(1 - sy) * 0.5; // squash from the base, not the middle

      const u = c.group.userData.uniforms; u.uTime.value = t; u.uJiggle.value = c.jiggle;

      const h = floatY + c.lift * 0.4 + c.hover * 0.45;
      const sf = 1 - THREE.MathUtils.clamp(h / 4, -0.15, 0.35);
      c.shadow.scale.set(c.height * 1.3 * c.group.userData.aspect * sf * sxz, c.height * 0.4 * sf, 1);
      c.shadow.material.opacity = 0.7 + 0.3 * sf;
      c.shadow.position.y = -c.height * 0.64 - h * 0.6;
    }
    if (hovered && labelEl && !labelEl.hidden) placeLabel(chars[hovered], toScreen(chars[hovered].holder));
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  const toScreenX = (c) => toScreen(c.holder).x / (canvas.clientWidth || 1);
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function renderOnce() { const now = performance.now(); last = now - 16; frame(now); }
  if (autoStart) start();

  /* Portraits for the editor: each character rendered alone on transparent, same rig and material. */
  const portraits = {};
  let pr = null; // one shared offscreen renderer → one context, shaders compiled once
  function portrait(id, size = 256) {
    if (portraits[id]) return portraits[id];
    if (!pr) {
      const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r2.setPixelRatio(1); r2.setSize(size, size); r2.setClearColor(0, 0);
      r2.toneMapping = THREE.NeutralToneMapping; r2.outputColorSpace = THREE.SRGBColorSpace;
      const s2 = new THREE.Scene(); rig(s2, r2);
      const cam = new THREE.PerspectiveCamera(26, 1, 1, 100); cam.position.set(0, 0.1, 6);
      pr = { r2, s2, cam };
    }
    const g = buildCharacter(id); g.scale.multiplyScalar(id === "act" ? 2.3 : 2.05);
    g.rotation.set(0.04, id === "min" ? -0.3 : 0.24, 0.03);
    pr.s2.add(g);
    pr.r2.render(pr.s2, pr.cam);
    const url = pr.r2.domElement.toDataURL("image/png");
    pr.s2.remove(g);
    portraits[id] = url;
    return url;
  }

  window.__debug = (id) => (id ? { scale: chars[id].group.scale.toArray(), lift: chars[id].lift, squash: chars[id].squash, jiggle: chars[id].jiggle } : Object.keys(chars));
  return { celebrate, react, start, stop, renderOnce, portrait, resize, place, hover: setHover, characters: CHARACTERS, get hovered() { return hovered; } };
}

/* ==========================================================================
   Living clay — the Playground's starting material (Phase 02)
   Same inflation + jelly material as the crew, so it belongs to their world,
   but no face and no identity. Morphs (same mesh topology) from an organic
   blob into a soft slab: the moment PAI shapes it into an interface.
   ========================================================================== */
function paintClay(geo) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const stops = [new THREE.Color("#EFE3F1"), new THREE.Color("#ABC2E5"), new THREE.Color("#F5BDD2")];
  const pos = geo.getAttribute("position"), colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ty = (max.y - pos.getY(i)) / (max.y - min.y), tx = (pos.getX(i) - min.x) / (max.x - min.x);
    const t = THREE.MathUtils.clamp(ty * 0.78 + tx * 0.22, 0, 1);
    if (t < 0.5) c.copy(stops[0]).lerp(stops[1], THREE.MathUtils.smoothstep(t, 0, 0.5));
    else c.copy(stops[1]).lerp(stops[2], THREE.MathUtils.smoothstep(t, 0.5, 1));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function mountClay({ canvas }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.15, 9);
  rig(scene, renderer);

  const N = 256;
  const blob = [], slab = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 1 + 0.035 * Math.sin(3 * a + 0.6) + 0.018 * Math.sin(5 * a + 1.7) + 0.025 * Math.sin(2 * a + 0.2);
    blob.push(new THREE.Vector2(Math.cos(a) * r * 1.08, Math.sin(a) * r * 0.9));
    const e = 5, ca = Math.abs(Math.cos(a)) / 1.75, sa = Math.abs(Math.sin(a)) / 1.0;
    const rs = Math.pow(Math.pow(ca, e) + Math.pow(sa, e), -1 / e);
    slab.push(new THREE.Vector2(Math.cos(a) * rs, Math.sin(a) * rs));
  }
  const A = inflate(blob, { exact: true, puff: 0.95, back: 0.7, round: 0.9, rings: 36 });
  const B = inflate(slab, { exact: true, puff: 0.32, back: 0.3, round: 0.55, rings: 36 });
  const geo = A.geometry;
  paintClay(geo);
  geo.morphAttributes.position = [B.geometry.getAttribute("position")];
  geo.morphAttributes.normal = [B.geometry.getAttribute("normal")];
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const mat = jellyMaterial({ min: bb.min.y, span: bb.max.y - bb.min.y });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.morphTargetInfluences = [0];
  const holder = new THREE.Group();
  holder.add(mesh);
  holder.scale.setScalar(1.55);
  holder.rotation.set(0.12, -0.18, 0);
  const sh = shadowSprite(); sh.position.set(0, -2.15, -0.6); sh.scale.set(4.4, 0.9, 1);
  scene.add(holder, sh);

  const motion = !reduced();
  let running = false, raf = 0, last = performance.now();
  const t0 = last;
  const st = { squash: 0, squashV: 0, jiggle: 0.25, morph: 0, morphTo: 0, morphStart: 0, morphFrom: 0, morphDur: 650 };

  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const t = (now - t0) / 1000;
    st.squashV += (-46 * st.squash - 4.5 * st.squashV) * dt; st.squash += st.squashV * dt;
    st.jiggle = Math.max(motion ? 0.18 : 0, st.jiggle * Math.exp(-dt * 2.2));
    if (st.morph !== st.morphTo) {
      const k = Math.min(1, (now - st.morphStart) / st.morphDur);
      st.morph = st.morphFrom + (st.morphTo - st.morphFrom) * ease(k);
      if (k >= 1) st.morph = st.morphTo;
    }
    mesh.morphTargetInfluences[0] = st.morph;
    const breathe = motion ? Math.sin(t * 1.7) * 0.018 : 0;
    const sq = THREE.MathUtils.clamp(st.squash * 0.1 + breathe, -0.25, 0.25), sy = 1 - sq, sxz = 1 / Math.sqrt(sy);
    mesh.scale.set(sxz, sy, sxz);
    mesh.position.y = (motion ? Math.sin(t * 0.9) * 0.08 : 0) - (1 - sy) * 0.6;
    holder.rotation.y = -0.18 * (1 - st.morph) + (motion ? Math.sin(t * 0.6) * 0.06 : 0) * (1 - st.morph);
    holder.rotation.x = 0.12 * (1 - st.morph);
    sh.material.opacity = 0.85 - st.morph * 0.4;
    mat.userData.uniforms.uTime.value = t; mat.userData.uniforms.uJiggle.value = st.jiggle * (1 - st.morph * 0.8);
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const renderOnce = () => { const n = performance.now(); last = n - 16; frame(n); };
  /** A poke: squish + wobble. */
  const poke = () => { st.squashV = -3; st.jiggle = 1; if (!running) renderOnce(); };
  /** Blob → slab. Resolves when the morph has finished (immediately with reduced motion). */
  const shape = () => new Promise((resolve) => {
    st.squashV = -2.4; st.jiggle = 0.8;
    st.morphFrom = st.morph; st.morphTo = 1; st.morphStart = performance.now(); st.morphDur = motion ? 650 : 1;
    if (!running) renderOnce();
    setTimeout(resolve, motion ? 660 : 0);
  });
  const reset = () => { st.morph = st.morphTo = st.morphFrom = 0; mesh.morphTargetInfluences[0] = 0; if (!running) renderOnce(); };
  return { start, stop, renderOnce, poke, shape, reset, resize };
}

window.MoldableHero = { mountHero, mountClay, CHARACTERS };
