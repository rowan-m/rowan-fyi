export const prerender = false;

import type { APIRoute } from "astro";
import { SDJwtInstance, decodeJwt } from "@sd-jwt/core";
import { importJWK, jwtVerify, CompactSign } from "jose";
import type { JWK } from "jose";
import { verify as verifyHttpMessageSig } from "http-message-sig";
import { parseDictionary } from "structured-headers";
import type { JsonWebKey } from "node:crypto";
import crypto from "node:crypto";
import { PRIVATE_KEY_JWK } from "./_keys";

/**
 * Extracts and verifies the HTTP Message Signature from the request using http-message-sig.
 * Returns the browser's parsed public JWK on success, or an APIRoute Response on validation failure.
 */
async function verifyRequestSignature(
  request: Request,
  url: URL,
  corsHeaders: Record<string, string>,
): Promise<{ browserJwk: JsonWebKey } | Response> {
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

  // Parse Signature-Key as a Structured Field Dictionary (RFC 8941)
  let browserJwk: JsonWebKey;
  try {
    const dictionary = parseDictionary(signatureKeyHeader);
    const sigEntry = dictionary.get("sig");
    if (!sigEntry) {
      return returnError("Signature-Key header is missing the 'sig' parameter.");
    }

    const [schemeToken, params] = sigEntry;
    const scheme =
      typeof schemeToken === "object" && schemeToken !== null && "value" in schemeToken
        ? (schemeToken as { value: string }).value
        : String(schemeToken);

    if (scheme !== "hwk" || !params.has("kty")) {
      return returnError("Signature-Key header does not use the 'hwk' scheme or is malformed.");
    }

    browserJwk = {
      kty: params.get("kty") as string,
    };
    if (params.has("crv")) browserJwk.crv = params.get("crv") as string;
    if (params.has("x")) browserJwk.x = params.get("x") as string;
    if (params.has("y")) browserJwk.y = params.get("y") as string;
  } catch (err: unknown) {
    return returnError("Signature-Key header parsing failed.", err instanceof Error ? err.message : String(err));
  }

  // Required components check
  const requiredComponents = ["@method", "@authority", "@path", "signature-key"];
  for (const reqComp of requiredComponents) {
    if (!signatureInputHeader.includes(`"${reqComp}"`)) {
      return returnError(`Required component '${reqComp}' is missing from Signature-Input.`);
    }
  }

  // Prepare components and run RFC 9421 validation via http-message-sig
  let hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
  if (!isLocal) {
    hostHeader = "rowan.fyi";
  }

  const requestLike = {
    method: request.method,
    url: `${url.protocol}//${hostHeader}${url.pathname}`,
    headers: {
      signature: signatureHeader,
      "signature-input": signatureInputHeader,
      "signature-key": signatureKeyHeader,
      cookie: request.headers.get("cookie") || "",
      "content-digest": request.headers.get("content-digest") || "",
    },
  };

  try {
    await verifyHttpMessageSig(requestLike, async (data, signature, params) => {
      // Timing check (60-second window)
      const createdTime = params.created ? Math.floor(params.created.getTime() / 1000) : NaN;
      if (isNaN(createdTime)) {
        throw new Error("Signature-Input is missing the 'created' parameter or it is malformed.");
      }
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - createdTime) > 60) {
        throw new Error(
          `The signature timestamp 'created' is outside the acceptable 60-second window. Server: ${currentTime}, header: ${createdTime}`,
        );
      }

      // Cryptographic signature check using node crypto
      const publicKey = crypto.createPublicKey({
        key: browserJwk as crypto.JsonWebKey,
        format: "jwk",
      });

      const isVerified = crypto.verify(undefined, Buffer.from(data), publicKey, signature);
      if (!isVerified) {
        throw new Error("HTTP Message Signature verification failed.");
      }
    });
  } catch (err: unknown) {
    return returnError("HTTP Message Signature verification failed.", err instanceof Error ? err.message : String(err));
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
    let browserJwk: JsonWebKey | undefined = undefined;

    if (useHttpMessageSignatures) {
      // ==============================================================================
      // PATH A: MODERN HTTP MESSAGE SIGNATURE FLOW (RFC 9421)
      // ==============================================================================
      const signatureResult = await verifyRequestSignature(request, url, corsHeaders);
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
          const decoded = decodeJwt(requestToken);
          const header = decoded.header;
          browserJwk = header.jwk as JsonWebKey | undefined;

          if (!browserJwk) {
            return sendResponse(
              {
                error: "invalid_signature",
                error_description: "Missing ephemeral public key (jwk) in request token header.",
              },
              400,
            );
          }

          // Import browser's public key and verify the request JWT using jose
          const publicKey = await importJWK(browserJwk as JWK, header.alg);
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

    const sdJwt = new SDJwtInstance({
      signer: async (data) => {
        const [headerB64, payloadB64] = data.split(".");
        const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
        const payload = Buffer.from(payloadB64, "base64url");
        const signed = await new CompactSign(payload).setProtectedHeader(header).sign(privateKey);
        return signed.split(".").pop()!;
      },
      signAlg: "EdDSA",
      hasher: async (data, alg) => {
        const nodeAlg = alg.replace("-", "");
        return new Uint8Array(crypto.createHash(nodeAlg).update(data).digest());
      },
      hashAlg: "sha-256",
      saltGenerator: async () => crypto.randomBytes(16).toString("base64url"),
    });

    const issuanceToken = await sdJwt.issue(evtPayload, undefined, {
      header: {
        alg: "EdDSA",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      },
    });

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
