import { describe, it, expect } from "vitest";
import type { APIContext } from "astro";
import { GET as getHeavyAdsScript } from "./heavy-ads/adsrules/ad-m.js";
import { GET as getFractiousManifest } from "./fractious/manifest.json";
import { GET as getNotWheelyManifest } from "./not-wheely/manifest.json";
import { GET as getPegSoloManifest } from "./peg-solo/manifest.json";
import { GET as getPersistenceManifest } from "./persistence/manifest.json";

const dummyContext = {} as APIContext;
const CONTENT_TYPE = "Content-Type";
const MANIFEST_MIME = "application/manifest+json";

describe("Pass 2 static endpoints", () => {
  it("returns the EasyList ad-m.js script for heavy-ads", async () => {
    const response = await getHeavyAdsScript(dummyContext);
    expect(response.headers.get(CONTENT_TYPE)).toContain("application/javascript");
    const text = await response.text();
    expect(text).toContain("/made/heavy-ads/adserver-empty/");
    expect(text).toContain("/made/heavy-ads/adserver-proxy/");
  });

  it("returns a valid web app manifest for fractious", async () => {
    const response = await getFractiousManifest(dummyContext);
    expect(response.headers.get(CONTENT_TYPE)).toContain(MANIFEST_MIME);
    const json = await response.json();
    expect(json.name).toBe("Fractious");
    expect(json.start_url).toBe("/made/fractious/");
    expect(json.icons).toHaveLength(8);
    expect(json.screenshots).toHaveLength(5);
  });

  it("returns a valid web app manifest for not-wheely", async () => {
    const response = await getNotWheelyManifest(dummyContext);
    expect(response.headers.get(CONTENT_TYPE)).toContain(MANIFEST_MIME);
    const json = await response.json();
    expect(json.name).toBe("Not wheely");
    expect(json.start_url).toBe("/made/not-wheely/");
    expect(json.icons).toHaveLength(2);
  });

  it("returns a valid web app manifest for peg-solo", async () => {
    const response = await getPegSoloManifest(dummyContext);
    expect(response.headers.get(CONTENT_TYPE)).toContain(MANIFEST_MIME);
    const json = await response.json();
    expect(json.short_name).toBe("Peg Solo");
    expect(json.start_url).toBe("/made/peg-solo/");
    expect(json.icons).toHaveLength(1);
  });

  it("returns a valid web app manifest for persistence", async () => {
    const response = await getPersistenceManifest(dummyContext);
    expect(response.headers.get(CONTENT_TYPE)).toContain(MANIFEST_MIME);
    const json = await response.json();
    expect(json.name).toBe("Persistence of Memory");
    expect(json.start_url).toBe("/made/persistence/");
    expect(json.icons).toHaveLength(2);
  });
});
