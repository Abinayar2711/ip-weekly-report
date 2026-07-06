// Companion "Trends & Course Mix" report — month-by-month and week-by-week
// growth (leads/courses/pax) plus a course-type share donut. Same design
// tokens as render-template.js (BO Weekly Pulse) for visual consistency.

function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- Mini bar-panel (monthly) ----
function miniBarPanel(title, unit, items, key, color) {
  const max = Math.max(...items.map(d => d[key]), 1);
  const barW = 46;
  const gap = 18;
  const chartW = items.length * (barW + gap) - gap;
  const chartH = 110;
  const padTop = 22; // room for the value label above the tallest bar
  const bars = items.map((d, i) => {
    const h = max > 0 ? Math.round((d[key] / max) * chartH) : 0;
    const x = i * (barW + gap);
    const y = padTop + (chartH - h);
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${color}"/>
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="13" font-weight="700" fill="#1c1a17">${esc(d[key])}</text>
      <text x="${x + barW / 2}" y="${padTop + chartH + 20}" text-anchor="middle" font-size="11" fill="#918c7f">${esc(d.label.split(" ")[0])}</text>
    `;
  }).join("");

  return `
    <div class="trend-panel">
      <p class="panel-title">${esc(title)}</p>
      <svg width="100%" viewBox="0 0 ${chartW} ${padTop + chartH + 34}" preserveAspectRatio="xMidYMax meet">
        ${bars}
      </svg>
    </div>`;
}

// ---- Mini line chart (weekly trend) ----
function lineChart(title, items, key, color) {
  const w = 960, h = 110, padTop = 22, padBottom = 24, padX = 4;
  const max = Math.max(...items.map(d => d[key]), 1);
  const stepX = (w - padX * 2) / (items.length - 1);

  const points = items.map((d, i) => {
    const x = padX + i * stepX;
    const y = padTop + (1 - (max > 0 ? d[key] / max : 0)) * (h - padTop - padBottom);
    return { x, y, v: d[key] };
  });

  const path = points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const areaPath = path + ` L${points[points.length - 1].x.toFixed(1)},${h - padBottom} L${points[0].x.toFixed(1)},${h - padBottom} Z`;

  // Label first, last, and max point only -- avoid clutter across 20+ points
  const maxIdx = items.reduce((best, d, i) => (d[key] > items[best][key] ? i : best), 0);
  const labelIdxs = new Set([0, items.length - 1, maxIdx]);

  function edgeAnchor(i) {
    if (i === 0) return "start";
    if (i === items.length - 1) return "end";
    return "middle";
  }

  const dots = points.map((p, i) => {
    if (!labelIdxs.has(i)) return "";
    return `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}" stroke="#fffefb" stroke-width="2"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="${edgeAnchor(i)}" font-size="12" font-weight="700" fill="#1c1a17">${esc(p.v)}</text>
    `;
  }).join("");

  const xLabels = items.map((d, i) => {
    if (i % 4 !== 0 && i !== items.length - 1) return "";
    const x = padX + i * stepX;
    return `<text x="${x.toFixed(1)}" y="${h - 4}" text-anchor="${edgeAnchor(i)}" font-size="10.5" fill="#918c7f">${esc(d.label)}</text>`;
  }).join("");

  return `
    <div class="trend-panel">
      <p class="panel-title">${esc(title)}</p>
      <svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax meet">
        <line x1="${padX}" y1="${h - padBottom}" x2="${w - padX}" y2="${h - padBottom}" stroke="#e6e1d6" stroke-width="1"/>
        <path d="${areaPath}" fill="${color}" opacity="0.08"/>
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5"/>
        ${dots}
        ${xLabels}
      </svg>
    </div>`;
}

// ---- Donut chart (course type mix) ----
function donutChart(items, colors) {
  const total = items.reduce((s, d) => s + d.pax, 0);
  const cx = 110, cy = 110, r = 82, stroke = 34;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = items.map((d, i) => {
    const frac = total > 0 ? d.pax / total : 0;
    const len = frac * circumference;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i % colors.length]}"
      stroke-width="${stroke}" stroke-dasharray="${len.toFixed(1)} ${(circumference - len).toFixed(1)}"
      stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
    return seg;
  }).join("");

  const legend = items.map((d, i) => {
    const pct = total > 0 ? Math.round((d.pax / total) * 100) : 0;
    return `
      <div class="legend-row">
        <span class="swatch" style="background:${colors[i % colors.length]}"></span>
        <span class="legend-name">${esc(d.name)}</span>
        <span class="legend-value">${esc(d.pax)} pax &nbsp;·&nbsp; ${pct}%</span>
      </div>`;
  }).join("");

  return `
    <div class="donut-row">
      <svg width="220" height="220" viewBox="0 0 220 220">
        ${segments}
        <text x="110" y="104" text-anchor="middle" font-size="30" font-weight="700" fill="#1c1a17">${esc(total)}</text>
        <text x="110" y="126" text-anchor="middle" font-size="12" fill="#918c7f" letter-spacing="0.03em">TOTAL PAX</text>
      </svg>
      <div class="legend">${legend}</div>
    </div>`;
}

function buildTrendsReportHtml(stats) {
  const CATEGORICAL = ["#1e4d8c", "#1baf7a", "#eda100", "#4a3aa7"];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IP School Program — Trends &amp; Course Mix</title>
<style>
  :root {
    --surface-1: #fffefb; --page-plane: #eeeae2;
    --text-primary: #1c1a17; --text-secondary: #5b564c; --text-muted: #918c7f;
    --gridline: #e6e1d6; --border: rgba(28,26,23,0.08);
    --series-1: #1e4d8c; --series-1-soft: #e3ecf7;
    --serif: ui-serif, Georgia, "Times New Roman", serif;
    --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: radial-gradient(circle at 15% 0%, #f5f1e8 0%, #eeeae2 55%, #e8e3d7 100%);
    font-family: var(--sans); color: var(--text-primary);
  }
  body { padding: 40px 0; }
  .slide {
    width: 1080px; margin: 0 auto; background: var(--surface-1);
    padding: 52px 60px 46px; position: relative; border-radius: 18px;
    box-shadow: 0 30px 70px rgba(28,26,23,0.10), 0 2px 6px rgba(28,26,23,0.05);
    border: 1px solid rgba(28,26,23,0.05);
  }
  .slide::before {
    content: ""; position: absolute; top: 0; left: 60px; right: 60px; height: 3px;
    background: linear-gradient(90deg, var(--series-1) 0%, #c8933f 100%); border-radius: 0 0 3px 3px;
  }
  .eyebrow {
    font-size: 13px; font-weight: 600; color: var(--series-1); letter-spacing: 0.09em;
    text-transform: uppercase; margin: 0 0 10px;
  }
  h1 { font-family: var(--serif); font-size: 40px; font-weight: 600; margin: 0 0 10px; color: #14110f; }
  .subtitle { font-size: 16px; color: var(--text-secondary); margin: 0 0 30px; font-style: italic; }
  .subtitle b { color: var(--text-primary); font-style: normal; }

  .section-title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; margin: 0 0 4px; }
  .section-sub { font-size: 13.5px; color: var(--text-muted); margin: 0 0 16px; }

  .panel-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
  .trend-panel {
    background: linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%);
    border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px 14px;
    box-shadow: 0 1px 3px rgba(28,26,23,0.04);
  }
  .panel-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.02em; }

  .stack { display: flex; flex-direction: column; gap: 14px; margin-bottom: 30px; }

  .donut-section {
    background: linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%);
    border: 1px solid var(--border); border-radius: 12px; padding: 24px 26px;
    box-shadow: 0 1px 3px rgba(28,26,23,0.04); margin-bottom: 10px;
  }
  .donut-row { display: flex; align-items: center; gap: 34px; }
  .legend { flex: 1; display: flex; flex-direction: column; gap: 12px; }
  .legend-row { display: flex; align-items: center; gap: 10px; font-size: 14.5px; }
  .swatch { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
  .legend-name { flex: 1; color: var(--text-primary); font-weight: 500; }
  .legend-value { color: var(--text-secondary); font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }

  footer { border-top: 1px solid var(--gridline); padding-top: 16px; font-size: 12.5px; color: var(--text-muted); line-height: 1.6; margin-top: 6px; }
</style>
</head>
<body>
<div class="slide">

  <p class="eyebrow">IP Kids / Teens / Junior School — Lead &amp; Enrollment CRM</p>
  <h1>Trends &amp; Course Mix</h1>
  <p class="subtitle">Companion to the Weekly Pulse &nbsp;·&nbsp; ${esc(stats.totalLeads)} tracked leads, ${esc(stats.dateRangeStart)} – ${esc(stats.dateRangeEnd)}</p>

  <p class="section-title">Month-by-Month Growth</p>
  <p class="section-sub">Leads created, courses run, and participants reached — by calendar month.</p>
  <div class="panel-row">
    ${miniBarPanel("Leads", "", stats.monthly, "leads", "#1e4d8c")}
    ${miniBarPanel("Courses", "", stats.monthly, "courses", "#1baf7a")}
    ${miniBarPanel("Participants", "", stats.monthly, "pax", "#eda100")}
  </div>

  <p class="section-title">Week-by-Week Trend</p>
  <p class="section-sub">Same three metrics, by week — labeled at first, last, and peak week.</p>
  <div class="stack">
    ${lineChart("Leads / week", stats.weekly, "leads", "#1e4d8c")}
    ${lineChart("Courses / week", stats.weekly, "courses", "#1baf7a")}
    ${lineChart("Participants / week", stats.weekly, "pax", "#eda100")}
  </div>

  <p class="section-title">Course Type Mix</p>
  <p class="section-sub">Share of participants by course type (leads spanning multiple types are split proportionally).</p>
  <div class="donut-section">
    ${donutChart(stats.courseTypes, CATEGORICAL)}
  </div>

  <footer>${stats.footerNote}</footer>

</div>
</body>
</html>`;
}

module.exports = { buildTrendsReportHtml };
