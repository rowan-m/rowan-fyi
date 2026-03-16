## 2024-05-18 - [Parallelize N+1 Social Thread Fetches]

**Learning:** Sequential network requests in loops (like fetching full threads for each social media search result one-by-one) create a massive N+1 bottleneck on the client-side, multiplying latency unnecessarily.
**Action:** Always map arrays of network requests to an array of Promises and use `Promise.all()` to fetch them concurrently. Mutating arrays directly inside these parallel promises can cause race conditions, so results should be returned, filtered synchronously, and appended to the final list, utilizing a shared `Set` for accurate deduplication.
