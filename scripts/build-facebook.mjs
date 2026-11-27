#!/usr/bin/env node
/**
 * Build content/gospel-warrior.json from the public Facebook page feed.
 *
 *   .sources/facebook/raw.md  (public page-plugin embed, captured without login)
 *      -> content/gospel-warrior.json (posts cleaned of CTAs and promotions)
 *
 * Only the most recent public posts are reachable without a Facebook login;
 * the page-plugin embed is the one no-login surface. Older posts need an
 * authenticated session or an official export from the page owner.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW = path.join(ROOT, ".sources", "facebook", "raw.md");
const OUT = path.join(ROOT, "content", "gospel-warrior.json");
const PAGE_URL = "https://www.facebook.com/iamGospelWarrior";
const AUTHOR = "John Domino Sanchez Asis";

/* Sentences that are calls to action or promotions, not devotional content. */
const CTA = [
  /welcome to comment/i,
  /pray for me/i,
  /private details of your suffering/i,
  /not walking alone\.?$/i,
  /save this (article|message|post)/i,
  /tag someone/i,
  /share this (article|message|post)/i,
  /share this on your facebook/i,
  /facebook profile/i,
  /follow (gospel warrior|this page|the page|our page|us)\b/i,
  /invite your family/i,
  /join us\b/i,
  /we want to continue creating/i,
  /even one share/i,
  /reach people who might otherwise never encounter/i,
  /subscri/i,
  /gospel warrior library/i,
  /thousands of free/i,
  /new additions (are being|being) added/i,
  /discount/i,
  /t-shirts|mugs|journals/i,
  /become part of/i,
  /as an expression of our gratitude/i,
  /beyond these benefits/i,
  /consider becoming/i,
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
  /from scandal to grace/i,
  /because everything we do must ultimately point beyond/i,
  /beyond the (articles|resources|subscriptions)/i,
  /see more on facebook/i,
  /https?:\/\/\S+/i,
  /galatians 6:6|1 corinthians 9:14|2 corinthians 9:7/i,
  /cheerful giver/i,
  /share good things with those who teach/i,
  /dedicate part of your (christian )?giving/i,
  /saved by grace through faith, not by financial contributions/i,
];

const sha = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};

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
    return sentence.charAt(0).toUpperCase() + sentence.slice(1).toLowerCase();
  }
  return sentence;
}

function cleanBody(body) {
  const sentences = splitSentences(body.replace(/\s+/g, " "));
  const kept = sentences.filter((s) => !CTA.some((re) => re.test(s)));
  return kept;
}

async function main() {
  const raw = await readFile(RAW, "utf8");
  const marker = raw.indexOf("Markdown Content:");
  const md = marker >= 0 ? raw.slice(marker + "Markdown Content:".length) : raw;
  const segments = md.split(AUTHOR).slice(1);
  const posts = [];
  for (const segment of segments) {
    const lines = segment.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const postedAgo = lines[0];
    const bodyLines = lines.slice(1).filter((l) => {
      if (/^\d+$/.test(l)) return false;                 // reaction counts
      if (/^!\[/i.test(l)) return false;                 // images
      if (/^(follow|see more on facebook)$/i.test(l)) return false;
      return true;
    });
    const kept = cleanBody(bodyLines.join(" "));
    if (!kept.length) continue;
    const hook = titleCaseHook(kept[0]);
    const title = hook.length > 110 ? hook.slice(0, 107).replace(/\s+\S*$/, "") + "…" : hook;
    const paragraphs = toParagraphs(kept);
    const text = paragraphs.join(" ");
    posts.push({
      id: `fb-${sha(kept[0].slice(0, 140))}`,
      title,
      postedAgo,
      paragraphs,
      words: text.split(/\s+/).filter(Boolean).length,
      source: PAGE_URL,
      origin: "facebook",
      author: "Gospel Warrior (John Domino Sanchez Asis)",
    });
  }
  posts.sort((a, b) => b.words - a.words);
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({
    page: PAGE_URL,
    author: "Gospel Warrior (John Domino Sanchez Asis)",
    note: "Public posts captured from the page's public embed; calls to action, subscription and product promotions removed.",
    fetchedAt: new Date().toISOString().slice(0, 10),
    posts,
  }, null, 2) + "\n");
  for (const p of posts) console.log(`${p.id}  ${String(p.words).padStart(6)}w  ${p.postedAgo.padStart(4)}  ${p.title.slice(0, 70)}`);
  console.log(`posts: ${posts.length}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
