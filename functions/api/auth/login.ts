import { buildAuthorizeUrl, type DiscordEnv } from "../../_lib/discord";
import { buildOAuthStateCookie } from "../../_lib/session";

interface Env extends DiscordEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(env, state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Set-Cookie": buildOAuthStateCookie(state),
    },
  });
};
