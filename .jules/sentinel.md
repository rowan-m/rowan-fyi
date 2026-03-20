## 2024-05-18 - Prevent XSS in SocialComments

**Vulnerability:** Use of innerHTML without sanitization for error and no-comments messages.
**Learning:** `innerHTML` even for hardcoded strings or supposedly safe data is flagged by security linters and is generally an unsafe pattern. It's better to use `textContent` and `createElement` / `appendChild` to construct DOM nodes securely to prevent potential XSS vectors. Also only `rel="noopener"` should be used with `target="_blank"`, `noreferrer` should never be added to ensure attribution.
**Prevention:** Avoid `innerHTML`. Construct nodes using the `document.createElement()` API and configure text with `textContent`.
