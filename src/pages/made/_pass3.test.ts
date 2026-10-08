import { describe, it, expect } from "vitest";
import type { APIContext } from "astro";
import { reduceUserAgent } from "./reduced-ua/_reduce-ua";
import { buildAcceptChHeader } from "./user-agent-client-hints/_uach";
import { GET as getShowHeaders } from "./user-agent-client-hints/show-headers.json";
import { parseCookieHeader, SAMESITE_SANDBOX_COOKIES } from "./samesite-sandbox/_cookies";
import { ALL as getSameSiteCookies } from "./samesite-sandbox/cookies.json";
import {
  BLOATED_COOKIE_VALUE,
  CHIPS_ORIGIN_TRIAL,
  ORIGIN_TRIAL_1P,
  ORIGIN_TRIAL_3P,
  computeChipsCount,
  isAllowedOrigin,
} from "./x-origin-src/_x-origin";
import { GET as set3pcJson } from "./x-origin-src/set-3pc.json";
import { GET as get3pcJson } from "./x-origin-src/get-3pc.json";
import { ALL as reportEndpoint } from "./x-origin-src/report";
import { GET as getInjectedMetaJs } from "./x-origin-src/injected-meta.js";

const ALLOW_ORIGIN_HEADER = "Access-Control-Allow-Origin";
const THIRD_PARTY_COOKIES_ORIGIN = "https://rowan.fyi/made/third-party-cookies";

function makeContext(headersInit: Record<string, string> = {}): APIContext {
  return {
    request: new Request("https://rowan.fyi/made/test", {
      headers: headersInit,
    }),
  } as unknown as APIContext;
}

describe("Pass 3 helpers and endpoints", () => {
  describe("reduced-ua (_reduce-ua.ts)", () => {
    it("reduces desktop Windows, Mac, Linux, and CrOS Chrome User-Agent strings", () => {
      const macResult = reduceUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.124 Safari/537.36",
      );
      expect(macResult.didReduce).toBe("Yes");
      expect(macResult.newUA).toBe(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      );

      const winResult = reduceUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.5414.74 Safari/537.36",
      );
      expect(winResult.didReduce).toBe("Yes");
      expect(winResult.newUA).toContain("Chrome/109.0.0.0 Safari/537.36");
    });

    it("reduces Android mobile Chrome User-Agent strings", () => {
      const androidResult = reduceUserAgent(
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.65 Mobile Safari/537.36",
      );
      expect(androidResult.didReduce).toBe("Yes");
      expect(androidResult.newUA).toBe(
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
      );
    });

    it("leaves non-Chrome User-Agent strings unchanged", () => {
      const ff = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0";
      const res = reduceUserAgent(ff);
      expect(res.didReduce).toBe("No");
      expect(res.newUA).toBe(ff);
      expect(reduceUserAgent(null).didReduce).toBe("No");
    });
  });

  describe("user-agent-client-hints (_uach.ts and show-headers.json.ts)", () => {
    it("builds Accept-CH header from query parameters and filters unknown hints", () => {
      const params = new URLSearchParams("uach=Sec-CH-UA-Arch&uach=Invalid-Hint&uach=Sec-CH-UA-Bitness");
      const res = buildAcceptChHeader(params, ["save-data", "ch-save-data"]);
      expect(res.acceptCh).toBe("save-data, ch-save-data, Sec-CH-UA-Arch, Sec-CH-UA-Bitness");
      expect(res.displayHeader).toBe("Accept-CH: save-data, ch-save-data, Sec-CH-UA-Arch, Sec-CH-UA-Bitness");
    });

    it("omits Accept-CH when noheader=noheader is set", () => {
      const params = new URLSearchParams("uach=Sec-CH-UA-Arch&noheader=noheader");
      const res = buildAcceptChHeader(params);
      expect(res.acceptCh).toBeNull();
      expect(res.displayHeader).toBe("[not set]");
    });

    it("returns received Sec-CH-UA and User-Agent headers in show-headers.json", async () => {
      const response = await getShowHeaders(
        makeContext({
          "Sec-CH-UA": '"Chromium";v="120"',
          "User-Agent": "TestBrowser/1.0",
        }),
      );
      const data = await response.json();
      expect(data["User-Agent"]).toBe("TestBrowser/1.0");
      expect(data["Sec-CH-UA"]["Sec-CH-UA"]).toBe('"Chromium";v="120"');
    });
  });

  describe("samesite-sandbox (_cookies.ts and cookies.json.ts)", () => {
    it("parses Cookie header into key-value object", () => {
      expect(parseCookieHeader(null)).toEqual({});
      expect(parseCookieHeader("ck00=vl00; ck01=vl%2001; invalid")).toEqual({
        ck00: "vl00",
        ck01: "vl 01",
      });
      expect(SAMESITE_SANDBOX_COOKIES).toHaveLength(6);
    });

    it("returns cookies and CORS headers from cookies.json", async () => {
      const response = await getSameSiteCookies(makeContext({ cookie: "ck01=vl01" }));
      expect(response.headers.get(ALLOW_ORIGIN_HEADER)).toBe("https://rowan.fyi/made/x-origin-src");
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
      expect(await response.json()).toEqual({ ck01: "vl01" });
    });
  });

  describe("x-origin-src (_x-origin.ts and endpoints)", () => {
    it("computes incremented CHIPS __Host-count cookie value", () => {
      expect(computeChipsCount(null)).toBe(1);
      expect(computeChipsCount("__Host-count=1")).toBe(2);
      expect(computeChipsCount("__Host-count=4")).toBe(5);
      expect(BLOATED_COOKIE_VALUE.length).toBeGreaterThan(100);
      expect(ORIGIN_TRIAL_1P).toBeTruthy();
      expect(ORIGIN_TRIAL_3P).toBeTruthy();
      expect(CHIPS_ORIGIN_TRIAL).toBeTruthy();
    });

    it("validates allowed origins and handles set-3pc.json and get-3pc.json", async () => {
      expect(isAllowedOrigin(THIRD_PARTY_COOKIES_ORIGIN)).toBe(true);
      expect(isAllowedOrigin("https://example.com")).toBe(false);

      const setRes = await set3pcJson(
        makeContext({
          origin: THIRD_PARTY_COOKIES_ORIGIN,
          cookie: "3pc=123",
        }),
      );
      expect(setRes.headers.get(ALLOW_ORIGIN_HEADER)).toBe(THIRD_PARTY_COOKIES_ORIGIN);
      expect(setRes.headers.get("Set-Cookie")).toContain("SameSite=None");
      expect(await setRes.json()).toEqual({ "3pc": "123" });

      const getRes = await get3pcJson(
        makeContext({
          origin: THIRD_PARTY_COOKIES_ORIGIN,
          cookie: "3pc=456",
        }),
      );
      expect(getRes.headers.get(ALLOW_ORIGIN_HEADER)).toBe(THIRD_PARTY_COOKIES_ORIGIN);
      expect(await getRes.json()).toEqual({ "3pc": "456" });
    });

    it("serves report and injected-meta.js endpoints", async () => {
      const reportRes = await reportEndpoint(makeContext());
      expect(reportRes.status).toBe(200);

      const metaRes = await getInjectedMetaJs(makeContext());
      expect(metaRes.headers.get("Content-Type")).toContain("application/javascript");
      expect(await metaRes.text()).toContain("origin-trial");
    });
  });
});
