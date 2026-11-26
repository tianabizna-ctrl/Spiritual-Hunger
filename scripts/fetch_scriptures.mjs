#!/usr/bin/env node
/** Fetch public-domain KJV text for every verse used in the app. */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "scriptures.json");
await mkdir(path.join(ROOT, "content"), { recursive: true });
let existing = { verses: {} };
try { existing = JSON.parse(await readFile(OUT, "utf8")); } catch {}

const daily = [
  "Psalm 42:1", "Matthew 5:6", "John 6:35", "Psalm 63:1", "Isaiah 55:1",
  "Jeremiah 29:13", "Psalm 27:4", "Proverbs 3:5-6", "Philippians 4:6-7",
  "Romans 12:2", "Isaiah 40:31", "Psalm 23:1", "Matthew 6:33", "John 15:5",
  "Lamentations 3:22-23", "Psalm 119:105", "Hebrews 11:1", "James 1:5",
  "1 Peter 5:7", "Psalm 34:8", "2 Corinthians 5:17", "Galatians 5:22-23",
  "Micah 6:8", "Psalm 51:10", "Romans 8:28", "Joshua 1:9", "Proverbs 4:23",
  "Isaiah 26:3", "Matthew 11:28", "John 14:27",
];

const devotional = [
  "Matthew 5:6", "Luke 14:28", "John 12:24", "Matthew 6:33", "Matthew 6:6",
  "Isaiah 58:6", "Genesis 3:9-11", "Ephesians 6:4", "Genesis 2:24",
  "Mark 10:42-45", "Mark 4:39", "Proverbs 24:3-4", "Psalm 91:1", "1 Peter 4:10",
  "Micah 6:8", "Psalm 23:5", "2 Corinthians 9:6-8", "Proverbs 4:23",
  "Isaiah 30:18", "1 Kings 19:19-21", "Matthew 5:14-16",
];

const prayer = [
  "Jeremiah 29:11", "Matthew 6:10", "Philippians 4:19", "Psalm 91:1-2",
  "Ephesians 3:14-19", "1 Timothy 2:1-2", "Psalm 46:1-3", "Psalm 100:4-5",
  "1 John 1:9", "James 5:15-16",
];

const all = [...new Set([...daily, ...devotional, ...prayer])];

const normalize = (s) => s.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();

const verses = { ...(existing.verses || {}) };
for (const ref of all) {
  if (verses[ref]) { console.log(`· ${ref} cached`); continue; }
  const url = `https://bible-api.com/${encodeURIComponent(ref).replace(/%20/g, "+")}?translation=kjv`;
  let text = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      text = normalize(data.text || "");
      if (text) break;
    } catch (err) {
      console.error(`retry ${ref}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2500 + attempt * 2000));
    }
  }
  if (!text) {
    console.error(`FAILED ${ref}`);
    process.exitCode = 1;
    continue;
  }
  verses[ref] = text;
  console.log(`✓ ${ref} (${text.length})`);
  await new Promise((r) => setTimeout(r, 900));
}

await writeFile(OUT, JSON.stringify({ translation: "King James Version (Public Domain)", verses, daily, devotional, prayer }, null, 2));
console.log(`\nSaved ${Object.keys(verses).length}/${all.length} verses to ${OUT}`);
