## 2024-05-24 - [SocialComments.astro N+1 Query Client-Side Fetch Bottleneck]

**Learning:** Discovered an N+1 query problem during the client-side Social Comments fetch. The logic sequentially iterates over search results from Bluesky and Mastodon, awaiting thread fetches one by one. Additionally, it fetches multiple search URLs sequentially.
**Action:** Replace `for...of` await loops with `Promise.all` mapping to parallelize independent network requests, significantly reducing the cumulative latency of fetching social comments.
