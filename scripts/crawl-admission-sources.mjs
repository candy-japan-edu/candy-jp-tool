import { readFile, writeFile } from "node:fs/promises";

const sources = JSON.parse(await readFile(new URL("../data/admission-sources.json", import.meta.url), "utf8"));
const timeoutMs = 12000;

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 140) : "";
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CandyAdmissionSourceCrawler/1.0 (+https://github.com/candy-japan-edu/candy-jp-tool)"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

const snapshots = {};

for (const [school, source] of Object.entries(sources)) {
  snapshots[school] = {
    checked_at: new Date().toISOString(),
    links: []
  };

  for (const link of source.links || []) {
    const item = {
      label: link.label,
      url: link.url,
      ok: false,
      status: null,
      content_type: "",
      title: "",
      text_preview: "",
      error: ""
    };

    try {
      const response = await fetchWithTimeout(link.url);
      item.ok = response.ok;
      item.status = response.status;
      item.content_type = response.headers.get("content-type") || "";

      if (item.content_type.includes("text/html")) {
        const html = await response.text();
        item.title = titleFromHtml(html);
        item.text_preview = stripHtml(html).slice(0, 700);
      } else if (item.content_type.includes("pdf")) {
        item.title = "PDF 原文";
        item.text_preview = "PDF 文件已抓到响应，页面中保留打开原文链接。";
      } else {
        item.text_preview = "已抓到响应，非 HTML/PDF 内容。";
      }
    } catch (error) {
      item.error = error.message;
    }

    snapshots[school].links.push(item);
  }
}

await writeFile(new URL("../data/source-snapshots.json", import.meta.url), `${JSON.stringify(snapshots, null, 2)}\n`);
console.log(`Crawled ${Object.keys(sources).length} schools into data/source-snapshots.json`);
