import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import DOMPurify from "dompurify";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

interface Comment {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorUrl: string;
  content: string;
  facets?: any[];
  publishedAt: string;
  url: string;
  source: "bluesky" | "mastodon";
  replies?: Comment[];
  images?: { url: string; alt?: string }[];
}

const CACHE_KEY_PREFIX = "social-comments-v3-";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@customElement("social-comments")
class SocialCommentsWidget extends LitElement {
  @property({ type: String, attribute: "canonical-url" }) canonicalUrl = "";
  @property({ type: String, attribute: "location-url" }) locationUrl = "";
  @property({ type: String, attribute: "bsky-url" }) bskyUrl = "";
  @property({ type: String, attribute: "mastodon-url" }) mastodonUrl = "";

  @state() private comments: Comment[] = [];
  @state() private loading = true;
  @state() private error = "";

  static readonly styles = css`
    :host {
      display: block;
    }

    .loading {
      font-style: italic;
      color: var(--sec-fg, #666);
    }

    .error {
      color: #c00000;
    }

    .comment {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 1.5rem;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .comment-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      object-fit: cover;
      background-color: var(--sec-bg, #eee);
    }

    .comment-author-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .comment-author-name {
      font-weight: bold;
      color: var(--main-fg, #333);
      text-decoration: none;
      font-size: 0.95rem;
    }

    .comment-author-handle {
      font-size: 0.8rem;
      color: var(--sec-fg, #666);
      text-decoration: none;
    }

    .comment-content {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--main-fg, #333);
      word-break: break-word;
    }

    .comment-content p {
      margin-block: 0.5rem;
    }

    .comment-content a {
      color: var(--main-accent, #0056b3);
    }

    .comment-meta {
      font-size: 0.75rem;
      color: var(--sec-fg, #666);
    }

    .comment-meta a {
      color: var(--sec-fg, #666);
      text-decoration: none;
    }

    .comment-replies {
      margin-left: 1rem;
      padding-left: 1rem;
      border-left: 1px solid var(--sec-border, #ddd);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .comment-images {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .comment-images img {
      max-height: 20rem;
      border-radius: 8px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.initComments();
  }

  private async initComments() {
    const cacheKey =
      CACHE_KEY_PREFIX +
      this.canonicalUrl.replace(/[^a-zA-Z0-9]/g, "-") +
      (this.locationUrl ? "-" + this.locationUrl.replace(/[^a-zA-Z0-9]/g, "-") : "");
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const { timestamp, comments } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_TTL) {
          this.comments = comments;
          this.loading = false;
          return;
        }
      } catch (e) {
        // ignore corrupted cache
        console.warn("Ignored corrupted cache", e);
      }
    }

    try {
      this.comments = await this.fetchAllComments(this.canonicalUrl, this.locationUrl, this.bskyUrl, this.mastodonUrl);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          comments: this.comments,
        }),
      );
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      this.error = "Failed to load comments. Please try again later.";
    } finally {
      this.loading = false;
    }
  }

  // --- Utility logic, moved from original Astro component ---

  private getSearchQueries(urlStr: string, blogHostname = "rowan.fyi"): string[] {
    try {
      const url = new URL(urlStr);
      if (url.hostname !== blogHostname) return [url.hostname];

      const queries = [urlStr];
      if (urlStr.endsWith("/")) {
        queries.push(urlStr.slice(0, -1));
      } else if (!url.pathname.includes(".")) {
        queries.push(urlStr + "/");
      }

      const noProtocol = url.host + url.pathname + url.search;
      queries.push(noProtocol);
      if (noProtocol.endsWith("/")) {
        queries.push(noProtocol.slice(0, -1));
      } else if (!url.pathname.includes(".")) {
        queries.push(noProtocol + "/");
      }

      return Array.from(new Set(queries));
    } catch {
      return [urlStr];
    }
  }

  private unwrapUserComments(comments: Comment[]): Comment[] {
    const MY_BSKY_HANDLE = "rowan.fyi";
    const MY_BSKY_DID = "did:plc:7dtviror2bcs32dnngqsf7ay";
    const MY_MASTODON_URL = "https://mastodon.social/@rowan_m";

    const result: Comment[] = [];
    for (const comment of comments) {
      const isMe =
        (comment.source === "bluesky" &&
          (comment.authorHandle === MY_BSKY_HANDLE || comment.id.includes(MY_BSKY_DID))) ||
        (comment.source === "mastodon" && comment.authorUrl === MY_MASTODON_URL);
      if (isMe) {
        if (comment.replies) {
          result.push(...this.unwrapUserComments(comment.replies));
        }
      } else {
        result.push(comment);
      }
    }
    return result;
  }

  private filterIgnoredAccounts(comments: Comment[]): Comment[] {
    const IGNORED_HANDLES = ["rowan.fyi.web.brid.gy"];
    const result: Comment[] = [];
    for (const comment of comments) {
      if (!IGNORED_HANDLES.includes(comment.authorHandle)) {
        if (comment.replies) {
          comment.replies = this.filterIgnoredAccounts(comment.replies);
        }
        result.push(comment);
      }
    }
    return result;
  }

  private async fetchAllComments(
    canonicalUrl: string,
    locationUrl?: string,
    bskyUrl?: string,
    mastodonUrl?: string,
  ): Promise<Comment[]> {
    const promises = [
      this.fetchBlueskyComments(canonicalUrl, locationUrl, bskyUrl),
      this.fetchMastodonComments(canonicalUrl, locationUrl, mastodonUrl),
    ];

    const results = await Promise.all(promises);
    let allComments = results.flat();

    allComments = this.unwrapUserComments(allComments);
    allComments = this.filterIgnoredAccounts(allComments);

    const uniqueMap = new Map<string, Comment>();
    for (const c of allComments) {
      const existing = uniqueMap.get(c.id);
      if (!existing || (c.replies?.length || 0) > (existing.replies?.length || 0)) {
        uniqueMap.set(c.id, c);
      }
    }
    allComments = Array.from(uniqueMap.values());
    allComments.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

    return allComments;
  }

  // --- Bluesky ---
  private async fetchBlueskyComments(
    canonicalUrl: string,
    locationUrl?: string,
    linkedUrl?: string,
  ): Promise<Comment[]> {
    const comments: Comment[] = [];
    if (linkedUrl) {
      try {
        const thread = await this.fetchBlueskyThread(linkedUrl);
        if (thread) comments.push(thread);
      } catch (e) {
        console.warn("BSky thread fetch failed", e);
      }
    }

    let blogHostname = "rowan.fyi";
    try {
      blogHostname = new URL(canonicalUrl).hostname;
    } catch (e) {
      console.warn("Error parsing canonical url", e);
    }

    const searchUrls: string[] = [];
    searchUrls.push(...this.getSearchQueries(canonicalUrl, blogHostname));
    if (locationUrl) searchUrls.push(...this.getSearchQueries(locationUrl, blogHostname));
    const uniqueSearchUrls = Array.from(new Set(searchUrls));

    const searchResults = await Promise.all(uniqueSearchUrls.map((url) => this.searchBlueskyUrl(url, comments)));

    const allComments = [...comments, ...searchResults.flat()];
    return Array.from(new Map(allComments.map((c) => [c.id, c])).values());
  }

  private async searchBlueskyUrl(urlToSearch: string, existingComments: Comment[]): Promise<Comment[]> {
    const newComments: Comment[] = [];
    try {
      const searchUrl = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(urlToSearch)}&limit=20`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const data = await searchRes.json();
        const searchPosts = data.posts || [];
        const existingIds = new Set(existingComments.map((c) => c.id));

        const postPromises = searchPosts.map(async (post: any) => {
          if (existingIds.has(post.uri)) return null;
          try {
            const thread = await this.fetchBlueskyThreadByUri(post.uri);
            if (thread) return thread;
          } catch (e) {
            console.warn("BSky thread fetch for search result failed", e);
          }
          return this.mapBlueskyPost(post);
        });

        const resolvedPosts = await Promise.all(postPromises);
        for (const p of resolvedPosts) {
          if (p) newComments.push(p);
        }
      }
    } catch (e) {
      console.warn("BSky search failed for " + urlToSearch, e);
    }
    return newComments;
  }

  private async fetchBlueskyThread(url: string): Promise<Comment | null> {
    if (url.startsWith("at://")) {
      return this.fetchBlueskyThreadByUri(url);
    } else if (url.includes("bsky.app/profile/")) {
      const parts = url.split("/");
      const handle = parts[parts.indexOf("profile") + 1];
      const rkey = parts[parts.indexOf("post") + 1];
      try {
        let did = handle;
        if (!handle.startsWith("did:")) {
          const resolveRes = await fetch(
            `https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
          );
          if (!resolveRes.ok) return null;
          const resolveData = await resolveRes.json();
          did = resolveData.did;
        }
        const uri = `at://${did}/app.bsky.feed.post/${rkey}`;
        return this.fetchBlueskyThreadByUri(uri);
      } catch (e) {
        console.warn("Error fetching Bluesky thread", e);
      }
    }
    return null;
  }

  private async fetchBlueskyThreadByUri(uri: string): Promise<Comment | null> {
    try {
      const threadRes = await fetch(`https://api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${uri}`);
      if (!threadRes.ok) return null;
      const data = await threadRes.json();
      return this.mapBlueskyThread(data.thread);
    } catch (e) {
      console.warn("Error in fetchBlueskyThreadByUri", e);
      return null;
    }
  }

  private mapBlueskyPost(post: any): Comment {
    let content = post.record.text;
    if (!content && post.embed && post.embed.$type === "app.bsky.embed.external#view") {
      content = post.embed.external.uri;
    } else if (
      !content &&
      post.embed &&
      post.embed.$type === "app.bsky.embed.recordWithMedia#view" &&
      post.embed.media &&
      post.embed.media.$type === "app.bsky.embed.external#view"
    ) {
      content = post.embed.media.external.uri;
    }

    const comment: Comment = {
      id: post.uri,
      authorName: post.author.displayName || post.author.handle,
      authorHandle: post.author.handle,
      authorAvatar: post.author.avatar,
      authorUrl: `https://bsky.app/profile/${post.author.handle}`,
      content: content,
      facets: post.record.facets,
      publishedAt: post.indexedAt,
      url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split("/").pop()}`,
      source: "bluesky",
    };

    if (post.embed) {
      if (post.embed.$type === "app.bsky.embed.images#view") {
        comment.images = post.embed.images.map((img: any) => ({ url: img.thumb, alt: img.alt }));
      } else if (post.embed.$type === "app.bsky.embed.video#view") {
        comment.images = [{ url: post.embed.thumbnail, alt: "Video thumbnail" }];
      } else if (
        post.embed.$type === "app.bsky.embed.external#view" &&
        (post.embed.external.uri.includes("tenor.com") || post.embed.external.uri.includes("giphy.com"))
      ) {
        comment.images = [
          { url: post.embed.external.thumb || post.embed.external.uri, alt: post.embed.external.title || "GIF" },
        ];
      }
    }
    return comment;
  }

  private mapBlueskyThread(thread: any): Comment | null {
    if (!thread || !thread.post) return null;
    const comment = this.mapBlueskyPost(thread.post);
    if (thread.replies && thread.replies.length > 0) {
      comment.replies = thread.replies
        .filter((r: any) => r.post)
        .map((r: any) => this.mapBlueskyThread(r))
        .filter((c: any) => c !== null) as Comment[];
    }
    return comment;
  }

  // --- Mastodon ---
  private async fetchMastodonComments(
    canonicalUrl: string,
    locationUrl?: string,
    linkedUrl?: string,
  ): Promise<Comment[]> {
    const comments: Comment[] = [];
    if (linkedUrl) {
      const urlData = this.parseMastodonUrl(linkedUrl);
      if (urlData) {
        try {
          const thread = await this.fetchMastodonThread(urlData.id, urlData.host);
          if (thread) comments.push(thread);
        } catch (e) {
          console.warn("Mastodon thread fetch failed for " + linkedUrl, e);
        }
      }
    }

    let blogHostname = "rowan.fyi";
    try {
      blogHostname = new URL(canonicalUrl).hostname;
    } catch (e) {
      console.warn("Error parsing canonical url", e);
    }

    const searchUrls: string[] = [];
    searchUrls.push(...this.getSearchQueries(canonicalUrl, blogHostname));
    if (locationUrl) searchUrls.push(...this.getSearchQueries(locationUrl, blogHostname));
    const uniqueSearchUrls = Array.from(new Set(searchUrls));

    const searchResults = await Promise.all(uniqueSearchUrls.map((url) => this.searchMastodonUrl(url, comments)));
    const allComments = [...comments, ...searchResults.flat()];
    return Array.from(new Map(allComments.map((c) => [c.id, c])).values());
  }

  private async searchMastodonUrl(urlToSearch: string, existingComments: Comment[]): Promise<Comment[]> {
    const newComments: Comment[] = [];
    try {
      const searchUrl = `https://mastodon.social/api/v2/search?q=${encodeURIComponent(urlToSearch)}&type=statuses&limit=20`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const data = await searchRes.json();
        const statuses = data.statuses || [];
        const existingIds = new Set(existingComments.map((c) => c.id));

        const statusPromises = statuses.map(async (status: any) => {
          if (existingIds.has(status.id)) return null;
          const thread = await this.fetchMastodonThread(status.id, "mastodon.social");
          return thread || this.mapMastodonStatus(status);
        });

        const resolvedStatuses = await Promise.all(statusPromises);
        for (const p of resolvedStatuses) {
          if (p) newComments.push(p);
        }
      }
    } catch (e) {
      console.warn("Mastodon best-effort search failed", e);
    }
    return newComments;
  }

  private parseMastodonUrl(url: string) {
    try {
      const u = new URL(url);
      const host = u.host;
      const pathParts = u.pathname.split("/").filter(Boolean);
      const id = pathParts.pop();
      if (!id || (isNaN(Number(id)) && id.length < 10)) return null;
      return { host, id };
    } catch (e) {
      console.warn("Invalid Mastodon URL", e);
      return null;
    }
  }

  private async fetchMastodonThread(id: string, host: string): Promise<Comment | null> {
    try {
      const [statusRes, contextRes] = await Promise.all([
        fetch(`https://${host}/api/v1/statuses/${id}`),
        fetch(`https://${host}/api/v1/statuses/${id}/context`),
      ]);

      if (!statusRes.ok) return null;
      const status = await statusRes.json();

      if (!contextRes.ok) return this.mapMastodonStatus(status);
      const context = await contextRes.json();

      const rootComment = this.mapMastodonStatus(status);
      const descendants = context.descendants || [];
      const descendantsByParent = new Map<string, any[]>();

      for (const d of descendants) {
        if (!d.in_reply_to_id) continue;
        const list = descendantsByParent.get(d.in_reply_to_id) || [];
        list.push(d);
        descendantsByParent.set(d.in_reply_to_id, list);
      }

      rootComment.replies = this.buildMastodonTree(id, descendantsByParent);
      return rootComment;
    } catch (e) {
      console.warn("Error fetching Mastodon thread", e);
      return null;
    }
  }

  private buildMastodonTree(parentId: string, descendantsByParent: Map<string, any[]>): Comment[] {
    const children = descendantsByParent.get(parentId) || [];
    return children.map((d) => {
      const c = this.mapMastodonStatus(d);
      c.replies = this.buildMastodonTree(d.id, descendantsByParent);
      return c;
    });
  }

  private mapMastodonStatus(status: any): Comment {
    const comment: Comment = {
      id: status.id,
      authorName: status.account.display_name || status.account.username,
      authorHandle: status.account.acct,
      authorAvatar: status.account.avatar,
      authorUrl: status.account.url,
      content: status.content,
      publishedAt: status.created_at,
      url: status.url,
      source: "mastodon",
    };

    if (status.media_attachments) {
      comment.images = status.media_attachments
        .filter((m: any) => m.type === "image" || m.type === "gifv" || m.type === "video")
        .map((m: any) => ({ url: m.preview_url || m.url, alt: m.description }));
    }
    return comment;
  }

  // --- Rendering logic ---

  private isSafeUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().trim();
    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
      return false;
    }
    return true;
  }

  private sanitizeMastodonHtml(htmlStr: string) {
    return DOMPurify.sanitize(htmlStr, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "a",
        "span",
        "b",
        "i",
        "strong",
        "em",
        "u",
        "del",
        "blockquote",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
      ],
      ALLOWED_ATTR: ["href", "class", "target", "rel"],
    });
  }

  // A simple linkifier based on regex (to replace the heavy DOM operations in the old component)
  // For Bluesky plain text where we need to find URLs
  private linkifyBlueskyHtml(text: string, facets?: any[]) {
    // If we have facets, we could reconstruct the string precisely.
    // For simplicity with lit, we can escape the text, then replace URLs, and use `unsafeHTML`
    // Wait, let's just use DOMPurify to be safe
    let htmlContent = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Convert newlines to breaks
    htmlContent = htmlContent.replace(/\n/g, "<br>");

    // Apply facets if available
    // Re-linkify based on facets would require exact byte offsets.
    // Instead, we can just run a general linkify over the text
    const urlRegex = /(https?:\/\/[^\s]+?)(?=[.,;!?]?(\s|$))/g;
    htmlContent = htmlContent.replace(urlRegex, (url) => {
      if (this.isSafeUrl(url)) {
        return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
      }
      return url;
    });

    return DOMPurify.sanitize(htmlContent);
  }

  renderComment(comment: Comment) {
    const avatar = this.isSafeUrl(comment.authorAvatar) ? comment.authorAvatar : "";
    const authorUrl = this.isSafeUrl(comment.authorUrl) ? comment.authorUrl : "#";
    const commentUrl = this.isSafeUrl(comment.url) ? comment.url : "#";
    const date = new Date(comment.publishedAt).toLocaleString();

    const contentHtml =
      comment.source === "mastodon"
        ? this.sanitizeMastodonHtml(comment.content)
        : this.linkifyBlueskyHtml(comment.content, comment.facets);

    return html`
      <article class="comment" id="comment-${comment.id.replace(/[^a-zA-Z0-9]/g, "-")}">
        <div class="comment-header">
          <img class="comment-avatar" src="${avatar}" alt="${comment.authorName}" loading="lazy" />
          <div class="comment-author-info">
            <a class="comment-author-name" href="${authorUrl}">${comment.authorName}</a>
            <a class="comment-author-handle" href="${authorUrl}">@${comment.authorHandle}</a>
          </div>
        </div>
        <div class="comment-content">${unsafeHTML(contentHtml)}</div>

        ${
          comment.images && comment.images.length > 0
            ? html`
                <div class="comment-images">
                  ${comment.images.map(
                    (img) => html`
                      ${
                        this.isSafeUrl(img.url)
                          ? html`<img src="${img.url}" alt="${img.alt || ""}" loading="lazy" />`
                          : nothing
                      }
                    `,
                  )}
                </div>
              `
            : nothing
        }

        <div class="comment-meta">
          <a href="${commentUrl}" target="_blank" rel="noopener">${date}</a>
        </div>

        ${
          comment.replies && comment.replies.length > 0
            ? html` <div class="comment-replies">${comment.replies.map((reply) => this.renderComment(reply))}</div> `
            : nothing
        }
      </article>
    `;
  }

  render() {
    if (this.loading) {
      return html`<p class="loading">Loading comments from Bluesky and Mastodon...</p>`;
    }

    if (this.error) {
      return html`<p class="error">${this.error}</p>`;
    }

    if (this.comments.length === 0) {
      return html`<p>No comments found yet. Be the first to share your thoughts!</p>`;
    }

    return html` <div id="comments-container">${this.comments.map((comment) => this.renderComment(comment))}</div> `;
  }
}
