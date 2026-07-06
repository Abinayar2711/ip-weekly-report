// Builds the Weekly Pulse report HTML from a stats object computed in Apps Script.
// Keep this file's visual design in sync with BO_Weekly_Report.html if that's edited by hand.

function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function barRow(row, maxPax) {
  const widthPct = maxPax > 0 ? Math.max(1, Math.round((row.pax / maxPax) * 100)) : 1;
  const emphClass = row.emphasis ? " emph" : "";
  return `
    <div class="bar-row${emphClass}">
      <div class="state-name">${esc(row.name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${widthPct}%"></div></div>
      <div class="meta">${esc(row.pax)} pax &nbsp;/&nbsp; ${esc(row.courses)} courses</div>
    </div>`;
}

function teacherRow(row) {
  const cls = row.top ? ' class="top"' : "";
  return `
      <tr${cls}>
        <td><span class="rank">${esc(row.rank)}</span>${esc(row.name)}</td>
        <td><span class="city-tag">${esc(row.city)}</span></td>
        <td class="num">${esc(row.leads)}</td>
        <td class="num">${esc(row.courses)}</td>
        <td class="num">${esc(row.participants)}</td>
      </tr>`;
}

function buildReportHtml(stats) {
  const maxPax = Math.max(...stats.states.map(s => s.pax), 1);
  const deltaDir = stats.leadsThisWeek < stats.leadsLastWeek ? "down" : "up";
  const deltaArrow = deltaDir === "down" ? "&#9660;" : "&#9650;";
  const deltaPct = stats.leadsLastWeek > 0
    ? Math.round(Math.abs(stats.leadsThisWeek - stats.leadsLastWeek) / stats.leadsLastWeek * 100)
    : 0;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IP School Program — Weekly Pulse</title>
<style>
  :root {
    --surface-1:      #fffefb;
    --page-plane:     #eeeae2;
    --text-primary:   #1c1a17;
    --text-secondary: #5b564c;
    --text-muted:     #918c7f;
    --gridline:       #e6e1d6;
    --baseline:       #cfc9ba;
    --border:         rgba(28,26,23,0.08);
    --series-1:       #1e4d8c;
    --series-1-soft:  #e3ecf7;
    --bar-track:      #ede9de;
    --good:           #0ca30c;
    --critical:       #b23a3a;
    --serif:          ui-serif, Georgia, "Times New Roman", serif;
    --sans:           system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: radial-gradient(circle at 15% 0%, #f5f1e8 0%, #eeeae2 55%, #e8e3d7 100%);
    font-family: var(--sans);
    color: var(--text-primary);
  }
  body { padding: 40px 0; }
  .slide {
    width: 1080px;
    margin: 0 auto;
    background: var(--surface-1);
    padding: 52px 60px 46px;
    position: relative;
    border-radius: 18px;
    box-shadow: 0 30px 70px rgba(28,26,23,0.10), 0 2px 6px rgba(28,26,23,0.05);
    border: 1px solid rgba(28,26,23,0.05);
  }
  .slide::before {
    content: "";
    position: absolute;
    top: 0; left: 60px; right: 60px;
    height: 3px;
    background: linear-gradient(90deg, var(--series-1) 0%, #c8933f 100%);
    border-radius: 0 0 3px 3px;
  }
  .header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .header-text { flex: 1; }
  .mascot { flex-shrink: 0; margin-top: -6px; }
  .eyebrow {
    font-size: 13px; font-weight: 600; color: var(--series-1);
    letter-spacing: 0.09em; text-transform: uppercase; margin: 0 0 10px;
    display: flex; align-items: center; gap: 8px;
  }
  h1 { font-family: var(--serif); font-size: 46px; font-weight: 600; margin: 0 0 10px; letter-spacing: -0.01em; color: #14110f; }
  .subtitle { font-size: 16.5px; color: var(--text-secondary); margin: 0 0 34px; font-style: italic; }
  .subtitle b { color: var(--text-primary); font-style: normal; }

  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
  .kpi {
    background: linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%);
    border: 1px solid var(--border); border-radius: 12px; padding: 20px 20px 18px;
    box-shadow: 0 1px 3px rgba(28,26,23,0.04);
  }
  .kpi .label { font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 10px; }
  .kpi .value { font-size: 40px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
  .kpi .delta { margin-top: 10px; font-size: 14px; font-weight: 600; }
  .kpi .delta.down { color: var(--critical); }
  .kpi .delta.up { color: var(--good); }
  .kpi .sub { margin-top: 10px; font-size: 13px; color: var(--text-muted); }

  .section-title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-primary); margin: 0 0 4px; }
  .section-sub { font-size: 14px; color: var(--text-muted); margin: 0 0 18px; }

  .chart-block { margin-bottom: 34px; }
  .bar-row { display: grid; grid-template-columns: 150px 1fr 150px; align-items: center; gap: 12px; margin-bottom: 10px; }
  .bar-header { display: grid; grid-template-columns: 150px 1fr 150px; gap: 12px; margin-bottom: 8px; }
  .bar-header .col-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
  .bar-header .col-label.right { text-align: right; }
  .bar-row .state-name { font-size: 15px; font-weight: 600; color: var(--text-primary); text-align: right; }
  .bar-row.emph .state-name { color: var(--series-1); }
  .bar-track { background: var(--bar-track); border-radius: 6px; height: 26px; position: relative; overflow: hidden; }
  .bar-fill { background: var(--baseline); height: 100%; border-radius: 6px 4px 4px 6px; }
  .bar-row.emph .bar-fill { background: var(--series-1); }
  .bar-row .meta { font-size: 13px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .bar-row.emph .meta { color: var(--text-secondary); font-weight: 600; }

  .insight-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .insight-card {
    background: linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%);
    border: 1px solid var(--border); border-radius: 12px; padding: 24px 26px;
    box-shadow: 0 1px 3px rgba(28,26,23,0.04);
  }
  .insight-card .tag {
    display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    color: var(--series-1); background: var(--series-1-soft); border-radius: 6px; padding: 4px 10px; margin-bottom: 12px;
  }
  .insight-card h3 { font-family: var(--serif); font-weight: 600; font-size: 23px; margin: 0 0 6px; }
  .insight-card .stat-line { font-size: 15px; color: var(--text-secondary); margin: 0 0 10px; font-variant-numeric: tabular-nums; }
  .insight-card .why { font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin: 0; }
  .insight-card .why b { color: var(--text-primary); }

  .table-block { margin-bottom: 28px; }
  table.teacher-table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
  table.teacher-table th {
    text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    color: var(--text-muted); padding: 0 10px 8px 0; border-bottom: 1px solid var(--gridline);
  }
  table.teacher-table th.num, table.teacher-table td.num { text-align: right; }
  table.teacher-table td { padding: 12px 10px 12px 0; border-bottom: 1px solid var(--gridline); vertical-align: top; }
  table.teacher-table td.num { font-variant-numeric: tabular-nums; font-weight: 600; }
  table.teacher-table tr.top td { background: var(--series-1-soft); }
  table.teacher-table tr.top td:first-child { border-radius: 8px 0 0 8px; }
  table.teacher-table tr.top td:last-child { border-radius: 0 8px 8px 0; }
  table.teacher-table .rank { display: inline-block; width: 20px; color: var(--text-muted); font-weight: 700; }
  table.teacher-table tr.top .rank { color: var(--series-1); }
  table.teacher-table .city-tag { font-size: 12.5px; color: var(--text-muted); }
  .table-note { font-size: 13px; color: var(--text-muted); margin: 10px 0 0; }

  .continuity-block {
    background: linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%);
    border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px;
    box-shadow: 0 1px 3px rgba(28,26,23,0.04); margin-bottom: 28px;
  }
  .continuity-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; align-items: center; }
  .continuity-cell .label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); margin-bottom: 6px; }
  .continuity-cell .figures { font-size: 15px; color: var(--text-primary); font-variant-numeric: tabular-nums; }
  .continuity-cell.total .figures { font-weight: 700; color: var(--series-1); }
  .continuity-note { font-size: 12.5px; color: var(--text-muted); margin: 12px 0 0; }

  footer { border-top: 1px solid var(--gridline); padding-top: 16px; font-size: 12.5px; color: var(--text-muted); line-height: 1.6; }
</style>
</head>
<body>
<div class="slide">

  <div class="header-row">
    <div class="header-text">
      <p class="eyebrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="9" width="18" height="6" rx="3" fill="#2a78d6"/><circle cx="3" cy="12" r="3" fill="#2a78d6"/><circle cx="21" cy="12" r="3" fill="#2a78d6"/></svg>
        IP Kids / Teens / Junior School — Lead &amp; Enrollment CRM
      </p>
      <h1>Weekly Pulse</h1>
      <p class="subtitle">${esc(stats.totalLeads)} tracked leads, created <b>${esc(stats.dateRangeStart)} – ${esc(stats.dateRangeEnd)}</b> &nbsp;·&nbsp; Report prepared <b>${esc(stats.reportDate)}</b></p>
    </div>
    <div class="mascot">
      <svg width="120" height="120" viewBox="0 0 200 200">
        <g stroke="#eda100" stroke-width="6" stroke-linecap="round" opacity="0.8">
          <line x1="100" y1="8" x2="100" y2="26"/>
          <line x1="34" y1="34" x2="47" y2="47"/>
          <line x1="166" y1="34" x2="153" y2="47"/>
          <line x1="14" y1="100" x2="30" y2="100"/>
          <line x1="186" y1="100" x2="170" y2="100"/>
        </g>
        <circle cx="100" cy="30" r="5" fill="#eda100"/>
        <circle cx="100" cy="112" r="72" fill="#ffd39b"/>
        <circle cx="32" cy="112" r="13" fill="#ffd39b"/>
        <circle cx="168" cy="112" r="13" fill="#ffd39b"/>
        <path d="M32,82 Q100,15 168,82 L168,64 Q100,-6 32,64 Z" fill="#3a2c22"/>
        <circle cx="60" cy="140" r="9" fill="#f0837a" opacity="0.55"/>
        <circle cx="140" cy="140" r="9" fill="#f0837a" opacity="0.55"/>
        <path d="M78,158 Q100,174 122,158" stroke="#3a2c22" stroke-width="6" fill="none" stroke-linecap="round"/>
        <rect x="26" y="98" width="148" height="28" rx="14" fill="#2a78d6"/>
        <circle cx="174" cy="112" r="11" fill="#2a78d6"/>
        <path d="M174,112 l17,-9 M174,112 l17,9" stroke="#2a78d6" stroke-width="9" stroke-linecap="round"/>
      </svg>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi">
      <div class="label">Leads Tapped — This Week</div>
      <div class="value">${esc(stats.leadsThisWeek)}</div>
      <div class="delta ${deltaDir}">${deltaArrow} ${deltaPct}% vs last week</div>
      <div class="sub">${esc(stats.thisWeekRange)}</div>
    </div>
    <div class="kpi">
      <div class="label">Leads Tapped — Last Week</div>
      <div class="value">${esc(stats.leadsLastWeek)}</div>
      <div class="sub">${esc(stats.lastWeekRange)}</div>
    </div>
    <div class="kpi">
      <div class="label">Total Courses Reached</div>
      <div class="value">${esc(stats.totalCourses)}</div>
      <div class="sub">across ${esc(stats.enrolledCount)} of ${esc(stats.totalLeads)} tracked leads</div>
    </div>
    <div class="kpi">
      <div class="label">Total Participants Reached</div>
      <div class="value">${esc(stats.totalParticipants)}</div>
      <div class="sub">${esc(stats.conversionRate)}% lead → enrollment conversion</div>
    </div>
  </div>

  <div class="chart-block">
    <p class="section-title">Participants Reached by State</p>
    <p class="section-sub">Bar length = participants reached. All ${esc(stats.totalParticipants)} tracked participants sit in ${esc(stats.states.length)} states.</p>
    <div class="bar-header">
      <div></div>
      <div class="col-label">PARTICIPANTS (bar length)</div>
      <div class="col-label right">PARTICIPANTS &nbsp;/&nbsp; COURSES</div>
    </div>
    ${stats.states.map(s => barRow(s, maxPax)).join("")}
  </div>

  <div class="insight-row">
    <div class="insight-card">
      <span class="tag">Highest Performing State</span>
      <h3>${esc(stats.highlightState.name)}</h3>
      <p class="stat-line">${esc(stats.highlightState.participants)} participants · ${esc(stats.highlightState.courses)} courses · ${esc(stats.highlightState.leads)} leads tracked</p>
      <p class="why">${stats.highlightState.why}</p>
    </div>
    <div class="insight-card">
      <span class="tag">Best Performing City</span>
      <h3>${esc(stats.highlightCity.name)}</h3>
      <p class="stat-line">${esc(stats.highlightCity.participants)} participants · ${esc(stats.highlightCity.courses)} courses · ${esc(stats.highlightCity.leads)} leads tracked</p>
      <p class="why">${stats.highlightCity.why}</p>
    </div>
  </div>

  <div class="table-block">
    <p class="section-title">Top Performing Teachers / Teams</p>
    <p class="section-sub">Ranked by participants reached.</p>
    <table class="teacher-table">
      <tr>
        <th>Teacher / Team</th>
        <th>City</th>
        <th class="num">Leads</th>
        <th class="num">Courses</th>
        <th class="num">Participants</th>
      </tr>
      ${stats.teachers.map(teacherRow).join("")}
    </table>
    ${stats.teacherNote ? `<p class="table-note">${stats.teacherNote}</p>` : ""}
  </div>

  ${stats.continuity ? `
  <div class="continuity-block">
    <p class="section-title">Program Continuity</p>
    <p class="section-sub">Activity from before this tracker began, so the numbers above read as a slice, not the whole story.</p>
    <div class="continuity-row">
      <div class="continuity-cell">
        <div class="label">Before ${esc(stats.continuity.cutoffLabel)}</div>
        <div class="figures">${esc(stats.continuity.preLeads)} leads · ${esc(stats.continuity.preCourses)} courses · ${esc(stats.continuity.prePax)} pax</div>
      </div>
      <div class="continuity-cell">
        <div class="label">Currently Tracked</div>
        <div class="figures">${esc(stats.totalLeads)} leads · ${esc(stats.totalCourses)} courses · ${esc(stats.totalParticipants)} pax</div>
      </div>
      <div class="continuity-cell total">
        <div class="label">Combined Total</div>
        <div class="figures">${esc(stats.continuity.preLeads + stats.totalLeads)} leads · ${esc(stats.continuity.preCourses + stats.totalCourses)} courses · ${esc(stats.continuity.prePax + stats.totalParticipants)} pax</div>
      </div>
    </div>
  </div>` : ""}

  <footer>${stats.footerNote}</footer>

</div>
</body>
</html>`;
}

module.exports = { buildReportHtml };
