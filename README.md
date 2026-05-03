# Swarm desk

**Math is for blockers.** A small, installable web app for tracking **niche Commander-scale creature counts** when the board is really a pile of identical tokens (think **Scute Swarm** or **Homunculus Horde**) and you want a fast counter at the table without spreadsheets or dice gymnastics.

This is a **casual toy**, not a rules engine: it encodes a few house-friendly behaviors so the number line matches how many bugs or homunculi you care about in the moment.

---

## Why this exists

- **Lightweight:** runs in the browser, offline-friendly as a PWA-style shell (`manifest.webmanifest`, mobile-first layout).
- **Focused:** built around presets for specific cards, not every token in Magic.
- **Readable at a glance:** big numeric display, optional zoom on the pixel “swarm” field, and a simple control strip for the flows you actually use in play.

If you only ever need “how many Scutes” or “how big is the Horde,” this is the intent.

---

## What’s in the app today

- **Presets:** **Scute Swarm** (`2G`) and **Homunculus Horde** (`3U`), with oracle text and Gatherer rulings pulled from **Scryfall** for accuracy in the info UI.
- **Counter model:** `BigInt`-backed count, **undo**, and preset-specific “grow” behavior (house rules for how doubling / reset-at-zero works at the table).
- **Swarm field:** canvas **token sprites** (PNG, with 8×8 fallback), **cardinal proliferation** growth order for both presets so the colony feels clumped rather than ring-shaped, shared **drift** motion, and **zoom** that **stays fixed for counts 1–8** (single-creature lens), then **steps by octave** (8 → 16 → … → 256) before the legacy log-step curve beyond that.
- **Main menu:** carousel of pantone-style “cards,” flavor lines, plain-text mana in the corner, **recent stats** drawer, and CTAs per preset.
- **Info sheet:** card-like layout with tabs for **Oracle text**, **Rules** (links + rulings), and **Tips** (how the app buttons behave).
- **Tests:** Vitest coverage for layout math, zoom scaling, and core model behavior.

---

## Tech stack

- **React 19** + **TypeScript**
- **Vite** for dev and production builds
- **Vitest** for unit tests

---

## Scripts

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production bundle
npm run test     # vitest
npm run preview  # serve the production build locally
```

---

## Disclaimer

Magic: The Gathering is a trademark of Wizards of the Coast. This project is an independent fan tool and is **not affiliated with** or endorsed by Wizards. Oracle text and rulings are attributed in-app via Scryfall; use official sources at the table when it matters.

---

## License

Private / personal project unless you add an explicit `LICENSE` file.
