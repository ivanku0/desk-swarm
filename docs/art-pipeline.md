# Scute beetle art pipeline (exploration)

## Goal

Optional **higher-res, part-mapped** horned beetle for Scute (hero / zoom / menu). The **dense swarm** prefers **`token-ref.png` pixel sprites** per preset; **8×8 `Bitmap8`** modules under **`src/viz/swarmGlyphs/`** are **fallback** if a PNG fails to load. Atlas parts + pivots live in data.

## Resolution ladder

| Stage | Size | Use |
|--------|------|-----|
| A | **PNG + 8×8 fallback** | `token-ref.png` sprites; bitmask TS if image missing. |
| B | **16×16** or **24×24** | First “beetle atlas”: readable horn, eyes, legs. |
| C | **32×32+** | Only if you need extra leg segments or smoother walk. |

Stay **pixel-aligned** (integer scales, `imageSmoothingEnabled = false`).

## Swarm field art (primary: pixel PNG)

The canvas loads **`public/art/<preset>/token-ref.png`** and draws it with **`drawImage`** (nearest-neighbor, integer snaps) under the existing pan, zoom, drift, jitter, and twin-phase scale. Optional **`token-ref-2.png`** alternates on the twin tick when present.

If the PNG **404s or errors**, **`src/viz/swarmGlyphs/<preset>.ts`** (`SWARM_GLYPHS`) is used instead.

**New preset:** extend `PresetId`, add **`swarmGlyphs/<id>.ts`**, **`glyphs.ts`**, URLs in **`src/viz/swarmTokenSprite.ts`**, and **`public/art/<id>/token-ref.png`** (see JSDoc on `PresetId`).

### Optional: regenerate 8×8 fallbacks from a flat image

| Preset | Input tries (`ref-to-glyphs`) | Output |
|--------|------------------------------|--------|
| `scute` | `token-ref.png`, legacy `beetle-ref.png` | `swarmGlyphs/scute.ts` |
| `horde` | `token-ref.png` | `swarmGlyphs/horde.ts` |

1. **Very dark canvas + dark subject** can yield an all-ink 8×8; use a **light matte** or levels first.
2. **`npm run glyphs:build -- scute`** / **`horde`**, or no args to update every preset that has a readable input.
3. Tweak **`scripts/ref-to-glyphs.mjs`** thresholds or hand-edit **`swarmGlyphs/*.ts`**.

That generator is **orthogonal** to **`beetle.png` + `atlas.json`** (optional **Scute hero** slices).

## Files

- **`src/viz/beetleAtlas.types.ts`** — TypeScript manifest + part IDs.
- **`docs/beetle-atlas.example.json`** — Example manifest; copy to e.g. `public/art/scute/atlas.json` when you have a real PNG.
- **`public/art/scute/`** — Drop `beetle.png` (or `.webp`) + `atlas.json` here; paths in manifest are relative to `public/`.

## Manifest (`atlas.json`)

- **`texture`**: URL path served from public root, e.g. `/art/scute/beetle.png`.
- **`grid`**: intended native pixel step (16 / 24 / 32) for author reference only.
- **`parts[]`**: each part is a rectangle in **atlas pixel coordinates**, plus **`pivotU` / `pivotV`** in **0–1** within that rectangle (e.g. leg foot at `(0.5, 1)`).

Suggested part IDs (trim or rename as you draw):

`shell`, `horn`, `head`, `mandible_l`, `mandible_r`, `eye_glow`, `leg_fl_upper`, `leg_fl_lower`, …

## Next implementation steps (for a new chat)

1. Add real `public/art/scute/beetle.png` + `atlas.json` (start from `docs/beetle-atlas.example.json`).
2. `fetch` + parse manifest; `Image` → drawImage slices in canvas.
3. **Debug**: one screen or query flag to draw the beetle with **pivot crosshairs** to verify JSON.
4. **Playback**: 2–4-frame idle (swap textures or rotate horn ± few degrees) before full walk cycles.
5. **Integration**: use atlas only when `n <= N` or zoom > threshold; else keep `swarmGlyphVariants(presetId)` (8×8 presets).

Paste into a new chat: *“Continue `docs/art-pipeline.md` — implement atlas loader + debug draw for Scute.”* and attach `@docs/art-pipeline.md` `@src/viz/beetleAtlas.types.ts` `@src/viz/PixelField.tsx`.
