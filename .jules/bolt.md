## 2024-03-14 - N+1 Network Request Bottleneck in Social Media Fetching
**Learning:** Sequential network requests inside a loop (the N+1 anti-pattern) significantly increase latency, especially when communicating with third-party APIs (e.g., fetching thread replies for multiple social media posts one by one). This is particularly noticeable in frontend performance as it delays rendering client-side components.
**Action:** Always parallelize independent network requests using `Promise.all` when mapping over a list of items that require additional data fetching.
