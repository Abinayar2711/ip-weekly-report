const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { buildReportHtml } = require("./render-template");
const { buildTrendsReportHtml } = require("./render-template-trends");

const mode = process.argv[2]; // "render" or "send"

const REPORTS = [
  {
    key: "pulse",
    statsEnv: "STATS_JSON",
    buildHtml: buildReportHtml,
    filenamePrefix: "weekly-pulse",
    caption: "IP School Program — Weekly Pulse"
  },
  {
    key: "trends",
    statsEnv: "TRENDS_JSON",
    buildHtml: buildTrendsReportHtml,
    filenamePrefix: "trends-course-mix",
    caption: "IP School Program — Trends & Course Mix"
  }
];

async function renderOne(browser, report) {
  const stats = JSON.parse(process.env[report.statsEnv]);
  const html = report.buildHtml(stats);

  const page = await browser.newPage({ viewport: { width: 1080, height: 800 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  const buffer = await page.screenshot({ fullPage: true });
  await page.close();

  const filename = `${report.filenamePrefix}-${process.env.GITHUB_RUN_ID}.png`;
  fs.writeFileSync(path.join("reports", filename), buffer);
  console.log("Wrote reports/" + filename);
  return filename;
}

async function render() {
  fs.mkdirSync("reports", { recursive: true });
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  const filenames = {};
  for (const report of REPORTS) {
    filenames[report.key] = await renderOne(browser, report);
  }
  await browser.close();

  fs.writeFileSync(path.join("reports", ".last-filenames.json"), JSON.stringify(filenames));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendOne(filename, caption) {
  const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
  const branch = process.env.GITHUB_REF_NAME || "main";
  const imageUrl = `https://raw.githubusercontent.com/${repo}/${branch}/reports/${filename}`;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    From: from,
    To: to,
    MediaUrl: imageUrl,
    Body: caption
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error("Twilio send failed: " + JSON.stringify(result));
  }
  console.log("WhatsApp message sent. SID:", result.sid, "Image URL:", imageUrl);
}

async function send() {
  const filenames = JSON.parse(fs.readFileSync(path.join("reports", ".last-filenames.json"), "utf8"));

  // Small buffer for raw.githubusercontent.com to reflect the just-pushed commit.
  await sleep(5000);

  for (const report of REPORTS) {
    await sendOne(filenames[report.key], report.caption);
  }
}

(async () => {
  try {
    if (mode === "render") await render();
    else if (mode === "send") await send();
    else {
      console.error("Usage: node render-and-send.js [render|send]");
      process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
