import { defineConfig } from "astro/config";

// Static output — Cloudflare Pages serves the build from `dist/`,
// and Pages Functions in `functions/` handle the auth + gated-links API
// independently of the Astro build.
export default defineConfig({
  site: "https://briknbytes.io",
  output: "static",
});
