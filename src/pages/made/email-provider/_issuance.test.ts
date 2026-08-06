import { describe, expect, test } from "vitest";
import { decodeJwt } from "@sd-jwt/core";
import type { JsonWebKey as JWK } from "node:crypto";
import crypto from "node:crypto";
import type { APIContext } from "astro";
import { PRIVATE_KEY_JWK, PUBLIC_KEY_JWK } from "./_keys";

function b64u(str) {
  return Buffer.from(str).toString("base64url");
}
function signJwt(payload, header, privateKey) {
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(payload));
  const isEd25519 = (header.alg === "EdDSA" || header.alg === "Ed25519") && privateKey.asymmetricKeyType === "ed25519";
  const algorithm = isEd25519 ? undefined : "sha256";
  const s = crypto
    .sign(algorithm, Buffer.from(h + "." + p), { key: privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return h + "." + p + "." + s;
}
function verifyJwt(token, publicKey) {
  const parts = token.split(".");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const isEd25519 = header.alg === "EdDSA" || publicKey.asymmetricKeyType === "ed25519";
  const algorithm = isEd25519 ? undefined : "sha256";
  const isVerified = crypto.verify(
    algorithm,
    Buffer.from(parts[0] + "." + parts[1]),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(parts[2], "base64url"),
  );
  if (!isVerified) throw new Error("Invalid signature");
  return decodeJwt(token);
}
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
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;
    const browserPrivateKeyJwk = privateKey.export({ format: "jwk" }) as JWK;

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
    const providerPrivateKey = crypto.createPrivateKey({ key: PRIVATE_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
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

    const evtJwt = signJwt(
      evtPayload,
      {
        alg: "EdDSA",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      },
      providerPrivateKey,
    );

    const fullEvt = `${evtJwt}~`;

    // 5. Relying party verifies the EVT signature
    const providerPublicKey = crypto.createPublicKey({ key: PUBLIC_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
    const parsedEvt = fullEvt.split("~")[0];
    const { payload: verifiedEvt } = verifyJwt(parsedEvt, providerPublicKey);
    expect(verifiedEvt.email.toLowerCase()).toBe("demo@rowan.fyi");
    expect(verifiedEvt.email_verified).toBe(true);

    const cnf = verifiedEvt.cnf as { jwk: typeof browserPublicKeyJwk };
    expect(cnf.jwk.kty).toBe("OKP");
  });

  test("generates and verifies legacy JWT request_token flow", async () => {
    // 1. Browser generates an ephemeral key pair for holder binding (using ES256)
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const browserJwkData = publicKey.export({ format: "jwk" }) as JWK;

    // 2. Browser signs a request token
    const requestToken = signJwt(
      { email: "demo@rowan.fyi" },
      {
        alg: "ES256",
        jwk: browserJwkData,
      },
      privateKey,
    );

    // 3. Provider validates the request token
    const decodedHeader = crypto.createPublicKey({ key: browserJwkData as crypto.JsonWebKey, format: "jwk" });
    const { payload: requestPayload } = verifyJwt(requestToken, decodedHeader);
    expect(requestPayload.email).toBe("demo@rowan.fyi");

    // 4. Provider signs an Email Verification Token (EVT)
    const providerPrivateKey = crypto.createPrivateKey({ key: PRIVATE_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
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

    const evtJwt = signJwt(
      evtPayload,
      {
        alg: "EdDSA",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      },
      providerPrivateKey,
    );

    const fullEvt = `${evtJwt}~`;

    // 5. Relying party verifies the EVT signature
    const providerPublicKey = crypto.createPublicKey({ key: PUBLIC_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
    const parsedEvt = fullEvt.split("~")[0];
    const { payload: verifiedEvt } = verifyJwt(parsedEvt, providerPublicKey);
    expect(verifiedEvt.email.toLowerCase()).toBe("demo@rowan.fyi");
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
      private_email_supported: boolean;
      webauthn_supported: boolean;
    };
    expect(data.issuance_endpoint).toBe("https://rowan.fyi/made/email-provider/issuance");
    expect(data.jwks_uri).toBe("https://rowan.fyi/made/email-provider/jwks");
    expect(data.signing_alg_values_supported).toContain("EdDSA");
    expect(data.private_email_supported).toBe(false);
    expect(data.webauthn_supported).toBe(false);
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

  test("issuance endpoint handles hybrid x-www-form-urlencoded content-type with valid signature headers (Transitional Chrome)", async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;
    const browserPrivateKeyJwk = privateKey.export({ format: "jwk" }) as JWK;

    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const headers = await generateSignatureHeaders({
      method: "POST",
      authority: "rowan.fyi",
      path: "/made/email-provider/issuance",
      cookieValue: "__session=active",
      publicKeyJwk: browserPublicKeyJwk,
      privateKeyJwk: browserPrivateKeyJwk,
    });

    // Override Content-Type to x-www-form-urlencoded
    headers["content-type"] = "application/x-www-form-urlencoded";

    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: new Headers(headers),
        body: "email=demo%40rowan.fyi",
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

    const evtJwt = data.issuance_token.split("~")[0];
    const providerPublicKey = crypto.createPublicKey({ key: PUBLIC_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
    const { payload } = verifyJwt(evtJwt, providerPublicKey);

    expect(payload.email.toLowerCase()).toBe("demo@rowan.fyi");
  });

  test("issuance endpoint returns 401 on missing session (both paths)", async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;
    const browserPrivateKeyJwk = privateKey.export({ format: "jwk" }) as JWK;

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
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;
    const browserPrivateKeyJwk = privateKey.export({ format: "jwk" }) as JWK;

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
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;
    const browserPrivateKeyJwk = privateKey.export({ format: "jwk" }) as JWK;

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
    const providerPublicKey = crypto.createPublicKey({ key: PUBLIC_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
    const { payload } = verifyJwt(evtJwt, providerPublicKey);

    expect(payload.email.toLowerCase()).toBe("demo@rowan.fyi");
    expect(payload.email_verified).toBe(true);

    const cnf = payload.cnf as { jwk: typeof browserPublicKeyJwk };
    expect(cnf.jwk.x).toBe(browserPublicKeyJwk.x);
    expect(cnf.jwk.crv).toBe("Ed25519");
  });

  test("issuance endpoint issues EVT on valid legacy request token (Path B)", async () => {
    // A. Generate browser's ephemeral key
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const browserJwkData = publicKey.export({ format: "jwk" }) as JWK;

    // B. Sign a request token
    const requestToken = signJwt(
      { email: "demo@rowan.fyi" },
      {
        alg: "ES256",
        jwk: browserJwkData,
      },
      privateKey,
    );

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
    const providerPublicKey = crypto.createPublicKey({ key: PUBLIC_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
    const { payload } = verifyJwt(evtJwt, providerPublicKey);

    expect(payload.email.toLowerCase()).toBe("demo@rowan.fyi");
    expect(payload.email_verified).toBe(true);

    const cnf = payload.cnf as { jwk: typeof browserJwkData };
    expect(cnf.jwk.x).toBe(browserJwkData.x);
  });

  test("issuance endpoint returns 400 and private_email_not_supported on private_email request (Path A)", async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;
    const browserPrivateKeyJwk = privateKey.export({ format: "jwk" }) as JWK;

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
        body: JSON.stringify({ email: "demo@rowan.fyi", private_email: true }),
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
    const data = (await response.json()) as { error: string; error_description: string };
    expect(data.error).toBe("private_email_not_supported");
    expect(data.error_description).toContain("does not support private email");
  });

  test("issuance endpoint returns 400 and private_email_not_supported on private_email request (Path B)", async () => {
    const mockUrl = new URL("https://rowan.fyi/made/email-provider/issuance");
    const response = await postIssuance({
      url: mockUrl,
      request: new Request(mockUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ private_email: true, email: "demo@rowan.fyi" }),
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
    const data = (await response.json()) as { error: string; error_description: string };
    expect(data.error).toBe("private_email_not_supported");
    expect(data.error_description).toContain("does not support private email");
  });

  test("verifies a multi-part SD-JWT with disclosures and correct sd_hash verification", async () => {
    // 1. Generate keys
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;

    // 2. Sign EVT
    const providerPrivateKey = crypto.createPrivateKey({ key: PRIVATE_KEY_JWK as crypto.JsonWebKey, format: "jwk" });
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
    const evtJwt = signJwt(
      evtPayload,
      {
        alg: "EdDSA",
        kid: PRIVATE_KEY_JWK.kid,
        typ: "evt+jwt",
      },
      providerPrivateKey,
    );

    // 3. Create a mock disclosure
    const mockDisclosure = "WyI2SWo3dE0tYTVpVlBHYm9TNXRtdlZBIiwgImVtYWlsIiwgImpvaG5kb2VAZXhhbXBsZS5jb20iXQ";

    // 4. Form the SD-JWT portion
    const sdJwtPortion = `${evtJwt}~${mockDisclosure}~`;

    // 5. Calculate correct sd_hash
    const calculatedHash = crypto.createHash("sha256").update(sdJwtPortion).digest("base64url");

    // 6. Sign Key Binding JWT (KB-JWT)
    const kbPayload = {
      aud: "https://rowan.fyi",
      nonce: "demo-nonce",
      iat: Math.floor(Date.now() / 1000),
      sd_hash: calculatedHash,
    };
    const kbJwt = signJwt(
      kbPayload,
      {
        alg: "Ed25519",
        typ: "kb+jwt",
      },
      privateKey,
    );

    // 7. Reconstruct rawToken sent to the verifier
    const rawToken = `${sdJwtPortion}${kbJwt}`;

    // 8. Re-execute the step 1 and step 2 parsing algorithm from index.astro
    const parts = rawToken.split("~");
    expect(parts).toHaveLength(3); // [evtJwt, mockDisclosure, kbJwt]
    const parsedEvt = parts[0];
    const parsedKb = parts[parts.length - 1];
    const parsedDisclosures = parts.slice(1, -1).filter(Boolean);

    expect(parsedEvt).toBe(evtJwt);
    expect(parsedKb).toBe(kbJwt);
    expect(parsedDisclosures).toEqual([mockDisclosure]);

    // Reconstruct SD-JWT portion to calculate hash
    const reconstructedSdJwtPortion = parts.slice(0, -1).join("~") + "~";
    const parsedHash = crypto.createHash("sha256").update(reconstructedSdJwtPortion).digest("base64url");

    expect(parsedHash).toBe(calculatedHash);
  });

  test("cryptographically verifies rawToken and validates strict standard claims", async () => {
    const { SDJwtInstance, decodeSdJwtSync } = await import("@sd-jwt/core");

    // 1. Generate keys
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const browserPublicKeyJwk = publicKey.export({ format: "jwk" }) as JWK;

    const providerPrivateKey = crypto.createPrivateKey({ key: PRIVATE_KEY_JWK as crypto.JsonWebKey, format: "jwk" });

    const hasher = (data: Uint8Array | string, alg: string) =>
      crypto
        .createHash(alg === "sha-256" ? "sha256" : alg)
        .update(data)
        .digest();

    // Helper to build and verify a token with custom payloads
    const buildAndVerify = async (
      evtOverrides = {},
      kbOverrides = {},
      options = { expectedNonce: "demo-nonce", expectedAudience: "https://rowan.fyi" },
    ) => {
      const evtPayload = {
        iss: "https://rowan.fyi",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        cnf: {
          jwk: browserPublicKeyJwk,
        },
        email: "demo@rowan.fyi",
        email_verified: true,
        ...evtOverrides,
      };

      const evtJwt = signJwt(
        evtPayload,
        {
          alg: "EdDSA",
          kid: PRIVATE_KEY_JWK.kid,
          typ: "evt+jwt",
        },
        providerPrivateKey,
      );

      const sdJwtPortion = `${evtJwt}~`;
      const calculatedHash = crypto.createHash("sha256").update(sdJwtPortion).digest("base64url");

      const kbPayload = {
        aud: "https://rowan.fyi",
        nonce: "demo-nonce",
        iat: Math.floor(Date.now() / 1000),
        sd_hash: calculatedHash,
        ...kbOverrides,
      };

      const kbJwt = signJwt(
        kbPayload,
        {
          alg: "Ed25519",
          typ: "kb+jwt",
        },
        privateKey,
      );

      const rawToken = `${sdJwtPortion}${kbJwt}`;

      // Verification logic from index.astro
      const decodedSdJwt = decodeSdJwtSync(rawToken, hasher);
      const sdJwt = new SDJwtInstance({ hasher });
      sdJwt.config({
        hasher,
        verifier: async (data, sig) => {
          const headerAlg = decodedSdJwt.jwt.header.alg || "ES256";
          const algorithm = headerAlg === "EdDSA" ? undefined : "sha256";
          const kid = decodedSdJwt.jwt.header.kid;
          const jwksKeys = [PUBLIC_KEY_JWK];
          const keysToTry = kid ? jwksKeys.filter((k: { kid?: string }) => k.kid === kid) : jwksKeys;

          for (const jwk of keysToTry) {
            try {
              const pubKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: "jwk" });
              const verifyKey = algorithm === undefined ? pubKey : { key: pubKey, dsaEncoding: "ieee-p1363" as const };
              const isVerified = crypto.verify(algorithm, Buffer.from(data), verifyKey, Buffer.from(sig, "base64url"));
              if (isVerified) return true;
            } catch {
              continue;
            }
          }
          return false;
        },
        kbVerifier: async (data, sig) => {
          try {
            const browserJwkKey = (decodedSdJwt.jwt.payload as { cnf?: { jwk?: crypto.JsonWebKey } }).cnf?.jwk;
            if (!browserJwkKey) throw new Error("Missing browser ephemeral public key.");
            const kbAlg = decodedSdJwt.kbJwt.header.alg || "ES256";
            const algorithm = kbAlg === "EdDSA" || kbAlg === "Ed25519" ? undefined : "sha256";
            const pubKey = crypto.createPublicKey({
              key: browserJwkKey as crypto.JsonWebKey,
              format: "jwk",
            });
            const verifyKey = algorithm === undefined ? pubKey : { key: pubKey, dsaEncoding: "ieee-p1363" as const };
            return crypto.verify(algorithm, Buffer.from(data), verifyKey, Buffer.from(sig, "base64url"));
          } catch {
            return false;
          }
        },
      });

      const result = await sdJwt.verify(rawToken, {
        kb: {
          expectedNonce: options.expectedNonce,
          expectedAudience: options.expectedAudience,
          required: true,
        },
      });

      const verifiedEvtPayload = result.payload as { exp?: number; iat?: number; email?: string };
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExp = verifiedEvtPayload.exp as number | undefined;
      const tokenIat = verifiedEvtPayload.iat as number | undefined;

      // If expiration is present, verify the token is not expired and is consistent with iat
      if (tokenExp) {
        if (currentTime > tokenExp) {
          throw new Error(
            `Security Exception: The token has expired. Current time is ${currentTime}, but token expired at ${tokenExp}.`,
          );
        }
        if (tokenIat && tokenIat >= tokenExp) {
          throw new Error(
            `Security Exception: Token timestamps are inconsistent. Issued at (iat) is ${tokenIat}, but expires at (exp) is ${tokenExp}.`,
          );
        }
      }

      if (!tokenIat) {
        throw new Error("Security Exception: EVT is missing the required issued-at ('iat') claim.");
      }

      const tokenAge = currentTime - tokenIat;
      const fiveMinutes = 300;
      if (tokenAge > fiveMinutes) {
        throw new Error(
          `Security Exception: Token is too old. Token was issued at ${tokenIat} (${tokenAge} seconds ago), which exceeds the 5-minute freshness limit.`,
        );
      }
      if (tokenAge < -60) {
        throw new Error(
          `Security Exception: Token has an invalid future issuance timestamp. Issued at (iat) is ${tokenIat}, but current time is ${currentTime}.`,
        );
      }

      const kbJwtPayload = decodedSdJwt.kbJwt.payload;
      const kbIat = kbJwtPayload.iat as number | undefined;
      if (!kbIat) {
        throw new Error("Security Exception: KB-JWT is missing the required issued-at ('iat') claim.");
      }
      const kbAge = currentTime - kbIat;
      if (kbAge > fiveMinutes) {
        throw new Error(
          `Security Exception: Key Binding JWT is too old. It was issued at ${kbIat} (${kbAge} seconds ago), which exceeds the 5-minute freshness limit.`,
        );
      }
      if (kbAge < -60) {
        throw new Error(
          `Security Exception: Key Binding JWT has an invalid future issuance timestamp. Issued at is ${kbIat}, but current time is ${currentTime}.`,
        );
      }

      return verifiedEvtPayload;
    };

    // Test 1: Valid token verification succeeds
    const payload = await buildAndVerify();
    expect(payload.email).toBe("demo@rowan.fyi");

    // Test: Verification succeeds when exp is omitted
    const payloadNoExp = await buildAndVerify({ exp: undefined });
    expect(payloadNoExp.email).toBe("demo@rowan.fyi");
    expect(payloadNoExp.exp).toBeUndefined();

    // Test 2: Expired token verification fails
    await expect(buildAndVerify({ exp: Math.floor(Date.now() / 1000) - 10 })).rejects.toThrow("expired");

    // Test 3: Stale EVT token (too old) fails
    await expect(
      buildAndVerify({ iat: Math.floor(Date.now() / 1000) - 600, exp: Math.floor(Date.now() / 1000) + 100 }),
    ).rejects.toThrow("Token is too old");

    // Test 4: Inconsistent timestamps (iat >= exp) fails
    await expect(
      buildAndVerify({ iat: Math.floor(Date.now() / 1000) + 100, exp: Math.floor(Date.now() / 1000) + 50 }),
    ).rejects.toThrow(/inconsistent|not yet valid/i);

    // Test 5: Future EVT token fails
    await expect(buildAndVerify({ iat: Math.floor(Date.now() / 1000) + 120 })).rejects.toThrow(/future|not yet valid/i);

    // Test 6: Stale Key Binding JWT fails
    await expect(buildAndVerify({}, { iat: Math.floor(Date.now() / 1000) - 600 })).rejects.toThrow(
      "Key Binding JWT is too old",
    );
  });
});
