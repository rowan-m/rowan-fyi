export const prerender = false;

import type { APIRoute } from "astro";
import { parseCookieHeader } from "../samesite-sandbox/_cookies";
import { isAllowedOrigin } from "./_x-origin";

export const GET: APIRoute = ({ request }) => {
  const origin = request.headers.get("origin");
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "https://rowan.fyi/made/x-origin-src";
  const timestamp = Date.now();
  const cookies = parseCookieHeader(request.headers.get("cookie"));

  return new Response(JSON.stringify(cookies), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Set-Cookie": `3pc=${timestamp}; Path=/; Secure; SameSite=None`,
    },
  });
};
