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
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Origin-Trial":
        "ArlNTb0I5sWYtpsINNIp66oP6s/jRB8b/b4YThumFJixzpxdYvaW1mUEAjNOYSaS/aTpZ2bVDPElzEtTmGGS3A4AAAB8eyJvcmlnaW4iOiJodHRwczovL3ByLTU2LS0tcm93YW4tZnlpLWRqbDYzaHJhZnEtZXcuYS5ydW4uYXBwOjQ0MyIsImZlYXR1cmUiOiJFbWFpbFZlcmlmaWNhdGlvblByb3RvY29sIiwiZXhwaXJ5IjoxNzk0ODczNjAwfQ==",
    },
  });
};
