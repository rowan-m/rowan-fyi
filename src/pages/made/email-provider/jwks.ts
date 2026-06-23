export const prerender = false;

import { PUBLIC_KEY_JWK } from "./_keys";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      keys: [PUBLIC_KEY_JWK],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
};
