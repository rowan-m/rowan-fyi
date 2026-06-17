// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://rowan.fyi",
  trailingSlash: "ignore",
  output: "static",
  adapter: node({
    mode: "middleware",
  }),
  build: {
    format: "directory",
  },
  integrations: [sitemap()],
});
