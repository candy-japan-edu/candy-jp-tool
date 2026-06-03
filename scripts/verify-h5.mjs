import { existsSync } from "node:fs";

async function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return import(process.env.PLAYWRIGHT_MODULE);
  try {
    return await import("playwright");
  } catch (error) {
    const bundled = "/Users/yj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
    if (existsSync(bundled)) return import(bundled);
    throw error;
  }
}

const { chromium } = await loadPlaywright();

const launchOptions = { headless: true };
if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
else if (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")) {
  launchOptions.executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
}

const browser = await chromium.launch(launchOptions);

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
const home = {
  title: await page.title(),
  majorCount: await page.locator("#majorCount").textContent(),
  calendarTitle: await page.locator("#calendarTitle").textContent(),
  calendarEvents: await page.locator(".calendar-event").count(),
  eventCards: await page.locator(".event-card").count(),
  pendingTimelineCards: await page.locator(".pending-date-card").count(),
  h1: await page.locator("h1").first().textContent()
};
await page.screenshot({ path: "/private/tmp/candy-h5-home-mobile.png", fullPage: true });
await page.screenshot({ path: "/private/tmp/candy-h5-home-viewport.png", fullPage: false });

await page.fill("#searchInput", "东京大学 机械");
await page.waitForTimeout(150);
const filteredTitle = await page.locator("#resultTitle").textContent();
await page.click("#listButton");
await page.waitForTimeout(150);
const listCards = await page.locator(".school-card").count();
await page.click('[data-add-compare="todai-eng-mech"]');

await page.goto("http://localhost:4173/school.html?id=todai-eng-mech", { waitUntil: "networkidle" });
const detail = {
  title: await page.title(),
  schoolHeading: await page.locator(".detail-title-row h1").textContent(),
  timeCards: await page.locator(".time-card").count(),
  officialCta: await page.locator(".official-time-cta").count(),
  sourceLinks: await page.locator(".source-links a").count(),
  sourceSnippets: await page.locator(".source-snippets blockquote").count()
};
await page.click('[data-tab="exam"]');
const tabText = await page.locator("#tabContent").textContent();

await page.goto("http://localhost:4173/compare.html?ids=todai-eng-mech,todai-econ-econ", { waitUntil: "networkidle" });
const compare = {
  title: await page.locator("#compareTitle").textContent(),
  rows: await page.locator(".compare-table tbody tr").count(),
  diffCells: await page.locator(".compare-table td.diff").count()
};

await page.screenshot({ path: "/private/tmp/candy-h5-mobile.png", fullPage: true });

const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await desktop.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await desktop.screenshot({ path: "/private/tmp/candy-h5-desktop.png", fullPage: true });

await browser.close();

console.log(
  JSON.stringify(
    {
      home,
      filteredTitle,
      listCards,
      detail,
      tabHasExam: tabText.includes("考试形式"),
      compare,
      errors
    },
    null,
    2
  )
);
