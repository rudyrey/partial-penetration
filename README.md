# Partial Penetration Skin Explorer

Interactive web app for exploring the effect of partial penetration (restricted
entry) on well skin, productivity index, and life-of-well production.

## Running

No build step — plain HTML/CSS/JS with Chart.js from CDN.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

(Opening `index.html` directly from the filesystem also works.)

## Tabs

### Skin & PI
Sliders for completion geometry (h, b = hp/h, rw, kv/kh, interval placement)
and reservoir/PI inputs (k, μ, Bo, re, damage skin sd). Shows:

- Pseudoskin sp from every implemented correlation, side by side
- Total skin st = sp + (h/hp)·sd (Saidikowski decomposition)
- PSS productivity index and PI loss vs a fully penetrating well
- Charts: sp vs b, PI ratio vs b, sp vs kv/kh

### Life of Well
Analytical single-phase oil forecast at constant bottomhole pressure in a
closed circular drainage area: infinite-acting radial flow stitched to
boundary-dominated (exponential) decline via material balance. Compares
partial penetration vs full penetration vs undamaged-ideal cases and sweeps
EUR vs penetration fraction. Includes a 10%/yr discounted-EUR metric to show
the acceleration value lost to partial penetration even when ultimate
recovery is unchanged.

### Theory & References
Formulas, assumptions, validity notes, and original references for every
correlation and for the forecast model.

## Correlations implemented

See `js/correlations.js` — each entry is registry-driven, so adding another
correlation is a single object with a `fn(params)` returning sp.

## Units

Field units throughout: ft, md, cp, psi, stb/d, rb/stb. Note Odeh (1980) is
a dimensional correlation (h and rw must be in feet), which is preserved.
