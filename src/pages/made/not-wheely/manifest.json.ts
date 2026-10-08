import type { APIRoute } from "astro";
import icon192 from "./assets/android-chrome-192x192.png";
import icon512 from "./assets/android-chrome-512x512.png";

export const prerender = true;

const assetSrc = (asset: string | { src: string }): string => (typeof asset === "string" ? asset : asset.src);

export const GET: APIRoute = () => {
  const manifest = {
    name: "Not wheely",
    short_name: "NotWheely",
    start_url: "/made/not-wheely/",
    icons: [
      {
        src: assetSrc(icon192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: assetSrc(icon512),
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    theme_color: "#8a8a8a",
    background_color: "#8a8a8a",
    display: "standalone",
    orientation: "any",
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
};
