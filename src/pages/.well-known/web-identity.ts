export const prerender = false;

import type { APIRoute } from "astro";

/**
 * FedCM & EVP Well-Known Web Identity Endpoint (/.well-known/web-identity)
 *
 * Standard browsers call this endpoint during Federated Credential Management (FedCM)
 * and EVP discovery.
 *
 * To prevent manifest fingerprinting and satisfy WICG EVP specification Section 3.3,
 * this endpoint returns BOTH:
 * - provider_urls (for FedCM security validation)
 * - accounts_endpoint & login_url (fetched directly by EVP accounts validation)
 */
export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  return new Response(
    JSON.stringify({
      provider_urls: [`${origin}/made/email-provider/config.json`],
      accounts_endpoint: `${origin}/made/email-provider/accounts`,
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
