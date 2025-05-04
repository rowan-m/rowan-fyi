import { defineCollection, z } from "astro:content";
import { glob } from 'astro/loaders'; // Not available with legacy API

const postCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/pages/posts" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    image: image(),
  }),
});

export const collections = {
  posts: postCollection,
};