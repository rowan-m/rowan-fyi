import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      location: z
        .string()
        .url()
        .refine(
          (url) => !url.startsWith("https://rowan.fyi/") || url.endsWith("/"),
          "rowan.fyi location URLs must end with a trailing slash (/)",
        )
        .optional(),
      tags: z.array(z.string()).optional(),
      blueskyUrl: z.string().url().optional(),
      mastodonUrl: z.string().url().optional(),
      standardSiteDoc: z.string().optional(),
    }),
});

export const collections = {
  posts: posts,
};
