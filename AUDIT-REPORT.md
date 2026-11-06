# Moldable Design System Studio — Phase 14 Audit Report

**Date:** 3 Nov 2026
**Build audited (md5):**

| File | md5 |
|---|---|
| `index.html` | `a23e8cb5…` |
| `styles.css` | `f2b9fe8d…` |
| `app.js` | `779f3117…` |
| `i18n.js` | `46ae8e67…` |
| `hero3d.js` | `a2f59bd8…` |

The local copy and the Mac copy were identical, and nothing came from other sessions.

**Method:**
- A real-browser run in headless Chromium (Playwright), with WebGL through SwiftShader.
- DOM measurements throughout.
- A static code review covering HTML, ARIA, assets, i18n, JS and CSS.
- Export validators plus a real Tailwind CSS v4.3.3 build.

**Scope:** audit only. No application code was changed in this phase.

Evidence lives in `_audit-evidence/`, next to this file.

---

## A. Executive Summary

**Readiness: prototype-ready, with no blockers.**
- No P0 issues, and every core flow works end to end:
  1. Welcome
  2. Guided Journey
  3. Edit freely
  4. All three presets on Desktop and Mobile
  5. FAH audit and fix
  6. Figma, Size and CSS export
- There are 10 confirmed issues: 1 × P1 (keyboard a11y), 2 × P2 (localization/labels) and 7 × P3 (code hygiene and polish).

**Strongest areas:**
- **Exports:**
  - Figma: 77/88 primitives, 112 semantics per mode, and 224/224 aliases resolve.
  - Size: 66 tokens (43/14/9).
  - Developer CSS: 112 × 3, matching a real Tailwind build 32/32 in light, nested dark and `html.dark`.
- **Mobile responsive:** all three presets pass measured QA at 375/390/430. Premium was tested in both EN and TH.
  - Playful: 57/57.
  - Minimal: 64/64.
  - Premium: 84/84.
- **Hero and journey:**
  - Hero crew interactions: 12/12.
  - Orbs: 22/22.
  - Guided Journey: 9/9, with no state loss and no dead ends.
- **Token coherence:** a single design-system state.
  - Edits survive preset, preview, viewport and Welcome round trips, and reloads.
  - No listener, DOM or heap growth across 30 mixed switches.

**Main risks:**
- **Keyboard users:** "Skip to content" in the Playground sends them back to Welcome (AUD-001).
- **FAH drawer:** the five status-colour rows show raw i18n keys (AUD-002).
- **Small English leaks in Thai:** the skip link, the preset names, and the stale screen-reader live region (AUD-003, AUD-004).

**Intentionally incomplete (not bugs):**
- **Components:** 5 of 27 have live demos; 22 are marked "Soon"; Pro is a presentation only.
- **Playful sample copy:** stays in English in TH (67 keys, a documented fallback).
- **Hero copy:** stays in English by design.
- **Light/Dark:** always reopens in Light by design.

**Recommended next phase:** **Phase 14.1 — Accessibility & Localization Fix Batch** (AUD-001 to AUD-005, about half a day). After that comes an optional Phase 14.2 hygiene batch (AUD-006 to AUD-010).

---

## B. Feature Coverage Matrix

**Status totals:** PASS 14 · ISSUE 3 · INCOMPLETE 0 · DEFERRED 3 · NOT VERIFIED 2 (22 areas)

### Core features

| Area | Status | Test evidence | Outstanding |
|---|---|---|---|
| Welcome Hero | PASS | See *Welcome Hero detail* below | Hero copy stays English in TH (by design) |
| Guided Journey | PASS | See *Guided Journey detail* below | — |
| Style Inspector | PASS | Panel opens. Preset switching Premium → Minimal → Playful → Premium keeps the edited primary (`#0f8a5f`); `data-preset` and template follow. | Preset names not localized (AUD-003) |
| Color Inspector | PASS | See *Color Inspector detail* below | — |
| Typography Inspector | PASS | Heading-font change reaches `--font-family-heading` and the live heading font | Weight, ratio, line height and tracking not individually exercised |
| Shape Inspector | PASS | Radius slider → `--radius-card` 12 → 2 px, and the live panel radius follows | — |
| Effects Inspector | PASS | Density Compact → Spacious changes 9 spacing tokens; the space-base slider changes 8; Shadow "Elevated" changes `--shadow-md` | — |

### Presets, Desktop and Mobile

| Area | Status | Test evidence | Outstanding |
|---|---|---|---|
| Premium Desktop / Mobile | PASS | Desktop 1440 (light + dark) and 1280: no overflow, no broken images, no mobile UI leaking. Mobile `pr-qa.log` 84/84 at 375/390/430 in EN + TH. Pixel-identical desktop regression. | — |
| Minimal Desktop / Mobile | PASS | Same desktop checks. Mobile `mn-qa.log` 64/64. | — |
| Playful Desktop / Mobile | PASS | Same desktop checks. Mobile `pm-qa.log` 57/57. | Playful sample copy English in TH (documented) |

### Accessibility and export

| Area | Status | Test evidence | Outstanding |
|---|---|---|---|
| FAH Accessibility | ISSUE | See *FAH detail* below | AUD-002 |
| App-shell keyboard a11y | ISSUE | Rail `aria-pressed` and labels; menus; crew focus ring; hex `aria-invalid` | AUD-001, AUD-009 |
| Figma Variables Export | PASS | See *Figma Variables detail* below | Real Figma import not repeated this phase |
| Size Export | PASS | 66 tokens (space 43, radius 14, depth 9); `0_5`-style half steps; 11 negative steps; `rounded-8xl` = 64; `rounded-full` = 999; all `$type: number` | — |
| Developer CSS Export | PASS | See *Developer CSS detail* below | — |

### Localization, state and scope

| Area | Status | Test evidence | Outstanding |
|---|---|---|---|
| TH/EN Localization | ISSUE | i18n parity: 1,072 EN / 1,005 TH keys; the 67 missing TH keys are all documented `pfl.*`. 0 missing literal keys across 1,011 uses. Export dialog re-translates while open. No clipped or tracked Thai in the shell. | AUD-002, AUD-003, AUD-004, AUD-005 |
| State & persistence | PASS | Preview, viewport, colours and step survive reloads and Welcome round trips. Zoom Width / Screen / 100% → 81% / 67% / 100%. | Light/Dark resets to Light on reload (by design, `app.js:2793`) |
| Leaks / duplicate handlers | PASS | 30 mixed switches: document + window listeners 21 → 21, DOM 2643 → 2643, heap 4.5 → 4.8 MB, no long tasks | — |
| Components (existing) | PASS | 6 categories, 27 entries ("26 Free · 1 Pro"). Button and Text Field demos render with code. Pro Dialog is locked with no copyable code. Search empty state works. | See deferred rows below |
| Component demos ×22 | DEFERRED | Shown as "Soon" (`DEMO_READY` lists 5) | Planned |
| Pro / entitlement / payment | DEFERRED | Presentation only, by design | — |
| Playful TH sample copy | DEFERRED | 67 `pfl.*` keys fall back to English (comment in `i18n.js`) | — |
| Real Figma import (this build) | NOT VERIFIED | Schema and regression only; the last real import was Phase 10.1 | Repeat when exporter changes |
| Real-device performance | NOT VERIFIED | Sandbox only: DCL 7.3 s with software WebGL is not representative | Profile on a real Mac |

### Area detail

**Welcome Hero**
- Layout at 1440×900 and 1280×800: WebGL on, 5 crew, 4 orbs, no horizontal scroll, CTA in view.
- Crew checks B1–B10 plus reduced motion, 12/12: hover, pin, switch, Esc, outside click, ×, focus return, keyboard Enter, focus ring, TH bubble.
- Orbs: 22/22 (`orbs.txt`).
- At 1280, FAH's hit box touches the copy box, but no glyphs or CTA (the CTA still gets the click).

**Guided Journey** (9/9)
- Start Creating → step 1 (PAI).
- The first Next shapes the default style.
- Next then walks PAI → FAMAI → ACT → MIN → FAH.
- Back and the step dots work.
- Edit freely and Back to guide keep step and colours.
- The last Next goes to free mode, with the toast "Journey complete".
- Reload and Welcome round trip keep state.

**Color Inspector**
- 2 visible scales; with Advanced colours open there are 7.
- Every scale has 11 shades, 050–950, as 24×24 swatches in one row, unclipped.
- No obsolete "Standard" status mode.
- An invalid hex is rejected and flagged with `aria-invalid="true"`.
- The colour picker updates the tokens and the live button.

**FAH**
- Pairs per mode:
  - Premium and Minimal: 13 (26 in total).
  - Playful: 17 (34 in total).
- A low-contrast setup produces 5 fails and the chip reads "5 to fix".
- Fix all → 0 fails, and the visible text token changes `#a9a9b2` → `#757583`.
- The fixed value reaches the Figma resolved values, the Developer CSS and the JSON export.

**Figma Variables**
- 4 scenarios.
- Primitives: 77 by default, 88 with Tertiary; sRGB values are valid; shades 50–950.
- Semantic: 112 per mode (background 49, text 21, icon 21, border 21).
- Aliases: 224/224 resolve to Colors Primitives. FAH overrides are exported as literal values, e.g. 110/112 aliased in the override scenario.
- `validateFigma`: ok.
- UI self-check: "pass".

**Developer CSS**
- Counts: `@theme` 112, `:root` 112, `.dark` 112, with no duplicates.
- HSL channels are valid, and there are no legacy names (`error`, `disable`, `onlight`, `light_hover`).
- `validateDevCss`: ok in all 4 scenarios.
- Real Tailwind v4.3.3 build: 32/32 sampled utilities match Figma in light, a nested `.dark` container and `html.dark`. Removing `.dark` restores light.

---

## C. Issue Register

| ID | Sev | Area | Problem | Reproduction | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| AUD-001 | P1 | Keyboard a11y | "Skip to content" in the Playground jumps to the Welcome view | Open `#playground`, press Tab (the skip link is the first stop), then Enter → hash becomes `#main` and Welcome shows | `index.html:15` (`href="#main"`); `app.js:1740` `route()` treats any hash ≠ `playground` as Welcome. Probe: `{"hash":"#main","welcome":true,"playground":false}` | Make the skip link view-aware: target the Playground's main region, or move focus with `preventDefault` instead of changing the hash |
| AUD-002 | P2 | FAH / i18n | The five status pairs show raw keys in the audit drawer (both modes) and in FAH's bubble (shown when a status pair is the first fail) | Open the contrast chip → drawer rows read `a11y.pair.st-success`, `st-warning`, `st-danger`, `st-info`, `st-danger-btn` | `app.js:1228` `pairName = t('a11y.pair.'+id)`; `a11y.pair` lacks `st-*` in EN and TH. Drawer probe lists 10 raw names | Add 5 keys to `a11y.pair` in EN and TH (the English names already exist in `AUDIT_PAIRS[].name`) |
| AUD-003 | P2 | Localization | English strings in the Thai UI. Preview `aria-label` literals ("Preview navigation", "Dashboard navigation", ×10) are lower priority. | Switch to TH → the skip link reads "Skip to content", and the preset cards read "Premium / Minimal / Playful" | `index.html:15`, `:170`, `:178`, `:187` (preset names); `:513`, `:605`, `:791`, `:1033`, `:560`, `:712`, `:1135`… (aria). `th-shell.json` | Add i18n keys for the skip link and the preview aria-labels; decide whether the preset names are brand names (keep) or translate them |
| AUD-004 | P3 | a11y / i18n | The screen-reader live region keeps the old language after a switch | In the Playground, switch EN → TH: the visible bubble is Thai, but `#companion-live` still reads "MIN: Nice and tidy…" | `app.js:681` vs `setLang` (~`app.js:1700`); probe output in this report | Re-announce, or clear `#companion-live`, inside `setLang` |
| AUD-005 | P3 | a11y | Orb `aria-label`s turn Thai, but the Welcome view stays `lang="en"`, so a screen reader may use the wrong voice | On Welcome, switch to TH and inspect `.orb` | `app.js:1793`; crew buttons get `b.lang = lang` (`app.js:1881`), the orbs don't | Set `lang` on each orb button, as the crew buttons do |
| AUD-006 | P3 | Code hygiene | A 158-line i18n block is duplicated, and 5 orphan keys remain (`color.statusBehavior`, `statusHarmonized`, `statusStandard`, `statusHint*`) | — | `i18n.js:926–1083` = `1093–1250` (diff = 0 lines); orphan keys have 0 uses in `app.js` or `index.html` | Delete the second copy and the orphan keys |
| AUD-007 | P3 | Code hygiene | Dead JS: `CAT_STEP`, `STATUS`, `KIND_LABEL`, `FIG_FG_STATES`, `checkBox`, `ratingStars`. The stagger queries for `.pv-group`, `.pvp-comp-sec` and `.pvp-card` match no markup. | — | Each identifier appears once only (`grep -cw` = 1); `app.js:178`, `:253`, `:522`, `:1408`, `:2520`, `:2522`, `:981`, `:1098` | Remove, or keep with a comment if planned for deferred demos |
| AUD-008 | P3 | Code hygiene | About 138 CSS classes are unused, and 2 rules are duplicated | — | `.pv-alert…`, `.pv-components`, `.pv-group-*` (`styles.css:1041–1162`); `.pvp-comp*` (`:1384–1428`); `.lc-*` for undemoed components (`:2193–2536`). Duplicates at `:1168` / `:1183` and `:1700` / `:1999` | Prune the legacy `.pv-*` and `.pvp-comp*` rules. Keep `.lc-*` if the deferred demos will use it. |
| AUD-009 | P3 | ARIA | `<p class="menu-label">` sits directly inside `role="menu"` | Inspect `#view-menu` | `index.html:485`, `:489` | Wrap in `role="group"` with `aria-labelledby`, or mark the label `role="presentation"` |
| AUD-010 | P3 | Console | `THREE.Color: Unknown color model url(#paint…)` warnings on every load | Open Welcome and watch the console warnings | SVGLoader warnings for the character SVG gradients. The hero renders correctly (`hero-1280.png`); console warnings only, no errors. | Optional: silence the warnings or strip gradient fills before loading (only with approval, since it touches the character pipeline) |

**Counts:** P0 0 · P1 1 · P2 2 · P3 7.

**Not counted as issues:**
- **FAH pair totals differ from the brief (16 / 24).** The current 26 / 34 come from the five status pairs added in Phase 08. The brief's numbers are out of date.
- **Light/Dark reopens in Light.** This is documented behaviour (`app.js:2793`).

---

## D. Deferred Features (not bugs)

- **Component library:** 22 of 27 entries show "Soon". Only Button, Icon Button, Text Field, Cards and Dialog (Pro) have demos.
- **Pro tier:** no accounts, entitlement, subscription or payment. The Pro preview is presentational.
- **Thai sample copy:** Playful sample content stays in English in TH (67 `pfl.*` keys), and the hero marketing copy stays English (`app.js:627`).
- **Real Figma import:** not repeated for this build. Schema and regressions are unchanged since the verified Phase 10.1 import.
- **Production concerns, out of scope for the prototype:** real-device performance profiling, full WCAG conformance review (only contrast and keyboard checks were run), and the Next.js port.

---

## E. Recommended Fix Order

1. **Batch 1 — Accessibility & i18n (P1/P2, small, high impact): AUD-001, AUD-002, AUD-003, AUD-004, AUD-005.** It touches only `index.html`, `app.js` and `i18n.js`. Re-run the hero, journey and FAH suites afterwards.
2. **Batch 2 — Hygiene (P3, no visible change): AUD-006, AUD-007, AUD-008, AUD-009.** Re-run the desktop pixel regression and all three mobile suites to prove nothing moved.
3. **Optional — AUD-010** console warnings. Only with explicit approval, because it touches the character loading path.
4. **Then** pick from the deferred list, e.g. the next batch of component demos.

---

## F. QA Evidence

### Suites run on this build

All suites ran with 0 console errors.

| Suite | Result | File |
|---|---|---|
| Hero crew + journey | 12 + 9 PASS | `hero-journey.json` |
| Orbs | 22/22 | `orbs.txt` |
| Inspector / scales / FAH | 13 PASS. Confirmed fails: AUD-002, density test-state artefact (re-tested PASS) | `inspector-fah.json` |
| Exports | 20 PASS. The "FIG-SIZE" fail was a test bug, re-verified PASS in `size-sample.json`. | `exports.json` |
| Tailwind v4 build | 3/3 PASS | `tailwind-out.css`, `moldable-dev-tokens.css` |
| Desktop presets | 18 PASS (1440 light/dark, 1280 light) | `ui.json` |
| State, zoom, overlay i18n, components | PASS; L10N-SHELL flagged the expected brand strings | `ui.json` |
| Mobile | Playful 57/57 · Minimal 64/64 · Premium 84/84 · Premium tokens 6/6 | `pm-qa.log`, `mn-qa.log`, `pr-qa.log`, `pr-tok.log` |
| Leak / perf probe | Listeners 21 → 21, DOM stable, heap +0.3 MB | `perf.json` |
| Static review | 0 duplicate IDs out of 208 · 0 broken ID references out of 81 · 24 + 8 asset refs, 0 missing · 21/21 images have alt · 0 nested interactives · 0 `tabindex > 0` · 122 listeners with guarded re-wiring | Summarized in this report |

### Pixel regression

Premium desktop, light and dark, is pixel-identical to before the last changes. Playful and Minimal differ only by antialiasing noise of 16–352 px on visually identical frames (from Phase 09.3).

### Limitations

- Headless Chromium with SwiftShader WebGL, not a real Chrome window on the Mac.
- No Safari or Firefox runs.
- No screen-reader session (ARIA was checked structurally).
- No real Figma import.

### Screenshots

In `_audit-evidence/`:
- Hero: `hero-1280.png`, `hero-1440.png`
- Journey: `journey-free.png`
- Inspector: `insp-style.png`, `insp-color.png`, `insp-type.png`, `insp-shape.png`, `insp-effects.png`, `insp-components.png`, `insp-color-advanced.png`
- FAH: `fah-drawer-before.png`, `fah-drawer-after.png` (raw keys visible)
- Export: `export-figma.png`, `export-css.png`
- Desktop presets: `desk-*-light.png`, `desk-*-dark.png`
- Components: `lib-button.png`, `lib-dialog.png`, `lib-checkbox.png`
- Thai: `th-playground.png`
- Mobile: `mobile-*.png`

---

## Phase 14.1 verification — Accessibility & Localization Fix Batch

Scope: AUD-001 to AUD-005 only. AUD-006 to AUD-010 are untouched. The findings above are kept as they were found; this section records the result.

### Results

| ID | Result | What changed | Verified by |
|---|---|---|---|
| AUD-001 | FIXED | The skip link is now route-aware. On Welcome it focuses Welcome `<main id="main">`; on the Playground it focuses the canvas `<main id="canvas">`. It calls `preventDefault` and never changes the hash, so preset, preview, inspector, settings and Back/Forward stay as they are. `tabindex="-1"` is set only for the jump and removed on blur, so a click inside the region never focuses the whole region. The focus ring sits inside the region (`outline-offset: -2px`) so it is not clipped. | `t141.js`: A1-W, A1-W-TAB, A1-P, A1-P-STATE, A1-P-TAB, A1-P-SHIFT, A1-P-POINTER, A1-P-CLICK, A1-HIST, A1-P-TH. `au-insp` SKIP-LINK: FAIL → PASS |
| AUD-002 | FIXED | Added `a11y.pair.st-success`, `st-warning`, `st-danger`, `st-info` and `st-danger-btn` in EN and TH. Pair IDs, contrast maths and the fix algorithm are unchanged. | A2-DRAWER-en/th: 26 rows, 0 raw keys. A2-BUBBLE-th/en: with colours where `st-success` is the first fail, FAH's bubble and the live region name the pair in the current language. |
| AUD-003 | FIXED | Skip link text comes from `a11y.skip`, and the link gets `lang`; it is set in `applyI18n` because it sits outside `I18N_ROOTS`. 11 preview `aria-label`s now use `data-i18n-attr="aria-label:landmark.*"`. The English literal stays as the no-JS fallback. 6 keys are shared, with no duplicates. Preset names Premium / Minimal / Playful are unchanged by decision. The logo, crew, sample copy and Playful sample content are untouched. | A3-EN, A3-TH (11/11 Thai), A3-BACK (TH → EN restores English exactly), A3-PRESETS |
| AUD-004 | FIXED | `setLang` syncs `#companion-live`. If the bubble is open, the current line is written once in the new language (same character). If it is closed, the region is cleared silently and the bubble is not reopened. Nothing is written when the text is unchanged. This uses the same region; there is no new announcer. | A4-EN-TH and A4-TH-EN (exactly 1 write each), A4-SAME (0 writes), A4-CLOSED (stays closed, cleared, no announcement, character kept) |
| AUD-005 | FIXED | `orbs.refresh()` sets `b.lang = lang`, as the crew buttons do. It runs at boot and on every switch. Visuals and animation are unchanged. | A5 (en → th → en, 4 orbs; Welcome view stays `lang="en"`), A5-BOOT (Thai first load) |

### Files changed

- `index.html`:
  - `id="skip-link"`.
  - 11 preview landmarks get `data-i18n-attr`.
- `app.js`:
  - Skip-link handler.
  - Skip-link i18n in `applyI18n`.
  - Live-region sync in `setLang`.
  - Orb `lang`.
- `i18n.js`: one EN and one TH `merge` block (`a11y.skip`, `a11y.pair.st-*`, `landmark.*`).
- `styles.css`: one rule, `#main:focus-visible, #canvas:focus-visible { outline-offset: -2px; }`. This was needed because both regions fill the view: with the default `+2px` offset, the ring was off-screen on Welcome and three of four sides were hidden on the Playground. Focus state only; no other visual change.

### Regression

| Suite | Result | Note |
|---|---|---|
| Phase 14.1 focused (`t141.js`) | 25/25 | No page errors |
| Journey (`au-journey`) | 10/10 | — |
| Inspector / FAH (`au-insp`) | 18/19 | TOKENS-LIVE: same pre-existing test artefact as Phase 14 (density already "spacious") |
| Orbs (`orb3`) | 22/22 | — |
| Playful (`pm-qa2`) | 57/57 | — |
| Minimal (`mn-qa`) | 64/64 | — |
| Premium (`pr-qa`) | 84/84 | — |
| Premium tokens (`pr-tok`) | 6/6 | The first run read a colour mid-transition (5/6); it was re-run alone at 6/6. A timing flake, not caused by this change. |
| UI (`au-ui`) | 24/26 | STATE-PERSIST (Light on reload, by design) and L10N-SHELL (brand and preset names): identical to Phase 14 |
| Export (`au-exp`) | 18/22 | FIG-SIZE ×4: the same pre-existing test misread as Phase 14 |
| Exporters | Identical | Figma JSON and Developer CSS md5 are the same before and after |
| Preview pixel regression | 0 layout change | 14 frozen cases. Diffs came only from lazy images still loading or Playful's `pfl-spin` / `pfl-float` animation phase. DOM geometry of all 12 preset × preview × viewport combinations: identical except those animated elements. |
| Welcome Hero | Identical | 1440 and 1280, EN and TH: 0 changed pixels in the DOM layer, identical geometry and orb styles |

New regressions: none.

### Limitations

- No real screen-reader session. The live region was verified by recording each write with a MutationObserver.
- Testing used Chromium with SwiftShader WebGL only. Safari and Firefox focus behaviour was not run.
- FAH's status-pair bubble needs unusual colours (status colours auto-harmonise to pass). It was verified with a found failing palette.
- Still open, as planned: AUD-006 to AUD-010 (Phase 14.2 hygiene batch).

---

## Phase 14.2 verification — Safe Code Hygiene & Cleanup

Scope: AUD-006 to AUD-009. AUD-010 (character-pipeline console warnings) is untouched by decision. The target was zero intentional visual or behavioural change; the original findings above stay as they were found.

### Results

| ID | Result | Summary |
|---|---|---|
| AUD-006 | FIXED | Removed the duplicated i18n block (165 lines). The two copies were **not** identical: their last section (Phase 08 status colours) differed. Copy 1 has the current strings; copy 2 had the old "Standard / Brand Harmonized" mode strings, which caused the orphan keys. Copy 1 is kept and copy 2 removed. |
| AUD-007 | FIXED (partial by design) | 3 dead constants and 5 dead selector tokens removed. 3 suspicious definitions are kept on purpose (see below). |
| AUD-008 | FIXED (conservative) | 60 lines removed: the dead rules of the legacy "Components preview" sections, plus 2 redundant re-declarations. Other proven-dead rules are retained on purpose (see below). |
| AUD-009 | FIXED | View menu: each label and its items are wrapped in `<div role="group" aria-labelledby>`. Separators stay outside the groups. The visible label is `aria-hidden` (the group name already carries it). The Zoom group carries `data-zoomgroup`, so it hides with its items in Mobile and in the Library. |

### Removed, and why

**i18n (`i18n.js`)**
- The second copy of the Phase 05–08 block (155 body lines plus its header).
- The obsolete Phase 08 keys:
  - `color.statusBehavior`
  - `color.statusHarmonized`
  - `color.statusStandard`
  - `color.statusHintHarmonized`
  - `color.statusHintStandard`
- These keys have 0 direct uses, and no dynamic lookup can build them. The only dynamic `color.*` lookups are `color.role.*`, `color.statusName.*` and `color.palette.*`.
- `color.harmonizedShade` is still used, so it was kept.
- Proof: the evaluated dictionary before and after differs by exactly these 5 keys, in EN (1084 → 1079) and TH (1017 → 1012). No other value changed.

**JavaScript (`app.js`)**
- `CAT_STEP`: a legacy category-to-step map that is never read.
- `KIND_LABEL`: English labels superseded by `t('a11y.kind.*')`.
- `FIG_FG_STATES`: never read. The Figma exporter hashes are unchanged.
- Dead selector tokens `.pv-group`, `.pvp-comp-sec` and `.pvp-card` (×3), in the shaping stagger, the settle stagger and the FLASH radius/shadow lists.
- These classes match no static markup, no generated template and no `classList` call. `querySelectorAll` returns nodes in document order, so stagger indices cannot change.

**CSS (`styles.css`)**
- Legacy generic Components preview:
  - `.pv-alert*` (6 rules).
  - `.pv-components`, `.pv-group-title`, `.pv-row`, `.pv-row-wrap`, `.pv-group-split`, `.pv-card-sm` (×2), and their 3 container-query lines.
- Legacy Premium Components preview: 39 rules (`.pvp-comp*`, `.pvp-state-grid`, `.pvp-row*`, `.pvp-field*`, `.pvp-select*`, `.pvp-menu`, `.pvp-option*`, `.pvp-tab-panel`, `.pvp-card*`, `.pvp-cards`, `.pvp-check*`, `.pvp-radio*`, `.pvp-switch*`).
- Live rules in the same sections stay: `.pv-form-grid`, `.pv-typescale`, `.pvp-form`, `.pvp-input*`, `.pvp-typescale`.
- Redundant re-declarations:
  - `.pv-dash-grid { grid-template-columns: 1fr }` inside `@container (max-width: 640px)` (already set by the 880px query).
  - `.pfl-card-b .pfl-card-title { margin-top: auto }` inside the mobile container query (already set unconditionally).
  - No rule in between overrides either value.
- How a rule qualified for removal:
  - It sits inside the legacy sections.
  - Every selector in its list needs a `pv-`/`pvp-` class with 0 occurrences in `index.html`, `app.js`, `hero3d.js` and `i18n.js`.
  - No dynamic `pv-`/`pvp-` class construction exists (template or concatenation).
  - Rule order is preserved.

### Intentionally retained

- `STATUS` (`app.js`): documented reference values of the Moldable status anchors ("Reference only"). Unused at runtime; kept as documentation.
- `checkBox`, `ratingStars` (`app.js`): helpers for the deferred Checkbox, Table (checkbox cell) and Rating demos (catalog "Soon"). A comment now says so.
- `.lc-*` CSS, about 103 classes with no literal use: Component Library styles for deferred demos, partly addressed through constructed classes (`lc-c-${color}`, `is-${state}`).
- 35 more proven-dead `pv-`/`pvp-` rules outside the legacy sections:
  - `.pv-caption`, `.pv-btn-danger`, `.pv-spinner`, `.pv-badge-primary`.
  - The generic `.pv-field`, `.pv-select`, `.pv-check`, `.pv-switch` and `.pv-tab*` primitives.
  - `.pvp-btn-text`, `.pvp-iconbtn-solid`, `.pvp-display-sm`, `.pvp-badge-muted`.
  - Kept per the "do not aggressively prune" instruction. A later pass can take them with the same proof.
- 4 mixed selector lists that contain dead tokens next to live ones (`:is(...)` corner-shape and forming lists, `.pvp-card:hover .pvp-img img`). Harmless; left as they are.
- `is-*` state classes: generated dynamically, not dead.

### Files changed

- `i18n.js`: 1337 → 1172 lines.
- `app.js`: 2825 → 2823 lines (−3 definitions, −5 selector tokens, +1 comment).
- `styles.css`: 3014 → 2953 lines (−60 rules and lines, 2 section comments retitled).
- `index.html`: View menu group wrappers (+4 lines).
- `AUDIT-REPORT.md`: this section.

### Automated QA

| Suite | Result | Note |
|---|---|---|
| Phase 14.1 fixes (`t141`) | 25/25 | Skip link, FAH pair names, TH/EN labels, live region, orb `lang` |
| Journey (`au-journey`) | 10/10 | — |
| Inspector / FAH / Fix All (`au-insp`) | 18/19 | TOKENS-LIVE: pre-existing test artefact (same as Phase 14 and 14.1) |
| Orbs (`orb3`) | 22/22 | — |
| Playful (`pm-qa2`) | 57/57 | — |
| Minimal (`mn-qa`) | 64/64 | — |
| Premium (`pr-qa`) | 84/84 | — |
| Premium tokens (`pr-tok`) | 6/6 alone | 5/6 inside the long batch: the same mid-transition read as Phase 14.1. 6/6 when run alone on both this build and the baseline. |
| UI (`au-ui`) | 24/26 | STATE-PERSIST (by design) and L10N-SHELL (brand and preset names): identical to Phase 14 |
| Export (`au-exp`) | 18/22 | FIG-SIZE ×4: pre-existing test misread, identical to Phase 14 |
| View menu (AUD-009) | Same as baseline | Keyboard walk (↓ ×7, End, Home), Esc closes with focus back on the button, Dark via keyboard: identical in EN, TH and Mobile. The accessibility tree is now `menu > group "Appearance"/"Zoom" > menuitemradio`. |

### Visual regression

- **Computed style:** every element plus `::before`/`::after` in 24 previews (3 presets × 2 views × desktop/mobile × light/dark), about 41,000 elements. All identical (one case matched only on re-run, a layout-timing read). Whole-page `body` dumps differ only in:
  - Image `url()` paths (different folder);
  - The 2 new AUD-009 wrappers;
  - A companion size read mid-transition (both builds settle at 64px).
- **Pixels:** 24 stable full-frame shots, with images loaded and decoded and every animation frozen at t = 0.
  - 18 cases: 0 changed pixels.
  - 6 cases: 1–220 anti-aliasing pixels. Re-shooting the baseline against itself gives the same differences, and a second before/after pair gives 0 in 5 of them. This is SwiftShader raster noise, not a change.
- **Welcome Hero:** 1440 and 1280, EN and TH: 0 changed pixels; same geometry and orb styles.
- **View menu:** 0 changed pixels (EN, TH, Mobile, with hover).

### Export hashes

Six states: Premium, Minimal and Playful defaults; Premium + tertiary + dark; Playful custom; Minimal low-contrast. Checked outputs:
- Colors Primitives, Light Mode, Dark Mode and `Size.json`.
- Developer CSS.
- JSON/CSS export, with the timestamp normalized.

Result: all identical before and after.

### Remaining risks

- The removed CSS and JS are proven unused by the current markup, templates and JS. A future feature that brings back the old Components preview markup would need those rules again; they remain in the Phase 14 baseline.
- No real screen-reader session for the new menu groups (verified through Playwright's accessibility tree).
- Chromium with SwiftShader only.
- Still open: AUD-010 (console warnings, character pipeline), plus the retained dead rules listed above.
