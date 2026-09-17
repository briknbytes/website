// The homepage banner is rendered at build time whenever the events/ data
// still has a future event, but the site is static and doesn't rebuild
// itself when the clock ticks past that date. So we do the final check in
// the browser: hide the banner once its data-event-date has actually passed.
const banner = document.querySelector<HTMLElement>("[data-upcoming-banner]");
if (banner) {
  const iso = banner.dataset.eventDate;
  if (!iso || new Date(iso).getTime() <= Date.now()) {
    banner.hidden = true;
  }
}
