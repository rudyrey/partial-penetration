/* Analytical life-of-well production model.
 *
 * Single-phase, slightly compressible oil; constant bottomhole pressure;
 * closed circular drainage area. Field units throughout:
 *   k [md], h [ft], phi [-], mu [cp], ct [1/psi], B [rb/stb],
 *   rw [ft], re [ft], p [psi], q [stb/d], t [days].
 *
 * Infinite-acting period — constant-pwf rate from the log approximation of
 * the constant-rate solution (rate-transient equivalence is adequate for
 * screening):
 *   q(t) = k h (pi - pwf) / (141.2 mu B [0.5 (ln tD + 0.80907) + s])
 *   tD   = 0.0002637 k t_hr / (phi mu ct rw^2)
 *
 * Boundary-dominated period — pseudosteady-state PI with material-balance
 * depletion of average pressure:
 *   J     = k h / (141.2 mu B [ln(re/rw) - 3/4 + s])
 *   q     = J (pavg - pwf)
 *   pavg  = pi - 5.615 B Np / (ct Vp),  Vp = pi_ * re^2 * h * phi  [ft^3]
 *
 * The model runs in transient mode until either the transient rate drops to
 * the boundary-dominated rate or t reaches t_pss (tDA = 0.1), whichever
 * comes first, then switches permanently to boundary-dominated flow.
 */
(function () {
  "use strict";

  const LOW = {};

  /**
   * Simulate a well forecast.
   * @param {object} p - parameters
   *   k, h, phi, mu, ct, B, rw, re, pi, pwf, s, qEcon, tMaxYears
   * @returns {object} { t: [days], q: [stb/d], np: [stb], meta: {...} }
   */
  LOW.simulate = function (p) {
    const dp0 = p.pi - p.pwf;
    if (dp0 <= 0) return emptyResult("pwf must be below pi");

    const denomPss = Math.log(p.re / p.rw) - 0.75 + p.s;
    if (denomPss <= 0) return emptyResult("total skin too negative for PSS PI");

    const J = (p.k * p.h) / (141.2 * p.mu * p.B * denomPss); // stb/d/psi
    const Vp = Math.PI * p.re * p.re * p.h * p.phi;          // ft^3
    const stbPerPsi = (p.ct * Vp) / (5.615 * p.B);           // dNp/dpavg
    const tMaxDays = (p.tMaxYears || 50) * 365.25;

    // End of infinite-acting flow (circular reservoir, tDA = 0.1) — reported
    // for reference; the actual switch is rate-continuity based.
    const A = Math.PI * p.re * p.re;
    const tPssDays =
      (0.1 * p.phi * p.mu * p.ct * A) / (0.0002637 * p.k) / 24;

    const qTransient = (tDays) => {
      const tHr = tDays * 24;
      const tD = (0.0002637 * p.k * tHr) / (p.phi * p.mu * p.ct * p.rw * p.rw);
      const pD = 0.5 * (Math.log(tD) + 0.80907);
      const denom = Math.max(pD + p.s, 0.05); // clamp very-early-time blowup
      return (p.k * p.h * dp0) / (141.2 * p.mu * p.B * denom);
    };

    // Log-spaced time grid from 0.01 day out to tMax.
    const NSTEPS = 600;
    const logT0 = Math.log10(0.01);
    const logT1 = Math.log10(tMaxDays);

    const t = [], q = [], np = [];
    let Np = 0;
    let NpDisc = 0; // 10%/yr continuously discounted cumulative, stb
    const DISC = 0.10 / 365.25;
    let pavg = p.pi;
    let boundaryMode = false;
    let tPrev = 0, qPrev = null;
    let tEcon = null, qi = null, tSwitch = null, eurDisc = null;

    for (let i = 0; i <= NSTEPS; i++) {
      const ti = Math.pow(10, logT0 + ((logT1 - logT0) * i) / NSTEPS);

      pavg = p.pi - Np / stbPerPsi;
      const qBd = Math.max(J * (pavg - p.pwf), 0);

      let qi_;
      if (!boundaryMode) {
        const qTr = qTransient(ti);
        if ((qTr <= qBd || ti >= tPssDays) && ti > 0.05) {
          boundaryMode = true;
          tSwitch = ti;
          qi_ = Math.min(qTr, qBd); // avoid an upward jump at the switch
        } else {
          qi_ = qTr;
        }
      } else {
        qi_ = qBd;
      }

      if (qPrev !== null) {
        const dt = ti - tPrev;
        Np += 0.5 * (qPrev + qi_) * dt;
        const tMid = 0.5 * (ti + tPrev);
        NpDisc += 0.5 * (qPrev + qi_) * dt * Math.exp(-DISC * tMid);
      }
      pavg = p.pi - Np / stbPerPsi;

      t.push(ti);
      q.push(qi_);
      np.push(Np);
      if (qi === null && ti >= 1) qi = qi_; // "initial" rate at ~1 day

      if (tEcon === null && qi_ <= p.qEcon && i > 2) {
        tEcon = ti;
        eurDisc = NpDisc;
      }

      tPrev = ti;
      qPrev = qi_;
      if (tEcon !== null && qi_ < 0.2 * p.qEcon) break; // a bit past limit, then stop
    }

    // EUR = cumulative at economic limit (or end of horizon)
    let eur = Np;
    if (tEcon !== null) {
      for (let i = 0; i < t.length; i++) {
        if (t[i] >= tEcon) { eur = np[i]; break; }
      }
    }

    return {
      t, q, np,
      meta: {
        J, tPssDays, tSwitch, qi,
        tEcon, eur,
        eurDisc: eurDisc !== null ? eurDisc : NpDisc,
        ooip: (7758 * (A / 43560) * p.h * p.phi) / p.B, // stb (So=1 basis)
        error: null,
      },
    };
  };

  function emptyResult(msg) {
    return { t: [], q: [], np: [], meta: { error: msg } };
  }

  window.LOW = LOW;
})();
