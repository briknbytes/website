// Runs on every page. Checks /api/auth/me and toggles any element with
// [data-auth="in"] / [data-auth="out"], and swaps [data-login-href] targets.
// This never gates real content by itself — it only toggles UI affordances.
// The actual gate is server-side in functions/api/events/[slug]/links.ts.
async function applyAuthState() {
  let loggedIn = false;
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (res.ok) {
      const data = (await res.json()) as { loggedIn?: boolean };
      loggedIn = Boolean(data.loggedIn);
    }
  } catch {
    // Network hiccup or local dev without functions running — treat as logged out.
  }

  document.querySelectorAll<HTMLElement>('[data-auth="in"]').forEach((el) => {
    el.hidden = !loggedIn;
  });
  document.querySelectorAll<HTMLElement>('[data-auth="out"]').forEach((el) => {
    el.hidden = loggedIn;
  });

  document.dispatchEvent(new CustomEvent("bnb:auth", { detail: { loggedIn } }));
}

applyAuthState();
