import type { APIRoute } from "astro";
import icon72 from "./assets/icon-72x72.png";
import icon96 from "./assets/icon-96x96.png";
import icon128 from "./assets/icon-128x128.png";
import icon144 from "./assets/icon-144x144.png";
import icon152 from "./assets/icon-152x152.png";
import icon192 from "./assets/icon-192x192.png";
import icon384 from "./assets/icon-384x384.png";
import icon512 from "./assets/icon-512x512.png";
import shotNarrow1 from "./assets/Screenshot_20230416-131203.jpg";
import shotWide1 from "./assets/screenshot-wide-1.jpg";
import shotWide2 from "./assets/screenshot-wide-2.jpg";
import shotNarrow2 from "./assets/Screenshot_20230416-131338.jpg";
import shotNarrow3 from "./assets/Screenshot_20230416-133508.jpg";

export const prerender = true;

const assetSrc = (asset: string | { src: string }): string => (typeof asset === "string" ? asset : asset.src);

export const GET: APIRoute = () => {
  const manifest = {
    dir: "ltr",
    lang: "en",
    name: "Fractious",
    short_name: "Fractious",
    scope: "/made/fractious",
    display: "standalone",
    start_url: "/made/fractious/",
    id: "/made/fractious/",
    background_color: "#3e5c89",
    theme_color: "#3e5c89",
    description:
      "Explore infinite fractals in the Mandelbrot set. Discover beautiful downloadable images and share locations with friends—all with simple, fun controls.",
    categories: ["education", "entertainment"],
    orientation: "any",
    related_applications: [],
    prefer_related_applications: false,
    icons: [
      {
        src: assetSrc(icon72),
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetSrc(icon96),
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetSrc(icon128),
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetSrc(icon144),
        sizes: "144x144",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: assetSrc(icon152),
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: assetSrc(icon192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: assetSrc(icon384),
        sizes: "384x384",
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
    screenshots: [
      {
        src: assetSrc(shotNarrow1),
        sizes: "1080x2400",
        type: "image/jpg",
        platform: "narrow",
        label: "☝ Drag and zoom on any touchscreen device for quick, intuitive navigation.",
      },
      {
        src: assetSrc(shotWide1),
        sizes: "2256x1446",
        type: "image/jpg",
        platform: "wide",
        label: "✨ The iconic Mandelbrot fractal ready for you to dive in.",
      },
      {
        src: assetSrc(shotWide2),
        sizes: "2256x1446",
        type: "image/jpg",
        platform: "wide",
        label: "🔎 Adjust deep zoom and iterations to discover amazing microscopic details.",
      },
      {
        src: assetSrc(shotNarrow2),
        sizes: "1080x2400",
        type: "image/jpg",
        platform: "narrow",
        label: "🌈 Adjust the colour and palette for even more image variation.",
      },
      {
        src: assetSrc(shotNarrow3),
        sizes: "1080x2400",
        type: "image/jpg",
        platform: "narrow",
        label: "🔥 Discover images that no-one else has seen before—there are infinite combinations!",
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
};
