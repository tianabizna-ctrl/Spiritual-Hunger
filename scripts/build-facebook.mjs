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
import { readFile, writeFile, mkdir, open, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, ".sources", "facebook", "raw.md");
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
  /follow (gospel warrior|this page|the page|our page|us)\b/i,
  /invite your family/i,
  /we want to continue creating/i,
  /even one share/i,
  /reach people who might otherwise never encounter/i,
  /subscri/i,
  /gospel warrior library/i,
  /thousands of free/i,
  /new additions (are being|being) added/i,
  /discount/i,
  /t-shirts|mugs|journals/i,
  /as an expression of our gratitude/i,
  /beyond these benefits/i,
  /monthly subscription|regular giving|voluntary offering/i,
  /if you (cannot contribute|cannot afford|are not something you can afford)/i,
  /financial circumstances do not determine/i,
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

function splitSentences(text) {
  const parts = text.match(/[^.!?]+[.!?]+["'”’)\]]*|[^.!?]+$/g) || [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function toParagraphs(sentences) {
  const paras = [];
  let buf = "";
  for (const s of sentences) {
    if (!buf) buf = s;
    else if (buf.length + s.length < 520) buf += " " + s;
    else { paras.push(buf); buf = s; }
  }
  if (buf) paras.push(buf);
  return paras;
}

function titleCaseHook(sentence) {
  const letters = sentence.replace(/[^A-Za-z]/g, "");
  const upper = (sentence.match(/[A-Z]/g) || []).length;
  if (letters.length > 12 && upper / letters.length > 0.7) {
    const title = sentence.charAt(0).toUpperCase() + sentence.slice(1).toLowerCase();
    return title.replace(/\b(god|jesus|christ|christian|mary|elijah|leviticus)\b/gi, name => name[0].toUpperCase() + name.slice(1));
  }
  return sentence;
}

function cleanBody(body) {
  for (const appeal of APPEALS) body = body.replace(appeal, "");
  body = body.replace(/(?:But before you leave, )?remember what happened at the foot of Mount Sinai\./i, "Remember what happened at the foot of Mount Sinai.")
    .replace(/(?:^|(?<=[.!?]) )remember (the priests standing before the altar|Reuben)\./g, " Remember $1.");
  const sentences = splitSentences(body.replace(/https?:\/\/\S+/gi, "[link]"));
  const kept = sentences.filter((s) => !s.includes("[link]") && !CTA.some((re) => re.test(s)));
  return kept;
}

function makePost(body, source, postedAgo, headline) {
  const sourceHash = digest(body);
  const kept = cleanBody(body);
  if (!kept.length) return null;
  const hook = titleCaseHook(headline && kept[0].startsWith(headline) ? headline : kept[0]).replace(/\blamb of God\b/g, "Lamb of God");
  const title = hook.length > 110 ? hook.slice(0, 107).replace(/\s+\S*$/, "") + "…" : hook;
  const paragraphs = toParagraphs(kept);
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
    const body = lines.join(" ").replace(/^(.{0,500}?[a-z])\.\.\.(?=[a-z]| )/i, "$1")
      .replace(/\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
    const headline = /^[^a-z]+$/.test(lines[0]) ? lines[0] : undefined;
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
  const files = args.filter(arg => arg !== "--refresh");
  if (!refresh && !files.length) files.push(RAW);
  const incoming = [];
  for (const file of files) incoming.push(...parseCapture(await readFile(file, "utf8")));
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
  const temp = `${OUT}.${process.pid}.tmp`;
  try {
    const archive = JSON.parse(await readFile(OUT, "utf8"));
    const posts = new Map(archive.posts.map(p => [p.id, p]));
    const byHash = new Map(archive.posts.map(p => [p.sourceHash, p.id]));
    const bySource = new Map(archive.posts.filter(p => p.source !== PAGE_URL).map(p => [p.source, p.id]));
    if (byHash.has(undefined) || byHash.size !== posts.size) throw new Error("Invalid source hashes in archive");
    for (const p of incoming) {
      const id = bySource.get(p.source) ?? byHash.get(p.sourceHash) ?? p.id;
      const old = posts.get(id);
      const source = p.source === PAGE_URL && old ? old.source : p.source;
      posts.set(id, { ...old, ...p, id, source, postedAgo: old?.postedAgo ?? p.postedAgo });
      if (source !== PAGE_URL) bySource.set(source, id);
      byHash.set(p.sourceHash, id);
    }
    const added = posts.size - archive.posts.length;
    const merged = [...posts.values()].sort((a, b) => b.words - a.words || a.id.localeCompare(b.id));
    if (JSON.stringify(merged) !== JSON.stringify(archive.posts)) {
      archive.posts = merged;
      archive.fetchedAt = new Date().toISOString().slice(0, 10);
      await writeFile(temp, JSON.stringify(archive, null, 2) + "\n");
      await rename(temp, OUT);
    }
    console.log(`Read ${incoming.length} posts from captures; added ${added}; archive now contains ${posts.size}.`);
  } finally {
    await rm(temp, { force: true });
    await lock.close();
    await rm(lockPath);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
