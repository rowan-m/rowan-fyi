export const prerender = false;

import type { APIRoute } from "astro";
import { importJWK, jwtVerify, SignJWT, decodeProtectedHeader } from "jose";
import type { JWK } from "jose";
import { PRIVATE_KEY_JWK } from "./_keys";

/**
 * Issuer Issuance Endpoint (EVP Standard API Route)
 *
 * In the Email Verification Protocol (EVP), the browser makes a credentialed POST request
 * to this endpoint to request a signed Email Verification Token (EVT).
 *
 * We process the request through 5 clear, sequential steps.
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    // ==============================================================================
    // STEP 0: SEC-FETCH-DEST HEADER VALIDATION (IETF Draft Section 7.4.3 & WICG Section 3.5)
    // ==============================================================================
    // To protect user privacy and prevent CSRF / cross-site state detection,
    // standard-compliant browsers SHOULD set "Sec-Fetch-Dest: email-verification" or "webidentity".
    const secFetchDest = request.headers.get("sec-fetch-dest");
    if (
      secFetchDest &&
      secFetchDest !== "email-verification" &&
      secFetchDest !== "webidentity"
    ) {
      console.warn(`Unexpected Sec-Fetch-Dest header: ${secFetchDest}`);
    }

    // ==============================================================================
    // STEP 1: SESSION AUTHENTICATION
    // ==============================================================================
    // The browser includes first-party cookies for the issuer.
    // We check if the cookies represent a logged-in user who controls the email address.
    const session = cookies.get("__session")?.value;
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

    // ==============================================================================
    // STEP 2: PARSE THE TOKEN REQUEST BODY
    // ==============================================================================
    // To support early-stage client libraries and specs, we accommodate both:
    // A. application/x-www-form-urlencoded (standard browser form format)
    // B. application/json (standard dynamic JSON format)
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

    // ==============================================================================
    // STEP 3: PROOF-OF-POSSESSION SIGNATURE VERIFICATION
    // ==============================================================================
    // If the request token is formatted as a signed JWT, we verify the signature to prove
    // the browser holds the private key corresponding to its ephemeral public key (jwk).
    if (requestToken.includes(".")) {
      // 3A. Decode the JWT header to extract the browser's ephemeral public key ('jwk' claim)
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

      // 3B. Import the browser's public JWK into a cryptographic key object
      const alg = (header.alg as string) || "ES256";
      const publicKey = await importJWK(browserJwk, alg);

      // 3C. Verify the signature on the request token using the browser's public key
      const { payload } = await jwtVerify(requestToken, publicKey);
      email = payload.email as string;
    } else {
      // Fallback for simple tests/clients sending a raw email address
      email = requestToken;
    }

    // ==============================================================================
    // STEP 4: USER AUTHORIZATION (IDENTITY MAPPING)
    // ==============================================================================
    // Confirm that the authenticated session user actually owns the requested email.
    // For this simple demo provider, we only authorize the user `demo@rowan.fyi`.
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

    // Fallback public key if the client didn't supply one (e.g. static tests)
    if (!browserJwk) {
      browserJwk = {
        kty: "EC",
        crv: "P-256",
        x: "dV4TUV9zA_0Ssy5Y91xheN57NKDryji2c3Qy6he6sw4",
        y: "A-oMMDlM_ML_jiZMIQqU4ZmZSEpW3sH62-x2LlRLuyU",
      };
    }

    // ==============================================================================
    // STEP 5: SIGN AND ISSUE THE EMAIL VERIFICATION TOKEN (EVT)
    // ==============================================================================
    // We sign the EVT payload with the Issuer's private key.
    // The payload MUST include the "cnf" (confirmation) claim holding the browser's public key.
    const privateKey = await importJWK(PRIVATE_KEY_JWK, "EdDSA");
    const origin = url.origin;

    const evtPayload = {
      iss: origin, // The authoritative issuer domain/URL
      iat: Math.floor(Date.now() / 1000), // Issued At timestamp
      exp: Math.floor(Date.now() / 1000) + 300, // Token validity (5 minutes)
      cnf: {
        jwk: browserJwk, // Cryptographically binds this token to the browser key pair
      },
      email: "demo@rowan.fyi", // The verified email identity
      email_verified: true, // Verification state assertion
    };

    const evtJwt = await new SignJWT(evtPayload)
      .setProtectedHeader({
        alg: "EdDSA",
        kid: PRIVATE_KEY_JWK.kid, // Key ID corresponding to our JWKS keys
        typ: "evt+jwt", // Standard Token Type for EVTs
      })
      .sign(privateKey);

    // Standard SD-JWT compatibility requires appending a trailing tilde "~"
    // to separate the signed token from the key binding section.
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
          "Access-Control-Allow-Headers": "*",
          "Origin-Trial":
            "ArlNTb0I5sWYtpsINNIp66oP6s/jRB8b/b4YThumFJixzpxdYvaW1mUEAjNOYSaS/aTpZ2bVDPElzEtTmGGS3A4AAAB8eyJvcmlnaW4iOiJodHRwczovL3ByLTU2LS0tcm93YW4tZnlpLWRqbDYzaHJhZnEtZXcuYS5ydW4uYXBwOjQ0MyIsImZlYXR1cmUiOiJFbWFpbFZlcmlmaWNhdGlvblByb3RvY29sIiwiZXhwaXJ5IjoxNzk0ODczNjAwfQ==",
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
