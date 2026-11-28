/* Small, dependency-free persistence layer. Everything stays on this device. */

const PREFIX = "sh.";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable; the app still works in memory */
  }
}

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(`sh:${name}`, { detail }));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const store = {
  theme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  },
  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    write("theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#081310" : "#0d2b23");
    emit("theme", { theme });
  },
  toggleTheme() {
    const next = this.theme() === "dark" ? "light" : "dark";
    this.setTheme(next);
    return next;
  },

  readerSize() {
    return document.documentElement.getAttribute("data-reader-size") || "md";
  },
  setReaderSize(size) {
    document.documentElement.setAttribute("data-reader-size", size);
    write("readerSize", size);
    emit("reader-size", { size });
  },

  bookmarks() {
    const list = read("bookmarks", []);
    return Array.isArray(list) ? list : [];
  },
  relinkReaders(index) {
    const replacements = new Map();
    for (const doc of index) for (const alias of doc.aliases || []) replacements.set(alias, doc.id);
    if (!replacements.size) return;
    const saved = this.bookmarks();
    if (saved.some(id => replacements.has(id))) {
      write("bookmarks", [...new Set(saved.map(id => replacements.get(id) || id))]);
    }
    const progress = this.progress();
    let changed = false;
    for (const [alias, id] of replacements) {
      if (!progress[alias]) continue;
      if (!progress[id] || progress[alias].at > progress[id].at) progress[id] = progress[alias];
      delete progress[alias];
      changed = true;
    }
    if (changed) write("progress", progress);
  },
  isBookmarked(id) {
    return this.bookmarks().includes(id);
  },
  toggleBookmark(id) {
    const list = this.bookmarks();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(id);
    write("bookmarks", list);
    emit("bookmarks", { id, saved: i < 0 });
    return i < 0;
  },

  savedDevotionals() {
    const list = read("savedDevotionals", []);
    return Array.isArray(list) ? list : [];
  },
  isDevotionalSaved(slug) {
    return this.savedDevotionals().includes(slug);
  },
  toggleDevotional(slug) {
    const list = this.savedDevotionals();
    const i = list.indexOf(slug);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(slug);
    write("savedDevotionals", list);
    emit("devotionals", { slug, saved: i < 0 });
    return i < 0;
  },

  progress() {
    const p = read("progress", {});
    return p && typeof p === "object" ? p : {};
  },
  getProgress(id) {
    const p = this.progress()[id];
    return p && typeof p.pct === "number" ? p : null;
  },
  setProgress(id, pct) {
    const all = this.progress();
    const value = Math.max(0, Math.min(100, Math.round(pct)));
    if (value >= 99) {
      delete all[id];
    } else {
      all[id] = { pct: value, at: Date.now() };
    }
    write("progress", all);
    emit("progress", { id, pct: value });
  },
  clearProgress(id) {
    const all = this.progress();
    delete all[id];
    write("progress", all);
    emit("progress", { id, pct: 0 });
  },
  continueReading(limit = 6) {
    return Object.entries(this.progress())
      .filter(([, v]) => v && v.pct > 1 && v.pct < 99)
      .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))
      .slice(0, limit)
      .map(([id, v]) => ({ id, ...v }));
  },

  prayerList() {
    const list = read("prayerList", []);
    return Array.isArray(list) ? list : [];
  },
  addIntention(text) {
    const clean = String(text || "").trim().slice(0, 400);
    if (!clean) return null;
    const item = { id: uid(), text: clean, done: false, at: Date.now() };
    const list = this.prayerList();
    list.unshift(item);
    write("prayerList", list);
    emit("prayer-list");
    return item;
  },
  toggleIntention(id) {
    const list = this.prayerList();
    const item = list.find((x) => x.id === id);
    if (item) {
      item.done = !item.done;
      item.doneAt = item.done ? Date.now() : null;
      write("prayerList", list);
      emit("prayer-list");
    }
    return item;
  },
  removeIntention(id) {
    const list = this.prayerList().filter((x) => x.id !== id);
    write("prayerList", list);
    emit("prayer-list");
  },
};
