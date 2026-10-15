import net from "node:net";

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
