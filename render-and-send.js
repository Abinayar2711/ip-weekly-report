const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { buildReportHtml } = require("./render-template");

const mode = process.argv[2]; // "render" or "send"

async function render() {
  const stats = JSON.parse(process.env.STATS_JSON);
  const html = buildReportHtml(stats);

  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 800 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  const buffer = await page.screenshot({ fullPage: true });
  await browser.close();

  fs.mkdirSync("reports", { recursive: true });
  const filename = `weekly-pulse-${process.env.GITHUB_RUN_ID}.png`;
  fs.writeFileSync(path.join("reports", filename), buffer);
  fs.writeFileSync(path.join("reports", ".last-filename"), filename);
  console.log("Wrote reports/" + filename);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function send() {
  const filename = fs.readFileSync(path.join("reports", ".last-filename"), "utf8").trim();
  const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
  const branch = process.env.GITHUB_REF_NAME || "main";
  const imageUrl = `https://raw.githubusercontent.com/${repo}/${branch}/reports/${filename}`;

  // Small buffer for raw.githubusercontent.com to reflect the just-pushed commit.
  await sleep(5000);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    From: from,
    To: to,
    MediaUrl: imageUrl,
    Body: "IP School Program — Weekly Pulse"
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
