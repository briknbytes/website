import { getSession } from "../../_lib/session";

interface Env {
  SESSION_SECRET: string;
}

// Cheap endpoint the client polls on page load to decide whether to show
// "Login with Discord" or "Logged in" / reveal gated UI affordances.
// Never returns anything beyond a boolean — no user data is stored or echoed.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(request, env.SESSION_SECRET);
  return Response.json({ loggedIn: Boolean(session) });
};
