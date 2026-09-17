// Reads events/*.yaml (single source of truth per event) and produces two
// derived, generated artifacts — never edit these by hand:
//
//   src/data/events-public.json   -> consumed by the Astro build. Contains
//                                     only public fields, plus booleans that
//                                     say whether a recording/slides link
//                                     exists (so the UI can render a gated
//                                     placeholder without leaking the URL).
//
//   worker/data/events.json       -> bundled into the Worker script
//                                     (worker/index.ts). Contains the full
//                                     record, including recording_url/
//                                     slides_url, and is only ever read
//                                     server-side after a session check.
//
// Run automatically via `predev`/`prebuild` npm scripts.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eventsDir = path.join(root, "events");
const publicOutPath = path.join(root, "src", "data", "events-public.json");
const gatedOutPath = path.join(root, "worker", "data", "events.json");

const files = readdirSync(eventsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

const publicEvents = [];
const gatedEvents = [];
const seenSlugs = new Set();

for (const file of files) {
  const raw = readFileSync(path.join(eventsDir, file), "utf8");
  const data = yaml.load(raw);

  for (const field of ["slug", "title", "date", "speaker", "summary"]) {
    if (!data[field]) {
      throw new Error(`events/${file} is missing required field "${field}"`);
    }
  }
  if (seenSlugs.has(data.slug)) {
    throw new Error(`duplicate event slug "${data.slug}" (from events/${file})`);
  }
  seenSlugs.add(data.slug);

  const recordingUrl = (data.recording_url || "").trim();
  const slidesUrl = (data.slides_url || "").trim();

  publicEvents.push({
    slug: data.slug,
    title: data.title,
    date: data.date,
    speaker: data.speaker,
    tags: data.tags || [],
    summary: data.summary.trim(),
    hasRecording: recordingUrl.length > 0,
    hasSlides: slidesUrl.length > 0,
  });

  gatedEvents.push({
    slug: data.slug,
    recordingUrl: recordingUrl || null,
    slidesUrl: slidesUrl || null,
  });
}

publicEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

mkdirSync(path.dirname(publicOutPath), { recursive: true });
mkdirSync(path.dirname(gatedOutPath), { recursive: true });
writeFileSync(publicOutPath, JSON.stringify(publicEvents, null, 2) + "\n");
writeFileSync(gatedOutPath, JSON.stringify(gatedEvents, null, 2) + "\n");

console.log(`Generated ${publicEvents.length} event(s) -> ${path.relative(root, publicOutPath)} and ${path.relative(root, gatedOutPath)}`);
