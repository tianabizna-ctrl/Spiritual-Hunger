import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const postOrder = (a, b) => b.words - a.words || a.id.localeCompare(b.id);

export async function readArchive(file) {
  // A refresh can replace the manifest between reading it and opening a part.
  for (let attempt = 0; ; attempt++) {
    const archive = JSON.parse(await readFile(file, "utf8"));
    try {
      for (const part of archive.parts || []) {
        if (!/^gospel-warrior\/\d{4}-\d{2}-[a-f0-9]{16}\.json$/.test(part)) throw new Error(`Invalid archive part: ${part}`);
        const records = JSON.parse(await readFile(path.join(path.dirname(file), part), "utf8"));
        for (const record of records) archive.posts.push(record);
      }
      archive.posts.sort(postOrder);
      return archive;
    } catch (err) {
      if (attempt || err.code !== "ENOENT") throw err;
    }
  }
}

async function atomicWrite(file, text) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(temp, text);
    await rename(temp, file);
  } finally {
    await rm(temp, { force: true });
  }
}

export async function writeArchive(file, archive) {
  const base = path.dirname(file);
  const oldParts = new Set(archive.parts || []);
  const posts = [];
  const months = new Map();
  for (const post of archive.posts) {
    if (!post.postedOn || !/^fb-\d+$/.test(post.id)) { posts.push(post); continue; }
    const month = post.postedOn.slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(post);
  }
  const parts = [];
  await mkdir(path.join(base, "gospel-warrior"), { recursive: true });
  for (const month of [...months.keys()].sort()) {
    const text = JSON.stringify(months.get(month), null, 2) + "\n";
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const part = `gospel-warrior/${month}-${hash}.json`;
    parts.push(part);
    if (!oldParts.delete(part)) await atomicWrite(path.join(base, part), text);
  }
  // All new parts are complete before changing what readers see.
  await atomicWrite(file, JSON.stringify({ ...archive, posts, parts }, null, 2) + "\n");
  for (const part of oldParts) await rm(path.join(base, part), { force: true });
}
