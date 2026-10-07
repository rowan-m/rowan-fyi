import { describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";
import type { CollectionEntry } from "astro:content";
import { buildItemContent, GET, sortPostsNewestFirst } from "./rss.xml";

const mockPosts: CollectionEntry<"posts">[] = [
  {
    id: "anamorphosis",
    collection: "posts",
    data: {
      title: "Anamorphosis",
      description: "A flat pattern turns into a 3D image.",
      pubDate: new Date("2023-02-18"),
      location: "https://rowan.fyi/made/anamorphosis/",
    },
  },
  {
    id: "web-payment-annoyances",
    collection: "posts",
    data: {
      title: "A friendly foray into web payment annoyances",
      description: "Polling peers on web payment friction & <script> quirks.",
      pubDate: new Date("2026-06-23"),
      tags: ["payments", "ux"],
    },
  },
  {
    id: "fractious-deep",
    collection: "posts",
    data: {
      title: "Fractious (deep)",
      description: "A deep dive into the Mandelbrot set.",
      pubDate: new Date("2026-06-21"),
      location: "https://fractious-deep.web.app/",
    },
  },
];

vi.mock("astro:content", () => ({
  getCollection: vi.fn(async () => mockPosts),
}));

describe("RSS feed generation", () => {
  test("sortPostsNewestFirst orders posts in reverse-chronological order by pubDate", () => {
    const sorted = sortPostsNewestFirst(mockPosts);
    expect(sorted.map((post) => post.id)).toEqual(["web-payment-annoyances", "fractious-deep", "anamorphosis"]);
  });

  test("buildItemContent includes escaped summary and both project + post links when location is present", () => {
    const content = buildItemContent(mockPosts[0], new URL("https://rowan.fyi"));
    expect(content).toBe(
      '<p>A flat pattern turns into a 3D image.</p><p><a href="https://rowan.fyi/made/anamorphosis/">Launch interactive project</a> · <a href="https://rowan.fyi/posts/anamorphosis/">Read post on rowan.fyi</a></p>',
    );
  });

  test("buildItemContent escapes HTML entities and includes post link when location is absent", () => {
    const content = buildItemContent(mockPosts[1], new URL("https://rowan.fyi"));
    expect(content).toBe(
      '<p>Polling peers on web payment friction &amp; &lt;script&gt; quirks.</p><p><a href="https://rowan.fyi/posts/web-payment-annoyances/">Read full post on rowan.fyi</a></p>',
    );
  });

  test("GET returns valid RSS XML ordered newest-first with canonical trailing-slash links", async () => {
    const response = await GET({
      site: new URL("https://rowan.fyi"),
    } as unknown as APIContext);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/xml");

    const xml = await response.text();
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    expect(xml).toContain('<atom:link href="https://rowan.fyi/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain("<language>en-gb</language>");
    expect(xml).toContain("<category>payments</category>");

    const firstIdx = xml.indexOf("<link>https://rowan.fyi/posts/web-payment-annoyances/</link>");
    const secondIdx = xml.indexOf("<link>https://rowan.fyi/posts/fractious-deep/</link>");
    const thirdIdx = xml.indexOf("<link>https://rowan.fyi/posts/anamorphosis/</link>");

    expect(firstIdx).toBeGreaterThan(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(thirdIdx).toBeGreaterThan(secondIdx);
  });
});
