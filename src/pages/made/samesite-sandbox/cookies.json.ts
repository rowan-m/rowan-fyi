export const prerender = false;

import type { APIRoute } from "astro";
import { parseCookieHeader } from "./_cookies";

export const ALL: APIRoute = ({ request }) => {
  const cookies = parseCookieHeader(request.headers.get("cookie"));

  return new Response(JSON.stringify(cookies), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://rowan.fyi/made/x-origin-src",
      "Access-Control-Allow-Credentials": "true",
    },
  });
};
