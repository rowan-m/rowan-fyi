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
          "AhXp8ak/QLxZjlTcDhudtMFPwVwV3MrqSIO/OODXG2IknnKycOuqn+z/h195Ob/0B4vF42nTcV8lQbESLVggNQQAAABceyJvcmlnaW4iOiJodHRwczovL3Jvd2FuLmZ5aTo0NDMiLCJmZWF0dXJlIjoiRW1haWxWZXJpZmljYXRpb25Qcm90b2NvbCIsImV4cGlyeSI6MTc5NDg3MzYwMH0=",
      },
    },
  );
};
