export const prerender = false;

import type { APIRoute } from "astro";

/**
 * FedCM Identity Provider Configuration File
 *
 * Serves at /made/email-provider/config.json
 * Advertises the specific endpoints used by the browser to fetch accounts and
 * direct users to log in if their session is expired.
 */
export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  return new Response(
    JSON.stringify({
      accounts_endpoint: `${origin}/made/email-provider/accounts`,
      login_url: `${origin}/made/email-provider/`,
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
