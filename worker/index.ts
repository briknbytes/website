// Single Worker entry point. Cloudflare serves any request that matches a
// file under dist/ (the Astro build) directly via the ASSETS binding
// without ever reaching this script (see wrangler.toml's [assets] block,
// default run_worker_first = false). Everything else — in practice, only
// /api/* — falls through to fetch() below.
import { buildAuthorizeUrl, exchangeCodeForToken, fetchDiscordUser, isGuildMember, type DiscordEnv } from "./lib/discord";
import {
  buildOAuthStateCookie,
  buildSessionCookie,
  clearOAuthStateCookie,
  clearSessionCookie,
  getSession,
  readOAuthStateCookie,
} from "./lib/session";

export interface Env extends DiscordEnv {
  SESSION_SECRET: string;
  SITE_URL: string;
  ASSETS: Fetcher;
  // Holds the actual recording/slides URLs, keyed by event slug, as JSON
  // { recordingUrl?: string; slidesUrl?: string }. Deliberately NOT part of
  // the git repo (which is public) — set via `wrangler kv key put` or the
  // Cloudflare dashboard. See README's "Adding a recording" section.
  EVENTS_KV: KVNamespace;
}

interface GatedLinks {
  recordingUrl?: string;
  slidesUrl?: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/auth/login") return handleLogin(env);
    if (pathname === "/api/auth/callback") return handleCallback(request, env);
    if (pathname === "/api/auth/logout") return handleLogout(env);
    if (pathname === "/api/auth/me") return handleMe(request, env);

    const linksMatch = pathname.match(/^\/api\/events\/([^/]+)\/links$/);
    if (linksMatch) return handleLinks(request, env, linksMatch[1]);

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleLogin(env: Env): Promise<Response> {
  const state = crypto.randomUUID();
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", buildAuthorizeUrl(env, state)],
      ["Set-Cookie", buildOAuthStateCookie(state)],
    ],
  });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readOAuthStateCookie(request);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(env, "invalid_state");
  }

  const token = await exchangeCodeForToken(env, code);
  if (!token) return redirectWithError(env, "token_exchange_failed");

  const isMember = await isGuildMember(env, token.access_token);
  if (!isMember) return redirectWithError(env, "not_a_member");

  const user = await fetchDiscordUser(token.access_token);
  if (!user) return redirectWithError(env, "user_lookup_failed");

  const sessionCookie = await buildSessionCookie(user.id, env.SESSION_SECRET);

  return new Response(null, {
    status: 302,
    headers: [
      ["Location", env.SITE_URL || "/"],
      ["Set-Cookie", sessionCookie],
      ["Set-Cookie", clearOAuthStateCookie()],
    ],
  });
}

function redirectWithError(env: Env, reason: string): Response {
  const base = env.SITE_URL || "/";
  const location = `${base.replace(/\/$/, "")}/?auth_error=${encodeURIComponent(reason)}`;
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", location],
      ["Set-Cookie", clearOAuthStateCookie()],
    ],
  });
}

async function handleLogout(env: Env): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", env.SITE_URL || "/"],
      ["Set-Cookie", clearSessionCookie()],
    ],
  });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const session = await getSession(request, env.SESSION_SECRET);
  return Response.json({ loggedIn: Boolean(session) });
}

async function handleLinks(request: Request, env: Env, slug: string): Promise<Response> {
  const session = await getSession(request, env.SESSION_SECRET);
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const links = await env.EVENTS_KV.get<GatedLinks>(slug, "json");

  return Response.json({
    recordingUrl: links?.recordingUrl ?? null,
    slidesUrl: links?.slidesUrl ?? null,
  });
}
