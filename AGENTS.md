# Codex instructions for this repository

Use Simplified Chinese unless the user asks otherwise.

## Goal

Convert a user-selected Touhou Little Maid normal Bedrock model into a Codex
desktop pet by rendering the original geometry and texture. Prefer deterministic
3D rendering over image generation.

## Required workflow

1. Read the installed `hatch-pet` skill completely.
2. Prefer a local TLM source supplied by the user. If none is supplied and the
   user's prompt authorizes it, clone only the official repository
   `https://github.com/TartaricAcid/TouhouLittleMaid` into the ignored
   `upstream/` directory. Record the URL, branch, and exact commit SHA, and read
   upstream `LICENSE-MIT` and `LICENSE-CC` before selecting assets. Locate the
   model JSON, texture PNG, model entry, animation list, authors, and credits.
   Never silently download or publish a third-party model pack.
3. Copy only the selected model to `public/input/model.json` and its texture
   to `public/input/texture.png`. These inputs stay ignored by Git.
4. Inspect bone names before changing poses. Common maid bones include
   `head`, `armLeft`, `armRight`, `legLeft`, and `legRight`, but custom
   packs may differ.
5. Edit the pose definitions in `src/capture.ts`. Preserve the fixed Codex v2
   row order and frame counts.
6. Run `npm install`, `npm run build`, and `npm run dev`.
7. Open `http://127.0.0.1:1420/capture.html` in a real browser/WebGL surface.
   The page directly writes `output/spritesheet.png` with alpha. Do not take a
   browser screenshot and do not chroma-key the page.
8. Hand the atlas to `hatch-pet` for deterministic v2 validation, contact
   sheets, Look direction QA, continuity review, WebP output, and packaging.
9. Install only after all hard gates pass.

## Division of responsibility

This repository owns:

- Bedrock geometry/UV parsing and Three.js rendering
- original texture fidelity
- original/native bone pose mapping
- direct RGBA atlas export
- TLM-specific coordinate-system diagnosis

`hatch-pet` owns:

- the 192×208, 8×11, 1536×2288 v2 contract
- row counts and unused transparent cells
- four cardinal Look hard gates and all 16 clockwise directions
- blind direction QA, labeled semantics, continuity, final visual QA
- `spriteVersionNumber: 2` packaging under `$CODEX_HOME/pets/<id>`

Do not invoke image generation merely because `hatch-pet` normally generates
visual rows. The user chose an existing 3D model and this repository supplies
the visual source deterministically. Use image generation only after explicit
user approval when the source model genuinely cannot express a required state.

Cloning the official repository is an input-discovery step, not permission to
commit it into this repository. Keep `upstream/` and `public/input/` untracked.
The converter's MIT license does not relicense upstream models, textures, or
derived spritesheets. When packaging redistributable output, preserve the
official asset attribution and CC BY-NC-SA 4.0 terms; treat every third-party
pack as separately licensed.

## Fixed atlas contract

| Row | State | Used cells |
| --- | --- | --- |
| 0 | idle | 6 loop frames + neutral cell |
| 1 | running-right | 8 |
| 2 | running-left | 8 |
| 3 | waving | 4 |
| 4 | jumping | 5 |
| 5 | failed | 8 |
| 6 | waiting / needs input | 6 |
| 7 | running / active task work | 6 |
| 8 | review | 6 |
| 9 | Look 000 through 157.5 | 8 |
| 10 | Look 180 through 337.5 | 8 |

Look order is clockwise in screen coordinates. `000` is up, `090` is
screen-right, `180` is down, and `270` is screen-left.

## Mandatory checks

- Never infer left/right only from a Three.js rotation sign. Render and inspect.
- Running rows describe screen travel and must be checked separately from Look.
- For humanoid Look QA, use face/eyes/head center and trailing hair. Ignore
  symmetric weapons or rods as direction indicators.
- At normal pet size, idle and every semantic state must visibly animate.
- Keep one shared scale and baseline. Preserve wide props without clipping.
- Direct alpha export is required. A browser screenshot introduces scaling and
  color-fringe defects.
- Respect reduced-motion behavior and note that current desktop Look frames are
  triggered by Computer Use cursor events, not ordinary global mouse movement.

## Validation and installation

Use the Python executable returned by Codex workspace dependencies. Use the
installed `hatch-pet/scripts` commands rather than inventing alternate atlas
validators. Choose a spill-check key absent from the model; direct RGBA output
should report zero changed pixels.

The final package must contain:

```text
$CODEX_HOME/pets/<pet-id>/
  pet.json
  spritesheet.webp
```

After installation, tell the user to open **Settings > Pets**, select
**Refresh**, and choose the pet.
