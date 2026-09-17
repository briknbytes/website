// Reads events/*.yaml (one file per event, safe to be public — this repo is
// open source) and produces src/data/events-public.json for the Astro build.
//
// Recording/slides URLs are NOT stored here. events/*.yaml only records
// whether a recording/slides link exists (has_recording/has_slides — safe to
// be public), so the UI knows to render the gated section. The actual URLs
// live in Cloudflare KV (EVENTS_KV), set via `wrangler kv key put` or the
// dashboard — see README's "Adding a recording" section — and are read
// directly by the Worker (worker/index.ts) at request time, never bundled
// into a build artifact.
//
// Run automatically via `predev`/`prebuild` npm scripts.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eventsDir = path.join(root, "events");
const publicOutPath = path.join(root, "src", "data", "events-public.json");

const files = readdirSync(eventsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

const publicEvents = [];
const seenSlugs = new Set();

for (const file of files) {
  const raw = readFileSync(path.join(eventsDir, file), "utf8");
  const data = yaml.load(raw);

  for (const field of ["slug", "title", "date", "summary"]) {
    if (!data[field]) {
      throw new Error(`events/${file} is missing required field "${field}"`);
    }
  }
  if (seenSlugs.has(data.slug)) {
    throw new Error(`duplicate event slug "${data.slug}" (from events/${file})`);
  }
  seenSlugs.add(data.slug);

  publicEvents.push({
    slug: data.slug,
    title: data.title,
    date: data.date,
    speaker: data.speaker || null,
    tags: data.tags || [],
    summary: data.summary.trim(),
    hasRecording: Boolean(data.has_recording),
    hasSlides: Boolean(data.has_slides),
  });
}

publicEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

mkdirSync(path.dirname(publicOutPath), { recursive: true });
writeFileSync(publicOutPath, JSON.stringify(publicEvents, null, 2) + "\n");

console.log(`Generated ${publicEvents.length} event(s) -> ${path.relative(root, publicOutPath)}`);
