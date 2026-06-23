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
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Origin-Trial":
          "ArlNTb0I5sWYtpsINNIp66oP6s/jRB8b/b4YThumFJixzpxdYvaW1mUEAjNOYSaS/aTpZ2bVDPElzEtTmGGS3A4AAAB8eyJvcmlnaW4iOiJodHRwczovL3ByLTU2LS0tcm93YW4tZnlpLWRqbDYzaHJhZnEtZXcuYS5ydW4uYXBwOjQ0MyIsImZlYXR1cmUiOiJFbWFpbFZlcmlmaWNhdGlvblByb3RvY29sIiwiZXhwaXJ5IjoxNzk0ODczNjAwfQ==",
      },
    },
  );
};
