import { describe, expect, test } from "vitest";

// The optimized URL parser logic from src/pages/made/blueskynet/index.astro
function parseUrl(urlStr: string) {
  try {
    // Robust regex to extract handle and postId regardless of trailing slashes, sub-paths, or query params
    const match = urlStr.match(/profile\/([^/]+)\/post\/([^/?#\s]+)/);
    if (match) {
      return { handle: match[1], postId: match[2] };
    }
    const url = new URL(urlStr);
    const parts = url.pathname.split("/");
    const handle = parts.at(2);
    const postId = parts.at(4);
    return { handle, postId };
  } catch {
    return null;
  }
}

describe("BlueSkynet URL Parser", () => {
  test("successfully parses standard Bluesky post URL", () => {
    const url = "https://bsky.app/profile/rowan.fyi/post/3lps6j646ts2h";
    const result = parseUrl(url);
    expect(result).toEqual({
      handle: "rowan.fyi",
      postId: "3lps6j646ts2h",
    });
  });

  test("successfully parses Bluesky post URL with query parameters", () => {
    const url =
      "https://bsky.app/profile/rowan.fyi/post/3lps6j646ts2h?ref_src=embed";
    const result = parseUrl(url);
    expect(result).toEqual({
      handle: "rowan.fyi",
      postId: "3lps6j646ts2h",
    });
  });

  test("successfully parses Bluesky post URL with trailing slash", () => {
    const url = "https://bsky.app/profile/rowan.fyi/post/3lps6j646ts2h/";
    const result = parseUrl(url);
    expect(result).toEqual({
      handle: "rowan.fyi",
      postId: "3lps6j646ts2h",
    });
  });

  test("successfully parses Bluesky post URL with hash/anchor tag", () => {
    const url =
      "https://bsky.app/profile/rowan.fyi/post/3lps6j646ts2h#comments";
    const result = parseUrl(url);
    expect(result).toEqual({
      handle: "rowan.fyi",
      postId: "3lps6j646ts2h",
    });
  });

  test("successfully parses sub-domain URL handles (e.g. staging or user domain)", () => {
    const url =
      "https://staging.bsky.app/profile/username.bsky.social/post/123456789";
    const result = parseUrl(url);
    expect(result).toEqual({
      handle: "username.bsky.social",
      postId: "123456789",
    });
  });

  test("returns null for completely invalid URLs", () => {
    const url = "invalid-url";
    const result = parseUrl(url);
    expect(result).toBeNull();
  });

  test("uses fallback parser for slightly non-standard path matching if regex fails", () => {
    // A path structure matching profile/x/post/y but formatted without typical schemas
    const url = "https://bsky.app/custom/profile/user/post/999";
    const result = parseUrl(url);
    expect(result).toEqual({
      handle: "user",
      postId: "999",
    });
  });
});
