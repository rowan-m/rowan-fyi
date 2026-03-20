## 2024-05-18 - [Parallelize N+1 Social Thread Fetches]

**Learning:** Sequential network requests in loops (like fetching full threads for each social media search result one-by-one) create a massive N+1 bottleneck on the client-side, multiplying latency unnecessarily.
**Action:** Always map arrays of network requests to an array of Promises and use `Promise.all()` to fetch them concurrently. Mutating arrays directly inside these parallel promises can cause race conditions, so results should be returned, filtered synchronously, and appended to the final list, utilizing a shared `Set` for accurate deduplication.

## 2026-03-17 - [O(N) Map Grouping over O(N²) Array Filtering]

**Learning:** When building nested UI trees from a flat array (like threaded social media posts), filtering the entire array recursively to find children results in an O(N²) performance bottleneck. This scales poorly with large threads.
**Action:** Optimize this pattern by pre-processing the flat array once into a `Map` keyed by the parent ID (an O(N) operation). Then, during recursion, perform an O(1) hash map lookup to find children, dropping the overall time complexity to O(N).

## 2026-03-20 - [Lazy Load Third-Party APIs via IntersectionObserver]

**Learning:** Running network requests for third-party widgets (Bluesky, Last.fm, Mastodon) on initial page load blocks resources and wastes network bandwidth for content the user might never scroll to see.
**Action:** Use `IntersectionObserver` (with a sensible `rootMargin` like `200px`) to defer API fetches and heavy DOM building until these below-the-fold components are about to enter the viewport.
