// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
import { unified } from "@astrojs/markdown-remark";

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
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeMathjax],
    }),
  },
  integrations: [sitemap()],
  security: {
    checkOrigin: false,
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
