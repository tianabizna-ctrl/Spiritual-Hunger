/* Shared view components. */

import { icon, logoMark, TOPIC_ICONS } from "./icons.js";
import { esc, fmt, image, thumb } from "./data.js";
import { store } from "./store.js";

export const COLLECTION_NAMES = {
  "media-content": "Media Content",
  animated: "Animated Teachings",
  "prayer-fasting": "Prayer & Fasting",
  "men-fatherhood": "Men & Fatherhood",
  marriage: "Marriage & Relationships",
  success: "Success",
  leadership: "Leadership",
  kingdom: "Kingdom",
  purpose: "Purpose",
  crisis: "Crisis Management",
  general: "General Teachings",
  available: "Available Teachings",
  "short-messages": "Short Messages",
  "feeling-lost": "Feeling lost",
  "morning-prayer": "Morning Prayer",
  selman: "Apostle Joshua Selman Messages",
  "selman-december": "Joshua Selman: December",
  mindset: "Mindset & Mind Transformation",
  "focus-on-god": "Focus on God",
  "holy-spirit": "The Holy Spirit",
};

export function collectionName(slug) {
  return COLLECTION_NAMES[slug] || String(slug || "").replace(/-/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
}

export function sourceLabel(message) {
  if (message.channel) return `Channel: ${message.channel}`;
  return ['selman', 'feeling-lost', 'morning-prayer'].includes(message.collection) ? 'Joshua Selman collection' : 'Dr. Myles Munroe';
}

export function topicIcon(topic) {
  return icon(TOPIC_ICONS[topic] || "sparkle");
}

export function logo(size = "") {
  return `<a class="logo" href="#/" aria-label="Spiritual Hunger — home">
    <span class="logo-mark">${logoMark}</span>
    <span class="logo-text">Spiritual Hunger<small>A prayer &amp; devotional library</small></span>
  </a>`;
}

const NAV = [
  { key: "library", label: "Library", href: "#/library" },
  { key: "devotionals", label: "Devotionals", href: "#/devotionals" },
  { key: "prayer", label: "Prayer", href: "#/prayer" },
  { key: "collections", label: "Collections", href: "#/collections" },
  { key: "saved", label: "Saved", href: "#/saved" },
];

export function header(active = "") {
  const nav = NAV.map((n) => `<a class="nav-link${active === n.key ? " active" : ""}" href="${n.href}"${active === n.key ? ' aria-current="page"' : ""}>${n.label}</a>`).join("");
  const mobile = [
    { label: "Home", href: "#/", n: "01" },
    ...NAV.map((n, i) => ({ label: n.label, href: n.href, n: String(i + 2).padStart(2, "0") })),
    { label: "About", href: "#/about", n: "07" },
  ].map((n) => `<a href="${n.href}" data-menu-close>${n.label}<span>${n.n}</span></a>`).join("");
  return `<header class="site-header" id="site-header">
    <div class="header-inner">
      ${logo()}
      <nav class="nav" aria-label="Primary">${nav}</nav>
      <div class="header-actions">
        <button class="search-trigger" type="button" data-open-search aria-label="Search the library">
          ${icon("search")}<span class="label">Search</span><span class="kbd">⌘K</span>
        </button>
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle colour theme">
          ${icon("moon", "icon-moon")}${icon("sun", "icon-sun")}
        </button>
        <button class="menu-toggle" type="button" data-menu-open aria-label="Open menu" aria-controls="mobile-menu" aria-expanded="false">
          ${icon("menu")}
        </button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <div class="mobile-menu-top">
      ${logo()}
      <button class="mobile-close" type="button" data-menu-close aria-label="Close menu">${icon("close")}</button>
    </div>
    <nav class="mobile-nav" aria-label="Mobile">${mobile}</nav>
    <div class="mobile-menu-foot">Spiritual Hunger · Independent study library</div>
  </div>`;
}

export function footer() {
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          ${logo()}
          <p class="footer-mission">A quiet place to read, pray, and return to the Word, with teachings from the Munroe Global archive and curated ministry playlists.</p>
          <p class="footer-note">Feed the hunger · Stay rooted · Live on purpose</p>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <div class="footer-links">
            <a href="#/library">The Library</a>
            <a href="#/devotionals">Daily Devotionals</a>
            <a href="#/prayer">The Prayer Room</a>
            <a href="#/collections">Collections</a>
            <a href="#/saved">Saved &amp; Continue</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Begin with</h4>
          <div class="footer-links">
            <a href="#/library?t=Purpose">Purpose</a>
            <a href="#/library?t=Prayer">Prayer</a>
            <a href="#/library?t=Kingdom">The Kingdom</a>
            <a href="#/library?t=Leadership">Leadership</a>
            <a href="#/library?t=Crisis">Crisis &amp; Faith</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Connect</h4>
          <div class="footer-links">
            <a href="https://www.munroeglobal.com" target="_blank" rel="noopener noreferrer">Munroe Global ${icon("external")}</a>
            <a href="https://www.youtube.com/@MunroeGlobal" target="_blank" rel="noopener noreferrer">YouTube ${icon("external")}</a>
            <a href="https://github.com/tianabizna-ctrl/Spiritual-Hunger" target="_blank" rel="noopener noreferrer">GitHub ${icon("external")}</a>
            <a href="#/about">About this library</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>An independent study library. Every message links to its source video. Captions may contain transcription errors. Scripture quotations are from the King James Version.</p>
        <p>© ${new Date().getFullYear()} Spiritual Hunger</p>
      </div>
      <div class="footer-wordmark" aria-hidden="true">Spiritual Hunger</div>
    </div>
  </footer>`;
}

export function pageHero({ eyebrow = "", title = "", sub = "", stats = [], crumbs = [] } = {}) {
  const crumb = crumbs.length
    ? `<nav class="breadcrumb" aria-label="Breadcrumb">${crumbs.map((c, i) => `${i ? '<span class="sep">/</span>' : ""}${c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`}`).join("")}</nav>`
    : "";
  return `<section class="page-hero">
    <div class="container page-hero-inner">
      ${crumb}
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}
      <h1 class="page-title">${title}</h1>
      ${sub ? `<p class="page-sub">${sub}</p>` : ""}
      ${stats.length ? `<div class="page-hero-stats">${stats.map((s) => `<div><strong>${s.value}</strong><span>${esc(s.label)}</span></div>`).join("")}</div>` : ""}
    </div>
  </section>`;
}

export function sectionHead({ eyebrow = "", title = "", sub = "", link = "", linkLabel = "View all" } = {}) {
  return `<div class="section-head">
    <div>
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}
      <h2 class="section-title">${title}</h2>
      ${sub ? `<p class="section-sub">${sub}</p>` : ""}
    </div>
    ${link ? `<a class="link-arrow" href="${link}">${esc(linkLabel)} ${icon("arrowRight")}</a>` : ""}
  </div>`;
}

export function messageCard(m) {
  const saved = store.isBookmarked(m.id);
  const topics = (m.topics || []).slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const kind = m.kind === "prayer" ? "Prayer" : "Teaching";
  return `<article class="message-card" data-message="${esc(m.id)}">
    <a class="card-media" href="#/read/${encodeURIComponent(m.id)}" aria-label="Read ${esc(m.title)}">
      ${image(m.id, { alt: m.title, size: "hq" })}
      <span class="card-badge${m.kind === "prayer" ? " prayer" : ""}">${icon(m.kind === "prayer" ? "flame" : "bookOpen")}${kind}</span>
    </a>
    <button class="card-save${saved ? " is-saved" : ""}" type="button" data-save="${esc(m.id)}" aria-pressed="${saved}" aria-label="${saved ? "Remove bookmark" : "Bookmark this message"}">
      ${icon(saved ? "bookmarkFill" : "bookmark")}
    </button>
    <div class="card-body">
      <div class="card-kicker"><span>${esc(collectionName(m.collection))}</span><span class="dot"></span><span class="muted">${fmt.minutes(m.minutes)}</span></div>
      <h3 class="card-title"><a href="#/read/${encodeURIComponent(m.id)}">${esc(m.title)}</a></h3>
      <div class="card-meta"><span>${esc(sourceLabel(m))}</span><span class="dot"></span><span>${m.words ? `${fmt.compact(m.words)} words` : "Message"}</span></div>
      ${topics ? `<div class="card-topics">${topics}</div>` : ""}
    </div>
  </article>`;
}

export function devotionalCard(d) {
  return `<a class="devotional-card" href="#/devotionals/${encodeURIComponent(d.slug)}">
    <div class="devotional-card-top">
      <span class="dev-day">${String(d.day).padStart(2, "0")}</span>
      <span class="dev-series">${esc(d.series)}</span>
    </div>
    <h3 class="dev-title">${esc(d.title)}</h3>
    <p class="dev-sub">${esc(d.subtitle)}</p>
    <div class="dev-card-foot"><span>${esc(d.scripture.ref)}</span><span>Read ${icon("arrowRight")}</span></div>
  </a>`;
}

export function collectionCard(c) {
  const thumbs = (c.thumbs || []).slice(0, 3).map((t) => `<div>${image(t.id, { alt: t.title, size: "hq" })}</div>`).join("");
  return `<a class="collection-card" href="#/collections/${encodeURIComponent(c.slug)}">
    <div class="collection-thumbs">${thumbs || `<div></div><div></div><div></div>`}</div>
    <div class="collection-head">
      <h3 class="collection-name">${esc(c.name)}</h3>
      <span class="collection-count">${fmt.number(c.count)} messages</span>
    </div>
    <p class="collection-blurb">${esc(c.blurb)}</p>
    <div class="collection-foot"><span>Enter collection</span>${icon("arrowRight")}</div>
  </a>`;
}

export function emptyState({ iconName = "bookOpen", title = "Nothing here yet", text = "", action = "" } = {}) {
  return `<div class="empty-state">
    <div class="icon">${icon(iconName)}</div>
    <h3>${esc(title)}</h3>
    ${text ? `<p>${text}</p>` : ""}
    ${action}
  </div>`;
}

export function tag(text, className = "") {
  return `<span class="tag${className ? ` ${className}` : ""}">${esc(text)}</span>`;
}

export function quoteBand({ text, attribution = "Dr. Myles Munroe", videoId = "" }) {
  return `<section class="quote-band">
    <div class="container quote-inner">
      <div class="quote-mark" aria-hidden="true">“</div>
      <blockquote class="quote-text">${text}</blockquote>
      <div class="quote-attribution">${esc(attribution)}</div>
      ${videoId ? `<div class="quote-source"><a href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}" target="_blank" rel="noopener noreferrer">Listen to the message ${icon("external")}</a></div>` : ""}
    </div>
  </section>`;
}

export function iconLink(name, label, href, external = false) {
  return `<a class="link-arrow" href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(label)} ${icon(name)}</a>`;
}
