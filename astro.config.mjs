// @ts-check
import fs from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import node from "@astrojs/node";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
import { unified } from "@astrojs/markdown-remark";

/**
 * Checks whether a bare module specifier imported in an `.astro` file during
 * Vite's dev dependency scan belongs to a `<script type="importmap">` or an
 * unbundled `<script is:inline>` block.
 *
 * @param {string} id
 * @param {string} astroFilePath
 * @returns {boolean}
 */
function isClientSideInlineImport(id, astroFilePath) {
  let source;
  try {
    source = fs.readFileSync(astroFilePath, "utf-8");
  } catch {
    return false;
  }

  for (const match of source.matchAll(/<script\b[^>]*\btype=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const imports = parsed?.imports;
      if (imports && typeof imports === "object") {
        for (const key of Object.keys(imports)) {
          if (id === key || (key.endsWith("/") && id.startsWith(key))) {
            return true;
          }
        }
      }
    } catch {
      // Ignore malformed importmap JSON
    }
  }

  for (const match of source.matchAll(/<script\b[^>]*\bis:inline\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (match[1].includes(id)) {
      return true;
    }
  }

  return false;
}

/**
 * Exempts extensionless API endpoints (e.g. /.well-known/*, /made/email-provider/jwks)
 * from Astro's `trailingSlash: "always"` enforcement and 301/308 redirects, and
 * prevents Vite's dev dependency scanner from failing on client-side `<script is:inline>`
 * / `<script type="importmap">` imports.
 *
 * @returns {import("astro").AstroIntegration}
 */
function exemptEndpointsFromTrailingSlash() {
  /** @type {Set<string>} */
  const endpointPaths = new Set();

  return {
    name: "exempt-endpoints-from-trailing-slash",
    hooks: {
      "astro:route:setup": ({ route }) => {
        const routeData = /** @type {import("astro").RouteData} */ (/** @type {unknown} */ (route));
        if (routeData.type === "endpoint") {
          // Allow matching the endpoint without a trailing slash.
          // eslint-disable-next-line security/detect-non-literal-regexp
          routeData.pattern = new RegExp(routeData.pattern.source.replace(/\\\/?\$$/, "$"));
          if (routeData.pathname) {
            endpointPaths.add(routeData.pathname);
          }
        }
      },
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: "exempt-endpoints-from-trailing-slash-vite",
                resolveId(id, importer, options) {
                  const scanOptions = /** @type {{ scan?: boolean } | undefined} */ (options);
                  if (scanOptions?.scan && importer?.includes(".astro")) {
                    const astroFilePath = importer.split("?")[0];
                    if (isClientSideInlineImport(id, astroFilePath)) {
                      return { id, external: true };
                    }
                  }
                  return null;
                },
                transform(code, id) {
                  if (id.includes("@astrojs/node") && id.endsWith("serve-static.js")) {
                    return code.replace(
                      "if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath))",
                      `if (!hasSlash && !hasFileExtension(urlPath) && !isInternalPath(urlPath) && !${JSON.stringify([...endpointPaths])}.includes(urlPath))`,
                    );
                  }
                  if (id.includes("astro") && id.endsWith("trailing-slash-handler.js")) {
                    return code.replace(
                      "function handleTrailingSlash(state) {",
                      'function handleTrailingSlash(state) { if (state.routeData?.type === "endpoint") return void 0;',
                    );
                  }
                  return null;
                },
              },
            ],
          },
        });
      },
      "astro:server:setup": ({ server }) => {
        for (const layer of server.middlewares.stack) {
          if (typeof layer.handle === "function" && layer.handle.name === "devTrailingSlash") {
            const original = layer.handle;
            layer.handle = function devTrailingSlash(req, res, next) {
              const pathname = req.url?.split("?")[0];
              if (pathname && endpointPaths.has(pathname)) {
                return next();
              }
              return original(req, res, next);
            };
          }
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://rowan.fyi",
  trailingSlash: "always",
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
  integrations: [sitemap(), exemptEndpointsFromTrailingSlash()],
  security: {
    checkOrigin: false,
    allowedDomains: [
      {
        hostname: "rowan.fyi",
        protocol: "https",
      },
      {
        hostname: "*.run.app",
        protocol: "https",
      },
    ],
  },
});
