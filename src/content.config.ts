import { defineCollection, z } from "astro:content";
import { glob } from 'astro/loaders'; // Not available with legacy API


const projectCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/pages/projects" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    image: image(),
  }),
});

export const collections = {
  projects: projectCollection,
};