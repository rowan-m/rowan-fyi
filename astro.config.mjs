// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: "https://rowan.fyi",
  trailingSlash: "ignore",
  scopedStyleStrategy: "where",
  output: "static",
  adapter: node({
    mode: "standalone",
  }),
  build: {
    format: "directory",
  },
  integrations: [sitemap()],
  security: {
    checkOrigin: true,
    allowedDomains: [
      {
        hostname: "rowan.fyi",
        protocol: "https",
      },
      {
        hostname: "*.web.app",
        protocol: "https",
      },
    ],
  },
});
