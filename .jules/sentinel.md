## 2026-03-20 - [Avoid innerHTML for DOM Manipulation]

**Vulnerability:** Usage of `innerHTML` in `SocialComments.astro` for DOM updates. While currently rendering static strings, it establishes a dangerous pattern that could lead to XSS if dynamically modified with untrusted data in the future.
**Learning:** Security linters strictly forbid `innerHTML`. Even for static content, using safe DOM APIs (`textContent`, `createElement`, `appendChild`) is mandatory for defense in depth and preventing DOM-based XSS.
**Prevention:** Universally use safe DOM traversal and manipulation methods (like `document.createElement`, `textContent`, and `appendChild`) instead of `innerHTML` for client-side scripts.
