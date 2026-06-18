export const prerender = false;

import type { APIRoute } from "astro";

/**
 * FedCM Accounts Endpoint
 *
 * Serves at /made/email-provider/accounts
 * Standard browsers call this endpoint with credentials (cookies) during EVP / FedCM
 * validation to retrieve the list of accounts currently logged in.
 *
 * The browser compares the email of these accounts against the autofilled email
 * address to verify identity ownership.
 */
export const GET: APIRoute = async ({ cookies, request }) => {
  const origin = request.headers.get("origin") || "*";
  const isLoggedIn = cookies.get("__session")?.value === "active";

  const responseBody = {
    accounts: isLoggedIn
      ? [
          {
            id: "demo-evt-user",
            name: "Demo User",
            email: "demo@rowan.fyi",
            given_name: "Demo",
          },
        ]
      : [],
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type",
      "Origin-Trial":
        "AhXp8ak/QLxZjlTcDhudtMFPwVwV3MrqSIO/OODXG2IknnKycOuqn+z/h195Ob/0B4vF42nTcV8lQbESLVggNQQAAABceyJvcmlnaW4iOiJodHRwczovL3Jvd2FuLmZ5aTo0NDMiLCJmZWF0dXJlIjoiRW1haWxWZXJpZmljYXRpb25Qcm90b2NvbCIsImV4cGlyeSI6MTc5NDg3MzYwMH0=",
    },
  });
};
