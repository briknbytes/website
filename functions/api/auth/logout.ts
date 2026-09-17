import { clearSessionCookie } from "../../_lib/session";

interface Env {
  SITE_URL: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", env.SITE_URL || "/"],
      ["Set-Cookie", clearSessionCookie()],
    ],
  });
};
