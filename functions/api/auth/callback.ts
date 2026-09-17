import { exchangeCodeForToken, fetchDiscordUser, isGuildMember, type DiscordEnv } from "../../_lib/discord";
import { buildSessionCookie, clearOAuthStateCookie, readOAuthStateCookie } from "../../_lib/session";

interface Env extends DiscordEnv {
  SESSION_SECRET: string;
  SITE_URL: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
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
};

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
