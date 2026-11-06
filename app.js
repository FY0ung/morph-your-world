/* ==========================================================================
   Moldable Design System Studio — Phase 03 · Premium: Sculptural Editorial (+ story-first workspace, companion, TH/EN)
   One state object → tokens → (clay/preview, inspector, journey, audit, export)
   ========================================================================== */
(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     1. Color utilities (sRGB hex ⇄ RGB ⇄ HSL, WCAG 2.x luminance/contrast)
     --------------------------------------------------------------------- */
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const normalizeHex = (s) => {
    if (typeof s !== "string") return null;
    let h = s.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map((c) => c + c).join("");
    return /^[0-9a-f]{6}$/i.test(h) ? "#" + h.toLowerCase() : null;
  };
  const hexToRgb = (hex) => {
    const h = normalizeHex(hex).slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const rgbToHex = (rgb) => "#" + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
  const rgbToHsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    return [h * 60, s * 100, l * 100];
  };
  const hslToRgb = ([h, s, l]) => {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };
  const hsl = (hex) => rgbToHsl(hexToRgb(hex));
  const fromHsl = (h, s, l) => rgbToHex(hslToRgb([h, clamp(s, 0, 100), clamp(l, 0, 100)]));
  const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const luminance = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const isLight = (hex) => luminance(hex) > 0.4;
  const withL = (hex, l) => { const [h, s] = hsl(hex); return fromHsl(h, s, l); };
  const pickOn = (bg, candidates) => candidates.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best));

  /** Ten-step scale around the base color: 50 … 900 (base lands on 500). */
  const makeScale = (hex) => {
    const [h, s] = hsl(hex);
    const stops = { 50: 96, 100: 91, 200: 82, 300: 70, 400: 58, 500: null, 600: 40, 700: 32, 800: 24, 900: 16, 950: 10 };   // 50 and 950 extend the same curve
    const out = {};
    for (const k in stops) out[k] = stops[k] === null ? normalizeHex(hex) : fromHsl(h, k < 500 ? Math.max(s * 0.9, 12) : Math.min(s * 1.05, 100), stops[k]);
    return out;
  };

  /** Move `fg` lightness away from `bg` until contrast ≥ target. Hue/saturation preserved. */
  const fixContrast = (fg, bg, target) => {
    if (contrast(fg, bg) >= target) return fg;
    const [h, s, l0] = hsl(fg);
    const dirs = isLight(bg) ? [-1, 1] : [1, -1];
    for (const dir of dirs) {
      for (let l = l0; l >= 0 && l <= 100; l += dir * 1.5) {
        const c = fromHsl(h, s, l);
        if (contrast(c, bg) >= target) return c;
      }
    }
    return isLight(bg) ? "#000000" : "#ffffff";
  };

  const hueName = (hex) => {
    const [h, s, l] = hsl(hex);
    if (s < 10) return l > 80 ? "soft neutral" : l < 25 ? "deep neutral" : "neutral";
    const names = [["red", 15], ["orange", 40], ["amber", 55], ["yellow", 70], ["lime", 95], ["green", 150], ["teal", 185], ["cyan", 200], ["blue", 250], ["indigo", 270], ["violet", 290], ["magenta", 325], ["pink", 345], ["red", 360]];
    return names.find(([, max]) => h <= max)[0];
  };

  /* ---------------------------------------------------------------------
     2. Catalog: fonts, presets, characters
     --------------------------------------------------------------------- */
  const FONTS = [
    { id: "Inter", stack: '"Inter", "Noto Sans Thai", system-ui, sans-serif', note: "neutral and sturdy, works at any size." },
    { id: "Manrope", stack: '"Manrope", "Noto Sans Thai", system-ui, sans-serif', note: "geometric with a friendly edge." },
    { id: "DM Sans", stack: '"DM Sans", "Noto Sans Thai", system-ui, sans-serif', note: "low-contrast and calm — easy on dashboards." },
    { id: "Plus Jakarta Sans", stack: '"Plus Jakarta Sans", "Noto Sans Thai", system-ui, sans-serif', note: "a little character in the terminals." },
    { id: "Noto Sans Thai", stack: '"Noto Sans Thai", "Inter", system-ui, sans-serif', note: "Thai and Latin drawn together — no fallback seams." },
    { id: "Fraunces", stack: '"Fraunces", "Noto Serif Thai", Georgia, serif', note: "a soft serif; best kept for headings." },
    { id: "Newsreader", stack: '"Newsreader", "Noto Serif Thai", Georgia, serif', note: "an editorial display serif — calm, literary, precise." },
    { id: "Instrument Sans", stack: '"Instrument Sans", "Noto Sans Thai", system-ui, sans-serif', note: "a refined contemporary sans for quiet body text." },
    { id: "Archivo", stack: '"Archivo", "Noto Sans Thai", system-ui, sans-serif', note: "a sturdy grotesk that holds up at display sizes." },
  ];
  const fontById = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

  const PRESETS = {
    premium: {
      label: "Premium", fonts: { heading: "Newsreader", body: "Instrument Sans" }, radius: 10, density: "spacious", shadow: "soft",
      typeRatio: 1.333, headingWeight: 400, headingTracking: -0.025, lineHeight: 1.6, buttonWeight: 500, borderWidth: 1, buttonRadiusFactor: 0.8, cardRadiusFactor: 1.2, cardBorder: "subtle",
      // Sculptural Editorial: warm stone neutrals as a starting palette — replaced by anything the user picks in FAMAI
      colors: { primary: "#5b4a3a", secondary: "#7d7a6b", tertiary: "#a9826a", background: "#f7f3ed", text: "#221f1b" },
      neutral: { primary: "#7a7268", secondary: "#9a948a", tertiary: "#b5aea4", background: "#f8f6f2", text: "#2b2825" },
    },
    minimal: {
      // P3 — Bold Minimalism: oversized grotesk × precise grid × monochrome precision. Ink primary; one signal accent.
      label: "Minimal", fonts: { heading: "Archivo", body: "Inter" }, radius: 6, density: "compact", shadow: "none",
      typeRatio: 1.25, headingWeight: 600, headingTracking: -0.03, lineHeight: 1.5, buttonWeight: 600, borderWidth: 1, buttonRadiusFactor: 0.7, cardRadiusFactor: 1, cardBorder: "subtle",
      colors: { primary: "#151619", secondary: "#5c6068", tertiary: "#ff5b23", background: "#f4f4f2", text: "#0e0f11" },
      neutral: { primary: "#6c6f75", secondary: "#8a8d93", tertiary: "#a5a8ad", background: "#f6f6f5", text: "#202226" },
    },
    playful: {
      // P2 — Playful Creative World: heavy sans display × italic serif accent × colour blocks derived from the user's palette
      label: "Playful", fonts: { heading: "Plus Jakarta Sans", body: "DM Sans" }, radius: 18, density: "comfortable", shadow: "soft",
      typeRatio: 1.3, headingWeight: 800, headingTracking: -0.035, lineHeight: 1.55, buttonWeight: 700, borderWidth: 2, buttonRadiusFactor: 1.6, cardRadiusFactor: 1.5, cardBorder: "tinted",
      accentFont: "Fraunces",
      colors: { primary: "#6a4cf0", secondary: "#1fbf75", tertiary: "#ff7eb9", background: "#fbfaf6", text: "#141217" },
      neutral: { primary: "#6f6a7a", secondary: "#8b8794", tertiary: "#a9a5b0", background: "#fafaf8", text: "#1f1d24" },
    },
  };
  const DENSITY = { compact: 0.8, comfortable: 1, spacious: 1.2 };
  const SHADOWS = {
    none: { y: 0, blur: 0, spread: 0, opacity: 0 },
    soft: { y: 6, blur: 18, spread: -8, opacity: 0.16 },
    elevated: { y: 10, blur: 28, spread: -8, opacity: 0.26 },
  };
  const PAIRS = [
    { id: "editorial", heading: "Newsreader", body: "Instrument Sans" },
    { id: "neutral", heading: "Inter", body: "Inter" },
    { id: "friendly", heading: "Plus Jakarta Sans", body: "DM Sans" },
    { id: "modern", heading: "Manrope", body: "Inter" },
    { id: "thai", heading: "Noto Sans Thai", body: "Noto Sans Thai" },
  ];
  /* Before the colour step, the interface is shaped but unpainted: a quiet neutral palette. */
  const NEUTRAL = { primary: "#6e7480", secondary: "#8a8f99", tertiary: "#a3a7af", background: "#fafafa", text: "#26282c" };
  const neutralFor = (preset) => (PRESETS[preset] && PRESETS[preset].neutral) || NEUTRAL;
  /* Colour model (Phase 07): Brand = primary + secondary (+ optional tertiary) · Neutral = background → text · Semantic roles · Status.
     `tertiary` always holds a suggestion so enabling it never invents a colour; it only takes part when `tertiaryOn` is true. */
  const BASE_COLORS = { primary: "#6b5bd2", secondary: "#4f8a96", tertiary: "#e27a9c", background: "#fbfafd", text: "#1c1a22" };
  /** The semantic Accent role is not a brand colour: it resolves to Tertiary when enabled (exactly as picked), otherwise to the
      Secondary family — the source shade when it can carry a label (≥ 4.5:1), else the nearest Secondary shade that can. */
  const accentOf = (s) => {
    if (s.tertiaryOn) return s.colors.tertiary;
    const sc = makeScale(s.colors.secondary), ons = ["#ffffff", s.colors.text, "#111111"];
    const carries = (hex) => Math.max(...ons.map((o) => contrast(hex, o))) >= 4.5;
    return [500, 600, 400, 700, 300, 800].map((k) => sc[k]).find(carries) || sc[500];
  };
  /** Neutral scale — interpolated between the user's background and text (the same endpoints every neutral surface uses).
      050 = background-subtle, 200 = border-default, 500 = text-subtle, 600 = text-muted. */
  const NEUTRAL_STOPS = { 50: 0.035, 100: 0.07, 200: 0.12, 300: 0.2, 400: 0.32, 500: 0.48, 600: 0.62, 700: 0.74, 800: 0.84, 900: 0.92, 950: 0.96 };
  const neutralScale = (c) => Object.fromEntries(Object.entries(NEUTRAL_STOPS).map(([k, f]) => [k, mix(c.background, c.text, f)]));
  /** A preset's starting palette (Premium: warm stone). Used only while the user hasn't chosen colours. */
  const presetColors = (preset) => ({ ...((PRESETS[preset] && PRESETS[preset].colors) || BASE_COLORS) });
  const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", sans-serif';

  /* The five characters. Images are the approved assets (3D portraits rendered from hero3d, SVG fallback). */
  const CREW = {
    pai: { name: "PAI", img: "assets/characters/pai.svg", dot: "var(--lilac-300)" },
    famai: { name: "FAMAI", img: "assets/characters/famai.svg", dot: "var(--illusion-300)" },
    act: { name: "ACT", img: "assets/characters/act.svg", dot: "var(--pigeon-400)" },
    min: { name: "MIN", img: "assets/characters/min.svg", dot: "var(--lilac-300)" },
    fah: { name: "FAH", img: "assets/characters/fah.svg", dot: "var(--pigeon-300)" },
  };

  /* The guided journey: one step per character. Panels are the same sections Edit freely uses. */
  const STEPS = [
    { id: "style", char: "pai", panels: ["style"] },
    { id: "color", char: "famai", panels: ["color"] },
    { id: "type", char: "act", panels: ["type"] },
    { id: "shape", char: "min", panels: ["shape", "effects"] },
    { id: "a11y", char: "fah", panels: ["a11y"] },
  ];
  const CATEGORIES = { style: "pai", color: "famai", type: "act", shape: "min", effects: "min" };

  /* ---------------------------------------------------------------------
     3. State — one model drives Guided and Edit freely
     --------------------------------------------------------------------- */
  const STORAGE_KEY = "moldable-dss-v2";
  const LANG_KEY = "moldable-lang";
  const DEFAULTS = () => ({
    name: "",               // empty = the localized default name
    preset: "premium",
    colors: { ...BASE_COLORS },
    tertiaryOn: false,      // Tertiary is optional and off until the user enables it
    fonts: { ...PRESETS.premium.fonts },
    radius: PRESETS.premium.radius,
    density: PRESETS.premium.density,
    shadow: PRESETS.premium.shadow,
    corner: "standard",
    typeAdv: {},            // headingWeight, typeRatio, lineHeight, tracking — empty = follow preset
    styleAdv: {},           // cardBorder, borderWidth, buttonWeight
    radii: {},              // button, input, card — empty = follow base radius
    spaceBase: 4,
    shadowCustom: null,     // { y, blur, spread, opacity } when edited in Advanced
    touched: {},            // which groups the user edited (kept across preset switches)
    overrides: { light: {}, dark: {} },
    lastFix: null,          // { before, changes } — FAH's last change set, reviewable + undoable
    mode: "light",
    preview: "landing",
    zoom: "width",
    viewport: "desktop",    // desktop | mobile — sizes the generated site inside the canvas only
    // journey
    flow: "guided", step: 0, reached: 0, shaped: false, reveal: 0, chosen: false, teamPlayed: false,
    category: "style", inspectorOpen: true, advanced: {},
    // component library (Phase 04) — a workspace beside the categories, never a story step
    library: false, libId: "button", libFilter: "all", libGroups: {},
  });
  let state = DEFAULTS();

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const base = DEFAULTS();
      state = { ...base, ...saved, colors: { ...base.colors, ...(saved.colors || {}) }, fonts: { ...base.fonts, ...(saved.fonts || {}) },
        overrides: { light: { ...(saved.overrides?.light || {}) }, dark: { ...(saved.overrides?.dark || {}) } } };
      // Phase 07: the old required "accent" picker became an optional Tertiary. Only a hand-picked accent (not a preset /
      // palette default) is treated as an intentional Tertiary choice; defaults are kept as the Tertiary suggestion, off.
      if (saved.colors && "accent" in saved.colors && !("tertiary" in saved.colors)) {
        const legacy = normalizeHex(saved.colors.accent);
        const defaults = new Set([BASE_COLORS.tertiary, ...Object.values(PRESETS).map((p) => p.colors && p.colors.tertiary), ...$$(".palette").map((b) => b.dataset.t)].filter(Boolean).map((x) => x.toLowerCase()));
        if (legacy) { state.colors.tertiary = legacy; if (typeof saved.tertiaryOn !== "boolean") state.tertiaryOn = !defaults.has(legacy.toLowerCase()); }
      }
      delete state.colors.accent;
      state.tertiaryOn = state.tertiaryOn === true;
      if (state.viewport !== "mobile") state.viewport = "desktop";
      delete state.statusMode;   // Status colours are always brand-harmonized now; a stale "standard" setting can't come back
      for (const k in state.colors) if (!normalizeHex(state.colors[k])) state.colors[k] = base.colors[k];
      if (!PRESETS[state.preset]) state.preset = base.preset;
      if (!CATEGORIES[state.category]) state.category = "style";
      if (state.name === "My Design System" || typeof state.name !== "string") state.name = "";
      if (!state.touched.colors && saved.colors && JSON.stringify(state.colors) !== JSON.stringify(BASE_COLORS) && JSON.stringify(state.colors) !== JSON.stringify(presetColors(state.preset))) state.touched.colors = true;
      state.step = clamp(state.step | 0, 0, 4); state.reached = clamp(Math.max(state.reached | 0, state.step), 0, 4);
      if (!["landing", "dashboard"].includes(state.preview)) state.preview = "landing";   // Components left the preview menu in Phase 04
      if (!["all", "free", "pro"].includes(state.libFilter)) state.libFilter = "all";
      if (!state.libGroups || typeof state.libGroups !== "object") state.libGroups = {};
      if (!state.shaped) state.library = false;
    } catch (_) { /* corrupt or unavailable storage: start fresh */ }
  };
  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }, 150); };
  const customized = () => Object.keys(state.touched).length > 0;

  /* ---------------------------------------------------------------------
     4. Token derivation — the generator
     --------------------------------------------------------------------- */
  const STATUS = {
    // Reference only — Moldable source --text-{success|warning|error|info}-onlight (light = Green/Yellow/Red/Blue 800, dark = 400).
    // The generated theme resolves status text from the harmonized palettes (statusFg); these stay as the official anchors.
    light: { success: "#14673c", warning: "#943c0c", danger: "#a41210", info: "#024e8a" },
    dark: { success: "#21d172", warning: "#fab619", danger: "#ff7270", info: "#52baff" },
  };
  /** Status scales (050–950): generated with makeScale() from each Moldable status base — the source role colour
      --background-{success|info|warning|error}-default (light). Only 500 is the source value; the other shades are generated.
      Status is always brand-harmonized (Phase 08 cleanup): these bases are the hue anchors the harmonizer starts from. Key "danger" = the Error role. */
  const STATUS_BASE = { success: fromHsl(148, 73, 40), info: fromHsl(204, 95, 48), warning: fromHsl(42, 96, 54), danger: fromHsl(1, 100, 62) };
  const STATUS_ROWS = [["success", "success"], ["info", "info"], ["warning", "warning"], ["error", "danger"]];   // [label key, token key]

  /* ---- Phase 08 — Brand Harmonized status colours (OKLCH). Follow the brand's tone, never its hue. ---- */
  const srgbToLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const linToSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
  const toOklch = (hex) => {
    const [r, g, b] = hexToRgb(hex).map(srgbToLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
  };
  const oklchToLinRgb = (L, C, H) => {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  };
  /** Gamut mapping: keep L and H, lower C (binary search) until the colour fits sRGB. Deterministic. */
  const fromOklch = (L, C, H) => {
    const inGamut = (c) => oklchToLinRgb(L, c, H).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
    let lo = 0, hi = C;
    if (!inGamut(C)) { for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(mid)) lo = mid; else hi = mid; } C = lo; }
    return rgbToHex(oklchToLinRgb(L, C, H).map((v) => Math.round(clamp(linToSrgb(clamp(v, 0, 1)), 0, 255))));
  };
  /** Brand tone profile — average OKLCH chroma and lightness of the active brand colours (hue is deliberately ignored). */
  const brandTone = (s) => {
    const list = [s.colors.primary, s.colors.secondary, ...(s.tertiaryOn ? [s.colors.tertiary] : [])].map(toOklch);
    return { C: list.reduce((a, x) => a + x[1], 0) / list.length, L: list.reduce((a, x) => a + x[0], 0) / list.length };
  };
  const TONE_REF = { C: 0.13, L: 0.6 };   // a "typical" brand: no change
  /** Chroma follows the brand's vividness (bounded ≈0.48×–1.14×, with a per-status floor so even a grey brand keeps
      recognisable status colours); lightness leans ≤ ±0.04 toward the brand; hue stays on the status anchor, so meaning is kept. */
  const STATUS_C_FLOOR = { success: 0.07, info: 0.07, warning: 0.115, danger: 0.1 };   // amber needs more colour to still read as "caution"
  const harmonize = (base, tone, key) => {
    const [L, C, H] = toOklch(base);
    const f = clamp(tone.C / TONE_REF.C, 0.25, 1.2), cScale = 1 + 0.7 * (f - 1);
    const C2 = clamp(C * cScale, STATUS_C_FLOOR[key] || 0.07, 0.24);
    let L2 = clamp(L + clamp((tone.L - TONE_REF.L) * 0.15, -0.04, 0.04), 0.5, 0.86), out = fromOklch(L2, C2, H);
    // keep 500 perceptually between its own 400 and 600 (OKLCH L, 0.01 margin) so 050 → 950 stays strictly light-to-dark
    for (let i = 0; i < 60; i++) {
      const sc = makeScale(out), l4 = toOklch(sc[400])[0], l5 = toOklch(out)[0], l6 = toOklch(sc[600])[0];
      if (l5 > l4 - 0.01) L2 -= 0.005; else if (l5 < l6 + 0.01) L2 += 0.005; else break;
      out = fromOklch(L2, C2, H);
    }
    return out;
  };
  const statusBases = (s) => {
    const tone = brandTone(s);
    return Object.fromEntries(Object.entries(STATUS_BASE).map(([k, v]) => [k, harmonize(v, tone, k)]));
  };
  /** Semantic status foreground from a palette: the first step that reads at ≥ 4.5:1 on its soft surface (FAH still audits). */
  const statusFg = (sc, bg, mode) => {
    const order = mode === "dark" ? [300, 400, 200, 100] : [700, 800, 600, 900];
    const ok = (k) => contrast(sc[k], mix(bg, sc[k], mode === "dark" ? 0.18 : 0.14)) >= 4.5;
    return sc[order.find(ok) ?? order[1]];
  };

  const deriveColors = (s, mode) => {
    const c = s.colors;
    const acc = accentOf(s);
    const P = makeScale(c.primary), S = makeScale(c.secondary), A = makeScale(acc);
    // Status text/icon colours resolve from the brand-harmonized palettes
    const ST = (() => {
      const bases = statusBases(s), bgL = c.background, bgD = fromHsl(hsl(c.primary)[0], 14, 8);
      const out = { light: {}, dark: {} };
      for (const k in bases) { const sc = makeScale(bases[k]); out.light[k] = statusFg(sc, bgL, "light"); out.dark[k] = statusFg(sc, bgD, "dark"); }
      return out;
    })();
    let t;
    if (mode === "light") {
      const bg = c.background, text = c.text;
      const bgIsLight = isLight(bg);
      t = {
        "color-primary": c.primary,
        "color-primary-hover": withL(c.primary, Math.max(hsl(c.primary)[2] - 8, 6)),
        "color-primary-soft": mix(bg, c.primary, 0.14),
        "color-primary-contrast": pickOn(c.primary, ["#ffffff", text, "#111111"]),
        "color-primary-on-soft": P[700],
        "color-secondary": c.secondary,
        "color-secondary-soft": mix(bg, c.secondary, 0.14),
        "color-secondary-contrast": pickOn(c.secondary, ["#ffffff", text, "#111111"]),
        "color-secondary-on-soft": S[700],
        "color-accent": acc,
        "color-accent-soft": mix(bg, acc, 0.16),
        "color-accent-contrast": pickOn(acc, ["#ffffff", text, "#111111"]),
        "color-background-default": bg,
        "color-background-subtle": mix(bg, text, bgIsLight ? 0.035 : 0.06),
        "color-surface-default": bgIsLight ? mix(bg, "#ffffff", 0.7) : mix(bg, "#ffffff", 0.05),
        "color-surface-raised": bgIsLight ? "#ffffff" : mix(bg, "#ffffff", 0.09),
        "color-text-default": text,
        "color-text-muted": mix(text, bg, 0.38),
        "color-text-subtle": mix(text, bg, 0.52),
        "color-border-default": mix(bg, text, 0.12),
        // Input boundaries are generated at ≥ 3:1 (WCAG 1.4.11) from the start; the audit still measures the real value.
        "color-border-strong": fixContrast(mix(bg, text, 0.3), bg, 3),
        "color-link": c.primary,
        "color-control": c.primary,
        "color-success": ST.light.success, "color-success-soft": mix(bg, ST.light.success, 0.14),
        "color-warning": ST.light.warning, "color-warning-soft": mix(bg, ST.light.warning, 0.14),
        "color-danger": ST.light.danger, "color-danger-soft": mix(bg, ST.light.danger, 0.12),
        "color-danger-contrast": pickOn(ST.light.danger, ["#ffffff", "#111111"]),
        // Phase 04 — the component library needs every status colour the DS components take (success · warning · info)
        "color-success-contrast": pickOn(ST.light.success, ["#ffffff", "#111111"]),
        "color-warning-contrast": pickOn(ST.light.warning, ["#ffffff", "#111111"]),
        "color-info": ST.light.info, "color-info-soft": mix(bg, ST.light.info, 0.12),
        "color-info-contrast": pickOn(ST.light.info, ["#ffffff", "#111111"]),
      };
    } else {
      const [h] = hsl(c.primary);
      const bg = fromHsl(h, 14, 8), text = fromHsl(h, 18, 94);
      const [, ps, pl] = hsl(c.primary);
      const primary = pl < 56 ? P[400] : c.primary;
      const secondary = hsl(c.secondary)[2] < 56 ? S[400] : c.secondary;
      const accent = hsl(acc)[2] < 56 ? A[400] : acc;
      t = {
        "color-primary": primary,
        "color-primary-hover": fromHsl(h, ps, Math.min(hsl(primary)[2] + 8, 90)),
        "color-primary-soft": mix(bg, primary, 0.22),
        "color-primary-contrast": pickOn(primary, ["#0b0b10", "#ffffff"]),
        "color-primary-on-soft": P[200],
        "color-secondary": secondary,
        "color-secondary-soft": mix(bg, secondary, 0.22),
        "color-secondary-contrast": pickOn(secondary, ["#0b0b10", "#ffffff"]),
        "color-secondary-on-soft": S[200],
        "color-accent": accent,
        "color-accent-soft": mix(bg, accent, 0.24),
        "color-accent-contrast": pickOn(accent, ["#0b0b10", "#ffffff"]),
        "color-background-default": bg,
        "color-background-subtle": fromHsl(h, 13, 11),
        "color-surface-default": fromHsl(h, 12, 12),
        "color-surface-raised": fromHsl(h, 11, 16),
        "color-text-default": text,
        "color-text-muted": mix(text, bg, 0.4),
        "color-text-subtle": mix(text, bg, 0.55),
        "color-border-default": mix(bg, text, 0.12),
        "color-border-strong": fixContrast(mix(bg, text, 0.3), bg, 3),
        "color-link": P[300],
        "color-control": primary,
        "color-success": ST.dark.success, "color-success-soft": mix(bg, ST.dark.success, 0.18),
        "color-warning": ST.dark.warning, "color-warning-soft": mix(bg, ST.dark.warning, 0.18),
        "color-danger": ST.dark.danger, "color-danger-soft": mix(bg, ST.dark.danger, 0.18),
        "color-danger-contrast": pickOn(ST.dark.danger, ["#0b0b10", "#ffffff"]),
        "color-success-contrast": pickOn(ST.dark.success, ["#0b0b10", "#ffffff"]),
        "color-warning-contrast": pickOn(ST.dark.warning, ["#0b0b10", "#ffffff"]),
        "color-info": ST.dark.info, "color-info-soft": mix(bg, ST.dark.info, 0.18),
        "color-info-contrast": pickOn(ST.dark.info, ["#0b0b10", "#ffffff"]),
      };
    }
    if (s.preset === "playful") Object.assign(t, playfulPops(c, mode, t, s.tertiaryOn));
    // FAH overrides apply only to tokens this preset generates (a Playful colour-block fix never leaks into Premium / Minimal)
    const ov = (s.overrides && s.overrides[mode]) || {};
    for (const k in ov) if (k in t) t[k] = ov[k];
    return t;
  };

  /**
   * Playful colour blocks — four "pop" surfaces derived from the user's palette, never fixed HEX:
   * pop-1 = vivid secondary · pop-2 = soft primary · pop-3 = soft third hue · pop-4 = a sunny hue beside it.
   * Third hue: Tertiary when enabled; otherwise derived from Primary + Secondary — the complement of their mid-hue, so two
   * brand colours still give four distinct blocks (violet + green → coral + gold). Deterministic, never a fixed HEX.
   * Each gets an "on" colour picked for contrast. Grey palettes stay grey (the unfinished, pre-colour stage).
   */
  const playfulPops = (c, mode, t, tertiaryOn) => {
    const sat = (v, lo, hi) => (v < 12 ? v : clamp(v, lo, hi));
    const [hs, ss] = hsl(c.secondary), [hp, sp] = hsl(c.primary);
    let ha, sa, hSun;
    if (tertiaryOn) { [ha, sa] = hsl(c.tertiary); hSun = (ha + 70) % 360; }
    else {
      const rad = (d) => (d * Math.PI) / 180, x = Math.cos(rad(hp)) + Math.cos(rad(hs)), y = Math.sin(rad(hp)) + Math.sin(rad(hs));
      const mid = Math.hypot(x, y) < 0.2 ? (hp + 90) % 360 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;   // opposite hues: step 90° instead
      ha = (mid + 180) % 360; sa = Math.min(sp, ss) < 12 ? Math.min(sp, ss) : (sp + ss) / 2; hSun = (ha + 32) % 360;
    }
    const sSun = sa < 12 ? sa : 85;
    const dark = mode === "dark";
    const pops = dark
      ? [fromHsl(hs, sat(ss, 35, 60), 30), fromHsl(hp, sat(sp, 25, 45), 26), fromHsl(ha, sat(sa, 30, 50), 27), fromHsl(hSun, sat(sSun, 35, 55), 27)]
      : [fromHsl(hs, sat(ss, 45, 80), 56), fromHsl(hp, sat(sp * 0.75, 35, 70), 85), fromHsl(ha, sat(sa, 50, 85), 87), fromHsl(hSun, sat(sSun, 60, 90), 76)];
    const out = {};
    pops.forEach((p, i) => {
      out[`color-pop-${i + 1}`] = p;
      out[`color-on-pop-${i + 1}`] = pickOn(p, [t["color-text-default"], "#ffffff", "#111111"]);
    });
    return out;
  };

  /** Resolved typography/style values: Advanced edits win, otherwise the preset decides. */
  const resolved = (s) => {
    const p = PRESETS[s.preset], ta = s.typeAdv || {}, sa = s.styleAdv || {};
    return {
      typeRatio: ta.typeRatio ?? p.typeRatio, headingWeight: ta.headingWeight ?? p.headingWeight,
      tracking: ta.tracking ?? p.headingTracking, lineHeight: ta.lineHeight ?? (s.fonts.body === "Noto Sans Thai" ? 1.7 : p.lineHeight),
      buttonWeight: sa.buttonWeight ?? p.buttonWeight, borderWidth: sa.borderWidth ?? p.borderWidth, cardBorder: sa.cardBorder ?? p.cardBorder,
      rButton: s.radii?.button ?? Math.round(Math.min(s.radius * p.buttonRadiusFactor, 999)),
      rInput: s.radii?.input ?? Math.round(s.radius * 0.75),
      rCard: s.radii?.card ?? Math.round(s.radius * p.cardRadiusFactor),
      shadow: s.shadowCustom || SHADOWS[s.shadow] || SHADOWS.soft,
    };
  };

  const deriveShape = (s) => {
    const r = s.radius, R = resolved(s), p = PRESETS[s.preset];
    const d = DENSITY[s.density];
    const px = (n) => `${Math.round(n)}px`;
    const steps = [1, 2, 3, 4, 6, 8, 12, 16];
    const sh = R.shadow;
    const mk = (k) => (sh.opacity <= 0 || (sh.blur === 0 && sh.y === 0 && sh.spread <= 0)) ? "none"
      : `0 ${Math.round(sh.y * k)}px ${Math.round(sh.blur * k)}px ${Math.round(sh.spread * k)}px rgba(16, 14, 30, ${(+(sh.opacity * (k < 1 ? 0.5 : 1.2)).toFixed(3))})`;
    const sizes = {}; const base = 16; const names = ["md", "lg", "xl", "2xl", "3xl", "4xl"];
    names.forEach((n, i) => (sizes[`font-size-${n}`] = `${(base * Math.pow(R.typeRatio, i)).toFixed(1)}px`));
    return {
      "font-family-heading": fontById(s.fonts.heading).stack,
      "font-family-body": fontById(s.fonts.body).stack,
      ...(p.accentFont ? { "font-family-accent": fontById((s.typeAdv && s.typeAdv.accentFont) || p.accentFont).stack } : {}),
      "font-weight-heading": String(R.headingWeight),
      "font-weight-body": "400",
      "font-weight-button": String(R.buttonWeight),
      "letter-spacing-heading": `${R.tracking}em`,
      "line-height-heading": "1.12",
      "line-height-body": String(R.lineHeight),
      "font-size-xs": "12px", "font-size-sm": "14px", ...sizes,
      "radius-sm": px(r * 0.5), "radius-md": px(r), "radius-lg": px(r * 1.5), "radius-xl": px(r * 2), "radius-full": "999px",
      "radius-button": px(R.rButton), "radius-input": px(R.rInput), "radius-card": px(R.rCard), "radius-badge": "999px",
      "corner-shape": s.corner === "smooth" ? "superellipse(1.6)" : "round",
      ...Object.fromEntries(steps.map((v, i) => [`space-${i + 1}`, px(v * s.spaceBase * d)])),
      "control-height": px(40 * (0.85 + d * 0.15)),
      "border-width": `${R.borderWidth}px`,
      "shadow-sm": sh.opacity <= 0 ? "none" : mk(0.4), "shadow-md": mk(1), "shadow-lg": mk(1.8),
    };
  };

  const cardBorderFor = (s, colors) => ({ subtle: colors["color-border-default"], strong: colors["color-border-strong"], tinted: colors["color-primary-soft"] })[resolved(s).cardBorder];

  const applyTokens = (el, s, mode) => {
    const colors = deriveColors(s, mode), shape = deriveShape(s);
    for (const k in colors) el.style.setProperty(`--${k}`, colors[k]);
    for (const k in shape) el.style.setProperty(`--${k}`, shape[k]);
    el.style.setProperty("--card-border", cardBorderFor(s, colors));
    el.dataset.preset = s.preset;
    el.dataset.mode = mode;
    return colors;
  };

  /* ---------------------------------------------------------------------
     5. Accessibility audit — real WCAG 2.x contrast on the computed colors
     --------------------------------------------------------------------- */
  const AUDIT_PAIRS = [
    { id: "body", name: "Body text on background", fg: "color-text-default", bg: "color-background-default", min: 4.5, kind: "text" },
    { id: "muted", name: "Muted text on surface", fg: "color-text-muted", bg: "color-surface-default", min: 4.5, kind: "text" },
    { id: "button", name: "Button label on primary", fg: "color-primary-contrast", bg: "color-primary", min: 4.5, kind: "text" },
    { id: "link", name: "Link on background", fg: "color-link", bg: "color-background-default", min: 4.5, kind: "text" },
    { id: "badge", name: "Badge label on accent", fg: "color-accent-contrast", bg: "color-accent", min: 4.5, kind: "text" },
    { id: "large", name: "Large stat on subtle panel", fg: "color-link", bg: "color-background-subtle", min: 3, kind: "large" },
    { id: "control", name: "Focus ring & checkbox on background", fg: "color-control", bg: "color-background-default", min: 3, kind: "ui" },
    { id: "border", name: "Input border on background", fg: "color-border-strong", bg: "color-background-default", min: 3, kind: "ui" },
    // Status text on its soft surface — badges, alerts, validation notes in the generated previews
    ...[["success", "Success"], ["warning", "Warning"], ["danger", "Error"], ["info", "Info"]].map(([k, n]) => ({ id: `st-${k}`, name: `${n} text on ${n.toLowerCase()} surface`, fg: `color-${k}`, bg: `color-${k}-soft`, min: 4.5, kind: "text" })),
    { id: "st-danger-btn", name: "Destructive button label", fg: "color-danger-contrast", bg: "color-danger", min: 4.5, kind: "text" },
    // Playful colour blocks — audited whenever the preset generates them. Fixed by adjusting the block (the text is already the best of dark/light).
    ...[1, 2, 3, 4].map((n) => ({ id: `pop${n}`, name: `Text on colour block ${n}`, fg: `color-on-pop-${n}`, bg: `color-pop-${n}`, min: 4.5, kind: "text", fixTarget: "bg" })),
  ];

  const runAudit = (colors) => AUDIT_PAIRS.filter((p) => colors[p.fg] && colors[p.bg]).map((p) => {
    const fg = colors[p.fg], bg = colors[p.bg], ratio = contrast(fg, bg), pass = ratio >= p.min;
    const fixToken = p.fixTarget === "bg" ? p.bg : p.fg;
    let suggestion = null;
    if (!pass) {
      if (p.fixTarget === "bg") suggestion = fixContrast(bg, fg, p.min);
      else if (p.id === "button" || p.id === "badge") suggestion = pickOn(bg, ["#ffffff", "#111111"]);
      else suggestion = fixContrast(fg, bg, p.min);
      if (contrast(suggestion, p.fixTarget === "bg" ? fg : bg) < p.min) suggestion = null;
    }
    return { ...p, fgHex: fg, bgHex: bg, ratio, pass, suggestion, fixToken };
  });
  const auditBoth = (s) => ({ light: runAudit(deriveColors(s, "light")), dark: runAudit(deriveColors(s, "dark")) });
  const fmt = (r) => (Math.round(r * 100) / 100).toFixed(2);

  /* ---------------------------------------------------------------------
     6. Localization — one dictionary (i18n.js), keys + interpolation
     --------------------------------------------------------------------- */
  const MESSAGES = window.MoldableMessages || { en: {} };
  let lang = (() => { try { const v = localStorage.getItem(LANG_KEY); return v === "th" || v === "en" ? v : "en"; } catch (_) { return "en"; } })();
  const lookup = (dict, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), dict);
  /** t("a11y.summaryFail", { count: 3 }) → picks _one/_other, fills {count}. Falls back to English, then to the key. */
  const t = (key, params = {}) => {
    let k = key;
    if (typeof params.count === "number") {
      const pk = `${key}_${params.count === 1 ? "one" : "other"}`;
      if (lookup(MESSAGES[lang], pk) != null || lookup(MESSAGES.en, pk) != null) k = pk;
    }
    let v = lookup(MESSAGES[lang], k);
    if (v == null) v = lookup(MESSAGES.en, k);
    if (v == null) return key;
    if (typeof v !== "string") return v;
    return v.replace(/\{(\w+)\}/g, (m, p) => (params[p] != null ? params[p] : m));
  };
  const listify = (items) => items.length <= 1 ? items.join("") : lang === "th" ? `${items.slice(0, -1).join(" ")} ${t("style.and")}${items[items.length - 1]}` : `${items.slice(0, -1).join(", ")} ${t("style.and")} ${items[items.length - 1]}`;
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

  /* ---------------------------------------------------------------------
     7. DOM refs
     --------------------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = {
    welcome: $("#view-welcome"), playground: $("#view-playground"), workspace: $("#workspace"), side: $("#side"),
    name: $("#ds-name"), langBtns: $$("[data-lang]"), btnMode: $("#btn-mode"), btnModeLabel: $("#btn-mode-label"), btnExport: $("#btn-export"),
    btnMore: $("#btn-more"), moreMenu: $("#more-menu"),
    railItems: $$(".rail-item"), inspector: $("#inspector"), btnCollapse: $("#btn-collapse"), inspTitle: $("#insp-title"),
    storyCount: $("#story-count"), storyGuide: $("#story-guide"), storyTitle: $("#story-title"), steps: $("#steps"),
    qMain: $("#q-main"), qSub: $("#q-sub"), inspScroll: $("#insp-scroll"), panels: $$(".panel-sec"),
    btnBack: $("#btn-back"), btnNext: $("#btn-next"), btnNextLabel: $("#btn-next-label"),
    presetCards: $$(".preset-card"), minis: $$(".mini-ui"), keepNote: $("#keep-note"), keepText: $("#keep-text"), btnFullPreset: $("#btn-full-preset"),
    palettes: $$(".palette"), hexError: $("#hex-error"), scaleP: $("#scale-primary"), scaleP2: $("#scale-secondary-main"), scaleT: $("#scale-tertiary"), scaleN: $("#scale-neutral"),
    tertiarySwitch: $("#tertiary-switch"), tertiaryBody: $("#tertiary-body"), tertiaryHint: $("#tertiary-hint"), statusList: $("#status-list"), statusMode: $("#status-mode"),
    semanticList: $("#semantic-list"), semanticMode: $("#semantic-mode"),
    pairs: $("#pairs"), fontHeading: $("#font-heading"), fontBody: $("#font-body"), fontAccent: $("#font-accent"), accentField: $("#accent-field"), specimen: $("#type-specimen"), typeRatio: $("#type-ratio"),
    radiusDemo: $(".radius-demo"), radiusDemoItems: $$(".radius-demo .rd"), cornerHint: $("#corner-hint"), radiusScale: $("#radius-scale"),
    spaceScale: $("#space-scale"), shadowHint: $("#shadow-hint"), fahResult: $("#fah-result"),
    stage: $("#canvas"), stageScroll: $("#stage-scroll"),
    btnPreview: $("#btn-preview"), previewMenu: $("#preview-menu"), previewLabel: $("#preview-label"),
    btnView: $("#btn-view"), viewMenu: $("#view-menu"), zoomLabel: $("#zoom-label"), fsLabel: $("#fs-label"), miFullscreen: $("#mi-fullscreen"),
    auditChip: $("#audit-chip"), auditChipText: $("#audit-chip-text"),
    clayWrap: $("#clay-wrap"), clayCanvas: $("#clay-canvas"), clayFallback: $("#clay-fallback"),
    vpSwitch: $("#vp-switch"), vpBtns: $$("#vp-switch .vp-btn"),
    artboard: $("#artboard"), sizer: $("#artboard-sizer"), frame: $("#preview-frame"), fx: $("#fx-layer"),
    companion: $("#companion"), bubble: $("#bubble"), bubbleWho: $("#bubble-who"), bubbleText: $("#bubble-text"), bubbleClose: $("#bubble-close"),
    buddy: $("#buddy"), buddyImg: $("#buddy-img"), live: $("#companion-live"),
    drawer: $("#audit-drawer"), drawerSub: $("#drawer-sub"), drawerBody: $("#drawer-body"), btnDrawerClose: $("#btn-drawer-close"),
    previews: { landing: $("#pv-landing"), dashboard: $("#pv-dashboard") },
    premium: { landing: $("#pv-premium-landing"), dashboard: $("#pv-premium-dashboard") },
    playful: { landing: $("#pv-playful-landing"), dashboard: $("#pv-playful-dashboard") },
    minimal: { landing: $("#pv-minimal-landing"), dashboard: $("#pv-minimal-dashboard") },
    previewWrap: $("#preview-wrap"), btnLibEntry: $("#btn-lib-entry"), libCrumb: $("#lib-crumb"), zoomGroup: $$("[data-zoomgroup]"),
    libBrowser: $("#lib-browser"), libReturn: $("#lib-return"), libReturnStep: $("#lib-return-step"), btnLibReturn: $("#btn-lib-return"),
    libSearch: $("#lib-search"), libClear: $("#lib-clear"), libFilterBtns: $$("[data-filter]"), libCount: $("#lib-count"), libList: $("#lib-list"),
    libView: $("#library"), libPage: $("#lib-page"), proDialog: $("#pro-dialog"), proList: $("#pro-list"),
    dialog: $("#export-dialog"), exportCode: $("#export-code"), exportTabs: $$("[data-format]"), exportSub: $("#export-sub"), exportA11y: $("#export-a11y"),
    btnCopy: $("#btn-copy"), btnDlCss: $("#btn-dl-css"), btnDlJson: $("#btn-dl-json"),
    btnDlFigma: $("#btn-dl-figma"), figPanel: $("#fig-panel"), figCheck: $("#fig-check"), figFiles: $("#fig-files"), figHowCheck: $("#fig-how-check"),
    resetDialog: $("#reset-dialog"),
    toast: $("#toast"), tooltip: $("#tooltip"),
    heroCanvas: $("#hero-canvas"), heroLabel: $("#hero-label"), heroFallback: $("#hero-fallback"),
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionOK = () => !reducedMotion.matches;
  const ph = $$("[data-ph-key]", el.frame);
  /** Each preset owns its layout identity: Premium and Playful have their own articles, Minimal uses the generic set. */
  const previewSet = (preset = state.preset) => ({ premium: el.premium, playful: el.playful, minimal: el.minimal })[preset] || el.previews;
  const currentPreview = () => previewSet()[state.preview];
  const I18N_ROOTS = [el.playground, el.dialog, el.resetDialog, el.proDialog];

  /** Write every keyed string. Never touches state, the canvas structure or the clay. */
  const applyI18n = () => {
    I18N_ROOTS.forEach((root) => {
      root.lang = lang;
      $$("[data-i18n]", root).forEach((n) => { if (n.hasAttribute("data-ph-key")) return; const v = t(n.dataset.i18n); if (n.textContent !== v) n.textContent = v; });
      $$("[data-i18n-attr]", root).forEach((n) => n.dataset.i18nAttr.split(",").forEach((pair) => {
        const [attr, key] = pair.split(":");
        const v = t(key, n.dataset.i18nParamLabel ? { label: t(n.dataset.i18nParamLabel) } : {});
        if (attr === "value") n.value = v; else n.setAttribute(attr, v);
      }));
    });
    const ratios = t("type.ratio");
    $$("option[data-i18n-ratio]").forEach((o) => { o.textContent = `${o.value} · ${ratios[o.value] || ""}`; });
    el.welcome.lang = "en"; // the approved Hero stays as it is
    const skip = $("#skip-link");
    if (skip) { skip.textContent = t("a11y.skip"); skip.lang = lang; }
  };

  /* ---------------------------------------------------------------------
     8. Floating companion — one bubble, event-based, priority-aware
        1 issue · 2 action feedback · 3 step intro · 4 tip · 5 idle
     --------------------------------------------------------------------- */
  const PRIO = { issue: 1, action: 2, intro: 3, tip: 4 };
  const HOLD = { 1: 14000, 2: 7000, 3: 9000, 4: 8000 };
  const comp = { char: null, msg: null, last: null, shownAt: 0, hideT: 0, moodT: 0, idleT: 0, tipsShown: {} };

  const portraitOf = (id) => {
    if (hero && !el.playground.hidden) { try { const u = hero.portrait(id); if (u) return u; } catch (_) {} }
    return CREW[id].img;
  };
  const setCompanionChar = (id) => {
    if (comp.char === id) return;
    comp.char = id;
    el.companion.dataset.char = id;
    el.buddyImg.src = portraitOf(id);
    el.buddy.setAttribute("aria-label", t("companion.show", { name: CREW[id].name, role: t(`crew.${id}`) }));
    if (motionOK()) { el.companion.classList.remove("is-arriving"); void el.companion.offsetWidth; el.companion.classList.add("is-arriving"); setTimeout(() => el.companion.classList.remove("is-arriving"), 650); }
  };
  const setMood = (mood, ms = 0) => {
    el.companion.dataset.mood = mood;
    clearTimeout(comp.moodT);
    if (ms) comp.moodT = setTimeout(() => { el.companion.dataset.mood = restingMood(); }, ms);
  };
  const restingMood = () => (comp.msg && comp.msg.tone === "attention" && !el.bubble.hidden ? "concerned" : "idle");
  const msgText = (m) => t(`say.${m.key}`, typeof m.params === "function" ? m.params() : (m.params || {}));
  const renderBubble = () => {
    const m = comp.msg; if (!m) return;
    el.bubbleWho.textContent = `${CREW[m.char].name} · ${t(`crew.${m.char}`)}`;
    el.bubbleText.textContent = msgText(m);
    el.companion.dataset.tone = m.tone || "";
    el.buddy.setAttribute("aria-label", t("companion.show", { name: CREW[m.char].name, role: t(`crew.${m.char}`) }));
  };
  const updateCompact = () => {
    el.companion.classList.toggle("is-compact", el.bubble.hidden && state.shaped && !el.artboard.hidden);
  };
  /** Show a line. A newer line replaces the current one unless an accessibility warning is still being read. */
  const say = (char, key, { params, prio = "action", tone = "", mood = "react", hold } = {}) => {
    const p = PRIO[prio] || 2;
    const cur = comp.msg;
    // a warning is never talked over by someone else; its owner may follow up (e.g. FAH reporting the fix)
    if (cur && !el.bubble.hidden && cur.prio === 1 && p > 1 && cur.char !== char && Date.now() - comp.shownAt < 6000) return;
    setCompanionChar(char);
    const wasOpen = !el.bubble.hidden;
    comp.msg = { char, key, params, prio: p, tone };
    if (p <= 3) comp.last = comp.msg;
    comp.shownAt = Date.now();
    renderBubble();
    el.bubble.hidden = false;
    if (wasOpen && motionOK()) { el.bubble.classList.remove("is-swap"); void el.bubble.offsetWidth; el.bubble.classList.add("is-swap"); }
    el.live.textContent = `${CREW[char].name}: ${el.bubbleText.textContent}`;
    setMood(mood, mood === "concerned" ? 0 : mood === "happy" ? 2100 : 1000);
    clearTimeout(comp.hideT);
    comp.hideT = setTimeout(hideBubble, hold || HOLD[p]);
    updateCompact();
  };
  const hideBubble = () => {
    clearTimeout(comp.hideT);
    el.bubble.hidden = true;
    el.companion.dataset.mood = "idle";
    updateCompact();
  };
  const reopenBubble = () => {
    const m = comp.last || comp.msg;
    if (m && m.char === contextChar()) say(m.char, m.key, { params: m.params, prio: ["", "issue", "action", "intro", "tip"][m.prio], tone: m.tone, mood: m.tone === "attention" ? "concerned" : "react" });
    else contextIntro();
  };
  /* Idle: after a quiet spell, one useful tip per context — never repeated */
  const armIdle = () => {
    clearTimeout(comp.idleT);
    comp.idleT = setTimeout(() => {
      if (el.playground.hidden || !el.bubble.hidden || !state.shaped) return;
      const ctx = contextKey();
      if (comp.tipsShown[ctx]) return;
      comp.tipsShown[ctx] = true;
      say(contextChar(), ctx === "components" ? "min.libTip" : `${contextChar()}.tip`, { prio: "tip", mood: "react" });
    }, 30000);
  };

  const contextKey = () => (!el.drawer.hidden ? "a11y" : libOn() ? "components" : state.flow === "guided" ? STEPS[state.step].id : state.category);
  const contextChar = () => (!el.drawer.hidden ? "fah" : libOn() ? "min" : state.flow === "guided" ? STEPS[state.step].char : CATEGORIES[state.category]);
  /** The line a character opens a context with. FAH speaks only from a finished audit. */
  const contextIntro = () => {
    const ctx = contextKey();
    if (ctx === "a11y") return fahSpeak();
    if (ctx === "components") return say("min", "min.lib", { prio: "intro", mood: "greet" });
    if (state.flow === "free") {
      const key = ctx === "effects" ? "min.freeEffects" : `${CATEGORIES[ctx]}.free`;
      return say(CATEGORIES[ctx], key, { prio: "intro", mood: "greet" });
    }
    if (ctx === "style") return say("pai", state.shaped ? "pai.introShaped" : "pai.intro", { prio: "intro", mood: "greet" });
    say(STEPS[state.step].char, `${STEPS[state.step].char}.intro`, { prio: "intro", mood: "greet" });
  };

  /* ---------------------------------------------------------------------
     9. Gated preview — the canvas only shows what the journey has reached
        reveal 0 clay · 1 structure (neutral) · 2 colour · 3 type · 4 shape · 5 a11y
     --------------------------------------------------------------------- */
  const previewState = () => state.reveal >= 2 ? state : { ...state, colors: { ...neutralFor(state.preset) }, overrides: { light: {}, dark: {} } };
  const neutralType = (node = el.frame) => {
    node.style.setProperty("--font-family-heading", SYSTEM_STACK);
    node.style.setProperty("--font-family-body", SYSTEM_STACK);
    node.style.setProperty("--font-family-accent", SYSTEM_STACK);
    node.style.setProperty("--font-weight-heading", "600");
    node.style.setProperty("--letter-spacing-heading", "-0.01em");
  };
  const renderCopy = () => ph.forEach((n) => { const v = t(state.reveal >= 3 ? n.dataset.i18n : n.dataset.phKey); if (n.textContent !== v) n.textContent = v; });

  let colorsNow = {}, audits = { light: [], dark: [] };
  const render = () => {
    const s = state, pv = previewState();
    applyTokens(el.frame, pv, s.mode);
    if (s.reveal < 3) neutralType();
    // the component library wears exactly what the canvas wears (same gating, same Light/Dark)
    applyTokens(el.libView, pv, s.mode);
    if (s.reveal < 3) neutralType(el.libView);
    el.libView.dataset.corner = s.corner;
    el.frame.dataset.corner = s.corner;
    el.frame.dataset.typeStage = s.reveal >= 3 ? "real" : "placeholder";
    el.frame.dataset.imgStage = s.reveal >= 2 ? "photo" : "slot";   // editorial photos arrive with colour; until then quiet slots
    renderCopy();
    colorsNow = deriveColors(s, s.mode);
    audits = auditBoth(s);
    el.minis.forEach((m) => {
      const p = PRESETS[m.dataset.preset];
      applyTokens(m, { ...pv, ...(s.reveal < 2 ? { colors: presetColors(m.dataset.preset) } : {}), preset: m.dataset.preset, fonts: { ...p.fonts }, radius: p.radius, density: p.density, shadow: p.shadow, typeAdv: {}, styleAdv: {}, radii: {}, shadowCustom: null, spaceBase: 4 }, "light");
    });
    const shape = deriveShape(s);
    ["font-family-heading", "font-family-body", "font-weight-heading", "letter-spacing-heading", "line-height-body"].forEach((k) => el.specimen.style.setProperty(`--${k}`, shape[k]));
    renderScales(); renderSemantic(); renderTokenRows(shape); renderChip();
    if (!el.drawer.hidden) renderDrawer();
    if (isPanelVisible("a11y")) renderFah();
    save();
  };

  const strip = (hex) => { const sc = makeScale(hex); return Object.keys(sc).map((k) => { const lbl = String(k).padStart(3, "0"); return `<span data-step="${lbl}" style="background:${sc[k]}" title="${lbl}: ${sc[k]}"></span>`; }).join(""); };
  const stripFrom = (sc, sourceStep) => Object.keys(sc).map((k) => { const lbl = String(k).padStart(3, "0"), src = +k === sourceStep; return `<span data-step="${lbl}"${src ? " data-source" : ""} style="background:${sc[k]}" title="${lbl}: ${sc[k]}${src ? ` — ${t("color.harmonizedShade")}` : ""}"></span>`; }).join("");
  const renderScales = () => {
    el.scaleP.innerHTML = strip(state.colors.primary); el.scaleP2.innerHTML = strip(state.colors.secondary);
    el.scaleT.innerHTML = state.tertiaryOn ? strip(state.colors.tertiary) : "";
    el.scaleN.innerHTML = stripFrom(neutralScale(state.colors));
  };
  const renderSemantic = () => {
    const c = colorsNow;
    const ROLES = [["background", "color-background-default"], ["surface", "color-surface-default"], ["text", "color-text-default"], ["muted", "color-text-muted"], ["border", "color-border-default"], ["interactive", "color-primary"], ["accent", "color-accent"]];
    const from = (role) => role === "accent" ? t(state.tertiaryOn ? "color.fromTertiary" : "color.fromSecondary") : role === "interactive" ? t("color.fromPrimary") : "";
    el.semanticMode.textContent = t(`canvas.${state.mode}`); el.statusMode.textContent = t(`canvas.${state.mode}`);
    el.semanticList.innerHTML = ROLES.map(([r, k]) => `<li><i style="background:${c[k]}"></i><b>${t(`color.role.${r}`)}</b><small>${from(r)}</small><code title="--${k}">${c[k].toUpperCase()}</code></li>`).join("");
    const bases = statusBases(state);
    el.statusList.innerHTML = STATUS_ROWS.map(([r, k]) =>
      `<div class="status-group"><p class="adv-cap status-cap">${t(`color.statusName.${r}`)}</p>` +
      `<div class="scale-strip" role="img" aria-label="${t("color.scaleLabelStatus", { name: t(`color.statusName.${r}`) })}">${stripFrom(makeScale(bases[k]), 500)}</div></div>`).join("");
  };
  const renderTokenRows = (shape) => {
    el.radiusScale.innerHTML = ["sm", "md", "lg", "xl"].map((k) => `<span>${k} ${shape[`radius-${k}`]}</span>`).join("");
    el.spaceScale.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<span>${i} · ${shape[`space-${i}`]}</span>`).join("");
  };
  const allFails = () => [...audits.light.filter((r) => !r.pass).map((r) => ({ ...r, mode: "light" })), ...audits.dark.filter((r) => !r.pass).map((r) => ({ ...r, mode: "dark" }))];
  const TOTAL = () => audits.light.length + audits.dark.length;   // the pairs actually audited for this preset
  const renderChip = () => {
    const f = allFails().length;
    el.auditChip.dataset.state = f ? "fail" : "pass";
    el.auditChipText.textContent = f ? t("a11y.chipFail", { count: f }) : t("a11y.chipPass");
    el.auditChip.setAttribute("aria-label", t("a11y.chipLabel", { status: f ? t("a11y.summaryFail", { count: f }) : t("a11y.summaryPass", { total: TOTAL() }) }));
  };

  /* ---------------------------------------------------------------------
     10. Layout: guided story panel ⇄ rail + inspector, canvas header
     --------------------------------------------------------------------- */
  const visiblePanels = () => state.flow === "guided" ? STEPS[state.step].panels : [state.category];
  const isPanelVisible = (p) => visiblePanels().includes(p);
  const pad2 = (n) => String(n).padStart(2, "0");
  let lastQ = "";

  /** Sliding selection pill for the Tool Rail (Figma motion 1855:1011). First placement is instant; later changes glide.
      Horizontal centring is CSS (left 50% / -50%), so the rail's own width transition never skews it. */
  const railInd = $("#rail-indicator");
  let railIndShown = false;
  const syncRailIndicator = () => {
    const on = el.railItems.find((b) => b.getAttribute("aria-pressed") === "true");
    railInd.parentElement.classList.toggle("has-indicator", !!on);
    if (!on) { railInd.classList.remove("is-on"); railIndShown = false; return; }
    const place = () => { railInd.style.transform = `translate(-50%, ${on.offsetTop}px)`; railInd.style.width = `${on.offsetWidth}px`; railInd.style.height = `${on.offsetHeight}px`; };
    if (railIndShown) return place();
    railInd.classList.add("no-anim"); place(); void railInd.offsetWidth; railInd.classList.remove("no-anim");
    railInd.classList.add("is-on"); railIndShown = true;
  };
  const syncLayout = () => {
    const s = state, guided = s.flow === "guided", st = STEPS[s.step];
    el.playground.dataset.flow = s.flow;
    el.workspace.classList.toggle("is-collapsed", !guided && !s.inspectorOpen);
    el.inspector.toggleAttribute("inert", !guided && !s.inspectorOpen);
    el.btnModeLabel.textContent = guided ? t("top.editFreely") : t("top.backToGuide");
    el.langBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

    // Region A — journey header
    el.storyCount.textContent = `${pad2(s.step + 1)} / 05`;
    el.storyGuide.textContent = t("story.with", { name: CREW[st.char].name });
    el.storyGuide.style.setProperty("--guide-dot", CREW[st.char].dot);
    el.storyTitle.textContent = t(`story.steps.${st.id}`);
    if (!el.steps.children.length) el.steps.innerHTML = STEPS.map((x, i) => `<li><button type="button" class="step-dot" data-step="${i}"></button></li>`).join("");
    $$(".step-dot", el.steps).forEach((b, i) => {   // updated in place, so focus and tooltips survive re-renders
      const x = STEPS[i], stt = i === s.step ? "current" : i <= s.reached ? "done" : "todo", title = t(`story.steps.${x.id}`);
      b.dataset.state = stt; b.disabled = i > s.reached;
      if (i === s.step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.setAttribute("aria-label", `${t("story.stepLabel", { n: i + 1, title })}${stt === "done" ? ` (${t("story.visited")})` : ""}`);
      b.dataset.tip = `${pad2(i + 1)} · ${title}`;
    });
    // Region B — one question
    const qKey = st.id;
    el.qMain.textContent = t(`story.q.${qKey}`);
    el.qSub.textContent = t(`story.q.${qKey}Sub`);
    if (guided && lastQ !== qKey) { lastQ = qKey; [el.qMain, el.qSub].forEach((n) => { n.classList.remove("is-new"); void n.offsetWidth; n.classList.add("is-new"); }); }
    // free header
    const libv = libOn();
    el.inspTitle.textContent = libv ? t("lib.title") : t(`cat.${s.category}`);
    el.railItems.forEach((b) => b.setAttribute("aria-pressed", String(!guided && (libv ? b.dataset.cat === "components" : b.dataset.cat === s.category))));
    syncRailIndicator();

    const vis = visiblePanels();
    el.panels.forEach((p) => { p.hidden = !vis.includes(p.dataset.panel); });
    el.btnBack.disabled = s.step === 0;
    el.btnNextLabel.textContent = s.step === 4 ? t("foot.finish") : s.step === 0 && !s.shaped ? t("foot.shape") : t("foot.next");

    // canvas header
    const clay = !s.shaped;
    el.btnPreview.disabled = clay; el.btnView.disabled = clay;
    el.previewLabel.textContent = t(`canvas.${s.preview}`);
    $$("[data-preview]", el.previewMenu).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.preview === s.preview)));
    $$("[data-mode]", el.viewMenu).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === s.mode)));
    $$("[data-zoom]", el.viewMenu).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.zoom === s.zoom)));
    el.fsLabel.textContent = document.fullscreenElement ? t("canvas.exitFullscreen") : t("canvas.fullscreen");
    const active = previewSet(s.preset);
    [el.previews, el.premium, el.playful, el.minimal].forEach((set) => { for (const k in set) set[k].hidden = set !== active || k !== s.preview; });
    el.auditChip.hidden = clay;
    el.stage.classList.toggle("is-clay", clay);

    // Component library: browser in the inspector column, docs-style detail on the canvas
    el.playground.dataset.lib = libv ? "on" : "off";
    el.libBrowser.hidden = !libv; el.inspScroll.hidden = libv;
    el.libView.hidden = !libv; el.stageScroll.hidden = libv;
    el.libReturn.hidden = !(libv && guided);
    el.libReturnStep.textContent = `${pad2(s.step + 1)} · ${t(`story.steps.${st.id}`)}`;
    el.btnLibEntry.hidden = !(guided && !libv);
    el.previewWrap.hidden = libv; el.libCrumb.hidden = !libv;
    el.zoomGroup.forEach((n) => { n.hidden = libv || s.viewport === "mobile"; });
    // Viewport switcher — scoped to the generated site (Landing / Dashboard); unavailable in the Component Library
    const vpOff = libv || clay;
    el.vpSwitch.dataset.vp = s.viewport;
    el.vpSwitch.classList.toggle("is-unavailable", vpOff);
    el.vpBtns.forEach((b) => {
      const name = t(b.dataset.vp === "mobile" ? "top.vpMobile" : "top.vpDesktop");
      b.setAttribute("aria-pressed", String(b.dataset.vp === s.viewport));
      if (vpOff) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled");
      b.dataset.tip = libv ? `${name} · ${t("top.vpUnavailable")}` : name;
    });
    el.miFullscreen.hidden = libv || !el.stageScroll.requestFullscreen;
  };

  const syncControls = () => {
    const s = state, R = resolved(s), shape = deriveShape(s);
    if (document.activeElement !== el.name) el.name.value = s.name;
    el.presetCards.forEach((b) => { const on = s.chosen && b.dataset.preset === s.preset; b.setAttribute("aria-checked", String(on)); b.tabIndex = on || (!s.chosen && b.dataset.preset === "premium") ? 0 : -1; });
    const kept = Object.keys(s.touched).filter((k) => ["colors", "fonts", "radius", "density", "shadow", "type", "style", "radii"].includes(k));
    el.keepNote.hidden = !(s.chosen && kept.length);
    el.keepText.textContent = t("style.keep", { list: listify(kept.map((k) => t(`style.touched.${k}`))) });
    $$("[data-cardborder]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cardborder === R.cardBorder)));
    setSlider("border-width", R.borderWidth, `${R.borderWidth}px`);
    setSlider("button-weight", R.buttonWeight, String(R.buttonWeight));

    for (const k in s.colors) { $(`#pick-${k}`).value = s.colors[k]; const h = $(`#hex-${k}`); if (document.activeElement !== h) h.value = s.colors[k].toUpperCase(); }
    el.palettes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === s.colors.primary && b.dataset.s === s.colors.secondary && (!s.tertiaryOn || b.dataset.t === s.colors.tertiary))));
    el.tertiarySwitch.setAttribute("aria-checked", String(s.tertiaryOn));
    el.tertiaryBody.hidden = !s.tertiaryOn;
    el.tertiaryHint.textContent = t(s.tertiaryOn ? "color.tertiaryOnHint" : "color.tertiaryOffHint");

    $$(".pair", el.pairs).forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.h === s.fonts.heading && b.dataset.b === s.fonts.body)); $(".pair-name", b).textContent = t(`type.pair.${b.dataset.pair}`); });
    el.fontHeading.value = s.fonts.heading; el.fontBody.value = s.fonts.body;
    const accentDefault = PRESETS[s.preset].accentFont;
    el.accentField.hidden = !accentDefault;                     // only presets with an accent role (Playful) show it
    if (accentDefault) el.fontAccent.value = s.typeAdv.accentFont || accentDefault;
    setSlider("heading-weight", R.headingWeight, String(R.headingWeight));
    el.typeRatio.value = String(R.typeRatio);
    setSlider("line-height", R.lineHeight, R.lineHeight.toFixed(2));
    setSlider("tracking", R.tracking, `${R.tracking.toFixed(3)}em`);

    setSlider("radius", s.radius, `${s.radius}px`);
    $$("button[data-corner]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.corner === s.corner)));
    el.radiusDemo.dataset.corner = s.corner;
    el.radiusDemoItems.forEach((d) => { d.style.borderRadius = shape[`radius-${d.dataset.rd}`]; });
    el.cornerHint.textContent = s.corner === "smooth" ? (CSS.supports("corner-shape", "squircle") ? t("shape.smoothOn") : t("shape.smoothFallback")) : t("shape.standardHint");
    setSlider("r-button", R.rButton, `${R.rButton}px`, s.radii.button == null);
    setSlider("r-input", R.rInput, `${R.rInput}px`, s.radii.input == null);
    setSlider("r-card", R.rCard, `${R.rCard}px`, s.radii.card == null);

    $$("[data-density]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.density === s.density)));
    $$("[data-shadow]").forEach((b) => b.setAttribute("aria-pressed", String(!s.shadowCustom && b.dataset.shadow === s.shadow)));
    el.shadowHint.textContent = t(`effects.hint.${s.shadowCustom ? "custom" : s.shadow}`);
    setSlider("space-base", s.spaceBase, `${s.spaceBase}px`);
    const sh = R.shadow;
    setSlider("sh-y", sh.y, `${sh.y}px`); setSlider("sh-blur", sh.blur, `${sh.blur}px`); setSlider("sh-spread", sh.spread, `${sh.spread}px`); setSlider("sh-opacity", sh.opacity, sh.opacity.toFixed(2));

    $$(".adv-toggle").forEach((b) => { const open = !!s.advanced[b.dataset.adv]; b.setAttribute("aria-expanded", String(open)); $(`#adv-${b.dataset.adv}`).hidden = !open; });
  };
  const setSlider = (id, v, text, auto = false) => {
    const i = $(`#${id}`);
    if (document.activeElement !== i) i.value = v;
    const min = +i.min, max = +i.max;
    i.style.setProperty("--fill", `${((+i.value - min) / (max - min)) * 100}%`);
    i.dataset.auto = String(auto);
    $(`#${id}-out`).textContent = text + (auto ? ` · ${t("shape.auto")}` : "");
  };

  const update = () => { syncControls(); syncLayout(); render(); };

  /* ---------------------------------------------------------------------
     11. Canvas: clay → first interface, zoom, highlights, fullscreen
     --------------------------------------------------------------------- */
  let clay = null, clayTried = false, shaping = null;
  const ensureClay = () => {
    if (clayTried) return clay;
    clayTried = true;
    try { clay = window.MoldableHero && window.MoldableHero.mountClay ? window.MoldableHero.mountClay({ canvas: el.clayCanvas }) : null; } catch (_) { clay = null; }
    if (!clay) {
      el.clayCanvas.hidden = true; el.clayFallback.hidden = false;
      el.clayFallback.src = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200"><defs><radialGradient id="g" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#EFE3F1"/><stop offset=".55" stop-color="#ABC2E5"/><stop offset="1" stop-color="#F5BDD2"/></radialGradient></defs><ellipse cx="120" cy="186" rx="70" ry="9" fill="#40496f" opacity=".15"/><path d="M120 22c52 0 96 30 96 76s-40 78-96 78-96-28-96-74 44-80 96-80z" fill="url(#g)"/></svg>');
    }
    return clay;
  };
  const showClay = () => {
    el.clayWrap.hidden = false; el.clayWrap.classList.remove("is-gone", "is-shaping");
    el.artboard.hidden = true;
    const c = ensureClay();
    if (c) { c.reset(); c.resize && c.resize(); if (motionOK()) c.start(); else c.renderOnce(); }
    updateCompact();
  };
  const showArtboardNow = () => { el.clayWrap.hidden = true; clay && clay.stop(); el.artboard.hidden = false; fitZoomNow(); updateCompact(); };

  /** The one-time milestone: the clay is pressed into a neutral, unfinished interface. Never blocks input. */
  const shapeClay = () => {
    if (state.shaped) return shaping || Promise.resolve();
    state.shaped = true; state.reveal = Math.max(state.reveal, 1);
    update();
    const c = clay;
    el.clayWrap.classList.add("is-shaping");
    shaping = (c && motionOK() ? c.shape() : Promise.resolve()).then(() => {
      el.clayWrap.classList.add("is-gone");
      el.artboard.hidden = false; fitZoomNow();
      if (motionOK()) {
        let i = 0;
        $$(".pv-nav, .pv-hero > *, .pv-card, .pv-strip, .pv-footer, .pv-side, .pv-stat-card, .pvp-nav, .pvp-hero > *, .pvp-story > *, .pvp-statement, .pvp-item, .pvp-footer, .pvp-side, .pvp-metric, .pvp-panel, .pfl-nav, .pfl-hero-copy > *, .pfl-hero-art > *, .pfl-sec-head, .pfl-card, .pfl-count, .pfl-statement-text, .pfl-tile, .pfd-nav, .pfd-head, .pfd-kpi, .pfd-card, .pfd-proj, .pfd-side, .mnl-nav, .mnl-meta, .mnl-line, .mnl-hero-media, .mnl-sec-head, .mnl-proj, .mnl-row, .mnl-philo-main, .mnl-step, .mnd-side, .mnd-head, .mnd-kpi, .mnd-card", currentPreview()).forEach((n) => n.style.setProperty("--i", String(i++ % 14)));
        el.artboard.classList.add("is-forming"); el.frame.classList.add("is-forming");
        setTimeout(() => { el.artboard.classList.remove("is-forming"); el.frame.classList.remove("is-forming"); }, 1300);
      }
      setTimeout(() => { el.clayWrap.hidden = true; c && c.stop(); updateCompact(); }, motionOK() ? 320 : 0);
      shaping = null;
    });
    return shaping;
  };

  /** Raise what the canvas shows. Each threshold gets its own small, non-blocking moment. */
  const bumpReveal = (n) => {
    const prev = state.reveal;
    if (n <= prev || !state.shaped) return;
    state.reveal = n;
    const after = shaping || Promise.resolve();
    render();
    if (prev < 2 && n >= 2) after.then(() => tint());
    if (prev < 3 && n >= 3) after.then(() => typeIn());
    syncLayout();
  };
  const tint = () => {
    if (!motionOK()) return;
    applyTokens(el.frame, { ...state, colors: { ...neutralFor(state.preset) }, overrides: { light: {}, dark: {} } }, state.mode);
    if (state.reveal < 3) neutralType();
    void el.frame.offsetWidth;
    el.frame.classList.add("is-tinting");
    render();
    splash(state.colors.primary, 0.5, 0.4);
    setTimeout(() => el.frame.classList.remove("is-tinting"), 900);
  };
  const typeIn = () => {
    if (!motionOK()) return;
    ph.forEach((n, i) => n.style.setProperty("--i", String(i)));
    el.frame.classList.remove("is-typing"); void el.frame.offsetWidth; el.frame.classList.add("is-typing");
    setTimeout(() => el.frame.classList.remove("is-typing"), 1000);
  };
  const splash = (color, x = 0.5, y = 0.45) => {
    if (!motionOK() || el.artboard.hidden) return;
    const d = document.createElement("span");
    d.className = "fx-splash";
    d.style.cssText = `left:${x * 100}%;top:${y * 100}%;background:radial-gradient(closest-side, ${color}, transparent)`;
    el.fx.appendChild(d); setTimeout(() => d.remove(), 1200);
  };

  /** Contextual highlight on the components a change affects. Throttled; never more than a few outlines. */
  const FLASH = {
    color: ".pv-btn-primary, .pv-badge-accent, .pv-icon, .pv-stat strong, .pvp-btn-solid, .pvp-index b, .pvp-side-item.is-active, .pvp-badge-accent, .pfl-btn-primary, .pfl-card-a, .pfl-art-tile, .pfd-kpi, .mn-btn-solid, .mnd-nav-item.is-active, .mnd-seg-btn.is-on, .mnd-bar[aria-pressed=true] i",
    type: ".pv-h1, .pv-h2, .pv-lede, .pv-stat-card strong, .pv-typescale, .pvp-display, .pvp-h2, .pvp-quote p, .pvp-h1, .pvp-typescale, .pfl-display, .pfl-h2, .pfl-statement-text, .pfd-h1, .mnl-display, .mnl-h2, .mnl-statement, .mnd-h1",
    radius: ".pv-btn, .pv-card, .pv-input, .pvp-btn, .pvp-img, .pvp-panel, .pvp-input, .pfl-btn, .pfl-card, .pfl-tile, .pfd-kpi, .pfd-card, .mn-btn, .mn-img, .mnd-kpi, .mnd-card",
    density: ".pv-features, .pv-stats-grid, .pv-form-grid, .pvp-col-grid, .pvp-metrics, .pvp-form, .pfl-cards, .pfl-grid, .pfd-kpis, .mnl-work-grid, .mnl-steps, .mnd-kpis, .mnd-grid",
    shadow: ".pv-card, .pvp-hero-detail .pvp-img, .pvp-panel, .pfl-card, .pfl-tile, .pfd-card, .mnd-kpi, .mnd-card",
  };
  const flashT = {};
  const flash = (kind) => {
    if (!state.shaped || el.artboard.hidden || flashT[kind]) return;
    const nodes = $$(FLASH[kind], currentPreview()).slice(0, 6);
    nodes.forEach((n) => n.classList.add("pv-flash"));
    flashT[kind] = setTimeout(() => {
      nodes.forEach((n) => { n.classList.remove("pv-flash"); n.classList.add("pv-flash-out"); });
      setTimeout(() => nodes.forEach((n) => n.classList.remove("pv-flash-out")), 600);
      flashT[kind] = null;
    }, 650);
  };

  const FRAME_W = 1200, MOBILE_W = 390;
  let zoomRaf = 0, zoomNow = 1;
  const fitZoom = () => { cancelAnimationFrame(zoomRaf); zoomRaf = requestAnimationFrame(fitZoomNow); };
  const fitZoomNow = () => {
    if (el.artboard.hidden) return;
    el.stageScroll.classList.toggle("is-vp-mobile", state.viewport === "mobile");
    const cs = getComputedStyle(el.stageScroll);
    const availW = el.stageScroll.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = el.stageScroll.clientHeight - parseFloat(cs.paddingTop) - 24;
    const availHMobile = el.stageScroll.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const mobile = state.viewport === "mobile";
    el.artboard.dataset.viewport = state.viewport;
    if (mobile) {
      // A real 390px-wide container (the frame is a CSS container), so the templates' container queries apply.
      // The page scrolls inside a phone-height frame; zoom only shrinks it if the canvas is narrower than 390px.
      const zm = Math.max(0.25, Math.min(1, availW / MOBILE_W));
      const h = Math.max(320, Math.round(availHMobile / zm));
      zoomNow = zm;
      el.frame.style.height = `${h}px`;
      el.frame.style.transform = `scale(${zm})`;
      el.sizer.style.width = `${MOBILE_W * zm}px`; el.sizer.style.height = `${h * zm}px`;
      el.zoomLabel.textContent = `${Math.round(zm * 100)}%`;
      return;
    }
    el.frame.style.height = "";
    const fh = el.frame.offsetHeight || 800;
    let z = 1;
    if (state.zoom === "width") z = Math.min(1, availW / FRAME_W);
    else if (state.zoom === "screen") z = Math.min(1, availW / FRAME_W, availH / fh);
    z = Math.max(0.25, z);
    zoomNow = z;
    el.frame.style.transform = `scale(${z})`;
    el.sizer.style.width = `${FRAME_W * z}px`; el.sizer.style.height = `${fh * z}px`;
    el.zoomLabel.textContent = `${Math.round(z * 100)}%`;
  };
  const toggleFullscreen = () => {
    if (!state.shaped) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.stageScroll.requestFullscreen) el.stageScroll.requestFullscreen().catch(() => { state.zoom = "screen"; syncLayout(); fitZoomNow(); });
    else { state.zoom = "screen"; syncLayout(); fitZoomNow(); }
  };

  /* Team moment — FAMAI makes a colour gesture, MIN settles the shapes. Short, skippable, never blocks input. */
  const playTeam = () => {
    state.teamPlayed = true; save();
    say("min", "min.team", { prio: "action", mood: "happy" });
    if (!motionOK() || el.artboard.hidden) return;
    const add = (id, cls) => { const i = document.createElement("img"); i.className = `fx-char ${cls}`; i.alt = ""; i.src = portraitOf(id); el.fx.appendChild(i); setTimeout(() => i.remove(), 1700); };
    add("famai", "fx-famai");
    setTimeout(() => splash(accentOf(state), 0.72, 0.3), 260);
    setTimeout(() => add("min", "fx-min"), 380);
    setTimeout(() => {
      let i = 0; $$(".pv-card, .pv-btn, .pv-stat-card, .pv-strip, .pvp-btn, .pvp-item, .pvp-panel, .pfl-card, .pfl-btn, .pfl-tile, .pfd-kpi, .pfd-card, .mn-btn, .mn-img, .mnd-kpi, .mnd-card", currentPreview()).forEach((n) => n.style.setProperty("--i", String(i++ % 10)));
      el.frame.classList.remove("is-settling"); void el.frame.offsetWidth; el.frame.classList.add("is-settling");
      setTimeout(() => el.frame.classList.remove("is-settling"), 1200);
    }, 620);
  };
  let teamTimer;
  const maybeTeam = () => {
    if (state.teamPlayed || state.flow !== "guided" || state.step !== 3) return;
    clearTimeout(teamTimer); teamTimer = setTimeout(playTeam, 1600);
  };

  /* ---------------------------------------------------------------------
     12. Journey navigation
     --------------------------------------------------------------------- */
  const enterStep = (n, { speak = true } = {}) => {
    clearTimeout(quietT);
    state.step = n; state.reached = Math.max(state.reached, n);
    if (state.shaped) bumpReveal(n + 1);
    update();
    el.inspScroll.scrollTop = 0;
    if (speak) contextIntro();
  };
  const next = () => {
    if (state.step === 0 && !state.shaped) { applyPreset(state.preset); return; }   // Next with nothing chosen = the default style, complete
    if (state.step < 4) enterStep(state.step + 1);
    else { setFlow("free"); toast(t("toast.done")); }
  };
  const back = () => { if (state.step > 0) enterStep(state.step - 1); };
  const goStep = (n) => { if (n <= state.reached && n !== state.step) enterStep(n); };
  const firstShape = () => {
    shapeClay();
    syncControls();
    say("pai", "pai.shaping", { prio: "action", mood: "happy" });
    (shaping || Promise.resolve()).then(() => setTimeout(() => { if (contextKey() === "style") say("pai", "pai.shaped", { prio: "action", mood: "react" }); }, motionOK() ? 900 : 0));
  };

  const setFlow = (flow) => {
    if (state.flow === flow) return;
    state.flow = flow;
    if (flow === "guided") state.library = false;          // "Back to guide" means the guide, not the library
    if (flow === "free") {
      if (!state.shaped) { state.chosen = true; if (!state.touched.colors) state.colors = presetColors(state.preset); shapeClay(); }
      const cats = { style: "style", color: "color", type: "type", shape: "shape", a11y: state.category || "style" };
      state.category = cats[STEPS[state.step].id] || "style";
      state.inspectorOpen = true;
      bumpReveal(5);
    }
    update();
    contextIntro();
  };
  const setCategory = (cat) => {
    const changed = cat !== state.category || state.library;
    state.category = cat; state.inspectorOpen = true; state.library = false;
    update();
    if (changed) { el.inspScroll.scrollTop = 0; contextIntro(); }
  };

  /* ---------------------------------------------------------------------
     13. Edits — each one updates tokens, the canvas, the audit and the companion
     --------------------------------------------------------------------- */
  const touch = (k) => { state.touched[k] = true; };
  const clearOverrides = () => { state.overrides = { light: {}, dark: {} }; state.lastFix = null; };
  /** Slider reactions wait for a quiet moment — no bubble per pixel. */
  let quietT;
  const whenQuiet = (fn, ms = 550) => {
    clearTimeout(quietT);
    const ctx = contextKey();
    quietT = setTimeout(() => { if (contextKey() === ctx) fn(); }, ms); // a late reaction never talks over a new context
  };

  const applyPreset = (id, { full = false } = {}) => {
    const p = PRESETS[id], tch = state.touched;
    state.preset = id; state.chosen = true;
    if (full) state.touched = {};
    const keep = (k) => !full && tch[k];
    if (!keep("fonts")) state.fonts = { ...p.fonts };
    if (!keep("radius")) state.radius = p.radius;
    if (!keep("density")) state.density = p.density;
    if (!keep("shadow")) { state.shadow = p.shadow; state.shadowCustom = null; }
    if (!keep("type")) state.typeAdv = {};
    if (!keep("style")) state.styleAdv = {};
    if (!keep("radii")) state.radii = {};
    if (!tch.colors) { state.colors = presetColors(id); clearOverrides(); }   // a preset's palette never overrides the user's colours
    if (!state.shaped) { firstShape(); update(); return; }
    update();
    say("pai", full ? "pai.full" : `pai.${id}`, { params: { preset: p.label }, mood: "react" });
    flash("radius");
  };

  const colorLine = (key) => {
    const hueEn = hueName(state.colors[key]);
    const hue = t(`hue.${hueEn}`);
    return { hue, Hue: cap(hue) };
  };
  /** FAMAI reacts; if the change made something hard to read, the reaction says so (issue outranks praise). */
  const afterColor = (key, palette) => {
    if (state.reveal < 2 && state.shaped) bumpReveal(2);
    const fails = allFails().length;
    if (fails) say("famai", "famai.issue", { prio: "issue", tone: "attention", mood: "concerned" });
    else if (palette) say("famai", "famai.palette", { params: () => ({ palette: t(`color.palette.${palette}`) }), mood: "react" });
    else say("famai", `famai.${key}`, { params: () => colorLine(key), mood: "react" });
    flash("color");
  };
  const setColor = (key, hex, { fromTyping = false, quiet = false } = {}) => {
    const n = normalizeHex(hex);
    if (!n) return false;
    if (state.colors[key] === n) return true;
    state.colors[key] = n;
    touch("colors");
    clearOverrides();
    if (!fromTyping) $(`#hex-${key}`).value = n.toUpperCase();
    syncControls(); render();
    if (quiet) whenQuiet(() => afterColor(key)); else afterColor(key);
    return true;
  };

  const setFonts = (heading, body, pairId) => {
    state.fonts = { heading, body }; touch("fonts");
    update(); flash("type");
    if (body === "Fraunces") return say("act", "act.serifBody", { mood: "react" });
    if (body === "Noto Sans Thai" && !pairId) return say("act", "act.thai", { mood: "react" });
    if (pairId) say("act", "act.pair", { params: () => ({ pair: t(`type.pair.${pairId}`) }), mood: "react" });
    else say("act", "act.font", { params: { font: heading }, mood: "react" });
  };

  const radiusLine = () => (state.radius === 0 ? "min.sharp" : state.radius >= 14 ? "min.soft" : "min.mid");

  /* ---------------------------------------------------------------------
     14. FAH — real contrast check, reviewable fixes, honest wording
     --------------------------------------------------------------------- */
  const pairName = (r) => t(`a11y.pair.${r.id}`);
  const fahSpeak = () => {
    const f = allFails();
    if (!f.length) say("fah", "fah.pass", { prio: "intro", tone: "success", mood: "happy" });
    else say("fah", "fah.fail", { params: () => ({ pair: pairName(f[0]) }), prio: "issue", tone: "attention", mood: "concerned" });
  };
  const itemHTML = (r, mode, { fixBtn = false, showMode = false } = {}) => `
      <li class="a11y-item ${r.pass ? "" : "is-fail"}">
        <div class="a11y-row">
          <span class="a11y-pair" aria-hidden="true"><i style="background:${r.fgHex}"></i><i style="background:${r.bgHex}"></i></span>
          <span class="a11y-name">${pairName(r)}${showMode ? ` <small>· ${t(`a11y.${mode}`)}</small>` : ""}</span>
          <span class="a11y-ratio">${fmt(r.ratio)}:1</span>
          <span class="tag a11y-status ${r.pass ? "tag-success" : "tag-error"}">${t(r.pass ? "a11y.pass" : "a11y.fail")}</span>
        </div>
        ${r.pass ? "" : `
        <p class="a11y-detail">${t("a11y.detail", { fg: `<b>${r.fgHex}</b>`, bg: `<b>${r.bgHex}</b>`, ratio: fmt(r.ratio), kind: t(`a11y.kind.${r.kind}`), min: r.min })}</p>
        ${r.suggestion ? `<div class="a11y-fix">
          <span class="a11y-fix-note"><i class="a11y-fix-swatch" style="background:${r.suggestion}" aria-hidden="true"></i>${t("a11y.suggest", { token: `<code>${r.fixToken}</code>`, hex: r.suggestion, ratio: fmt(contrast(r.suggestion, r.fixToken === r.bg ? r.fgHex : r.bgHex)) })}</span>
          ${fixBtn ? `<button type="button" class="btn btn-default btn-sm" data-fix="${r.id}" data-fix-mode="${mode}">${t("a11y.applyFix")}</button>` : ""}</div>`
        : `<p class="a11y-fix-note">${t("a11y.noFix")}</p>`}`}
      </li>`;
  const changesHTML = () => {
    const lf = state.lastFix; if (!lf || !lf.changes.length) return "";
    return `<div class="fah-changes" role="status"><b>${t("a11y.changed", { count: lf.changes.length })}</b>
      <ul>${lf.changes.map((c) => `<li><span class="fah-swatches"><i style="background:${c.from}"></i>→<i style="background:${c.to}"></i></span><span><b>${c.token}</b> · ${t(`a11y.${c.mode}`)}<br>${c.from} → ${c.to}</span></li>`).join("")}</ul>
      <button type="button" class="btn btn-text btn-sm" data-undo-fix>${t("a11y.undo")}</button></div>`;
  };
  const untestedHTML = () => `<details class="a11y-untested"><summary>${t("a11y.untested")}</summary><ul>${t("a11y.untestedItems").map((x) => `<li>${x}</li>`).join("")}</ul><p>${t("a11y.notFull")}</p></details>`;

  /** Guided step 5: summary first; the full checklist lives in the on-demand details. */
  const renderFah = () => {
    const f = allFails(), total = TOTAL(), passed = total - f.length;
    el.fahResult.innerHTML = `
      <div class="fah-stats">
        <div class="fah-stat"><strong>${total}</strong><span>${t("a11y.checked")}</span></div>
        <div class="fah-stat is-good"><strong>${passed}</strong><span>${t("a11y.passing")}</span></div>
        <div class="fah-stat ${f.length ? "is-bad" : ""}"><strong>${f.length}</strong><span>${t("a11y.attention")}</span></div>
      </div>
      <p class="fah-summary">${f.length ? t("a11y.summaryFail", { count: f.length }) : t("a11y.summaryPass", { total })}</p>
      ${f.some((r) => r.suggestion) ? `<div class="fah-fixbar"><button type="button" class="btn btn-primary btn-sm" data-fix-all>${t("a11y.fix")}</button><p class="fah-note">${t("a11y.fixNote")}</p></div>` : ""}
      ${f.length ? `<div class="fah-group"><h4>${t("a11y.issues")}</h4><ul class="a11y-list">${f.map((r) => itemHTML(r, r.mode, { showMode: true })).join("")}</ul></div>` : ""}
      ${changesHTML()}
      <div class="fah-actions">
        <button type="button" class="btn btn-default btn-sm" data-open-audit>${t("a11y.viewAll")}</button>
        ${f.length ? `<button type="button" class="btn btn-default btn-sm" data-refine>${t("a11y.refine")}</button>` : `<button type="button" class="btn btn-default btn-sm" data-fullscreen>${t("a11y.preview")}</button>`}
        <button type="button" class="btn btn-default btn-sm" data-export>${t(f.length ? "a11y.exportAnyway" : "a11y.export")}</button>
      </div>
      <p class="fah-note">${t("a11y.notFull")}</p>`;
  };
  const renderDrawer = () => {
    const f = allFails();
    el.drawerSub.textContent = f.length ? t("a11y.drawerSubFail", { count: f.length, total: TOTAL() }) : t("a11y.drawerSubPass", { total: TOTAL() });
    el.drawerBody.innerHTML = `
      ${f.some((r) => r.suggestion) ? `<button type="button" class="btn btn-primary btn-sm" data-fix-all>${t("a11y.fixAll")}</button>` : ""}
      ${changesHTML()}
      ${["light", "dark"].map((m) => `<div class="fah-group"><h4>${t(m === "light" ? "a11y.lightTheme" : "a11y.darkTheme")} <span class="tag a11y-status ${audits[m].every((r) => r.pass) ? "tag-success" : "tag-error"}">${audits[m].filter((r) => r.pass).length}/${audits[m].length}</span></h4>
        <ul class="a11y-list">${audits[m].map((r) => itemHTML(r, m, { fixBtn: true })).join("")}</ul></div>`).join("")}
      ${untestedHTML()}`;
  };

  /** Apply suggestions for failing pairs (all, or one), re-audit, and record a reviewable change list. */
  const applyFixes = (only) => {
    const before = JSON.parse(JSON.stringify(state.overrides));
    const changes = [];
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (const mode of ["light", "dark"]) {
        if (only && only.mode !== mode) continue;
        runAudit(deriveColors(state, mode)).forEach((r) => {
          if (r.pass || !r.suggestion || (only && only.id !== r.id)) return;
          state.overrides[mode][r.fixToken] = r.suggestion; changed = true;
          const prev = changes.find((c) => c.mode === mode && c.token === r.fixToken);
          if (prev) prev.to = r.suggestion; else changes.push({ mode, token: r.fixToken, from: r.fixToken === r.bg ? r.bgHex : r.fgHex, to: r.suggestion });
        });
      }
      if (!changed || only) break;
    }
    if (!changes.length) return;
    const prevFix = state.lastFix;
    state.lastFix = { before: prevFix ? prevFix.before : before, changes: [...(prevFix ? prevFix.changes : []), ...changes] };
    render(); // re-runs the real audit
    const left = allFails().length;
    if (!left) say("fah", "fah.fixed", { prio: "action", tone: "success", mood: "happy" });
    else say("fah", "fah.partial", { params: { count: left }, prio: "issue", tone: "attention", mood: "concerned" });
    toast(t("toast.fahUpdated", { count: changes.length }));
  };
  const undoFixes = () => {
    if (!state.lastFix) return;
    state.overrides = state.lastFix.before; state.lastFix = null;
    render();
    const f = allFails();
    if (f.length) say("fah", "fah.fail", { params: () => ({ pair: pairName(allFails()[0] || f[0]) }), prio: "issue", tone: "attention", mood: "concerned" });
    else say("fah", "fah.undone", { prio: "action", mood: "react" });
    toast(t("toast.fahUndone"));
  };

  let drawerReturn = null;
  const toggleDrawer = (open = el.drawer.hidden) => {
    if (open === !el.drawer.hidden) return;
    el.drawer.hidden = !open;
    el.stage.classList.toggle("drawer-open", open);
    el.auditChip.setAttribute("aria-expanded", String(open));
    if (open) { drawerReturn = document.activeElement; renderDrawer(); el.btnDrawerClose.focus(); fahSpeak(); }
    else { (drawerReturn && drawerReturn.isConnected && !drawerReturn.closest("[hidden]") ? drawerReturn : el.auditChip).focus(); if (contextChar() !== comp.char) contextIntro(); }
  };

  /* ---------------------------------------------------------------------
     15. Export
     --------------------------------------------------------------------- */
  const dsName = () => state.name.trim() || t("top.defaultName");
  const buildExport = () => {
    const s = state;
    const light = deriveColors(s, "light"), dark = deriveColors(s, "dark"), shape = deriveShape(s);
    const stamp = new Date().toISOString();
    const both = auditBoth(s);
    const unresolved = [...both.light.filter((r) => !r.pass).map((r) => `light · ${r.name} ${fmt(r.ratio)}:1 (needs ${r.min}:1)`), ...both.dark.filter((r) => !r.pass).map((r) => `dark · ${r.name} ${fmt(r.ratio)}:1 (needs ${r.min}:1)`)];
    const lines = (obj) => Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join("\n");
    // Primitive palettes — the shades the Colors inspector shows (50–950). Tertiary only when enabled; Neutral from background → text.
    const brand = ["primary", "secondary", ...(s.tertiaryOn ? ["tertiary"] : [])];
    const palette = Object.fromEntries([...brand.flatMap((r) => Object.entries(makeScale(s.colors[r])).map(([k, v]) => [`color-${r}-${k}`, v])),
      ...Object.entries(neutralScale(s.colors)).map(([k, v]) => [`color-neutral-${k}`, v]),
      ...(() => { const bases = statusBases(s); return STATUS_ROWS.flatMap(([, k]) => Object.entries(makeScale(bases[k])).map(([n, v]) => [`color-${k}-${n}`, v])); })()]);
    // Developer CSS (Tailwind v4) — serialized from the SAME resolved semantic manifest as the Figma "Colors" collection
    const figma = buildFigma(s);
    const css = devCss(figma, { head: `/* ${dsName()} — generated by Moldable Design System Studio (${PRESETS[s.preset].label}${customized() ? ", edited" : ""}) · ${stamp} */\n` +
      (unresolved.length ? `/* Unresolved contrast issues:\n${unresolved.map((u) => ` *   ${u}`).join("\n")}\n */\n` : `/* Contrast checks: all ${TOTAL()} pass (light + dark). Not a full WCAG conformance claim. */\n`),
      shape: lines(shape) });
    const typeOf = (k) => k.startsWith("color-") || k === "card-border" ? "color" : k.startsWith("font-family") ? "fontFamily" : k.startsWith("font-weight") ? "fontWeight" : k.startsWith("shadow") ? "shadow" : k.startsWith("line-height") ? "number" : k === "corner-shape" ? "string" : "dimension";
    const tokens = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { $value: v, $type: typeOf(k) }]));
    const json = JSON.stringify({
      name: dsName(), generator: "Moldable Design System Studio · Phase 04", generatedAt: stamp,
      preset: s.preset, customized: customized(),
      colorModel: { brand: brand, tertiary: s.tertiaryOn ? "enabled" : "disabled", accentRole: s.tertiaryOn ? "tertiary" : "secondary", neutral: "background → text", status: { mode: "harmonized", bases: statusBases(s), anchors: { ...STATUS_BASE }, semantic: "first harmonized shade reading ≥ 4.5:1 on its soft surface (700/800 light · 300/400 dark)", note: "Scales 50–950 generated with makeScale(); status hue anchored to Moldable (success · info · warning · danger = Error)." } },
      source: { colors: Object.fromEntries(Object.entries(s.colors).filter(([k]) => k !== "tertiary" || s.tertiaryOn)), fonts: s.fonts, radius: s.radius, corner: s.corner, density: s.density, shadow: s.shadowCustom ? "custom" : s.shadow, typeAdv: s.typeAdv, styleAdv: s.styleAdv, radii: s.radii, spaceBase: s.spaceBase, shadowCustom: s.shadowCustom },
      color: { light: tokens({ ...light, "card-border": cardBorderFor(s, light) }), dark: tokens({ ...dark, "card-border": cardBorderFor(s, dark) }), palette: tokens(palette) },
      typography: tokens(Object.fromEntries(Object.entries(shape).filter(([k]) => /^(font|letter|line)/.test(k)))),
      radius: tokens(Object.fromEntries(Object.entries(shape).filter(([k]) => k.startsWith("radius") || k === "corner-shape"))),
      space: tokens(Object.fromEntries(Object.entries(shape).filter(([k]) => k.startsWith("space") || k === "control-height" || k === "border-width"))),
      shadow: tokens(Object.fromEntries(Object.entries(shape).filter(([k]) => k.startsWith("shadow")))),
      accessibility: {
        note: "Contrast ratios computed with WCAG 2.x relative luminance on the generated colors. This is a contrast check, not a conformance claim.",
        status: unresolved.length ? "needs-attention" : "contrast-pass",
        unresolved,
        fahChanges: s.lastFix ? s.lastFix.changes : [],
        light: both.light.map((r) => ({ pair: r.name, fg: r.fgHex, bg: r.bgHex, ratio: +fmt(r.ratio), minimum: r.min, pass: r.pass })),
        dark: both.dark.map((r) => ({ pair: r.name, fg: r.fgHex, bg: r.bgHex, ratio: +fmt(r.ratio), minimum: r.min, pass: r.pass })),
      },
    }, null, 2);
    return { css, json, unresolved, figma, cssCheck: validateDevCss(css, figma) };
  };
  /* ---------------------------------------------------------------------
     Figma Variables export (DTCG, one file per mode)
     · "Colors Primitives": the generated palettes (key 50, never 050) — 7 families × 11, +11 with Tertiary
     · "Colors": 112 semantic variables (background 49 · text 21 · icon 21 · border 21), Light Mode + Dark Mode.
       Every semantic value carries its resolved sRGB colour AND a cross-collection alias
       ($extensions["com.figma.aliasData"] → targetVariableSetName + targetVariableName), so Figma links it to the primitive.
     Semantic role "danger" ↔ primitive family "error". No semantic "tertiary" group.
     --------------------------------------------------------------------- */
  const FIG = { primCollection: "Colors Primitives", semCollection: "Colors", modes: ["Light Mode", "Dark Mode"],
    // Figma names each imported mode after its file (verified), so the semantic files carry the exact mode names
    files: { prim: "Colors Primitives.json", light: "Light Mode.json", dark: "Dark Mode.json", size: "Size.json" }, sizeCollection: "Size" };
  /* Size collection (number variables, one mode) — space + radius in Tailwind naming, depth from DESIGN.md §5.2.
     Figma rejects "." in variable names (verified: "0.5" fails to import), so Tailwind's half steps use "_": 0.5 → 0_5. */
  const FIG_SIZE = (() => {
    const tw = (n) => String(n).replace(".", "_");
    const pos = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 288, 320, 384];
    const neg = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32];
    return {
      space: [...pos.map((px) => [tw(px / 4), px]), ...neg.map((px) => [`-${tw(px / 4)}`, -px])],
      radius: [["rounded-none", 0], ["rounded-xs", 2], ["rounded-sm", 4], ["rounded-md", 6], ["rounded-lg", 8], ["rounded-xl", 12], ["rounded-2xl", 16], ["rounded-3xl", 24],
        ["rounded-4xl", 32], ["rounded-5xl", 40], ["rounded-6xl", 48], ["rounded-7xl", 56], ["rounded-8xl", 64], ["rounded-full", 999]],
      depth: [["negative-200", -8], ["negative-100", -4], ["negative-025", -1], ["0", 0], ["025", 1], ["100", 4], ["200", 8], ["400", 16], ["800", 32]],
    };
  })();
  // Written by hand so the file keeps scale order (a JS object would hoist integer-like keys such as "1" above "0_5")
  const figSizeJSON = () => "{\n" + Object.entries(FIG_SIZE).map(([g, list]) => `  ${JSON.stringify(g)}: {\n` +
    list.map(([k, v]) => `    ${JSON.stringify(k)}: {\n      "$type": "number",\n      "$value": ${v}\n    }`).join(",\n") + "\n  }").join(",\n") + "\n}";
  const FIG_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const FIG_GROUPS = [["default", "neutral"], ["primary", "primary"], ["secondary", "secondary"], ["success", "success"], ["warning", "warning"], ["danger", "error"], ["info", "info"]];
  const FIG_BG_STATES = ["default", "hover", "active", "light", "light-hover", "light-active", "disabled"];
  /** Semantic path → live Playground token, so FAH overrides (and the live preview) win where the two overlap. */
  const FIG_LIVE = {
    "text/default/default": "color-text-default", "icon/default/default": "color-text-default",
    "text/default/on-light": "color-text-muted", "icon/default/on-light": "color-text-muted",
    "border/default/on-light": "color-border-strong",
    "text/primary/default": "color-primary-contrast", "icon/primary/default": "color-primary-contrast",
    "text/danger/default": "color-danger-contrast", "icon/danger/default": "color-danger-contrast",
    ...Object.fromEntries(["success", "warning", "danger", "info"].flatMap((k) => [[`text/${k}/on-light`, `color-${k}`], [`icon/${k}/on-light`, `color-${k}`]])),
  };

  const figPrimitives = (s) => {
    const c = s.colors, bases = statusBases(s);
    return { primary: makeScale(c.primary), secondary: makeScale(c.secondary), ...(s.tertiaryOn ? { tertiary: makeScale(c.tertiary) } : {}),
      neutral: neutralScale(c), success: makeScale(bases.success), info: makeScale(bases.info), warning: makeScale(bases.warning), error: makeScale(bases.danger) };
  };

  /** The deliberate Light/Dark shade mapping. Returns { "group/role/state": { light: [family, step], dark: [family, step] } }. */
  const figMapping = (s, P) => {
    const out = {}, put = (path, light, dark) => { out[path] = { light, dark }; };
    const hex = (r) => P[r[0]][r[1]];
    const best = (fam, bg, steps) => steps.reduce((b, k) => (contrast(P[fam][k], bg) > contrast(P[fam][b], bg) ? k : b));
    const firstOk = (fam, bg, steps, min) => steps.find((k) => contrast(P[fam][k], bg) >= min) ?? steps[steps.length - 1];
    for (const [g, fam] of FIG_GROUPS) {
      const brand = fam === "primary" || fam === "secondary", neutral = fam === "neutral";
      // status: the live preview uses ONE harmonized shade per mode as text on soft surfaces AND as the solid fill
      // (destructive button, solid badges) — the first shade reading ≥ 4.5:1 on its soft surface (700/800 light · 300/400 dark)
      let stL = null, stD = null;
      if (!brand && !neutral) {
        const sc = P[fam], bgDark = fromHsl(hsl(s.colors.primary)[0], 14, 8);
        stL = +Object.keys(sc).find((k) => sc[k] === statusFg(sc, s.colors.background, "light"));
        stD = +Object.keys(sc).find((k) => sc[k] === statusFg(sc, bgDark, "dark"));
      }
      // background — light/dark rows match the reference (neutral: 50|950 · 100|900 · 100|900 · 100|800 · 200|900 · 200|900 · 200|900)
      let bgL, bgD;
      if (neutral) { bgL = [50, 100, 100, 100, 200, 200, 200]; bgD = [950, 900, 900, 800, 900, 900, 900]; }
      else if (brand) {
        // live: light uses the picked colour (500), hover darker; dark uses 400 when the colour is darker than L56, hover lighter
        const d = hsl(s.colors[fam])[2] < 56 ? 400 : 500;
        bgL = [500, 600, 600, 50, 100, 100, null]; bgD = [d, d - 100, d - 100, 900, 800, 800, null];
      } else {   // hover/active = the next existing step (darker in light, lighter in dark) — never past 950 / 50
        const step = (k, dir) => FIG_STEPS[Math.min(FIG_STEPS.length - 1, Math.max(0, FIG_STEPS.indexOf(k) + dir))];
        bgL = [stL, step(stL, 1), step(stL, 1), 50, 100, 100, null]; bgD = [stD, step(stD, -1), step(stD, -1), 900, 800, 800, null];
      }
      FIG_BG_STATES.forEach((st, i) => put(`background/${g}/${st}`, bgL[i] === null ? ["neutral", 200] : [fam, bgL[i]], bgD[i] === null ? ["neutral", 900] : [fam, bgD[i]]));
      // text + icon — default: on the solid background · on-light: on light surfaces · disabled: neutral
      const solidL = hex(out[`background/${g}/default`].light), solidD = hex(out[`background/${g}/default`].dark);
      let onL, onD, fgL, fgD;
      if (neutral) {   // muted text: live is ~neutral 600 (light) — the first step from there that reads ≥ 4.5:1 on the page
        const pageL = hex(out["background/default/default"].light), pageD = hex(out["background/default/default"].dark);
        fgL = 950; fgD = 200; onL = firstOk("neutral", pageL, [600, 700, 800, 900], 4.5); onD = firstOk("neutral", pageD, [400, 300, 200, 100], 4.5);
      }
      else {
        fgL = best(fam, solidL, [50, 950]); fgD = best(fam, solidD, [50, 950]);
        // live: brand on-soft = 700 | 200 · status = first harmonized shade reading ≥ 4.5:1 on its soft surface
        if (brand) { onL = 700; onD = 200; } else { onL = stL; onD = stD; }
      }
      for (const kind of ["text", "icon"]) {
        put(`${kind}/${g}/default`, neutral ? ["neutral", fgL] : [fam, fgL], neutral ? ["neutral", fgD] : [fam, fgD]);
        put(`${kind}/${g}/on-light`, [fam, onL], [fam, onD]);
        put(`${kind}/${g}/disabled`, ["neutral", 400], ["neutral", 600]);
      }
      // border — default · on-light (≥ 3:1 for the default group, like the live input border) · disabled
      if (neutral) {
        const pageL = hex(out["background/default/default"].light), pageD = hex(out["background/default/default"].dark);
        put(`border/${g}/default`, ["neutral", 300], ["neutral", 700]);
        put(`border/${g}/on-light`, ["neutral", firstOk("neutral", pageL, [400, 500, 600, 700], 3)], ["neutral", firstOk("neutral", pageD, [600, 500, 400, 300], 3)]);
      } else if (brand) {
        const d = out[`background/${g}/default`].dark[1];
        put(`border/${g}/default`, [fam, 500], [fam, d]); put(`border/${g}/on-light`, [fam, 400], [fam, 600]);
      } else { put(`border/${g}/default`, [fam, stL], [fam, stD]); put(`border/${g}/on-light`, [fam, 500], [fam, 500]); }
      put(`border/${g}/disabled`, ["neutral", 200], ["neutral", 800]);
    }
    return out;
  };

  const figColor = (hexv) => {
    const h = normalizeHex(hexv); const rgb = hexToRgb(h);
    return { colorSpace: "srgb", components: rgb.map((v) => +(v / 255).toFixed(6)), alpha: 1, hex: h.toUpperCase() };
  };
  const figSet = (root, path, token) => { const parts = path.split("/"); let o = root; parts.slice(0, -1).forEach((p) => { o = o[p] = o[p] || {}; }); o[parts[parts.length - 1]] = token; };

  const buildFigma = (s = state) => {
    const P = figPrimitives(s), map = figMapping(s, P);
    const live = { light: deriveColors(s, "light"), dark: deriveColors(s, "dark") };
    const byHex = {};   // hex → first primitive with that value (same family preferred at lookup)
    for (const f in P) for (const k of FIG_STEPS) { const h = P[f][k].toLowerCase(); (byHex[h] = byHex[h] || []).push(`${f}/${k}`); }
    const prim = {};
    for (const f in P) for (const k of FIG_STEPS) figSet(prim, `${f}/${k}`, { $type: "color", $value: figColor(P[f][k]) });
    const modes = { light: {}, dark: {} }, resolvedHex = { light: {}, dark: {} }, unaliased = [], liveDiff = [];
    for (const path in map) for (const mode of ["light", "dark"]) {
      let [fam, step] = map[path][mode], target = `${fam}/${step}`, value = P[fam][step];
      const lk = FIG_LIVE[path], ov = lk && s.overrides && s.overrides[mode] && s.overrides[mode][lk];
      if (ov && lk in live[mode]) {   // FAH changed this colour in the live preview — export what the preview shows
        const hits = byHex[normalizeHex(ov).toLowerCase()] || [];
        value = normalizeHex(ov); target = hits.find((h) => h.startsWith(fam + "/")) || hits[0] || null;
        if (!target) unaliased.push(`${mode} · ${path} (FAH override ${value.toUpperCase()} is not a palette step)`);
      }
      if (lk && live[mode][lk] && normalizeHex(live[mode][lk]).toLowerCase() !== normalizeHex(value).toLowerCase()) liveDiff.push({ mode, path, live: live[mode][lk], exported: value });
      const token = { $type: "color", $value: figColor(value) };
      if (target) token.$extensions = { "com.figma.aliasData": { targetVariableSetName: FIG.primCollection, targetVariableName: target } };
      figSet(modes[mode], path, token); resolvedHex[mode][path] = normalizeHex(value);
    }
    const files = { prim: JSON.stringify(prim, null, 2), light: JSON.stringify(modes.light, null, 2), dark: JSON.stringify(modes.dark, null, 2), size: figSizeJSON() };
    return { files, P, map, resolvedHex, unaliased, liveDiff, report: validateFigma(files, s) };
  };

  /** Structural validation of the three files — run before every download. */
  const validateFigma = (files, s) => {
    const errors = [], flat = (o, pre = "", acc = {}) => {
      for (const k in o) { const v = o[k], p = pre ? `${pre}/${k}` : k;
        if (k.includes(".") || k.includes("/")) errors.push(`invalid group name "${p}"`);
        if (v && typeof v === "object" && "$type" in v) { if (acc[p]) errors.push(`duplicate path ${p}`); acc[p] = v; } else if (v && typeof v === "object") flat(v, p, acc); else errors.push(`stray value at ${p}`); }
      return acc;
    };
    let J;
    try { J = { prim: JSON.parse(files.prim), light: JSON.parse(files.light), dark: JSON.parse(files.dark) }; } catch (e) { return { ok: false, errors: [`JSON parse: ${e.message}`] }; }
    const prim = flat(J.prim), L = flat(J.light), D = flat(J.dark);
    const goodColor = (v) => v && v.colorSpace === "srgb" && Array.isArray(v.components) && v.components.length === 3 && v.components.every((x) => typeof x === "number" && x >= 0 && x <= 1) && v.alpha === 1 && /^#[0-9A-F]{6}$/.test(v.hex);
    const fams = [...new Set(Object.keys(prim).map((p) => p.split("/")[0]))];
    const expectFams = 7 + (s.tertiaryOn ? 1 : 0);
    if (fams.length !== expectFams) errors.push(`primitive families ${fams.length}, expected ${expectFams}`);
    fams.forEach((f) => { const n = Object.keys(prim).filter((p) => p.startsWith(f + "/")).length; if (n !== 11) errors.push(`${f}: ${n} shades, expected 11`); });
    if (Object.keys(prim).some((p) => /\/0\d/.test(p))) errors.push("shade keys must be 50, not 050");
    for (const p in prim) if (prim[p].$type !== "color" || !goodColor(prim[p].$value)) errors.push(`bad primitive ${p}`);
    const count = (o, g) => Object.keys(o).filter((p) => p.startsWith(g + "/")).length;
    const groups = { background: 49, text: 21, icon: 21, border: 21 };
    for (const [nm, M] of [["Light", L], ["Dark", D]]) {
      if (Object.keys(M).length !== 112) errors.push(`${nm}: ${Object.keys(M).length} variables, expected 112`);
      for (const g in groups) if (count(M, g) !== groups[g]) errors.push(`${nm}: ${g} ${count(M, g)}, expected ${groups[g]}`);
      for (const p in M) {
        const t = M[p], a = t.$extensions && t.$extensions["com.figma.aliasData"];
        if (t.$type !== "color" || !goodColor(t.$value)) errors.push(`${nm}: bad value ${p}`);
        if (a) {
          if (a.targetVariableSetName !== FIG.primCollection) errors.push(`${nm}: ${p} aliases unknown collection`);
          else if (!prim[a.targetVariableName]) errors.push(`${nm}: ${p} → missing primitive ${a.targetVariableName}`);
          else if (prim[a.targetVariableName].$value.hex !== t.$value.hex) errors.push(`${nm}: ${p} value ≠ ${a.targetVariableName}`);
        }
      }
    }
    const lk = Object.keys(L).sort().join(), dk = Object.keys(D).sort().join();
    if (lk !== dk) errors.push("Light and Dark files have different variable names");
    for (const p in L) if (D[p] && L[p].$type !== D[p].$type) errors.push(`type differs between modes: ${p}`);
    const aliased = (M) => Object.values(M).filter((t) => t.$extensions && t.$extensions["com.figma.aliasData"]).length;
    // Size: number variables, names Figma accepts (no "."), expected group sizes
    let Z = {};
    try { Z = flat(JSON.parse(files.size)); } catch (e) { errors.push(`Size JSON parse: ${e.message}`); }
    const sizeGroups = { space: 43, radius: 14, depth: 9 };
    for (const g in sizeGroups) if (count(Z, g) !== sizeGroups[g]) errors.push(`Size: ${g} ${count(Z, g)}, expected ${sizeGroups[g]}`);
    for (const p in Z) if (Z[p].$type !== "number" || typeof Z[p].$value !== "number" || !Number.isFinite(Z[p].$value)) errors.push(`Size: bad number ${p}`);
    if (Z["radius/rounded-full"] && Z["radius/rounded-full"].$value !== 999) errors.push("Size: rounded-full must be 999");
    return { ok: !errors.length, errors, counts: { size: Object.keys(Z).length, sizeGroups: Object.fromEntries(Object.keys(sizeGroups).map((g) => [g, count(Z, g)])), primitives: Object.keys(prim).length, families: fams, light: Object.keys(L).length, dark: Object.keys(D).length, groups: Object.fromEntries(Object.keys(groups).map((g) => [g, count(L, g)])), aliasedLight: aliased(L), aliasedDark: aliased(D) } };
  };

  /** Contrast of the key semantic pairs (reported, never changed on export). */
  const figContrast = (F) => {
    const rows = [];
    for (const mode of ["light", "dark"]) { const R = F.resolvedHex[mode];
      for (const [g] of FIG_GROUPS) {
        rows.push({ mode, pair: `text/${g}/default on background/${g}/default`, ratio: contrast(R[`text/${g}/default`], R[`background/${g}/default`]), min: 4.5 });
        rows.push({ mode, pair: `text/${g}/on-light on background/${g === "default" ? "default/default" : `${g}/light`}`, ratio: contrast(R[`text/${g}/on-light`], R[g === "default" ? "background/default/default" : `background/${g}/light`]), min: 4.5 });
      }
      rows.push({ mode, pair: "border/default/on-light on background/default/default", ratio: contrast(R["border/default/on-light"], R["background/default/default"]), min: 3 });
    }
    return rows.map((r) => ({ ...r, ratio: +r.ratio.toFixed(2), pass: r.ratio >= r.min }));
  };

  /* ---------------------------------------------------------------------
     Developer CSS tokens (Tailwind CSS v4) — one naming contract with Figma:
       Figma  background/danger/default  →  CSS  --background-danger-default  →  Tailwind  --color-background-danger-default
     Values are HSL channels ("h, s%, l%") consumed through hsla(var(--token)), resolved from buildFigma().resolvedHex.
     --------------------------------------------------------------------- */
  const cssName = (path) => path.split("/").join("-");
  /** Hex → "h, s%, l%" — 1 decimal, or 2 where 1 would not round-trip to the exact same hex. Deterministic, no drift. */
  const hslChannels = (hex) => {
    const [h, s, l] = rgbToHsl(hexToRgb(hex)), trim = (n, d) => String(+n.toFixed(d));
    for (const d of [1, 2, 3]) {
      const c = [trim(h, d), trim(s, d), trim(l, d)];
      if (fromHsl(+c[0], +c[1], +c[2]).toLowerCase() === normalizeHex(hex).toLowerCase()) return `${c[0]}, ${c[1]}%, ${c[2]}%`;
    }
    return `${trim(h, 3)}, ${trim(s, 3)}%, ${trim(l, 3)}%`;
  };
  const devCss = (F, { head = "", shape = "" } = {}) => {
    const paths = Object.keys(F.map);
    const vars = (mode) => paths.map((p) => `    --${cssName(p)}: ${hslChannels(F.resolvedHex[mode][p])};`).join("\n");
    return head +
      `/* Developer tokens — Tailwind CSS v4. Same semantic names and colours as the Figma "Colors" collection (Light Mode / Dark Mode).\n` +
      ` * Install: in your Tailwind entry stylesheet, after @import "tailwindcss";  add  @import "./moldable-dev-tokens.css";\n` +
      ` * Dark mode: add class="dark" to <html> (or any container). Utilities: bg-background-primary-default · text-text-primary-on-light · border-border-default-default\n` +
      ` * Values are HSL channels — use hsla(var(--background-primary-default)) outside Tailwind. */\n\n` +
      `@theme inline {\n${paths.map((p) => `  --color-${cssName(p)}: hsla(var(--${cssName(p)}));`).join("\n")}\n}\n\n` +
      `@layer base {\n  :root {\n    /* Light Mode — ${paths.length} semantic colours */\n${vars("light")}\n` +
      (shape ? `\n    /* Shape & type — unchanged from the Playground (spacing, radius, fonts, shadows) */\n${shape.split("\n").map((l) => "  " + l).join("\n")}\n` : "") +
      `  }\n\n  .dark {\n    /* Dark Mode — same ${paths.length} names */\n${vars("dark")}\n  }\n}\n`;
  };
  const LEGACY_CSS = [/--background-error-/, /--(text|icon|border|background)-[a-z]+-disable(?![a-z])/, /-onlight\b/, /light_hover/, /light_active/, /--color-[a-z-]*error/];
  /** Structural + colour validation of the developer CSS against the Figma manifest (both modes). */
  const validateDevCss = (css, F) => {
    const errors = [], paths = Object.keys(F.map), names = paths.map(cssName);
    const block = (re) => { const m = css.match(re); return m ? m[1] : ""; };
    const theme = block(/@theme inline \{\n([\s\S]*?)\n\}/), root = block(/:root \{\n([\s\S]*?)\n  \}/), dark = block(/\.dark \{\n([\s\S]*?)\n  \}/);
    const decl = (txt) => Object.fromEntries([...txt.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
    const T = decl(theme), R = decl(root), D = decl(dark);
    const sem = (o) => names.filter((n) => n in o).length;
    if (Object.keys(T).length !== 112) errors.push(`@theme mappings ${Object.keys(T).length}, expected 112`);
    if (sem(R) !== 112) errors.push(`:root semantic ${sem(R)}, expected 112`);
    if (Object.keys(D).length !== 112 || sem(D) !== 112) errors.push(`.dark ${Object.keys(D).length}, expected 112`);
    for (const [k, v] of Object.entries(T)) {
      const ref = (v.match(/^hsla\(var\(--([a-z0-9-]+)\)\)$/) || [])[1];
      if (k !== `color-${ref}`) errors.push(`theme ${k} → ${v}`);
      else if (!(ref in R) || !(ref in D)) errors.push(`unresolved var(--${ref})`);
    }
    for (const re of LEGACY_CSS) if (re.test(css)) errors.push(`legacy name ${re}`);
    let drift = 0;
    for (const [i, p] of paths.entries()) for (const [mode, O] of [["light", R], ["dark", D]]) {
      const c = (O[names[i]] || "").match(/^(-?[\d.]+), ([\d.]+)%, ([\d.]+)%$/);
      if (!c) { errors.push(`bad HSL ${mode} ${names[i]}`); continue; }
      if (fromHsl(+c[1], +c[2], +c[3]).toLowerCase() !== normalizeHex(F.resolvedHex[mode][p]).toLowerCase()) drift++;
    }
    if (drift) errors.push(`${drift} values differ from the Figma export`);
    return { ok: !errors.length, errors, counts: { theme: Object.keys(T).length, root: sem(R), dark: Object.keys(D).length } };
  };

  let exportFormat = "css", exportCache = null;
  const slug = () => dsName().toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, "-").replace(/^-|-$/g, "") || "design-system";
  const download = (text, filename, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };
  const ICON_OK = '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"/></svg>';
  const ICON_WARN = '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';
  const renderExportMeta = () => {
    if (!exportCache) return;
    el.exportSub.textContent = t("export.sub", { name: dsName(), preset: PRESETS[state.preset].label, edited: customized() ? t("export.edited") : "" });
    const u = exportCache.unresolved;
    el.exportA11y.dataset.state = u.length ? "fail" : "pass";
    el.exportA11y.innerHTML = u.length ? `${ICON_WARN}<span>${t("export.fail", { count: u.length })}</span>` : `${ICON_OK}<span>${t("export.pass", { total: TOTAL() })}</span>`;
  };
  const openExport = () => {
    exportCache = buildExport();
    showExport(exportFormat);
    renderExportMeta();
    el.dialog.showModal();
  };
  const showExport = (f) => {
    exportFormat = f;
    el.exportTabs.forEach((b) => { const on = b.dataset.format === f; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    const fig = f === "figma";
    el.exportCode.hidden = fig; el.figPanel.hidden = !fig;
    el.btnCopy.hidden = fig; el.btnDlCss.hidden = fig; el.btnDlJson.hidden = fig; el.btnDlFigma.hidden = !fig;
    if (fig) { renderFigmaPanel(); return; }
    el.exportCode.setAttribute("aria-labelledby", `xtab-${f}`);
    el.exportCode.textContent = exportCache[f];
  };
  const FIG_DL_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>';
  const renderFigmaPanel = () => {
    const F = exportCache.figma, r = F.report, c = r.counts || {};
    el.figCheck.dataset.state = r.ok ? "pass" : "fail";
    el.figCheck.innerHTML = r.ok
      ? `${ICON_OK}<span>${t("export.fig.ok", { prim: c.primitives, fams: c.families.length, linked: c.aliasedLight + c.aliasedDark })}${F.unaliased.length ? ` ${t("export.fig.unlinked", { count: F.unaliased.length })}` : ""}</span>`
      : `${ICON_WARN}<span>${t("export.fig.bad", { errors: r.errors.slice(0, 4).join(" · ") })}</span>`;
    if (r.ok) {   // contrast of the key semantic pairs — reported as-is, never changed on export
      const cr = figContrast(F), bad = cr.filter((x) => !x.pass);
      el.figCheck.insertAdjacentHTML("beforeend", `<span class="fig-contrast">${bad.length ? t("export.fig.contrastFail", { count: bad.length, total: cr.length, list: bad.map((x) => `${x.mode === "light" ? "Light" : "Dark"} · ${x.pair} ${fmt(x.ratio)}:1`).join("; ") }) : t("export.fig.contrastOk", { total: cr.length })}</span>`);
    }
    const rows = [["prim", c.primitives], ["light", c.light], ["dark", c.dark], ["size", c.size]];
    el.figFiles.innerHTML = rows.map(([k, n]) => `<li class="fig-file"><span class="fig-file-ic" aria-hidden="true">{ }</span><span class="fig-file-txt"><b>${FIG.files[k]}</b><small>${t(`export.fig.${k}`)} · ${t("export.fig.vars", { count: n ?? 0 })}</small></span><button type="button" class="btn btn-default btn-sm" data-fig-file="${k}"${r.ok ? "" : " disabled"} aria-label="${t("export.fig.download")} ${FIG.files[k]}">${FIG_DL_ICON}<span>${t("export.fig.download")}</span></button></li>`).join("");
    el.figHowCheck.textContent = t("export.fig.how.4", { primCount: c.primitives ?? 77 });
    el.btnDlFigma.disabled = !r.ok;
  };
  const downloadFigma = (k) => {
    const F = buildFigma();   // rebuild from the live state; validation gates the download
    exportCache.figma = F;
    if (!F.report.ok) { renderFigmaPanel(); toast(t("export.fig.bad", { errors: F.report.errors[0] })); return false; }
    download(F.files[k], FIG.files[k], "application/json");
    return true;
  };

  let toastTimer;
  const toast = (msg, action) => {
    el.toast.textContent = msg;
    el.toast.classList.toggle("has-action", !!action);
    if (action) {
      const b = document.createElement("button"); b.type = "button"; b.className = "toast-action"; b.textContent = action.label;
      b.addEventListener("click", () => { action.run(); el.toast.classList.remove("is-visible"); });
      el.toast.appendChild(b);
    }
    el.toast.classList.add("is-visible"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), action ? 6000 : 2400);
  };

  /* ---------------------------------------------------------------------
     16. Language — switching never touches the design, the step or the clay
     --------------------------------------------------------------------- */
  const setLang = (l) => {
    if (l === lang || !MESSAGES[l]) return;
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (_) {}
    applyI18n();
    crew.refresh();
    orbs.refresh();
    syncControls(); syncLayout(); render();
    renderLib();
    renderPlayfulDynamic();
    renderMinimalDynamic();
    renderBubble();
    // AUD-004: the polite live region follows the language — the open line is re-read once in the new language; a closed bubble leaves it silent
    const live = comp.msg && !el.bubble.hidden ? `${CREW[comp.msg.char].name}: ${el.bubbleText.textContent}` : "";
    if (el.live.textContent !== live) el.live.textContent = live;
    if (comp.char) el.buddy.setAttribute("aria-label", t("companion.show", { name: CREW[comp.char].name, role: t(`crew.${comp.char}`) }));
    if (el.dialog.open) renderExportMeta();
  };

  /* ---------------------------------------------------------------------
     17. Views & navigation (hash based, no server)
     --------------------------------------------------------------------- */
  const showView = (name) => {
    const toPlayground = name === "playground";
    el.welcome.hidden = toPlayground; el.playground.hidden = !toPlayground;
    document.body.dataset.view = name;
    if (toPlayground) {
      hero && hero.stop(); crew.close(false);
      if (state.shaped) showArtboardNow(); else showClay();
      setTimeout(() => { if (comp.char) el.buddyImg.src = portraitOf(comp.char); }, 0);
      if (!showView.greeted) { showView.greeted = true; setTimeout(contextIntro, motionOK() ? 400 : 0); }
      armIdle();
    } else {
      clay && clay.stop();
      if (hero) { hero.resize && hero.resize(); hero.start(); }
      requestAnimationFrame(crew.layout);
    }
    window.scrollTo(0, 0);
  };
  const route = () => { showView(location.hash.replace("#", "") === "playground" ? "playground" : "welcome"); };
  const go = (name) => { if (location.hash !== "#" + name) location.hash = name; else route(); };
  const startCreating = () => {
    if (hero && !reducedMotion.matches) { hero.celebrate(); setTimeout(() => go("playground"), 180); }
    else go("playground");
  };

  let hero = null;
  const mountHero = () => {
    if (window.MoldableHero && el.heroCanvas) {
      try { hero = window.MoldableHero.mountHero({ canvas: el.heroCanvas, labelEl: null, domPicking: true, pointerTarget: el.welcome }); } catch (err) { hero = null; }
    }
    if (!hero) { el.heroCanvas.hidden = true; el.heroFallback.hidden = false; }
    crew.init();
    orbs.init();
  };

  /* ---------------------------------------------------------------------
     Welcome Hero — mochi orbs. Purely playful: a squish (Web Animations on the body's `scale`, so it composes
     with the CSS float on `translate` and the hover lift on `transform`), a soft bloom ring and a few pastel motes.
     Reduced motion → no squish, no motes; the bloom becomes a still glow.
     --------------------------------------------------------------------- */
  const orbs = (() => {
    const SQUISH = [
      { scale: "1 1" }, { scale: "1.14 .86", offset: .18 }, { scale: ".93 1.07", offset: .42 },
      { scale: "1.04 .97", offset: .64 }, { scale: ".99 1.01", offset: .84 }, { scale: "1 1" },
    ];
    const SHADOW = [
      { transform: "translateX(-50%) scale(1, 1)" }, { transform: "translateX(-50%) scale(1.16, 1.08)", offset: .18 },
      { transform: "translateX(-50%) scale(.95, .97)", offset: .42 }, { transform: "translateX(-50%) scale(1, 1)" },
    ];
    const MOTES = 5;
    const all = () => $$("#hero-orbs .orb");
    const pop = (btn) => {
      const body = btn.querySelector(".orb-body");
      btn.querySelectorAll(".orb-bloom, .orb-mote").forEach((n) => n.remove());
      const fx = [];
      const bloom = document.createElement("span"); bloom.className = "orb-bloom"; bloom.setAttribute("aria-hidden", "true"); fx.push(bloom);
      if (motionOK()) {
        if (body._squish) body._squish.cancel();
        body._squish = body.animate(SQUISH, { duration: 640, easing: "cubic-bezier(.3, .7, .4, 1)" });
        try { btn.animate(SHADOW, { duration: 640, easing: "ease-out", pseudoElement: "::before" }); } catch (e) { /* pseudo-element animation unsupported — the squish still plays */ }
        const r = body.offsetWidth / 2 + 10, turn = Math.random() * Math.PI * 2;
        for (let i = 0; i < MOTES; i++) {
          const a = turn + (i / MOTES) * Math.PI * 2, d = r + 4 + (i % 2) * 6;
          const m = document.createElement("span"); m.className = "orb-mote"; m.setAttribute("aria-hidden", "true");
          m.style.setProperty("--mx", `${(Math.cos(a) * d).toFixed(1)}px`); m.style.setProperty("--my", `${(Math.sin(a) * d - 4).toFixed(1)}px`);
          m.style.animationDelay = `${i * 18}ms`; fx.push(m);
        }
      }
      fx.forEach((n) => { btn.appendChild(n); n.addEventListener("animationend", () => n.remove(), { once: true }); });
      setTimeout(() => fx.forEach((n) => n.remove()), 1200);   // fallback if animationend never fires
    };
    const refresh = () => all().forEach((b) => { b.setAttribute("aria-label", t(`heroOrbs.${b.dataset.orb}`)); b.lang = lang; });
    let built = false;
    const init = () => {
      refresh();
      if (built) return; built = true;
      all().forEach((b) => b.addEventListener("click", () => pop(b)));   // native button: mouse, touch, Enter and Space
    };
    return { init, refresh, pop };
  })();

  /* ---------------------------------------------------------------------
     Welcome Hero — Layout B "Characters Take Over" + the Moldable Crew speech bubbles.
     The 3D crew is placed from the letters' real positions, so it plays with the type at any desktop size.
     One controller: activeCharacter (shown) + pinnedCharacter (clicked) → only one bubble ever.
     --------------------------------------------------------------------- */
  const CREW_IDS = ["pai", "act", "famai", "min", "fah"];
  const CREW_ASPECT = { pai: 1.12, act: 0.72, famai: 1.04, min: 1.32, fah: 1.28 };   // visible width ÷ height, for the hit area
  const CREW_PLACE = { pai: ["right", "bottom", "top"], act: ["right", "bottom", "left"], famai: ["left", "bottom", "top"], min: ["topLeft", "top", "left"], fah: ["top", "right", "left"] };
  const crew = (() => {
    const hostEl = () => $("#main"), bubble = () => $("#crew-bubble");
    let active = null, pinned = null, hideT = 0, anchors = {}, built = false, quietFocus = false;
    const rel = (n, host) => { const r = n.getBoundingClientRect(), h = host.getBoundingClientRect(); return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height }; };
    const letters = (word) => $$(`#hero-type [data-word="${word}"] .hl`);
    /** Where each character stands — tied to its letters (see the Layout B reference). */
    const measure = () => {
      const host = hostEl(), H = host.clientHeight, W = host.clientWidth;
      const fs = (w) => parseFloat(getComputedStyle($(`#hero-type [data-word="${w}"]`)).fontSize);
      const [M, O, L, D] = letters("mold").map((n) => rel(n, host)), [W3, O3, R3, L3, D3] = letters("world").map((n) => rel(n, host));
      const f1 = fs("mold"), f3 = fs("world"), cap1 = f1 * 0.7, top1 = M.y + f1 * 0.05, cap3 = f3 * 0.7, top3 = W3.y + f3 * 0.05;
      const minH = Math.min(H * 0.47, cap3 * 2.15), minX = Math.min(W - minH * 0.62, Math.max(D3.x + D3.w * 0.75, W * 0.79));
      const a = {
        pai: { x: O.x + O.w * 0.74, y: top1 + cap1 * 0.6, h: cap1 * 0.8 },
        act: { x: D.x - D.w * 0.02, y: top1 + cap1 * 0.44, h: cap1 * 1.04 },
        min: { x: minX, y: top3 + cap3 * 0.28, h: minH },
      };
      const fahH = Math.min(H * 0.25, cap3 * 1.2);
      a.fah = { x: Math.max(R3.x + R3.w * 0.3, 600), y: Math.min(H - fahH * 0.55, top3 + cap3 + fahH * 0.22), h: fahH };
      a.famai = { x: a.min.x - minH * 0.05, y: a.min.y - minH * 0.64, h: Math.min(cap1 * 0.78, H * 0.2) };
      return a;
    };
    /** Front copy of the headline, clipped to the [data-front] letters (D of MOLD, L D of WORLD). */
    const clipFront = () => {
      const back = $("#hero-type"), front = $("#hero-type-front");
      if (!built) { front.innerHTML = back.innerHTML; built = true; }
      const br = back.getBoundingClientRect();
      // start just inside the letter (past its side bearing) so no sliver of the neighbouring glyph is copied in front
      const d = $$("[data-front]", back).map((n) => { const r = n.getBoundingClientRect(), em = parseFloat(getComputedStyle(n).fontSize), x = r.left - br.left + em * 0.04, y = r.top - br.top, w = r.width + em * 0.04, h = r.height; return `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`; }).join("");
      front.style.clipPath = `path("${d}")`;
    };
    const layout = () => {
      if (el.welcome.hidden) return;
      anchors = measure(); clipFront();
      if (hero && hero.place) hero.place(anchors);
      for (const id of CREW_IDS) {
        const a = anchors[id], b = $(`.crew-hit[data-char="${id}"]`), img = $(`#hero-fallback img[data-char="${id}"]`);
        b.style.cssText = `left:${a.x}px;top:${a.y}px;width:${a.h * CREW_ASPECT[id] * 0.92}px;height:${a.h * 0.9}px`;
        if (img) img.style.cssText = `left:${a.x}px;top:${a.y}px;width:auto;height:${a.h}px`;
      }
      if (active) position(active);
    };
    /** Bubble next to its speaker: first preferred side that stays inside the hero and clear of the nav + copy. */
    const position = (id) => {
      const host = hostEl(), bub = bubble(), a = anchors[id]; if (!a) return;
      const W = host.clientWidth, H = host.clientHeight, m = 16, gap = 12;
      const bw = bub.offsetWidth, bh = bub.offsetHeight, cw = a.h * CREW_ASPECT[id], ch = a.h;
      const avoid = [{ x: 0, y: 0, w: W, h: 84 }, rel($(".hero-copy"), host)];
      const hit = (r) => avoid.some((v) => r.x < v.x + v.w && r.x + r.w > v.x && r.y < v.y + v.h && r.y + r.h > v.y);
      const clampX = (x) => Math.min(W - m - bw, Math.max(m, x)), clampY = (y) => Math.min(H - m - bh, Math.max(m, y));
      const at = { top: () => ({ x: clampX(a.x - bw / 2), y: a.y - ch * 0.44 - gap - bh }), bottom: () => ({ x: clampX(a.x - bw / 2), y: a.y + ch * 0.44 + gap }),
        left: () => ({ x: a.x - cw * 0.42 - gap - bw, y: clampY(a.y - bh / 2) }), right: () => ({ x: a.x + cw * 0.42 + gap, y: clampY(a.y - bh / 2) }),
        topLeft: () => ({ x: a.x - cw * 0.2 - bw, y: a.y - ch * 0.4 - gap - bh + 24 }) };
      const ok = (p) => p.x >= m && p.y >= m && p.x + bw <= W - m && p.y + bh <= H - m && !hit({ x: p.x, y: p.y, w: bw, h: bh });
      const sides = CREW_PLACE[id]; let side = sides.find((sd) => ok(at[sd]())) || sides[0], p = at[side]();
      p = { x: clampX(p.x), y: clampY(p.y) };
      bub.dataset.side = { top: "below", topLeft: "below", bottom: "above", left: "right", right: "left" }[side];
      bub.style.left = `${p.x}px`; bub.style.top = `${p.y}px`;
      bub.style.setProperty("--tail-x", `${Math.min(bw - 28, Math.max(28, a.x - p.x))}px`);
      bub.style.setProperty("--tail-y", `${Math.min(bh - 28, Math.max(28, a.y - p.y))}px`);
    };
    const render = () => {
      const bub = bubble();
      if (!active) return;
      bub.lang = lang;
      $("#crew-bubble-title").textContent = t(`heroCrew.${active}.title`);
      $("#crew-bubble-text").textContent = t(`heroCrew.${active}.msg`);
      $("#crew-bubble-close").setAttribute("aria-label", t("heroCrew.close"));
      position(active);
    };
    const labels = () => $$(".crew-hit").forEach((b) => { b.setAttribute("aria-label", t(`heroCrew.${b.dataset.char}.title`)); b.lang = lang; });
    const sync = () => {
      const bub = bubble();
      $$(".crew-hit").forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.char === active)));
      hero && hero.hover && hero.hover(active);
      clearTimeout(sync.t);
      if (active) {
        const wasHidden = bub.hidden; bub.hidden = false; render();
        if (wasHidden) void bub.offsetWidth;   // start the fade from the closed state without waiting for a frame
        bub.classList.add("is-open");
      } else {
        bub.classList.remove("is-open");
        sync.t = setTimeout(() => { if (!active) bub.hidden = true; }, reducedMotion.matches ? 0 : 220);
      }
    };
    const show = (id) => { clearTimeout(hideT); if (active !== id) { active = id; sync(); } };
    const hideSoon = () => { clearTimeout(hideT); hideT = setTimeout(() => { const next = pinned; if (active !== next) { active = next; sync(); } }, 140); };
    const close = (focusChar) => {
      const was = active || pinned; pinned = null; clearTimeout(hideT);
      if (active) { active = null; sync(); }
      if (focusChar && was) { quietFocus = true; $(`.crew-hit[data-char="${was}"]`).focus(); quietFocus = false; }   // returning focus must not reopen what was just closed
    };
    const init = () => {
      labels(); layout();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
      window.addEventListener("resize", layout);
      $$(".crew-hit").forEach((b) => {
        const id = b.dataset.char;
        b.addEventListener("pointerenter", () => show(id));
        b.addEventListener("pointerleave", hideSoon);
        b.addEventListener("focus", () => { if (!quietFocus) show(id); });
        b.addEventListener("blur", (e) => { if (!bubble().contains(e.relatedTarget)) hideSoon(); });
        b.addEventListener("click", () => {
          if (pinned === id) { close(false); return; }
          pinned = id; show(id);
          hero && hero.react && hero.react(id);
          if (!hero) { const img = $(`#hero-fallback img[data-char="${id}"]`); img && img.animate && !reducedMotion.matches && img.animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-58%) scale(1.04)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 420, easing: "ease-out" }); }
        });
      });
      const bub = bubble();
      bub.addEventListener("pointerenter", () => clearTimeout(hideT));
      bub.addEventListener("pointerleave", hideSoon);
      bub.addEventListener("focusout", (e) => { if (!bub.contains(e.relatedTarget) && !(e.relatedTarget && e.relatedTarget.classList.contains("crew-hit"))) hideSoon(); });
      $("#crew-bubble-close").addEventListener("click", () => close(true));
      document.addEventListener("pointerdown", (e) => { if ((pinned || active) && !e.target.closest(".crew-hit, #crew-bubble")) close(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && (active || pinned) && !el.welcome.hidden) { const inBubble = bub.contains(document.activeElement) || (document.activeElement && document.activeElement.classList.contains("crew-hit")); close(inBubble); } });
    };
    return { init, layout, close, refresh: () => { labels(); if (active) render(); }, get state() { return { active, pinned }; } };
  })();

  /* ---------------------------------------------------------------------
     18. Menus — menu button pattern (Enter/Space/↓ opens, arrows move, Esc closes)
     --------------------------------------------------------------------- */
  let openMenu = null;
  const menuItems = (m) => $$(".menu-item", m).filter((i) => !i.hidden && i.getAttribute("aria-disabled") !== "true");
  const closeMenu = (focusBtn = false) => {
    if (!openMenu) return;
    const { btn, menu } = openMenu;
    menu.hidden = true; btn.setAttribute("aria-expanded", "false");
    if (focusBtn) btn.focus();
    openMenu = null;
  };
  const showMenu = (btn, menu, focusLast = false) => {
    closeMenu();
    menu.hidden = false; btn.setAttribute("aria-expanded", "true");
    openMenu = { btn, menu };
    const items = menuItems(menu);
    const target = items.find((i) => i.getAttribute("aria-checked") === "true") || (focusLast ? items[items.length - 1] : items[0]);
    target && target.focus();
  };
  const wireMenu = (btn, menu) => {
    btn.addEventListener("click", () => (openMenu && openMenu.menu === menu ? closeMenu() : showMenu(btn, menu)));
    btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); showMenu(btn, menu, e.key === "ArrowUp"); } });
    menu.addEventListener("keydown", (e) => {
      const items = menuItems(menu), i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = items.length; items[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
      else if (e.key === "Tab") closeMenu();
    });
  };

  /* ---------------------------------------------------------------------
     19. Wiring
     --------------------------------------------------------------------- */
  const populate = () => {
    [el.fontHeading, el.fontBody, el.fontAccent].forEach((sel) => { sel.innerHTML = FONTS.map((f) => `<option value="${f.id}" style="font-family:${f.stack}">${f.id}</option>`).join(""); });
    el.pairs.innerHTML = PAIRS.map((p) => `<button type="button" class="pair" data-pair="${p.id}" data-h="${p.heading}" data-b="${p.body}" aria-pressed="false">
      <span class="pair-sample" style="font-family:${fontById(p.heading).stack}">Aa <span style="font-family:${fontById(p.body).stack};font-size:14px">กข</span></span>
      <span class="pair-name"></span></button>`).join("");
  };

  const wire = () => {
    $$("[data-nav]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); b.dataset.nav === "playground" ? startCreating() : go(b.dataset.nav); }));
    window.addEventListener("hashchange", route);

    // Top bar
    el.name.addEventListener("input", () => { state.name = el.name.value; save(); });
    el.name.addEventListener("change", () => { state.name = el.name.value.trim(); el.name.value = state.name; save(); });
    el.langBtns.forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
    // AUD-001: the skip link follows the visible view and moves focus without touching the hash (so the router, Back/Forward and Playground state stay as they are)
    const skipLink = $("#skip-link");
    if (skipLink) skipLink.addEventListener("click", (e) => {
      const target = el.playground.hidden ? $("#main") : $("#canvas");
      if (!target) return;
      e.preventDefault();
      // focusable only for this jump: a pointer click inside the region never pulls focus onto the whole region
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      target.focus();
    });
    el.btnMode.addEventListener("click", () => setFlow(state.flow === "guided" ? "free" : "guided"));
    el.btnExport.addEventListener("click", openExport);
    wireMenu(el.btnMore, el.moreMenu);
    $("#mi-reset").addEventListener("click", () => { closeMenu(); el.resetDialog.returnValue = ""; el.resetDialog.showModal(); });
    $("#mi-home").addEventListener("click", () => { closeMenu(); go("welcome"); });
    el.resetDialog.addEventListener("close", () => { if (el.resetDialog.returnValue === "confirm") resetAll(); else el.btnMore.focus(); });

    // Rail (Edit freely): never collapses; reopens a collapsed inspector
    el.railItems.forEach((b, i) => {
      b.addEventListener("click", () => (b.dataset.cat === "components" ? (state.inspectorOpen = true, openLibrary()) : setCategory(b.dataset.cat)));
      b.addEventListener("keydown", (e) => {
        const n = el.railItems.length; const idx = e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowUp" ? (i - 1 + n) % n : -1;
        if (idx >= 0) { e.preventDefault(); el.railItems[idx].focus(); }
      });
    });
    el.btnCollapse.addEventListener("click", () => {
      state.inspectorOpen = false; syncLayout(); save();
      (el.railItems.find((b) => b.getAttribute("aria-pressed") === "true") || el.railItems[0]).focus();
    });
    el.steps.addEventListener("click", (e) => { const d = e.target.closest("[data-step]"); if (d && !d.disabled) goStep(+d.dataset.step); });
    $$(".adv-toggle").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.adv; state.advanced[k] = !state.advanced[k]; syncControls(); save(); }));

    // Footer
    el.btnNext.addEventListener("click", next);
    el.btnBack.addEventListener("click", back);

    // Style
    el.presetCards.forEach((b, i) => {
      b.addEventListener("click", () => applyPreset(b.dataset.preset));
      b.addEventListener("keydown", (e) => {
        const n = el.presetCards.length;
        const idx = e.key === "ArrowDown" || e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (i - 1 + n) % n : -1;
        if (idx >= 0) { e.preventDefault(); el.presetCards[idx].focus(); applyPreset(el.presetCards[idx].dataset.preset); }
      });
    });
    el.btnFullPreset.addEventListener("click", () => applyPreset(state.preset, { full: true }));
    $$("[data-cardborder]").forEach((b) => b.addEventListener("click", () => { state.styleAdv.cardBorder = b.dataset.cardborder; touch("style"); update(); flash("shadow"); say("pai", "pai.introShaped", { mood: "react" }); }));
    $("#border-width").addEventListener("input", (e) => { state.styleAdv.borderWidth = +e.target.value; touch("style"); update(); flash("radius"); });
    $("#button-weight").addEventListener("input", (e) => { state.styleAdv.buttonWeight = +e.target.value; touch("style"); update(); });

    // Colours
    el.palettes.forEach((b) => b.addEventListener("click", () => {
      Object.assign(state.colors, { primary: b.dataset.p, secondary: b.dataset.s, tertiary: b.dataset.t });   // tertiary stays a suggestion unless enabled
      touch("colors"); clearOverrides(); update();
      if (state.reveal >= 2) splash(b.dataset.p);
      afterColor("primary", b.dataset.palette);
    }));
    $$('input[type="color"][data-color]').forEach((p) => p.addEventListener("input", () => setColor(p.dataset.color, p.value, { quiet: true })));
    el.tertiarySwitch.addEventListener("click", () => {
      state.tertiaryOn = !state.tertiaryOn;
      touch("colors"); clearOverrides(); update();
      say("famai", state.tertiaryOn ? "famai.tertiaryOn" : "famai.tertiaryOff", { params: () => colorLine("tertiary"), mood: "react" });
      flash("color");
    });
    $$(".hex").forEach((h) => {
      h.addEventListener("input", () => {
        const ok = setColor(h.dataset.color, h.value, { fromTyping: true, quiet: true });
        h.setAttribute("aria-invalid", String(!ok && h.value.replace("#", "").length >= 6));
        if (ok) el.hexError.hidden = true;
      });
      h.addEventListener("change", () => {
        const n = normalizeHex(h.value);
        if (!n) { h.setAttribute("aria-invalid", "true"); h.setAttribute("aria-describedby", "hex-error"); el.hexError.textContent = t("color.hexError", { value: h.value }); el.hexError.hidden = false; return; }
        h.value = n.toUpperCase(); h.setAttribute("aria-invalid", "false"); h.removeAttribute("aria-describedby"); el.hexError.hidden = true;
      });
    });

    // Typography
    el.pairs.addEventListener("click", (e) => { const b = e.target.closest(".pair"); if (b) setFonts(b.dataset.h, b.dataset.b, b.dataset.pair); });
    [el.fontHeading, el.fontBody].forEach((sel) => sel.addEventListener("change", () => {
      const f = { ...state.fonts, [sel.dataset.font]: sel.value }; setFonts(f.heading, f.body);
    }));
    const typeTune = () => whenQuiet(() => say("act", "act.tune", { mood: "react" }));
    $("#heading-weight").addEventListener("input", (e) => { state.typeAdv.headingWeight = +e.target.value; touch("type"); update(); flash("type"); typeTune(); });
    el.typeRatio.addEventListener("change", () => {
      state.typeAdv.typeRatio = +el.typeRatio.value; touch("type"); update(); flash("type");
      say("act", "act.scale", { params: () => ({ how: t(+el.typeRatio.value >= 1.3 ? "say.act.stepBold" : "say.act.stepGentle") }), mood: "react" });
    });
    $("#line-height").addEventListener("input", (e) => { state.typeAdv.lineHeight = +e.target.value; touch("type"); update(); flash("type"); typeTune(); });
    $("#tracking").addEventListener("input", (e) => { state.typeAdv.tracking = +e.target.value; touch("type"); update(); flash("type"); typeTune(); });
    el.fontAccent.addEventListener("change", () => {
      state.typeAdv.accentFont = el.fontAccent.value; touch("type"); update(); flash("type");
      say("act", "act.font", { params: { font: el.fontAccent.value }, mood: "react" });
    });
    $("#btn-type-auto").addEventListener("click", () => { state.typeAdv = {}; delete state.touched.type; update(); flash("type"); });

    // Shape — sliders update live; MIN answers once the hand stops
    $("#radius").addEventListener("input", (e) => {
      state.radius = +e.target.value; touch("radius"); update(); flash("radius");
      whenQuiet(() => { say("min", radiusLine(), { mood: "react" }); maybeTeam(); });
    });
    $$("button[data-corner]").forEach((b) => b.addEventListener("click", () => {
      state.corner = b.dataset.corner; update(); flash("radius");
      say("min", state.corner === "smooth" ? "min.smooth" : "min.standard", { mood: "react" }); maybeTeam();
    }));
    [["r-button", "button"], ["r-input", "input"], ["r-card", "card"]].forEach(([id, k]) => $(`#${id}`).addEventListener("input", (e) => {
      state.radii[k] = +e.target.value; touch("radii"); update(); flash("radius");
      whenQuiet(() => { say("min", radiusLine(), { mood: "react" }); maybeTeam(); });
    }));
    $("#btn-radius-auto").addEventListener("click", () => { state.radii = {}; delete state.touched.radii; update(); flash("radius"); });

    // Effects
    $$("[data-density]").forEach((b) => b.addEventListener("click", () => {
      state.density = b.dataset.density; touch("density"); update(); flash("density");
      say("min", `min.${state.density}`, { mood: "react" }); maybeTeam();
    }));
    $$("[data-shadow]").forEach((b) => b.addEventListener("click", () => {
      state.shadow = b.dataset.shadow; state.shadowCustom = null; touch("shadow"); update(); flash("shadow");
      say("min", { none: "min.none", soft: "min.shadowSoft", elevated: "min.elevated" }[state.shadow], { mood: "react" }); maybeTeam();
    }));
    $("#space-base").addEventListener("input", (e) => { state.spaceBase = +e.target.value; touch("density"); update(); flash("density"); whenQuiet(() => say("min", "min.mid", { mood: "react" })); });
    [["sh-y", "y"], ["sh-blur", "blur"], ["sh-spread", "spread"], ["sh-opacity", "opacity"]].forEach(([id, k]) => $(`#${id}`).addEventListener("input", (e) => {
      state.shadowCustom = { ...resolved(state).shadow, [k]: +e.target.value }; touch("shadow"); update(); flash("shadow");
      whenQuiet(() => say("min", "min.custom", { mood: "react" }));
    }));

    // FAH (summary + details share actions)
    const fahClick = (e) => {
      if (e.target.closest("[data-fix-all]")) return applyFixes();
      const f = e.target.closest("[data-fix]"); if (f) return applyFixes({ id: f.dataset.fix, mode: f.dataset.fixMode });
      if (e.target.closest("[data-undo-fix]")) return undoFixes();
      if (e.target.closest("[data-open-audit]")) return toggleDrawer(true);
      if (e.target.closest("[data-refine]")) { state.category = "color"; setFlow("free"); return setCategory("color"); }
      if (e.target.closest("[data-fullscreen]")) return toggleFullscreen();
      if (e.target.closest("[data-export]")) return openExport();
    };
    el.fahResult.addEventListener("click", fahClick);
    el.drawerBody.addEventListener("click", fahClick);
    el.auditChip.addEventListener("click", () => toggleDrawer());
    el.btnDrawerClose.addEventListener("click", () => toggleDrawer(false));
    el.drawer.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); toggleDrawer(false); } });

    // Canvas header
    wireMenu(el.btnPreview, el.previewMenu);
    wireMenu(el.btnView, el.viewMenu);
    $$("[data-preview]", el.previewMenu).forEach((b) => b.addEventListener("click", () => {
      state.preview = b.dataset.preview; closeMenu(true); syncLayout(); save(); fitZoomNow(); el.stageScroll.scrollTop = 0; el.frame.scrollTop = 0;
    }));
    $$("[data-mode]", el.viewMenu).forEach((b) => b.addEventListener("click", () => { state.mode = b.dataset.mode; closeMenu(true); update(); }));
    $$("[data-zoom]", el.viewMenu).forEach((b) => b.addEventListener("click", () => { state.zoom = b.dataset.zoom; closeMenu(true); syncLayout(); save(); fitZoomNow(); }));
    const setViewport = (v) => {
      if (v === state.viewport || el.vpSwitch.classList.contains("is-unavailable")) return;
      state.viewport = v; previewMenus.closeAll(); syncLayout(); save(); fitZoomNow(); el.stageScroll.scrollTop = 0; el.frame.scrollTop = 0;
    };
    el.vpBtns.forEach((b) => b.addEventListener("click", () => setViewport(b.dataset.vp)));
    el.vpSwitch.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const i = el.vpBtns.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault();
      const n = e.key === "Home" ? 0 : e.key === "End" ? el.vpBtns.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + el.vpBtns.length) % el.vpBtns.length;
      el.vpBtns[n].focus();
    });
    el.miFullscreen.addEventListener("click", () => { closeMenu(); toggleFullscreen(); });
    if (!el.stageScroll.requestFullscreen) el.miFullscreen.hidden = true;
    document.addEventListener("fullscreenchange", () => { syncLayout(); fitZoom(); });
    document.addEventListener("pointerdown", (e) => { if (openMenu && !openMenu.menu.contains(e.target) && !openMenu.btn.contains(e.target)) closeMenu(); });
    el.clayCanvas.addEventListener("click", () => clay && clay.poke());
    if (window.ResizeObserver) { const ro = new ResizeObserver(fitZoom); ro.observe(el.stageScroll); ro.observe(el.frame); }
    window.addEventListener("resize", fitZoom);
    // Scrolling the preview: lower-priority bubbles step aside so the creation stays readable
    el.stageScroll.addEventListener("scroll", () => { if (!el.bubble.hidden && comp.msg && comp.msg.prio > 1) hideBubble(); }, { passive: true });

    // Companion
    el.bubbleClose.addEventListener("click", () => { hideBubble(); el.buddy.focus(); });
    el.buddy.addEventListener("click", () => { if (el.bubble.hidden) reopenBubble(); else setMood("react", 900); });
    ["pointerdown", "keydown"].forEach((ev) => el.playground.addEventListener(ev, armIdle, { passive: true }));

    // Export dialog
    el.exportTabs.forEach((tb, i) => {
      tb.addEventListener("click", () => showExport(tb.dataset.format));
      tb.addEventListener("keydown", (e) => {
        const n = el.exportTabs.length, idx = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : -1;
        if (idx >= 0) { e.preventDefault(); el.exportTabs[idx].focus(); showExport(el.exportTabs[idx].dataset.format); }
      });
    });
    el.btnCopy.addEventListener("click", async () => {
      const text = exportCache[exportFormat];
      try { await navigator.clipboard.writeText(text); toast(t("toast.copied", { format: exportFormat.toUpperCase() })); }
      catch (_) {
        const range = document.createRange(); range.selectNodeContents(el.exportCode);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        const ok = document.execCommand && document.execCommand("copy");
        toast(ok ? t("toast.copied", { format: exportFormat.toUpperCase() }) : t("toast.copyBlocked"));
      }
    });
    el.btnDlCss.addEventListener("click", () => {
      if (!exportCache.cssCheck.ok) { toast(t("export.cssBad", { error: exportCache.cssCheck.errors[0] })); return; }
      download(exportCache.css, "moldable-dev-tokens.css", "text/css"); toast(t("toast.cssDownloaded"));
    });
    el.btnDlJson.addEventListener("click", () => { download(exportCache.json, `${slug()}.tokens.json`, "application/json"); toast(t("toast.jsonDownloaded")); });
    el.figFiles.addEventListener("click", (e) => { const b = e.target.closest("[data-fig-file]"); if (b && downloadFigma(b.dataset.figFile)) toast(t("toast.figDownloaded", { file: FIG.files[b.dataset.figFile] })); });
    el.btnDlFigma.addEventListener("click", () => {
      // three separate files (Figma imports one file per mode) — spaced so the browser keeps all three
      ["prim", "light", "dark", "size"].forEach((k, i) => setTimeout(() => { if (downloadFigma(k)) toast(t("toast.figDownloaded", { file: FIG.files[k] })); }, i * 350));
    });
    [el.dialog, el.resetDialog, el.proDialog].forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
    wireLibrary();
    wirePlayful();
    wireMinimal();
    wirePremium();

    // Tooltip (Tooltip.tsx: hover + focus, Escape closes). Delegated, so generated buttons get it too.
    const tip = el.tooltip;
    const showTip = (tg) => {
      tip.textContent = tg.dataset.tip; tip.classList.add("is-visible"); tg.setAttribute("aria-describedby", "tooltip");
      const r = tg.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.classList.toggle("is-right", tg.dataset.tipSide === "right");
      if (tg.dataset.tipSide === "right") {   // icon-only Tool Rail: label sits beside the button, never clipped by rail or inspector
        tip.classList.remove("is-below");
        tip.style.left = `${r.right + 10}px`; tip.style.top = `${Math.max(8, r.top + r.height / 2 - h / 2)}px`;
        return;
      }
      const below = r.top - h - 10 < 8;
      tip.classList.toggle("is-below", below);
      tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${below ? r.bottom + 10 : r.top - h - 10}px`;
    };
    const hideTip = (tg) => { tip.classList.remove("is-visible"); tg && tg.removeAttribute("aria-describedby"); };
    const tipOf = (e) => e.target.closest && e.target.closest("[data-tip]");
    document.addEventListener("mouseover", (e) => { const tg = tipOf(e); if (tg && !(tg.getAttribute("aria-expanded") === "true")) showTip(tg); });
    document.addEventListener("mouseout", (e) => { const tg = tipOf(e); if (tg && !tg.contains(e.relatedTarget)) hideTip(tg); });
    document.addEventListener("focusin", (e) => { const tg = tipOf(e); if (tg) showTip(tg); });
    document.addEventListener("focusout", (e) => { const tg = tipOf(e); if (tg) hideTip(tg); });
    document.addEventListener("click", (e) => { const tg = tipOf(e); if (tg) hideTip(tg); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(document.querySelector("[aria-describedby='tooltip']")); });

    // Ctrl/Cmd+E opens export
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e" && !el.playground.hidden) { e.preventDefault(); openExport(); }
    });
  };

  /* ---------------------------------------------------------------------
     Playful preview — small, real interactions (filters, chart day selection). Everything else is sample content.
     --------------------------------------------------------------------- */
  const renderPlayfulDynamic = () => {
    const dash = el.playful.dashboard;
    const sel = $(".pfd-bar[aria-pressed=true]", dash);
    if (sel) $("[data-pfd-detail]", dash).textContent = t("pfl.dash.detail", { day: t(`pfl.dash.days.${sel.dataset.day}`), hours: sel.dataset.hours });
    $$(".pfd-bar", dash).forEach((b) => b.setAttribute("aria-label", `${t(`pfl.dash.days.${b.dataset.day}`)}, ${b.dataset.hours} h`));
    const shown = $$(".pfd-proj", dash).filter((n) => !n.hidden).length;
    $("[data-pfd-count]", dash).textContent = t("pfl.dash.count", { count: shown });
  };
  /* Preview mobile menus (Phase 09 · 09.2) — one controller for every template's mobile header (CSS shows the header only
     in a ≤600px preview). Hooks are data attributes, so each preset keeps its own styling:
       [data-pm-bar] sticky header · [data-pm-toggle] disclosure button · [data-pm-menu] the menu · [data-pm-go] items
       [data-pm-title] optional "current page" label. Picking a destination marks it current (mirrored on the desktop nav,
     so switching back keeps the choice), closes the menu and scrolls the preview to the matching section. */
  const previewMenus = (() => {
    const cfg = new Map();          // root → { targets: [selector|null], current: "page"|"true", title: i => key, onSelect(i, root) }
    const parts = (root) => ({ btn: $("[data-pm-toggle]", root), menu: $("[data-pm-menu]", root) });
    const close = (root, { focus = false } = {}) => {
      const { btn, menu } = parts(root); if (!btn || !menu || menu.hidden) return;
      menu.hidden = true; btn.setAttribute("aria-expanded", "false");
      if (focus) btn.focus();
    };
    const closeAll = () => cfg.forEach((_, r) => close(r));
    const open = (root) => { const { btn, menu } = parts(root); menu.hidden = false; btn.setAttribute("aria-expanded", "true"); };
    // Scroll the preview frame (the mobile page's own scroller) so the section sits just under the sticky header
    const scrollToSection = (root, sel) => {
      const target = sel && $(sel, root); if (!target) return;
      const bar = $("[data-pm-bar]", root);
      const z = zoomNow || 1, fr = el.frame.getBoundingClientRect(), tr = target.getBoundingClientRect();
      const top = el.frame.scrollTop + (tr.top - fr.top) / z - (bar ? bar.offsetHeight : 0) - 12;
      el.frame.scrollTo({ top: Math.max(0, top), behavior: motionOK() ? "smooth" : "auto" });
    };
    const select = (root, go) => {
      const c = cfg.get(root);
      const i = Number(go);
      if (Number.isNaN(i)) { close(root, { focus: true }); return; }         // a CTA inside the menu (e.g. Join / Contact)
      $$("[data-pm-menu] [data-pm-go]", root).filter((b) => !Number.isNaN(Number(b.dataset.pmGo))).forEach((b, k) => {
        const on = k === i; b.classList.toggle("is-active", on); if (on) b.setAttribute("aria-current", c.current); else b.removeAttribute("aria-current");
      });
      const title = $("[data-pm-title]", root);
      if (title && c.title) { title.dataset.i18n = c.title(i); title.textContent = t(title.dataset.i18n); }
      if (c.onSelect) c.onSelect(i, root);
      close(root, { focus: true });
      scrollToSection(root, c.targets[i]);
    };
    const wire = (root, options) => {
      if (!root || cfg.has(root)) return;
      cfg.set(root, { current: "page", ...options });
      root.addEventListener("click", (e) => {
        const tg = e.target.closest("[data-pm-toggle]");
        if (tg) { if (tg.getAttribute("aria-expanded") === "true") close(root); else open(root); return; }
        const go = e.target.closest("[data-pm-menu] [data-pm-go]");
        if (go) select(root, go.dataset.pmGo);
      });
      root.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const { menu } = parts(root); if (menu && !menu.hidden) { e.stopPropagation(); close(root, { focus: true }); }
      });
      // Outside click or focus leaving the header closes it
      document.addEventListener("pointerdown", (e) => { const { btn, menu } = parts(root); if (menu && !menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) close(root); });
      root.addEventListener("focusout", (e) => { const { btn, menu } = parts(root); if (!menu || menu.hidden) return; const n = e.relatedTarget; if (n && !menu.contains(n) && n !== btn) close(root); });
    };
    return { wire, closeAll };
  })();
  const wirePlayful = () => {
    const L = el.playful.landing, D = el.playful.dashboard;
    previewMenus.wire(L, { current: "true", targets: [".pfl-feature", ".pfl-statement", ".pfl-explore", ".pfl-explore"],   // Programs, Community, Events, Stories
      onSelect: (i) => { $$(".pfl-links .pfl-link", L).forEach((n, k) => n.classList.toggle("is-active", k === i)); if (i === 3) { const share = $("[data-pfl-filter=share]", L); share && share.click(); } } });
    previewMenus.wire(D, { targets: [".pfd-head", ".pfd-projects", ".pfd-up", ".pfd-ach", null, ".pfd-profile"],              // Home, Projects, Schedule, Community, Library, Settings
      title: (i) => `pfl.dash.nav.${i}`,
      onSelect: (i) => $$(".pfd-nav-list .pfd-nav-item", D).forEach((n, k) => { n.classList.toggle("is-active", k === i); if (k === i) n.setAttribute("aria-current", "page"); else n.removeAttribute("aria-current"); }) });
    L.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pfl-filter]"); if (!b) return;
      const v = b.dataset.pflFilter;
      $$("[data-pfl-filter]", L).forEach((x) => { const on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
      let n = 0; $$(".pfl-tile", L).forEach((tile) => { tile.hidden = v !== "all" && tile.dataset.cat !== v; if (!tile.hidden) n++; });
      $(".pfl-grid", L).classList.toggle("is-filtered", v !== "all");
      $("[data-pfl-empty]", L).hidden = n > 0;
      fitZoom();
    });
    D.addEventListener("click", (e) => {
      const f = e.target.closest("[data-pfd-filter]");
      if (f) {
        const v = f.dataset.pfdFilter;
        $$("[data-pfd-filter]", D).forEach((x) => { const on = x === f; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
        $$(".pfd-proj", D).forEach((n) => { n.hidden = v !== "all" && n.dataset.cat !== v; });
        return renderPlayfulDynamic();
      }
      const bar = e.target.closest(".pfd-bar");
      if (bar) { $$(".pfd-bar", D).forEach((x) => x.setAttribute("aria-pressed", String(x === bar))); renderPlayfulDynamic(); }
    });
    renderPlayfulDynamic();
  };

  /* ---------------------------------------------------------------------
     Minimal preview (P3) — period switch, bar selection, task filter, project search, sidebar selection.
     Sample data only; nothing here claims to be live.
     --------------------------------------------------------------------- */
  const MN_SERIES = {
    week: { labels: "days", values: [18, 22, 19, 31, 24, 9, 5] },             // 128 — matches "128 of 164 planned"
    month: { labels: "weeks", values: [96, 112, 104, 121, 128] },             // ends with this week
    year: { labels: "months", values: [402, 388, 420, 451, 436, 470, 462, 489, 455, 512, 529, 561] },   // ends with September → October
  };
  const mn = { period: "week", sel: null };
  /** Axis top with four even, readable steps (1 · 1.5 · 2 · 2.5 · 3 · 4 · 5 · 6 · 8 × 10ⁿ). */
  const niceMax = (v) => { const raw = (v * 1.08) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))); const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * mag).find((x) => x >= raw); return step * 4; };
  const mnFmt = (n) => n.toLocaleString(lang === "th" ? "th-TH" : "en-US");
  const renderMinimalDynamic = () => {
    const D = el.minimal.dashboard; if (!D) return;
    const ser = MN_SERIES[mn.period], labels = t(`mnd.${ser.labels}`), vals = ser.values;
    const max = niceMax(Math.max(...vals)), peak = vals.indexOf(Math.max(...vals));
    if (mn.sel === null || mn.sel >= vals.length) mn.sel = peak;
    const total = vals.reduce((a, b) => a + b, 0), avg = Math.round(total / vals.length);
    $("[data-mnd-yaxis]", D).innerHTML = [0, 0.25, 0.5, 0.75, 1].map((f) => `<span style="--p:${f * 100}%">${mnFmt(Math.round(max * f))}</span>`).join("");
    const plot = $(".mnd-plot", D);
    $$(".mnd-gridline", plot).forEach((n) => n.remove());
    [0.25, 0.5, 0.75, 1].forEach((f) => { const g = document.createElement("i"); g.className = "mnd-gridline"; g.style.setProperty("--p", `${f * 100}%`); plot.prepend(g); });
    const avgEl = $("[data-mnd-avg]", D); avgEl.style.setProperty("--p", `${(avg / max) * 100}%`); avgEl.firstElementChild.textContent = t("mnd.avg", { value: mnFmt(avg) });
    $("[data-mnd-bars]", D).innerHTML = vals.map((v, i) => `<button type="button" class="mnd-bar" data-mnd-bar="${i}" aria-pressed="${i === mn.sel}" aria-label="${t("mnd.barLabel", { label: labels[i], value: mnFmt(v) })}" style="--h:${(v / max) * 100}%"><b aria-hidden="true">${mnFmt(v)}</b><i></i><em aria-hidden="true">${labels[i]}</em></button>`).join("");
    $("[data-mnd-detail]", D).textContent = t(mn.sel === peak ? "mnd.detailPeak" : "mnd.detail", { label: labels[mn.sel], value: mnFmt(vals[mn.sel]) });
    $("[data-mnd-range]", D).textContent = t(`mnd.range.${mn.period}`);
    $("[data-mnd-total]", D).textContent = mnFmt(total);
    $("[data-mnd-total-foot]", D).textContent = t(`mnd.totalFoot.${mn.period}`);
    $$("[data-mnd-period]", D).forEach((b) => { const on = b.dataset.mndPeriod === mn.period; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    const shown = $$(".mnd-task", D).filter((n) => !n.hidden).length;
    $("[data-mnd-count]", D).textContent = t("mnd.count", { count: shown });
    $("[data-mnd-empty]", D).hidden = shown > 0;
    const q = ($("[data-mnd-search]", D).value || "").trim().toLowerCase();
    let rows = 0; $$("tbody tr[data-name]", D).forEach((r) => { r.hidden = !!q && !r.dataset.name.includes(q); if (!r.hidden) rows++; });
    const none = $("[data-mnd-noresult]", D); none.hidden = rows > 0; none.firstElementChild.textContent = rows ? "" : t("mnd.noResult", { q });
    $("[data-mnd-rowcount]", D).textContent = t("mnd.rowCount", { shown: rows });
  };
  const wireMinimal = () => {
    const D = el.minimal.dashboard; if (!D) return;
    D.addEventListener("click", (e) => {
      const p = e.target.closest("[data-mnd-period]");
      if (p) { mn.period = p.dataset.mndPeriod; mn.sel = null; renderMinimalDynamic(); return; }
      const bar = e.target.closest("[data-mnd-bar]");
      if (bar) { mn.sel = +bar.dataset.mndBar; renderMinimalDynamic(); $(`[data-mnd-bar="${mn.sel}"]`, D).focus(); return; }
      const f = e.target.closest("[data-mnd-filter]");
      if (f) {
        const v = f.dataset.mndFilter;
        $$("[data-mnd-filter]", D).forEach((x) => { const on = x === f; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
        $$(".mnd-task", D).forEach((n) => { n.hidden = v !== "all" && n.dataset.status !== v; });
        renderMinimalDynamic(); fitZoom(); return;
      }
      const nav = e.target.closest("[data-mnd-nav]");
      if (nav) {
        $$("[data-mnd-nav]", D).forEach((x) => { const on = x === nav; x.classList.toggle("is-active", on); x.setAttribute("aria-current", on ? "page" : "false"); });
        // keep the mobile menu + header label in step with the desktop sidebar
        const i = +nav.dataset.mndNav, title = $("[data-pm-title]", D);
        $$("[data-pm-menu] [data-pm-go]", D).forEach((b, k) => { b.classList.toggle("is-active", k === i); if (k === i) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
        if (title) { title.dataset.i18n = `mnd.nav.${i}`; title.textContent = t(title.dataset.i18n); }
      }
    });
    // arrow keys move along the bars (one tab stop per chart is not required here; each bar stays a button)
    D.addEventListener("keydown", (e) => {
      const bar = e.target.closest("[data-mnd-bar]"); if (!bar || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const n = MN_SERIES[mn.period].values.length;
      mn.sel = (+bar.dataset.mndBar + (e.key === "ArrowRight" ? 1 : n - 1)) % n;
      renderMinimalDynamic(); $(`[data-mnd-bar="${mn.sel}"]`, D).focus();
    });
    $("[data-mnd-search]", D).addEventListener("input", () => { renderMinimalDynamic(); fitZoom(); });
    // Mobile header menus (Phase 09.2). Dashboard items drive the real sidebar buttons, so both stay in step.
    const ML = el.minimal.landing;
    previewMenus.wire(ML, { current: "true", targets: [".mnl-work", ".mnl-philo", ".mnl-process", ".mnl-foot"],               // Work, Studio, Process, Journal
      onSelect: (i) => $$(".mnl-links > span", ML).forEach((n, k) => n.classList.toggle("is-active", k === i)) });
    previewMenus.wire(D, { targets: [".mnd-head", ".mnd-table-card", ".mnd-tasks-card", ".mnd-progress-card", ".mnd-chart-card"], // Overview, Projects, Tasks, Calendar, Reports
      title: (i) => `mnd.nav.${i}`, onSelect: (i) => { const b = $(`.mnd-side [data-mnd-nav="${i}"]`, D); b && b.click(); } });
    renderMinimalDynamic();
  };

  /* Premium preview (Phase 09.3) — mobile header menus through the shared previewMenus controller.
     The desktop sidebar items are static; the mobile choice is mirrored onto them so Desktop shows the same page. */
  const wirePremium = () => {
    const PL = el.premium && el.premium.landing, PD = el.premium && el.premium.dashboard;
    previewMenus.wire(PL, { current: "true", targets: [".pvp-collection", ".pvp-col-grid", ".pvp-story", ".pvp-statement"],   // Collection, Objects, Spaces, Journal
      onSelect: (i) => $$(".pvp-links > span", PL).forEach((n, k) => n.classList.toggle("is-active", k === i)) });
    previewMenus.wire(PD, { targets: [".pvp-dash-head", ".pvp-table-panel", ".pvp-top-panel", ".pvp-table-panel", null],         // Overview, Orders, Collection, Clients, Journal
      title: (i) => `pvp.dash.nav.${i}`,
      onSelect: (i) => $$(".pvp-side-item", PD).forEach((n, k) => n.classList.toggle("is-active", k === i)) });
  };

  const resetAll = () => {
    const snapshot = JSON.parse(JSON.stringify(state));
    state = { ...DEFAULTS(), name: state.name };
    toggleDrawer(false);
    comp.tipsShown = {};
    update(); if (!el.playground.hidden) showClay();
    contextIntro();
    toast(t("toast.reset"), { label: t("toast.undo"), run: () => {
      state = snapshot; update();
      if (state.shaped) showArtboardNow();
      contextIntro();
    } });
  };

  /* ---------------------------------------------------------------------
     20. Component library (Phase 04) — catalog, tiers, entitlement
         The 27 documented entries of moldable-design-system (src/app/docs/components/*),
         each checked against its source in src/components/*. Variants, sizes and states
         below are the props the source accepts — nothing invented.
     --------------------------------------------------------------------- */
  const LIB_CATEGORIES = ["actions", "forms", "selection", "navigation", "structure", "feedback"];

  /** Provisional Free / Pro split. Change it here and nowhere else. Anything not listed is Free. */
  const COMPONENT_TIERS = {
    dialog: "pro",   // the single locked example of the Free / Pro experience in this prototype
  };
  /**
   * Prototype entitlement. There are no accounts, billing or licences in this prototype, so everyone is on Free.
   * Client-side checks are a presentation rule, not access control: Pro entries ship no copyable code at all.
   */
  const ENTITLEMENT = { plan: "free" };
  const canUse = (c) => !!c && (c.tier === "free" || ENTITLEMENT.plan === "pro");

  /** Scope of this prototype: interactive examples for four components + one locked Pro demo. The rest are catalog names. */
  const DEMO_READY = new Set(["button", "icon-button", "text-field", "cards", "dialog"]);
  const COLORS7 = ["default", "primary", "secondary", "success", "warning", "danger", "info"];
  const entry = (id, name, category, source, spec) => ({
    id, name, category, source, status: DEMO_READY.has(id) ? "available" : "catalog", tier: COMPONENT_TIERS[id] || "free",
    opts: {}, def: {}, states: [], sizePx: {}, keywords: "", ...spec,
  });
  /** opts = real prop axes (shown as switchable variants / sizes), def = the source defaults, states = what the source styles */
  const COMPONENT_CATALOG = [
    // Actions
    entry("button", "Button", "actions", "actionable/Buttons.tsx", { opts: { variant: ["filled", "text"], color: COLORS7, size: ["large", "medium", "small"] }, def: { variant: "filled", color: "primary", size: "medium" }, states: ["default", "hover", "active", "focus", "disabled"], sizePx: { large: 48, medium: 40, small: 32 }, keywords: "cta action submit ปุ่ม" }),
    entry("icon-button", "Icon Button", "actions", "actionable/IconButtons.tsx", { opts: { variant: ["filled", "text"], color: COLORS7, size: ["large", "medium", "small"] }, def: { variant: "filled", color: "primary", size: "medium" }, states: ["default", "hover", "active", "focus", "disabled"], sizePx: { large: 48, medium: 40, small: 32 }, keywords: "icon action ไอคอน ปุ่ม" }),
    entry("dialog", "Dialog", "actions", "actionable/Dialog.tsx", { opts: { type: ["overlay", "bottom", "bottom-floating"] }, def: { type: "overlay" }, keywords: "modal sheet popup bottom sheet โมดอล หน้าต่าง" }),
    // Forms & input
    entry("checkbox", "Checkbox", "forms", "forms-and-input/Checkbox.tsx", { opts: { value: ["checked", "unchecked", "indeterminate"] }, def: { value: "checked" }, states: ["default", "hover", "focus", "disabled"], keywords: "check tick เช็กบ็อกซ์ ช่องติ๊ก" }),
    entry("radio", "Radio", "forms", "forms-and-input/RadioGroup.tsx", { opts: { value: ["checked", "unchecked"] }, def: { value: "checked" }, states: ["default", "hover", "focus", "disabled"], keywords: "radio group option ตัวเลือก" }),
    entry("search-field", "Search Field", "forms", "forms-and-input/SearchField.tsx", { opts: { variant: ["outline", "filled"], size: ["medium", "small"] }, def: { variant: "outline", size: "small" }, states: ["default", "hover", "active", "disabled", "error"], sizePx: { medium: 40, small: 32 }, keywords: "search find query ค้นหา" }),
    entry("slider", "Slider", "forms", "forms-and-input/SliderField.tsx", { opts: { type: ["continue", "range"] }, def: { type: "continue" }, states: ["default", "focus", "disabled"], keywords: "range slider volume สไลเดอร์" }),
    entry("switch", "Switch", "forms", "forms-and-input/SwitchField.tsx", { opts: { value: ["checked", "unchecked"], size: ["medium", "small"] }, def: { value: "checked", size: "medium" }, states: ["default", "hover", "focus", "disabled"], sizePx: { medium: "40 × 22", small: "28 × 16" }, keywords: "toggle on off สวิตช์ เปิดปิด" }),
    entry("text-area", "Text Area", "forms", "forms-and-input/TextArea.tsx", { opts: { variant: ["outline", "filled"] }, def: { variant: "outline" }, states: ["default", "hover", "active", "disabled", "error"], keywords: "textarea multiline message ข้อความ" }),
    entry("text-field", "Text Field", "forms", "forms-and-input/TextField.tsx", { opts: { variant: ["outline", "filled"], size: ["medium", "small"] }, def: { variant: "outline", size: "medium" }, states: ["default", "hover", "active", "disabled", "error"], sizePx: { medium: 40, small: 32 }, keywords: "input textfield form ช่องกรอก อินพุต" }),
    // Selection
    entry("dropdowns", "Dropdowns", "selection", "selection/DropdownMenu.tsx", { opts: { content: ["icons-shortcuts", "sections-dividers"] }, def: { content: "icons-shortcuts" }, keywords: "dropdown menu actions ดรอปดาวน์" }),
    entry("select", "Select", "selection", "selection/Select.tsx", { opts: { mode: ["single", "multiple"] }, def: { mode: "single" }, states: ["default", "active", "disabled"], keywords: "select listbox picker combobox ตัวเลือก เลือก" }),
    entry("tag", "Tag", "selection", "selection/Tag.tsx", { opts: { variant: ["filled", "outline"], color: COLORS7, size: ["small", "extra-small"] }, def: { variant: "filled", color: "primary", size: "small" }, states: ["default", "hover"], sizePx: { small: 32, "extra-small": 24 }, keywords: "chip label pill แท็ก ป้าย" }),
    // Navigation
    entry("breadcrumbs", "Breadcrumbs", "navigation", "navigation/Breadcrums.tsx", { opts: { example: ["simple", "with-icon", "custom-separator"] }, def: { example: "simple" }, states: ["default", "hover", "focus"], keywords: "breadcrumb path trail เส้นทาง" }),
    entry("menu", "Menu", "navigation", "navigation/Menu.tsx", { opts: { orientation: ["vertical", "horizontal"] }, def: { orientation: "vertical" }, keywords: "menu navigation sidebar เมนู" }),
    entry("pagination", "Pagination", "navigation", "navigation/Pagination.tsx", { opts: {}, keywords: "pages paging next previous แบ่งหน้า" }),
    entry("tabs", "Tabs", "navigation", "navigation/Tabs.tsx", { opts: { variant: ["underlined", "filled"], size: ["medium", "small"] }, def: { variant: "underlined", size: "medium" }, states: ["default", "hover", "selected", "focus", "disabled"], sizePx: { medium: 40, small: 32 }, keywords: "tab tablist segmented แท็บ" }),
    // Structural & layout
    entry("accordion", "Accordion", "structure", "structural-and-layout/Accordion.tsx", { opts: { variant: ["default", "outline"] }, def: { variant: "default" }, keywords: "collapse expand disclosure faq แอคคอร์เดียน" }),
    entry("cards", "Cards", "structure", "structural-and-layout/Card.tsx", { opts: { type: ["icon", "image", "custom"], direction: ["horizontal", "vertical"] }, def: { type: "icon", direction: "horizontal" }, keywords: "card surface tile การ์ด" }),
    // Visual & feedback
    entry("avatars", "Avatars", "feedback", "visual-and-feedback/Avatar.tsx", { opts: { type: ["initials", "moldablemoji"], shape: ["circle", "square"], size: ["large", "medium", "small"] }, def: { type: "initials", shape: "circle", size: "medium" }, sizePx: { large: 40, medium: 32, small: 24 }, keywords: "avatar profile user photo อวาตาร์ โปรไฟล์" }),
    entry("badge", "Badge", "feedback", "visual-and-feedback/Badge.tsx", { opts: { variant: ["dot", "single", "multiple", "max"], color: COLORS7 }, def: { variant: "multiple", color: "primary" }, keywords: "badge counter dot notification ตัวเลข แจ้งเตือน" }),
    entry("banner", "Banner", "feedback", "visual-and-feedback/Banner.tsx", { opts: { color: COLORS7, position: ["inline", "top", "top-left", "top-right", "bottom", "bottom-left", "bottom-right"] }, def: { color: "default", position: "inline" }, keywords: "alert notice toast message แบนเนอร์ แจ้งเตือน" }),
    entry("progress-bar", "Progress Bar", "feedback", "visual-and-feedback/ProgressBar.tsx", { opts: { color: ["primary", "secondary", "success", "warning", "error"], size: ["large", "medium", "small"] }, def: { color: "primary", size: "medium" }, sizePx: { large: 12, medium: 8, small: 6 }, keywords: "progress loading upload ความคืบหน้า" }),
    entry("rating", "Rating", "feedback", "visual-and-feedback/Rating.tsx", { opts: { size: ["large", "medium", "small"], mode: ["interactive", "read-only"] }, def: { size: "medium", mode: "interactive" }, keywords: "stars review score ดาว คะแนน" }),
    entry("skeleton", "Skeleton", "feedback", "visual-and-feedback/Skeleton.tsx", { opts: { part: ["thumbnail", "display-text", "lines"] }, def: { part: "thumbnail" }, keywords: "loading placeholder shimmer โหลด" }),
    entry("spinner", "Spinner", "feedback", "visual-and-feedback/Spinner.tsx", { opts: { size: ["xl", "large", "medium", "small"] }, def: { size: "medium" }, sizePx: { xl: 48, large: 40, medium: 32, small: 24 }, keywords: "loading loader progress โหลด" }),
    entry("table", "Table", "feedback", "visual-and-feedback/Table.tsx", { opts: { cell: ["default", "checkbox", "actions"] }, def: { cell: "default" }, keywords: "table grid data rows ตาราง" }),
  ];
  const compById = (id) => COMPONENT_CATALOG.find((c) => c.id === id);

  /* ---------------------------------------------------------------------
     21. Component library — demos
         One shared markup for every preset: Premium, Minimal and Playful differ only through the
         generated tokens (colour, fonts, radius, shadow, density, Light/Dark). Free entries get a live,
         interactive demo plus galleries; Pro entries get a static representative picture and no code.
     --------------------------------------------------------------------- */
  const ICONS = {
    heart: "M11.9932 5.13581C9.9938 2.7984 6.65975 2.16964 4.15469 4.31001C1.64964 6.45038 1.29697 10.029 3.2642 12.5604C4.89982 14.6651 9.84977 19.1041 11.4721 20.5408C11.6536 20.7016 11.7444 20.7819 11.8502 20.8135C11.9426 20.8411 12.0437 20.8411 12.1361 20.8135C12.2419 20.7819 12.3327 20.7016 12.5142 20.5408C14.1365 19.1041 19.0865 14.6651 20.7221 12.5604C22.6893 10.029 22.3797 6.42787 19.8316 4.31001C17.2835 2.19216 13.9925 2.7984 11.9932 5.13581Z",
    check: "M20 6L9 17L4 12",
    minus: "M5 12H19",
    plus: "M12 5V19M5 12H19",
    x: "M18 6L6 18M6 6L18 18",
    search: "M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z",
    chevDown: "M6 9L12 15L18 9",
    chevRight: "M9 18L15 12L9 6",
    chevLeft: "M15 18L9 12L15 6",
    arrowLeft: "M19 12H5M12 5L5 12L12 19",
    lock: "M7.10102 10H7V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10H16.899M12 14V16M19 15C19 18.866 15.866 22 12 22C8.13401 22 5 18.866 5 15C5 11.134 8.13401 8 12 8C15.866 8 19 11.134 19 15Z",
    copy: "M7.5 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V16.5M6.2 21H14.3C15.4201 21 15.9802 21 16.408 20.782C16.7843 20.5903 17.0903 20.2843 17.282 19.908C17.5 19.4802 17.5 18.9201 17.5 17.8V9.7C17.5 8.57989 17.5 8.01984 17.282 7.59202C17.0903 7.21569 16.7843 6.90973 16.408 6.71799C15.9802 6.5 15.4201 6.5 14.3 6.5H6.2C5.0799 6.5 4.51984 6.5 4.09202 6.71799C3.71569 6.90973 3.40973 7.21569 3.21799 7.59202C3 8.01984 3 8.57989 3 9.7V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21Z",
    mail: "M13.744 2.63358L21.272 7.52679C21.538 7.69969 21.671 7.78615 21.7674 7.90146C21.8527 8.00354 21.9167 8.12162 21.9558 8.24877C22 8.39241 22 8.55104 22 8.8683V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V8.8683C2 8.55104 2 8.39241 2.04417 8.24877C2.08327 8.12162 2.14735 8.00354 2.23265 7.90146C2.32901 7.78615 2.46201 7.69969 2.72802 7.52679L10.256 2.63358M10.256 2.63358L4.06386 6.65849C3.37601 7.1056 3.03209 7.32915 2.91297 7.61264C2.80888 7.86039 2.80888 8.13961 2.91297 8.38737C3.03209 8.67086 3.37601 8.89441 4.06386 9.34151L10.256 13.3664C10.8873 13.7767 11.2029 13.9819 11.543 14.0617C11.8436 14.1323 12.1564 14.1323 12.457 14.0617C12.7971 13.9819 13.1127 13.7767 13.744 13.3664L19.9361 9.34152C20.624 8.89441 20.9679 8.67086 21.087 8.38737C21.1911 8.13961 21.1911 7.86039 21.087 7.61264C20.9679 7.32915 20.624 7.10559 19.9361 6.65849L13.744 2.63358C13.1127 2.22327 12.7971 2.01812 12.457 1.93829C12.1564 1.86774 11.8436 1.86774 11.543 1.93829C11.2029 2.01812 10.8873 2.22327 10.256 2.63358ZM21.5 19L14.8572 13M9.14282 13L2.5 19",
    image: "M16.2 21H6.93137C6.32555 21 6.02265 21 5.88238 20.8802C5.76068 20.7763 5.69609 20.6203 5.70865 20.4608C5.72312 20.2769 5.93731 20.0627 6.36569 19.6343L14.8686 11.1314C15.2646 10.7354 15.4627 10.5373 15.691 10.4632C15.8918 10.3979 16.1082 10.3979 16.309 10.4632C16.5373 10.5373 16.7354 10.7354 17.1314 11.1314L21 15V16.2M16.2 21C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2M16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2M10.5 8.5C10.5 9.60457 9.60457 10.5 8.5 10.5C7.39543 10.5 6.5 9.60457 6.5 8.5C6.5 7.39543 7.39543 6.5 8.5 6.5C9.60457 6.5 10.5 7.39543 10.5 8.5Z",
    trash: "M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6",
    archive: "M4 7.9966C3.83599 7.99236 3.7169 7.98287 3.60982 7.96157C2.81644 7.80376 2.19624 7.18356 2.03843 6.39018C2 6.19698 2 5.96466 2 5.5C2 5.03534 2 4.80302 2.03843 4.60982C2.19624 3.81644 2.81644 3.19624 3.60982 3.03843C3.80302 3 4.03534 3 4.5 3H19.5C19.9647 3 20.197 3 20.3902 3.03843C21.1836 3.19624 21.8038 3.81644 21.9616 4.60982C22 4.80302 22 5.03534 22 5.5C22 5.96466 22 6.19698 21.9616 6.39018C21.8038 7.18356 21.1836 7.80376 20.3902 7.96157C20.2831 7.98287 20.164 7.99236 20 7.9966M10 13H14M4 8H20V16.2C20 17.8802 20 18.7202 19.673 19.362C19.3854 19.9265 18.9265 20.3854 18.362 20.673C17.7202 21 16.8802 21 15.2 21H8.8C7.11984 21 6.27976 21 5.63803 20.673C5.07354 20.3854 4.6146 19.9265 4.32698 19.362C4 18.7202 4 17.8802 4 16.2V8Z",
    settings: ["M9.39512 19.3711L9.97956 20.6856C10.1533 21.0768 10.4368 21.4093 10.7958 21.6426C11.1547 21.8759 11.5737 22.0001 12.0018 22C12.4299 22.0001 12.8488 21.8759 13.2078 21.6426C13.5667 21.4093 13.8503 21.0768 14.024 20.6856L14.6085 19.3711C14.8165 18.9047 15.1665 18.5159 15.6085 18.26C16.0532 18.0034 16.5678 17.8941 17.0785 17.9478L18.5085 18.1C18.9341 18.145 19.3637 18.0656 19.7451 17.8713C20.1266 17.6771 20.4434 17.3763 20.6573 17.0056C20.8715 16.635 20.9736 16.2103 20.9511 15.7829C20.9286 15.3555 20.7825 14.9438 20.5307 14.5978L19.684 13.4344C19.3825 13.0171 19.2214 12.5148 19.224 12C19.2239 11.4866 19.3865 10.9864 19.6885 10.5711L20.5351 9.40778C20.787 9.06175 20.933 8.65007 20.9555 8.22267C20.978 7.79528 20.876 7.37054 20.6618 7C20.4479 6.62923 20.131 6.32849 19.7496 6.13423C19.3682 5.93997 18.9386 5.86053 18.5129 5.90556L17.0829 6.05778C16.5722 6.11141 16.0577 6.00212 15.6129 5.74556C15.17 5.48825 14.82 5.09736 14.6129 4.62889L14.024 3.31444C13.8503 2.92317 13.5667 2.59072 13.2078 2.3574C12.8488 2.12408 12.4299 1.99993 12.0018 2C11.5737 1.99993 11.1547 2.12408 10.7958 2.3574C10.4368 2.59072 10.1533 2.92317 9.97956 3.31444L9.39512 4.62889C9.18805 5.09736 8.83799 5.48825 8.39512 5.74556C7.95033 6.00212 7.43579 6.11141 6.92512 6.05778L5.49067 5.90556C5.065 5.86053 4.63541 5.93997 4.25399 6.13423C3.87256 6.32849 3.55569 6.62923 3.34178 7C3.12761 7.37054 3.02557 7.79528 3.04805 8.22267C3.07054 8.65007 3.21658 9.06175 3.46845 9.40778L4.31512 10.5711C4.61706 10.9864 4.77966 11.4866 4.77956 12C4.77966 12.5134 4.61706 13.0137 4.31512 13.4289L3.46845 14.5922C3.21658 14.9382 3.07054 15.3499 3.04805 15.7773C3.02557 16.2047 3.12761 16.6295 3.34178 17C3.5559 17.3706 3.87281 17.6712 4.25418 17.8654C4.63555 18.0596 5.06504 18.1392 5.49067 18.0944L6.92067 17.9422C7.43134 17.8886 7.94589 17.9979 8.39067 18.2544C8.8352 18.511 9.18688 18.902 9.39512 19.3711Z", "M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"],
    info: "M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z",
    checkCircle: "M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z",
    dots: ["M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z", "M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z", "M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z"],
    file: "M4 6.8C4 5.11984 4 4.27976 4.32698 3.63803C4.6146 3.07354 5.07354 2.6146 5.63803 2.32698C6.27976 2 7.11984 2 8.8 2H15.2C16.8802 2 17.7202 2 18.362 2.32698C18.9265 2.6146 19.3854 3.07354 19.673 3.63803C20 4.27976 20 5.11984 20 6.8V17.2C20 18.8802 20 19.7202 19.673 20.362C19.3854 20.9265 18.9265 21.3854 18.362 21.673C17.7202 22 16.8802 22 15.2 22H8.8C7.11984 22 6.27976 22 5.63803 21.673C5.07354 21.3854 4.6146 20.9265 4.32698 20.362C4 19.7202 4 18.8802 4 17.2V6.8Z",
    star: "M11.2826 3.45332C11.5131 2.98638 11.6283 2.75291 11.7848 2.67831C11.9209 2.61341 12.0791 2.61341 12.2152 2.67831C12.3716 2.75291 12.4869 2.98638 12.7174 3.45332L14.904 7.88328C14.9721 8.02113 15.0061 8.09006 15.0558 8.14358C15.0998 8.19096 15.1526 8.22935 15.2113 8.25662C15.2775 8.28742 15.3536 8.29854 15.5057 8.32077L20.397 9.03571C20.912 9.11099 21.1696 9.14863 21.2888 9.27444C21.3924 9.38389 21.4412 9.5343 21.4215 9.68377C21.3988 9.85558 21.2123 10.0372 20.8394 10.4004L17.3014 13.8464C17.1911 13.9538 17.136 14.0076 17.1004 14.0715C17.0689 14.128 17.0487 14.1902 17.0409 14.2545C17.0321 14.3271 17.0451 14.403 17.0711 14.5547L17.9059 19.4221C17.994 19.9355 18.038 20.1922 17.9553 20.3445C17.8833 20.477 17.7553 20.57 17.607 20.5975C17.4366 20.6291 17.2061 20.5078 16.7451 20.2654L12.3723 17.9658C12.2361 17.8942 12.168 17.8584 12.0962 17.8443C12.0327 17.8318 11.9673 17.8318 11.9038 17.8443C11.832 17.8584 11.7639 17.8942 11.6276 17.9658L7.25489 20.2654C6.79388 20.5078 6.56338 20.6291 6.39294 20.5975C6.24465 20.57 6.11669 20.477 6.04471 20.3445C5.96197 20.1922 6.00599 19.9355 6.09404 19.4221L6.92886 14.5547C6.95488 14.403 6.96789 14.3271 6.95909 14.2545C6.95129 14.1902 6.93108 14.128 6.89958 14.0715C6.86399 14.0076 6.80885 13.9538 6.69855 13.8464L3.16053 10.4004C2.78763 10.0372 2.60118 9.85558 2.5785 9.68377C2.55876 9.5343 2.60752 9.38389 2.71122 9.27444C2.8304 9.14863 3.08794 9.11099 3.60301 9.03571L8.49428 8.32077C8.64639 8.29854 8.72245 8.28742 8.78869 8.25662C8.84733 8.22935 8.90013 8.19096 8.94415 8.14358C8.99388 8.09006 9.0279 8.02113 9.09594 7.88328L11.2826 3.45332Z",
    user: "M5.3163 19.4384C5.92462 18.0052 7.34492 17 9 17H15C16.6551 17 18.0754 18.0052 18.6837 19.4384M16 9.5C16 11.7091 14.2091 13.5 12 13.5C9.79086 13.5 8 11.7091 8 9.5C8 7.29086 9.79086 5.5 12 5.5C14.2091 5.5 16 7.29086 16 9.5ZM22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z",
    atom: "M11.9995 12.0001H12.0095M15.535 15.5357C10.8488 20.222 5.46685 22.438 3.51423 20.4854C1.56161 18.5328 3.77769 13.1509 8.46398 8.46461C13.1503 3.77832 18.5322 1.56224 20.4848 3.51486C22.4374 5.46748 20.2213 10.8494 15.535 15.5357ZM15.535 8.46443C20.2213 13.1507 22.4374 18.5326 20.4848 20.4852C18.5321 22.4379 13.1502 20.2218 8.46394 15.5355C3.77765 10.8492 1.56157 5.4673 3.51419 3.51468C5.46681 1.56206 10.8487 3.77814 15.535 8.46443ZM12.4995 12.0001C12.4995 12.2763 12.2757 12.5001 11.9995 12.5001C11.7234 12.5001 11.4995 12.2763 11.4995 12.0001C11.4995 11.724 11.7234 11.5001 11.9995 11.5001C12.2757 11.5001 12.4995 11.724 12.4995 12.0001Z",
  };
  const ic = (n, c = "ic") => `<svg class="${c}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">${[].concat(ICONS[n]).map((d) => `<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`).join("")}</svg>`;
  const esc = (v) => String(v).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  const dt = (k, p) => esc(t(`lib.demo.${k}`, p));                        // demo copy, already escaped
  const stc = (o) => (o.state && o.state !== "default" ? `is-${o.state}` : "");
  const dis = (o) => (o.state === "disabled" ? " disabled" : "");
  const imp = (names, file) => `import { ${names} } from "@/components/${file}";\n\n`;
  const jsx = (s) => s.replace(/"/g, '\\"');
  let uid = 0;
  const nid = (p) => `${p}-${++uid}`;

  // checkBox / ratingStars: not used by the 5 ready demos — kept for the deferred Checkbox, Table (checkbox cell) and Rating demos (catalog "Soon")
  const checkBox = () => `<span class="lc-check-box" aria-hidden="true">${ic("check", "ic lc-i-check")}${ic("minus", "ic lc-i-ind")}</span>`;
  const cardMedia = (n = 0) => `<span class="lc-media lc-media-${n % 3}" aria-hidden="true">${ic("image", "ic lc-media-ic")}</span>`;
  const ratingStars = (value, max, size) => Array.from({ length: max }, (_, i) => {
    const fill = Math.max(0, Math.min(1, value - i));
    return `<span class="lc-star lc-star-${size}" data-fill="${fill >= 1 ? "full" : fill > 0 ? "half" : "empty"}">${ic("star", "ic lc-star-bg")}${ic("star", "ic lc-star-fg")}</span>`;
  }).join("");

  const DEMOS = {
    /* ---------- Actions ---------- */
    button: {
      item: (o) => `<button type="button" class="lc-btn lc-btn-${o.variant} lc-c-${o.color} lc-s-${o.size} ${stc(o)}"${dis(o)}>${o.icon ? ic("heart") : ""}<span>${dt("button")}</span></button>`,
      live: (o) => `<div class="lc-col lc-center">${DEMOS.button.item({ ...o, icon: true })}<p class="lc-note" data-out aria-live="polite">${dt("pressedNone")}</p></div>`,
      wire: (root) => { let n = 0; const out = $("[data-out]", root); $(".lc-btn", root).addEventListener("click", () => { n++; out.textContent = t("lib.demo.pressed", { count: n }); }); },
      code: (o) => imp("Button", "actionable/Buttons") + `<Button color="${o.color}" variant="${o.variant}" size="${o.size}">\n  <Icon name="Heart" /> ${t("lib.demo.button")}\n</Button>`,
    },
    "icon-button": {
      item: (o) => `<button type="button" class="lc-iconbtn lc-btn-${o.variant} lc-c-${o.color} lc-s-${o.size} ${stc(o)}" aria-label="${dt("like")}"${dis(o)}>${ic("heart")}</button>`,
      live: (o) => `<div class="lc-col lc-center">${DEMOS["icon-button"].item(o)}<p class="lc-note" data-out aria-live="polite">${dt("pressedNone")}</p></div>`,
      wire: (root) => { let n = 0; const out = $("[data-out]", root); $(".lc-iconbtn", root).addEventListener("click", () => { n++; out.textContent = t("lib.demo.pressed", { count: n }); }); },
      code: (o) => imp("IconButton", "actionable/IconButtons") + `<IconButton color="${o.color}" variant="${o.variant}" size="${o.size}" aria-label="${jsx(t("lib.demo.like"))}">\n  <Icon name="Heart" />\n</IconButton>`,
    },
    dialog: {
      rep: () => `<div class="lc-rep-dialog"><div class="lc-scrim"></div><div class="lc-dialog" role="presentation">
        <p class="lc-h">${dt("dlgTitle")}</p><p class="lc-p">${dt("dlgBody")}</p>
        <div class="lc-row lc-end"><span class="lc-btn lc-btn-text lc-c-default lc-s-medium">${dt("cancel")}</span><span class="lc-btn lc-btn-filled lc-c-danger lc-s-medium">${dt("delete")}</span></div></div></div>`,
    },

    /* ---------- Forms & input ---------- */
    "text-field": {
      item: (o) => `<span class="lc-field lc-field-${o.variant} lc-s-${o.size} ${stc(o)} ${o.state === "error" ? "is-error" : ""} ${o.state === "disabled" ? "is-disabled" : ""}"><span class="lc-control"><span class="lc-value ${o.state === "active" ? "" : "is-ph"}">${o.state === "active" ? "name@studio" : dt("fieldPh")}</span></span></span>`,
      live: (o) => { const n = nid("tf"); return `<div class="lc-field lc-field-${o.variant} lc-s-${o.size} lc-w-320" data-field><label class="lc-label" for="${n}">${dt("emailLabel")}</label><span class="lc-control"><input type="email" id="${n}" class="lc-input" placeholder="name@studio.com" autocomplete="off" aria-describedby="${n}-h"></span><span class="lc-help" id="${n}-h" data-out>${dt("emailHint")}</span></div>`; },
      wire: (root) => {
        const f = $("[data-field]", root), i = $("input", root), out = $("[data-out]", root);
        const check = () => {
          const bad = i.value.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim());
          f.classList.toggle("is-error", bad); i.setAttribute("aria-invalid", String(bad));
          out.textContent = t(bad ? "lib.demo.emailError" : "lib.demo.emailHint");
        };
        i.addEventListener("blur", check);
        i.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
        i.addEventListener("input", () => { if (f.classList.contains("is-error")) check(); });
      },
      code: (o) => imp("TextField", "forms-and-input/TextField") + `<TextField\n  variant="${o.variant}"\n  size="${o.size}"\n  label="${jsx(t("lib.demo.emailLabel"))}"\n  type="email"\n  placeholder="name@studio.com"\n  state={invalid ? "error" : "default"}\n/>`,
    },

    /* ---------- Selection ---------- */
    cards: {
      item: (o) => {
        const media = o.type === "image" ? cardMedia(1) : o.type === "icon" ? `<span class="lc-card-ic">${ic("heart")}</span>` : "";
        const body = o.type === "custom"
          ? `<div class="lc-card-custom"><span class="lc-tag lc-tag-filled lc-c-success lc-s-extra-small">${dt("tagTokens")}</span><p class="lc-p">${dt("cardCustom")}</p></div>`
          : `<div class="lc-card-body"><p class="lc-h">${dt("cardTitle")}</p><p class="lc-p">${dt("cardDesc")}</p></div>`;
        return `<article class="lc-card lc-card-${o.direction} lc-card-${o.type}">${media}<div class="lc-card-main">${body}<div class="lc-row"><span class="lc-btn lc-btn-filled lc-c-primary lc-s-small" role="presentation">${dt("cardAction")}</span><span class="lc-btn lc-btn-text lc-c-default lc-s-small" role="presentation">${dt("cardMore")}</span></div></div></article>`;
      },
      live: (o) => DEMOS.cards.item(o).replace(/<span class="lc-btn ([^"]+)" role="presentation">([^<]+)<\/span>/g, '<button type="button" class="lc-btn $1">$2</button>'),
      code: (o) => imp("Card", "structural-and-layout/Card") + `<Card\n  type="${o.type}"\n  direction="${o.direction}"${o.type === "custom" ? "" : `\n  title="${jsx(t("lib.demo.cardTitle"))}"\n  description="${jsx(t("lib.demo.cardDesc"))}"`}${o.type === "icon" ? '\n  icon={<Icon name="Heart" />}' : o.type === "image" ? '\n  imageSrc="/cover.jpg"' : ""}\n  actions={<Button size="small">${t("lib.demo.cardAction")}</Button>}${o.type === "custom" ? `\n>\n  <p>${t("lib.demo.cardCustom")}</p>\n</Card>` : "\n/>"}`,
    },

    /* ---------- Visual & feedback ---------- */

  };

  /* ---------------------------------------------------------------------
     22. Component library — browser (inspector column) + detail (canvas)
         A sixth workspace beside Style … Effects, never a story step. Opening it during the guided
         journey keeps the step, the values and the theme; "Return to guide" puts everything back.
     --------------------------------------------------------------------- */
  const lib = { q: "", opts: {} };                          // transient: search text, per-component demo choices
  const NO_CTL = { checkbox: ["value"], radio: ["value"], switch: ["value"] };   // the live demo owns these
  const WIDE = new Set(["cards", "text-area", "text-field", "search-field", "breadcrumbs", "tabs", "progress-bar", "select", "slider"]);
  const libOn = () => !!state.library && state.shaped;
  const catLabel = (cat) => t(`lib.cat.${cat}`);
  const libOpts = (c) => (lib.opts[c.id] = lib.opts[c.id] || { ...c.def });
  const valLabel = (v) => { const k = `lib.val.${v}`, s = t(k); return s === k ? v : s; };
  const libMatches = (c, q) => {
    if (!q) return true;
    const en = MESSAGES.en.lib && MESSAGES.en.lib.cat ? MESSAGES.en.lib.cat[c.category] : "";
    const hay = `${c.name} ${c.id.replace(/-/g, " ")} ${catLabel(c.category)} ${en} ${c.keywords}`.toLowerCase();
    return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  };
  const libFilterOk = (c) => state.libFilter === "all" || c.tier === state.libFilter;
  /** First visit: only the selected component's group is open. After that the reader's own choice is kept. */
  const groupOpen = (cat) => {
    if (!Object.keys(state.libGroups).length) { const sel = (compById(state.libId) || COMPONENT_CATALOG[0]).category; LIB_CATEGORIES.forEach((k) => { state.libGroups[k] = k === sel; }); }
    return !!state.libGroups[cat];
  };

  const renderLibList = (focusSel) => {
    const q = lib.q.trim().toLowerCase();
    const groups = LIB_CATEGORIES.map((cat) => ({ cat, items: COMPONENT_CATALOG.filter((c) => c.category === cat && libFilterOk(c) && libMatches(c, q)) })).filter((g) => g.items.length);
    const shown = groups.reduce((n, g) => n + g.items.length, 0);
    const free = COMPONENT_CATALOG.filter((c) => c.tier === "free").length;
    el.libCount.textContent = q || state.libFilter !== "all"
      ? t("lib.countFiltered", { count: shown, total: COMPONENT_CATALOG.length })
      : t("lib.count", { total: COMPONENT_CATALOG.length, free, pro: COMPONENT_CATALOG.length - free });
    el.libClear.hidden = !lib.q;
    el.libFilterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === state.libFilter)));
    if (!shown) {
      el.libList.innerHTML = `<div class="lib-empty"><span class="lib-empty-ic">${ic("search")}</span><p class="lib-empty-t">${esc(q ? t("lib.empty", { q: lib.q.trim() }) : t("lib.emptyFilter"))}</p><p class="ctl-hint">${esc(t("lib.emptyHint"))}</p><button type="button" class="btn btn-sm btn-default" data-lib-reset>${esc(t("lib.clearSearch"))}</button></div>`;
    } else {
      el.libList.innerHTML = groups.map((g) => {
        const open = q ? true : groupOpen(g.cat);
        const head = q
          ? `<h3 class="lib-group-h is-static"><span>${esc(catLabel(g.cat))}</span><span class="lib-group-n">${g.items.length}</span></h3>`
          : `<h3 class="lib-group-h"><button type="button" class="lib-group-btn" data-group="${g.cat}" aria-expanded="${open}" aria-controls="lib-g-${g.cat}">${ic("chevRight", "ic lib-chev")}<span>${esc(catLabel(g.cat))}</span><span class="lib-group-n">${g.items.length}</span></button></h3>`;
        return `<section class="lib-group" data-cat="${g.cat}">${head}<ul class="lib-items" id="lib-g-${g.cat}"${open ? "" : " hidden"}>${g.items.map((c) => `<li><button type="button" class="lib-item" data-id="${c.id}"${c.id === state.libId ? ' aria-current="true"' : ""}><span class="lib-item-name">${esc(c.name)}</span>${c.status !== "available" ? `<span class="lib-ni-tag">${esc(t("lib.notImplementedShort"))}</span>` : ""}${c.tier === "pro" ? `<span class="lib-pro-tag">${ic("lock")}<span>${esc(t("lib.tier.pro"))}</span></span><span class="sr-only">, ${esc(t("lib.tier.lockedSr"))}</span>` : ""}</button></li>`).join("")}</ul></section>`;
      }).join("");
    }
    if (focusSel) { const n = $(focusSel, el.libList); n && n.focus(); }
  };

  const libCell = (html, cap, sub, wide) => `<figure class="lib-cell${wide ? " is-wide" : ""}"><div class="lib-cell-stage lib-surface" inert>${html}</div><figcaption><code>${esc(cap)}</code>${sub ? `<span>${esc(sub)}</span>` : ""}</figcaption></figure>`;
  const libSec = (id, title, hint, body, extra = "") => `<section class="lib-sec" aria-labelledby="lib-s-${id}"><div class="lib-sec-head"><div><h2 class="lib-h2" id="lib-s-${id}">${esc(title)}</h2>${hint ? `<p class="lib-hint">${esc(hint)}</p>` : ""}</div>${extra}</div>${body}</section>`;

  const renderLibDetail = () => {
    const c = compById(state.libId) || COMPONENT_CATALOG[0];
    const D = DEMOS[c.id] || {}, ok = canUse(c), o = libOpts(c), wide = WIDE.has(c.id);
    el.libCrumb.innerHTML = `<span>${esc(t("lib.title"))}</span>${ic("chevRight")}<span>${esc(catLabel(c.category))}</span>${ic("chevRight")}<b>${esc(c.name)}</b>`;
    const tier = c.tier === "pro"
      ? `<span class="lib-tier lib-tier-pro">${ic("lock")}<span>${esc(t("lib.tier.pro"))}</span></span>`
      : `<span class="lib-tier lib-tier-free">${esc(t("lib.tier.free"))}</span>`;
    const ni = c.status !== "available";
    let html = `<header class="lib-head">
      <p class="lib-eyebrow"><span>${esc(catLabel(c.category))}</span>${tier}${ni ? `<span class="lib-tier lib-tier-ni">${esc(t("lib.notImplementedShort"))}</span>` : ""}</p>
      <h1 class="lib-h1" id="lib-h1" tabindex="-1">${esc(c.name)}</h1>
      <p class="lib-desc">${esc(t(`lib.c.${c.id}.desc`))}</p>
      <p class="lib-source">${esc(t("lib.source"))} <code>src/components/${esc(c.source)}</code></p>
    </header>`;

    if (!ok) {
      // Pro: a compact, honest note — no overlay, no blur, navigation stays free. No code ships for locked entries.
      html += `<aside class="lib-pro-note" aria-labelledby="lib-pro-h">
        <span class="lib-pro-ic">${ic("lock")}</span>
        <div class="lib-pro-copy"><h2 class="lib-pro-h" id="lib-pro-h">${esc(t("lib.pro.heading"))}</h2><p>${esc(t("lib.pro.text"))}</p></div>
        <div class="lib-pro-actions"><button type="button" class="btn btn-primary btn-sm" data-pro-unlock>${esc(t("lib.pro.cta"))}</button><button type="button" class="btn btn-text-default btn-sm" data-pro-continue>${esc(t("lib.pro.secondary"))}</button></div>
      </aside>`;
      html += libSec("preview", t("lib.sec.preview"), t("lib.sec.repHint"), `<div class="lib-demo"><div class="lib-stage lib-surface is-rep" role="img" aria-label="${esc(t("lib.pro.repLabel", { name: c.name }))}"><div class="lib-rep" inert>${ni || !D.rep ? `<p class="lib-ni">${esc(t("lib.notImplemented"))}</p>` : D.rep(o)}</div></div></div>`);
      const axes = Object.keys(c.opts);
      if (axes.length) html += libSec("included", t("lib.sec.included"), t("lib.sec.includedHint"), `<dl class="lib-included">${axes.map((k) => `<div><dt>${esc(t(`lib.ctl.${k}`))}</dt><dd>${c.opts[k].map((v) => `<span class="lib-chip">${esc(valLabel(v))}</span>`).join("")}</dd></div>`).join("")}</dl>`);
      el.libPage.innerHTML = html;
      return;
    }

    // Free: live demo + real variants, sizes, states, usage and a copyable usage snippet
    const ctlKeys = Object.keys(c.opts).filter((k) => !(NO_CTL[c.id] || []).includes(k));
    const controls = !ni && ctlKeys.length ? `<div class="lib-ctls">${ctlKeys.map((k) => `<div class="lib-ctl"><span class="lib-ctl-l" id="lib-ctl-${k}">${esc(t(`lib.ctl.${k}`))}</span><div class="lib-seg" role="radiogroup" aria-labelledby="lib-ctl-${k}">${c.opts[k].map((v) => `<button type="button" role="radio" class="lib-opt" data-ctl="${k}" data-val="${v}" aria-checked="${o[k] === v}" tabindex="${o[k] === v ? 0 : -1}">${k === "color" ? `<i class="lib-dot lc-c-${v} lc-pc-${v}" aria-hidden="true"></i>` : ""}<span>${esc(valLabel(v))}</span></button>`).join("")}</div></div>`).join("")}</div>` : "";
    const live = ni || !D.live ? `<p class="lib-ni">${esc(t("lib.notImplemented"))}</p>` : D.live(o);
    html += libSec("preview", t("lib.sec.preview"), ni ? "" : t("lib.sec.previewHint"), `<div class="lib-demo">${controls}<div class="lib-stage lib-surface" data-live>${live}</div></div>`);

    if (!ni && D.item) {
      const rows = Object.keys(c.opts).filter((k) => k !== "size").map((k) => `<div class="lib-row"><h3 class="lib-h3">${esc(t(`lib.ctl.${k}`))}</h3><div class="lib-gallery">${c.opts[k].map((v) => libCell(D.item({ ...o, [k]: v }), valLabel(v), "", wide)).join("")}</div></div>`);
      if (D.extra) D.extra(o).forEach(([k, h]) => rows.push(`<div class="lib-row"><h3 class="lib-h3">${esc(valLabel(k))}</h3><div class="lib-gallery">${libCell(h, "overlap", "", true)}</div></div>`));
      if (rows.length) html += libSec("variants", t("lib.sec.variants"), t("lib.sec.variantsHint"), rows.join(""));
      if (c.opts.size) html += libSec("sizes", t("lib.sec.sizes"), "", `<div class="lib-gallery">${c.opts.size.map((v) => libCell(D.item({ ...o, size: v }), v, c.sizePx[v] != null ? `${c.sizePx[v]}${typeof c.sizePx[v] === "number" ? "px" : ""}` : "", wide)).join("")}</div>`);
      if (c.states.length) html += libSec("states", t("lib.sec.states"), t("lib.sec.statesHint"), `<div class="lib-gallery">${c.states.map((s) => libCell(D.item({ ...o, state: s }), t(`lib.state.${s}`), "", wide)).join("")}</div>`);
    }
    const usage = t(`lib.c.${c.id}.usage`);
    if (!ni && Array.isArray(usage) && usage.length) html += libSec("usage", t("lib.sec.usage"), "", `<ul class="lib-usage">${usage.map((u) => `<li>${esc(u)}</li>`).join("")}</ul>`);
    if (!ni && D.code) html += libSec("code", t("lib.sec.code"), t("lib.sec.codeHint"), `<pre class="lib-code" tabindex="0" aria-labelledby="lib-s-code"><code>${esc(D.code(o))}</code></pre>`, `<button type="button" class="btn btn-sm btn-default" data-lib-copy>${ic("copy")}<span>${esc(t("lib.copy"))}</span></button>`);
    el.libPage.innerHTML = html;
    const liveRoot = $("[data-live]", el.libPage);
    if (!ni && D.wire && liveRoot) D.wire(liveRoot, o);
  };

  const renderLib = () => { if (!libOn()) return; renderLibList(); renderLibDetail(); };

  const selectComponent = (id, { focusItem = true } = {}) => {
    const c = compById(id); if (!c) return;
    const changed = state.libId !== id;
    state.libId = id; groupOpen(c.category); state.libGroups[c.category] = true; save();
    renderLibList(focusItem ? `.lib-item[data-id="${id}"]` : null);
    renderLibDetail();
    if (changed) el.libView.scrollTop = 0;
  };

  const openLibrary = ({ focusTitle = false } = {}) => {
    if (!state.shaped) return;
    const was = state.library;
    state.library = true;
    if (!compById(state.libId)) state.libId = COMPONENT_CATALOG[0].id;
    if (!el.drawer.hidden) toggleDrawer(false);
    update();
    renderLib();
    if (focusTitle) el.inspTitle.focus();
    if (!was) say("min", "min.lib", { prio: "intro", mood: "greet" });
  };
  /** Leaving the library restores the exact context: step, values, theme, preview. Nothing is reset. */
  const closeLibrary = ({ focus = null } = {}) => {
    if (!state.library) return;
    state.library = false;
    if (comp.msg && /^min\.lib/.test(comp.msg.key)) hideBubble();
    update();
    setCompanionChar(contextChar());
    fitZoom();
    if (focus) focus.focus();
  };

  const copyText = async (text, node) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {
      const range = document.createRange(); range.selectNodeContents(node);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      const ok = document.execCommand && document.execCommand("copy"); sel.removeAllRanges(); return !!ok;
    }
  };

  const openProDialog = () => {
    el.proList.innerHTML = COMPONENT_CATALOG.filter((c) => c.tier === "pro").map((c) => `<li>${esc(c.name)}</li>`).join("");
    el.proDialog.showModal();
  };

  const wireLibrary = () => {
    el.btnLibEntry.addEventListener("click", () => openLibrary({ focusTitle: true }));
    el.btnLibReturn.addEventListener("click", () => closeLibrary({ focus: el.storyTitle }));
    el.libSearch.addEventListener("input", () => { lib.q = el.libSearch.value; renderLibList(); });
    el.libSearch.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el.libSearch.value) { e.preventDefault(); e.stopPropagation(); el.libSearch.value = ""; lib.q = ""; renderLibList(); }
      else if (e.key === "ArrowDown") { const first = $(".lib-item", el.libList); if (first) { e.preventDefault(); first.focus(); } }
    });
    el.libClear.addEventListener("click", () => { el.libSearch.value = ""; lib.q = ""; renderLibList(); el.libSearch.focus(); });
    el.libFilterBtns.forEach((b) => b.addEventListener("click", () => { state.libFilter = b.dataset.filter; save(); renderLibList(); }));
    el.libList.addEventListener("click", (e) => {
      const g = e.target.closest("[data-group]");
      if (g) { state.libGroups[g.dataset.group] = !groupOpen(g.dataset.group); save(); return renderLibList(`[data-group="${g.dataset.group}"]`); }
      const it = e.target.closest(".lib-item");
      if (it) return selectComponent(it.dataset.id);
      if (e.target.closest("[data-lib-reset]")) { el.libSearch.value = ""; lib.q = ""; state.libFilter = "all"; save(); renderLibList(); el.libSearch.focus(); }
    });
    el.libList.addEventListener("keydown", (e) => {
      const items = $$(".lib-item, .lib-group-btn", el.libList).filter((n) => n.offsetParent !== null);
      const i = items.indexOf(document.activeElement); if (i < 0) return;
      const k = e.key;
      const nx = k === "ArrowDown" ? items[Math.min(i + 1, items.length - 1)] : k === "ArrowUp" ? (i === 0 ? el.libSearch : items[i - 1]) : k === "Home" ? items[0] : k === "End" ? items[items.length - 1] : null;
      if (nx) { e.preventDefault(); nx.focus(); }
    });

    // Detail: variant controls (radio groups), copy, Pro actions
    el.libPage.addEventListener("click", async (e) => {
      const opt = e.target.closest(".lib-opt");
      if (opt) {
        const c = compById(state.libId), o = libOpts(c);
        o[opt.dataset.ctl] = opt.dataset.val;
        renderLibDetail();
        const again = $(`.lib-opt[data-ctl="${opt.dataset.ctl}"][data-val="${opt.dataset.val}"]`, el.libPage); again && again.focus();
        return;
      }
      if (e.target.closest("[data-lib-copy]")) {
        const c = compById(state.libId);
        if (!canUse(c) || !DEMOS[c.id] || !DEMOS[c.id].code) return;      // never for locked entries
        const ok = await copyText(DEMOS[c.id].code(libOpts(c)), $(".lib-code", el.libPage));
        return toast(ok ? t("lib.copied", { name: c.name }) : t("toast.copyBlocked"));
      }
      if (e.target.closest("[data-pro-unlock]")) return openProDialog();
      if (e.target.closest("[data-pro-continue]")) {
        const cur = $(`.lib-item[data-id="${state.libId}"]`, el.libList);
        (cur || el.libSearch).focus(); cur && cur.scrollIntoView({ block: "nearest" });
      }
    });
    el.libPage.addEventListener("keydown", (e) => {
      const opt = e.target.closest(".lib-opt"); if (!opt) return;
      const group = $$(".lib-opt", opt.parentElement), i = group.indexOf(opt);
      const k = e.key, n = group.length;
      const nx = k === "ArrowRight" || k === "ArrowDown" ? group[(i + 1) % n] : k === "ArrowLeft" || k === "ArrowUp" ? group[(i - 1 + n) % n] : k === "Home" ? group[0] : k === "End" ? group[n - 1] : null;
      if (nx) { e.preventDefault(); nx.click(); }
    });
    el.libView.addEventListener("scroll", () => { if (!el.bubble.hidden && comp.msg && comp.msg.prio > 1) hideBubble(); }, { passive: true });
    el.proDialog.addEventListener("close", () => { const b = $("[data-pro-unlock]", el.libPage); b && b.focus(); });
  };

  /* ---------------------------------------------------------------------
     23. Boot
     --------------------------------------------------------------------- */
  load();
  state.mode = "light"; // the preview always opens in Light mode (never from the OS preference)
  populate();
  applyI18n();
  setCompanionChar(contextChar());
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  requestAnimationFrame(() => setTimeout(() => {          // let the page paint before building the 3D scene
    mountHero();
    if (hero) { if (!el.welcome.hidden) hero.start(); else hero.stop(); idle(() => { if (comp.char) el.buddyImg.src = portraitOf(comp.char); }); }
  }, 0));
  update();
  wire();
  renderLib();
  route();

  // Small debug hook for QA (not used by the UI)
  window.__moldable = { get state() { return state; }, get hero() { return hero; }, get clay() { return clay; }, get lang() { return lang; }, get crew() { return crew.state; }, get companion() { return { char: comp.char, msg: comp.msg && { ...comp.msg, text: el.bubbleText.textContent }, open: !el.bubble.hidden }; }, t, setLang, catalog: COMPONENT_CATALOG, tiers: COMPONENT_TIERS, entitlement: ENTITLEMENT, canUse, deriveColors, deriveShape, runAudit, buildFigma, devCss, validateDevCss, hslChannels, figContrast, validateFigma, auditBoth, contrast, buildExport, fitZoom: fitZoomNow };
})();
