export const prerender = false;

import type { APIRoute } from "astro";
import { parseCookieHeader } from "../samesite-sandbox/_cookies";
import { isAllowedOrigin } from "./_x-origin";

export const GET: APIRoute = ({ request }) => {
  const origin = request.headers.get("origin");
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return new Response(JSON.stringify(cookies), {
    status: 200,
    headers,
  });
};
