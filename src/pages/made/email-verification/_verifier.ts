import { createHash } from "node:crypto";
import net from "node:net";
import { SdJwtInstance, decodeSdJwtSync, type DecodedSdJwt } from "@sd-jwt/core";
import { compactVerify, importJWK, type JWK } from "jose";

export const ALLOWED_ASYMMETRIC_ALGS = ["Ed25519", "EdDSA", "ES256"] as const;

export interface VerifyEvtOptions {
  rawToken: string;
  decodedSdJwt?: DecodedSdJwt;
  jwksKeys: Array<JWK & { kid?: string; alg?: string }>;
  expectedNonce: string;
  expectedAudience: string;
  maxAgeSeconds?: number;
  clockSkewSeconds?: number;
  onIssuerVerified?: () => void;
}

const DNS_LABEL_CHARS_RE = /^[a-z0-9-]+$/;

function isValidDnsLabel(label: string): boolean {
  return (
    label.length >= 1 &&
    label.length <= 63 &&
    !label.startsWith("-") &&
    !label.endsWith("-") &&
    DNS_LABEL_CHARS_RE.test(label)
  );
}

/**
 * Verifies that an issuer identifier is a bare origin (e.g. "https://rowan.fyi")
 * with no trailing slash, path, query, fragment, or embedded credentials.
 */
export function isBareOrigin(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.username || parsed.password) {
      return false;
    }
    return parsed.origin !== "null" && parsed.origin === urlStr;
  } catch {
    return false;
  }
}

/**
 * Validates the `iss=` domain value from a `_email-verification.<domain>` DNS TXT record.
 * Per IETF draft-dickhardt-mailmaint-ehm-02 Section 3.2 and Chrome 156+, the value must be
 * a bare canonical lowercase DNS domain name (no scheme, port, path, uppercase, or IP literal).
 */
export function isValidDnsIssuerDomain(domain: string): boolean {
  if (!domain || domain.length > 253 || domain !== domain.toLowerCase()) {
    return false;
  }
  if (net.isIP(domain) !== 0) {
    return false;
  }
  const labels = domain.split(".");
  if (labels.length < 2) {
    return false;
  }
  return labels.every(isValidDnsLabel);
}

/**
 * Validates that an outbound discovery or JWKS URL is safe to fetch (protecting against SSRF).
 * In production (`isProd = true`), requires `https:` and a valid public DNS hostname (rejecting
 * localhost, `.local`/`.internal` suffixes, and all IP literals).
 */
export function isSafeIssuerUrl(urlStr: string, isProd = import.meta.env.PROD): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.username || parsed.password) {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    const isLocalDev = !isProd && (host === "localhost" || host === "127.0.0.1");
    if (isLocalDev) {
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    }
    if (parsed.protocol !== "https:") {
      return false;
    }
    if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }
    return isValidDnsIssuerDomain(host);
  } catch {
    return false;
  }
}

/**
 * Reads and parses a JSON response body while enforcing an upper byte limit (`maxBytes`).
 */
export async function readBoundedJson<T = Record<string, unknown>>(
  response: Response,
  url: string,
  maxBytes = 65536,
): Promise<T> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Response from ${url} exceeds maximum allowed size of ${maxBytes} bytes.`);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error(`Response from ${url} exceeds maximum allowed size of ${maxBytes} bytes.`);
  }
  return JSON.parse(text) as T;
}

/**
 * SHA-256 / IANA hash callback compatible with `@sd-jwt/core`.
 */
export function sdJwtHasher(data: string | ArrayBuffer | Uint8Array, alg: string): Uint8Array {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const nodeAlg = alg === "sha-256" ? "sha256" : alg;
  return new Uint8Array(createHash(nodeAlg).update(input).digest());
}

/**
 * Validates standard JWT claims including expiration, issued-at presence, and freshness window.
 */
export function validateClaims(
  payload: Record<string, unknown>,
  maxAgeSeconds = 300,
  clockSkewSeconds = 60,
  label = "Token",
): void {
  const currentTime = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const iat = typeof payload.iat === "number" ? payload.iat : undefined;

  if (exp !== undefined && currentTime > exp + clockSkewSeconds) {
    throw new Error(`Security Exception: ${label} has expired (exp: ${exp}, current: ${currentTime}).`);
  }
  if (!iat) {
    throw new Error(`Security Exception: ${label} is missing the required issued-at ('iat') claim.`);
  }
  if (exp !== undefined && iat >= exp) {
    throw new Error(`Security Exception: ${label} timestamps are inconsistent (iat: ${iat} >= exp: ${exp}).`);
  }
  const age = currentTime - iat;
  if (age > maxAgeSeconds + clockSkewSeconds) {
    throw new Error(
      `Security Exception: ${label} is too old (issued ${age} seconds ago, max limit: ${maxAgeSeconds}s).`,
    );
  }
  if (age < -clockSkewSeconds) {
    throw new Error(
      `Security Exception: ${label} has an invalid future issuance timestamp (iat: ${iat}, current: ${currentTime}).`,
    );
  }
}

/**
 * Decodes an SD-JWT EVP token into its EVT, disclosures, and Key Binding JWT components.
 */
export function parseEvtSdJwt(rawToken: string): DecodedSdJwt {
  return decodeSdJwtSync(rawToken, sdJwtHasher);
}

function assertAllowedAlgorithm(alg: unknown, tokenLabel: "EVT" | "KB-JWT"): string {
  const algStr = typeof alg === "string" ? alg : undefined;
  if (!algStr || !(ALLOWED_ASYMMETRIC_ALGS as readonly string[]).includes(algStr)) {
    throw new Error(
      `Security Exception: Unsupported or insecure ${tokenLabel} signing algorithm '${algStr || "none"}'.`,
    );
  }
  return algStr;
}

async function verifyIssuerSignatureWithJwks(
  token: string,
  kid: string | undefined,
  fallbackAlg: string,
  jwksKeys: Array<JWK & { kid?: string; alg?: string }>,
): Promise<boolean> {
  const keysToTry = kid ? jwksKeys.filter((k) => k.kid === kid) : jwksKeys;
  for (const jwk of keysToTry) {
    try {
      const pubKey = await importJWK(jwk, jwk.alg || fallbackAlg);
      await compactVerify(token, pubKey);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Cryptographically verifies an EVP SD-JWT + Key Binding JWT (KB-JWT) including issuer
 * signature, holder key binding, nonce, audience, `sd_hash`, and freshness/expiration claims.
 */
export async function verifyEvtAndKbJwt(
  options: VerifyEvtOptions,
): Promise<{ payload: Record<string, unknown>; kbPayload: Record<string, unknown> }> {
  const maxAgeSeconds = options.maxAgeSeconds ?? 300;
  const clockSkewSeconds = options.clockSkewSeconds ?? 60;
  const decodedSdJwt = options.decodedSdJwt ?? parseEvtSdJwt(options.rawToken);

  if (!decodedSdJwt.kbJwt) {
    throw new Error("Security Exception: Missing Key Binding JWT (KB-JWT).");
  }

  const evtAlg = assertAllowedAlgorithm(decodedSdJwt.jwt.header.alg, "EVT");
  const kbAlg = assertAllowedAlgorithm(decodedSdJwt.kbJwt.header.alg, "KB-JWT");

  const cnf = decodedSdJwt.jwt.payload.cnf as { jwk?: JWK } | undefined;
  const cnfJwkAlg = cnf?.jwk?.alg;
  if (cnfJwkAlg && kbAlg !== cnfJwkAlg) {
    throw new Error(
      `Security Exception: KB-JWT signing algorithm ('${kbAlg}') does not match EVT cnf.jwk.alg ('${cnfJwkAlg}').`,
    );
  }

  const sdJwt = new SdJwtInstance({ hasher: sdJwtHasher });
  sdJwt.config({
    hasher: sdJwtHasher,
    verifier: async (data, sig) => {
      const kid = typeof decodedSdJwt.jwt.header.kid === "string" ? decodedSdJwt.jwt.header.kid : undefined;
      const matched = await verifyIssuerSignatureWithJwks(`${data}.${sig}`, kid, evtAlg, options.jwksKeys);
      if (!matched) {
        return false;
      }
      validateClaims(decodedSdJwt.jwt.payload, maxAgeSeconds, clockSkewSeconds);
      options.onIssuerVerified?.();
      return true;
    },
    kbVerifier: async (data, sig) => {
      try {
        const browserJwkKey = cnf?.jwk;
        if (!browserJwkKey) {
          return false;
        }
        const pubKey = await importJWK(browserJwkKey, kbAlg);
        await compactVerify(`${data}.${sig}`, pubKey);
        return true;
      } catch {
        return false;
      }
    },
  });

  const result = await sdJwt.verify(options.rawToken, {
    keyBindingNonce: options.expectedNonce,
    expectedKeyBindingAudience: options.expectedAudience,
    allowedIssuerAlgorithms: [...ALLOWED_ASYMMETRIC_ALGS],
    allowedKeyBindingAlgorithms: [...ALLOWED_ASYMMETRIC_ALGS],
    maxAgeSeconds,
    keyBindingMaxAgeSeconds: maxAgeSeconds,
    skewSeconds: clockSkewSeconds,
  });

  validateClaims(decodedSdJwt.kbJwt.payload, maxAgeSeconds, clockSkewSeconds, "Key Binding JWT");

  return {
    payload: result.payload as Record<string, unknown>,
    kbPayload: decodedSdJwt.kbJwt.payload,
  };
}
