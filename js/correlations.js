/* Partial-penetration (restricted-entry) pseudoskin correlations.
 *
 * Common inputs (field units):
 *   h     total formation thickness, ft
 *   b     penetration fraction hp/h (0 < b <= 1)
 *   rw    wellbore radius, ft
 *   kvkh  vertical/horizontal permeability ratio kv/kh
 *   placement  'top' | 'center' | 'custom'
 *   h1frac     h1/h, distance from top boundary to top of open interval
 *              (used when placement === 'custom')
 *   re    drainage radius, ft (only used by productivity-ratio methods to
 *         convert PR to an equivalent skin)
 *
 * Dimensionless groups:
 *   hD = (h/rw) * sqrt(kh/kv)
 *
 * Each entry: { key, name, year, ref, placement: 'full'|'partial'|'none',
 *               notes, fn(p) -> sp (dimensionless) or null if outside range }
 */
(function () {
  "use strict";

  const ln = Math.log;

  function hD(p) {
    return (p.h / p.rw) / Math.sqrt(p.kvkh);
  }

  // Pseudoskin must be >= 0. Small negative values (roundoff near b = 1) are
  // clamped to zero; clearly negative results mean the correlation is outside
  // its validity range (e.g. very small hD), so report "not applicable".
  function clampSp(sp) {
    if (sp === null || !isFinite(sp)) return null;
    if (sp < -0.25) return null;
    return Math.max(sp, 0);
  }

  /* Modified Bessel functions K0, K1 — polynomial approximations from
   * Abramowitz & Stegun §9.8 (max error ~1e-7). Needed by Streltsova-Adams. */
  function besselI0(x) {
    const t = (x / 3.75) * (x / 3.75);
    return 1 + t * (3.5156229 + t * (3.0899424 + t * (1.2067492 +
           t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))));
  }
  function besselI1(x) {
    const t = (x / 3.75) * (x / 3.75);
    return x * (0.5 + t * (0.87890594 + t * (0.51498869 + t * (0.15084934 +
           t * (0.02658733 + t * (0.00301532 + t * 0.00032411))))));
  }
  function besselK0(x) {
    if (x <= 2) {
      const t = (x * x) / 4;
      return -Math.log(x / 2) * besselI0(x) + (-0.57721566 +
        t * (0.42278420 + t * (0.23069756 + t * (0.03488590 +
        t * (0.00262698 + t * (0.00010750 + t * 0.00000740))))));
    }
    const u = 2 / x;
    return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 +
      u * (-0.07832358 + u * (0.02189568 + u * (-0.01062446 +
      u * (0.00587872 + u * (-0.00251540 + u * 0.00053208))))));
  }
  function besselK1(x) {
    if (x <= 2) {
      const t = (x * x) / 4;
      return Math.log(x / 2) * besselI1(x) + (1 / x) * (1 +
        t * (0.15443144 + t * (-0.67278579 + t * (-0.18156897 +
        t * (-0.01919402 + t * (-0.00110404 + t * -0.00004686))))));
    }
    const u = 2 / x;
    return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 +
      u * (0.23498619 + u * (-0.03655620 + u * (0.01504268 +
      u * (-0.00780353 + u * (0.00325614 + u * -0.00068245))))));
  }

  // h1/h implied by the placement mode
  function h1frac(p) {
    if (p.placement === "top") return 0;
    if (p.placement === "center") return (1 - p.b) / 2;
    // custom: clamp so the interval stays inside the zone
    return Math.min(Math.max(p.h1frac, 0), 1 - p.b);
  }

  /* ---------------- Brons & Marting (1961) ----------------
   * sp = (1/b - 1) * [ln(hD') - G(b)]
   * G(b) = 2.948 - 7.363 b + 11.45 b^2 - 4.675 b^3
   * Placement enters through the symmetry element: an interval flush with a
   * no-flow boundary uses the full hD; a centered interval is two mirrored
   * half-problems, so hD' = hD/2. Arbitrary elevation is approximated by
   * blending between those limits on the interval eccentricity.
   */
  function bronsMarting(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const G = 2.948 - 7.363 * b + 11.45 * b * b - 4.675 * b * b * b;
    let hDeff = hD(p);
    if (p.placement === "center") {
      hDeff /= 2;
    } else if (p.placement === "custom") {
      // eccentricity: 0 = centered, 1 = flush with a boundary
      const zTopFrac = h1frac(p);
      const zMidFrac = zTopFrac + b / 2;
      const maxOff = (1 - b) / 2;
      const e = maxOff > 0 ? Math.abs(zMidFrac - 0.5) / maxOff : 0;
      hDeff /= Math.pow(2, 1 - e); // blend hD (flush) .. hD/2 (centered)
    }
    const sp = (1 / b - 1) * (ln(hDeff) - G);
    return clampSp(sp);
  }

  /* ---------------- Odeh (1980) ----------------
   * sp = 1.35 (1/b - 1)^0.825 *
   *      [ln(hD + 7) - (0.49 + 0.1 ln(hD)) ln(rwc) - 1.95]
   * hD here is h*sqrt(kh/kv) with h in FEET (Odeh's correlation is
   * dimensional; h and rw must be in feet).
   * rwc = rw * exp[0.2126 (zm/h + 2.753)]  when the interval does not start
   * at the very top of the sand; rwc = rw when it does.
   * zm = distance from the top of the sand to the middle of the open interval.
   */
  function odeh(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const hAniso = p.h / Math.sqrt(p.kvkh); // ft
    const y = h1frac(p) * p.h;              // top of sand -> top of perfs, ft
    const zm = y + (b * p.h) / 2;           // -> middle of perfs, ft
    const rwc =
      y > 1e-9 ? p.rw * Math.exp(0.2126 * (zm / p.h + 2.753)) : p.rw;
    const sp =
      1.35 *
      Math.pow(1 / b - 1, 0.825) *
      (ln(hAniso + 7) - (0.49 + 0.1 * ln(hAniso)) * ln(rwc) - 1.95);
    return clampSp(sp);
  }

  /* ---------------- Papatzacos (1987) ----------------
   * sp = (1/b - 1) ln(pi*hD/2)
   *      + (1/b) ln[ (b/(2+b)) * ((A-1)/(B-1))^0.5 ]
   * A = 1/(h1D + b/4),  B = 1/(h1D + 3b/4),  h1D = h1/h.
   * Infinite-conductivity partially penetrating well, arbitrary interval
   * position between two no-flow boundaries.
   */
  function papatzacos(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const h1D = h1frac(p);
    const A = 1 / (h1D + b / 4);
    const B = 1 / (h1D + (3 * b) / 4);
    if (A <= 1 || B <= 1) return null; // degenerate geometry
    const sp =
      (1 / b - 1) * ln((Math.PI * hD(p)) / 2) +
      (1 / b) * ln((b / (2 + b)) * Math.sqrt((A - 1) / (B - 1)));
    return clampSp(sp);
  }

  /* ---------------- Saidikowski (1979) ----------------
   * sp = (h/hp - 1) * [ln((h/rw) sqrt(kh/kv)) - 2]
   * Also gives the total-skin decomposition st = (h/hp) sd + sp used to
   * scale a damage skin measured over the open interval.
   */
  function saidikowski(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const sp = (1 / b - 1) * (ln(hD(p)) - 2);
    return clampSp(sp);
  }

  /* ---------------- Streltsova-Adams (1979) ----------------
   * Exact long-time pseudoskin (limit S->0 of her Laplace-domain solution;
   * uniform flux, pressure averaged over the open interval, arbitrary
   * interval position z1..z2 between sealed boundaries):
   *   sp = (2/(pi^2 b^2)) * SUM_{n>=1} (1/n^2)
   *        * (sin(n pi z2D) - sin(n pi z1D))^2 * K0(a_n)/(a_n K1(a_n))
   *   a_n = n pi / hD,  hD = (h/rw) sqrt(kh/kv)
   * Series truncated with a conservative tail bound. One of the most
   * accurate methods in the Farokhi & Gerami (2012) benchmark vs ECLIPSE.
   */
  function streltsova(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const z1 = h1frac(p);
    const z2 = z1 + b;
    const hDv = hD(p);
    const pref = 2 / (Math.PI * Math.PI * b * b);
    let sum = 0;
    const NMAX = 400000;
    for (let n = 1; n <= NMAX; n++) {
      const a = (n * Math.PI) / hDv;
      let ratio; // K0(a)/(a K1(a))
      if (a < 0.02) ratio = -Math.log(a / 2) - 0.5772156649; // small-a limit
      else if (a < 18) ratio = besselK0(a) / (a * besselK1(a));
      else ratio = 1 / a; // K0/K1 -> 1 for large a
      const s = Math.sin(n * Math.PI * z2) - Math.sin(n * Math.PI * z1);
      sum += (s * s * ratio) / (n * n);
      // tail <= 4 * ratio(a_n) * sum_{m>n} 1/m^2 ~ 4 ratio / n
      if (n > 50 && (pref * 4 * ratio) / n < 1e-4 * (pref * sum + 1)) break;
    }
    return clampSp(pref * sum);
  }

  /* ---------------- Bervaldier ----------------
   * sp = (1/b - 1) * [ ln(hp/rw) / (1 - rw/hp) - 1 ]
   * Quoted (with source) in Lu (2009, 2010). Isotropic; no placement
   * dependence; requires hp >> rw.
   */
  function bervaldier(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const hp = b * p.h;
    if (hp <= 2 * p.rw) return null; // open interval must dwarf the wellbore
    const sp = (1 / b - 1) * (Math.log(hp / p.rw) / (1 - p.rw / hp) - 1);
    return clampSp(sp);
  }

  /* ---------------- Abobaker et al. (2021) ----------------
   * spp = exp(4 - 3.65 hd - 135 rd - 0.26 kr + 0.125 ld)
   * hd = hp/h (= b), rd = rw/h, kr = kv/kh, ld = h1/h.
   * CFD/Box-Behnken regression; enforced to its published design ranges
   * (b 0.2-0.6, rd 0.00083-0.0025, kv/kh 0.1-1) — hypersensitive to rd
   * outside them (the 135 coefficient), so no extrapolation.
   */
  function abobaker(p) {
    const b = p.b;
    if (b >= 1) return 0;
    const rd = p.rw / p.h;
    const kr = p.kvkh;
    const ld = h1frac(p);
    if (b < 0.2 || b > 0.6) return null;
    if (rd < 0.00083 || rd > 0.0025) return null;
    if (kr < 0.1 || kr > 1) return null;
    return clampSp(Math.exp(4 - 3.65 * b - 135 * rd - 0.26 * kr + 0.125 * ld));
  }

  /* ---------------- Kozeny (1933) ----------------
   * Productivity-ratio method (isotropic, steady state):
   *   PR = b * [1 + 7 sqrt(rw/(2 hp)) cos(pi b / 2)]
   * Converted to an equivalent pseudoskin through the PSS inflow equation:
   *   sp = (ln(re/rw) - 3/4) * (1/PR - 1)
   * No anisotropy or placement dependence; needs re for the conversion.
   */
  function kozeny(p) {
    const b = p.b;
    if (b >= 1) return 0;
    if (b > 0.5) return null; // published validity limit: b <= 0.5
    const hp = b * p.h;
    const PR = b * (1 + 7 * Math.sqrt(p.rw / (2 * hp)) * Math.cos((Math.PI * b) / 2));
    if (PR <= 0 || PR >= 1) return PR >= 1 ? 0 : null;
    const sp = (ln(p.re / p.rw) - 0.75) * (1 / PR - 1);
    return clampSp(sp);
  }

  const CORR = {
    list: [
      {
        key: "bronsMarting",
        name: "Brons & Marting",
        year: 1961,
        ref: "Brons, F. and Marting, V.E.: “The Effect of Restricted Fluid Entry on Well Productivity,” JPT (Feb. 1961) 172–174.",
        placement: "partial",
        notes: "Chart-based classic; centered interval treated as two mirrored half-problems (hD/2). Custom elevation blended heuristically.",
        fn: bronsMarting,
      },
      {
        key: "odeh",
        name: "Odeh",
        year: 1980,
        ref: "Odeh, A.S.: “An Equation for Calculating Skin Factor Due to Restricted Entry,” JPT (June 1980) 964–965.",
        placement: "full",
        notes: "Dimensional correlation — h and rw in feet. Handles arbitrary interval elevation via corrected wellbore radius rwc.",
        fn: odeh,
      },
      {
        key: "papatzacos",
        name: "Papatzacos",
        year: 1987,
        ref: "Papatzacos, P.: “Approximate Partial-Penetration Pseudoskin for Infinite-Conductivity Wells,” SPE Reservoir Engineering (May 1987) 227–234.",
        placement: "full",
        notes: "Closed-form approximation of the exact infinite-conductivity solution; arbitrary interval position.",
        fn: papatzacos,
      },
      {
        key: "streltsova",
        name: "Streltsova-Adams",
        year: 1979,
        ref: "Streltsova-Adams, T.D.: “Pressure Drawdown in a Well With Limited Flow Entry,” JPT (Nov. 1979) 1469–1476, SPE 7486-PA.",
        placement: "full",
        notes: "Exact long-time series solution (Bessel-function sum); arbitrary interval position. Reference-quality accuracy in published benchmarks.",
        fn: streltsova,
      },
      {
        key: "saidikowski",
        name: "Saidikowski",
        year: 1979,
        ref: "Saidikowski, R.M.: “Numerical Simulations of the Combined Effects of Wellbore Damage and Partial Penetration,” SPE 8204 (1979).",
        placement: "none",
        notes: "Simple form from numerical simulation; also provides st = (h/hp) sd + sp for combining with damage skin.",
        fn: saidikowski,
      },
      {
        key: "kozeny",
        name: "Kozeny (PR method)",
        year: 1933,
        ref: "Kozeny, J.: “Theorie und Berechnung der Brunnen,” Wasserkraft und Wasserwirtschaft (1933) 28, 101–105.",
        placement: "none",
        notes: "Historic productivity-ratio formula (isotropic); converted to equivalent skin with the PSS inflow equation. Published validity b ≤ 0.5.",
        fn: kozeny,
      },
      {
        key: "bervaldier",
        name: "Bervaldier",
        year: 1990,
        ref: "Bervaldier, J.M.: dissertation correlation, as quoted in Lu, J.: Math. Problems in Eng. (2009) 626154 and (2010) 907206.",
        placement: "none",
        notes: "Simple closed form; isotropic, no placement dependence, requires hp >> rw.",
        fn: bervaldier,
      },
      {
        key: "abobaker",
        name: "Abobaker et al.",
        year: 2021,
        ref: "Abobaker, E. et al.: “Quantifying the partial penetration skin factor for evaluating the completion efficiency of vertical oil wells,” J. Petrol. Explor. Prod. Technol. 11 (2021) 3031–3043.",
        placement: "partial",
        notes: "Newest correlation (CFD regression). Only valid inside its design ranges: b 0.2–0.6, rw/h 0.00083–0.0025, kv/kh 0.1–1 — shows “n/a” outside them.",
        fn: abobaker,
      },
    ],

    get(key) {
      return this.list.find((c) => c.key === key);
    },

    /** Evaluate every correlation; returns { key: sp|null } */
    evalAll(p) {
      const out = {};
      for (const c of this.list) {
        try {
          out[c.key] = c.fn(p);
        } catch (e) {
          out[c.key] = null;
        }
      }
      return out;
    },
  };

  window.CORR = CORR;
})();
