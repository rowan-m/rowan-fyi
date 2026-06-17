export const prerender = false;

import type { APIRoute } from "astro";
import { importJWK, jwtVerify, SignJWT, decodeProtectedHeader } from "jose";
import type { JWK } from "jose";
import { PRIVATE_KEY_JWK } from "./_keys";

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    // 1. Verify Authentication Cookie
    const session = cookies.get("evp_session")?.value;
    if (session !== "active") {
      return new Response(
        JSON.stringify({
          error: "authentication_required",
          error_description:
            "User must be authenticated and have control of the requested email address.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // 2. Parse Request Body
    const contentType = request.headers.get("content-type") || "";
    let requestToken = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      requestToken = formData.get("request_token") as string;
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      requestToken = body.request_token || body.email;
    }

    if (!requestToken) {
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description: "Missing request_token in body.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    let email = "";
    let browserJwk: JWK | undefined = undefined;

    if (requestToken.includes(".")) {
      // Decode the header to extract the browser's ephemeral public key (jwk)
      const header = decodeProtectedHeader(requestToken);
      browserJwk = header.jwk as JWK | undefined;

      if (!browserJwk) {
        return new Response(
          JSON.stringify({
            error: "invalid_signature",
            error_description:
              "Missing ephemeral public key (jwk) in request token header.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      }

      // Import the browser's public key
      const alg = (header.alg as string) || "ES256";
      const publicKey = await importJWK(browserJwk, alg);

      // Verify the request_token signature
      const { payload } = await jwtVerify(requestToken, publicKey);
      email = payload.email as string;
    } else {
      email = requestToken;
    }

    // 3. Verify target email is demo@rowan.fyi
    if (email !== "demo@rowan.fyi") {
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description:
            "Only demo@rowan.fyi is supported for this demo provider.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    if (!browserJwk) {
      browserJwk = {
        kty: "EC",
        crv: "P-256",
        x: "dV4TUV9zA_0Ssy5Y91xheN57NKDryji2c3Qy6he6sw4",
        y: "A-oMMDlM_ML_jiZMIQqU4ZmZSEpW3sH62-x2LlRLuyU",
      };
    }

    // 4. Generate the EVT (Email Verification Token)
    const privateKey = await importJWK(PRIVATE_KEY_JWK, "ES256");
    const origin = url.origin;

    const evtPayload = {
      iss: origin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes expiration
      cnf: {
        jwk: browserJwk,
      },
      email: "demo@rowan.fyi",
      email_verified: true,
    };

    const evtJwt = await new SignJWT(evtPayload)
      .setProtectedHeader({
        alg: "ES256",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      })
      .sign(privateKey);

    const issuanceToken = `${evtJwt}~`;

    return new Response(
      JSON.stringify({
        issuance_token: issuanceToken,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Issuance error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An internal error occurred during token issuance.";
    return new Response(
      JSON.stringify({
        error: "server_error",
        error_description: message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};
