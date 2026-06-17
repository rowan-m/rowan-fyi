// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://rowan.fyi",
  trailingSlash: "ignore",
  output: "server",
  adapter: node({
    mode: "middleware",
    experimentalDisableStreaming: true,
  }),
  build: {
    format: "directory",
  },
  integrations: [sitemap()],
});
