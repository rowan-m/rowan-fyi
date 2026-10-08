import { parseCookieHeader } from "../samesite-sandbox/_cookies";

export const ORIGIN_TRIAL_1P =
  "AqbXOCX7RXsEXrftm6IBrRkqgcl6WRWglCsC2MTsiqvvcM9SsQZxhH34sfYyhiQ0rLXF1r+i9wAkZSlJnfIugQAAAABleyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OX0=";

export const ORIGIN_TRIAL_3P =
  "A3tdw7TzS2AlA4x5zgXMmsd3my4wz+hfnpw/rUPq1laPbhyidvVdup0MgoCxcNyNNaaGyZUh77GibylbsESApAgAAAB5eyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlByaXZhY3lTYW5kYm94QWRzQVBJcyIsImV4cGlyeSI6MTY4MDY1Mjc5OSwiaXNUaGlyZFBhcnR5Ijp0cnVlfQ==";

export const CHIPS_ORIGIN_TRIAL =
  "Am1y6NbY6C9Ho2FGhfWb1eZH3QfBlpim0XpyfR82Im9vbPs81bOkZkEhIYJ6O27obIJv6HMFtp/BD85bYM5klwIAAABieyJvcmlnaW4iOiJodHRwczovL3gtb3JpZ2luLXNyYy5nbGl0Y2gubWU6NDQzIiwiZmVhdHVyZSI6IlBhcnRpdGlvbmVkQ29va2llcyIsImV4cGlyeSI6MTY1NTI1MTE5OX0=";

export const BLOATED_COOKIE_VALUE = "😅🍪".repeat(300);

export const ALLOWED_ORIGINS = [
  "https://rowan.fyi/made/chrome-facilitated-testing",
  "https://rowan.fyi/made/first-party-sets",
  "https://rowan.fyi/made/related-website-sets",
  "https://rowan.fyi/made/third-party-cookies",
  "https://rowan.fyi/made/3pc-dt",
] as const;

export function isAllowedOrigin(origin: string | null): origin is (typeof ALLOWED_ORIGINS)[number] {
  return origin !== null && (ALLOWED_ORIGINS as readonly string[]).includes(origin);
}

export function computeChipsCount(cookieHeader: string | null): number {
  const cookies = parseCookieHeader(cookieHeader);
  const parsed = Number.parseInt(cookies["__Host-count"] ?? "", 10);
  if (parsed >= 1) {
    return parsed + 1;
  }
  return 1;
}
