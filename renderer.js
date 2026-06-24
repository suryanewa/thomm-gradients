import { sampledStudies } from './sampled-recipes.js';

const RATIOS = {
  portrait: { width: 1080, height: 1346 },
  square: { width: 1200, height: 1200 },
  wide: { width: 1600, height: 900 },
};

const PALETTES = {
  aurora: ['#050018', '#1216ff', '#00d9d2', '#89e8ff', '#2f16ff', '#03000e'],
  cyan: ['#02100d', '#00f5e6', '#0aff83', '#04d9cc', '#006a43', '#00130f'],
  ember: ['#170401', '#ff6607', '#ff0a7c', '#ff7791', '#ff340f', '#250200'],
  chroma: ['#030611', '#0aa8ff', '#751cff', '#ff1c62', '#ff5100', '#240200'],
  violet: ['#07000c', '#5b00ff', '#b513ff', '#d982ff', '#8220ff', '#130018'],
  dusk: ['#07000f', '#2612ff', '#d525ff', '#f38fd1', '#e8531d', '#3a0715'],
  glacial: ['#05040e', '#0715ff', '#0e96ff', '#9bdcff', '#0088ff', '#080725'],
};

const PALETTE_OPTIONS = [
  ['aurora', 'Aurora'],
  ['cyan', 'Cyan'],
  ['ember', 'Ember'],
  ['chroma', 'Chroma'],
  ['violet', 'Violet'],
  ['dusk', 'Dusk'],
  ['glacial', 'Glacial'],
];

const ARCHITECTURES = [
  ['aperture', 'Aperture'],
  ['field', 'Field'],
  ['horizon', 'Horizon'],
  ['monolith', 'Monolith'],
];

const BLENDS = [
  ['screen', 'Screen'],
  ['source-over', 'Normal'],
  ['soft-light', 'Soft Light'],
  ['overlay', 'Overlay'],
  ['color-dodge', 'Dodge'],
];

const RECIPE_BY_PALETTE = {
  aurora: 'blue-room',
  cyan: 'cyan-void',
  ember: 'ember-rose',
  chroma: 'chromatic-ember',
  violet: 'violet-well',
  dusk: 'violet-sunset',
  glacial: 'blue-iris',
};

const HARMONY_SCHEMES = {
  aurora: { range: [150, 265], drift: 24, light: 1.02 },
  cyan: { range: [130, 215], drift: 20, light: 1.04 },
  ember: { range: [348, 45], drift: 18, light: 1 },
  chroma: { range: [0, 360], drift: 30, light: 1 },
  violet: { range: [238, 326], drift: 22, light: 0.98 },
  dusk: { range: [286, 35], drift: 26, light: 1.01 },
  glacial: { range: [180, 252], drift: 16, light: 1.08 },
};

const HARMONY_ARCHETYPES = [
  { offsets: [0, 42, 168, 206, 318], name: 'split' },
  { offsets: [0, -34, 28, 132, 186], name: 'aural' },
  { offsets: [0, 72, 148, 218, 286], name: 'triadic' },
  { offsets: [0, 22, 96, 178, 244], name: 'prismatic' },
  { offsets: [0, 116, 184, 232, 330], name: 'tension' },
  { offsets: [0, -52, 54, 196, 260], name: 'thermal' },
];

const INITIAL_SEED = 0.4177;

const state = {
  colors: [],
  ratio: 'portrait',
  paletteMood: 'chroma',
  architecture: 'aperture',
  blendMode: 'screen',
  blur: 50,
  bloom: 48,
  contrast: 122,
  depth: 86,
  core: 48,
  asymmetry: 18,
  grain: 18,
  seed: INITIAL_SEED,
};

const locks = {};
const canvas = document.querySelector('#gradient-canvas');
const wrapper = document.querySelector('.canvas-wrapper');
const previewWrapper = document.querySelector('.preview-content-wrapper');
const colorList = document.querySelector('#color-list');
const addColorButton = document.querySelector('#add-color');

function hashSeed(value) {
  const text = String(value ?? 'hiro');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed) {
  let stateValue = hashSeed(seed);
  return () => {
    stateValue += 0x6d2b79f5;
    let value = stateValue;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)] ?? list[0];
}

function studyById(id) {
  return sampledStudies.find((study) => study.id === id) ?? sampledStudies[0];
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function wrapHue(hue) {
  return ((hue % 360) + 360) % 360;
}

function hslToHex(hue, saturation, lightness) {
  const h = wrapHue(hue) / 360;
  const s = clamp(saturation, 0, 1);
  const l = clamp(lightness, 0, 1);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToRgb = (t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return rgbToHex([hueToRgb(h + 1 / 3), hueToRgb(h), hueToRgb(h - 1 / 3)].map((channel) => channel * 255));
}

function hueInRange(range, random) {
  const [start, end] = range;
  const span = end >= start ? end - start : end + 360 - start;
  return wrapHue(start + random() * span);
}

function jitterHue(hue, drift, random) {
  return wrapHue(hue + (random() - 0.5) * drift * 2);
}

function generatedPalette(mood, seed) {
  const scheme = HARMONY_SCHEMES[mood] ?? HARMONY_SCHEMES.chroma;
  const random = randomFrom(`palette:${mood}:${seed}`);
  const root = hueInRange(scheme.range, random);
  const archetype = pick(random, HARMONY_ARCHETYPES);
  const variance = (0.88 + random() * 0.22) * scheme.light;
  const hue = (index) => jitterHue(root + archetype.offsets[index], scheme.drift, random);
  const rimHue = hue(0);
  const bodyHue = hue(1);
  const lowerHue = hue(2);
  const accentHue = hue(3);
  const coreHue = hue(4);
  const heat = random();

  return [
    hslToHex(coreHue, 0.72 + random() * 0.2, 0.025 + random() * 0.02),
    hslToHex(rimHue, 0.82 + random() * 0.18, clamp((0.44 + heat * 0.14) * variance, 0.35, 0.62)),
    hslToHex(bodyHue, 0.78 + random() * 0.2, clamp((0.43 + random() * 0.18) * variance, 0.34, 0.68)),
    hslToHex(lowerHue, 0.72 + random() * 0.24, clamp((0.58 + random() * 0.18) * variance, 0.48, 0.82)),
    hslToHex(accentHue, 0.88 + random() * 0.12, clamp((0.46 + random() * 0.18) * variance, 0.38, 0.7)),
    hslToHex(coreHue, 0.72 + random() * 0.18, 0.018 + random() * 0.026),
  ];
}

function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

function shiftColor(hex, amount) {
  return mix(hex, amount > 0 ? '#ffffff' : '#000000', Math.abs(amount));
}

function mixRgb(a, b, t) {
  const amount = clamp(t, 0, 1);
  return a.map((value, index) => value + (b[index] - value) * amount);
}

function rgbCss(rgb) {
  return `rgb(${rgb.map((value) => clamp(Math.round(value), 0, 255)).join(' ')})`;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian(value, center, width) {
  const distance = (value - center) / width;
  return Math.exp(-distance * distance * 0.5);
}

function noise2(random, x, y) {
  const n = Math.sin((x * 127.1 + y * 311.7 + random() * 13.7) * 43758.5453);
  return n - Math.floor(n);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function archPath(ctx, x, y, width, height) {
  const shoulder = width * 0.2;
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + height * 0.43);
  ctx.bezierCurveTo(x + shoulder, y, x + width - shoulder, y, x + width, y + height * 0.43);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
}

function paint(ctx, layer, width, height, baseBlur) {
  const x = width * layer.x;
  const y = height * layer.y;
  const w = width * layer.w;
  const h = height * layer.h;

  ctx.save();
  ctx.filter = layer.blur ? `blur(${baseBlur * layer.blur}px)` : 'none';
  ctx.globalAlpha = layer.alpha ?? 1;
  ctx.globalCompositeOperation = layer.blend ?? state.blendMode;
  ctx.fillStyle = layer.color;

  if (layer.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (layer.type === 'arch') {
    archPath(ctx, x, y, w, h);
  } else if (layer.type === 'rect') {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  } else {
    roundedRect(ctx, x, y, w, h, width * (layer.r ?? 0.08));
  }

  ctx.fill();
  ctx.restore();
}

function buildLayers(width, height) {
  const random = randomFrom(state.seed);
  const colors = state.colors.length >= 2 ? state.colors : PALETTES.ember;
  const baseBlur = Math.max(width, height) * (0.035 + state.blur / 1200);
  const depth = state.depth / 100;
  const coreScale = 0.14 + state.core / 400;
  const asym = (state.asymmetry / 100) * 0.08;
  const xShift = (random() - 0.5) * asym;
  const yShift = (random() - 0.5) * asym;
  const [base, rim, body, lower, accent = rim, dark = base] = colors;
  const layers = [
    { type: 'round', x: 0.035, y: 0.03, w: 0.93, h: 0.94, r: 0.065, color: rim, blur: 0.72, alpha: 0.95, blend: 'screen' },
    { type: 'round', x: 0.08, y: 0.08, w: 0.84, h: 0.8, r: 0.075, color: body, blur: 1.45, alpha: 0.72 + depth * 0.22, blend: state.blendMode },
    { type: 'round', x: 0.16, y: 0.62, w: 0.68, h: 0.24, r: 0.07, color: lower, blur: 1.05, alpha: 0.54 + depth * 0.28, blend: 'screen' },
    { type: 'round', x: 0.16, y: 0.13, w: 0.68, h: 0.22, r: 0.06, color: shiftColor(dark, -0.18), blur: 1.0, alpha: 0.52 + depth * 0.28, blend: 'multiply' },
  ];

  if (state.architecture === 'aperture' || state.architecture === 'monolith') {
    layers.push(
      { type: 'arch', x: 0.2 + xShift, y: 0.24 + yShift, w: 0.6, h: 0.58, color: accent, blur: 1.15, alpha: 0.42 + depth * 0.25, blend: 'screen' },
      { type: 'round', x: 0.5 - coreScale / 2 + xShift, y: 0.5 - coreScale * 0.66 + yShift, w: coreScale, h: coreScale * 1.28, r: 0.09, color: dark, blur: 0.68, alpha: 0.9, blend: 'multiply' },
      { type: 'round', x: 0.5 - coreScale / 2.25 + xShift, y: 0.5 - coreScale * 0.44 + yShift, w: coreScale / 1.12, h: coreScale * 0.88, r: 0.08, color: shiftColor(accent, 0.08), blur: 0.55, alpha: 0.22, blend: 'screen' },
    );
  }

  if (state.architecture === 'field') {
    layers.push(
      { type: 'ellipse', x: 0.18 + xShift, y: 0.22 + yShift, w: 0.64, h: 0.52, color: accent, blur: 1.45, alpha: 0.42, blend: 'screen' },
      { type: 'round', x: 0.2 - xShift, y: 0.48 + yShift, w: 0.6, h: 0.24, r: 0.08, color: dark, blur: 1.1, alpha: 0.5, blend: 'multiply' },
    );
  }

  if (state.architecture === 'horizon') {
    layers.push(
      { type: 'rect', x: 0.08, y: 0.37 + yShift, w: 0.84, h: 0.2, color: shiftColor(body, 0.2), blur: 1.3, alpha: 0.62, blend: 'screen' },
      { type: 'round', x: 0.1, y: 0.12, w: 0.8, h: 0.28, r: 0.06, color: dark, blur: 0.95, alpha: 0.7, blend: 'multiply' },
      { type: 'round', x: 0.2, y: 0.62, w: 0.6, h: 0.16, r: 0.05, color: accent, blur: 0.7, alpha: 0.35, blend: 'screen' },
    );
  }

  if (state.architecture === 'diptych') {
    const leftColors = [rim, body, dark];
    const rightColors = [body, lower, dark];
    layers.length = 0;
    layers.push(
      { type: 'round', x: 0.16, y: 0.22, w: 0.31, h: 0.58, r: 0.035, color: leftColors[0], blur: 0.7, alpha: 0.96, blend: 'screen' },
      { type: 'round', x: 0.19, y: 0.26, w: 0.25, h: 0.49, r: 0.04, color: leftColors[1], blur: 1.0, alpha: 0.78, blend: 'screen' },
      { type: 'round', x: 0.28, y: 0.41, w: 0.08, h: 0.19, r: 0.035, color: leftColors[2], blur: 0.5, alpha: 0.92, blend: 'multiply' },
      { type: 'round', x: 0.53, y: 0.22, w: 0.31, h: 0.58, r: 0.035, color: rightColors[0], blur: 0.7, alpha: 0.96, blend: 'screen' },
      { type: 'round', x: 0.56, y: 0.26, w: 0.25, h: 0.49, r: 0.04, color: rightColors[1], blur: 1.0, alpha: 0.78, blend: 'screen' },
      { type: 'round', x: 0.65, y: 0.41, w: 0.08, h: 0.19, r: 0.035, color: rightColors[2], blur: 0.5, alpha: 0.92, blend: 'multiply' },
    );
  }

  const accents = Math.round(3 + depth * 8);
  for (let i = 0; i < accents; i++) {
    layers.push({
      type: random() > 0.5 ? 'round' : 'rect',
      x: 0.08 + random() * 0.72,
      y: 0.1 + random() * 0.72,
      w: 0.08 + random() * 0.28,
      h: 0.06 + random() * 0.24,
      r: 0.04 + random() * 0.05,
      color: pick(random, colors),
      blur: 0.8 + random() * 1.2,
      alpha: 0.08 + random() * 0.2,
      blend: random() > 0.45 ? 'screen' : 'soft-light',
    });
  }

  return { layers, base, baseBlur };
}

function panelColorAt(u, v, random, palette, variant = 0) {
  const baseHex = palette[0] ?? '#020202';
  const rimHex = palette[1] ?? '#0aa8ff';
  const bodyHex = palette[2] ?? rimHex;
  const lowerHex = palette[3] ?? bodyHex;
  const accentHex = palette[4] ?? rimHex;
  const darkHex = palette[palette.length - 1] ?? '#030303';
  const base = hexToRgb(baseHex);
  const rim = hexToRgb(rimHex);
  const body = hexToRgb(bodyHex);
  const lower = hexToRgb(lowerHex);
  const dark = hexToRgb(darkHex);
  const accent = hexToRgb(accentHex);
  const depth = state.depth / 100;
  const aperture = state.core / 100;
  const asym = state.asymmetry / 100;
  const cx = 0.5 + (variant ? 0.018 : -0.012) * asym;
  const cy = state.architecture === 'horizon'
    ? 0.28 + 0.04 * asym
    : 0.5 + (variant ? -0.01 : 0.012) * asym;
  const coreW = 0.2 + aperture * 0.24;
  const coreH = state.architecture === 'horizon' ? 0.18 + aperture * 0.14 : 0.34 + aperture * 0.28;
  const edge = Math.min(u, 1 - u, v, 1 - v);
  const rimGlow = smoothstep(0.28, 0.04, edge);
  const innerField = smoothstep(0.04, 0.34, edge) * smoothstep(0.98, 0.72, v);
  const bottomShelf = gaussian(v, 0.78, 0.12) * smoothstep(0.08, 0.26, u) * smoothstep(0.92, 0.74, u);
  const topCap = gaussian(v, 0.16, 0.12) * smoothstep(0.08, 0.26, u) * smoothstep(0.92, 0.74, u);
  const arch = gaussian(Math.abs(u - cx), 0, 0.28) * gaussian(v, 0.52, 0.32);
  const rectDistance = Math.max(Math.abs((u - cx) / coreW), Math.abs((v - cy) / coreH));
  const halo = smoothstep(1.55, 0.7, rectDistance);
  const core = smoothstep(1.02, 0.48, rectDistance);
  const sideLeft = gaussian(u, 0.18, 0.07) * gaussian(v, 0.48, 0.24);
  const sideRight = gaussian(u, 0.82, 0.07) * gaussian(v, 0.48, 0.24);
  const localNoise = (noise2(random, u * 31, v * 37) - 0.5) * 0.07;

  let color = base;
  color = mixRgb(color, rim, rimGlow * (0.72 + depth * 0.22));
  color = mixRgb(color, body, innerField * (0.54 + depth * 0.28));
  color = mixRgb(color, lower, bottomShelf * (0.5 + depth * 0.32));
  color = mixRgb(color, dark, topCap * (0.45 + depth * 0.34));

  if (state.architecture !== 'field') {
    color = mixRgb(color, accent, arch * (0.2 + depth * 0.3));
    color = mixRgb(color, accent, halo * (0.26 + depth * 0.24));
    color = mixRgb(color, dark, core * (0.92 + depth * 0.08));
  }

  if (state.architecture === 'field') {
    const bloom = gaussian(u, 0.52, 0.28) * gaussian(v, 0.48, 0.26);
    color = mixRgb(color, accent, bloom * 0.42);
    color = mixRgb(color, dark, gaussian(v, 0.22, 0.16) * 0.34);
  }

  if (state.architecture === 'horizon') {
    color = mixRgb(color, dark, gaussian(v, 0.2, 0.13) * 0.64);
    color = mixRgb(color, lower, gaussian(v, 0.62, 0.12) * 0.44);
  }

  color = mixRgb(color, rim, (sideLeft + sideRight) * (0.08 + asym * 0.16));
  return color.map((channel) => channel * (1 + localNoise));
}

function recipeForState() {
  if (state.architecture === 'horizon') return studyById('blue-room');
  if (state.architecture === 'monolith') return studyById(state.paletteMood === 'ember' ? 'chromatic-ember' : RECIPE_BY_PALETTE[state.paletteMood]);
  if (state.architecture === 'field' && state.paletteMood === 'chroma') return studyById('violet-sunset');
  return studyById(RECIPE_BY_PALETTE[state.paletteMood] ?? 'ember-rose');
}

function architectureProfile() {
  const profiles = {
    aperture: { cx: 0.5, cy: 0.5, coreW: 0.24, coreH: 0.36, corePower: 0.72, haloPower: 0.38, topPower: 0.42, bottomPower: 0.52 },
    field: { cx: 0.52, cy: 0.48, coreW: 0.36, coreH: 0.3, corePower: 0.28, haloPower: 0.5, topPower: 0.24, bottomPower: 0.6 },
    horizon: { cx: 0.5, cy: 0.3, coreW: 0.48, coreH: 0.16, corePower: 0.5, haloPower: 0.32, topPower: 0.78, bottomPower: 0.26 },
    monolith: { cx: 0.5, cy: 0.52, coreW: 0.18, coreH: 0.52, corePower: 0.62, haloPower: 0.28, topPower: 0.46, bottomPower: 0.34 },
  };
  return profiles[state.architecture] ?? profiles.aperture;
}

function blendTuning() {
  const tunings = {
    screen: { alpha: 0.22, saturation: 1.3, contrast: 1.02, operation: 'screen' },
    'source-over': { alpha: 0.16, saturation: 1.05, contrast: 0.98, operation: 'source-over' },
    'soft-light': { alpha: 0.2, saturation: 1.16, contrast: 1.08, operation: 'soft-light' },
    overlay: { alpha: 0.18, saturation: 1.22, contrast: 1.14, operation: 'overlay' },
    'color-dodge': { alpha: 0.1, saturation: 1.28, contrast: 1.04, operation: 'color-dodge' },
  };
  return tunings[state.blendMode] ?? tunings.screen;
}

function tintRecipeColor(hex, u, v) {
  const palette = state.colors.length >= 5 ? state.colors : PALETTES[state.paletteMood];
  const [, rim, body, lower, accent = body, dark = palette[0]] = palette;
  const rimRgb = hexToRgb(rim);
  const bodyRgb = hexToRgb(body);
  const lowerRgb = hexToRgb(lower);
  const accentRgb = hexToRgb(accent);
  const darkRgb = hexToRgb(dark);
  const profile = architectureProfile();
  const depth = state.depth / 100;
  const aperture = state.core / 100;
  const asymmetry = state.asymmetry / 100;
  const warpedU = clamp(u + (v - 0.5) * asymmetry * 0.1, 0, 1);
  const warpedV = clamp(v + Math.sin(u * Math.PI) * (asymmetry - 0.5) * 0.045, 0, 1);
  const centerX = profile.cx + (asymmetry - 0.5) * 0.12;
  const centerY = profile.cy + (0.5 - asymmetry) * 0.04;
  const coreW = profile.coreW * (0.72 + aperture * 0.74);
  const coreH = profile.coreH * (0.72 + aperture * 0.74);
  const rgb = hexToRgb(hex);
  const luminance = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 255;
  const sourceColorfulness = (Math.max(...rgb) - Math.min(...rgb)) / 255;
  const bottom = smoothstep(0.52, 0.9, warpedV) * profile.bottomPower;
  const top = smoothstep(0.42, 0.04, warpedV) * profile.topPower;
  const center = gaussian(warpedU, centerX, coreW * 1.25) * gaussian(warpedV, centerY, coreH * 1.08);
  const coreDistance = Math.max(Math.abs((warpedU - centerX) / coreW), Math.abs((warpedV - centerY) / coreH));
  const core = smoothstep(1.06, 0.42, coreDistance) * profile.corePower;
  const halo = smoothstep(1.8, 0.84, coreDistance) * profile.haloPower;
  let target = rim;

  if (luminance < 0.12) target = dark;
  else if (bottom > 0.58) target = lower;
  else if (center > 0.56) target = accent;
  else if (top > 0.52) target = mix(body, dark, 0.42);
  else target = body;

  const targetRgb = hexToRgb(target);
  const tonal = mixRgb(
    mixRgb(darkRgb, targetRgb, smoothstep(0.06, 0.62, luminance)),
    lowerRgb,
    bottom * smoothstep(0.18, 0.78, luminance) * 0.42,
  );
  let result = mixRgb(rgb, tonal, 0.72 + depth * 0.18);
  result = mixRgb(result, rimRgb, smoothstep(0.78, 0.28, Math.min(warpedU, 1 - warpedU, warpedV, 1 - warpedV)) * 0.28);
  result = mixRgb(result, bodyRgb, (1 - sourceColorfulness) * 0.18);
  result = mixRgb(result, accentRgb, halo * (0.2 + depth * 0.2));
  result = mixRgb(result, darkRgb, core * (0.45 + aperture * 0.42));
  return result;
}

function createRecipeField() {
  const recipe = recipeForState();
  const field = document.createElement('canvas');
  field.width = recipe.cols;
  field.height = recipe.rows;
  const ctx = field.getContext('2d');

  recipe.colors.forEach((color, index) => {
    const x = index % recipe.cols;
    const y = Math.floor(index / recipe.cols);
    const u = (x + 0.5) / recipe.cols;
    const v = (y + 0.5) / recipe.rows;
    ctx.fillStyle = rgbCss(tintRecipeColor(color, u, v));
    ctx.fillRect(x, y, 1, 1);
  });

  return field;
}

function createProceduralField(width, height) {
  const cols = state.architecture === 'diptych' ? 32 : 24;
  const rows = state.ratio === 'wide' ? 20 : 32;
  const field = document.createElement('canvas');
  field.width = cols;
  field.height = rows;
  const ctx = field.getContext('2d');
  const random = randomFrom(`${state.seed}:field`);
  const palette = state.colors.length >= 5 ? state.colors : PALETTES[state.paletteMood];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const u = (col + 0.5) / cols;
      const v = (row + 0.5) / rows;
      let color;

      if (state.architecture === 'diptych') {
        const inLeft = u > 0.16 && u < 0.48 && v > 0.23 && v < 0.78;
        const inRight = u > 0.52 && u < 0.84 && v > 0.23 && v < 0.78;
        if (!inLeft && !inRight) {
          color = hexToRgb(palette[0]);
        } else {
          const localU = inLeft ? (u - 0.16) / 0.32 : (u - 0.52) / 0.32;
          const localV = (v - 0.23) / 0.55;
          const shifted = inLeft
            ? [palette[0], palette[1], palette[2], palette[3], palette[4], palette[palette.length - 1]]
            : [palette[0], palette[2], palette[3], palette[1], palette[4], palette[palette.length - 1]];
          color = panelColorAt(localU, localV, random, shifted, inRight ? 1 : 0);
        }
      } else {
        color = panelColorAt(u, v, random, palette);
      }

      ctx.fillStyle = rgbCss(color);
      ctx.fillRect(col, row, 1, 1);
    }
  }

  return field;
}

function renderGradient() {
  const ratio = RATIOS[state.ratio];
  canvas.width = ratio.width;
  canvas.height = ratio.height;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const baseBlur = Math.max(width, height) * (0.012 + state.blur / 3200);
  const base = state.colors[0] ?? '#020202';
  const recipeField = createRecipeField();
  const blend = blendTuning();
  const asymmetry = state.asymmetry / 100;
  const skewX = (asymmetry - 0.5) * width * 0.028;
  const skewY = (0.5 - asymmetry) * height * 0.014;
  const apertureScale = 1 + (state.core - 50) / 2600;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.filter = `blur(${baseBlur}px) saturate(${1.08 + state.bloom / 520}) contrast(${state.contrast / 100})`;
  ctx.drawImage(recipeField, skewX, skewY, width * apertureScale, height / apertureScale);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = blend.alpha + state.bloom / 780;
  ctx.globalCompositeOperation = blend.operation;
  ctx.filter = `blur(${baseBlur * 0.52}px) saturate(${blend.saturation}) contrast(${blend.contrast})`;
  ctx.drawImage(recipeField, -skewX * 0.65, -skewY * 0.35, width / apertureScale, height * apertureScale);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.filter = `blur(${baseBlur * 0.18}px) contrast(1.18)`;
  ctx.drawImage(recipeField, 0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08 + state.depth / 1400;
  ctx.globalCompositeOperation = 'overlay';
  ctx.filter = `blur(${baseBlur * 1.7}px) saturate(1.08)`;
  ctx.drawImage(recipeField, width * -0.018 + skewX * 0.5, height * 0.012, width * 1.036, height * 0.976);
  ctx.restore();

  finishPanel(ctx, width, height, baseBlur);
  drawGrain(ctx, width, height);
  updateCanvasSize();
}

function finishPanel(ctx, width, height, baseBlur) {
  ctx.save();
  ctx.globalAlpha = state.bloom / 250;
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${baseBlur * 0.42}px) saturate(1.2) contrast(${state.contrast / 100})`;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.filter = `blur(${baseBlur * 0.34}px)`;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#020202';
  ctx.lineWidth = width * 0.08;
  roundedRect(ctx, width * 0.034, height * 0.026, width * 0.932, height * 0.948, width * 0.04);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.42;
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(0,0,0,0.7)');
  shade.addColorStop(0.18, 'rgba(0,0,0,0.05)');
  shade.addColorStop(0.78, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(6, width * 0.028);
  ctx.strokeRect(width * 0.018, width * 0.018, width - width * 0.036, height - width * 0.036);
  ctx.restore();
}

function drawGrain(ctx, width, height) {
  if (state.grain <= 0) return;
  const random = randomFrom(`${state.seed}:grain`);
  const image = ctx.createImageData(width, height);
  const alpha = Math.round(state.grain / 6);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 18 + random() * 38;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = alpha;
  }

  const grain = document.createElement('canvas');
  grain.width = width;
  grain.height = height;
  grain.getContext('2d').putImageData(image, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(grain, 0, 0);
  ctx.restore();
}

function updateCanvasSize() {
  const availableHeight = Math.max(360, window.innerHeight - 96);
  const ratio = RATIOS[state.ratio];
  const scale = Math.min(1, availableHeight / ratio.height);
  const displayWidth = Math.round(ratio.width * scale);
  const displayHeight = Math.round(ratio.height * scale);
  wrapper.style.width = `${displayWidth}px`;
  wrapper.style.height = `${displayHeight}px`;
  previewWrapper.style.width = `${displayWidth + 96}px`;
  previewWrapper.style.height = `${displayHeight + 96}px`;
}

function renderColors() {
  colorList.innerHTML = '';
  state.colors.forEach((color, index) => {
    const item = document.createElement('div');
    item.className = 'color-item';
    item.innerHTML = `
      <input class="color-picker" type="color" value="${color}" aria-label="Color ${index + 1}" />
      <input class="color-hex" value="${color}" aria-label="Hex ${index + 1}" />
      <button class="btn-remove" type="button" title="Remove color">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    `;
    const colorInput = item.querySelector('.color-picker');
    const hexInput = item.querySelector('.color-hex');
    const remove = item.querySelector('.btn-remove');
    const setColor = (value) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
      state.colors[index] = value.toLowerCase();
      colorInput.value = state.colors[index];
      hexInput.value = state.colors[index];
      renderGradient();
    };
    colorInput.addEventListener('input', (event) => setColor(event.target.value));
    hexInput.addEventListener('change', (event) => setColor(event.target.value));
    remove.addEventListener('click', () => {
      if (state.colors.length <= 2) return;
      state.colors.splice(index, 1);
      renderColors();
      renderGradient();
    });
    colorList.append(item);
  });
  addColorButton.disabled = state.colors.length >= 6;
}

function populateSelect(id, options) {
  const select = document.querySelector(`#${id}`);
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  select.value = state[id];
  select.addEventListener('change', () => {
    state[id] = select.value;
    if (id === 'paletteMood') {
      state.seed = Math.random();
      state.colors = generatedPalette(state.paletteMood, state.seed);
      renderColors();
    }
    renderGradient();
  });
}

function updateSlider(id) {
  const input = document.querySelector(`#${id}`);
  const value = document.querySelector(`#${id}-value`);
  input.value = state[id];
  const progress = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--slider-progress', `${progress}%`);
  value.textContent = `${Math.round(state[id])}`;
}

function bindSlider(id) {
  const input = document.querySelector(`#${id}`);
  const group = input.closest('.control-group');
  input.value = state[id];
  input.addEventListener('input', () => {
    state[id] = Number(input.value);
    updateSlider(id);
    renderGradient();
  });
  input.addEventListener('pointerdown', () => group.classList.add('is-dragging'));
  window.addEventListener('pointerup', () => group.classList.remove('is-dragging'));
  updateSlider(id);
}

function randomize() {
  const random = Math.random;
  const architecturePool = ['aperture', 'aperture', 'aperture', 'field', 'horizon', 'monolith'];
  const blendPool = ['screen', 'screen', 'soft-light', 'overlay'];
  const nextSeed = Math.random();
  if (!locks.paletteMood) state.paletteMood = pick(random, PALETTE_OPTIONS.map(([value]) => value));
  if (!locks.architecture) state.architecture = pick(random, architecturePool);
  if (!locks.blendMode) state.blendMode = pick(random, blendPool);
  if (!locks.blur) state.blur = Math.round(36 + random() * 34);
  if (!locks.bloom) state.bloom = Math.round(28 + random() * 52);
  if (!locks.contrast) state.contrast = Math.round(104 + random() * 34);
  if (!locks.depth) state.depth = Math.round(58 + random() * 40);
  if (!locks.core) state.core = Math.round(32 + random() * 48);
  if (!locks.asymmetry) state.asymmetry = Math.round(random() * 46);
  if (!locks.grain) state.grain = Math.round(8 + random() * 32);
  state.seed = nextSeed;
  if (!locks.colors) state.colors = generatedPalette(state.paletteMood, state.seed);
  syncControls();
  renderGradient();
}

function syncControls() {
  document.querySelector('#paletteMood').value = state.paletteMood;
  document.querySelector('#architecture').value = state.architecture;
  document.querySelector('#blendMode').value = state.blendMode;
  ['blur', 'bloom', 'contrast', 'depth', 'core', 'asymmetry', 'grain'].forEach(updateSlider);
  renderColors();
}

function toggleLock(param) {
  locks[param] = !locks[param];
  document.querySelectorAll(`[data-lock="${param}"]`).forEach((button) => {
    button.classList.toggle('locked', locks[param]);
    button.setAttribute('aria-pressed', locks[param] ? 'true' : 'false');
  });
}

function exportPng() {
  const link = document.createElement('a');
  link.download = `hiro-luminous-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function isTypingTarget(target) {
  return target.closest('input, textarea, select, button, a[href], [contenteditable="true"]');
}

let rapidTimer = null;
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || isTypingTarget(event.target)) return;
  event.preventDefault();
  if (event.repeat) return;
  randomize();
  rapidTimer = window.setInterval(randomize, 90);
});

window.addEventListener('keyup', (event) => {
  if (event.code !== 'Space') return;
  if (rapidTimer) window.clearInterval(rapidTimer);
  rapidTimer = null;
});

document.querySelectorAll('.lockable-label').forEach((button) => {
  button.addEventListener('pointerdown', (event) => event.preventDefault());
  button.addEventListener('click', () => toggleLock(button.dataset.lock));
});

document.querySelector('#randomize').addEventListener('click', randomize);
document.querySelector('#export').addEventListener('click', exportPng);
addColorButton.addEventListener('click', () => {
  if (state.colors.length >= 6) return;
  state.colors.push('#ffffff');
  renderColors();
  renderGradient();
});

document.querySelector('#ratio-group').addEventListener('click', (event) => {
  const button = event.target.closest('[data-ratio]');
  if (!button) return;
  state.ratio = button.dataset.ratio;
  document.querySelectorAll('.ratio-btn').forEach((node) => node.classList.toggle('active', node === button));
  renderGradient();
});

window.addEventListener('resize', updateCanvasSize);

state.colors = generatedPalette(state.paletteMood, state.seed);
populateSelect('paletteMood', PALETTE_OPTIONS);
populateSelect('architecture', ARCHITECTURES);
populateSelect('blendMode', BLENDS);
['blur', 'bloom', 'contrast', 'depth', 'core', 'asymmetry', 'grain'].forEach(bindSlider);
renderColors();
renderGradient();
