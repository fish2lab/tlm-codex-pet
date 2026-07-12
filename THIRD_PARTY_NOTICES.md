# Third-party and fan-content notice

This repository's TypeScript conversion/rendering code is released under MIT.

The official [Touhou Little Maid repository](https://github.com/TartaricAcid/TouhouLittleMaid)
publishes its code under
[MIT](https://github.com/TartaricAcid/TouhouLittleMaid/blob/1.20/LICENSE-MIT)
and its official assets under
[CC BY-NC-SA 4.0](https://github.com/TartaricAcid/TouhouLittleMaid/blob/1.20/LICENSE-CC).
Preserve attribution, non-commercial use, and ShareAlike requirements when
redistributing those assets or derived spritesheets. Record the exact upstream
commit used so the source and license can be audited later.

Touhou Project characters are fan-content subject to the applicable
Touhou Project/ZUN fan-content guidelines. A model pack may also have its own
authors and license. Check all three layers before publishing:

1. this converter's code license;
2. Touhou Little Maid or the custom pack's asset license;
3. the character/IP fan-content rules.

The default repository intentionally ignores `public/input/model.json` and
`public/input/texture.png` so users do not accidentally commit assets whose
redistribution terms they have not checked. It also ignores `upstream/`, which
may hold a shallow clone used for local input discovery.

Suggested attribution for output derived exclusively from official assets:

> Built from Touhou Little Maid by TartaricAcid and contributors
> (`https://github.com/TartaricAcid/TouhouLittleMaid`, commit `<SHA>`).
> Source assets and this derivative are provided under CC BY-NC-SA 4.0.

Replace `<SHA>` and add the selected model's author/credit metadata. Do not use
this template for a third-party model pack until its separate license has been
checked.
