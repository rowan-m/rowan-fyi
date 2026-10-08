export const SAMESITE_SANDBOX_COOKIES = [
  "ck03=vl03; SameSite=InvalidValue",
  "ck00=vl00; Path=/",
  "ck01=vl01; Path=/; Secure; SameSite=None",
  "ck02=vl02; Path=/; SameSite=None",
  "ck04=vl04; Path=/; SameSite=Lax",
  "ck05=vl05; Path=/; SameSite=Strict",
] as const;

export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const entries: [string, string][] = [];
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) {
      continue;
    }
    const key = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    if (key) {
      try {
        entries.push([key, decodeURIComponent(rawVal)]);
      } catch {
        entries.push([key, rawVal]);
      }
    }
  }

  return Object.fromEntries(entries);
}
