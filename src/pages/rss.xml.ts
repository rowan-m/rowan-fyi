import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { buildFeedList, type ProjectEntry } from "./made/_projects";

const DEFAULT_SITE = "https://rowan.fyi";

const rawSources = import.meta.glob<string>("./made/*/index.astro", {
  query: "?raw",
  import: "default",
  eager: true,
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildItemContent(item: ProjectEntry, site: URL): string {
  const itemUrl = new URL(item.href, site).href;
  const summaryParagraph = `<p>${escapeHtml(item.description)}</p>`;

  if (item.href.startsWith("/made/")) {
    return `${summaryParagraph}<p><a href="${escapeHtml(itemUrl)}">Launch interactive project</a></p>`;
  }

  if (item.location) {
    return `${summaryParagraph}<p><a href="${escapeHtml(item.location)}">Launch interactive project</a> · <a href="${escapeHtml(itemUrl)}">Read post on rowan.fyi</a></p>`;
  }

  return `${summaryParagraph}<p><a href="${escapeHtml(itemUrl)}">Read full post on rowan.fyi</a></p>`;
}

export const GET: APIRoute = async (context) => {
  const site = context.site ?? new URL(DEFAULT_SITE);
  const posts = await getCollection("posts");
  const feedItems = buildFeedList(rawSources, {}, posts);
  const selfUrl = new URL("rss.xml", site).href;

  return rss({
    title: "rowan.fyi",
    description:
      "Rowan Merewood's site featuring a variety of web development projects and posts ranging over graphics, mathematics, optical illusions, and art.",
    site,
    xmlns: {
      atom: "http://www.w3.org/2005/Atom",
    },
    customData: `<language>en-gb</language><atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />`,
    items: feedItems.map((item) => ({
      title: item.title,
      description: item.description,
      content: buildItemContent(item, site),
      pubDate: item.pubDate ?? new Date(0),
      link: item.href,
      ...(item.tags ? { categories: item.tags } : {}),
    })),
  });
};
