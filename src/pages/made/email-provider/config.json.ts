export const prerender = false;

import type { APIRoute } from "astro";

/**
 * FedCM Identity Provider Configuration File
 *
 * Serves at /made/email-provider/config.json
 * Advertises the specific endpoints used by the browser to fetch accounts and
 * direct users to log in if their session is expired.
 *
 * NOTE: Standard browser FedCM parsers strictly require all three of:
 * - accounts_endpoint
 * - id_assertion_endpoint
 * - login_url
 * to be declared in this manifest, otherwise the configuration is rejected.
 */
export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  return new Response(
    JSON.stringify({
      accounts_endpoint: `${origin}/made/email-provider/accounts`,
      id_assertion_endpoint: `${origin}/made/email-provider/issuance`,
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
