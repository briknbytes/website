import events from "../data/events-public.json";

export function getUpcomingEvent() {
  const now = Date.now();
  return events
    .filter((e) => new Date(e.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
}

export function getLatestEvent() {
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export { events };
