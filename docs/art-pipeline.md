# Scute beetle art pipeline (exploration)

## Goal

Optional **higher-res, part-mapped** horned beetle for Scute (hero / zoom / menu), while keeping **8×8 `Bitmap8` glyphs** for dense swarm performance. Parts + pivots live in data; rendering can grow in `PixelField` or a dedicated debug canvas.

## Resolution ladder

| Stage | Size | Use |
|--------|------|-----|
| A | **8×8** | Current field glyphs — keep. |
| B | **16×16** or **24×24** | First “beetle atlas”: readable horn, eyes, legs. |
| C | **32×32+** | Only if you need extra leg segments or smoother walk. |

Stay **pixel-aligned** (integer scales, `imageSmoothingEnabled = false`).

## Raster reference → swarm glyphs (8×8)

The **dense swarm** still draws **`Bitmap8` glyphs** (fast). To make those bugs **look like your beetle reference** instead of the default shapes:

1. Save a PNG as **`public/art/scute/beetle-ref.png`** (photo, card art crop, or line art — square-ish works best; transparency is OK).
2. Run **`npm run beetle:glyphs`**.  
   This trims empty margins, resizes to **8×8**, thresholds luminance into ink, and writes **`src/viz/scuteBeetleGlyphsFromRef.ts`** (two thresholds → two variants for the existing twin-phase swap).
3. Tweak thresholds in **`scripts/beetle-ref-to-glyphs.mjs`** or **hand-edit** the generated `0`/`1` grid if a horn or leg needs nudging.

That path is separate from **`beetle.png` + `atlas.json`**, which is for the **optional higher-res hero** (sliced parts), not the tiny field glyphs.

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
5. **Integration**: use atlas only when `n <= N` or zoom > threshold; else keep `BUG_VARIANTS`.

Paste into a new chat: *“Continue `docs/art-pipeline.md` — implement atlas loader + debug draw for Scute.”* and attach `@docs/art-pipeline.md` `@src/viz/beetleAtlas.types.ts` `@src/viz/PixelField.tsx`.
