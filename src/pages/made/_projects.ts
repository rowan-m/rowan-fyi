import type { ImageMetadata } from "astro";

export interface PostSummary {
  id: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    image?: ImageMetadata;
    imageAlt?: string;
    location?: string;
    tags?: string[];
  };
}

export interface ProjectEntry {
  slug: string;
  href: string;
  title: string;
  description: string;
  image?: ImageMetadata;
  imageAlt?: string;
  pubDate?: Date;
  location?: string;
  tags?: string[];
}

const MADE_URL_PREFIX = "https://rowan.fyi/made/";

export function extractProjectMeta(
  slug: string,
  source: string,
): { title: string; description?: string; pubDate?: Date } {
  let title: string | undefined;
  let description: string | undefined;
  let rawPubDate: string | undefined;

  const layoutIdx = source.indexOf("<MetaOnlyLayout");
  if (layoutIdx !== -1) {
    const slice = source.slice(layoutIdx, layoutIdx + 600);
    title = /\btitle="([^"]+)"/.exec(slice)?.[1];
    description = /\bdescription="([^"]+)"/.exec(slice)?.[1];
    rawPubDate = /\bpubDate="([^"]+)"/.exec(slice)?.[1];
  }

  const headEnd = source.indexOf("</head>");
  const head = headEnd !== -1 ? source.slice(0, headEnd) : source;

  if (!title) {
    title = /<title>([^<]+)<\/title>/i.exec(head)?.[1]?.trim();
  }
  if (!description) {
    description =
      /name="[dD]escription"\s+content="([^"]+)"/.exec(head)?.[1]?.trim() ??
      /property="og:description"\s+content="([^"]+)"/.exec(head)?.[1]?.trim();
  }
  rawPubDate ??= /property="article:published_time"\s+content="([^"]+)"/.exec(head)?.[1]?.trim();

  const parsedDate = rawPubDate ? new Date(rawPubDate) : undefined;
  const pubDate = parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate : undefined;

  return {
    title: title || slug,
    description,
    pubDate,
  };
}

export function selectProjectImage(
  slug: string,
  localImages: Record<string, { default: ImageMetadata }>,
  postImage?: ImageMetadata,
): ImageMetadata | undefined {
  const prefix = `./${slug}/`;
  const matchingEntries = Object.entries(localImages).filter(([filePath]) => filePath.startsWith(prefix));

  const previewMatch = matchingEntries.find(([filePath]) => /preview|screenshot/i.test(filePath));
  if (previewMatch) {
    return previewMatch[1].default;
  }

  if (postImage) {
    return postImage;
  }

  const largeLocal = matchingEntries.find(([, mod]) => (mod.default.width ?? 0) >= 300);
  return largeLocal?.[1].default;
}

export function extractMadeSlugFromPath(pathname: string): string | undefined {
  const match = /^\/made\/([^/]+)\/?$/.exec(pathname);
  return match?.[1];
}

export function findPostForSlug(slug: string, posts: PostSummary[]): PostSummary | undefined {
  return posts.find((post) => {
    const loc = post.data.location;
    if (!loc?.startsWith(MADE_URL_PREFIX)) return false;
    const postSlug = loc.slice(MADE_URL_PREFIX.length).replace(/\/$/, "");
    return postSlug === slug;
  });
}

export function buildProjectList(
  rawSources: Record<string, string>,
  localImages: Record<string, { default: ImageMetadata }>,
  posts: PostSummary[],
): ProjectEntry[] {
  const normalizedImages: Record<string, { default: ImageMetadata }> = {};
  for (const [key, mod] of Object.entries(localImages)) {
    normalizedImages[key.replace(/^\.\/made\//, "./")] = mod;
  }

  const projects: ProjectEntry[] = [];
  for (const [filePath, source] of Object.entries(rawSources)) {
    const normalizedPath = filePath.replace(/^\.\/made\//, "./");
    const match = /^\.\/([^/]+)\/index\.astro$/.exec(normalizedPath);
    if (!match) continue;
    const slug = match[1];
    const extracted = extractProjectMeta(slug, source);
    const matchingPost = findPostForSlug(slug, posts);
    const image = selectProjectImage(slug, normalizedImages, matchingPost?.data.image);

    projects.push({
      slug,
      href: `/made/${slug}/`,
      title: extracted.title,
      description: extracted.description ?? matchingPost?.data.description ?? "",
      image,
      imageAlt: matchingPost?.data.imageAlt,
      pubDate: extracted.pubDate ?? matchingPost?.data.pubDate,
    });
  }

  return projects.sort((a, b) => {
    const timeA = a.pubDate?.valueOf() ?? -Infinity;
    const timeB = b.pubDate?.valueOf() ?? -Infinity;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return a.slug.localeCompare(b.slug);
  });
}

export function buildFeedList(
  rawSources: Record<string, string>,
  localImages: Record<string, { default: ImageMetadata }>,
  posts: PostSummary[],
): ProjectEntry[] {
  const projectEntries = buildProjectList(rawSources, localImages, posts);
  const postEntries: ProjectEntry[] = posts.map((post) => ({
    slug: post.id,
    href: `/posts/${post.id}/`,
    title: post.data.title,
    description: post.data.description,
    image: post.data.image,
    imageAlt: post.data.imageAlt,
    pubDate: post.data.pubDate,
    ...(post.data.location ? { location: post.data.location } : {}),
    ...(post.data.tags ? { tags: post.data.tags } : {}),
  }));

  return [...postEntries, ...projectEntries].sort((a, b) => {
    const timeA = a.pubDate?.valueOf() ?? -Infinity;
    const timeB = b.pubDate?.valueOf() ?? -Infinity;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return a.href.localeCompare(b.href);
  });
}
