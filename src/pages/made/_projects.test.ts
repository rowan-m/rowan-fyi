import { describe, expect, it } from "vitest";
import type { ImageMetadata } from "astro";
import {
  buildFeedList,
  buildProjectList,
  extractMadeSlugFromPath,
  extractProjectMeta,
  findPostForSlug,
  selectProjectImage,
} from "./_projects";

const makeImage = (src: string, width = 800, height = 500): ImageMetadata => ({
  src,
  width,
  height,
  format: "png",
});

describe("extractMadeSlugFromPath", () => {
  it("extracts project slug from /made/<slug>/ paths", () => {
    expect(extractMadeSlugFromPath("/made/linkage/")).toBe("linkage");
    expect(extractMadeSlugFromPath("/made/linkage")).toBe("linkage");
    expect(extractMadeSlugFromPath("/made/")).toBeUndefined();
    expect(extractMadeSlugFromPath("/made/heavy-ads/adserver-cpu/")).toBeUndefined();
    expect(extractMadeSlugFromPath("/posts/foo/")).toBeUndefined();
  });
});

describe("findPostForSlug", () => {
  it("finds a matching post by its location URL", () => {
    const post = {
      id: "barnsley-ferns",
      data: {
        title: "Barnsley ferns",
        description: "Post fern description",
        pubDate: new Date("2023-07-16T00:00:00Z"),
        location: "https://rowan.fyi/made/barnsley-ferns/",
      },
    };
    expect(findPostForSlug("barnsley-ferns", [post])).toBe(post);
    expect(findPostForSlug("other", [post])).toBeUndefined();
  });
});

describe("extractProjectMeta", () => {
  it("extracts title, description, and pubDate from MetaOnlyLayout props", () => {
    const source = `---
import MetaOnlyLayout from "@/layouts/MetaOnlyLayout.astro";
---
<MetaOnlyLayout title="<input-knob> goes to eleven" description="A knob demo" pubDate="2019-08-25">
  <main>Hello</main>
</MetaOnlyLayout>`;

    expect(extractProjectMeta("goes-to-eleven", source)).toEqual({
      title: "<input-knob> goes to eleven",
      description: "A knob demo",
      pubDate: new Date("2019-08-25"),
    });
  });

  it("extracts title, description, and article:published_time from standard HTML head tags", () => {
    const source = `<!doctype html>
<html>
  <head>
    <meta name="Description" content="Explore fractals" />
    <meta property="article:published_time" content="2021-02-26" />
    <title>Fractious</title>
  </head>
  <body><button title="Move up">Up</button></body>
</html>`;

    expect(extractProjectMeta("fractious", source)).toEqual({
      title: "Fractious",
      description: "Explore fractals",
      pubDate: new Date("2021-02-26"),
    });
  });

  it("falls back to slug when no title is found", () => {
    expect(extractProjectMeta("mystery-demo", "<main>No head</main>")).toEqual({
      title: "mystery-demo",
      description: undefined,
      pubDate: undefined,
    });
  });
});

describe("selectProjectImage", () => {
  it("prefers local preview image over post image", () => {
    const previewImg = makeImage("/preview.jpg", 1200, 630);
    const postImg = makeImage("/post.png", 800, 500);
    const result = selectProjectImage("linkage", { "./linkage/linkage-preview.jpg": { default: previewImg } }, postImg);
    expect(result).toBe(previewImg);
  });

  it("uses postImage when no explicit local preview image exists", () => {
    const iconImg = makeImage("/icon.png", 120, 120);
    const postImg = makeImage("/post.png", 800, 500);
    const result = selectProjectImage("musaic-box", { "./musaic-box/assets/icon.png": { default: iconImg } }, postImg);
    expect(result).toBe(postImg);
  });

  it("uses local image if width >= 300 and skips tiny icons", () => {
    const smallIcon = makeImage("/icon.png", 120, 120);
    const largeAsset = makeImage("/photo.jpg", 400, 400);
    expect(
      selectProjectImage("snow-blower", {
        "./snow-blower/assets/icon.png": { default: smallIcon },
      }),
    ).toBeUndefined();
    expect(
      selectProjectImage("heavy-ads", {
        "./heavy-ads/assets/icon.png": { default: smallIcon },
        "./heavy-ads/assets/photo.jpg": { default: largeAsset },
      }),
    ).toBe(largeAsset);
  });
});

describe("buildProjectList", () => {
  it("merges extracted metadata with matching post data and sorts newest-first with slug tiebreaker", () => {
    const postImg = makeImage("/ferns.png");
    const postPubDate = new Date("2023-07-16");
    const newerDate = new Date("2026-10-02");
    const list = buildProjectList(
      {
        "./z-demo/index.astro": `<MetaOnlyLayout title="Z Demo" description="Undated demo">`,
        "./barnsley-ferns/index.astro": `<MetaOnlyLayout title="Barnsley Ferns">`,
        "./lightness-perception/index.astro": `<MetaOnlyLayout title="Lightness" description="Newer demo" pubDate="2026-10-02">`,
      },
      {},
      [
        {
          id: "barnsley-ferns",
          data: {
            title: "Barnsley ferns",
            description: "Post fern description",
            pubDate: postPubDate,
            image: postImg,
            imageAlt: "Green fern",
            location: "https://rowan.fyi/made/barnsley-ferns/",
          },
        },
      ],
    );

    expect(list).toEqual([
      {
        slug: "lightness-perception",
        href: "/made/lightness-perception/",
        title: "Lightness",
        description: "Newer demo",
        image: undefined,
        imageAlt: undefined,
        pubDate: newerDate,
      },
      {
        slug: "barnsley-ferns",
        href: "/made/barnsley-ferns/",
        title: "Barnsley Ferns",
        description: "Post fern description",
        image: postImg,
        imageAlt: "Green fern",
        pubDate: postPubDate,
      },
      {
        slug: "z-demo",
        href: "/made/z-demo/",
        title: "Z Demo",
        description: "Undated demo",
        image: undefined,
        imageAlt: undefined,
        pubDate: undefined,
      },
    ]);
  });
});

describe("buildFeedList", () => {
  it("merges posts and ./made/ projects into a single newest-first feed", () => {
    const previewImg = makeImage("/preview.png");
    const feed = buildFeedList(
      {
        "./made/older-demo/index.astro": `<MetaOnlyLayout title="Older Demo" description="Demo desc" pubDate="2021-01-01">`,
      },
      {
        "./made/older-demo/preview.png": { default: previewImg },
      },
      [
        {
          id: "newer-post",
          data: {
            title: "Newer Post",
            description: "Post desc",
            pubDate: new Date("2026-06-23"),
          },
        },
      ],
    );

    expect(feed.map((item) => item.href)).toEqual(["/posts/newer-post/", "/made/older-demo/"]);
    expect(feed[1].image).toBe(previewImg);
  });
});
