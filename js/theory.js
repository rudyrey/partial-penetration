/* Theory & references tab content. */
(function () {
  "use strict";

  function html() {
    return `
<section>
  <h2>Why partial penetration creates skin</h2>
  <p>When a well is completed across only a fraction <b>b = h<sub>p</sub>/h</b> of the
  productive interval, flow must converge vertically toward the open interval near the
  wellbore. That convergence adds pressure drop that is not present for a fully
  penetrating well, and it is conventionally lumped into a positive <i>pseudoskin</i>
  s<sub>p</sub>. Because the convergence happens in the vertical plane, vertical
  permeability matters: everything is controlled by the dimensionless thickness</p>
  <div class="eq">h_D = (h / r_w) &middot; &radic;(k_h / k_v)</div>
  <p>Low k<sub>v</sub>/k<sub>h</sub> (large h<sub>D</sub>) makes the convergence harder
  and the pseudoskin larger. s<sub>p</sub> &rarr; 0 as b &rarr; 1. Unlike mechanical
  damage, pseudoskin is a completion-geometry effect &mdash; it cannot be acidized away,
  only re-completed away.</p>
  <p>Damage skin measured over the open interval is amplified by partial penetration.
  The decomposition used throughout this app (Saidikowski, 1979):</p>
  <div class="eq">s_t = s_p + (h / h_p) &middot; s_d</div>
  <p>Intuition: the damage pressure drop happens across the open interval only, where
  the flux per foot is h/h<sub>p</sub> times higher than it would be in a fully
  penetrating well, so a well test "sees" the damage magnified by that factor.</p>
</section>

<section>
  <h2>Variable glossary</h2>
  <ul>
    <li><b>h</b> &mdash; total (gross) formation thickness, ft</li>
    <li><b>h<sub>p</sub></b> &mdash; completed (open/perforated) interval length, ft</li>
    <li><b>b = h<sub>p</sub>/h</b> &mdash; penetration fraction (0 &lt; b &le; 1)</li>
    <li><b>h<sub>1</sub></b> &mdash; standoff: distance from the top no-flow boundary to the top of the open interval, ft (h<sub>1D</sub> = h<sub>1</sub>/h)</li>
    <li><b>z<sub>m</sub></b> &mdash; distance from the top of the sand to the <i>midpoint</i> of the open interval, ft (used by Odeh)</li>
    <li><b>r<sub>w</sub></b> &mdash; wellbore radius, ft</li>
    <li><b>r<sub>e</sub></b> &mdash; drainage radius, ft (only needed to convert productivity ratios to skin, and for PI itself)</li>
    <li><b>k<sub>h</sub>, k<sub>v</sub></b> &mdash; horizontal and vertical permeability, md; only the ratio k<sub>v</sub>/k<sub>h</sub> enters the pseudoskin</li>
    <li><b>h<sub>D</sub> = (h/r<sub>w</sub>)&radic;(k<sub>h</sub>/k<sub>v</sub>)</b> &mdash; dimensionless thickness; the single most important group</li>
    <li><b>s<sub>p</sub></b> &mdash; partial-penetration pseudoskin (always &ge; 0)</li>
    <li><b>s<sub>d</sub></b> &mdash; mechanical damage skin referenced to the open interval</li>
    <li><b>s<sub>t</sub></b> &mdash; total skin, what a pressure-transient test actually reports</li>
    <li><b>J</b> &mdash; productivity index, stb/d/psi</li>
  </ul>
</section>

<section>
  <h2>Correlations implemented</h2>
  <p>All of these answer the same question &mdash; how much extra pressure drop does the
  vertical convergence cost? &mdash; but they were derived different ways (analytical
  approximation, empirical fit to numerical models, chart fits), so they differ in
  accuracy, in how they treat the position of the open interval, and in how far you can
  trust them at extreme geometries. Their spread at your settings is a fair proxy for
  the real uncertainty.</p>
  <div id="theory-corr"></div>
</section>

<section>
  <h2>Which one should I use?</h2>
  <ul>
    <li><b>Reference answer:</b> Streltsova-Adams. It is an exact series solution, not
        a fit; in published benchmarks it tracks full numerical simulation within ~2%.
        When the closed forms disagree, believe the one closest to it.</li>
    <li><b>Best closed form:</b> Papatzacos. An approximation of the exact
        analytical solution, dimensionless, smooth over all b, and handles any interval
        elevation. Typically within a few percent of the exact series solution.</li>
    <li><b>Quick hand calculation or symmetric completions:</b> Brons &amp; Marting.
        The industry classic; nearly every well-test textbook reproduces it.</li>
    <li><b>Interval at an odd elevation, field-units workflow:</b> Odeh. Its corrected
        wellbore radius term was built specifically for off-centered intervals.</li>
    <li><b>Decomposing a tested total skin into damage vs geometry:</b> Saidikowski
        &mdash; that is exactly what the paper was about, and the
        s<sub>t</sub> = (h/h<sub>p</sub>)s<sub>d</sub> + s<sub>p</sub> split comes from it.</li>
    <li><b>Isotropic formations / historical comparison:</b> Kozeny (only published
        as valid for b &le; 0.5) or Bervaldier. Both ignore anisotropy, so in typical
        reservoirs (k<sub>v</sub> &lt;&lt; k<sub>h</sub>) they understate the penalty.</li>
    <li><b>Modern cross-check:</b> Abobaker et al. (2021), but only inside its narrow
        fitted ranges — the app shows “n/a” outside them.</li>
  </ul>
</section>

<section>
  <h2>Methods known but deliberately not implemented</h2>
  <p>Several other published methods exist. They are omitted here for specific,
  honest reasons rather than transcribed from memory or from unsourced copies:</p>
  <ul>
    <li><b>Muskat (1932)</b> and <b>Nisle (1958)</b> — the founding solutions, but
        published as charts/series without a hand-usable closed form. Brons &amp;
        Marting was validated against Muskat anyway.</li>
    <li><b>Odeh (1968)</b> — the steady-state series solution behind Odeh’s 1980
        equation; graphical, superseded by the 1980 form implemented here.</li>
    <li><b>Vrbik (1986, 1991)</b>, <b>Kuchuk &amp; Kirwan (1987)</b>,
        <b>Yeh &amp; Reynolds (1989)</b>, <b>Ding &amp; Reynolds (1994)</b> — real,
        benchmarked closed forms (Yeh &amp; Reynolds is among the most accurate
        published), but the exact algebra lives only in paywalled SPE papers and
        garbled versions circulate online. Rather than risk implementing a wrong
        formula, they are listed for the reader who can pull the originals.</li>
    <li><b>Gomes &amp; Ambastha (1993)</b> — closed form for multilayer/gas-cap
        boundary conditions, but the least accurate method (errors to ~55%) in the
        single-layer benchmark this app targets.</li>
    <li><b>McKinley et al. (1984)</b> — empirical, placement-insensitive, &gt;32%
        benchmark error.</li>
  </ul>
  <p class="ref">Benchmark statements from Farokhi &amp; Gerami: “Evaluation of
  pseudoskin factor of partially penetrating wells,” J. Geophys. Eng. 9 (2012)
  642–654, which compares all of these against ECLIPSE. The Streltsova and
  Brons &amp; Marting implementations in this app reproduce that paper’s tabulated
  values to ~1%.</p>
</section>

<section>
  <h2>Productivity index</h2>
  <p>Pseudosteady state, slightly compressible oil, field units:</p>
  <div class="eq">J = k h / [141.2 &mu; B (ln(r_e/r_w) &minus; 3/4 + s_t)]   [stb/d/psi]</div>
  <p>The PI ratio chart shows J(b)/J(b=1) with the damage term scaled by h/h<sub>p</sub>
  as above, so it captures both the added pseudoskin and the amplification of damage.
  The dashed grey diagonal is the bounding case where the uncompleted section
  contributes nothing at all (h = h<sub>p</sub>, s<sub>p</sub> = 0, no vertical
  crossflow): there J &prop; h<sub>p</sub>, so J/J<sub>full</sub> = b exactly. The gap
  between the correlation curves and that diagonal is the production you get "for free"
  from the uncompleted section via vertical flow &mdash; the pseudoskin framework and
  the reduced-h framework are two bookkeeping conventions for the same physics, and
  reality sits between the diagonal (k<sub>v</sub> = 0) and 1.0 (k<sub>v</sub> = &infin;).</p>
</section>

<section>
  <h2>Life-of-well model</h2>
  <p>Single-phase, slightly compressible oil in a closed circular drainage area,
  produced at constant bottomhole pressure. Two flow regimes are stitched together
  at the point where their rates cross, or at t<sub>DA</sub> = 0.1, whichever comes
  first:</p>
  <h4>1. Infinite-acting radial flow</h4>
  <div class="eq">q(t) = k h (p_i &minus; p_wf) / (141.2 &mu; B [&frac12;(ln t_D + 0.80907) + s_t])
t_D  = 0.0002637 k t / (&phi; &mu; c_t r_w&sup2;)      (t in hours)</div>
  <h4>2. Boundary-dominated (pseudosteady-state) flow</h4>
  <div class="eq">q(t)   = J (p&#772;(t) &minus; p_wf)
p&#772;(t) = p_i &minus; 5.615 B N_p(t) / (c_t V_p),   V_p = &pi; r_e&sup2; h &phi;</div>
  <p>Material balance is integrated numerically on a log-spaced time grid; with a
  constant PI this yields the classical exponential decline. EUR is read at the
  economic-limit rate. A 10%/yr continuously discounted cumulative is also computed:
  partial penetration often costs little <i>ultimate</i> recovery in a closed tank
  &mdash; what it costs is <i>acceleration</i>, and the discounted barrels make that
  visible.</p>
  <h4>Assumptions &amp; limitations</h4>
  <ul>
    <li>Skin (including pseudoskin) treated as constant, rate-independent, and applied
        to both flow regimes.</li>
    <li>Single-phase oil above the bubble point; no gas evolution, no aquifer,
        no changing drive mechanism.</li>
    <li>Constant p<sub>wf</sub> from day one; no tubing/lift constraints.</li>
    <li>The infinite-acting rate uses the reciprocal of the constant-rate solution
        (1/p<sub>D</sub>) rather than the exact van Everdingen&ndash;Hurst
        constant-pressure solution — the standard screening approximation, good to a
        few percent for t<sub>D</sub> &gt; ~100.</li>
    <li>Pseudoskin correlations assume homogeneous (if anisotropic) formations and
        a single open interval.</li>
  </ul>
</section>

<section>
  <h2>References</h2>
  <div id="theory-refs"></div>
</section>`;
  }

  /* Per-correlation detail blocks, keyed to CORR entries. */
  const DETAILS = {
    bronsMarting: {
      eq: `s_p = (1/b &minus; 1) [ln(h_D') &minus; G(b)]
G(b) = 2.948 &minus; 7.363 b + 11.45 b&sup2; &minus; 4.675 b&sup3;
h_D' = h_D          (interval flush with top or bottom boundary)
h_D' = h_D / 2      (interval centered; mirror-image symmetry)`,
      vars: "b = penetration fraction; h_D = (h/r_w)&radic;(k_h/k_v); G(b) is a polynomial fit to their chart.",
      how: "Derived from steady-state analytical results for a well producing from part of a bounded layer, published as charts; the G(b) polynomial is the standard curve fit. Placement is handled by symmetry arguments: a centered interval is equivalent to two mirror-image problems each of half thickness, hence h_D/2; the same trick extends to N equally spaced open intervals.",
      pros: [
        "The industry classic — reproduced in nearly every well-test and production textbook, so results are easy to benchmark and communicate.",
        "Simple enough for a hand calculation; only needs b and h_D.",
        "The symmetry-element idea extends naturally to multiple equally spaced intervals (stacked completions).",
      ],
      cons: [
        "Strictly defined only for an interval flush with a boundary or perfectly centered — arbitrary elevations are not covered (this app blends between the two limits as an explicit approximation).",
        "A curve fit, not an exact solution; accuracy degrades at very small b (&lt; ~0.1) and small h_D (&lt; ~100), where it can even go negative (reported as “not applicable” here).",
        "Assumes uniform flux along the open interval rather than uniform pressure, which slightly overstates s_p.",
      ],
      use: "Quick estimates, symmetric completions, benchmarking against textbook examples, and multi-interval completions via the symmetry rule.",
    },
    odeh: {
      eq: `s_p = 1.35 (1/b &minus; 1)^0.825 [ln(h&radic;(k_h/k_v) + 7) &minus; (0.49 + 0.1 ln(h&radic;(k_h/k_v))) ln(r_wc) &minus; 1.95]
r_wc = r_w exp[0.2126 (z_m/h + 2.753)]   if the interval does not start at the top of the sand
r_wc = r_w                                if it does
NOTE: dimensional — h and r_w must be in FEET.`,
      vars: "b = penetration fraction; z_m = distance from top of sand to the middle of the open interval, ft; r_wc = “corrected” wellbore radius encoding interval elevation.",
      how: "An empirical equation fit by Odeh to numerically computed restricted-entry skins, designed to replace chart lookups with one explicit formula. The r_wc term shifts the effective wellbore radius to account for how far the open interval sits from the nearest no-flow boundary.",
      pros: [
        "One explicit equation covering any interval elevation — no charts, no cases, no symmetry arguments.",
        "Widely cited and embedded in many commercial nodal-analysis packages, so it is a useful cross-check against software output.",
        "The only classic correlation that was explicitly built around off-centered intervals.",
      ],
      cons: [
        "Dimensional: h and r_w must be in feet, because they appear alone inside logarithms. Using SI units silently gives wrong answers.",
        "Small discontinuity between the “starts at top” (r_wc = r_w) and “does not” branches.",
        "Empirical fit — behaves poorly outside roughly 0.1 &le; b &le; 0.9 and for unusually large wellbore radii; tends to sit at the high end of the correlation spread.",
      ],
      use: "Field-unit workflows, intervals at odd elevations, and reproducing/checking commercial software results.",
    },
    papatzacos: {
      eq: `s_p = (1/b &minus; 1) ln(&pi; h_D / 2) + (1/b) ln[ (b/(2+b)) ((A&minus;1)/(B&minus;1))^&frac12; ]
A = 1/(h_1D + b/4),   B = 1/(h_1D + 3b/4)
h_1D = h_1/h = fractional standoff from the top boundary`,
      vars: "b = penetration fraction; h_D = (h/r_w)&radic;(k_h/k_v); h_1D locates the interval (0 = flush with top, (1−b)/2 = centered).",
      how: "An asymptotic approximation of the exact analytical solution for an infinite-conductivity (uniform-pressure) partially penetrating well between two no-flow boundaries, derived from source-function theory rather than fit to charts or simulations.",
      pros: [
        "Analytically grounded — generally the closest of the closed forms to the exact series solution (typically within a few percent).",
        "Fully dimensionless and smooth over the whole range of b and interval position; no branches or special cases.",
        "Uniform-pressure (infinite-conductivity) wellbore condition is the physically correct one for a real wellbore, unlike uniform-flux fits.",
      ],
      cons: [
        "Single open interval only — no extension to multiple intervals.",
        "The formula is less transparent; hard to sanity-check by hand.",
        "Assumes homogeneous (if anisotropic) properties; thin high-contrast laminated sections violate the premise (true of all of these correlations, but Papatzacos’ precision can create false confidence).",
      ],
      use: "The default choice when you want the best single number, and the recommended basis for the life-of-well forecast.",
    },
    streltsova: {
      eq: `s_p = (2/(&pi;&sup2;b&sup2;)) &Sigma;_{n=1..&infin;} (1/n&sup2;) [sin(n&pi;z_2D) &minus; sin(n&pi;z_1D)]&sup2; K_0(a_n)/(a_n K_1(a_n))
a_n = n&pi;/h_D,   z_1D = h_1/h,   z_2D = (h_1 + h_p)/h
K_0, K_1 = modified Bessel functions of the second kind`,
      vars: "z_1D, z_2D bracket the open interval; h_D = (h/r_w)&radic;(k_h/k_v); the series is summed numerically with a tail bound.",
      how: "The long-time limit of Streltsova-Adams’ exact analytical drawdown solution for a limited-entry well (Laplace/Fourier transforms, uniform flux, pressure averaged over the open interval). Not a curve fit — an exact series, so it serves as the in-app reference solution.",
      pros: [
        "Reference-quality: one of the most accurate methods in the published Farokhi & Gerami (2012) benchmark against ECLIPSE (within ~2%), and this implementation reproduces that paper’s tabulated values to ~1%.",
        "Fully arbitrary interval position, fully dimensionless, valid over the whole range of b and h_D.",
        "The natural yardstick for judging the closed-form correlations — when they disagree, believe the one closest to this.",
      ],
      cons: [
        "An infinite series with Bessel functions — not a hand calculation, and marginally slower to evaluate than the closed forms (still <1 ms here).",
        "Uniform-flux inner boundary condition (pressure averaged over the interval) rather than true infinite conductivity — a small systematic difference from Papatzacos’ assumption.",
        "Single homogeneous anisotropic layer, sealed top and bottom, one contiguous interval.",
      ],
      use: "The reference answer, arbitration between disagreeing correlations, and any case where accuracy matters more than transparency.",
    },
    saidikowski: {
      eq: `s_p = (h/h_p &minus; 1) [ln((h/r_w)&radic;(k_h/k_v)) &minus; 2]
plus the total-skin decomposition  s_t = (h/h_p) s_d + s_p`,
      vars: "h/h_p = 1/b; the bracket is just ln(h_D) − 2.",
      how: "From numerical simulations of wells with both wellbore damage and restricted entry. The pseudoskin formula is a deliberately simple by-product; the paper’s real contribution is the decomposition showing how partial penetration amplifies damage skin by h/h_p.",
      pros: [
        "Simplest formula of all — trivially inverted, ideal for quicklook diagnostics.",
        "Comes packaged with the s_t decomposition, which is what you actually need to interpret a well-test skin on a partially penetrating well (is that s_t = 20 damage, or just geometry?).",
        "No placement input needed — useful when you genuinely don’t know where the perfs sit in the gross interval.",
      ],
      cons: [
        "No placement dependence at all — a centered interval and one jammed against a boundary get the same s_p, which can differ by ~15–20% in reality.",
        "Cruder than Brons &amp; Marting or Papatzacos, especially at small b; the “−2” constant is a blunt instrument.",
        "Like Brons &amp; Marting, can go negative at small h_D (reported as “not applicable” here).",
      ],
      use: "Splitting a measured total skin into damage vs geometry, and fast screening when inputs are poorly known anyway.",
    },
    kozeny: {
      eq: `PR = J_pp/J_full = b [1 + 7&radic;(r_w/(2 h_p)) cos(&pi;b/2)]
converted to an equivalent skin via  s_p = (ln(r_e/r_w) &minus; 3/4)(1/PR &minus; 1)`,
      vars: "PR = productivity ratio; h_p = open interval, ft; r_w = wellbore radius, ft. Isotropic — k_v/k_h does not appear.",
      how: "The original 1933 steady-state result from groundwater hydraulics, expressed as a productivity ratio rather than a skin. This app converts it to an equivalent pseudoskin through the pseudosteady-state inflow equation so it can sit on the same axes as the others.",
      pros: [
        "Historically first and still common in hydrology/water-well practice.",
        "Needs almost nothing: b, h_p and r_w.",
        "A useful lower-bound sanity check in genuinely isotropic rock.",
      ],
      cons: [
        "Ignores anisotropy entirely — in typical reservoirs (k_v/k_h ~ 0.1 or less) it materially understates the pseudoskin.",
        "Assumes the interval starts at a boundary and uniform flux; no placement handling.",
        "The converted skin depends on r_e, so it is not a pure completion property like the others — change the drainage radius and the “skin” changes.",
      ],
      use: "Isotropic formations, water wells, historical comparison, and as a soft lower bound on the pseudoskin.",
    },
    bervaldier: {
      eq: `s_p = (1/b &minus; 1) [ ln(h_p/r_w) / (1 &minus; r_w/h_p) &minus; 1 ]`,
      vars: "h_p = open interval, ft; r_w = wellbore radius, ft. No anisotropy or placement terms.",
      how: "A compact closed form from Bervaldier’s dissertation, preserved in the literature through Lu’s (2009, 2010) papers on partially penetrating wells, which quote it verbatim alongside Brons & Marting and Papatzacos.",
      pros: [
        "The simplest formula here after Saidikowski — needs only h_p/r_w and b.",
        "Well behaved over all b (no negative-skin pathologies at small h_D).",
      ],
      cons: [
        "Ignores anisotropy entirely — like Kozeny, it will understate s_p when k_v << k_h.",
        "No placement dependence; requires h_p >> r_w (returns n/a when h_p ≤ 2r_w).",
        "Least pedigree of the set — rarely benchmarked in the literature.",
      ],
      use: "Quick isotropic estimates and cross-checking the order of magnitude of the others.",
    },
    abobaker: {
      eq: `s_p = exp( 4 &minus; 3.65 h_d &minus; 135 r_d &minus; 0.26 k_r + 0.125 l_d )
h_d = h_p/h = b,   r_d = r_w/h,   k_r = k_v/k_h,   l_d = h_1/h`,
      vars: "All inputs dimensionless ratios. Note k_r is k_v/k_h (inverted vs the usual k_h/k_v convention).",
      how: "The newest correlation (2021): a Box-Behnken regression fit to CFD simulations of partially penetrating vertical oil wells, published in J. Petrol. Explor. Prod. Technol.",
      pros: [
        "Modern, CFD-derived, and includes interval standoff (l_d) explicitly.",
        "Trivially cheap to evaluate — a single exponential.",
      ],
      cons: [
        "Narrow design ranges: b 0.2–0.6, r_w/h 0.00083–0.0025 (roughly h = 140–420 ft for a typical r_w), k_v/k_h 0.1–1. This app returns “n/a” outside them rather than extrapolate.",
        "The 135·r_d coefficient makes it hypersensitive to r_w/h — extrapolation beyond the fitted range fails badly.",
        "Short track record compared to the classics.",
      ],
      use: "Cross-checking the classics inside its fitted window, particularly for moderate penetrations in thick zones.",
    },
  };

  function inject() {
    const corrDiv = document.getElementById("theory-corr");
    const refsDiv = document.getElementById("theory-refs");
    if (!corrDiv || !window.CORR) return;
    let ch = "", rh = "";
    for (const c of CORR.list) {
      const d = DETAILS[c.key];
      const placeTag =
        c.placement === "full" ? "arbitrary placement" :
        c.placement === "partial" ? "placement approximated" : "placement-independent";
      ch += `<h4>${c.name} (${c.year}) <span class="tag">${placeTag}</span></h4>`;
      if (d) {
        ch += `<div class="eq">${d.eq}</div>
          <p><b>Variables:</b> ${d.vars}</p>
          <p><b>Where it comes from:</b> ${d.how}</p>
          <p><b>Advantages:</b></p><ul>${d.pros.map((x) => `<li>${x}</li>`).join("")}</ul>
          <p><b>Limitations:</b></p><ul>${d.cons.map((x) => `<li>${x}</li>`).join("")}</ul>
          <p><b>Use it for:</b> ${d.use}</p>`;
      } else {
        ch += `<p class="ref">${c.notes}</p>`;
      }
      rh += `<p class="ref">${c.ref}</p>`;
    }
    corrDiv.innerHTML = ch;
    refsDiv.innerHTML = rh;
  }

  window.THEORY = { html, inject };

  // app.js sets innerHTML from html(); inject() fills the dynamic parts after.
  document.addEventListener("DOMContentLoaded", () => setTimeout(inject, 0));
})();
