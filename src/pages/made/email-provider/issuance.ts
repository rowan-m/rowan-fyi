export const prerender = false;

import type { APIRoute } from "astro";
import { importJWK, SignJWT, decodeProtectedHeader, jwtVerify } from "jose";
import type { JWK } from "jose";
import crypto from "node:crypto";
import { PRIVATE_KEY_JWK } from "./_keys";

/**
 * Parses parameters from structured headers (like Signature-Key or Signature-Input parameters).
 * E.g., 'sig=hwk; kty="OKP"; crv="Ed25519"; x="abc"'
 * returns { sig: "hwk", kty: "OKP", crv: "Ed25519", x: "abc" }
 */
function parseParameterizedHeader(headerValue: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = headerValue.split(";").map((p) => p.trim());
  for (const part of parts) {
    const equalIdx = part.indexOf("=");
    if (equalIdx !== -1) {
      const key = part.slice(0, equalIdx).trim();
      let val = part.slice(equalIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      params[key] = val;
    } else {
      params[part] = "true";
    }
  }
  return params;
}

/**
 * Constructs the canonical signature base according to RFC 9421 Section 2.5.
 */
function buildSignatureBase({
  method,
  authority,
  path,
  cookie,
  contentDigest,
  signatureKey,
  signatureInput,
  components,
}: {
  method: string;
  authority: string;
  path: string;
  cookie: string | null;
  contentDigest: string | null;
  signatureKey: string;
  signatureInput: string;
  components: string[];
}): string {
  let base = "";
  for (const component of components) {
    let value = "";
    if (component === "@method") {
      value = method;
    } else if (component === "@authority") {
      value = authority;
    } else if (component === "@path") {
      value = path;
    } else if (component === "cookie") {
      value = cookie || "";
    } else if (component === "content-digest") {
      value = contentDigest || "";
    } else if (component === "signature-key") {
      value = signatureKey;
    }
    base += `"${component}": ${value}\n`;
  }
  // The @signature-params is always the last line, without a trailing newline
  const sigParamsValue = signatureInput.replace(/^sig=/, "").trim();
  base += `"@signature-params": ${sigParamsValue}`;
  return base;
}

/**
 * Cryptographically verifies an RFC 9421 HTTP Message Signature using Node.js crypto module.
 */
function verifySignature(signatureBase: string, signatureB64: string, jwk: JWK): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: jwk as crypto.JsonWebKey,
      format: "jwk",
    });

    const isEd25519 = jwk.crv === "Ed25519";
    const algorithm = isEd25519 ? undefined : "sha256";

    const isUrlSafe = signatureB64.includes("-") || signatureB64.includes("_");
    const sigBuffer = Buffer.from(signatureB64, isUrlSafe ? "base64url" : "base64");

    return crypto.verify(algorithm, Buffer.from(signatureBase), publicKey, sigBuffer);
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/**
 * Extracts and verifies the HTTP Message Signature from the request.
 * Returns the browser's parsed public JWK on success, or an APIRoute Response on validation failure.
 */
function verifyRequestSignature(
  request: Request,
  url: URL,
  corsHeaders: Record<string, string>,
): { browserJwk: JWK } | Response {
  const signatureHeader = request.headers.get("signature");
  const signatureInputHeader = request.headers.get("signature-input");
  const signatureKeyHeader = request.headers.get("signature-key");

  const returnError = (msg: string, details?: string) => {
    const errorBody = {
      error: "invalid_signature",
      error_description: msg,
      debug: {
        details,
        headers: {
          host: request.headers.get("host"),
          "x-forwarded-host": request.headers.get("x-forwarded-host"),
          "content-digest": request.headers.get("content-digest"),
          "signature-key": signatureKeyHeader,
          "signature-input": signatureInputHeader,
          signature: signatureHeader,
        },
      },
    };
    const logMsg = `EVP Request Signature Validation Failed: ${msg}${details ? " - " + details : ""}\n`;
    process.stderr.write(logMsg);

    const gcpLogEntry = {
      severity: "WARNING",
      message: logMsg,
      time: new Date().toISOString(),
      serviceContext: { service: "rowan-fyi" },
    };
    console.warn(JSON.stringify(gcpLogEntry));

    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: corsHeaders,
    });
  };

  if (!signatureHeader || !signatureInputHeader || !signatureKeyHeader) {
    return returnError(
      "Missing required HTTP Message Signature headers (Signature, Signature-Input, or Signature-Key).",
    );
  }

  // Parse Signature-Key (hwk)
  const keyParams = parseParameterizedHeader(signatureKeyHeader);
  if (keyParams.sig !== "hwk" || !keyParams.kty) {
    return returnError("Signature-Key header does not use the 'hwk' scheme or is malformed.");
  }

  const browserJwk: JWK = {
    kty: keyParams.kty,
  };
  if (keyParams.crv) browserJwk.crv = keyParams.crv;
  if (keyParams.x) browserJwk.x = keyParams.x;
  if (keyParams.y) browserJwk.y = keyParams.y;

  // Parse Signature-Input
  const inputMatch = signatureInputHeader.match(/sig=\(([^)]+)\)(.*)/);
  if (!inputMatch) {
    return returnError("Signature-Input header is malformed.");
  }

  const components = inputMatch[1].split(/\s+/).map((c) => {
    if (c.startsWith('"') && c.endsWith('"')) {
      return c.slice(1, -1);
    }
    return c;
  });

  const inputParams = parseParameterizedHeader(inputMatch[2]);
  const createdTime = parseInt(inputParams.created, 10);

  if (isNaN(createdTime)) {
    return returnError("Signature-Input is missing the 'created' parameter or it is malformed.");
  }

  // Timing check (60-second window)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - createdTime) > 60) {
    return returnError(
      "The signature timestamp 'created' is outside the acceptable 60-second window.",
      `Server currentTime: ${currentTime}, header createdTime: ${createdTime}`,
    );
  }

  // Required components check
  const requiredComponents = ["@method", "@authority", "@path", "signature-key"];
  for (const reqComp of requiredComponents) {
    if (!components.includes(reqComp)) {
      return returnError(`Required component '${reqComp}' is missing from Signature-Input.`);
    }
  }

  // Parse Signature header and verify
  const sigMatch = signatureHeader.match(/sig=:([^:]+):/);
  if (!sigMatch) {
    return returnError("Signature header is malformed.");
  }
  const signatureB64 = sigMatch[1];

  const contentDigestHeader = request.headers.get("content-digest");
  let hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
  if (!isLocal) {
    hostHeader = "rowan.fyi";
  }

  const signatureBase = buildSignatureBase({
    method: request.method,
    authority: hostHeader,
    path: url.pathname,
    cookie: request.headers.get("cookie"),
    contentDigest: contentDigestHeader,
    signatureKey: signatureKeyHeader,
    signatureInput: signatureInputHeader,
    components,
  });

  const isSignatureValid = verifySignature(signatureBase, signatureB64, browserJwk);
  if (!isSignatureValid) {
    return returnError(
      "HTTP Message Signature verification failed.",
      `Base: ${signatureBase.replace(/\n/g, "\\n")}, JWK: ${JSON.stringify(browserJwk)}`,
    );
  }

  return { browserJwk };
}

/**
 * Issuer Issuance Endpoint (EVP Standard API Route)
 *
 * In the Email Verification Protocol (EVP), the browser makes a credentialed POST request
 * to this endpoint to request a signed Email Verification Token (EVT).
 *
 * To ease transition and support real-world browser testing today, this endpoint dynamically
 * handles both:
 * - Path A: Modern proposed HTTP Message Signatures (RFC 9421)
 * - Path B: Deprecated signed-JWT request_token via x-www-form-urlencoded (current Chrome/Edge Origin Trials)
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  const requestOrigin = request.headers.get("origin");
  const corsHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "*",
  };
  if (requestOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = requestOrigin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  } else {
    corsHeaders["Access-Control-Allow-Origin"] = "*";
  }

  const sendResponse = (
    bodyObj: { error?: string; error_description?: string; issuance_token?: string },
    status: number,
  ) => {
    if (status !== 200) {
      const gcpLogEntry = {
        severity: status >= 500 ? "ERROR" : "WARNING",
        message: `EVP Issuance ${status >= 500 ? "Error" : "Warning"} (${status}): ${bodyObj.error_description || bodyObj.error || "Bad Request"}`,
        time: new Date().toISOString(),
        serviceContext: {
          service: process.env.K_SERVICE || "rowan-fyi",
        },
      };
      if (status >= 500) {
        console.error(JSON.stringify(gcpLogEntry));
      } else {
        console.warn(JSON.stringify(gcpLogEntry));
      }
    }
    return new Response(JSON.stringify(bodyObj), {
      status,
      headers: corsHeaders,
    });
  };

  try {
    // To protect user privacy and prevent CSRF / cross-site state detection,
    // standard-compliant browsers SHOULD set "Sec-Fetch-Dest: email-verification" or "webidentity".
    const secFetchDest = request.headers.get("sec-fetch-dest");
    if (secFetchDest && secFetchDest !== "email-verification" && secFetchDest !== "webidentity") {
      console.warn(`Unexpected Sec-Fetch-Dest header: ${secFetchDest}`);
    }

    const contentType = request.headers.get("content-type") || "";
    const hasSignatureHeaders =
      request.headers.has("signature") &&
      request.headers.has("signature-input") &&
      request.headers.has("signature-key");

    const useHttpMessageSignatures = hasSignatureHeaders;

    let email = "";
    let browserJwk: JWK | undefined = undefined;

    if (useHttpMessageSignatures) {
      // ==============================================================================
      // PATH A: MODERN HTTP MESSAGE SIGNATURE FLOW (RFC 9421)
      // ==============================================================================
      const signatureResult = verifyRequestSignature(request, url, corsHeaders);
      if (signatureResult instanceof Response) {
        return signatureResult;
      }
      browserJwk = signatureResult.browserJwk;

      if (contentType.includes("application/json")) {
        try {
          const body = await request.json();
          if (body.private_email || body.directed_email) {
            return sendResponse(
              {
                error: "private_email_not_supported",
                error_description: "This issuer does not support private email addresses.",
              },
              400,
            );
          }
          email = body.email;
        } catch {
          return sendResponse(
            {
              error: "invalid_request",
              error_description: "Invalid or malformed JSON request body.",
            },
            400,
          );
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        try {
          const formData = await request.formData();
          if (formData.get("private_email") || formData.get("directed_email")) {
            return sendResponse(
              {
                error: "private_email_not_supported",
                error_description: "This issuer does not support private email addresses.",
              },
              400,
            );
          }
          email = formData.get("email") as string;
          if (!email) {
            const requestToken = formData.get("request_token") as string;
            if (requestToken && requestToken.includes(".")) {
              const parts = requestToken.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
                email = payload.email;
              }
            }
          }
        } catch {
          return sendResponse(
            {
              error: "invalid_request",
              error_description: "Invalid or malformed urlencoded request body.",
            },
            400,
          );
        }
      }

      if (!email) {
        return sendResponse(
          {
            error: "invalid_request",
            error_description: "Missing required 'email' field in request body.",
          },
          400,
        );
      }
    } else {
      // ==============================================================================
      // PATH B: DEPRECATED JWT REQUEST TOKEN FLOW (Current Chrome Origin Trial)
      // ==============================================================================
      let requestToken = "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        if (formData.get("private_email") || formData.get("directed_email")) {
          return new Response(
            JSON.stringify({
              error: "private_email_not_supported",
              error_description: "This issuer does not support private email addresses.",
            }),
            {
              status: 400,
              headers: corsHeaders,
            },
          );
        }
        requestToken = formData.get("request_token") as string;
      } else if (contentType.includes("application/json")) {
        try {
          const body = await request.json();
          if (body.private_email || body.directed_email) {
            return new Response(
              JSON.stringify({
                error: "private_email_not_supported",
                error_description: "This issuer does not support private email addresses.",
              }),
              {
                status: 400,
                headers: corsHeaders,
              },
            );
          }
          requestToken = body.request_token || body.email;
        } catch {
          // Ignore parsing error for JSON fallback compatibility
        }
      }

      if (!requestToken) {
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Missing request_token in body.",
          }),
          {
            status: 400,
            headers: corsHeaders,
          },
        );
      }

      if (requestToken.includes(".")) {
        try {
          // Decode the JWT header to extract the browser's ephemeral public key ('jwk' claim)
          const header = decodeProtectedHeader(requestToken);
          browserJwk = header.jwk as JWK | undefined;

          if (!browserJwk) {
            return sendResponse(
              {
                error: "invalid_signature",
                error_description: "Missing ephemeral public key (jwk) in request token header.",
              },
              400,
            );
          }

          // Import browser's public key and verify the request JWT
          const alg = (header.alg as string) || "ES256";
          const publicKey = await importJWK(browserJwk, alg);
          const { payload } = await jwtVerify(requestToken, publicKey);
          email = payload.email as string;
        } catch {
          return sendResponse(
            {
              error: "invalid_signature",
              error_description: "request_token signature verification failed.",
            },
            400,
          );
        }
      } else {
        // Fallback for simple/un-signed requests
        email = requestToken;
      }
    }

    // ==============================================================================
    // STEP 3: SESSION AUTHENTICATION & UNIFORM ERROR RESPONSE (Anti-Probing & Timing Mitigations)
    // ==============================================================================
    const session = cookies.get("__session")?.value;

    if (session !== "active" || email.toLowerCase() !== "demo@rowan.fyi") {
      return sendResponse(
        {
          error: "authentication_required",
          error_description: "User must be authenticated and have control of the requested email address.",
        },
        401,
      );
    }

    // Fallback public key if not extracted (e.g. un-signed fallback client/tests)
    if (!browserJwk) {
      browserJwk = {
        kty: "EC",
        crv: "P-256",
        x: "dV4TUV9zA_0Ssy5Y91xheN57NKDryji2c3Qy6he6sw4",
        y: "A-oMMDlM_ML_jiZMIQqU4ZmZSEpW3sH62-x2LlRLuyU",
      };
    }

    // ==============================================================================
    // STEP 4: SIGN AND ISSUE EMAIL VERIFICATION TOKEN (EVT)
    // ==============================================================================
    const privateKey = await importJWK(PRIVATE_KEY_JWK, "EdDSA");
    const origin = url.origin;
    const currentTime = Math.floor(Date.now() / 1000);

    const evtPayload = {
      iss: origin,
      iat: currentTime,
      exp: currentTime + 300, // 5 minutes
      cnf: {
        jwk: browserJwk,
      },
      email: "demo@rowan.fyi",
      email_verified: true,
    };

    const evtJwt = await new SignJWT(evtPayload)
      .setProtectedHeader({
        alg: "EdDSA",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      })
      .sign(privateKey);

    const issuanceToken = `${evtJwt}~`;

    return sendResponse(
      {
        issuance_token: issuanceToken,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "An internal error occurred during token issuance.";
    return sendResponse(
      {
        error: "server_error",
        error_description: message,
      },
      500,
    );
  }
};
