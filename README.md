# Brik & Bytes — website

Static site for the Brik & Bytes community (Tunisian infrastructure/DevOps/Kubernetes),
built with [Astro](https://astro.build) and deployed to Cloudflare as a Worker with
static assets. Gated content (event recordings/slides) is protected by a
Discord-membership check running in the Worker — no separate accounts, no
passwords, no stored email.

## How it's put together

- `events/*.yaml` — one file per event, the source of **public** event data.
  This repo is open source, so these files are safe to be public: title,
  date, speaker, tags, summary, and `has_recording`/`has_slides` booleans
  (just "a recording exists", not the URL).
- `scripts/generate-events.mjs` — reads those into `src/data/events-public.json`
  (generated, gitignored) for the Astro build.
- The **actual** recording/slides URLs are never in git at all — they live in
  Cloudflare KV (`EVENTS_KV`), keyed by event slug, read directly by the
  Worker at request time. See "Adding a recording" below.
- `src/pages/`, `src/components/` — the static site (homepage, events list,
  event detail pages), built by Astro into `dist/`.
- `worker/index.ts` — the one Worker script. Cloudflare serves any request
  matching a file in `dist/` directly (see `[assets]` in `wrangler.toml`);
  everything else — in practice, only `/api/*` — reaches this script, which
  handles Discord OAuth login/callback/logout/me and the gated links endpoint.
- `worker/index.ts`'s `/api/events/:slug/links` route is the only place that
  ever returns a recording/slides URL, and only with a valid session cookie.

Run `npm run generate:events` (or `npm run dev` / `npm run build`, which do it
for you via `predev`/`prebuild`) whenever you add or edit an event file.

Note: this deploys as a **Worker with static assets**, not Cloudflare's
older "Pages" product — see "Deploying" below for why that distinction
matters and what it changes in the dashboard.

## Auth flow

1. `GET /api/auth/login` redirects to Discord OAuth (`identify guilds.members.read`
   scope), storing a CSRF `state` in a short-lived cookie.
2. `GET /api/auth/callback` exchanges the code for a user access token, calls
   `GET /users/@me/guilds/{guild_id}/member` with that token to confirm the
   user belongs to the Brik & Bytes Discord server (no bot token needed), then
   sets a signed, HttpOnly session cookie (`bnb_session`) — just `{ discordUserId, exp }`,
   HMAC-signed with `SESSION_SECRET`. No email, no password, no user table.
3. `GET /api/auth/me` — cheap check the client polls to toggle "Login" vs
   "Log out" UI and reveal `data-auth="in"` sections.
4. `GET /api/auth/logout` clears the cookie.
5. `GET /api/events/:slug/links` returns the real recording/slides URLs only
   if the session cookie is present and valid; otherwise `401`.

Session cookies last 30 days (`SESSION_TTL_SECONDS` in `worker/lib/session.ts`).

## Local development

```sh
npm install
npm run dev              # Astro dev server (site only, no Worker/auth)
```

To test the full auth flow locally (Worker + auth), you need a Discord
application redirecting to a local URL:

```sh
cp .dev.vars.example .dev.vars   # fill in your Discord app's client id/secret + your guild id
npm run worker:dev               # builds the site, then runs it under wrangler dev
```

In your [Discord Developer Portal](https://discord.com/developers/applications)
app, add `http://localhost:8787/api/auth/callback` as an OAuth2 redirect URL
while testing locally.

## Deploying to Cloudflare

This is set up as a **Worker with static assets** (`wrangler.toml`'s `main` +
`[assets]`), which is what Cloudflare's dashboard creates today when you
connect a Git repo under Workers & Pages — the classic "Pages" product with
file-based `functions/` routing and its own build pipeline isn't what you get
from a plain "Connect to Git" anymore. If you instead see a project with a
distinct "Build output directory" setting and no "Deploy command" field, it's
a classic Pages project and this repo's layout (one `worker/index.ts` entry
point rather than a `functions/` directory) won't match it — recreate the
project via Git connect and it should land as a Worker as described here.

1. Connect this GitHub repo (Workers & Pages → Connect to Git). Every merge
   to `main` auto-builds and deploys; PRs get preview deployments.
2. In the project's **Settings → Build**, set:
   - **Build command**: `npm run build` (runs `generate-events` then
     `astro build`, producing `dist/`)
   - **Deploy command**: `npx wrangler deploy` (this is Cloudflare's default
     for a Worker project — leave it as-is)
   - Root directory: `/`
3. Set these as **Runtime variables and secrets** (not "Build variables and
   secrets" — the Worker reads these at request time, not during the Astro
   build). Mark `DISCORD_CLIENT_SECRET` and `SESSION_SECRET` as **Secret**:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_GUILD_ID` — your Discord server's ID
   - `DISCORD_REDIRECT_URI` — `https://briknbytes.io/api/auth/callback`
   - `SESSION_SECRET` — a long random string (e.g. `openssl rand -hex 32`)
   - `SITE_URL` — `https://briknbytes.io`
4. In your Discord app's OAuth2 settings, add
   `https://briknbytes.io/api/auth/callback` as a redirect URL.
5. Add the custom domain `briknbytes.io` under the project's **Domains** tab.
6. Create the KV namespace that holds recording/slides URLs, and put its id
   in `wrangler.toml`:
   ```sh
   npx wrangler kv namespace create EVENTS_KV
   ```
   Copy the `id` it prints into `wrangler.toml`'s `[[kv_namespaces]]` block
   (replacing the `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` placeholder) — this id
   isn't a secret, it's safe to commit.

## Adding an event

Add a new file to `events/`, e.g. `events/2026-12-01-my-talk.yaml`:

```yaml
slug: my-talk
title: "My Talk Title"
date: "2026-12-01T18:00:00+01:00"
speaker: "Speaker Name"   # optional — omit or leave blank to hide it
tags: [kubernetes, security]
summary: >
  One or two sentences describing the talk.
has_recording: false   # flip to true once you've added the link to KV (below)
has_slides: false
```

Commit and push to `main` — the site rebuilds automatically.

## Adding a recording

Once you have a real recording/slides link for a past event, it does **not**
go in the YAML file (this repo is public — anyone could read it there). Instead:

1. Set the URL in KV, keyed by the event's `slug`:
   ```sh
   npx wrangler kv key put --binding=EVENTS_KV "my-talk" \
     '{"recordingUrl":"https://youtube.com/watch?v=...","slidesUrl":"https://slides.example.com/..."}'
   ```
   (Omit whichever of `recordingUrl`/`slidesUrl` you don't have yet — the
   site only shows a button for the ones present.) You can also do this from
   the Cloudflare dashboard: **Storage & Databases → KV → EVENTS_KV**.
2. Flip `has_recording: true` (and/or `has_slides: true`) in that event's
   YAML file, commit, and push — this tells the site to show the gated
   section at all. Logged-out visitors still just see "members only"; the
   real link only appears after a member logs in with Discord.

## Placeholder content to replace

- `src/config.ts` — `discordInviteUrl` (currently a placeholder invite) and
  `githubUrl`.
