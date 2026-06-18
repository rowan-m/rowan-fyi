import { describe, expect, test } from "vitest";
import {
  importJWK,
  jwtVerify,
  SignJWT,
  generateKeyPair,
  exportJWK,
} from "jose";
import type { APIContext } from "astro";
import { PRIVATE_KEY_JWK, PUBLIC_KEY_JWK } from "./_keys";
import { GET as getDiscovery } from "../../.well-known/email-verification";
import { GET as getJwks } from "./jwks";
import { POST as postIssuance } from "./issuance";

describe("EVP Cryptographic Flow", () => {
  test("generates and verifies full EVP token flow", async () => {
    // 1. Browser generates an ephemeral key pair for holder binding
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
    const { payload: requestPayload } = await jwtVerify(
      requestToken,
      decodedHeader,
    );
    expect(requestPayload.email).toBe("demo@rowan.fyi");

    // 4. Provider signs an Email Verification Token (EVT)
    const providerPrivateKey = await importJWK(PRIVATE_KEY_JWK, "ES256");
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
        alg: "ES256",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      })
      .sign(providerPrivateKey);

    const fullEvt = `${evtJwt}~`;

    // 5. Relying party verifies the EVT signature
    const providerPublicKey = await importJWK(PUBLIC_KEY_JWK, "ES256");
    const parsedEvt = fullEvt.split("~")[0];
    const { payload: verifiedEvt } = await jwtVerify(
      parsedEvt,
      providerPublicKey,
    );
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
    expect(data.issuance_endpoint).toBe(
      "https://rowan.fyi/made/email-provider/issuance",
    );
    expect(data.jwks_uri).toBe("https://rowan.fyi/made/email-provider/jwks");
    expect(data.signing_alg_values_supported).toContain("ES256");
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

  test("issuance endpoint returns 401 when not logged in", async () => {
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, { method: "POST" }),
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

  test("issuance endpoint returns 400 when request token is missing", async () => {
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "sec-fetch-dest": "email-verification",
        },
        body: JSON.stringify({}),
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

  test("issuance endpoint issues EVT on valid request token", async () => {
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
          "content-type": "application/json",
          "sec-fetch-dest": "email-verification",
        },
        body: JSON.stringify({ request_token: requestToken }),
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
    const providerPublicKey = await importJWK(PUBLIC_KEY_JWK, "ES256");
    const { payload } = await jwtVerify(evtJwt, providerPublicKey);

    expect(payload.email).toBe("demo@rowan.fyi");
    expect(payload.email_verified).toBe(true);

    const cnf = payload.cnf as { jwk: typeof browserJwkData };
    expect(cnf.jwk.x).toBe(browserJwkData.x);
  });
});
