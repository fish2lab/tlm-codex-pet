# Yukari Yakumo example

The current pose mapping in `src/capture.ts` is the working Yukari example.
It was tuned for the standard TLM maid bones and her unusually wide pair of
rod/gap props.

Important lessons captured in the example:

- export the RGBA canvas directly; browser screenshots caused half-size sprites
  and colored fringe;
- fit scale by the complete silhouette, including both rods;
- row 1 and row 2 use Codex screen-travel semantics, not a guessed Three.js sign;
- idle, waving, failed, waiting, active work, and review need visible changes at
  normal pet size;
- Look cardinals need stronger side profiles for this nearly symmetric model;
- blind horizontal reviewers must use face/eyes/rear hair and ignore the two
  symmetric rods.

`pet.json` is ready to accompany a validated `spritesheet.webp`. The model
JSON and texture are deliberately not included in `public/input`; verify the
asset and Touhou fan-content licenses before publishing a release bundle.
