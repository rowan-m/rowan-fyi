## 2024-05-18 - [Parallelize N+1 Social Thread Fetches]

**Learning:** Sequential network requests in loops (like fetching full threads for each social media search result one-by-one) create a massive N+1 bottleneck on the client-side, multiplying latency unnecessarily.
**Action:** Always map arrays of network requests to an array of Promises and use `Promise.all()` to fetch them concurrently. Mutating arrays directly inside these parallel promises can cause race conditions, so results should be returned, filtered synchronously, and appended to the final list, utilizing a shared `Set` for accurate deduplication.

## 2026-03-17 - [O(N) Map Grouping over O(N²) Array Filtering]

**Learning:** When building nested UI trees from a flat array (like threaded social media posts), filtering the entire array recursively to find children results in an O(N²) performance bottleneck. This scales poorly with large threads.
**Action:** Optimize this pattern by pre-processing the flat array once into a `Map` keyed by the parent ID (an O(N) operation). Then, during recursion, perform an O(1) hash map lookup to find children, dropping the overall time complexity to O(N).

## 2026-03-24 - [Defer Below-The-Fold Widgets with Intersection Observer]

**Learning:** Third-party widgets and API requests (like Last.fm, Bluesky feeds, or complex social comment threads) block page load if they trigger immediately on DOMContentLoaded.
**Action:** Use `IntersectionObserver` to wrap the fetch and render logic. Disconnect the observer as soon as the element intersects to lazily evaluate these network operations only when the user scrolls them into view, preserving initial page load performance.
