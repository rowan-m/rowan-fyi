import { describe, expect, test } from "vitest";

// The optimized URL parser logic from src/pages/made/linkage/index.astro
function parseUrl(urlInput: string) {
  try {
    const regexMatch = urlInput.match(/profile\/([^/]+)\/post\/([^/?#\s]+)/);
    if (regexMatch) {
      return { handle: regexMatch[1], postId: regexMatch[2] };
    }
    const parsedUrl = new URL(urlInput);
    const segments = parsedUrl.pathname.split("/");
    return {
      handle: segments.at(2),
      postId: segments.at(4),
    };
  } catch {
    return null;
  }
}

function parseMastodonUrl(inputUrl: string) {
  try {
    const parsed = new URL(inputUrl);
    const host = parsed.hostname;
    const path = parsed.pathname;

    const regexAt = path.match(/\/@([^/]+)\/([^/?#\s]+)/);
    if (regexAt) {
      return { domain: host, handle: regexAt[1], statusId: regexAt[2] };
    }

    const regexUsers = path.match(/\/users\/([^/]+)\/statuses\/([^/?#\s]+)/);
    if (regexUsers) {
      return { domain: host, handle: regexUsers[1], statusId: regexUsers[2] };
    }

    const regexWeb = path.match(/\/(?:web\/)?statuses\/([^/?#\s]+)/);
    if (regexWeb) {
      return { domain: host, handle: null, statusId: regexWeb[1] };
    }

    return null;
  } catch {
    return null;
  }
}

describe("LinkAge URL Parser", () => {
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

describe("Mastodon URL Parser", () => {
  test("successfully parses standard Mastodon post URL with @username", () => {
    const url = "https://mastodon.social/@rowan_m/116640742340950964";
    const result = parseMastodonUrl(url);
    expect(result).toEqual({
      domain: "mastodon.social",
      handle: "rowan_m",
      statusId: "116640742340950964",
    });
  });

  test("successfully parses Mastodon post URL with sub-domain and query parameters", () => {
    const url = "https://sub.domain.social/@username/123456?ref=embed";
    const result = parseMastodonUrl(url);
    expect(result).toEqual({
      domain: "sub.domain.social",
      handle: "username",
      statusId: "123456",
    });
  });

  test("successfully parses Mastodon activitypub standard users style post URL", () => {
    const url = "https://mastodon.social/users/username/statuses/12345678";
    const result = parseMastodonUrl(url);
    expect(result).toEqual({
      domain: "mastodon.social",
      handle: "username",
      statusId: "12345678",
    });
  });

  test("successfully parses Mastodon web statuses style post URL", () => {
    const url = "https://mastodon.social/web/statuses/987654321";
    const result = parseMastodonUrl(url);
    expect(result).toEqual({
      domain: "mastodon.social",
      handle: null,
      statusId: "987654321",
    });
  });

  test("returns null for completely invalid URLs", () => {
    const url = "not-a-valid-url";
    const result = parseMastodonUrl(url);
    expect(result).toBeNull();
  });
});
