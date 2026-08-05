export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  return new Response(
    JSON.stringify({
      issuance_endpoint: `${origin}/made/email-provider/issuance`,
      jwks_uri: `${origin}/made/email-provider/jwks`,
      signing_alg_values_supported: ["EdDSA"],
      private_email_supported: false,
      webauthn_supported: false,
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
