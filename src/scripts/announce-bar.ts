// The bar is served hidden. Reveal it only if the event date hasn't passed
// yet and the visitor hasn't already dismissed this specific event (tracked
// by slug in localStorage, so a new upcoming event shows again even if the
// previous one was dismissed).
try {
  const bar = document.querySelector<HTMLElement>("[data-announce-bar]");
  if (bar) {
    const iso = bar.dataset.eventDate;
    const slug = bar.dataset.eventSlug ?? "";
    const datePassed = !iso || new Date(iso).getTime() <= Date.now();
    const dismissedSlug = localStorage.getItem("bnb_announce_dismissed");

    if (!datePassed && dismissedSlug !== slug) {
      bar.hidden = false;
      const closeBtn = bar.querySelector<HTMLButtonElement>("[data-announce-close]");
      closeBtn?.addEventListener("click", () => {
        bar.hidden = true;
        try {
          localStorage.setItem("bnb_announce_dismissed", slug);
        } catch {
          // Private browsing or storage disabled — dismissal just won't persist.
        }
      });
    }
  }
} catch {
  // localStorage inaccessible — leave the bar hidden rather than risk a stuck banner.
}
