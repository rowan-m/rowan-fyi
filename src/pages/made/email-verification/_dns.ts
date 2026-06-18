import dns from "node:dns/promises";

/**
 * Verifies that the issuer is authoritative for the submitted email's domain.
 * Supports DNS delegation lookup using DNS TXT records under _email-verification.<domain>.
 *
 * @param email The user's submitted email address
 * @param issuer The issuer domain/URL extracted from the EVT
 * @param resolveTxt DNS TXT resolution function (defaults to node:dns/promises)
 */
export async function verifyIssuerDelegation(
  email: string,
  issuer: string,
  resolveTxt: (hostname: string) => Promise<string[][]> = dns.resolveTxt,
): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  let issuerHost: string;
  try {
    issuerHost = issuer.startsWith("http")
      ? new URL(issuer).hostname.toLowerCase()
      : issuer.toLowerCase();
  } catch {
    issuerHost = issuer.toLowerCase();
  }

  // Local development bypass (e.g., localhost, 127.0.0.1)
  if (issuerHost === "localhost" || issuerHost === "127.0.0.1") {
    return true;
  }

  // Self-authoritative match (direct email domain match)
  if (domain.toLowerCase() === issuerHost) {
    return true;
  }

  try {
    const records = await resolveTxt(`_email-verification.${domain}`);
    for (const record of records) {
      const txt = record.join("");
      if (txt.startsWith("iss=")) {
        const delegatedIssuer = txt.substring(4);
        let delegatedHost = "";
        try {
          delegatedHost = delegatedIssuer.startsWith("http")
            ? new URL(delegatedIssuer).hostname.toLowerCase()
            : delegatedIssuer.toLowerCase();
        } catch {
          delegatedHost = delegatedIssuer.toLowerCase();
        }
        if (delegatedHost === issuerHost) {
          return true;
        }
      }
    }
  } catch (e) {
    // If ENOTFOUND or ENODATA is thrown, the delegation record is simply not present.
    console.warn(
      `DNS delegation TXT lookup failed for _email-verification.${domain}:`,
      e,
    );
  }
  return false;
}
