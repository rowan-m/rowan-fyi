import { describe, expect, test, vi } from "vitest";
import type { APIContext } from "astro";
import type { CollectionEntry } from "astro:content";
import type { ProjectEntry } from "./made/_projects";
import { buildItemContent, GET } from "./rss.xml";

const mockPosts: CollectionEntry<"posts">[] = [
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
  test("buildItemContent includes project launch link for /made/ project entries", () => {
    const projectItem: ProjectEntry = {
      slug: "anamorphosis",
      href: "/made/anamorphosis/",
      title: "Anamorphosis",
      description: "A flat pattern turns into a 3D image.",
      pubDate: new Date("2023-02-18"),
    };
    const content = buildItemContent(projectItem, new URL("https://rowan.fyi"));
    expect(content).toBe(
      '<p>A flat pattern turns into a 3D image.</p><p><a href="https://rowan.fyi/made/anamorphosis/">Launch interactive project</a></p>',
    );
  });

  test("buildItemContent includes escaped summary and both project + post links when post location is present", () => {
    const postWithLocation: ProjectEntry = {
      slug: "fractious-deep",
      href: "/posts/fractious-deep/",
      title: "Fractious (deep)",
      description: "A deep dive into the Mandelbrot set.",
      pubDate: new Date("2026-06-21"),
      location: "https://fractious-deep.web.app/",
    };
    const content = buildItemContent(postWithLocation, new URL("https://rowan.fyi"));
    expect(content).toBe(
      '<p>A deep dive into the Mandelbrot set.</p><p><a href="https://fractious-deep.web.app/">Launch interactive project</a> · <a href="https://rowan.fyi/posts/fractious-deep/">Read post on rowan.fyi</a></p>',
    );
  });

  test("buildItemContent escapes HTML entities and includes post link when location is absent", () => {
    const postItem: ProjectEntry = {
      slug: "web-payment-annoyances",
      href: "/posts/web-payment-annoyances/",
      title: "A friendly foray into web payment annoyances",
      description: "Polling peers on web payment friction & <script> quirks.",
      pubDate: new Date("2026-06-23"),
    };
    const content = buildItemContent(postItem, new URL("https://rowan.fyi"));
    expect(content).toBe(
      '<p>Polling peers on web payment friction &amp; &lt;script&gt; quirks.</p><p><a href="https://rowan.fyi/posts/web-payment-annoyances/">Read full post on rowan.fyi</a></p>',
    );
  });

  test("GET returns valid RSS XML combining posts and /made/ projects ordered newest-first", async () => {
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

    const lightnessIdx = xml.indexOf("<link>https://rowan.fyi/made/lightness-perception/</link>");
    const paymentsIdx = xml.indexOf("<link>https://rowan.fyi/posts/web-payment-annoyances/</link>");
    const fractiousDeepIdx = xml.indexOf("<link>https://rowan.fyi/posts/fractious-deep/</link>");
    const anamorphosisIdx = xml.indexOf("<link>https://rowan.fyi/made/anamorphosis/</link>");

    expect(lightnessIdx).toBeGreaterThan(0);
    expect(paymentsIdx).toBeGreaterThan(lightnessIdx);
    expect(fractiousDeepIdx).toBeGreaterThan(paymentsIdx);
    expect(anamorphosisIdx).toBeGreaterThan(fractiousDeepIdx);
  });
});
