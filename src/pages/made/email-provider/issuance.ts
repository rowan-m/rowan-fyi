export const prerender = false;

import type { APIRoute } from "astro";
import { SDJwtInstance } from "@sd-jwt/core";
import { importJWK, jwtVerify, CompactSign, decodeProtectedHeader } from "jose";
import type { JWK } from "jose";
import { verify as verifyHttpMessageSig } from "http-message-sig";
import { parseDictionary } from "structured-headers";
import crypto from "node:crypto";
import { PRIVATE_KEY_JWK } from "./_keys";

/**
 * Extracts and verifies the HTTP Message Signature from the request using http-message-sig.
 * Returns the browser's parsed public JWK on success, or an APIRoute Response on validation failure.
 */
async function verifyRequestSignature(
  request: Request,
  url: URL,
  responseHeaders: Record<string, string>,
  logger: { warn: (message: string) => void; error: (message: string) => void },
  rawBody: string,
): Promise<{ browserJwk: JWK } | Response> {
  const signatureHeader = request.headers.get("signature");
  const signatureInputHeader = request.headers.get("signature-input");
  const signatureKeyHeader = request.headers.get("signature-key");
  const contentDigestHeader = request.headers.get("content-digest");

  const returnError = (msg: string, details?: string, signatureErrorCode = "invalid_signature") => {
    const errorBody = {
      error: "invalid_signature",
      error_description: msg,
      debug: {
        details,
        headers: {
          host: request.headers.get("host"),
          "x-forwarded-host": request.headers.get("x-forwarded-host"),
          "content-digest": contentDigestHeader,
          "signature-key": signatureKeyHeader,
          "signature-input": signatureInputHeader,
          signature: signatureHeader,
        },
      },
    };
    const logMsg = `EVP Request Signature Validation Failed: ${msg}${details ? " - " + details : ""}`;
    logger.warn(logMsg);

    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: {
        ...responseHeaders,
        "Signature-Error": `error=${signatureErrorCode}`,
      },
    });
  };

  if (!signatureHeader || !signatureInputHeader || !signatureKeyHeader) {
    return returnError(
      "Missing required HTTP Message Signature headers (Signature, Signature-Input, or Signature-Key).",
    );
  }

  // Parse Signature-Key as a Structured Field Dictionary (RFC 8941)
  let browserJwk: JWK;
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

    let algParam: string | undefined;
    if (params.has("alg")) {
      algParam = params.get("alg") as string;
      const supportedAlgs = ["Ed25519", "EdDSA", "ES256"];
      if (!supportedAlgs.includes(algParam)) {
        return returnError(
          `Unsupported algorithm '${algParam}' in Signature-Key header.`,
          undefined,
          "unsupported_algorithm",
        );
      }
    }

    browserJwk = {
      kty: params.get("kty") as string,
    };
    if (algParam) browserJwk.alg = algParam;
    if (params.has("crv")) browserJwk.crv = params.get("crv") as string;
    if (params.has("x")) browserJwk.x = params.get("x") as string;
    if (params.has("y")) browserJwk.y = params.get("y") as string;
  } catch (err: unknown) {
    return returnError("Signature-Key header parsing failed.", err instanceof Error ? err.message : String(err));
  }

  // Required components check
  const requiredComponents = ["@method", "@authority", "@path", "content-digest", "signature-key"];
  for (const reqComp of requiredComponents) {
    if (!signatureInputHeader.includes(`"${reqComp}"`)) {
      return returnError(`Required component '${reqComp}' is missing from Signature-Input.`);
    }
  }

  if (!contentDigestHeader) {
    return returnError("Missing required Content-Digest header.");
  }

  const calculatedDigest = `sha-256=:${crypto.createHash("sha256").update(rawBody, "utf8").digest("base64")}:`;
  if (!contentDigestHeader.includes(calculatedDigest)) {
    return returnError(`Content-Digest verification failed. Expected digest to contain ${calculatedDigest}.`);
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
      "content-digest": contentDigestHeader,
    },
  };

  try {
    await verifyHttpMessageSig(requestLike, async (data, signature, params) => {
      // Timing check (300-second / 5-minute window per RFC 8725 / ev-protocol § 4.2)
      const createdTime = params.created ? Math.floor(params.created.getTime() / 1000) : NaN;
      if (isNaN(createdTime)) {
        throw new Error("Signature-Input is missing the 'created' parameter or it is malformed.");
      }
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - createdTime) > 300) {
        throw new Error(
          `The signature timestamp 'created' is outside the acceptable 300-second window. Server: ${currentTime}, header: ${createdTime}`,
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
export const POST: APIRoute = async (context) => {
  const { request, cookies, url } = context;
  const logger = context.logger || console;
  const responseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const sendResponse = (
    bodyObj: { error?: string; error_description?: string; issuance_token?: string },
    status: number,
  ) => {
    if (status !== 200) {
      const message = `EVP Issuance ${status >= 500 ? "Error" : "Warning"} (${status}): ${bodyObj.error_description || bodyObj.error || "Bad Request"}`;
      if (status >= 500) {
        logger.error(message);
      } else {
        logger.warn(message);
      }
    }
    return new Response(JSON.stringify(bodyObj), {
      status,
      headers: responseHeaders,
    });
  };

  try {
    // To protect user privacy and prevent CSRF / cross-site state detection,
    // standard-compliant browsers set "Sec-Fetch-Dest: email-verification" (or "webidentity").
    // Note: Chrome 153's internal C++ SimpleURLLoader omits Sec-Fetch-Dest (or sends "empty"),
    // so we strictly reject invalid Sec-Fetch-Dest values (e.g., "document", "iframe", "image")
    // when present, while allowing missing/"empty" for browser compatibility.
    const secFetchDest = request.headers.get("sec-fetch-dest");
    if (
      secFetchDest &&
      secFetchDest !== "email-verification" &&
      secFetchDest !== "webidentity" &&
      secFetchDest !== "empty"
    ) {
      return sendResponse(
        {
          error: "invalid_request",
          error_description: "Invalid Sec-Fetch-Dest header",
        },
        400,
      );
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
      // PATH A: HTTP Message Signatures (RFC 9421) Flow
      // ==============================================================================
      if (!contentType.includes("application/json")) {
        return sendResponse(
          {
            error: "invalid_request",
            error_description: "Content-Type must be application/json.",
          },
          415,
        );
      }

      const rawBody = await request.text();
      const signatureResult = await verifyRequestSignature(request, url, responseHeaders, logger, rawBody);
      if (signatureResult instanceof Response) {
        return signatureResult;
      }
      browserJwk = signatureResult.browserJwk;

      try {
        const body = JSON.parse(rawBody);
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
      // PATH B: Legacy JWT Request Token Flow
      // ==============================================================================
      let requestToken = "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
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
        requestToken = formData.get("request_token") as string;
      } else if (contentType.includes("application/json")) {
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
          requestToken = body.request_token || body.email;
        } catch {
          // Ignore parsing error for JSON fallback compatibility
        }
      }

      if (!requestToken) {
        return sendResponse(
          {
            error: "invalid_request",
            error_description: "Missing request_token in body.",
          },
          400,
        );
      }

      if (requestToken.includes(".")) {
        try {
          // Decode the JWT header to extract the browser's ephemeral public key ('jwk' claim) using jose
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
    // STEP 3: Session Authentication
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
    // STEP 4: Issue Email Verification Token (EVT)
    // ==============================================================================
    const signingAlg = browserJwk.alg === "Ed25519" ? "Ed25519" : "EdDSA";
    const privateKey = await importJWK(PRIVATE_KEY_JWK, signingAlg);
    const origin = url.origin;
    const currentTime = Math.floor(Date.now() / 1000);

    const evtPayload = {
      iss: origin,
      iat: currentTime,
      exp: currentTime + 300, // 5 minutes
      cnf: {
        jwk: browserJwk,
      },
      email: email,
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
      signAlg: signingAlg,
      hasher: async (data, alg) => {
        const nodeAlg = alg.replace("-", "");
        return new Uint8Array(crypto.createHash(nodeAlg).update(data).digest());
      },
      hashAlg: "sha-256",
      saltGenerator: async () => crypto.randomBytes(16).toString("base64url"),
    });

    const issuanceToken = await sdJwt.issue(evtPayload, undefined, {
      header: {
        alg: signingAlg,
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
