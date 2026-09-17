# Brik & Bytes — website

Static site for the Brik & Bytes community (Tunisian infrastructure/DevOps/Kubernetes),
built with [Astro](https://astro.build) and deployed to Cloudflare Pages. Gated content
(event recordings/slides) is protected by a Discord-membership check running in
Cloudflare Pages Functions — no separate accounts, no passwords, no stored email.

## How it's put together

- `events/*.yaml` — one file per event, the **only** source of event data (public
  fields + gated `recording_url`/`slides_url`).
- `scripts/generate-events.mjs` — splits that into:
  - `src/data/events-public.json` (generated, gitignored) — public fields only,
    consumed by the Astro build. Recording/slides URLs never enter this file or
    the static HTML — only booleans (`hasRecording`/`hasSlides`).
  - `functions/_data/events.json` (generated, gitignored) — full records,
    bundled into the Pages Functions only.
- `src/pages/`, `src/components/` — the static site (homepage, events list,
  event detail pages).
- `functions/api/auth/*` — Discord OAuth login/callback/logout/me endpoints.
- `functions/api/events/[slug]/links.ts` — the only endpoint that ever returns
  a recording/slides URL, and only with a valid session cookie.

Run `npm run generate:events` (or `npm run dev` / `npm run build`, which do it
for you via `predev`/`prebuild`) whenever you add or edit an event file.

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

Session cookies last 30 days (`SESSION_TTL_SECONDS` in `functions/_lib/session.ts`).

## Local development

```sh
npm install
npm run dev              # Astro dev server (site only, no Functions/auth)
```

To test the full auth flow locally (Functions + auth), you need a Discord
application redirecting to a local URL:

```sh
cp .dev.vars.example .dev.vars   # fill in your Discord app's client id/secret + your guild id
npm run pages:dev                # builds the site, then runs it under wrangler with Functions
```

In your [Discord Developer Portal](https://discord.com/developers/applications)
app, add `http://localhost:8788/api/auth/callback` as an OAuth2 redirect URL
while testing locally.

## Deploying to Cloudflare Pages

1. Connect this GitHub repo in the Cloudflare dashboard (Workers & Pages →
   Create → Pages → Connect to Git). Every merge to `main` auto-builds and
   deploys; PRs get preview deployments.
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Functions are picked up automatically from `functions/` at the repo root.
3. Set these as Pages environment variables (Settings → Environment variables
   — put secrets in "Encrypt" mode for `DISCORD_CLIENT_SECRET` and
   `SESSION_SECRET`):
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_GUILD_ID` — your Discord server's ID
   - `DISCORD_REDIRECT_URI` — `https://briknbytes.io/api/auth/callback`
   - `SESSION_SECRET` — a long random string (e.g. `openssl rand -hex 32`)
   - `SITE_URL` — `https://briknbytes.io`
4. In your Discord app's OAuth2 settings, add
   `https://briknbytes.io/api/auth/callback` as a redirect URL.
5. Add the custom domain `briknbytes.io` under the Pages project's Custom
   domains tab.

## Adding an event

Add a new file to `events/`, e.g. `events/2026-12-01-my-talk.yaml`:

```yaml
slug: my-talk
title: "My Talk Title"
date: "2026-12-01T18:00:00+01:00"
speaker: "Speaker Name"
tags: [kubernetes, security]
summary: >
  One or two sentences describing the talk.
recording_url: ""   # fill in after the event; leave blank until then
slides_url: ""
```

Commit and push to `main` — the site rebuilds automatically. Leave
`recording_url`/`slides_url` blank until you have them; the event will show
with no gated section until then.

## Placeholder content to replace

- `src/config.ts` — `discordInviteUrl` (currently a placeholder invite).
- `src/assets/logo.svg` / `public/favicon.svg` — placeholder "B&B" mark.
- `events/2026-11-10-example-upcoming-event.yaml` and
  `events/2026-06-04-example-past-event.yaml` — delete once you have real events;
  they exist so you can see the upcoming-event banner, the public summary, and
  the logged-out/logged-in states of a gated recording link.
