/* Inline icon set — thin, editorial, consistent. */

const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  bookOpen: '<path d="M12 6.5C10.5 4.9 8.4 4 6 4H3v15h3c2.4 0 4.5.9 6 2.5 1.5-1.6 3.6-2.5 6-2.5h3V4h-3c-2.4 0-4.5.9-6 2.5Z"/><path d="M12 6.5V21"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  bookmarkFill: '<path d="M6 3h12v18l-6-4-6 4V3Z" fill="currentColor"/>',
  arrowRight: '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H5"/><path d="m11 18-6-6 6-6"/>',
  arrowUpRight: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  play: '<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  flame: '<path d="M12 22c4.2 0 7-2.9 7-6.8 0-2.6-1.3-4.8-3.4-6.5-.8-.7-1.5-1.6-1.8-2.7-.2-.7-1.1-.9-1.5-.3-1.3 2-2.6 3.4-3.6 5.2-1.8 3.2-.5 6.4 1.8 8.2"/><path d="M12 22c-2.2 0-3.8-1.5-3.8-3.6 0-2.1 1.9-3.2 2.4-5.1.1-.5.7-.7 1-.3.9 1.2 1.8 2 2.4 3.2 1 2.1.2 4.1-2 5.8Z"/>',
  crown: '<path d="m3 8 4.6 3L12 5l4.4 6L21 8l-1.5 11h-15L3 8Z"/><path d="M6 16h12"/>',
  bread: '<path d="M5 10c0-3 2.5-5 7-5s7 2 7 5v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z"/><path d="M8 10c0-1.5 1.5-2.5 4-2.5s4 1 4 2.5"/><path d="M9 15h6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  anchor: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21"/><path d="M5 12H3a9 9 0 0 0 18 0h-2"/><path d="M8 10h8"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  heart: '<path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/>',
  quote: '<path d="M10 11H6a4 4 0 0 1 4-4V4a7 7 0 0 0-7 7v9h7v-9Z" fill="currentColor" stroke="none"/><path d="M21 11h-4a4 4 0 0 1 4-4V4a7 7 0 0 0-7 7v9h7v-9Z" fill="currentColor" stroke="none"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.6 6.8-4.2M8.6 13.4l6.8 4.2"/>',
  type: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M8 19h8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
  sparkle: '<path d="M12 3c.6 4.8 2.2 6.4 7 7-4.8.6-6.4 2.2-7 7-.6-4.8-2.2-6.4-7-7 4.8-.6 6.4-2.2 7-7Z"/><path d="M19 15c.2 1.8.8 2.4 2.6 2.6-1.8.2-2.4.8-2.6 2.6-.2-1.8-.8-2.4-2.6-2.6 1.8-.2 2.4-.8 2.6-2.6Z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  pause: '<path d="M9 5v14M15 5v14" stroke-width="2.4"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  command: '<path d="M9 9h6v6H9z"/><path d="M9 4a2 2 0 1 0 0 4h2V6a2 2 0 0 0-2-2ZM15 4a2 2 0 1 1 0 4h-2V6a2 2 0 0 1 2-2ZM9 20a2 2 0 1 1 0-4h2v2a2 2 0 0 1-2 2ZM15 20a2 2 0 1 0 0-4h-2v2a2 2 0 0 0 2 2Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M18 14.5c2.1.6 3.5 2.3 3.5 4.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  cross: '<path d="M12 3v18M6 9h12"/>',
  leaf: '<path d="M20 4c-8 0-14 4-14 10 0 3 2 5 5 5 6 0 9-7 9-15Z"/><path d="M4 21c2-6 6-9 11-11"/>',
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/>',
  rings: '<circle cx="9" cy="13" r="5"/><circle cx="15" cy="13" r="5"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8C10 8 7.5 7 7.5 5A2 2 0 0 1 11 3.5C12 4.5 12 6.5 12 8ZM12 8c2 0 4.5-1 4.5-3A2 2 0 0 0 13 3.5C12 4.5 12 6.5 12 8Z"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 0 9H7Z"/><path d="m12 12-2 4h3l-2 4"/>',
  fingerprint: '<path d="M12 4a8 8 0 0 1 8 8"/><path d="M4 12a8 8 0 0 1 8-8"/><path d="M7 12a5 5 0 0 1 10 0c0 3-1 6-2.5 8"/><path d="M10 12a2 2 0 0 1 4 0c0 3.5-1 6.5-2 9"/><path d="M7 15c0 2 .5 4 1.5 6"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  github: '<path d="M9 19c-4.5 1.4-4.5-2.5-6-3m12 6v-3.5c0-1 .1-1.5-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.6 2.7 5.6 3 5.6 3a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.4c0 4.6 2.7 5.7 5.5 6-.5.5-.5 1-.5 2V22"/>',
  sunrise: '<path d="M12 3v4M5.5 9.5 4 8M18.5 9.5 20 8"/><path d="M5 16a7 7 0 0 1 14 0"/><path d="M2 20h20"/>',
  quoteSmall: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" stroke-width="1.4"/>',
};

export function icon(name, cls = "") {
  const path = PATHS[name] || PATHS.sparkle;
  return `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

export const logoMark = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false"><path d="M18 50V31a14 14 0 0 1 28 0v19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M32 42c4.2-3.3 5.8-6.6 4.1-10.7-.8-2.2-3-4.1-4.1-6.6-1.1 2.5-3.3 4.4-4.1 6.6-1.7 4.1-.1 7.4 4.1 10.7Z" fill="currentColor"/></svg>`;

export const TOPIC_ICONS = {
  Purpose: "compass",
  Kingdom: "crown",
  Prayer: "flame",
  Faith: "anchor",
  Leadership: "people",
  Marriage: "rings",
  Family: "home",
  Fatherhood: "shield",
  Success: "star",
  Wisdom: "bookOpen",
  "Holy Spirit": "wind",
  Grace: "drop",
  Crisis: "cloud",
  Generosity: "gift",
  Identity: "fingerprint",
  "Spiritual Growth": "leaf",
};

// star is not in the base set; add it for Success.
PATHS.star = '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>';
