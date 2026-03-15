## 2025-03-14 - Strict URL Sanitization

**Vulnerability:** A blocklist approach for validating URLs (`isSafeUrl`) in `SocialComments.astro` could be bypassed by obscure URL protocols or malformed inputs (e.g., `java\nscript:`).
**Learning:** Checking for malicious protocols by string matching alone (e.g., `.startsWith('javascript:')`) is often prone to evasion and misses edge cases.
**Prevention:** Instead of a blocklist, use a strict allowlist. Parse the input using the `URL` constructor (which properly normalizes URLs) and enforce allowed protocols such as `['http:', 'https:', 'mailto:', 'tel:']`.

## 2025-03-14 - Missing Security Attributes

**Vulnerability:** External links were rendered with `target="_blank"` without the `rel="noopener noreferrer"` attribute in `SocialComments.astro` and `posts/[id]/index.astro`.
**Learning:** Omitting `noopener` can expose the application to reverse tabnabbing attacks, while omitting `noreferrer` can leak the application's URL or sensitive data in headers to external sites.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"`.
