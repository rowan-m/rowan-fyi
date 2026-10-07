import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { type CollectionEntry, getCollection } from "astro:content";

const DEFAULT_SITE = "https://rowan.fyi";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sortPostsNewestFirst(posts: CollectionEntry<"posts">[]): CollectionEntry<"posts">[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id));
}

export function buildItemContent(post: CollectionEntry<"posts">, site: URL): string {
  const postUrl = new URL(`/posts/${post.id}/`, site).href;
  const summaryParagraph = `<p>${escapeHtml(post.data.description)}</p>`;

  if (post.data.location) {
    return `${summaryParagraph}<p><a href="${escapeHtml(post.data.location)}">Launch interactive project</a> · <a href="${escapeHtml(postUrl)}">Read post on rowan.fyi</a></p>`;
  }

  return `${summaryParagraph}<p><a href="${escapeHtml(postUrl)}">Read full post on rowan.fyi</a></p>`;
}

export const GET: APIRoute = async (context) => {
  const site = context.site ?? new URL(DEFAULT_SITE);
  const posts = sortPostsNewestFirst(await getCollection("posts"));
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
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      content: buildItemContent(post, site),
      pubDate: post.data.pubDate,
      link: `/posts/${post.id}/`,
      ...(post.data.tags ? { categories: post.data.tags } : {}),
    })),
  });
};
