/* Data access, formatting, search and small text helpers. */

const cache = new Map();

async function getJSON(path) {
  if (!cache.has(path)) {
    const promise = fetch(new URL(`data/${path}`, document.baseURI), { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
        return res.json();
      })
      .catch((err) => {
        if (cache.get(path) === promise) cache.delete(path);
        throw err;
      });
    cache.set(path, promise);
  }
  return cache.get(path);
}

export const data = {
  async checkForUpdates() {
    const previous = await this.stats();
    const res = await fetch(new URL("data/stats.json", document.baseURI), { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not check the library (${res.status})`);
    const latest = await res.json();
    if (!latest.gospelWarriorRevision || latest.gospelWarriorRevision === previous.gospelWarriorRevision) return false;
    cache.clear();
    snippetCache.clear();
    cache.set("stats.json", Promise.resolve(latest));
    return true;
  },
  async index() { return getJSON("index.json"); },
  async collections() { return getJSON("collections.json"); },
  async stats() { return getJSON("stats.json"); },
  async home() { return getJSON("home.json"); },
  async devotionals() { return getJSON("devotionals.json"); },
  async prayer() { return getJSON("prayer.json"); },
  async searchIndex() { return getJSON("search.json"); },
  async text(id) { return getJSON(`texts/${encodeURIComponent(id)}.json`); },
  async core() {
    const [index, collections, stats, home] = await Promise.all([
      this.index(), this.collections(), this.stats(), this.home(),
    ]);
    return { index, collections, stats, home };
  },
};

export const fmt = {
  number(value) {
    return new Intl.NumberFormat("en-US").format(Number(value) || 0);
  },
  compact(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
  },
  date(date = new Date()) {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  },
  shortDate(date = new Date()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },
  dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
  minutes(m) {
    const n = Math.max(1, Number(m) || 1);
    return `${n} min read`;
  },
  hours(h) {
    const n = Number(h) || 0;
    return n >= 100 ? `${Math.round(n)}` : n.toFixed(1).replace(/\.0$/, "");
  },
};

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyIndex(length, date = new Date()) {
  if (!length) return 0;
  return hashString(fmt.dateKey(date)) % length;
}

export function thumb(id, size = "hq") {
  const file = size === "max" ? "maxresdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${file}.jpg`;
}

export function image(id, { size = "hq", alt = "", className = "", loading = "lazy", position = "" } = {}) {
  const fallback = thumb(id, "hq");
  return `<img src="${thumb(id, size)}" alt="${esc(alt)}"${className ? ` class="${className}"` : ""} loading="${loading}" decoding="async"${position ? ` style="object-position:${position}"` : ""} onerror="this.onerror=null;this.src='${fallback}'" />`;
}

const STOP = new Set("a an the and or but if then than that this these those of to in on at by for from with without into over under is are was were be been being it its as not no so very just can could would should will shall may might do does did doing have has had having i you he she we they me him her us them my your his our their who whom which what when where why how all any both each few more most other some such only own same too also about after before again against between during through above below up down out off once here there".split(/\s+/));

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 28 && !STOP.has(t));
}

export function highlight(text, tokens) {
  const safe = esc(text);
  const clean = [...new Set(tokens.filter(Boolean))].slice(0, 8).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!clean.length) return safe;
  try {
    return safe.replace(new RegExp(`(${clean.join("|")})`, "gi"), "<mark>$1</mark>");
  } catch {
    return safe;
  }
}

export async function searchMessages(query, limit = 30) {
  const tokens = tokenize(query).slice(0, 6);
  if (!tokens.length) return [];
  const [index, search] = await Promise.all([data.index(), data.searchIndex()]);
  const terms = search.terms || {};
  const scores = new Map();
  const matched = new Map();

  const add = (docIdx, weight, token) => {
    if (docIdx == null) return;
    scores.set(docIdx, (scores.get(docIdx) || 0) + weight);
    if (!matched.has(docIdx)) matched.set(docIdx, new Set());
    matched.get(docIdx).add(token);
  };

  for (const token of tokens) {
    const exact = terms[token] || [];
    for (const i of exact) add(i, 12, token);
    if (token.length >= 3) {
      const keys = Object.keys(terms).filter((k) => k !== token && k.startsWith(token)).slice(0, 12);
      for (const key of keys) {
        for (const i of terms[key]) add(i, 4, token);
      }
    }
  }

  const phrase = query.trim().toLowerCase();
  for (let i = 0; i < index.length; i++) {
    const doc = index[i];
    let boost = 0;
    if (phrase.length >= 3 && doc.title.toLowerCase().includes(phrase)) boost += 34;
    for (const token of tokens) {
      if (doc.title.toLowerCase().includes(token)) boost += 7;
      if ((doc.topics || []).some((t) => t.toLowerCase().includes(token))) boost += 4;
      if ((doc.collection || "").toLowerCase().includes(token)) boost += 2;
    }
    if (boost) {
      scores.set(i, (scores.get(i) || 0) + boost);
      if (!matched.has(i)) matched.set(i, new Set());
      for (const token of tokens) if (doc.title.toLowerCase().includes(token)) matched.get(i).add(token);
    }
  }

  const results = [];
  for (const [i, score] of scores) {
    const doc = index[i];
    if (!doc) continue;
    results.push({ ...doc, _score: score, _matched: [...(matched.get(i) || [])], _tokens: tokens });
  }
  results.sort((a, b) => b._score - a._score || b._matched.length - a._matched.length || a.title.localeCompare(b.title));
  return results.slice(0, limit);
}

const snippetCache = new Map();

export async function snippetFor(id, tokens) {
  const key = `${id}:${tokens.join(",")}`;
  if (snippetCache.has(key)) return snippetCache.get(key);
  try {
    const text = await data.text(id);
    const joined = text.paragraphs.join(" ");
    const lower = joined.toLowerCase();
    let at = -1;
    for (const token of tokens) {
      const i = lower.indexOf(token.toLowerCase());
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    let start = Math.max(0, (at >= 0 ? at : 0) - 90);
    let end = Math.min(joined.length, start + 230);
    if (start > 0) {
      const space = joined.indexOf(" ", start);
      if (space > -1 && space < start + 30) start = space + 1;
    }
    if (end < joined.length) {
      const space = joined.lastIndexOf(" ", end);
      if (space > start + 140) end = space;
    }
    const raw = `${start > 0 ? "…" : ""}${joined.slice(start, end).trim()}${end < joined.length ? "…" : ""}`;
    const html = highlight(raw, tokens);
    snippetCache.set(key, html);
    return html;
  } catch {
    return "";
  }
}

export function relatedMessages(doc, index, limit = 3) {
  const topics = new Set(doc.topics || []);
  return index
    .filter((m) => m.id !== doc.id)
    .map((m) => {
      let score = 0;
      for (const t of m.topics || []) if (topics.has(t)) score += 3;
      if (m.collection === doc.collection) score += 2;
      if (m.kind === doc.kind) score += 1;
      return { m, score };
    })
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score || a.m.title.localeCompare(b.m.title))
    .slice(0, limit)
    .map((x) => x.m);
}

export function topicCounts(index) {
  const counts = new Map();
  for (const m of index) {
    for (const t of m.topics || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return counts;
}

export function prettyCollection(slug, collections) {
  return collections?.find((c) => c.slug === slug)?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function collectionBySlug(slug, collections) {
  return collections?.find((c) => c.slug === slug) || null;
}

export function articleWordCount(text) {
  return (text || "").split(/\s+/).filter(Boolean).length;
}
