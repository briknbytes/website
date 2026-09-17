import { getSession } from "../../../_lib/session";
import events from "../../../_data/events.json";

interface Env {
  SESSION_SECRET: string;
}

interface GatedEvent {
  slug: string;
  recordingUrl: string | null;
  slidesUrl: string | null;
}

// The only place recording/slides URLs are ever served. Requires a valid
// session cookie (proven Discord guild membership at login time) — anonymous
// requests get 401, and there is no way to enumerate or guess these URLs
// from the public site since they never appear in the static HTML/JSON.
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const session = await getSession(request, env.SESSION_SECRET);
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const slug = params.slug as string;
  const event = (events as GatedEvent[]).find((e) => e.slug === slug);
  if (!event) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    recordingUrl: event.recordingUrl,
    slidesUrl: event.slidesUrl,
  });
};
