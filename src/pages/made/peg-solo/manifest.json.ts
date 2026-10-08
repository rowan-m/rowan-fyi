import type { APIRoute } from "astro";
import catGrin from "./assets/cat-grin.png";
import screenshot from "./assets/play-peg-solitaire-screenshot.png";

export const prerender = true;

const assetSrc = (asset: string | { src: string }): string => (typeof asset === "string" ? asset : asset.src);

export const GET: APIRoute = () => {
  const manifest = {
    background_color: "#f0f8ff",
    description:
      "Play an online version of the classic game: Peg Solitaire AKA Solo Noble AKA Brainvita with bonus cat emoji.",
    dir: "ltr",
    display: "standalone",
    name: "Peg Solitaire / Solo Noble",
    orientation: "any",
    scope: "/made/peg-solo/",
    short_name: "Peg Solo",
    start_url: "/made/peg-solo/",
    theme_color: "#4682b4",
    icons: [
      {
        src: assetSrc(catGrin),
        sizes: "534x534",
        type: "image/png",
      },
    ],
    categories: ["games", "puzzle"],
    screenshots: [
      {
        src: assetSrc(screenshot),
        sizes: "1920x960",
        type: "image/png",
      },
    ],
    shortcuts: [],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
};
