export const prerender = false;

import type { APIRoute } from "astro";

export const ALL: APIRoute = () => {
  return new Response("", {
    status: 200,
  });
};
