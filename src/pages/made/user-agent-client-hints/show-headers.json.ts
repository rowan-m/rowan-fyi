export const prerender = false;

import type { APIRoute } from "astro";
import { UACH_HINTS } from "./_uach";

export const GET: APIRoute = ({ request }) => {
  const uachHeaders = Object.fromEntries(UACH_HINTS.map((hint) => [hint, request.headers.get(hint) ?? undefined]));

  return new Response(
    JSON.stringify({
      "Sec-CH-UA": uachHeaders,
      "User-Agent": request.headers.get("user-agent") ?? undefined,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};
