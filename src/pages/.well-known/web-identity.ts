export const prerender = false;

import type { APIRoute } from "astro";

/**
 * FedCM Well-Known Web Identity Endpoint (/.well-known/web-identity)
 *
 * Standard browsers call this endpoint during Federated Credential Management (FedCM)
 * discovery to fetch a list of authorized provider configuration URLs. This is a crucial
 * security mechanism to prevent any website from acting as an identity provider.
 */
export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  return new Response(
    JSON.stringify({
      provider_urls: [`${origin}/made/email-provider/config.json`],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};
