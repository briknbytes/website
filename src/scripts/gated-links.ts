// Buttons rendered with [data-gated-links="<slug>"] fetch the real
// recording/slides URLs from the server (only returned if the session
// cookie proves Discord guild membership) and render them in place.
// The URLs never sit in the static HTML/JSON to begin with.
document.addEventListener("bnb:auth", async (e) => {
  const { loggedIn } = (e as CustomEvent<{ loggedIn: boolean }>).detail;
  if (!loggedIn) return;

  const containers = document.querySelectorAll<HTMLElement>("[data-gated-links]");
  for (const container of containers) {
    const slug = container.dataset.gatedLinks;
    if (!slug) continue;

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}/links`, {
        credentials: "same-origin",
      });
      if (!res.ok) continue;
      const { recordingUrl, slidesUrl } = (await res.json()) as {
        recordingUrl: string | null;
        slidesUrl: string | null;
      };

      container.innerHTML = "";
      if (recordingUrl) {
        container.appendChild(makeLink(recordingUrl, "Watch recording"));
      }
      if (slidesUrl) {
        container.appendChild(makeLink(slidesUrl, "View slides"));
      }
      if (!recordingUrl && !slidesUrl) {
        container.textContent = "No recording or slides posted for this event yet.";
      }
    } catch {
      container.textContent = "Couldn't load links right now — try refreshing.";
    }
  }
});

function makeLink(href: string, label: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = label;
  a.className = "btn btn-outline";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}
