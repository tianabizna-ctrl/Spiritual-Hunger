#!/usr/bin/env node
/**
 * Build the public data layer from harvested transcripts.
 *
 *   .sources/manifest.json + .sources/transcripts/<id>.json
 *      -> public/data/index.json      (metadata for every message)
 *      -> public/data/texts/<id>.json (clean paragraphs, loaded per reader)
 *      -> public/data/search.json     (compact inverted index)
 *      -> public/data/collections.json
 *      -> public/data/stats.json
 *      -> public/data/home.json       (featured + quote + daily verses)
 */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, ".sources");
const OUT = path.join(ROOT, "public", "data");
const TEXT_OUT = path.join(OUT, "texts");
const CONTENT = path.join(ROOT, "content");
const selmanPlaylists = JSON.parse(await readFile(path.join(CONTENT, "selman-playlists.json"), "utf8"));
const gospelWarrior = JSON.parse(await readFile(path.join(CONTENT, "gospel-warrior.json"), "utf8"));
const fbPosts = new Map(gospelWarrior.posts.map((p) => [p.id, p]));

const COLLECTIONS = [
  { slug: "media-content", name: "Media Content", blurb: "The flagship archive of full-length teachings, interviews and special messages.", accent: "gold" },
  { slug: "animated", name: "Animated Teachings", blurb: "Dr. Munroe's core principles distilled into short animated lessons.", accent: "sage" },
  { slug: "prayer-fasting", name: "Prayer & Fasting", blurb: "Teachings on prayer, fasting, spiritual discipline and intimacy with God.", accent: "violet" },
  { slug: "men-fatherhood", name: "Men & Fatherhood", blurb: "Manhood, fathering, sonship and the charge to build the next generation.", accent: "clay" },
  { slug: "marriage", name: "Marriage & Relationships", blurb: "Covenant, courtship, communication and building a home that lasts.", accent: "rose" },
  { slug: "success", name: "Success", blurb: "Biblical success, excellence, diligence and the price of achievement.", accent: "gold" },
  { slug: "leadership", name: "Leadership", blurb: "Servant leadership, influence, mentorship and the stewardship of people.", accent: "ocean" },
  { slug: "kingdom", name: "Kingdom", blurb: "The gospel of the Kingdom, citizenship, culture and the King's agenda.", accent: "sage" },
  { slug: "purpose", name: "Purpose", blurb: "Discovering, refining and fulfilling the reason you were created.", accent: "gold" },
  { slug: "crisis", name: "Crisis Management", blurb: "Faith, resilience and decision-making when life is shaken.", accent: "clay" },
  { slug: "general", name: "General Teachings", blurb: "A small gathering of essential messages outside the main themes.", accent: "ocean" },
  { slug: "available", name: "Available Teachings", blurb: "The wide catch-all archive — a cross-section of the entire ministry.", accent: "violet" },
  { slug: "short-messages", name: "Short Messages", blurb: "Brief, concentrated words for the day.", accent: "rose" },
  { slug: "gospel-warrior", name: "Gospel Warrior", blurb: "Public Facebook studies from Gospel Warrior, cleaned of calls to action and promotions.", accent: "rose" },
  ...selmanPlaylists.map(({ videos, ...collection }) => ({ ...collection, playlistOrder: videos.map(v => v.id) })),
];

const COLLECTION_TOPIC = {
  "prayer-fasting": "Prayer",
  "men-fatherhood": "Fatherhood",
  marriage: "Marriage",
  success: "Success",
  leadership: "Leadership",
  kingdom: "Kingdom",
  purpose: "Purpose",
  crisis: "Crisis",
  animated: "Spiritual Growth",
  "media-content": "Faith",
  available: "Spiritual Growth",
  general: "Faith",
  "short-messages": "Spiritual Growth",
  "gospel-warrior": "Faith",
  selman: "Faith",
  "feeling-lost": "Faith",
  "morning-prayer": "Prayer",
  ...Object.fromEntries(selmanPlaylists.filter(p => p.topic).map(p => [p.slug, p.topic])),
};

const TOPICS = {
  Purpose: ["purpose", "destiny", "potential", "assignment", "calling", "vision", "designed", "born to", "reason for"],
  Kingdom: ["kingdom", "king", "citizenship", "colony", "colonization", "government", "dominion", "reign", "throne"],
  Prayer: ["prayer", "pray", "praying", "fasting", "fast", "intercession", "intercede", "altar", "petition", "secret place"],
  Faith: ["faith", "believe", "belief", "trust", "confidence", "assurance", "hope"],
  Leadership: ["leadership", "leader", "leading", "influence", "mentor", "succession", "steward", "authority", "serve"],
  Marriage: ["marriage", "marry", "husband", "wife", "spouse", "covenant", "courtship", "relationship"],
  Family: ["family", "children", "child", "parent", "mother", "home", "generation", "legacy", "household"],
  Fatherhood: ["fatherhood", "father", "manhood", "men", "sonship", "masculinity", "son"],
  Success: ["success", "excellence", "diligence", "achievement", "discipline", "goal", "wealth", "prosperity"],
  Wisdom: ["wisdom", "wise", "knowledge", "understanding", "principle", "law", "truth", "mind"],
  "Holy Spirit": ["holy spirit", "anointing", "spiritual gift", "baptism", "pentecost", "comforter"],
  Grace: ["grace", "mercy", "forgiveness", "salvation", "redemption", "cross", "jesus", "resurrection"],
  Crisis: ["crisis", "storm", "trial", "suffering", "fear", "anxiety", "adversity", "resilience", "pain"],
  Generosity: ["giving", "give", "generosity", "seed", "sow", "tithe", "offering", "blessing", "generous"],
  Identity: ["identity", "self-worth", "image", "worth", "value", "who you are", "esteem", "shame"],
  "Spiritual Growth": ["growth", "maturity", "disciple", "discipleship", "character", "transformation", "renew", "hunger", "thirst"],
};

const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalm", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
  "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];
const BOOK_PATTERN = BOOKS.sort((a, b) => b.length - a.length)
  .map((b) => b.replace(/ /g, "\\s+"))
  .join("|");
const SCRIPTURE_RE = new RegExp(`\\b(${BOOK_PATTERN})\\s+(\\d{1,3})(?::(\\d{1,3})(?:\\s*[-–]\\s*\\d{1,3})?)?`, "gi");

const STOP = new Set(`a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves also than then them these this those god lord jesus christ holy spirit man men people life lives time things thing way ways know know says said say make made come came go going get got give given take taken see seen look looked want need needs like let lets us upon yet every much many may might must shall unto thee thou thy thine ye hath doth therefore because shall`.split(/\s+/));

const cleanText = (raw) => {
  let t = raw
    .replace(/\[(music|applause|laughter|silence|singing|sound effects?|inaudible)\]/gi, " ")
    .replace(/>>/g, " ")
    .replace(/\[[^\]]{0,80}\]/g, " ")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[A-Za-z])/g, "$1 ")
    .replace(/\bDr\.?\s*Miles\s*Monroe\b/gi, "Dr. Myles Munroe")
    .replace(/\bMonroe\s+Global\b/gi, "Munroe Global")
    .replace(/\bMonro\s+Global\b/gi, "Munroe Global")
    .replace(/\bMonroeglobal(?:\.com)?\b/gi, "MunroeGlobal.com")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t;
};

const cleanTitle = (raw) => {
  let t = raw
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, " ")
    .replace(/\s*\|\s*(Dr\.?\s*Myles\s*Munroe|Munroe\s*Global|MunroeGlobal\.com).*$/i, "")
    .replace(/\s*[-–—]\s*Dr\.?\s*Myles\s*Munroe.*$/i, "")
    .replace(/\s+By\s+Dr\.?\s*Myles\s*Munroe.*$/i, "")
    .replace(/:\s*Dr\.?\s*Myles\s*Munroe.*$/i, "")
    .replace(/\s*\((official|full|live|audio|video|sermon)[^)]*\)/gi, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([:;,.!?])/g, "$1")
    .replace(/^["'“”\s]+|["'“”\s]+$/g, "")
    .trim();
  if (!t) t = raw.trim();
  return t;
};

const sentenceSplit = (text) => {
  const parts = text.match(/[^.!?]+[.!?]+["'”’)\]]*|[^.!?]+$/g);
  return (parts || [text]).map((s) => s.trim()).filter(Boolean);
};

function toParagraphs(text) {
  const sentences = sentenceSplit(text);
  const avg = text.length / Math.max(1, sentences.length);
  const paras = [];
  if (avg > 520 || sentences.some(s => s.length > 1200)) {
    // unpunctuated machine captions: chunk by words
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += 85) {
      const chunk = words.slice(i, i + 85).join(" ");
      if (chunk) paras.push(chunk);
    }
  } else {
    let buf = "";
    for (const s of sentences) {
      if (!buf) buf = s;
      else if (buf.length + s.length < 520) buf += " " + s;
      else { paras.push(buf); buf = s; }
    }
    if (buf) paras.push(buf);
  }
  return paras.map((p) => p.trim()).filter(Boolean);
}

function deLoop(paras) {
  if (paras.length <= 160) return paras;
  for (let k = 30; k < Math.floor(paras.length / 2); k++) {
    let checks = 0;
    let matches = 0;
    for (let i = 0; i + k < paras.length && checks < 140; i++) {
      checks++;
      const a = paras[i].slice(0, 90);
      const b = paras[i + k].slice(0, 90);
      if (a === b) matches++;
    }
    if (checks > 20 && matches / checks >= 0.6) {
      return paras.slice(0, k);
    }
  }
  return paras;
}

function capRepeats(paras, wordCount) {
  if (wordCount < 25000) return paras;
  const seen = new Map();
  const out = [];
  for (const p of paras) {
    const sig = p.slice(0, 90);
    const n = seen.get(sig) || 0;
    if (n >= 2) continue;
    seen.set(sig, n + 1);
    out.push(p);
  }
  return out;
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

function wordMap(text) {
  const m = new Map();
  for (const w of text.toLowerCase().match(/[a-z']+/g) || []) m.set(w, (m.get(w) || 0) + 1);
  return m;
}

function topicScore(text, title, collection) {
  const headWords = wordMap(text.slice(0, 18000));
  const titleWords = wordMap(title);
  const headLower = text.slice(0, 18000).toLowerCase();
  const titleLower = title.toLowerCase();
  const scores = [];
  for (const [topic, words] of Object.entries(TOPICS)) {
    let score = 0;
    for (const w of words) {
      if (w.includes(" ")) {
        const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
        score += (titleLower.match(re) || []).length * 9;
        score += (headLower.match(re) || []).length * 1.4;
      } else {
        score += (titleWords.get(w) || 0) * 9;
        score += (headWords.get(w) || 0) * 1.4;
      }
    }
    if (collection && COLLECTION_TOPIC[collection] === topic) score += 8;
    scores.push([topic, score]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  const picked = scores.filter(([, s]) => s >= 3).slice(0, 3).map(([t]) => t);
  if (picked.length === 0) picked.push(COLLECTION_TOPIC[collection] || "Spiritual Growth");
  if (picked.length < 2) picked.push("Spiritual Growth");
  return [...new Set(picked)];
}

function scriptureRefs(text) {
  const found = new Map();
  let m;
  SCRIPTURE_RE.lastIndex = 0;
  while ((m = SCRIPTURE_RE.exec(text))) {
    const book = m[1].replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const chapter = Number(m[2]);
    const verse = m[3] ? Number(m[3]) : null;
    if (chapter === 0 || chapter > 150) continue;
    if (verse && verse > 176) continue;
    const ref = `${book} ${chapter}${verse ? `:${verse}` : ""}`;
    found.set(ref, (found.get(ref) || 0) + 1);
  }
  return [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r]) => r);
}

const words = (t) => t.split(/\s+/).filter(Boolean).length;

function excerptFrom(paras) {
  let e = paras[0] || "";
  if (e.length > 230) {
    const cut = e.slice(0, 230);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    e = lastStop > 120 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, "") + "…";
  }
  return e;
}

function tokensFor(text) {
  return text.toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 24 && !STOP.has(w) && !/^\d+$/.test(w));
}

const sha = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

async function main() {
  const manifest = JSON.parse(await readFile(path.join(SRC, "manifest.json"), "utf8"));
  const byId = new Map(manifest.map(r => [r.id, r]));
  for (const post of gospelWarrior.posts) {
    byId.set(post.id, { id: post.id, title: post.title, collections: ["gospel-warrior"] });
  }
  const practices = new Map();
  for (const playlist of selmanPlaylists) {
    for (const video of playlist.videos) {
      if (!video.title && !byId.has(video.id)) continue;
      const rec = byId.get(video.id) || { id: video.id, title: video.title, collections: [] };
      if (!rec.collections.includes(playlist.slug)) rec.collections.push(playlist.slug);
      if (video.channel) rec.channel = video.channel;
      byId.set(video.id, rec);
      if (video.practice) practices.set(video.id, video.practice);
    }
  }
  await mkdir(TEXT_OUT, { recursive: true });
  await rm(TEXT_OUT, { recursive: true, force: true });
  await mkdir(TEXT_OUT, { recursive: true });

  const index = [];
  const skipped = [];
  const searchDocs = [];
  const termMap = new Map();
  const quoteSources = new Map();

  for (const rec of byId.values()) {
    if (!rec.collections.some(slug => COLLECTIONS.some(c => c.slug === slug))) continue;
    const fb = fbPosts.get(rec.id);
    let raw;
    if (fb) {
      const text = fb.paragraphs.join(" ");
      raw = { text, chars: text.length, title: rec.title || fb.title, duration: 0 };
    } else {
      const file = path.join(SRC, "transcripts", `${rec.id}.json`);
      if (!existsSync(file)) { skipped.push({ id: rec.id, reason: "missing" }); continue; }
      try { raw = JSON.parse(await readFile(file, "utf8")); } catch { skipped.push({ id: rec.id, reason: "unreadable" }); continue; }
    }
    if (!raw.text || (!fb && raw.chars < 300)) { skipped.push({ id: rec.id, reason: "empty" }); continue; }

    let paras = fb?.paragraphs;
    if (!fb) {
      const text = cleanText(raw.text);
      paras = toParagraphs(text);
      if (paras.length > 2 && /thank you for (joining|watching)|brought to you by|monroeglobal\.com|we transform followers|we turn followers/i.test(paras[0])) {
        let drop = 1;
        while (drop < 3 && /munroe global|monroeglobal|followers into leaders|followers into change|blessing to you|hope this message|agents of change/i.test(paras[drop] || "")) drop++;
        if (drop < paras.length) paras = paras.slice(drop);
      }
      paras = capRepeats(deLoop(paras), words(text));
    }
    if (paras.length === 0) { skipped.push({ id: rec.id, reason: "empty-after-clean" }); continue; }

    const title = cleanTitle(raw.title || rec.title);
    const collection = rec.collections[0];
    const allText = paras.join(" ");
    const wc = words(allText);
    const refs = scriptureRefs(allText);
    const topics = topicScore(allText, title, collection);
    const readMinutes = Math.max(1, Math.round(wc / 200));
    const kind = rec.collections.some(slug => COLLECTION_TOPIC[slug] === "Prayer") || /\b(prayer|praying|fasting|intercession|worship|holy spirit|altar|revival)\b/i.test(title)
      ? "prayer" : "teaching";
    const excerpt = excerptFrom(paras);
    const doc = {
      id: rec.id,
      title,
      collection,
      channel: rec.channel,
      collections: rec.collections,
      topics,
      kind,
      words: wc,
      minutes: readMinutes,
      chars: allText.length,
      scriptureRefs: refs,
      excerpt,
      thumb: fb ? "" : `https://i.ytimg.com/vi/${rec.id}/hqdefault.jpg`,
      thumbMax: fb ? "" : `https://i.ytimg.com/vi/${rec.id}/maxresdefault.jpg`,
      duration: raw.duration || 0,
      source: fb ? fb.source : `https://www.youtube.com/watch?v=${rec.id}`,
      origin: fb ? "facebook" : "youtube",
      postedAgo: fb ? fb.postedAgo : undefined,
      postedOn: fb?.postedOn,
      accent: COLLECTIONS.find((c) => c.slug === collection)?.accent || "gold",
    };
    index.push(doc);

    quoteSources.set(rec.id, { title: doc.title, paragraphs: paras, source: doc.source });

    await writeFile(path.join(TEXT_OUT, `${rec.id}.json`), JSON.stringify({
      id: doc.id,
      title: doc.title,
      collection: doc.collection,
      topics: doc.topics,
      paragraphs: paras,
      practice: practices.get(doc.id),
      translated: raw.translated || undefined,
      scriptureRefs: refs,
      words: wc,
      minutes: readMinutes,
      source: doc.source,
    }));

    // search document: title + topics weighted heavily
    const counts = new Map();
    const add = (tokens, weight) => {
      for (const t of tokens) counts.set(t, (counts.get(t) || 0) + weight);
    };
    add(tokensFor(title), 8);
    add(tokensFor(topics.join(" ")), 5);
    add(tokensFor(allText), 1);
    const ranked = [...counts.entries()];
    const titleTerms = new Set(tokensFor(title));
    for (const [term] of counts) if (titleTerms.has(term) && !ranked.find(([t]) => t === term)) ranked.push([term, 1]);
    const docIdx = searchDocs.length;
    searchDocs.push({ i: docIdx, id: doc.id });
    for (const [term] of ranked) {
      if (!termMap.has(term)) termMap.set(term, []);
      termMap.get(term).push(docIdx);
    }
  }

  index.sort((a, b) => a.title.localeCompare(b.title));

  const collections = COLLECTIONS.map((c) => {
    const items = index.filter((m) => m.collections.includes(c.slug));
    const readable = new Set(items.map(m => m.id));
    const playlist = selmanPlaylists.find(p => p.slug === c.slug);
    return {
      ...c,
      sourceOnly: playlist && Object.fromEntries(playlist.videos.filter(v => !readable.has(v.id)).map(v => [v.id, {title: v.title, availability: v.availability}])),
      count: items.length,
      thumbs: items.slice(0, 3).map((m) => ({ id: m.id, title: m.title, thumb: m.thumb, accent: m.accent })),
    };
  });

  const totalWords = index.reduce((s, m) => s + m.words, 0);
  const totalSeconds = index.reduce((s, m) => s + (m.duration || 0), 0);
  const totalHours = totalSeconds > 60 ? totalSeconds / 3600 : totalWords / 150 / 60;

  const stats = {
    messages: index.length,
    collections: collections.filter((c) => c.count > 0 || c.playlistId).length,
    words: totalWords,
    hours: Math.round(totalHours * 10) / 10,
    prayerMessages: index.filter((m) => m.kind === "prayer").length,
    scriptures: new Set(index.flatMap((m) => m.scriptureRefs.map((r) => r.replace(/:\d+$/, "")))).size,
    avgMinutes: Math.round(index.reduce((s, m) => s + m.minutes, 0) / Math.max(1, index.length)),
    updated: new Date().toISOString().slice(0, 10),
  };

  // search index, docs are in alphabetical index order
  const order = new Map(index.map((m, i) => [m.id, i]));
  const terms = {};
  for (const term of [...termMap.keys()].sort()) {
    const ids = [...new Set(termMap.get(term).map((i) => order.get(searchDocs[i].id)))].sort((a, b) => a - b);
    if (ids.length) terms[term] = ids;
  }

  // featured: spread across collections, readable titles
  const featureSlugs = ["purpose", "prayer-fasting", "leadership", "kingdom", "marriage", "crisis", "men-fatherhood", "success"];
  const featured = [];
  for (const slug of featureSlugs) {
    const pool = index.filter((m) => m.collections.includes(slug) && m.title.length < 78 && m.words > 1500);
    if (pool.length) featured.push(pool[sha(slug) % pool.length].id);
  }
  for (const m of index) {
    if (featured.length >= 8) break;
    if (!featured.includes(m.id) && m.title.length < 70) featured.push(m.id);
  }

  const home = {
    featured: featured.slice(0, 8),
    quote: {
      text: "The greatest tragedy in life is not death, but a life without purpose.",
      attribution: "Dr. Myles Munroe",
      videoId: index.find((m) => /purpose/i.test(m.title))?.id || index[0]?.id,
    },
    verses: JSON.parse(await readFile(path.join(CONTENT, "scriptures.json"), "utf8")).daily,
  };

  await writeFile(path.join(OUT, "index.json"), JSON.stringify(index));
  await writeFile(path.join(OUT, "collections.json"), JSON.stringify(collections, null, 2));
  await writeFile(path.join(OUT, "stats.json"), JSON.stringify(stats, null, 2));
  await writeFile(path.join(OUT, "search.json"), JSON.stringify({ docs: index.map((m) => m.id), terms }));
  await writeFile(path.join(OUT, "home.json"), JSON.stringify(home, null, 2));

  // devotionals + prayer themes (merged with scripture text)
  const scriptures = JSON.parse(await readFile(path.join(CONTENT, "scriptures.json"), "utf8"));
  const devotionals = JSON.parse(await readFile(path.join(CONTENT, "devotionals.json"), "utf8"));
  const pickQuote = (paragraphs, hint) => {
    const needle = hint.toLowerCase();
    const candidates = paragraphs.filter((p) => p.toLowerCase().includes(needle));
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const score = (p) => (p.length >= 180 && p.length <= 620 ? 3 : 0) + (/\bGod\b/i.test(p) ? 2 : 0) + (/\byou\b/i.test(p) ? 1 : 0);
      return score(b) - score(a);
    });
    const para = candidates[0];
    const sentences = sentenceSplit(para);
    let idx = sentences.findIndex((s) => s.toLowerCase().includes(needle));
    if (idx < 0) idx = 0;
    let start = idx;
    let end = idx;
    let text = sentences[idx];
    while (text.length < 170 && end + 1 < sentences.length) { end++; text += " " + sentences[end]; }
    while (text.length < 140 && start > 0) { start--; text = sentences[start] + " " + text; }
    if (text.length > 470) {
      const cut = text.slice(0, 470);
      const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
      text = stop > 200 ? cut.slice(0, stop + 1) : text;
    }
    return text.trim();
  };
  const enriched = devotionals.map((d) => {
    const reviewed = {12: 'The fear of the Lord is where wisdom begins.', 16: 'whether it rains or the sun shines, God is in control.', 21: 'You are who you are because the community influenced you.'};
    const text = reviewed[d.day];
    const src = quoteSources.get(d.quote?.videoId);
    const quote = text && src?.paragraphs.some(p => p.includes(text))
      ? { text, videoId: d.quote.videoId, videoTitle: src.title, source: src.source } : null;
    return {
      ...d,
      quote,
      scripture: { ...d.scripture, text: scriptures.verses[d.scripture.ref] || "" },
      related: (d.related || []).map((id) => index.find((m) => m.id === id)).filter(Boolean).map((m) => ({ id: m.id, title: m.title, collection: m.collection })),
    };
  });
  await writeFile(path.join(OUT, "devotionals.json"), JSON.stringify(enriched, null, 2));
  const prayer = JSON.parse(await readFile(path.join(CONTENT, "prayer.json"), "utf8"));
  const prayerEnriched = prayer.map((p) => ({ ...p, scripture: { ...p.scripture, text: scriptures.verses[p.scripture.ref] || "" } }));
  await writeFile(path.join(OUT, "prayer.json"), JSON.stringify(prayerEnriched, null, 2));

  console.log(`Messages       ${index.length}`);
  console.log(`Skipped        ${skipped.length}`);
  console.log(`Words          ${totalWords.toLocaleString()}`);
  console.log(`Hours          ${stats.hours}`);
  console.log(`Search terms   ${Object.keys(terms).length}`);
  console.log(`Featured       ${home.featured.length}`);
  console.log(`Devotionals    ${enriched.length}`);
  if (skipped.length) console.log("Skipped ids:", skipped.slice(0, 30).map((s) => `${s.id}(${s.reason})`).join(", "));
}

main().catch((err) => { console.error(err); process.exit(1); });
