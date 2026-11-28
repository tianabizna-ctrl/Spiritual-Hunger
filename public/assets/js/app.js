/* Application shell: routing, search, persistence wiring, quiet interactions. */

import { header, footer, collectionName } from "./components.js?v=20261128-2";
import { icon } from "./icons.js?v=20261128-2";
import {
  data, esc, tokenize, highlight, searchMessages, snippetFor,
} from "./data.js?v=20261128-2";
import { store } from "./store.js?v=20261128-2";
import {
  homePage, libraryPage, readerPage, devotionalsPage, devotionalPage,
  prayerPage, collectionsPage, collectionPage, savedPage, aboutPage, notFoundPage,
} from "./pages.js?v=20261128-2";

const app = document.getElementById("app");
const searchRoot = document.getElementById("search-root");
let currentCleanup = null;
let renderToken = 0;
let revealObserver = null;
let lastReaderId = "";
let lastPct = -1;
let lastSave = 0;

const ACTIVE_NAV = {
  home: "",
  library: "library",
  reader: "library",
  collections: "collections",
  collection: "collections",
  devotionals: "devotionals",
  devotional: "devotionals",
  prayer: "prayer",
  saved: "saved",
  about: "",
};

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query = new URLSearchParams(queryPart || "");
  const name = segments[0] || "home";
  if (name === "read") return { name: "reader", id: segments[1] || "", query };
  if (name === "devotionals") return segments[1] ? { name: "devotional", slug: decodeURIComponent(segments[1]), query } : { name: "devotionals", query };
  if (name === "collections") return segments[1] ? { name: "collection", slug: decodeURIComponent(segments[1]), query } : { name: "collections", query };
  if (["home", "library", "prayer", "saved", "about"].includes(name)) return { name, query };
  return { name: "notfound", query };
}

async function loadPage(route) {
  switch (route.name) {
    case "home": return homePage();
    case "library": return libraryPage({}, route.query);
    case "reader": return route.id ? readerPage(decodeURIComponent(route.id)) : notFoundPage("That message could not be found.");
    case "devotionals": return devotionalsPage();
    case "devotional": return devotionalPage(route.slug);
    case "prayer": return prayerPage();
    case "collections": return collectionsPage();
    case "collection": return collectionPage(route.slug, route.query);
    case "saved": return savedPage({}, route.query);
    case "about": return aboutPage();
    default: return notFoundPage();
  }
}

function errorPage(message) {
  return {
    title: "Something went wrong — Spiritual Hunger",
    content: `<main id="main" class="error-page"><div class="container">
      <div class="error-code" aria-hidden="true">!</div>
      <h1>The table is not set.</h1>
      <p>${esc(message)}</p>
      <div class="hero-actions" style="justify-content:center">
        <button class="btn btn-primary" type="button" data-retry>Try again ${icon("rotate")}</button>
        <a class="btn btn-outline" href="#/">Return home</a>
      </div>
    </div></main>`,
  };
}

async function render() {
  const token = ++renderToken;
  const route = parseRoute();
  closeMobileMenu();
  closeSearch();
  let page;
  try {
    page = await loadPage(route);
  } catch (err) {
    console.error(err);
    page = errorPage("The library could not be loaded just now. Check your connection and try again.");
  }
  if (token !== renderToken) return;

  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch (err) { console.error(err); }
  }
  currentCleanup = null;

  app.innerHTML = `${header(ACTIVE_NAV[route.name] || "")}${page.content}${footer()}`;
  document.title = page.title || "Spiritual Hunger";
  const main = app.querySelector("#main");
  if (main) main.classList.add("page-enter");

  if (typeof page.mount === "function") {
    try {
      const cleanup = page.mount(app);
      if (typeof cleanup === "function") currentCleanup = cleanup;
    } catch (err) {
      console.error(err);
    }
  }

  hydratePosters(main || app);

  lastPct = -1;
  lastReaderId = "";
  lastSave = 0;
  window.scrollTo(0, 0);
  updateHeader();
  updateReadingProgress();
  observeReveals();
}

/* Gospel Warrior cards render the poster after the page mounts. */
async function hydratePosters(root) {
  const cards = root.querySelectorAll(".message-card[data-message]");
  if (!cards.length) return;
  const seen = new Set();
  const jobs = [];
  for (const card of cards) {
    const id = card.dataset.message;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    jobs.push(data.poster(id).then((poster) => {
      if (!poster || card.isConnected === false || !root.contains(card)) return;
      const media = card.querySelector(".card-media.has-poster");
      if (!media || media.querySelector("img.card-poster")) return;
      const img = new Image();
      img.className = "card-poster";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = poster;
      media.insertBefore(img, media.firstChild);
    }));
  }
  await Promise.allSettled(jobs);
}

/* ---------- header, menu, theme ---------- */
function updateHeader() {
  const el = document.getElementById("site-header");
  if (el) el.classList.toggle("scrolled", window.scrollY > 6);
}

function openMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const btn = document.querySelector("[data-menu-open]");
  if (!menu) return;
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
  document.body.classList.add("menu-open");
  if (btn) btn.setAttribute("aria-expanded", "true");
}

function closeMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const btn = document.querySelector("[data-menu-open]");
  if (!menu) return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  document.body.classList.remove("menu-open");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

/* ---------- toast ---------- */
let toastTimer;
function showToast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
window.addEventListener("sh:toast", (e) => showToast(e.detail?.message || ""));

/* ---------- reading progress ---------- */
function updateReadingProgress() {
  const main = document.querySelector("[data-reader-id]");
  const article = document.querySelector("[data-reader-article]");
  const bar = document.getElementById("reading-progress");
  if (!main || !article || !bar) return;
  const id = main.dataset.readerId;
  if (id !== lastReaderId) {
    lastReaderId = id;
    lastPct = -1;
    lastSave = 0;
  }
  const rect = article.getBoundingClientRect();
  const top = window.scrollY + rect.top;
  const height = article.offsetHeight;
  const view = window.innerHeight;
  const read = Math.max(0, Math.min(1, (window.scrollY + view * 0.38 - top) / Math.max(1, height - view * 0.55)));
  const pct = Math.round(read * 100);
  bar.style.width = `${pct}%`;
  if (pct !== lastPct) {
    lastPct = pct;
    if (Date.now() - lastSave > 900) {
      store.setProgress(id, pct);
      lastSave = Date.now();
    }
  }
}

/* ---------- reveals ---------- */
function observeReveals() {
  const els = document.querySelectorAll(".reveal:not(.in)");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  els.forEach((el) => revealObserver.observe(el));
}

/* ---------- search ---------- */
let searchState = { results: [], selected: -1, token: 0, debounce: null, open: false };

function ensureSearch() {
  if (!searchRoot || searchRoot.dataset.ready === "true") return;
  searchRoot.dataset.ready = "true";
  searchRoot.innerHTML = `<div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="Search the library" aria-hidden="true">
    <div class="search-panel">
      <div class="search-bar">
        ${icon("search")}
        <input class="search-input" id="search-input" type="search" placeholder="Search every message, topic, or scripture…" autocomplete="off" spellcheck="false" aria-label="Search the library" />
        <button class="search-close" type="button" data-search-close aria-label="Close search">${icon("close")}</button>
      </div>
      <div class="search-body">
        <div class="search-suggestions" id="search-suggestions">
          <h4>Begin with a word</h4>
          <div class="suggestion-chips">
            ${["Purpose", "Prayer", "Kingdom", "Fatherhood", "Crisis", "Wisdom", "Marriage", "Leadership"].map((s) => `<button class="chip" type="button" data-suggestion="${s}">${s}</button>`).join("")}
          </div>
          <h4 style="margin-top:26px">Or search a phrase</h4>
          <p style="margin-top:8px;font-size:12px;line-height:1.65;color:var(--muted)">Try “the greatest tragedy”, “secret place”, “kingdom citizenship”, or a Scripture reference like “Jeremiah 29”.</p>
        </div>
        <div id="search-results"></div>
      </div>
      <div class="search-footer">
        <span>Searching every transcript in the archive</span>
        <div class="keys">
          <span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span>
          <span><span class="kbd">↵</span> open</span>
          <span><span class="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  </div>`;

  const overlay = document.getElementById("search-overlay");
  const input = document.getElementById("search-input");
  const body = overlay.querySelector(".search-body");

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-search-close]")) {
      closeSearch();
      return;
    }
    const suggestion = event.target.closest("[data-suggestion]");
    if (suggestion) {
      input.value = suggestion.dataset.suggestion;
      input.focus();
      runSearch(suggestion.dataset.suggestion);
      return;
    }
    const result = event.target.closest("[data-search-result]");
    if (result) {
      closeSearch();
      return;
    }
    const all = event.target.closest("[data-search-all]");
    if (all) {
      const q = input.value.trim();
      closeSearch();
      location.hash = `#/library?q=${encodeURIComponent(q)}`;
    }
  });

  input.addEventListener("input", () => {
    clearTimeout(searchState.debounce);
    searchState.debounce = setTimeout(() => runSearch(input.value), 140);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = searchState.results[searchState.selected] || searchState.results[0];
      if (selected) {
        closeSearch();
        location.hash = `#/read/${encodeURIComponent(selected.id)}`;
      }
    } else if (event.key === "Escape") {
      closeSearch();
    }
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...overlay.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  body.addEventListener("scroll", () => {
    if (searchState.open) {
      const panel = overlay.querySelector(".search-panel");
      if (panel) panel.style.maxHeight = "82vh";
    }
  }, { passive: true });
}

function openSearch() {
  ensureSearch();
  const overlay = document.getElementById("search-overlay");
  if (!overlay) return;
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("search-open");
  searchState.open = true;
  const input = document.getElementById("search-input");
  setTimeout(() => {
    input?.focus();
    input?.select();
    if (input && input.value.trim().length >= 2) runSearch(input.value);
  }, 40);
}

function closeSearch() {
  const overlay = document.getElementById("search-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("search-open");
  searchState.open = false;
}

function moveSelection(delta) {
  if (!searchState.results.length) return;
  searchState.selected = (searchState.selected + delta + searchState.results.length) % searchState.results.length;
  const items = document.querySelectorAll("[data-search-result]");
  items.forEach((el, i) => el.classList.toggle("selected", i === searchState.selected));
  const active = items[searchState.selected];
  if (active) active.scrollIntoView({ block: "nearest" });
}

async function runSearch(query) {
  ensureSearch();
  const q = String(query || "").trim();
  const suggestions = document.getElementById("search-suggestions");
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;
  if (q.length < 2) {
    searchState.results = [];
    searchState.selected = -1;
    if (suggestions) suggestions.hidden = false;
    resultsEl.innerHTML = "";
    return;
  }
  const token = ++searchState.token;
  if (suggestions) suggestions.hidden = true;
  resultsEl.innerHTML = `<div class="search-empty"><div class="icon">${icon("search")}</div><p style="font-size:12px;color:var(--muted)">Searching the archive…</p></div>`;
  let results;
  try {
    results = await searchMessages(q, 30);
  } catch (err) {
    console.error(err);
    results = [];
  }
  if (token !== searchState.token) return;
  searchState.results = results;
  searchState.selected = results.length ? 0 : -1;
  const tokens = tokenize(q);
  if (!results.length) {
    resultsEl.innerHTML = `<div class="search-empty">
      <div class="icon">${icon("search")}</div>
      <h3>No messages found</h3>
      <p>Try a different word, or browse the whole library.</p>
      <a class="btn btn-primary btn-sm" href="#/library" data-search-close>Browse the library</a>
    </div>`;
    return;
  }
  resultsEl.innerHTML = `${results.slice(0, 12).map((r, i) => `<a class="search-result${i === 0 ? " selected" : ""}" href="#/read/${encodeURIComponent(r.id)}" data-search-result data-id="${esc(r.id)}">
    <div class="search-result-title">${highlight(r.title, tokens)}</div>
    <div class="search-result-meta"><span>${esc(collectionName(r.collection))}</span><span class="dot"></span><span>${fmtMinutes(r.minutes)}</span><span class="dot"></span><span>${esc((r.topics || []).slice(0, 2).join(" · "))}</span></div>
    <div class="search-result-snippet" data-snippet="${esc(r.id)}"></div>
  </a>`).join("")}<button class="search-all" type="button" data-search-all>View all results for “${esc(q)}”</button>`;

  results.slice(0, 6).forEach(async (r) => {
    const html = await snippetFor(r.id, tokens);
    const el = resultsEl.querySelector(`[data-snippet="${r.id}"]`);
    if (el && html) el.innerHTML = html;
  });
}

function fmtMinutes(m) {
  return `${Math.max(1, Number(m) || 1)} min read`;
}

/* ---------- global events ---------- */
document.addEventListener("click", (event) => {
  const openSearchBtn = event.target.closest("[data-open-search]");
  if (openSearchBtn) {
    event.preventDefault();
    openSearch();
    return;
  }
  const themeBtn = event.target.closest("[data-theme-toggle]");
  if (themeBtn) {
    store.toggleTheme();
    return;
  }
  const menuBtn = event.target.closest("[data-menu-open]");
  if (menuBtn) {
    event.preventDefault();
    openMobileMenu();
    return;
  }
  const menuClose = event.target.closest("[data-menu-close]");
  if (menuClose) {
    closeMobileMenu();
    return;
  }
  const saveBtn = event.target.closest("[data-save]");
  if (saveBtn) {
    event.preventDefault();
    const id = saveBtn.dataset.save;
    const saved = store.toggleBookmark(id);
    syncSaveButtons(id, saved);
    showToast(saved ? "Saved to your quiet place." : "Removed from saved.");
    return;
  }
  const devSave = event.target.closest("[data-save-devotional]");
  if (devSave) {
    event.preventDefault();
    const slug = devSave.dataset.saveDevotional;
    const saved = store.toggleDevotional(slug);
    devSave.classList.toggle("is-saved", saved);
    devSave.setAttribute("aria-pressed", String(saved));
    devSave.innerHTML = `${icon(saved ? "bookmarkFill" : "bookmark")} ${saved ? "Saved" : "Save devotion"}`;
    showToast(saved ? "Devotion saved." : "Devotion removed.");
    return;
  }
  const shareBtn = event.target.closest("[data-share]");
  if (shareBtn) {
    event.preventDefault();
    sharePage(shareBtn.dataset.title || document.title);
    return;
  }
  const retry = event.target.closest("[data-retry]");
  if (retry) {
    event.preventDefault();
    render();
  }
});

function syncSaveButtons(id, saved) {
  const selector = `[data-save="${CSS.escape(id)}"]`;
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle("is-saved", saved);
    btn.setAttribute("aria-pressed", String(saved));
    btn.setAttribute("aria-label", saved ? "Remove bookmark" : "Bookmark this message");
    btn.innerHTML = icon(saved ? "bookmarkFill" : "bookmark");
  });
}

async function sharePage(title) {
  const payload = {
    title,
    text: `${title} — from the Spiritual Hunger library`,
    url: location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
    await navigator.clipboard.writeText(location.href);
    showToast("Link copied to your clipboard.");
  } catch (err) {
    if (err && err.name !== "AbortError") showToast("Could not share this page.");
  }
}

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
    return;
  }
  if (event.key === "Escape") {
    closeSearch();
    closeMobileMenu();
  }
});

window.addEventListener("scroll", () => {
  updateHeader();
  updateReadingProgress();
}, { passive: true });

window.addEventListener("resize", () => {
  updateReadingProgress();
}, { passive: true });

window.addEventListener("hashchange", () => {
  render();
});

/* ---------- boot ---------- */
function boot() {
  ensureSearch();
  render();
  const interval = 15 * 60_000;
  let lastCheck = Date.now();
  data.stats().catch(() => {});
  const checkLibrary = async () => {
    if (document.hidden || Date.now() - lastCheck < interval) return;
    lastCheck = Date.now();
    try {
      if (!await data.checkForUpdates()) return;
      const route = parseRoute();
      if (route.slug === "gospel-warrior" && !searchState.open && window.scrollY < 100) await render();
      showToast("The Gospel Warrior collection has been updated.");
    } catch { /* Keep the current reading available and retry on the next check. */ }
  };
  setInterval(checkLibrary, interval);
  document.addEventListener("visibilitychange", checkLibrary);
  const prefetch = () => {
    data.devotionals().catch(() => {});
    data.prayer().catch(() => {});
  };
  if ("requestIdleCallback" in window) requestIdleCallback(prefetch, { timeout: 4500 });
  else setTimeout(prefetch, 2500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
