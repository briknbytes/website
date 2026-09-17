import { defineConfig } from "astro/config";

// Static output — the Cloudflare Worker (worker/index.ts) serves the build
// from `dist/` as static assets and handles the auth + gated-links API
// itself, independently of the Astro build.
export default defineConfig({
  site: "https://briknbytes.io",
  output: "static",
});
