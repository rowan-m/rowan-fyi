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
        "Access-Control-Allow-Origin": "*",
        "Origin-Trial":
          "AhXp8ak/QLxZjlTcDhudtMFPwVwV3MrqSIO/OODXG2IknnKycOuqn+z/h195Ob/0B4vF42nTcV8lQbESLVggNQQAAABceyJvcmlnaW4iOiJodHRwczovL3Jvd2FuLmZ5aTo0NDMiLCJmZWF0dXJlIjoiRW1haWxWZXJpZmljYXRpb25Qcm90b2NvbCIsImV4cGlyeSI6MTc5NDg3MzYwMH0=",
      },
    },
  );
};
