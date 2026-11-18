import { createHash } from "node:crypto";
import net from "node:net";
import { SdJwtInstance } from "@sd-jwt/core";
import { compactVerify, decodeProtectedHeader, importJWK, type JWK } from "jose";

export const ALLOWED_ASYMMETRIC_ALGS = ["Ed25519", "EdDSA", "ES256"] as const;

export interface VerifyEvtOptions {
  rawToken: string;
  jwksKeys: Array<JWK & { kid?: string; alg?: string }>;
  expectedIssuer?: string;
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
 * Per IETF draft-hardt-email-verification (Issuer Discovery / DNS Delegation) and Chrome 156+, the value must be
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
 * SHA-256 / IANA hash callback required by `@sd-jwt/core`.
 */
export function sdJwtHasher(data: string | ArrayBuffer | Uint8Array, alg: string): Uint8Array {
  const input = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return new Uint8Array(
    createHash(alg === "sha-256" ? "sha256" : alg)
      .update(input)
      .digest(),
  );
}

async function verifyIssuerSignatureWithJwks(
  token: string,
  jwksKeys: Array<JWK & { kid?: string; alg?: string }>,
): Promise<boolean> {
  const { alg, kid, typ } = decodeProtectedHeader(token);
  if (!alg || typ !== "evt+jwt") {
    return false;
  }
  const keysToTry = kid ? jwksKeys.filter((k) => k.kid === kid) : jwksKeys;
  for (const jwk of keysToTry) {
    try {
      const pubKey = await importJWK(jwk, jwk.alg || alg);
      await compactVerify(token, pubKey);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Verifies an EVP token (`<EVT>~<KB-JWT>`) by delegating SD-JWT/KB-JWT claim, freshness,
 * algorithm, `sd_hash`, nonce, and audience validation to `@sd-jwt/core`, and JWS signature
 * verification to `jose`.
 */
export async function verifyEvtAndKbJwt(
  options: VerifyEvtOptions,
): Promise<{ payload: Record<string, unknown>; kbPayload: Record<string, unknown> }> {
  const maxAgeSeconds = options.maxAgeSeconds ?? 300;
  const skewSeconds = options.clockSkewSeconds ?? 60;

  const sdJwt = new SdJwtInstance({
    hasher: sdJwtHasher,
    verifier: async (data, sig) => {
      const matched = await verifyIssuerSignatureWithJwks(`${data}.${sig}`, options.jwksKeys);
      if (matched) {
        options.onIssuerVerified?.();
      }
      return matched;
    },
    kbVerifier: async (data, sig, payload) => {
      try {
        const browserJwk = payload.cnf?.jwk;
        if (!browserJwk) {
          return false;
        }
        const token = `${data}.${sig}`;
        const { alg } = decodeProtectedHeader(token);
        const pubKey = await importJWK(browserJwk as JWK, browserJwk.alg || alg);
        await compactVerify(token, pubKey);
        return true;
      } catch {
        return false;
      }
    },
  });

  const result = await sdJwt.verify(options.rawToken, {
    expectedIssuer: options.expectedIssuer,
    keyBindingNonce: options.expectedNonce,
    expectedKeyBindingAudience: options.expectedAudience,
    allowedIssuerAlgorithms: [...ALLOWED_ASYMMETRIC_ALGS],
    allowedKeyBindingAlgorithms: [...ALLOWED_ASYMMETRIC_ALGS],
    maxAgeSeconds,
    keyBindingMaxAgeSeconds: maxAgeSeconds,
    skewSeconds,
  });

  return {
    payload: result.payload as Record<string, unknown>,
    kbPayload: (result.kb?.payload ?? {}) as Record<string, unknown>,
  };
}
