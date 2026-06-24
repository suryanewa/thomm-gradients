# Hiro Luminous Gradient Studio

A standalone playground for generating luminous framed gradients from layered
canvas shapes, per-layer blur, blend modes, bloom, edge compression, and grain.

The UI mirrors the Hiro app interaction model:

- Press `Space` to randomize.
- Hold `Space` for rapid randomization.
- Click parameter titles to lock them during randomization.
- Tweak colors, palette, form, blend, blur, bloom, contrast, depth, aperture,
  asymmetry, and grain.
- Export the current canvas as PNG.

Color palettes are generated from deterministic harmony recipes during
randomization, so each mood produces fresh colorways while keeping coherent
roles for base, rim, body, lower glow, accent, and core.

## Run

```sh
python3 -m http.server 4177
```

Then visit:

```text
http://127.0.0.1:4177/
```
