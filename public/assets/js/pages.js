/* Page renderers. Each returns { title, content, mount?, cleanup? }. */

import { icon, TOPIC_ICONS } from "./icons.js?v=20261127-3";
import {
  header, footer, pageHero, sectionHead, messageCard, devotionalCard,
  collectionCard, emptyState, quoteBand, collectionName, sourceLabel, topicIcon, mediaHtml,
} from "./components.js?v=20261128-1";
import {
  data, fmt, esc, image, dailyIndex, relatedMessages, topicCounts,
  collectionBySlug, searchMessages, snippetFor,
} from "./data.js?v=20261128-1";
import { store } from "./store.js?v=20261128-1";

const collectionOptions = (collections) => collections.filter((c) => c.count > 0);

const sortMessages = (items, sort) => {
  const copy = [...items];
  if (sort === "shortest") return copy.sort((a, b) => a.minutes - b.minutes || a.title.localeCompare(b.title));
  if (sort === "longest") return copy.sort((a, b) => b.minutes - a.minutes || a.title.localeCompare(b.title));
  if (sort === "prayer") return copy.sort((a, b) => (a.kind === "prayer" ? 0 : 1) - (b.kind === "prayer" ? 0 : 1) || a.title.localeCompare(b.title));
  return copy.sort((a, b) => a.title.localeCompare(b.title));
};

const pageTitle = (t) => `${t} — Spiritual Hunger`;

function fallbackHeroDocs(index) {
  const preferred = ["PhRhhnw1tLs", "Rp5UXvzsoaM", "sjUL0o2iG7I", "Q9OcElE8e2o", "YN9BL--Eh-g"];
  const found = preferred.map((id) => index.find((m) => m.id === id)).filter(Boolean);
  for (const m of index) {
    if (found.length >= 2) break;
    if (!found.includes(m)) found.push(m);
  }
  return found;
}

/* ============================================================
   Home
   ============================================================ */
export async function homePage() {
  const { index, collections, stats, home } = await data.core();
  const devotionals = await data.devotionals();
  const today = devotionals[dailyIndex(devotionals.length)];
  const featuredIds = [...new Set(home.featured || [])];
  const featured = featuredIds.map((id) => index.find((m) => m.id === id)).filter(Boolean).slice(0, 6);
  for (const m of index) {
    if (featured.length >= 6) break;
    if (!featured.includes(m)) featured.push(m);
  }
  const [heroMain, heroSmall] = [featured[0] || fallbackHeroDocs(index)[0], featured[1] || fallbackHeroDocs(index)[1]];
  const counts = topicCounts(index);
  const topics = ["Purpose", "Kingdom", "Prayer", "Leadership", "Marriage", "Crisis"]
    .map((t) => ({ name: t, count: counts.get(t) || 0 }))
    .filter((t) => t.count > 0);
  const preferredCollections = ["prayer-fasting", "kingdom", "purpose", "leadership", "marriage", "crisis"]
    .map((slug) => collections.find((c) => c.slug === slug))
    .filter(Boolean)
    .slice(0, 6);
  const ticker = ["Purpose", "Kingdom", "Prayer", "Faith", "Leadership", "Marriage", "Fatherhood", "Crisis", "Wisdom", "Generosity"]
    .map((t) => `<span class="ticker-item">${t}</span>`).join("");

  const content = `<main id="main">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">The prayer &amp; teaching archive</span>
          <h1 class="hero-title">Feed the<br /><em>hunger.</em></h1>
          <p class="hero-sub">Explore teachings from Dr. Myles Munroe, Apostle Joshua Selman, and other ministries — <strong>${fmt.number(stats.messages)} messages</strong> on purpose, prayer, and the life of faith, gathered in one place for your devotion.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/library">Enter the library ${icon("arrowRight")}</a>
            <a class="btn btn-ghost" href="#/devotionals/${encodeURIComponent(today.slug)}">Today's devotion ${icon("arrowRight")}</a>
          </div>
          <div class="hero-meta">
            <div><strong>${fmt.number(stats.messages)}</strong><span>Messages</span></div>
            <div><strong>${fmt.number(stats.collections)}</strong><span>Collections</span></div>
            <div><strong>${fmt.hours(stats.hours)}</strong><span>Hours of teaching</span></div>
          </div>
        </div>
        <div class="hero-visual" aria-label="Featured messages from the archive">
          <a class="arch arch-main" href="#/read/${encodeURIComponent(heroMain.id)}" aria-label="Read ${esc(heroMain.title)}">
            ${image(heroMain.id, { size: "max", alt: heroMain.title, loading: "eager", position: "62% center" })}
            <span class="arch-label"><span>From the archive</span><strong>${esc(heroMain.title)}</strong></span>
          </a>
          <a class="arch arch-small" href="#/read/${encodeURIComponent(heroSmall.id)}" aria-label="Read ${esc(heroSmall.title)}">
            ${image(heroSmall.id, { size: "max", alt: heroSmall.title, loading: "eager" })}
            <span class="arch-label"><span>Also read</span><strong>${esc(heroSmall.title)}</strong></span>
          </a>
          <div class="hero-stamp"><div><b>${fmt.number(stats.messages)}</b>messages<br />of purpose</div></div>
          <a class="hero-quote" href="#/read/${encodeURIComponent(home.quote.videoId || heroMain.id)}">
            <div class="qmark" aria-hidden="true">“</div>
            <p>${esc(home.quote.text)}</p>
            <cite>Dr. Myles Munroe</cite>
          </a>
        </div>
      </div>
    </section>

    <div class="ticker" aria-hidden="true"><div class="ticker-track">${ticker}${ticker}</div></div>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: "Today's manna",
          title: "Bread for <em>today.</em>",
          sub: `${fmt.date()} · One short reading, one Scripture, one prayer. A daily rhythm for a hungry heart.`,
          link: "#/devotionals",
          linkLabel: `All ${devotionals.length} devotionals`,
        })}
        <div class="manna reveal">
          <div class="manna-main">
            <div class="manna-top"><span class="manna-date">${fmt.date()}</span><span class="manna-day">${String(today.day).padStart(2, "0")}</span></div>
            <h2 class="manna-title">${esc(today.title)}</h2>
            <p class="manna-sub">${esc(today.subtitle)}</p>
            <div class="manna-actions">
              <a class="btn btn-primary" href="#/devotionals/${encodeURIComponent(today.slug)}">Read the devotion ${icon("arrowRight")}</a>
              <span class="pill gold">${esc(today.scripture.ref)}</span>
              <span class="pill">${esc(today.series)}</span>
            </div>
          </div>
          <div class="manna-side">
            <div class="manna-side-inner">
              <span class="eyebrow">Today's word</span>
              <p class="manna-verse">“${esc(today.scripture.text)}”</p>
              <div class="manna-ref">${esc(today.scripture.ref)} · KJV</div>
            </div>
            <div class="manna-art">
              <span class="sun-disc" aria-hidden="true">${icon("sunrise")}</span>
              <a class="link-arrow" href="#/prayer">Pray it ${icon("arrowRight")}</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="stats-band" aria-label="Library statistics">
      <div class="container stats-grid">
        <div class="stat"><strong>${fmt.number(stats.messages)}</strong><span>Messages in the archive</span></div>
        <div class="stat"><strong>${fmt.hours(stats.hours)}</strong><span>Hours of teaching</span></div>
        <div class="stat"><strong>${fmt.compact(stats.words)}</strong><span>Words transcribed</span></div>
        <div class="stat"><strong>${fmt.number(stats.scriptures)}</strong><span>Scripture threads</span></div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: "Begin with a hunger",
          title: "What is your soul <em>asking for?</em>",
          sub: "Choose a doorway. Each one opens into messages that speak to the season you are in.",
          link: "#/library",
          linkLabel: "Browse every message",
        })}
        <div class="topic-grid reveal">
          ${topics.map((t, i) => `<a class="topic-card" href="#/library?t=${encodeURIComponent(t.name)}">
            <div class="topic-top"><span class="topic-icon">${topicIcon(t.name)}</span><span class="topic-num">${String(i + 1).padStart(2, "0")}</span></div>
            <h3 class="topic-name">${esc(t.name)}</h3>
            <div class="topic-foot"><span>${fmt.number(t.count)} messages</span>${icon("arrowRight")}</div>
          </a>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: "From the archive",
          title: "Messages worth <em>returning to.</em>",
          sub: "Full transcripts, Scripture references, and a reader made for slowness.",
          link: "#/library",
          linkLabel: "Browse all messages",
        })}
        <div class="card-grid">${featured.map(messageCard).join("")}</div>
      </div>
    </section>

    ${quoteBand({ text: esc(home.quote.text), attribution: "Dr. Myles Munroe", videoId: home.quote.videoId })}

    <section class="section">
      <div class="container prayer-promo">
        <div class="timer-visual reveal" aria-hidden="true">
          <div class="timer-ring"><div class="timer-inner"><div><div class="timer-time">10:00</div><div class="timer-label">A quiet ten</div></div></div></div>
        </div>
        <div class="prayer-copy">
          <span class="eyebrow">The prayer room</span>
          <h2 class="section-title">Make room for the voice you've been <em>too full</em> to hear.</h2>
          <p class="section-sub">A guided prayer timer, ten doorways into Scripture, and a private list for the things you are carrying. No noise. No performance. Just presence.</p>
          <div class="prayer-points">
            <span class="pill">Guided prayer</span>
            <span class="pill">A quiet timer</span>
            <span class="pill">Your intentions</span>
            <span class="pill">Scripture</span>
          </div>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/prayer">Enter the prayer room ${icon("arrowRight")}</a>
            <a class="btn btn-ghost" href="#/library?t=Prayer">Prayer teachings ${icon("arrowRight")}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: "The collections",
          title: "Every room in the <em>house.</em>",
          sub: "Explore the original playlists by theme, from purpose and prayer to trusting God.",
          link: "#/collections",
          linkLabel: "See all collections",
        })}
        <div class="collection-grid">${preferredCollections.map(collectionCard).join("")}</div>
      </div>
    </section>
  </main>`;

  return { title: "Spiritual Hunger — Prayer & Teaching Library", content };
}

/* ============================================================
   Library
   ============================================================ */
export async function libraryPage(params, query) {
  const [index, collections, stats] = await Promise.all([data.index(), data.collections(), data.stats()]);
  const counts = topicCounts(index);
  const topics = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  const initial = {
    collection: query.get("c") || "",
    topic: query.get("t") || "",
    q: query.get("q") || "",
    sort: query.get("sort") || "title",
  };
  const opts = collectionOptions(collections);

  const content = `${pageHero({
    eyebrow: "The complete archive",
    title: "The <em>Library</em>",
    sub: "Every message, in one quiet room. Search by title, follow a theme, or begin with a collection. Every transcript links back to the original message.",
    stats: [
      { value: fmt.number(stats.messages), label: "Messages" },
      { value: fmt.number(stats.prayerMessages), label: "Prayer & worship" },
      { value: fmt.hours(stats.hours), label: "Hours" },
      { value: fmt.number(stats.collections), label: "Collections" },
    ],
    crumbs: [{ label: "Home", href: "#/" }, { label: "Library" }],
  })}
  <div class="library-toolbar">
    <div class="container toolbar-inner">
      <div class="filter-scroll" id="collection-filters" aria-label="Filter by collection">
        <button class="chip active" type="button" data-collection-filter="">All <span class="count">${fmt.number(index.length)}</span></button>
        ${opts.map((c) => `<button class="chip" type="button" data-collection-filter="${esc(c.slug)}">${esc(c.name)} <span class="count">${c.count}</span></button>`).join("")}
      </div>
      <div class="toolbar-right">
        <label class="filter-search">${icon("search")}<input type="search" id="library-search" placeholder="Filter title or topic" value="${esc(initial.q)}" aria-label="Filter the library" /></label>
        <div class="select-wrap">
          <select id="topic-filter" aria-label="Filter by topic">
            <option value="">All topics</option>
            ${topics.map((t) => `<option value="${esc(t)}"${initial.topic === t ? " selected" : ""}>${esc(t)}</option>`).join("")}
          </select>
        </div>
        <div class="select-wrap">
          <select id="sort-filter" aria-label="Sort messages">
            <option value="title"${initial.sort === "title" ? " selected" : ""}>A–Z</option>
            <option value="shortest"${initial.sort === "shortest" ? " selected" : ""}>Shortest read</option>
            <option value="longest"${initial.sort === "longest" ? " selected" : ""}>Longest read</option>
            <option value="prayer"${initial.sort === "prayer" ? " selected" : ""}>Prayer first</option>
          </select>
        </div>
        <span class="library-count" id="library-count">${fmt.number(index.length)} messages</span>
      </div>
    </div>
  </div>
  <main id="main" class="container library-body">
    <div class="library-head">
      <div>
        <h1 id="library-title">All messages</h1>
        <p id="library-sub">${fmt.number(index.length)} messages in this view.</p>
      </div>
    </div>
    <div class="active-filters" id="active-filters"></div>
    <div class="library-grid" id="library-grid"></div>
    <div id="library-empty" hidden></div>
    <div class="load-more-wrap"><button class="btn btn-outline" type="button" id="load-more" hidden>Load more messages ${icon("chevronDown")}</button></div>
  </main>`;

  return {
    title: pageTitle("The Library"),
    content,
    mount(root) {
      const all = index;
      const state = { ...initial, shown: 24 };
      const grid = root.querySelector("#library-grid");
      const empty = root.querySelector("#library-empty");
      const countEl = root.querySelector("#library-count");
      const titleEl = root.querySelector("#library-title");
      const subEl = root.querySelector("#library-sub");
      const filtersEl = root.querySelector("#active-filters");
      const loadMore = root.querySelector("#load-more");
      const searchInput = root.querySelector("#library-search");
      const topicSelect = root.querySelector("#topic-filter");
      const sortSelect = root.querySelector("#sort-filter");
      let debounce;

      const filterItems = () => {
        let items = all;
        if (state.collection) items = items.filter((m) => m.collections.includes(state.collection));
        if (state.topic) items = items.filter((m) => m.topics.includes(state.topic));
        if (state.q.trim()) {
          const q = state.q.trim().toLowerCase();
          items = items.filter((m) =>
            m.title.toLowerCase().includes(q) ||
            (m.topics || []).join(" ").toLowerCase().includes(q) ||
            collectionName(m.collection).toLowerCase().includes(q) ||
            (m.excerpt || "").toLowerCase().includes(q)
          );
        }
        return sortMessages(items, state.sort);
      };

      const updateUrl = () => {
        const p = new URLSearchParams();
        if (state.collection) p.set("c", state.collection);
        if (state.topic) p.set("t", state.topic);
        if (state.q.trim()) p.set("q", state.q.trim());
        if (state.sort !== "title") p.set("sort", state.sort);
        const qs = p.toString();
        history.replaceState(null, "", `#/library${qs ? `?${qs}` : ""}`);
      };

      const apply = ({ scroll = false } = {}) => {
        const items = filterItems();
        grid.innerHTML = items.slice(0, state.shown).map(messageCard).join("");
        grid.hidden = items.length === 0;
        empty.hidden = items.length !== 0;
        if (!items.length) {
          empty.innerHTML = emptyState({
            iconName: "search",
            title: "No messages in this view",
            text: "Try a different collection or topic, or clear the filters to see the whole library.",
            action: `<button class="btn btn-primary btn-sm" type="button" data-clear-all>Clear filters</button>`,
          });
        }
        countEl.textContent = `${fmt.number(items.length)} message${items.length === 1 ? "" : "s"}`;
        const c = state.collection ? collectionBySlug(state.collection, collections) : null;
        titleEl.textContent = c ? c.name : state.topic ? `${state.topic} teachings` : state.q.trim() ? "Search results" : "All messages";
        subEl.textContent = c ? `${fmt.number(items.length)} messages · ${c.blurb}` : `${fmt.number(items.length)} messages in this view.`;
        loadMore.hidden = items.length <= state.shown;
        loadMore.textContent = "Load more messages";
        loadMore.insertAdjacentHTML("beforeend", ` ${icon("chevronDown")}`);
        root.querySelectorAll("[data-collection-filter]").forEach((btn) => {
          btn.classList.toggle("active", (btn.dataset.collectionFilter || "") === state.collection);
        });
        topicSelect.value = state.topic;
        sortSelect.value = state.sort;
        const chips = [];
        if (state.collection) chips.push(`<button class="chip" type="button" data-clear-filter="collection">${esc(collectionName(state.collection))} ${icon("close")}</button>`);
        if (state.topic) chips.push(`<button class="chip" type="button" data-clear-filter="topic">${esc(state.topic)} ${icon("close")}</button>`);
        if (state.q.trim()) chips.push(`<button class="chip" type="button" data-clear-filter="q">“${esc(state.q.trim())}” ${icon("close")}</button>`);
        filtersEl.innerHTML = chips.length ? `${chips.join("")}<button class="clear" type="button" data-clear-all>Clear all</button>` : "";
        updateUrl();
        if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
      };

      root.querySelectorAll("[data-collection-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.collection = btn.dataset.collectionFilter || "";
          state.shown = 24;
          apply();
        });
      });
      topicSelect.addEventListener("change", () => {
        state.topic = topicSelect.value;
        state.shown = 24;
        apply();
      });
      sortSelect.addEventListener("change", () => {
        state.sort = sortSelect.value;
        apply();
      });
      searchInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.q = searchInput.value;
          state.shown = 24;
          apply();
        }, 180);
      });
      loadMore.addEventListener("click", () => {
        state.shown += 24;
        apply();
      });
      root.addEventListener("click", (event) => {
        const clear = event.target.closest("[data-clear-filter]");
        if (clear) {
          const field = clear.dataset.clearFilter;
          if (field === "collection") state.collection = "";
          if (field === "topic") state.topic = "";
          if (field === "q") { state.q = ""; searchInput.value = ""; }
          state.shown = 24;
          apply();
          return;
        }
        const clearAll = event.target.closest("[data-clear-all]");
        if (clearAll) {
          state.collection = "";
          state.topic = "";
          state.q = "";
          searchInput.value = "";
          state.shown = 24;
          apply();
        }
      });
      apply();
    },
  };
}

/* ============================================================
   Collection
   ============================================================ */
export async function collectionPage(slug, query = new URLSearchParams()) {
  const [index, collections] = await Promise.all([data.index(), data.collections()]);
  const c = collectionBySlug(slug, collections);
  if (!c) return notFoundPage("We could not find that collection.");
  const items = sortMessages(index.filter((m) => m.collections.includes(slug)), "title");
  const requestedSort = query.get("sort") || "newest";
  const dateSort = slug === "gospel-warrior" && ["oldest", "newest"].includes(requestedSort) ? requestedSort : "";
  if (dateSort) items.sort((a, b) => {
    const aDate = a.postedAt || a.postedOn || a.firstSeenOn;
    const bDate = b.postedAt || b.postedOn || b.firstSeenOn;
    if (!aDate || !bDate) return Number(Boolean(bDate)) - Number(Boolean(aDate));
    return dateSort === "oldest" ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
  });
  if (c.playlistOrder) items.sort((a, b) => c.playlistOrder.indexOf(a.id) - c.playlistOrder.indexOf(b.id));
  const readers = new Map(items.map(m => [m.id, m]));
  const playlistOrder = c.playlistOrder || [];
  const readableEntries = playlistOrder.filter(id => readers.has(id)).length;
  const counts = topicCounts(items);
  const topics = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const hours = Math.round(items.reduce((s, m) => s + m.minutes, 0) / 60);
  const others = collections.filter((x) => x.slug !== slug && x.count > 0).slice(0, 3);
  const perPage = slug === "gospel-warrior" ? 48 : Math.max(1, items.length);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.max(1, Math.min(pages, Number.parseInt(query.get("page"), 10) || 1));
  const baseLink = `#/collections/${encodeURIComponent(slug)}`;
  const pageLink = n => `${baseLink}?page=${n}${slug === "gospel-warrior" ? `&amp;sort=${dateSort || "title"}` : ""}`;

  const content = `${pageHero({
    eyebrow: "Collection",
    title: esc(c.name),
    sub: esc(c.blurb),
    stats: [
      { value: fmt.number(items.length), label: "Messages" },
      { value: fmt.number(hours), label: "Hours of reading" },
      { value: fmt.number(topics.length), label: "Themes" },
    ],
    crumbs: [{ label: "Home", href: "#/" }, { label: "Collections", href: "#/collections" }, { label: c.name }],
  })}
  <main id="main" class="container library-body">
    ${topics.length ? `<div class="active-filters">${topics.map(([t, n]) => `<a class="chip" href="#/library?c=${encodeURIComponent(slug)}&t=${encodeURIComponent(t)}">${esc(t)} <span class="count">${n}</span></a>`).join("")}</div>` : ""}
    <div class="library-head">
      <div>
        <h1>${esc(c.name)}</h1>
        <p>${fmt.number(items.length)} messages · ${fmt.number(hours)} hours of reading · ${esc(c.blurb)}</p>
        ${slug === "gospel-warrior" ? `<p>Browse by <a href="${baseLink}?sort=title">title</a> · <a href="${baseLink}?sort=oldest">oldest first</a> · <a href="${baseLink}?sort=newest">newest first</a></p><p>Checks for new public studies every 15 minutes.</p>` : ""}
        ${c.playlistId ? `<p>${c.devotional ? `<a href="#/devotionals/${encodeURIComponent(c.devotional)}">Read the collection devotional</a> · ` : ""}<a href="https://www.youtube.com/playlist?list=${encodeURIComponent(c.playlistId)}">YouTube playlist</a> · Transcripts for ${readableEntries} of ${playlistOrder.length} entries</p>
          <details class="playlist-contents"${readableEntries ? "" : " open"}><summary>Playlist contents in source order</summary><ol>${playlistOrder.map(id => {
            const message = readers.get(id);
            if (message) return `<li><a href="#/read/${encodeURIComponent(id)}">${esc(message.title)}</a></li>`;
            const entry = c.sourceOnly?.[id];
            if (entry?.availability === 'private' || entry?.availability === 'removed') return `<li>${entry.availability === 'private' ? 'Private video' : 'Removed video'} · ${esc(id)}</li>`;
            const title = entry?.title || c.sourceOnlyTitles?.[id];
            const reason = { 'members-only': 'Members-only video', unavailable: 'Video unavailable', 'short-caption': 'Caption too short for a reading', 'no-english-captions': 'No English captions' }[entry?.availability];
            return `<li><a href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}">${esc(title || id)}</a> · ${reason || (title ? 'Source video only' : 'No public title or transcript')}</li>`;
          }).join("")}</ol></details>` : ""}
      </div>
      <a class="link-arrow" href="#/library?c=${encodeURIComponent(slug)}">Open in library ${icon("arrowRight")}</a>
    </div>
    <div class="card-grid">${items.slice((page - 1) * perPage, page * perPage).map(messageCard).join("")}</div>
    ${pages > 1 ? `<nav class="load-more-wrap" aria-label="Collection pages">
      ${page > 1 ? `<a class="btn btn-outline" href="${pageLink(page - 1)}">Previous</a>` : ""}
      <span>Page ${page} of ${pages}</span>
      ${page < pages ? `<a class="btn btn-outline" href="${pageLink(page + 1)}">Next</a>` : ""}
    </nav>` : ""}
  </main>
  <section class="section">
    <div class="container">
      ${sectionHead({ eyebrow: "Keep exploring", title: "Other rooms in the <em>house.</em>", link: "#/collections", linkLabel: "All collections" })}
      <div class="collection-grid">${others.map(collectionCard).join("")}</div>
    </div>
  </section>`;

  return { title: pageTitle(c.name), content };
}

/* ============================================================
   Reader
   ============================================================ */
export async function readerPage(id) {
  const [index, collections] = await Promise.all([data.index(), data.collections()]);
  const doc = index.find((m) => m.id === id || m.aliases?.includes(id));
  if (!doc) return notFoundPage("We could not find that message.");
  id = doc.id;
  let text;
  try {
    text = await data.text(id);
  } catch {
    return notFoundPage("That transcript could not be loaded. Please return to the library and try again.");
  }
  const paragraphs = text.paragraphs || [];
  const related = relatedMessages(doc, index, 3);
  const saved = store.isBookmarked(id);
  const progress = store.getProgress(id);
  const size = store.readerSize();
  const source = doc.source || `https://www.youtube.com/watch?v=${id}`;
  const article = paragraphs.map((p, i) => {
    const selah = (i + 1) % 18 === 0 && i < paragraphs.length - 1 ? '<div class="selah" aria-hidden="true">· · ·</div>' : "";
    return `<p>${doc.origin === "facebook" ? esc(p).replace(/\n/g, "<br>") : esc(p)}</p>${selah}`;
  }).join("");

  const content = `<main id="main" class="reader-page" data-reader-id="${esc(id)}">
    <div class="reading-progress" id="reading-progress" aria-hidden="true"></div>
    <header class="reader-header">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a><span class="sep">/</span><a href="#/library">Library</a><span class="sep">/</span><span>${esc(collectionName(doc.collection))}</span></nav>
        <div class="reader-head-grid">
          <div>
            <span class="eyebrow">${esc(collectionName(doc.collection))}</span>
            <h1 class="reader-title">${esc(doc.title)}</h1>
            <div class="reader-meta">
              <span>${esc(sourceLabel(doc))}</span><span class="dot"></span>
              ${doc.postedOn ? `<time datetime="${esc(doc.postedOn)}">${esc(doc.postedOn)}</time><span class="dot"></span>` : ""}
              ${!doc.postedOn && doc.firstSeenOn ? `<span>First seen ${esc(doc.firstSeenOn)}</span><span class="dot"></span>` : ""}
              <span>${fmt.minutes(doc.minutes)}</span><span class="dot"></span>
              <span>${fmt.number(doc.words)} words</span><span class="dot"></span>
              <span>${doc.kind === "prayer" ? "Prayer & worship" : "Teaching"}</span>
            </div>
            <div class="reader-topics">${(doc.topics || []).map((t) => `<a class="tag" href="#/library?t=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>
          </div>
          <div class="reader-actions">
            <div class="font-controls" aria-label="Text size">
              <button type="button" data-font-size="sm" class="${size === "sm" ? "active" : ""}" aria-label="Small text">A</button>
              <button type="button" data-font-size="md" class="${size === "md" ? "active" : ""}" aria-label="Medium text">A</button>
              <button type="button" data-font-size="lg" class="${size === "lg" ? "active" : ""}" aria-label="Large text">A</button>
            </div>
            <button class="btn-icon${saved ? " is-active" : ""}" type="button" data-save="${esc(id)}" aria-pressed="${saved}" aria-label="${saved ? "Remove bookmark" : "Bookmark this message"}">${icon(saved ? "bookmarkFill" : "bookmark")}</button>
            <button class="btn-icon" type="button" data-share data-title="${esc(doc.title)}" aria-label="Share this message">${icon("share")}</button>
            <a class="btn-icon" href="${source}" target="_blank" rel="noopener noreferrer" aria-label="Open the original post">${icon(doc.origin === "facebook" ? "external" : "youtube")}</a>
          </div>
        </div>
      </div>
    </header>
    <div class="container reader-layout">
      <article class="reader-article" id="reader-article" data-reader-article>
        ${article}
        <div class="reader-end">
          <span class="eyebrow">Continue the study</span>
          <h3>${related[0] ? esc(related[0].title) : "Return to the library"}</h3>
          <p>${related[0] ? "A message that shares a thread with this one — follow it, or take your time and browse the whole archive." : "There are hundreds more messages waiting in the library."}</p>
          <div class="reader-end-actions">
            ${related[0] ? `<a class="btn btn-primary" href="#/read/${encodeURIComponent(related[0].id)}">Read next ${icon("arrowRight")}</a>` : ""}
            <a class="btn btn-outline" href="#/library">Browse the library</a>
          </div>
          <p class="reader-source-note">${doc.origin === "facebook"
            ? "This study comes from a public Facebook post, reproduced with the social-media calls to action and promotions removed."
            : (text.translated ? "These captions are machine-translated into English." : "This transcript comes from public YouTube captions.")}
            Check the original for wording. <a href="${source}" target="_blank" rel="noopener noreferrer">${doc.origin === "facebook" ? "Read the original post on Facebook" : `Watch “${esc(doc.title)}” on YouTube`} ${icon("external")}</a>.</p>
        </div>
      </article>
      <aside class="reader-sidebar">
        ${text.practice ? `<div class="sidebar-card"><span class="eyebrow">Devotional practice</span><p>${esc(text.practice)}</p><a href="#/devotionals/${id === 'LtUd_MuMx7Y' ? 'held-in-the-waiting' : collections.find(c => c.devotional && doc.collections.includes(c.slug)).devotional}">Read the devotional</a></div>` : ""}
        <div class="sidebar-card">
          <div class="reader-thumb">
            ${mediaHtml(doc, { alt: doc.title, size: "hq" })}
            ${doc.thumb === "" ? "" : `<a href="${source}" target="_blank" rel="noopener noreferrer" aria-label="Watch the original message"><span class="play">${icon("play")}</span></a>`}
          </div>
          <div class="source-title">${esc(doc.title)}</div>
          <div class="source-sub">${esc(collectionName(doc.collection))} · ${fmt.minutes(doc.minutes)}</div>
          <div class="sidebar-actions">
            <a class="btn btn-primary btn-sm" href="${source}" target="_blank" rel="noopener noreferrer">${doc.origin === "facebook" ? "Read source" : "Watch source"} ${icon("external")}</a>
            ${progress && progress.pct > 2 ? `<button class="btn btn-outline btn-sm" type="button" data-resume="${progress.pct}">Resume ${progress.pct}%</button>` : ""}
          </div>
        </div>
        ${doc.scriptureRefs && doc.scriptureRefs.length ? `<div class="sidebar-card">
          <h4>Scriptures in this message</h4>
          <div class="scripture-list">${doc.scriptureRefs.map((r) => `<span class="scripture-chip">${esc(r)}</span>`).join("")}</div>
        </div>` : ""}
        <div class="sidebar-card">
          <h4>Related messages</h4>
          <div class="related-list">
            ${related.map((m) => `<a class="related-item" href="#/read/${encodeURIComponent(m.id)}">${mediaHtml(m, { alt: m.title })}<div><div class="rt">${esc(m.title)}</div><div class="rc">${esc(collectionName(m.collection))}</div></div></a>`).join("")}
          </div>
        </div>
        <div class="sidebar-card">
          <h4>A quiet note</h4>
          <p style="font-size:11px;line-height:1.65;color:var(--muted)">Read slowly. The transcript is here to serve the message, not replace it. If a sentence stops you, sit with it before moving on.</p>
        </div>
      </aside>
    </div>
  </main>`;

  return {
    title: pageTitle(doc.title),
    content,
    mount(root) {
      root.querySelectorAll("[data-font-size]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const next = btn.dataset.fontSize;
          store.setReaderSize(next);
          root.querySelectorAll("[data-font-size]").forEach((b) => b.classList.toggle("active", b.dataset.fontSize === next));
        });
      });
      const resume = root.querySelector("[data-resume]");
      if (resume) {
        resume.addEventListener("click", () => {
          const pct = Number(resume.dataset.resume) || 0;
          const article = root.querySelector("[data-reader-article]");
          if (!article) return;
          const y = article.offsetTop + (article.offsetHeight * pct) / 100;
          window.scrollTo({ top: y, behavior: "smooth" });
        });
      }
    },
  };
}

/* ============================================================
   Devotionals
   ============================================================ */
export async function devotionalsPage() {
  const devotionals = await data.devotionals();
  const today = devotionals[dailyIndex(devotionals.length)];
  const series = [...new Set(devotionals.map((d) => d.series))];

  const content = `${pageHero({
    eyebrow: "Daily bread",
    title: "A table set for <em>today.</em>",
    sub: "Twenty-one short readings for a hungry heart. Each one begins with Scripture, sits with a thought from the archive, and ends with a prayer you can actually pray.",
    stats: [
      { value: fmt.number(devotionals.length), label: "Devotions" },
      { value: fmt.number(series.length), label: "Series" },
      { value: "KJV", label: "Scripture" },
    ],
    crumbs: [{ label: "Home", href: "#/" }, { label: "Devotionals" }],
  })}
  <main id="main">
    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: `Today · ${fmt.date()}`,
          title: "Begin with <em>today's</em> bread.",
          sub: "One reading, one Scripture, one prayer. Come back tomorrow for the next.",
          link: "#/devotionals",
          linkLabel: "The full table",
        })}
        <div class="devotional-feature reveal">
          <div class="devotional-feature-main">
            <div class="manna-top"><span class="manna-date">Day ${String(today.day).padStart(2, "0")} · ${esc(today.series)}</span><span class="manna-day">${String(today.day).padStart(2, "0")}</span></div>
            <h2 class="manna-title">${esc(today.title)}</h2>
            <p class="manna-sub">${esc(today.subtitle)}</p>
            <div class="manna-actions">
              <a class="btn btn-primary" href="#/devotionals/${encodeURIComponent(today.slug)}">Read the devotion ${icon("arrowRight")}</a>
              <span class="pill gold">${esc(today.scripture.ref)}</span>
            </div>
          </div>
          <div class="devotional-feature-side">
            <span class="cross" aria-hidden="true">${icon("cross")}</span>
            <p class="verse">“${esc(today.scripture.text)}”</p>
            <div class="ref">${esc(today.scripture.ref)} · KJV</div>
          </div>
        </div>
      </div>
    </section>
    <section class="section-sm">
      <div class="container">
        ${sectionHead({ eyebrow: "The full table", title: "Twenty-one days of <em>daily bread.</em>", sub: "Read in order, or begin wherever your hunger is." })}
        <div class="devotional-grid">${devotionals.map(devotionalCard).join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="prayer-side-card" style="max-width:820px;margin-inline:auto;padding:44px 46px">
          <span class="eyebrow" style="color:var(--gold-2)">A rhythm, not a race</span>
          <h3 style="margin-top:14px;font-size:clamp(28px,3.4vw,40px);max-width:18ch">Read. Reflect. Pray. Practice.</h3>
          <p style="max-width:54ch;font-size:13px">Each devotion follows the same four movements: a Scripture to steady you, a reflection to sit with, a prayer to pray in your own words, and one small practice to carry into the day.</p>
          <a class="link-arrow" href="#/prayer">Take it into the prayer room ${icon("arrowRight")}</a>
        </div>
      </div>
    </section>
  </main>`;

  return { title: pageTitle("Daily Devotionals"), content };
}

export async function devotionalPage(slug) {
  const [devotionals, index] = await Promise.all([data.devotionals(), data.index()]);
  const d = devotionals.find((x) => x.slug === slug);
  if (!d) return notFoundPage("We could not find that devotion.");
  const i = devotionals.indexOf(d);
  const prev = devotionals[(i - 1 + devotionals.length) % devotionals.length];
  const next = devotionals[(i + 1) % devotionals.length];
  const saved = store.isDevotionalSaved(slug);
  const related = (d.related || []).map((r) => index.find((m) => m.id === r.id)).filter(Boolean).slice(0, 3);
  const words = [...(d.reflection || []), d.prayer, d.practice].join(" ").split(/\s+/).length;
  const read = Math.max(3, Math.round(words / 200) + 2);
  const quote = d.quote && d.quote.text ? `<figure class="quote-card">
    <blockquote class="quote-card-text">“${esc(d.quote.text)}”</blockquote>
    <figcaption class="quote-card-meta">Dr. Myles Munroe · <a href="${d.quote.source || `https://www.youtube.com/watch?v=${d.quote.videoId}`}" target="_blank" rel="noopener noreferrer">${esc(d.quote.videoTitle || "From the archive")} ${icon("external")}</a></figcaption>
  </figure>` : "";

  const content = `<main id="main" class="devotional-page">
    <header class="devotional-header container-narrow">
      <nav class="breadcrumb" style="justify-content:center;color:var(--muted)" aria-label="Breadcrumb"><a href="#/">Home</a><span class="sep">/</span><a href="#/devotionals">Devotionals</a><span class="sep">/</span><span>Day ${String(d.day).padStart(2, "0")}</span></nav>
      <span class="eyebrow">Day ${String(d.day).padStart(2, "0")} · ${esc(d.series)}</span>
      <h1>${esc(d.title)}</h1>
      <p class="sub">${esc(d.subtitle)}</p>
      <div class="devotional-meta"><span>${esc(d.scripture.ref)}</span><span class="dot"></span><span>${read} min read</span><span class="dot"></span><span>KJV</span></div>
      <div class="reader-actions" style="justify-content:center;margin-top:20px">
        <button class="btn btn-outline btn-sm${saved ? " is-saved" : ""}" type="button" data-save-devotional="${esc(d.slug)}" aria-pressed="${saved}">${icon(saved ? "bookmarkFill" : "bookmark")} ${saved ? "Saved" : "Save devotion"}</button>
        <button class="btn btn-outline btn-sm" type="button" data-share data-title="${esc(d.title)}">${icon("share")} Share</button>
      </div>
    </header>
    <article class="devotional-body container-narrow">
      <div class="scripture-block">
        <div class="label">Today's Scripture · ${esc(d.scripture.ref)}</div>
        <p>“${esc(d.scripture.text)}”</p>
        <cite>King James Version</cite>
      </div>
      <div class="reflection">${(d.reflection || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      ${quote}
      <div class="prayer-box">
        <h3>Pray it</h3>
        <p>${esc(d.prayer)}</p>
      </div>
      <div class="practice-box">
        <span class="practice-icon">${icon("sunrise")}</span>
        <div><h4>Practice for today</h4><p>${esc(d.practice)}</p></div>
      </div>
      ${related.length ? `<section style="margin-top:48px">
        <span class="eyebrow">Go deeper</span>
        <h2 class="section-title" style="font-size:32px;margin:10px 0 22px">From the <em>archive.</em></h2>
        <div class="card-grid" style="grid-template-columns:repeat(3,1fr)">${related.map(messageCard).join("")}</div>
      </section>` : ""}
      <nav class="dev-nav" aria-label="Devotional navigation">
        <a href="#/devotionals/${encodeURIComponent(prev.slug)}"><span class="label">Previous · Day ${String(prev.day).padStart(2, "0")}</span><span class="title">${esc(prev.title)}</span></a>
        <a class="next" href="#/devotionals/${encodeURIComponent(next.slug)}"><span class="label">Next · Day ${String(next.day).padStart(2, "0")}</span><span class="title">${esc(next.title)}</span></a>
      </nav>
      <div style="text-align:center;margin-top:34px"><a class="link-arrow" href="#/devotionals">All devotionals ${icon("arrowRight")}</a></div>
    </article>
  </main>`;

  return { title: pageTitle(d.title), content };
}

/* ============================================================
   Prayer room
   ============================================================ */
export async function prayerPage() {
  const [themes, stats, collections] = await Promise.all([data.prayer(), data.stats(), data.collections()]);
  const fasting = collections.find((c) => c.slug === "prayer-fasting");
  const times = [5, 10, 15, 20, 30];
  const prompts = [
    "Be still, and know that I am God.",
    "Adore Him before you ask Him.",
    "Name what you are carrying. Release it.",
    "Give thanks for one thing you can see.",
    "Ask boldly. Then listen.",
    "Let your words become fewer, and your attention deeper.",
  ];

  const content = `${pageHero({
    eyebrow: "The prayer room",
    title: "Be still. <em>He is here.</em>",
    sub: "A quiet timer, ten guided doorways into Scripture, and a private place for the intentions you are carrying. Come as you are; you do not have to perform.",
    stats: [
      { value: fmt.number(themes.length), label: "Guided prayers" },
      { value: "5–30", label: "Minute timer" },
      { value: fmt.number(stats.prayerMessages), label: "Prayer messages" },
    ],
    crumbs: [{ label: "Home", href: "#/" }, { label: "Prayer" }],
  })}
  <main id="main">
    <section class="section-sm">
      <div class="container">
        <div class="prayer-timer-card reveal" id="prayer-timer-card">
          <span class="eyebrow" style="justify-content:center">A quiet timer</span>
          <h2 class="section-title" style="margin-top:12px">Make room for <em>ten minutes.</em></h2>
          <p class="section-sub" style="margin-inline:auto;text-align:center">Choose a length, press begin, and stay. The timer will keep the time so you can keep your attention on God.</p>
          <div class="timer-controls" role="group" aria-label="Prayer length">
            ${times.map((t) => `<button class="time-option${t === 10 ? " active" : ""}" type="button" data-seconds="${t * 60}">${t} min</button>`).join("")}
          </div>
          <div class="timer-display">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="ring-bg" cx="50" cy="50" r="46" pathLength="100"></circle>
              <circle class="ring-fg" id="timer-ring" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"></circle>
            </svg>
            <div>
              <div class="timer-number" id="timer-number">10:00</div>
              <div class="timer-state" id="timer-state">Ready</div>
            </div>
          </div>
          <div class="timer-prompt" id="timer-prompt">Be still, and know that I am God.</div>
          <div class="timer-actions">
            <button class="btn btn-primary" type="button" id="timer-toggle">${icon("play")} Begin</button>
            <button class="btn btn-outline" type="button" id="timer-reset">${icon("rotate")} Reset</button>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        ${sectionHead({
          eyebrow: "Guided prayer",
          title: "Ten doorways into <em>Scripture.</em>",
          sub: "Open a doorway and pray through it. Each one gives you a verse to steady you and a few simple movements to follow.",
        })}
        <div class="prayer-themes">
          ${themes.map((t) => `<article class="prayer-theme" data-theme="${esc(t.slug)}">
            <button class="theme-head" type="button" data-prayer-theme="${esc(t.slug)}" aria-expanded="false">
              <span class="theme-icon">${icon(t.icon || "flame")}</span>
              <span><span class="theme-title">${esc(t.name)}</span><span class="theme-focus">${esc(t.focus)}</span></span>
              <span class="theme-chevron">${icon("chevronDown")}</span>
            </button>
            <div class="theme-body">
              <div class="theme-verse">“${esc(t.scripture.text)}”<span>${esc(t.scripture.ref)} · KJV</span></div>
              <ul class="theme-points">${(t.points || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
              <div class="theme-prompt">Breath prayer · <b>${esc(t.prompt)}</b></div>
            </div>
          </article>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container prayer-layout">
        <div class="intention-panel">
          <h3>Your prayer list</h3>
          <p class="sub">Private to this device. Add what you are carrying, mark it answered, and keep returning.</p>
          <form class="intention-form" data-intention-form>
            <input type="text" maxlength="400" placeholder="What are you bringing to God?" aria-label="Add a prayer intention" data-intention-input />
            <button type="submit" aria-label="Add intention">${icon("plus")}</button>
          </form>
          <div class="intention-list" id="intention-list"></div>
          <div class="intention-count" id="intention-count"></div>
        </div>
        <div>
          <div class="prayer-side-card">
            <span class="eyebrow" style="color:var(--gold-2)">A fasting prayer</span>
            <h3 style="margin-top:12px">“Is not this the fast that I have chosen?”</h3>
            <p>Prayer and fasting are not a performance. They are a way of making room — for the voice of God, for the needs of others, for a heart that has grown too full of itself.</p>
            <a class="link-arrow" href="#/collections/prayer-fasting">Prayer &amp; Fasting collection ${icon("arrowRight")}</a>
          </div>
          <div class="sidebar-card" style="margin-top:16px">
            <h4>Prayer & fasting</h4>
            <div class="scripture-list">${fasting ? `<span class="scripture-chip">${fasting.count} messages</span>` : ""}<span class="scripture-chip">Isaiah 58:6</span><span class="scripture-chip">Matthew 6:6</span></div>
            <p style="margin-top:12px;font-size:11px;line-height:1.65;color:var(--muted)">The prayer list is stored only in your browser. Nothing is sent anywhere.</p>
          </div>
        </div>
      </div>
    </section>
  </main>`;

  return {
    title: pageTitle("The Prayer Room"),
    content,
    mount(root) {
      const card = root.querySelector("#prayer-timer-card");
      const number = root.querySelector("#timer-number");
      const ring = root.querySelector("#timer-ring");
      const stateEl = root.querySelector("#timer-state");
      const promptEl = root.querySelector("#timer-prompt");
      const toggle = root.querySelector("#timer-toggle");
      const reset = root.querySelector("#timer-reset");
      const options = [...root.querySelectorAll("[data-seconds]")];
      let total = 600;
      let remaining = 600;
      let running = false;
      let interval = null;

      const paint = () => {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        number.textContent = `${m}:${String(s).padStart(2, "0")}`;
        ring.style.strokeDashoffset = String(100 * (1 - remaining / total));
        stateEl.textContent = running ? "Praying" : remaining === 0 ? "Amen" : remaining === total ? "Ready" : "Paused";
        toggle.innerHTML = running ? `${icon("pause")} Pause` : remaining === 0 ? `${icon("rotate")} Begin again` : `${icon("play")} Begin`;
        card.style.borderColor = running ? "var(--gold)" : "";
      };
      const chime = () => {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 528;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 2.5);
        } catch { /* audio is optional */ }
      };
      const finish = () => {
        running = false;
        clearInterval(interval);
        interval = null;
        remaining = 0;
        stateEl.textContent = "Amen";
        promptEl.textContent = "Amen. Sit still for a moment.";
        paint();
        chime();
        window.dispatchEvent(new CustomEvent("sh:toast", { detail: { message: "Amen. Take a moment of silence." } }));
      };
      const tick = () => {
        if (remaining <= 0) { finish(); return; }
        remaining -= 1;
        const elapsed = total - remaining;
        promptEl.textContent = prompts[Math.floor(elapsed / 20) % prompts.length];
        if (remaining <= 0) finish();
        else paint();
      };
      const pause = () => {
        running = false;
        clearInterval(interval);
        interval = null;
        paint();
      };
      const start = () => {
        if (running) { pause(); return; }
        if (remaining <= 0) remaining = total;
        running = true;
        promptEl.textContent = prompts[Math.floor((total - remaining) / 20) % prompts.length];
        interval = setInterval(tick, 1000);
        paint();
      };
      const setTime = (seconds) => {
        pause();
        total = seconds;
        remaining = seconds;
        promptEl.textContent = prompts[0];
        paint();
      };
      toggle.addEventListener("click", start);
      reset.addEventListener("click", () => setTime(total));
      options.forEach((opt) => {
        opt.addEventListener("click", () => {
          options.forEach((o) => o.classList.toggle("active", o === opt));
          setTime(Number(opt.dataset.seconds) || 600);
        });
      });
      paint();

      root.querySelectorAll("[data-prayer-theme]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const article = btn.closest(".prayer-theme");
          const open = article.classList.toggle("open");
          btn.setAttribute("aria-expanded", String(open));
        });
      });

      const listEl = root.querySelector("#intention-list");
      const countEl = root.querySelector("#intention-count");
      const form = root.querySelector("[data-intention-form]");
      const input = root.querySelector("[data-intention-input]");
      const renderList = () => {
        const list = store.prayerList();
        if (!list.length) {
          listEl.innerHTML = `<p class="intention-empty">Your list is quiet. Add the first thing you want to bring before God.</p>`;
        } else {
          listEl.innerHTML = list.map((item) => `<div class="intention${item.done ? " done" : ""}" data-intention-id="${esc(item.id)}">
            <button class="check" type="button" data-intention-toggle="${esc(item.id)}" aria-label="${item.done ? "Mark as still praying" : "Mark as answered"}">${icon("check")}</button>
            <span class="text">${esc(item.text)}</span>
            <button class="delete" type="button" data-intention-delete="${esc(item.id)}" aria-label="Remove intention">${icon("trash")}</button>
          </div>`).join("");
        }
        const done = list.filter((x) => x.done).length;
        countEl.textContent = list.length ? `${list.length} intention${list.length === 1 ? "" : "s"} · ${done} answered` : "";
      };
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const item = store.addIntention(input.value);
        if (item) {
          input.value = "";
          renderList();
          window.dispatchEvent(new CustomEvent("sh:toast", { detail: { message: "Added to your prayer list." } }));
        }
      });
      listEl.addEventListener("click", (event) => {
        const toggleBtn = event.target.closest("[data-intention-toggle]");
        if (toggleBtn) {
          store.toggleIntention(toggleBtn.dataset.intentionToggle);
          renderList();
          return;
        }
        const del = event.target.closest("[data-intention-delete]");
        if (del) {
          store.removeIntention(del.dataset.intentionDelete);
          renderList();
        }
      });
      renderList();

      return () => {
        if (interval) clearInterval(interval);
      };
    },
  };
}

/* ============================================================
   Collections index
   ============================================================ */
export async function collectionsPage() {
  const [collections, stats] = await Promise.all([data.collections(), data.stats()]);
  const active = collections.filter((c) => c.count > 0 || c.playlistId);
  const archive = active.filter((c) => !c.playlistId);
  const playlists = active.filter((c) => c.playlistId);
  const content = `${pageHero({
    eyebrow: "The collections",
    title: "Every room in the <em>house.</em>",
    sub: "Browse the teachings in their original playlist groupings. Choose a theme for today or work through a series in order.",
    stats: [
      { value: fmt.number(active.length), label: "Collections" },
      { value: fmt.number(stats.messages), label: "Messages" },
      { value: fmt.hours(stats.hours), label: "Hours" },
    ],
    crumbs: [{ label: "Home", href: "#/" }, { label: "Collections" }],
  })}
  <main id="main">
    <section class="section">
      <div class="container">
        ${sectionHead({ eyebrow: "The Munroe archive", title: "Where would you like to <em>begin?</em>", sub: "The original teaching collections, gathered by theme. Start anywhere; the whole archive is open." })}
        <div class="collection-grid">${archive.map(collectionCard).join("")}</div>
      </div>
    </section>
    <section class="section-sm">
      <div class="container">
        ${sectionHead({ eyebrow: "Curated playlists", title: "Teachings in their <em>original order.</em>", sub: "Ministry playlists kept as they were published, alongside the readers available for each entry." })}
        <div class="collection-grid">${playlists.map(collectionCard).join("")}</div>
      </div>
    </section>
  </main>`;

  return { title: pageTitle("Collections"), content };
}

/* ============================================================
   Saved
   ============================================================ */
export async function savedPage(params, query) {
  const [index, devotionals] = await Promise.all([data.index(), data.devotionals()]);
  const bookmarks = store.bookmarks().map((id) => index.find((m) => m.id === id)).filter(Boolean);
  const savedDev = store.savedDevotionals().map((slug) => devotionals.find((d) => d.slug === slug)).filter(Boolean);
  const continueItems = store.continueReading(12).map((p) => ({ ...p, doc: index.find((m) => m.id === p.id) })).filter((p) => p.doc);
  const initialTab = query.get("tab") || (bookmarks.length ? "messages" : continueItems.length ? "continue" : savedDev.length ? "devotionals" : "messages");

  const content = `${pageHero({
    eyebrow: "Your quiet place",
    title: "Saved & <em>unfinished.</em>",
    sub: "The messages you have bookmarked, the devotions you want to return to, and the places where you left off reading. All of it stays on this device.",
    stats: [
      { value: fmt.number(bookmarks.length), label: "Saved messages" },
      { value: fmt.number(savedDev.length), label: "Saved devotions" },
      { value: fmt.number(continueItems.length), label: "In progress" },
    ],
    crumbs: [{ label: "Home", href: "#/" }, { label: "Saved" }],
  })}
  <main id="main" class="container library-body">
    <div class="saved-tabs" role="tablist" aria-label="Saved sections">
      <button class="saved-tab${initialTab === "messages" ? " active" : ""}" type="button" role="tab" data-saved-tab="messages" aria-selected="${initialTab === "messages"}">Messages <span class="count">${bookmarks.length}</span></button>
      <button class="saved-tab${initialTab === "devotionals" ? " active" : ""}" type="button" role="tab" data-saved-tab="devotionals" aria-selected="${initialTab === "devotionals"}">Devotions <span class="count">${savedDev.length}</span></button>
      <button class="saved-tab${initialTab === "continue" ? " active" : ""}" type="button" role="tab" data-saved-tab="continue" aria-selected="${initialTab === "continue"}">Continue reading <span class="count">${continueItems.length}</span></button>
    </div>
    <section data-saved-panel="messages" ${initialTab === "messages" ? "" : "hidden"}>
      ${bookmarks.length ? `<div class="card-grid">${bookmarks.map(messageCard).join("")}</div>` : emptyState({
        iconName: "bookmark",
        title: "No saved messages yet",
        text: "Tap the bookmark on any message and it will wait for you here.",
        action: `<a class="btn btn-primary btn-sm" href="#/library">Browse the library ${icon("arrowRight")}</a>`,
      })}
    </section>
    <section data-saved-panel="devotionals" ${initialTab === "devotionals" ? "" : "hidden"}>
      ${savedDev.length ? `<div class="devotional-grid">${savedDev.map(devotionalCard).join("")}</div>` : emptyState({
        iconName: "sunrise",
        title: "No saved devotions yet",
        text: "Save a devotion and return to it when you need a slower morning.",
        action: `<a class="btn btn-primary btn-sm" href="#/devotionals">Open the devotionals ${icon("arrowRight")}</a>`,
      })}
    </section>
    <section data-saved-panel="continue" ${initialTab === "continue" ? "" : "hidden"}>
      ${continueItems.length ? `<div class="continue-grid">${continueItems.map((p) => `<a class="continue-card" href="#/read/${encodeURIComponent(p.doc.id)}">
          ${mediaHtml(p.doc, { alt: p.doc.title })}
        <div style="min-width:0"><h4>${esc(p.doc.title)}</h4><div class="meta">${esc(collectionName(p.doc.collection))} · ${p.pct}% read</div><div class="progress-track"><span style="width:${p.pct}%"></span></div></div>
      </a>`).join("")}</div>` : emptyState({
        iconName: "bookOpen",
        title: "Nothing in progress",
        text: "Open a message and start reading. We will keep your place, quietly, on this device.",
        action: `<a class="btn btn-primary btn-sm" href="#/library">Find something to read ${icon("arrowRight")}</a>`,
      })}
    </section>
  </main>`;

  return {
    title: pageTitle("Saved"),
    content,
    mount(root) {
      const tabs = [...root.querySelectorAll("[data-saved-tab]")];
      const panels = [...root.querySelectorAll("[data-saved-panel]")];
      const activate = (name) => {
        tabs.forEach((t) => {
          const on = t.dataset.savedTab === name;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", String(on));
        });
        panels.forEach((p) => { p.hidden = p.dataset.savedPanel !== name; });
        history.replaceState(null, "", `#/saved?tab=${encodeURIComponent(name)}`);
      };
      tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.savedTab)));
    },
  };
}

/* ============================================================
   About
   ============================================================ */
export async function aboutPage() {
  const { stats, collections } = await data.core();
  const content = `${pageHero({
    eyebrow: "About the library",
    title: "A library for the <em>hungry.</em>",
    sub: "Spiritual Hunger is an independent reading room built from the teaching archive of Dr. Myles Munroe — a place to slow down, follow the Scriptures, and return to the Word.",
    crumbs: [{ label: "Home", href: "#/" }, { label: "About" }],
  })}
  <main id="main" class="container about-hero">
    <div class="about-layout">
      <div class="about-body">
        <p class="lead">“The greatest tragedy in life is not death, but a life without purpose.”</p>
        <p>That sentence has travelled further than most sermons. It is the reason this library exists: not to collect content, but to help a hungry heart find its way back to purpose, prayer, and the Kingdom of God.</p>
        <p>Dr. Myles Munroe (1954–2014) was a Bahamian teacher, author, and pastor whose work reached millions. He founded Bahamas Faith Ministries International and wrote widely on purpose, potential, leadership, marriage, and the Kingdom. His teaching was marked by a single conviction: every person was created with a purpose, and that purpose is discovered in relationship with God.</p>
        <h2>What you'll find here</h2>
        <p><strong>${fmt.number(stats.messages)} messages</strong> across <strong>${fmt.number(stats.collections)} collections</strong>, gathered from Munroe Global and other public ministry playlists. Each reader links to the original video. Alongside the archive are daily devotions and a prayer room with guided prayers and a private prayer list.</p>
        <p>This is not a replacement for your local church, your Bible, or your own conversation with God. It is a study aid — a quiet room where you can read slowly and take what you learn into prayer.</p>
        <h2>How to use it</h2>
        <p><strong>Read.</strong> Begin with a collection or a topic. The reader is designed for long-form attention: no autoplay, no feed, no hurry.</p>
        <p><strong>Reflect.</strong> Open the daily devotions. Each one gives you a Scripture, a short reflection, a prayer, and one practice for the day.</p>
        <p><strong>Pray.</strong> Use the prayer room timer, pray through one of the guided themes, or write down what you are carrying. The list stays on your device.</p>
        <h2>A note on the transcripts</h2>
        <p>Transcripts come from YouTube's public captions and are cleaned into paragraphs. Names, punctuation, and phrasing may contain errors. Every reader links to the original video. This site is an independent study project and is not affiliated with the featured ministries.</p>
        <p>Scripture quotations are from the King James Version, which is in the public domain. The design, reading experience, devotionals, and prayer guides were created for this library.</p>
        <h2>Sources & credits</h2>
        <p>With gratitude to <a href="https://www.munroeglobal.com" target="_blank" rel="noopener noreferrer">Munroe Global</a> for preserving and sharing this teaching archive. You can watch the original messages on the <a href="https://www.youtube.com/@MunroeGlobal" target="_blank" rel="noopener noreferrer">Munroe Global YouTube channel</a>.</p>
        <p>The site is open source. You can find the code and data pipeline on <a href="https://github.com/tianabizna-ctrl/Spiritual-Hunger" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
      </div>
      <aside class="about-aside">
        <div class="bio-card">
          ${image("PhRhhnw1tLs", { size: "max", alt: "Dr. Myles Munroe", loading: "eager" })}
          <h3>Dr. Myles Munroe</h3>
          <p>Teacher · Author · Founder of Bahamas Faith Ministries International · 1954–2014</p>
        </div>
        <div class="about-stats">
          <div><strong>${fmt.number(stats.messages)}</strong><span>Messages</span></div>
          <div><strong>${fmt.number(stats.collections)}</strong><span>Collections</span></div>
          <div><strong>${fmt.hours(stats.hours)}</strong><span>Hours</span></div>
          <div><strong>${fmt.compact(stats.words)}</strong><span>Words</span></div>
        </div>
        <div class="about-note">A study library, made with reverence. Every transcript links to its original message. Captions are machine-generated and may contain errors.</div>
        <a class="btn btn-outline" href="#/library">Enter the library ${icon("arrowRight")}</a>
      </aside>
    </div>
  </main>`;

  return { title: pageTitle("About"), content };
}

/* ============================================================
   404
   ============================================================ */
export function notFoundPage(message = "The page you are looking for has wandered off.") {
  const content = `<main id="main" class="error-page">
    <div class="container">
      <div class="error-code" aria-hidden="true">404</div>
      <h1>A quiet dead end.</h1>
      <p>${esc(message)}</p>
      <div class="hero-actions" style="justify-content:center">
        <a class="btn btn-primary" href="#/">Return home ${icon("arrowRight")}</a>
        <a class="btn btn-outline" href="#/library">Browse the library</a>
      </div>
    </div>
  </main>`;
  return { title: pageTitle("Not found"), content };
}
