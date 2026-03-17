import { describe, expect, test } from "vitest";
import { collections } from "./content.config";
import { z } from "astro:content";

describe("collections.posts.schema", () => {
  const schema = collections.posts.schema;
  const zodSchema =
    typeof schema === "function" ? schema({ image: () => z.any() }) : schema;

  const validPost = {
    title: "Test Post",
    description: "A post for testing",
    pubDate: new Date("2023-01-01"),
  };

  test("accepts valid post with minimum required fields", () => {
    const result = zodSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  test("accepts valid post with all fields", () => {
    const fullPost = {
      ...validPost,
      image: "test-image.jpg",
      imageAlt: "A test image",
      location: "London, UK",
      tags: ["test", "astro"],
      blueskyUrl: "https://bsky.app/profile/user/post/123",
      mastodonUrl: "https://mastodon.social/@user/123",
    };
    const result = zodSchema.safeParse(fullPost);
    expect(result.success).toBe(true);
  });

  test("rejects post missing title", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { title, ...postWithoutTitle } = validPost;
    const result = zodSchema.safeParse(postWithoutTitle);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["title"]);
    }
  });

  test("rejects post missing description", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, ...postWithoutDesc } = validPost;
    const result = zodSchema.safeParse(postWithoutDesc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["description"]);
    }
  });

  test("rejects post missing pubDate", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pubDate, ...postWithoutDate } = validPost;
    const result = zodSchema.safeParse(postWithoutDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["pubDate"]);
    }
  });

  test("rejects post with invalid blueskyUrl", () => {
    const invalidPost = {
      ...validPost,
      blueskyUrl: "not-a-url",
    };
    const result = zodSchema.safeParse(invalidPost);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["blueskyUrl"]);
      // Zod string.url() validation may return 'invalid_string' or 'invalid_format'
      // We mainly care that it failed because it wasn't a valid url.
    }
  });

  test("rejects post with invalid mastodonUrl", () => {
    const invalidPost = {
      ...validPost,
      mastodonUrl: "not-a-url",
    };
    const result = zodSchema.safeParse(invalidPost);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["mastodonUrl"]);
    }
  });

  test("rejects post with invalid tags array", () => {
    const invalidPost = {
      ...validPost,
      tags: [1, 2, 3], // Should be strings
    };
    const result = zodSchema.safeParse(invalidPost);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("tags");
    }
  });
});
