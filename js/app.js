/* App wiring: state, sliders, tabs, charts. */
(function () {
  "use strict";

  /* ================= state ================= */
  const state = {
    // completion geometry
    h: 100, b: 0.5, rw: 0.35, kvkh: 0.1,
    placement: "center", h1frac: 0.25,
    // reservoir / PI
    k: 10, mu: 1.0, B: 1.2, re: 2000, sd: 0,
    // life of well
    phi: 0.2, ct: 1e-5, pi: 5000, pwf: 2000, qEcon: 10,
    lowCorr: "papatzacos",
  };

  const PALETTE = ["#1565c0", "#e65100", "#2e7d32", "#c62828", "#6a1b9a",
                   "#00838f", "#ad1457", "#b58900", "#3949ab"];
  const colorOf = {};
  CORR.list.forEach((c, i) => (colorOf[c.key] = PALETTE[i % PALETTE.length]));

  /* ================= helpers ================= */
  const $ = (id) => document.getElementById(id);

  function fmt(x, d = 2) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    if (Math.abs(x) >= 1e6) return (x / 1e6).toFixed(d) + "M";
    if (Math.abs(x) >= 1e4) return Math.round(x).toLocaleString();
    return x.toFixed(d);
  }

  function fmtTimeDays(d) {
    if (d === null || !isFinite(d)) return "—";
    if (d < 60) return d.toFixed(1) + " days";
    if (d < 730) return (d / 30.4375).toFixed(1) + " months";
    return (d / 365.25) + "" === "" ? "" : (d / 365.25).toFixed(1) + " years";
  }

  /* ---------------- slider factory ----------------
   * A state key may have several slider instances (one per tab); the
   * registry keeps them in sync when any one of them moves.
   */
  const sliderRegistry = {};

  function syncSliders(key) {
    for (const s of sliderRegistry[key] || []) {
      s.input.value = s.def.log ? Math.log10(state[key]) : state[key];
      s.show();
    }
  }

  function makeSlider(container, def) {
    const row = document.createElement("div");
    row.className = "slider-row";
    const lbl = document.createElement("div");
    lbl.className = "lbl";
    const label = document.createElement("label");
    label.innerHTML = def.label + (def.unit ? ` <small>(${def.unit})</small>` : "");
    const val = document.createElement("span");
    val.className = "val";
    lbl.appendChild(label);
    lbl.appendChild(val);

    const input = document.createElement("input");
    input.type = "range";
    if (def.log) {
      input.min = Math.log10(def.min);
      input.max = Math.log10(def.max);
      input.step = def.step || 0.01;
      input.value = Math.log10(state[def.key]);
    } else {
      input.min = def.min;
      input.max = def.max;
      input.step = def.step || 1;
      input.value = state[def.key];
    }

    const show = () => {
      const v = state[def.key];
      val.textContent = def.fmt ? def.fmt(v) : fmt(v, def.digits ?? 2);
    };
    show();

    input.addEventListener("input", () => {
      state[def.key] = def.log
        ? Math.pow(10, parseFloat(input.value))
        : parseFloat(input.value);
      syncSliders(def.key);
      scheduleUpdate();
    });

    row.appendChild(lbl);
    row.appendChild(input);
    container.appendChild(row);
    const entry = { input, show, def };
    (sliderRegistry[def.key] = sliderRegistry[def.key] || []).push(entry);
    return entry;
  }

  /* ================= slider definitions ================= */
  const geoDefs = [
    { key: "h", label: "Formation thickness h", unit: "ft", min: 10, max: 500, step: 5, digits: 0 },
    { key: "b", label: "Penetration fraction b = h<sub>p</sub>/h", min: 0.05, max: 1, step: 0.01 },
    { key: "rw", label: "Wellbore radius r<sub>w</sub>", unit: "ft", min: 0.15, max: 1.0, step: 0.005, digits: 3 },
    { key: "kvkh", label: "Anisotropy k<sub>v</sub>/k<sub>h</sub>", min: 0.001, max: 1, log: true, fmt: (v) => v < 0.01 ? v.toExponential(1) : v.toFixed(3) },
  ];
  const resDefs = [
    { key: "k", label: "Permeability k", unit: "md", min: 0.1, max: 2000, log: true, fmt: (v) => v < 1 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0) },
    { key: "mu", label: "Oil viscosity μ", unit: "cp", min: 0.1, max: 20, step: 0.1, digits: 1 },
    { key: "B", label: "Formation volume factor B<sub>o</sub>", unit: "rb/stb", min: 1.0, max: 2.0, step: 0.01 },
  ];
  const reDef = { key: "re", label: "Drainage radius r<sub>e</sub>", unit: "ft", min: 500, max: 10000, step: 100, digits: 0 };
  const sdDef = { key: "sd", label: "Damage skin s<sub>d</sub> (over open interval)", min: 0, max: 30, step: 0.5, digits: 1 };
  const h1Def = { key: "h1frac", label: "Standoff from top h<sub>1</sub>/h", min: 0, max: 0.95, step: 0.01 };
  const lowResDefs = [
    { key: "phi", label: "Porosity φ", min: 0.05, max: 0.35, step: 0.005, digits: 3 },
    { key: "ct", label: "Total compressibility c<sub>t</sub>", unit: "1/psi", min: 1e-6, max: 5e-5, log: true, fmt: (v) => v.toExponential(1) },
  ];
  const lowPressDefs = [
    { key: "pi", label: "Initial pressure p<sub>i</sub>", unit: "psia", min: 1000, max: 10000, step: 50, digits: 0 },
    { key: "pwf", label: "Flowing BHP p<sub>wf</sub>", unit: "psia", min: 100, max: 8000, step: 25, digits: 0 },
    { key: "qEcon", label: "Economic limit rate", unit: "stb/d", min: 1, max: 100, step: 1, digits: 0 },
  ];

  /* ================= computed quantities ================= */
  function corrParams(bOverride) {
    return {
      h: state.h,
      b: bOverride ?? state.b,
      rw: state.rw,
      kvkh: state.kvkh,
      placement: state.placement,
      h1frac: state.h1frac,
      re: state.re,
    };
  }

  function pssDenom0() {
    return Math.log(state.re / state.rw) - 0.75;
  }

  // total skin combining pseudoskin with damage over the open interval
  // (Saidikowski): st = sp + (h/hp) * sd
  function totalSkin(sp, b) {
    if (sp === null) return null;
    return sp + state.sd / b;
  }

  function pssJ(s) {
    const denom = pssDenom0() + s;
    if (denom <= 0) return null;
    return (state.k * state.h) / (141.2 * state.mu * state.B * denom);
  }

  /* ================= tab 1: skin & PI ================= */
  let charts = {};

  function chartDefaults() {
    Chart.defaults.color = "#5b6877";
    Chart.defaults.borderColor = "#d8dce2";
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 11.5;
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.boxHeight = 2;
    Chart.defaults.animation = false;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.line.borderWidth = 2;
  }

  function buildSkinCharts() {
    charts.spVsB = new Chart($("chart-sp-vs-b"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { type: "linear", min: 0, max: 1, title: { display: true, text: "penetration fraction b = hp/h" } },
          y: { title: { display: true, text: "pseudoskin  sp" }, beginAtZero: true },
        },
        plugins: { tooltip: { mode: "nearest", intersect: false } },
      },
    });
    charts.pirVsB = new Chart($("chart-pir-vs-b"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { type: "linear", min: 0, max: 1, title: { display: true, text: "penetration fraction b = hp/h" } },
          y: { min: 0, max: 1, title: { display: true, text: "J / Jfull" } },
        },
      },
    });
    charts.dpiVsB = new Chart($("chart-dpi-vs-b"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { type: "linear", min: 0, max: 1, title: { display: true, text: "penetration fraction b = hp/h" } },
          y: { title: { display: true, text: "Δ(J/Jfull) per foot, %/ft" }, beginAtZero: true },
        },
        plugins: { tooltip: { mode: "nearest", intersect: false } },
      },
    });
    charts.spVsKvkh = new Chart($("chart-sp-vs-kvkh"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { type: "logarithmic", min: 0.0001, max: 1, title: { display: true, text: "kv/kh" } },
          y: { title: { display: true, text: "pseudoskin  sp" }, beginAtZero: true },
        },
      },
    });
  }

  function updateSkinTab() {
    const p = corrParams();
    const sps = CORR.evalAll(p);
    const vals = Object.values(sps).filter((v) => v !== null && isFinite(v));
    const spMean = vals.length ? vals.reduce((a, x) => a + x, 0) / vals.length : null;
    const spMin = vals.length ? Math.min(...vals) : null;
    const spMax = vals.length ? Math.max(...vals) : null;

    // ---- readouts ----
    const hDval = (state.h / state.rw) / Math.sqrt(state.kvkh);
    $("geo-readouts").innerHTML =
      `<span>h<sub>p</sub> = <b>${fmt(state.b * state.h, 1)} ft</b></span>` +
      `<span>h<sub>D</sub> = <b>${fmt(hDval, 0)}</b></span>`;

    // ---- cards ----
    const J0 = pssJ(state.sd); // fully penetrating, damaged
    const Jp = spMean !== null ? pssJ(totalSkin(spMean, state.b)) : null;
    const piLoss = J0 && Jp ? (1 - Jp / J0) * 100 : null;
    $("skin-cards").innerHTML = `
      <div class="card accent"><div class="name">Mean pseudoskin s<sub>p</sub></div>
        <div class="value">${fmt(spMean)}</div>
        <div class="sub">range ${fmt(spMin)} – ${fmt(spMax)}</div></div>
      <div class="card"><div class="name">Total skin s<sub>t</sub> = s<sub>p</sub> + (h/h<sub>p</sub>)s<sub>d</sub></div>
        <div class="value">${fmt(spMean !== null ? totalSkin(spMean, state.b) : null)}</div>
        <div class="sub">s<sub>d</sub> = ${fmt(state.sd, 1)} over open interval</div></div>
      <div class="card warn"><div class="name">PI, partial penetration</div>
        <div class="value">${fmt(Jp)}</div>
        <div class="sub">stb/d/psi (mean s<sub>p</sub>)</div></div>
      <div class="card ${piLoss !== null && piLoss > 30 ? "bad" : "good"}">
        <div class="name">PI loss vs full penetration</div>
        <div class="value">${fmt(piLoss, 1)}%</div>
        <div class="sub">J<sub>full</sub> = ${fmt(J0)} stb/d/psi</div></div>`;

    // ---- summary table ----
    let rows = `<tr><th>Correlation</th><th>s<sub>p</sub></th><th>s<sub>t</sub></th>
      <th>J (stb/d/psi)</th><th>J/J<sub>full</sub></th><th>PI loss</th></tr>`;
    for (const c of CORR.list) {
      const sp = sps[c.key];
      if (sp === null || !isFinite(sp)) {
        rows += `<tr><td>${c.name} (${c.year})</td><td class="na" colspan="5">not applicable at these settings</td></tr>`;
        continue;
      }
      const st = totalSkin(sp, state.b);
      const J = pssJ(st);
      const ratio = J0 && J ? J / J0 : null;
      rows += `<tr><td style="color:${colorOf[c.key]}">&#9632; ${c.name} (${c.year})</td>
        <td>${fmt(sp)}</td><td>${fmt(st)}</td><td>${fmt(J, 2)}</td>
        <td>${fmt(ratio, 3)}</td><td>${ratio ? fmt((1 - ratio) * 100, 1) + "%" : "—"}</td></tr>`;
    }
    $("summary-table").innerHTML = rows;

    // ---- chart: sp vs b ----
    const bGrid = [];
    for (let b = 0.05; b <= 0.999; b += 0.01) bGrid.push(b);
    bGrid.push(1);
    const dsSp = CORR.list.map((c) => ({
      label: `${c.name}`,
      borderColor: colorOf[c.key],
      data: bGrid
        .map((b) => {
          const v = c.fn(corrParams(b));
          return v === null || !isFinite(v) ? null : { x: b, y: v };
        })
        .filter(Boolean),
    }));
    // current-b marker
    dsSp.push({
      label: "current b",
      type: "scatter",
      data: vals.length ? [{ x: state.b, y: spMean }] : [],
      pointRadius: 5,
      pointStyle: "crossRot",
      borderColor: "#1f2733",
      backgroundColor: "#1f2733",
      pointBorderWidth: 2,
    });
    charts.spVsB.data.datasets = dsSp;
    charts.spVsB.update();

    // ---- chart: PI ratio vs b (includes damage scaling) ----
    charts.pirVsB.data.datasets = CORR.list.map((c) => ({
      label: c.name,
      borderColor: colorOf[c.key],
      data: bGrid
        .map((b) => {
          const sp = c.fn(corrParams(b));
          if (sp === null || !isFinite(sp)) return null;
          const J = pssJ(sp + state.sd / b);
          return J0 && J ? { x: b, y: J / J0 } : null;
        })
        .filter(Boolean),
    }));
    // bounding case: no pseudoskin, but only the completed thickness produces
    // (h = hp, no vertical crossflow) -> J proportional to hp, so J/Jfull = b
    charts.pirVsB.data.datasets.push({
      label: "h = hp, sp = 0 (no crossflow limit)",
      borderColor: "#7a8694",
      borderDash: [6, 4],
      data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    });
    charts.pirVsB.update();

    // ---- chart: marginal PI gain per foot drilled ----
    // d(J/Jfull)/dhp by central difference, with the interval growing down
    // from the top of the zone (drilling-ahead scenario => placement 'top').
    const ratioTop = (c, b) => {
      if (b <= 0 || b > 1) return null;
      const sp = c.fn({ ...corrParams(b), placement: "top" });
      if (sp === null || !isFinite(sp)) return null;
      const J = pssJ(sp + state.sd / b);
      const J0top = pssJ(state.sd);
      return J && J0top ? J / J0top : null;
    };
    const db = 0.01;
    charts.dpiVsB.data.datasets = CORR.list.map((c) => ({
      label: c.name,
      borderColor: colorOf[c.key],
      data: bGrid
        .map((b) => {
          const rPlus = ratioTop(c, Math.min(b + db, 1));
          const rMinus = ratioTop(c, b - db);
          if (rPlus === null || rMinus === null) return null;
          const dRdHp = (rPlus - rMinus) / ((Math.min(b + db, 1) - (b - db)) * state.h);
          return { x: b, y: dRdHp * 100 };
        })
        .filter(Boolean),
    }));
    charts.dpiVsB.update();

    // ---- chart: sp vs kv/kh ----
    const kGrid = [];
    for (let e = -4; e <= 0.001; e += 0.1) kGrid.push(Math.pow(10, e));
    charts.spVsKvkh.data.datasets = CORR.list.map((c) => ({
      label: c.name,
      borderColor: colorOf[c.key],
      data: kGrid
        .map((kv) => {
          const v = c.fn({ ...corrParams(), kvkh: kv });
          return v === null || !isFinite(v) ? null : { x: kv, y: v };
        })
        .filter(Boolean),
    }));
    charts.spVsKvkh.update();
  }

  /* ================= tab 2: life of well ================= */
  function buildLowCharts() {
    const timeScale = {
      type: "logarithmic",
      min: 0.01,
      title: { display: true, text: "time, days" },
      ticks: {
        callback: (v) => {
          const yr = v / 365.25;
          if (yr >= 1) return (yr >= 10 ? Math.round(yr) : +yr.toFixed(1)) + " yr";
          return v >= 1 ? +v.toFixed(0) + " d" : +v.toPrecision(1);
        },
      },
    };
    charts.rate = new Chart($("chart-rate"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { ...timeScale },
          y: { type: "logarithmic", title: { display: true, text: "oil rate, stb/d" } },
        },
        plugins: { tooltip: { mode: "nearest", intersect: false } },
      },
    });
    charts.cum = new Chart($("chart-cum"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { ...timeScale },
          y: { title: { display: true, text: "cumulative, Mstb" }, beginAtZero: true },
        },
      },
    });
    charts.eurVsB = new Chart($("chart-eur-vs-b"), {
      type: "line",
      data: { datasets: [] },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { type: "linear", min: 0, max: 1, title: { display: true, text: "penetration fraction b" } },
          y: { title: { display: true, text: "EUR, Mstb" }, beginAtZero: true },
          y2: {
            position: "right", min: 0, max: 100,
            grid: { drawOnChartArea: false },
            title: { display: true, text: "% of full-penetration EUR" },
          },
        },
      },
    });
  }

  function lowParams(s) {
    return {
      k: state.k, h: state.h, phi: state.phi, mu: state.mu, ct: state.ct,
      B: state.B, rw: state.rw, re: state.re,
      pi: state.pi, pwf: Math.min(state.pwf, state.pi - 50),
      s, qEcon: state.qEcon, tMaxYears: 50,
    };
  }

  function updateLowTab() {
    const corr = CORR.get(state.lowCorr);
    const sp = corr.fn(corrParams());
    const spOk = sp !== null && isFinite(sp);
    const stPartial = spOk ? totalSkin(sp, state.b) : null;

    $("low-skin-readout").innerHTML =
      `<span>s<sub>p</sub> = <b>${fmt(sp)}</b></span>` +
      `<span>s<sub>t</sub> = <b>${fmt(stPartial)}</b></span>` +
      `<span>b = <b>${fmt(state.b)}</b></span>`;

    if (!spOk) {
      $("low-cards").innerHTML =
        `<div class="card bad"><div class="name">Error</div><div class="value">n/a</div>
         <div class="sub">${corr.name} is not applicable at these settings</div></div>`;
      return;
    }

    const simPartial = LOW.simulate(lowParams(stPartial));
    const simFull = LOW.simulate(lowParams(state.sd));
    const simIdeal = LOW.simulate(lowParams(0));

    const mkDs = (sim, label, color, dash) => ({
      label,
      borderColor: color,
      borderDash: dash,
      data: sim.t.map((t, i) => ({ x: t, y: sim.q[i] })),
    });
    charts.rate.data.datasets = [
      mkDs(simPartial, `Partial (b=${state.b.toFixed(2)}, s=${fmt(stPartial, 1)})`, "#e65100"),
      mkDs(simFull, `Full penetration (s=${fmt(state.sd, 1)})`, "#1565c0"),
      mkDs(simIdeal, "Full, undamaged (s=0)", "#7a8694", [5, 4]),
      {
        label: "economic limit",
        borderColor: "#c62828",
        borderDash: [2, 3],
        borderWidth: 1,
        data: [{ x: 0.01, y: state.qEcon }, { x: 50 * 365.25, y: state.qEcon }],
      },
    ];
    charts.rate.update();

    charts.cum.data.datasets = [
      { label: "Partial", borderColor: "#e65100", data: simPartial.t.map((t, i) => ({ x: t, y: simPartial.np[i] / 1000 })) },
      { label: "Full penetration", borderColor: "#1565c0", data: simFull.t.map((t, i) => ({ x: t, y: simFull.np[i] / 1000 })) },
      { label: "Full, undamaged", borderColor: "#7a8694", borderDash: [5, 4], data: simIdeal.t.map((t, i) => ({ x: t, y: simIdeal.np[i] / 1000 })) },
    ];
    charts.cum.update();

    // ---- EUR vs b sweep ----
    const eurPts = [], discPts = [], pctPts = [];
    const eurFull = simFull.meta.eur;
    for (let b = 0.05; b <= 1.0001; b += 0.05) {
      const bb = Math.min(b, 1);
      const spb = corr.fn(corrParams(bb));
      if (spb === null || !isFinite(spb)) continue;
      const sim = LOW.simulate(lowParams(spb + state.sd / bb));
      if (sim.meta.error) continue;
      eurPts.push({ x: bb, y: sim.meta.eur / 1000 });
      discPts.push({ x: bb, y: sim.meta.eurDisc / 1000 });
      if (eurFull > 0) pctPts.push({ x: bb, y: (sim.meta.eur / eurFull) * 100 });
    }
    charts.eurVsB.data.datasets = [
      { label: `EUR (${corr.name})`, borderColor: "#e65100", data: eurPts, yAxisID: "y" },
      { label: "Discounted EUR (10%/yr)", borderColor: "#6a1b9a", borderDash: [5, 4], data: discPts, yAxisID: "y" },
      { label: "% of full-pen EUR", borderColor: "#1e8e4e", data: pctPts, yAxisID: "y2" },
    ];
    charts.eurVsB.update();

    // ---- cards ----
    const mp = simPartial.meta, mf = simFull.meta;
    const eurLoss = mf.eur > 0 ? (1 - mp.eur / mf.eur) * 100 : null;
    const discLoss = mf.eurDisc > 0 ? (1 - mp.eurDisc / mf.eurDisc) * 100 : null;
    $("low-cards").innerHTML = `
      <div class="card warn"><div class="name">Initial rate (partial)</div>
        <div class="value">${fmt(mp.qi, 0)}</div><div class="sub">stb/d @ 1 day &nbsp;|&nbsp; full: ${fmt(mf.qi, 0)}</div></div>
      <div class="card accent"><div class="name">EUR (partial)</div>
        <div class="value">${fmt(mp.eur / 1000, 0)}</div><div class="sub">Mstb &nbsp;|&nbsp; full: ${fmt(mf.eur / 1000, 0)} Mstb</div></div>
      <div class="card ${eurLoss > 15 ? "bad" : "good"}"><div class="name">EUR loss vs full pen.</div>
        <div class="value">${fmt(eurLoss, 1)}%</div><div class="sub">at ${fmt(state.qEcon, 0)} stb/d limit</div></div>
      <div class="card ${discLoss > 15 ? "bad" : "good"}"><div class="name">Discounted-EUR loss</div>
        <div class="value">${fmt(discLoss, 1)}%</div><div class="sub">10%/yr &mdash; value of delayed production</div></div>
      <div class="card"><div class="name">Life to econ. limit (partial)</div>
        <div class="value">${mp.tEcon ? fmt(mp.tEcon / 365.25, 1) : "&gt;50"}</div>
        <div class="sub">years &nbsp;|&nbsp; full: ${mf.tEcon ? fmt(mf.tEcon / 365.25, 1) + " yr" : "&gt;50 yr"}</div></div>
      <div class="card"><div class="name">Onset of boundary flow</div>
        <div class="value">${fmt(mp.tPssDays, 0)}</div><div class="sub">days (t<sub>DA</sub> = 0.1)</div></div>`;
  }

  /* ================= update scheduling ================= */
  let pending = null;
  function scheduleUpdate() {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      updateSkinTab();
      updateLowTab();
    });
  }

  /* ================= init ================= */
  function init() {
    chartDefaults();

    // sliders — Skin & PI tab
    geoDefs.forEach((d) => makeSlider($("geo-sliders"), d));
    resDefs.forEach((d) => makeSlider($("res-sliders"), d));
    [reDef, sdDef].forEach((d) => makeSlider($("pi-sliders"), d));

    // sliders — Life of Well tab (same state keys; registry keeps them in sync)
    geoDefs.concat([sdDef]).forEach((d) => makeSlider($("low-geo-sliders"), d));
    resDefs.concat([reDef]).concat(lowResDefs).forEach((d) => makeSlider($("low-res-sliders"), d));
    lowPressDefs.forEach((d) => makeSlider($("low-press-sliders"), d));

    // placement selects + h1 sliders, one pair per tab, kept in sync
    const placementBindings = [];
    const syncPlacement = () => {
      for (const pb of placementBindings) {
        pb.sel.value = state.placement;
        pb.h1c.style.display = state.placement === "custom" ? "" : "none";
      }
    };
    for (const [selId, h1Id] of [["placement", "h1-slider"], ["low-placement", "low-h1-slider"]]) {
      const sel = $(selId), h1c = $(h1Id);
      makeSlider(h1c, h1Def);
      placementBindings.push({ sel, h1c });
      sel.addEventListener("change", () => {
        state.placement = sel.value;
        syncPlacement();
        scheduleUpdate();
      });
    }
    syncPlacement();

    // rate-chart y-axis scale toggle
    $("rate-scale-toggle").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      $("rate-scale-toggle").querySelectorAll("button").forEach((b) =>
        b.classList.toggle("active", b === btn));
      const y = charts.rate.options.scales.y;
      y.type = btn.dataset.scale === "log" ? "logarithmic" : "linear";
      y.beginAtZero = y.type === "linear";
      charts.rate.update();
    });

    // correlation select for life-of-well
    const lowSel = $("low-corr");
    for (const c of CORR.list) {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = `${c.name} (${c.year})`;
      lowSel.appendChild(opt);
    }
    lowSel.value = state.lowCorr;
    lowSel.addEventListener("change", () => {
      state.lowCorr = lowSel.value;
      scheduleUpdate();
    });

    // tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        $("tab-" + btn.dataset.tab).classList.add("active");
        // charts sized while hidden need a resize kick
        Object.values(charts).forEach((c) => c.resize());
      });
    });

    // theory content
    if (window.THEORY) $("theory-content").innerHTML = window.THEORY.html();

    buildSkinCharts();
    buildLowCharts();
    updateSkinTab();
    updateLowTab();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
