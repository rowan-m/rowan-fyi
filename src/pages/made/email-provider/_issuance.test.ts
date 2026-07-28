import { describe, expect, test } from "vitest";
import { importJWK, jwtVerify, SignJWT, generateKeyPair, exportJWK } from "jose";
import type { JWK } from "jose";
import crypto from "node:crypto";
import type { APIContext } from "astro";
import { PRIVATE_KEY_JWK, PUBLIC_KEY_JWK } from "./_keys";
import { GET as getDiscovery } from "../../.well-known/email-verification";
import { GET as getJwks } from "./jwks";
import { POST as postIssuance } from "./issuance";

/**
 * Helper to dynamically sign request headers using RFC 9421.
 */
async function generateSignatureHeaders({
  method,
  authority,
  path,
  cookieValue,
  privateKeyJwk,
  publicKeyJwk,
}: {
  method: string;
  authority: string;
  path: string;
  cookieValue?: string;
  privateKeyJwk: JWK;
  publicKeyJwk: JWK;
}) {
  const created = Math.floor(Date.now() / 1000);

  // Signature-Key (hwk format)
  let signatureKeyHeader = `sig=hwk; kty="${publicKeyJwk.kty}"; crv="${publicKeyJwk.crv}"; x="${publicKeyJwk.x}"`;
  if (publicKeyJwk.y) {
    signatureKeyHeader += `; y="${publicKeyJwk.y}"`;
  }

  // Signature-Input
  const componentsList = ["@method", "@authority", "@path", "signature-key"];
  if (cookieValue) {
    componentsList.push("cookie");
  }

  const serializedComponents = componentsList.map((c) => `"${c}"`).join(" ");
  const signatureInputHeader = `sig=(${serializedComponents});created=${created}`;

  // Reconstruct signature base dynamically in the exact order of componentsList
  let signatureBase = "";
  for (const component of componentsList) {
    let value = "";
    if (component === "@method") {
      value = method;
    } else if (component === "@authority") {
      value = authority;
    } else if (component === "@path") {
      value = path;
    } else if (component === "cookie") {
      value = cookieValue || "";
    } else if (component === "signature-key") {
      value = signatureKeyHeader;
    }
    signatureBase += `"${component}": ${value}\n`;
  }
  signatureBase += `"@signature-params": (${serializedComponents});created=${created}`;

  // Sign using Node's crypto
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKeyJwk as crypto.JsonWebKey,
    format: "jwk",
  });

  const isEd25519 = publicKeyJwk.crv === "Ed25519";
  const algorithm = isEd25519 ? undefined : "sha256";

  const sigBuffer = crypto.sign(algorithm, Buffer.from(signatureBase), privateKeyObj);

  const signatureHeader = `sig=:${sigBuffer.toString("base64")}:`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "sec-fetch-dest": "email-verification",
    signature: signatureHeader,
    "signature-input": signatureInputHeader,
    "signature-key": signatureKeyHeader,
  };

  if (cookieValue) {
    headers["cookie"] = cookieValue;
  }

  return headers;
}

describe("EVP Cryptographic Flow", () => {
  test("generates and verifies full EVP token flow via HTTP Message Signatures", async () => {
    // 1. Browser generates an ephemeral key pair for holder binding (using Ed25519)
    const { publicKey, privateKey } = await generateKeyPair("Ed25519", { extractable: true });
    const browserPublicKeyJwk = await exportJWK(publicKey);
    const browserPrivateKeyJwk = await exportJWK(privateKey);

    // 2. Browser signs an HTTP request to prove possession
    const method = "POST";
    const authority = "rowan.fyi";
    const path = "/made/email-provider/issuance";
    const created = Math.floor(Date.now() / 1000);

    const signatureKeyHeader = `sig=hwk; kty="${browserPublicKeyJwk.kty}"; crv="${browserPublicKeyJwk.crv}"; x="${browserPublicKeyJwk.x}"`;

    let signatureBase = "";
    signatureBase += `"@method": ${method}\n`;
    signatureBase += `"@authority": ${authority}\n`;
    signatureBase += `"@path": ${path}\n`;
    signatureBase += `"signature-key": ${signatureKeyHeader}\n`;
    signatureBase += `"@signature-params": ("@method" "@authority" "@path" "signature-key");created=${created}`;

    const privateKeyObj = crypto.createPrivateKey({
      key: browserPrivateKeyJwk as crypto.JsonWebKey,
      format: "jwk",
    });

    const sigBuffer = crypto.sign(undefined, Buffer.from(signatureBase), privateKeyObj);
    const signatureB64 = sigBuffer.toString("base64");

    // 3. Provider validates the request signature
    const providerPublicKeyObj = crypto.createPublicKey({
      key: browserPublicKeyJwk as crypto.JsonWebKey,
      format: "jwk",
    });

    const isVerified = crypto.verify(
      undefined,
      Buffer.from(signatureBase),
      providerPublicKeyObj,
      Buffer.from(signatureB64, "base64"),
    );
    expect(isVerified).toBe(true);

    // 4. Provider signs an Email Verification Token (EVT)
    const providerPrivateKey = await importJWK(PRIVATE_KEY_JWK, "EdDSA");
    const evtPayload = {
      iss: "https://rowan.fyi",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      cnf: {
        jwk: browserPublicKeyJwk,
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
      .sign(providerPrivateKey);

    const fullEvt = `${evtJwt}~`;

    // 5. Relying party verifies the EVT signature
    const providerPublicKey = await importJWK(PUBLIC_KEY_JWK, "EdDSA");
    const parsedEvt = fullEvt.split("~")[0];
    const { payload: verifiedEvt } = await jwtVerify(parsedEvt, providerPublicKey);
    expect(verifiedEvt.email).toBe("demo@rowan.fyi");
    expect(verifiedEvt.email_verified).toBe(true);

    const cnf = verifiedEvt.cnf as { jwk: typeof browserPublicKeyJwk };
    expect(cnf.jwk.kty).toBe("OKP");
  });

  test("generates and verifies legacy JWT request_token flow", async () => {
    // 1. Browser generates an ephemeral key pair for holder binding (using ES256)
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    const browserJwkData = await exportJWK(publicKey);

    // 2. Browser signs a request token
    const requestToken = await new SignJWT({ email: "demo@rowan.fyi" })
      .setProtectedHeader({
        alg: "ES256",
        jwk: browserJwkData,
      })
      .sign(privateKey);

    // 3. Provider validates the request token
    const decodedHeader = await importJWK(browserJwkData, "ES256");
    const { payload: requestPayload } = await jwtVerify(requestToken, decodedHeader);
    expect(requestPayload.email).toBe("demo@rowan.fyi");

    // 4. Provider signs an Email Verification Token (EVT)
    const providerPrivateKey = await importJWK(PRIVATE_KEY_JWK, "EdDSA");
    const evtPayload = {
      iss: "https://rowan.fyi",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      cnf: {
        jwk: browserJwkData,
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
      .sign(providerPrivateKey);

    const fullEvt = `${evtJwt}~`;

    // 5. Relying party verifies the EVT signature
    const providerPublicKey = await importJWK(PUBLIC_KEY_JWK, "EdDSA");
    const parsedEvt = fullEvt.split("~")[0];
    const { payload: verifiedEvt } = await jwtVerify(parsedEvt, providerPublicKey);
    expect(verifiedEvt.email).toBe("demo@rowan.fyi");
    expect(verifiedEvt.email_verified).toBe(true);

    const cnf = verifiedEvt.cnf as { jwk: typeof browserJwkData };
    expect(cnf.jwk.kty).toBe("EC");
  });
});

describe("EVP Endpoint Unit Tests", () => {
  test("discovery endpoint returns correct metadata", async () => {
    const mockUrl = new URL("https://rowan.fyi/.well-known/email-verification");
    const response = await getDiscovery({
      url: mockUrl,
      request: new Request(mockUrl),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {} as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      issuance_endpoint: string;
      jwks_uri: string;
      signing_alg_values_supported: string[];
    };
    expect(data.issuance_endpoint).toBe("https://rowan.fyi/made/email-provider/issuance");
    expect(data.jwks_uri).toBe("https://rowan.fyi/made/email-provider/jwks");
    expect(data.signing_alg_values_supported).toContain("EdDSA");
  });

  test("jwks endpoint returns public keys", async () => {
    const response = await getJwks({
      url: new URL("https://rowan.fyi/made/email-provider/jwks"),
      request: new Request("https://rowan.fyi/made/email-provider/jwks"),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {} as unknown as APIContext["cookies"],
    } as unknown as APIContext);
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      keys: Array<{ kid: string }>;
    };
    expect(data.keys).toBeDefined();
    expect(data.keys[0].kid).toBe("demo-key-2026");
  });

  test("issuance endpoint returns 400 when request token is missing (Path B)", async () => {
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "email-verification",
        },
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => ({ value: "active" }),
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(400);
    const data = (await response.json()) as {
      error: string;
      error_description: string;
    };
    expect(data.error).toBe("invalid_request");
    expect(data.error_description).toBe("Missing request_token in body.");
  });

  test("issuance endpoint returns 400 on malformed or invalid request_token signature (Path B)", async () => {
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "email-verification",
        },
        body: "request_token=invalid.jwt.token",
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => ({ value: "active" }),
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(400);
    const data = (await response.json()) as {
      error: string;
      error_description: string;
    };
    expect(data.error).toBe("invalid_signature");
    expect(data.error_description).toBe("request_token signature verification failed.");
  });

  test("issuance endpoint returns 415 on invalid content-type when signature headers are provided", async () => {
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          signature: "sig=:abc:",
          "signature-input": 'sig=("@method");created=123',
          "signature-key": "sig=hwk;kty=OKP",
        },
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => ({ value: "active" }),
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(415);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe("invalid_request");
  });

  test("issuance endpoint returns 401 on missing session (both paths)", async () => {
    const { publicKey, privateKey } = await generateKeyPair("Ed25519", { extractable: true });
    const browserPublicKeyJwk = await exportJWK(publicKey);
    const browserPrivateKeyJwk = await exportJWK(privateKey);

    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const headers = await generateSignatureHeaders({
      method: "POST",
      authority: "rowan.fyi",
      path: "/made/email-provider/issuance",
      publicKeyJwk: browserPublicKeyJwk,
      privateKeyJwk: browserPrivateKeyJwk,
    });

    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: new Headers(headers),
        body: JSON.stringify({ email: "demo@rowan.fyi" }),
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => undefined,
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe("authentication_required");
  });

  test("issuance endpoint returns 401 uniform error when requesting unauthorized email (both paths)", async () => {
    const { publicKey, privateKey } = await generateKeyPair("Ed25519", { extractable: true });
    const browserPublicKeyJwk = await exportJWK(publicKey);
    const browserPrivateKeyJwk = await exportJWK(privateKey);

    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const headers = await generateSignatureHeaders({
      method: "POST",
      authority: "rowan.fyi",
      path: "/made/email-provider/issuance",
      publicKeyJwk: browserPublicKeyJwk,
      privateKeyJwk: browserPrivateKeyJwk,
    });

    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: new Headers(headers),
        body: JSON.stringify({ email: "attacker@malicious.com" }),
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => ({ value: "active" }),
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe("authentication_required");
  });

  test("issuance endpoint issues EVT on valid HTTP Message Signature (Path A)", async () => {
    // A. Generate browser's ephemeral key
    const { publicKey, privateKey } = await generateKeyPair("Ed25519", { extractable: true });
    const browserPublicKeyJwk = await exportJWK(publicKey);
    const browserPrivateKeyJwk = await exportJWK(privateKey);

    // B. Build signature headers with cookie binding
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const headers = await generateSignatureHeaders({
      method: "POST",
      authority: "rowan.fyi",
      path: "/made/email-provider/issuance",
      cookieValue: "__session=active",
      publicKeyJwk: browserPublicKeyJwk,
      privateKeyJwk: browserPrivateKeyJwk,
    });

    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: new Headers(headers),
        body: JSON.stringify({ email: "demo@rowan.fyi" }),
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => ({ value: "active" }),
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(200);
    const data = (await response.json()) as { issuance_token: string };
    expect(data.issuance_token).toBeDefined();
    expect(data.issuance_token.endsWith("~")).toBe(true);

    // C. Verify the issued token signature
    const evtJwt = data.issuance_token.split("~")[0];
    const providerPublicKey = await importJWK(PUBLIC_KEY_JWK, "EdDSA");
    const { payload } = await jwtVerify(evtJwt, providerPublicKey);

    expect(payload.email).toBe("demo@rowan.fyi");
    expect(payload.email_verified).toBe(true);

    const cnf = payload.cnf as { jwk: typeof browserPublicKeyJwk };
    expect(cnf.jwk.x).toBe(browserPublicKeyJwk.x);
    expect(cnf.jwk.crv).toBe("Ed25519");
  });

  test("issuance endpoint issues EVT on valid legacy request token (Path B)", async () => {
    // A. Generate browser's ephemeral key
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    const browserJwkData = await exportJWK(publicKey);

    // B. Sign a request token
    const requestToken = await new SignJWT({ email: "demo@rowan.fyi" })
      .setProtectedHeader({
        alg: "ES256",
        jwk: browserJwkData,
      })
      .sign(privateKey);

    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "email-verification",
        },
        body: `request_token=${encodeURIComponent(requestToken)}`,
      }),
      params: {},
      props: {},
      redirect: () => new Response(null, { status: 302 }),
      locals: {},
      cookies: {
        get: () => ({ value: "active" }),
      } as unknown as APIContext["cookies"],
    } as unknown as APIContext);

    expect(response.status).toBe(200);
    const data = (await response.json()) as { issuance_token: string };
    expect(data.issuance_token).toBeDefined();
    expect(data.issuance_token.endsWith("~")).toBe(true);

    // C. Verify the issued token
    const evtJwt = data.issuance_token.split("~")[0];
    const providerPublicKey = await importJWK(PUBLIC_KEY_JWK, "EdDSA");
    const { payload } = await jwtVerify(evtJwt, providerPublicKey);

    expect(payload.email).toBe("demo@rowan.fyi");
    expect(payload.email_verified).toBe(true);

    const cnf = payload.cnf as { jwk: typeof browserJwkData };
    expect(cnf.jwk.x).toBe(browserJwkData.x);
  });
});
