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

const { execFileSync } = require("child_process");

const FREEIMAGE_KEY = process.env.FREEIMAGE_KEY || "6d207e02198a847aa98d0a2a901485a5";

async function uploadImage(filePath) {
  // Shells out to curl rather than Node's fetch+FormData: freeimage.host's
  // PHP backend rejects undici's multipart encoding (400 "Internal upload
  // error") but accepts curl's -F multipart fine (verified locally).
  const stdout = execFileSync("curl", [
    "-sS", "--max-time", "45",
    "-F", `source=@${filePath}`,
    "-F", "type=file",
    "-F", "action=upload",
    `https://freeimage.host/api/1/upload?key=${FREEIMAGE_KEY}`
  ], { encoding: "utf8" });

  const payload = JSON.parse(stdout);
  const url = payload?.image?.url;
  if (!url || !url.startsWith("https://")) {
    throw new Error("freeimage.host upload failed: " + stdout);
  }
  return url;
}

async function send() {
  const filename = fs.readFileSync(path.join("reports", ".last-filename"), "utf8").trim();
  const imageUrl = await uploadImage(path.join("reports", filename));
  console.log("[upload] " + imageUrl);

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
