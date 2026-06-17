// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // site: "https://rowan.fyi",
  site: "https://rowan-fyi--pr47-feature-email-verifi-mplclx4x.web.app",
  trailingSlash: "ignore",
  output: "server",
  adapter: node({
    mode: "middleware",
  }),
  build: {
    format: "directory",
  },
  integrations: [sitemap()],
});
