#!/usr/bin/env node
/**
 * Build content/gospel-warrior.json from the public Facebook page feed.
 *
 *   .sources/facebook/raw.md  (public page-plugin embed, captured without login)
 *      -> content/gospel-warrior.json (posts cleaned of CTAs and promotions)
 *
 * Pass --refresh to fetch the public embed, or pass one or more saved captures.
 * Each capture covers a moving window. Never replace the archive with it.
 */
import { readFile, writeFile, mkdir, open, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postOrder, readArchive, writeArchive } from "./gospel-warrior-data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, ".sources", "facebook", "raw.md");
const LIBRARY = path.join(ROOT, ".sources", "facebook", "library", "library.json");
const OUT = path.join(ROOT, "content", "gospel-warrior.json");
const PAGE_URL = "https://www.facebook.com/iamGospelWarrior";
const AUTHOR = "John Domino Sanchez Asis";
const PROFILE_ID = "100000032478992";
const MOBILE = "https://r.jina.ai/http://m.facebook.com/iamGospelWarrior?sk=posts";
const FEED = `https://r.jina.ai/https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(PAGE_URL)}&tabs=timeline&width=800&height=4000&small_header=true&adapt_container_width=true&hide_cover=true&show_facepile=false`;

/* Sentences that are calls to action or promotions, not devotional content. */
const CTA = [
  /\b(?:welcome to comment|in the comments|comment\s*[:“"])|\b(?:type|write)\b.{0,12}(?:pray for me|amen)/i,
  /save this (article|message|post)/i,
  /tag someone/i,
  /share this (article|message|post)/i,
  /share this on your facebook/i,
  /facebook profile/i,
  /follow (gospel warrior|this page|the page|our page|us on)\b/i,
  /invite your family.{0,80}(?:follow|page|group|subscribe)/i,
  /we want to continue creating/i,
  /even one share/i,
  /reach people who might otherwise never encounter/i,
  /subscri/i,
  /gospel warrior library/i,
  /thousands of free/i,
  /new additions (are being|being) added/i,
  /discount (?:on|code)|\d+% discount/i,
  /as an expression of our gratitude/i,
  /beyond these benefits/i,
  /monthly subscription|regular giving|voluntary offering/i,
  /prayers, comments, invitations, and shares/i,
  /support (this ministry|the continuation|our work|the work)/i,
  /helps us continue/i,
  /helps (gospel warrior|this work|the mission)/i,
  /continue sharing biblical teaching/i,
  /creating discipleship materials/i,
  /expanding our resources/i,
  /^(?:that is the heartbeat of gospel warrior|(?:that is what we mean when we say, )?from scandal to grace)[.!]?$/i,
  /from scandal to grace, because jesus rewrites everything/i,
  /because everything we do must ultimately point beyond/i,
  /beyond the (articles|resources|subscriptions)/i,
  /see more on facebook/i,
  /dedicate part of your (christian )?giving/i,
  /saved by grace through faith, not by financial contributions/i,
];

const digest = (s) => createHash("sha256").update(s).digest("hex");

// These captured appeals span many sentences. Keep the devotional conclusion
// after each one; a Bible verse about giving is not itself a promotion.
const APPEALS = [
  /If you have ever felt unwanted, overlooked,[^.]*?welcome to comment:[\s\S]+?(?=Remember Leviticus 21 the next time)/i,
  /But if these words have become a prayer in your heart, you are welcome to comment:[\s\S]+?(?=Never underestimate what God can accomplish)/i,
  /If this message has exposed something you have been silently carrying, comment[\s\S]+?(?=Mary's offering reminds us)/i,
  /If this truth has released you from something you have carried for years, comment[\s\S]+?(?=Never forget the woman in Mark's Gospel)/i,
  /If this article has challenged something you have believed for years, comment[\s\S]+?(?=Because this was never merely an article)/i,
  /If this article has exposed a burden you have been carrying silently, comment[\s\S]+?never forget whom this message is ultimately about[.:]\s*/i,
  /If this message has exposed something in your heart, and you feel comfortable doing so, comment[\s\S]+?Now, before you scroll away, (?=remember the priests)/i,
  /And if this message has touched something you have been silently battling[\s\S]+?Before you leave, (?=remember Reuben)/i,
  /You do not need to publicly expose the intimate details of your struggle\. But if this has uncovered something[\s\S]+?(?=Because the Gospel was never intended)/i,
  /If this message has spoken to something you have been carrying, save it\.[\s\S]+?(?=Never underestimate what God can accomplish)/i,
];

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

function makePost(body, source, postedAgo, headline) {
  const sourceHash = digest(body.replace(/\s+/g, " ").trim());
  const paragraphs = studyParagraphs(body);
  if (!paragraphs.length) return null;
  const firstLine = paragraphs[0].split("\n")[0];
  const firstSentence = sentences.segment(firstLine)[Symbol.iterator]().next().value.segment.trim();
  const title = (headline && cleanLine(headline)) || firstSentence;
  return {
    id: `fb-${sourceHash.slice(0, 32)}`, sourceHash, title, postedAgo, paragraphs,
    words: paragraphs.join(" ").split(/\s+/).length, source, origin: "facebook",
    author: `Gospel Warrior (${AUTHOR})`,
  };
}

function parseCapture(raw) {
  const marker = raw.indexOf("Markdown Content:");
  const md = marker >= 0 ? raw.slice(marker + "Markdown Content:".length) : raw;
  // Only accept a signed, complete study from a photo listed on this profile.
  const photo = raw.match(/^URL Source: https:\/\/www\.facebook\.com\/plugins\/post\.php\?href=https:\/\/www\.facebook\.com\/photo\.php\?fbid=(\d+)&set=pb\.(\d+)\./m);
  if (photo) {
    if (photo[2] !== PROFILE_ID || !md.trimEnd().endsWith("From Scandal to Grace, Because Jesus Rewrites Everything")) return [];
    const lines = md.trim().split(/\n+/).filter(line => line.trim() !== "...");
    // Facebook inserts a preview ellipsis before the expanded text, sometimes
    // even in the middle of a word. Unwrap the Reader's links for feed matching.
    const body = lines.join("\n\n").replace(/^([\s\S]{0,520}?[a-z])\.\.\.(?=[a-z]| )/i, "$1")
      .replace(/\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1").trim();
    const headline = lines[0].length < 220 ? lines[0] : undefined;
    const post = makePost(body, `https://www.facebook.com/photo/?fbid=${photo[1]}`, undefined, headline);
    return post ? [post] : [];
  }
  const segments = md.split(new RegExp(`^${AUTHOR}\\s*$`, "m")).slice(1);
  const posts = [];
  for (const segment of segments) {
    const lines = segment.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const postedAgo = lines[0];
    if (!/^(?:\d+\s*(?:m|h|d|w|mins?|hrs?|hours?|days?|weeks?)|just now|yesterday)$/i.test(postedAgo)) continue;
    const bodyLines = lines.slice(1).filter((l) => {
      if (/^[\d,]+(?:\.\d+)?[KM]?$/i.test(l)) return false; // reaction counts
      if (/^!\[/i.test(l)) return false;                 // images
      if (/^(follow|see more on facebook)$/i.test(l)) return false;
      return true;
    });
    const body = bodyLines.join(" ").replace(/\s+/g, " ").trim();
    if (!body || /(?:…|\.\.\.)?\s*See more\s*$/i.test(body)) continue;
    const post = makePost(body, PAGE_URL, postedAgo);
    if (post) posts.push(post);
  }
  if (!posts.length) throw new Error("No complete Gospel Warrior posts recognised in capture; archive not updated.");
  return posts;
}

// Apply these to individual archive lines: an engagement prompt often has no
// final punctuation, so sentence splitting alone can swallow the following verse.
const ARCHIVE_CTA = [
  /bundle4success\.sell\.app|facebook\.com\/(?:groups\/|profile\.php\?|iamGospelWarrior\/?(?:\s|$|\?))/i,
  /\b(?:gospel warrior (?:library|community|subscribers?)|subscri\w*|e-?books?|hashtags? for|reader follow.up question|call to action)\b/i,
  /\b(?:click (?:here|the link)|link (?:in|below)|stop scrolling|don[’']t scroll|scroll(?:ing)? (?:past|away))\b/i,
  /\b(?:share|save|bookmark|repost) (?:this|it)\b|\blike (?:this (?:post|page)|and share)\b|\btag (?:them|a|your|someone|somebody|the|that)\b/i,
  /\b(?:drop|leave|write|type) (?:an? |your )?(?:amen|reply|comment)\b|\b(?:comment|reply)\s*(?:below|here|with|[:“"])/i,
  /\bfollow (?:along on|our page|this page|the page|me on|for more)\b|\bfollow (?:brother )?john[’']s page\b/i,
  /\b(?:your friends list|in (?:your|the) feed|group invite|follow[- ]up question|support (?:this|our) (?:mission|ministry|work)|become a (?:partner|supporter))\b/i,
  /\b(?:i|mag)-(?:share|save|tag|follow|comment)\b|\b(?:like and share|tap the link|share on)\b/i,
  /from scandal to grace\s*[,—–-]*\s*because Jesus rewrites everything/i,
];
const AD = /\b(?:this (?:powerful |new |premium )?(?:e-?book|workbook)|my (?:new |latest )?(?:e-?book|book)|(?:exclusi\w* (?:to|for)|only (?:for|available to)) (?:my |our )?subscribers|(?:available|included) (?:only )?inside (?:the |our )?gospel warrior library|use (?:the |my )?promo code|pre[- ]?order|book launch)\b/i;
const PERSONAL = /\bhappy (?:\d+(?:st|nd|rd|th) )?(?:birthday|(?:wedding )?anniversary)|\bto my (?:dear cousins|brother|wife|daughter|husband)|my brother Pachoy|we always thought that we would be the ones to teach you/i;
const PROMO_FOOTER = [
  /^(?:new book(?:\s|:)|(?:final )?book (?:promo|launch|announcement|title)|upcoming books|announcement\W+(?:a |new |upcoming )?book)/i,
  /^coming soon\W+(?:on amazon|to amazon|this book|brother john)|^(?:available|preorder) (?:soon )?on amazon/i,
  /^(?:about the author|brother john domino|o\.?a\.?s\.?i\.?s\.? foundation reminder|true christ followers group invite|hashtags for maximum)/i,
  /^join the (?:kingdom preparation remnant|gospel warriors? community)/i,
];

function isPromotion(line) {
  const text = line.normalize("NFKC");
  return CTA.some(re => re.test(text)) || ARCHIVE_CTA.some(re => re.test(text)) || /@(?:followers|highlight)\b|https?:\/\/(?:www\.)?facebook\.com\/(?:groups\/|.*subscribenow)/i.test(text);
}

function cleanLine(line) {
  const urls = [];
  // A '?' inside a store link is not the end of a sentence. Keep URLs intact
  // while finding sentence boundaries, including links to Bible references.
  const masked = line.replace(/https?:\/\/\S+/g, url => {
    urls.push(url);
    return `\uE000${urls.length - 1}\uE001`;
  });
  const restore = text => text.replace(/\uE000(\d+)\uE001/g, (_, i) => urls[i]);
  if (!isPromotion(line)) return line;
  const kept = Array.from(sentences.segment(masked), ({ segment }) => {
    const original = restore(segment);
    return isPromotion(original) ? "" : original;
  }).join("").trim();
  return /[\p{L}\p{N}]/u.test(kept) ? kept : "";
}

function studyParagraphs(body) {
  for (const appeal of APPEALS) body = body.replace(appeal, "");
  const paragraphs = [];
  let prompt = false;
  let end = false;
  for (const block of body.split(/\r?\n\s*\n/)) {
    const kept = [];
    for (const raw of block.split(/\r?\n/)) {
      const line = raw.trim();
      const label = line.replace(/^[^\p{L}]+/u, "");
      if (PROMO_FOOTER.some(re => re.test(label))) { end = true; break; }
      if (prompt && /^[“"‘']/.test(line)) { prompt = false; continue; }
      prompt = /(?:comment|type|write|reply)[^.!?]{0,35}:\s*$/i.test(line);
      const keptLine = cleanLine(line);
      if (keptLine) kept.push(keptLine);
    }
    if (kept.length) paragraphs.push(kept.join("\n"));
    if (end) break;
  }
  return paragraphs;
}

async function readLibrary(file) {
  const raw = await readFile(file, "utf8");
  if (!/\.html?$/i.test(file)) return JSON.parse(raw);
  const payload = raw.match(/window\.GW_GZ_B64\s*=\s*"([A-Za-z0-9+/=]+)"/);
  if (!payload) throw new Error("No Gospel Warrior library dataset in the supplied HTML");
  return JSON.parse(gunzipSync(Buffer.from(payload[1], "base64")));
}

function libraryPosts(library) {
  const today = new Date().toISOString().slice(0, 10);
  const studies = new Map();
  for (const info of library.index) {
    const entry = library.contents[info.id];
    if (!entry) throw new Error(`Library index has no text record for ${info.id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(info.date) || info.date < "2009-07-01" || info.date > today) continue;
    if (!/^\d+$/.test(entry.postId)) continue;
    const photo = entry.profileUrl === PAGE_URL && entry.sourceUrl === `https://www.facebook.com/photo/?fbid=${entry.postId}`;
    if (!photo && !/^https:\/\/www\.facebook\.com\/iamGospelWarrior\/posts\/[\w-]+\/?$/.test(entry.sourceUrl)) continue;
    const body = entry.content || "";
    if (PERSONAL.test(entry.title) || /happy birthday, (?!Jesus\b)/i.test(body) || AD.test(body) || /e-?book|subscrib|giveaway|raffle/i.test(entry.title)) continue;
    if (/\bUnlishop\b/i.test(body) || /happy mothers day/i.test(entry.title)) continue;
    const post = makePost(body, entry.sourceUrl, undefined, entry.title);
    if (!post || !/\b(?:Jesus|Christ|Scripture|Bible|God|faith|prayer|Lord|Gospel|Diyos|Biblia|Cristo|Panginoon)\b/i.test(post.paragraphs.join(" "))) continue;
    post.id = `fb-${entry.postId}`;
    post.postedOn = info.date;
    // The snapshot identifies duplicate editions by the canonical post ID.
    // Use a readable alternate only if the canonical record is unavailable.
    const group = entry.duplicateGroup || entry.id;
    if (!studies.has(group) || group === entry.id) studies.set(group, post);
  }
  return [...studies.values()];
}

async function readPublicPage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`Public page returned HTTP ${response.status}: ${url}`);
  return response.text();
}

async function capture(url) {
  const raw = await readPublicPage(url);
  const posts = parseCapture(raw);
  const snapshots = path.join(path.dirname(RAW), "snapshots");
  await mkdir(snapshots, { recursive: true });
  await writeFile(path.join(snapshots, `${digest(raw)}.md`), raw);
  return posts;
}

async function main() {
  const args = process.argv.slice(2);
  const refresh = args.includes("--refresh");
  const index = args.indexOf("--library");
  let library;
  if (index !== -1) {
    args.splice(index, 1);
    library = args[index] && !args[index].startsWith("--") ? args.splice(index, 1)[0] : LIBRARY;
  }
  const files = args.filter(arg => arg !== "--refresh");
  if (!refresh && !library && !files.length) files.push(RAW);
  const incoming = [];
  const excluded = new Set();
  for (const file of files) incoming.push(...parseCapture(await readFile(file, "utf8")));
  if (library) {
    const snapshot = await readLibrary(library);
    const posts = libraryPosts(snapshot);
    for (const entry of Object.values(snapshot.contents)) excluded.add(`fb-${entry.postId}`);
    for (const p of posts) excluded.delete(p.id);
    console.log(`Library: ${posts.length} eligible entries before deduplication.`);
    incoming.push(...posts);
  }
  if (refresh) {
    // One unavailable photo or timeline must not discard the other captures.
    const collect = async (url) => {
      try { incoming.push(...await capture(url)); }
      catch (err) { console.warn(`Skipped public capture: ${err.message}`); }
    };
    await collect(FEED);
    const profile = await readPublicPage(MOBILE).catch(err => { console.warn(err.message); return ""; });
    const links = [...profile.matchAll(/https:\/\/www\.facebook\.com\/photo\/\?fbid=(\d+)&set=pb\.(\d+)\./g)];
    const ids = new Set(links.filter(m => m[2] === PROFILE_ID).map(m => m[1]));
    console.log(`Found ${ids.size} public photo links.`);
    for (const id of ids) {
      const photo = `https://www.facebook.com/photo.php?fbid=${id}&set=pb.${PROFILE_ID}.-2207520000&type=3`;
      const embed = `https://r.jina.ai/https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(photo)}&show_text=true`;
      await collect(embed);
    }
  }
  if (!incoming.length) throw new Error("No complete posts to merge; archive not updated.");

  const lockPath = `${OUT}.lock`;
  const lock = await open(lockPath, "wx");
  try {
    const archive = await readArchive(OUT);
    const retained = archive.posts.filter(p => !excluded.has(p.id));
    const posts = new Map(retained.map(p => [p.id, p]));
    const byHash = new Map(retained.map(p => [p.sourceHash, p.id]));
    const bySource = new Map(retained.filter(p => p.source !== PAGE_URL).map(p => [p.source, p.id]));
    const textKey = p => digest(p.paragraphs.join(" ").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
    const byText = new Map(retained.map(p => [textKey(p), p.id]));
    if (byHash.has(undefined) || byHash.size !== posts.size) throw new Error("Invalid source hashes in archive");
    for (const p of incoming) {
      const key = textKey(p);
      const id = bySource.get(p.source) ?? byHash.get(p.sourceHash) ?? (posts.has(p.id) ? p.id : null);
      if (!id && byText.has(key)) continue;
      const readerId = id ?? p.id;
      const old = posts.get(readerId);
      // The timeline can flatten a photo caption into one line. Keep the
      // verified, dated per-post edition when that same preview reappears.
      if (old?.postedOn && old.source !== PAGE_URL && !p.postedOn && p.sourceHash === old.sourceHash) continue;
      const source = p.source === PAGE_URL && old ? old.source : p.source;
      posts.set(readerId, { ...old, ...p, id: readerId, source, postedAgo: old?.postedAgo ?? p.postedAgo, postedOn: p.postedOn ?? old?.postedOn });
      if (source !== PAGE_URL) bySource.set(source, readerId);
      byHash.set(p.sourceHash, readerId);
      byText.set(key, readerId);
    }
    const added = posts.size - retained.length;
    const merged = [...posts.values()].sort(postOrder);
    if ((library && !archive.parts) || merged.length !== archive.posts.length || merged.some((post, i) => post !== archive.posts[i] && JSON.stringify(post) !== JSON.stringify(archive.posts[i]))) {
      archive.posts = merged;
      archive.fetchedAt = new Date().toISOString().slice(0, 10);
      await writeArchive(OUT, archive);
    }
    console.log(`Read ${incoming.length} posts from captures; added ${added}; archive now contains ${posts.size}.`);
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
