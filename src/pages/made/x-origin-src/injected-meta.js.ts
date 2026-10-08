export const prerender = true;

import type { APIRoute } from "astro";
import { ORIGIN_TRIAL_3P } from "./_x-origin";

const SCRIPT = `const otMeta = document.createElement("meta");
otMeta.httpEquiv = "origin-trial";
otMeta.content = ${JSON.stringify(ORIGIN_TRIAL_3P)};
document.head.append(otMeta);
`;

export const GET: APIRoute = () => {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
};
