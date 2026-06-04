import fs from "fs/promises";
import crypto from "crypto";

const USER_AGENT = "Candy-EduMonitor/1.0 (educational research tool; contact: candy@example.com)";
const WATCH_LIST_PATH = "data/watch-list.json";
const UPDATES_PATH = "data/updates.json";
const MAX_RECORDS = 500;
const REQUEST_DELAY_MS = process.env.CANDY_CHECK_DELAY_MS === undefined ? 2000 : Number(process.env.CANDY_CHECK_DELAY_MS);
const REQUEST_TIMEOUT_MS = 15000;
const dryRun = process.argv.includes("--dry-run") || process.env.CANDY_DRY_RUN === "1";
const limit = Number(process.env.CANDY_CHECK_LIMIT || 0);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHtml(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, "");
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function fetchAndHash(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
      }
    });

    if (!response.ok) {
      return { error: true, message: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const normalized = normalizeHtml(html);

    return {
      hash: hashContent(normalized),
      length: normalized.length,
      final_url: response.url
    };
  } catch (error) {
    return { error: true, message: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function latestHashes(updates) {
  const hashes = {};
  for (const update of updates) {
    if (!hashes[update.watch_url] && update.current_hash) {
      hashes[update.watch_url] = update.current_hash;
    }
  }
  return hashes;
}

function makeRecord({ prefix, school, watchItem, result, previousHash }) {
  const timestamp = new Date().toISOString();
  return {
    id: `${prefix}-${Date.now()}-${school.id}-${hashContent(watchItem.url).slice(0, 8)}`,
    detected_at: timestamp,
    school_id: school.id,
    school_name: school.school_name,
    watch_url: watchItem.url,
    watch_label: watchItem.label,
    official_pdf: school.official_pdf || "",
    candy_comment: prefix === "baseline" ? "基线快照，无需解读" : "",
    candy_comment_at: prefix === "baseline" ? timestamp : null,
    previous_hash: previousHash,
    current_hash: result.hash,
    content_length: result.length,
    final_url: result.final_url,
    ...(result.check_error ? { check_error: result.check_error } : {}),
    ...(prefix === "baseline" ? { is_baseline: true } : {})
  };
}

async function main() {
  const watchList = await readJson(WATCH_LIST_PATH, []);
  const updates = await readJson(UPDATES_PATH, []);
  const lastHashes = latestHashes(updates);
  const schoolsToCheck = limit > 0 ? watchList.slice(0, limit) : watchList;
  const newUpdates = [];

  for (const school of schoolsToCheck) {
    for (const watchItem of school.watch_urls || []) {
      const result = await fetchAndHash(watchItem.url);
      const previousHash = lastHashes[watchItem.url] || null;

      if (result.error) {
        console.log(`[ERROR] ${school.school_name}: ${watchItem.url} - ${result.message}`);
        if (!previousHash) {
          newUpdates.push(
            makeRecord({
              prefix: "baseline",
              school,
              watchItem,
              result: {
                hash: hashContent(`error:${watchItem.url}:${result.message}`),
                length: 0,
                final_url: watchItem.url,
                check_error: result.message
              },
              previousHash: null
            })
          );
          console.log(`[BASELINE-ERROR] ${school.school_name}: ${result.message}`);
        }
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      if (previousHash && previousHash !== result.hash) {
        newUpdates.push(makeRecord({ prefix: "update", school, watchItem, result, previousHash }));
        console.log(`[UPDATE] ${school.school_name}: ${watchItem.label}`);
      } else if (!previousHash) {
        newUpdates.push(makeRecord({ prefix: "baseline", school, watchItem, result, previousHash: null }));
        console.log(`[BASELINE] ${school.school_name}: ${watchItem.label}`);
      } else {
        console.log(`[OK] ${school.school_name}: no change`);
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  if (newUpdates.length > 0) {
    const merged = [...newUpdates, ...updates].slice(0, MAX_RECORDS);
    if (!dryRun) {
      await fs.writeFile(UPDATES_PATH, `${JSON.stringify(merged, null, 2)}\n`);
    }
    console.log(`[OK] 新增 ${newUpdates.length} 条记录${dryRun ? "（dry-run 未写入）" : ""}`);
  } else {
    console.log("[OK] 无变化");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
