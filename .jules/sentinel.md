## 2026-03-19 - [XSS Bypass via String URL Validation]

**Vulnerability:** The `isSafeUrl` function used string matching (`startsWith("javascript:")`) to detect malicious URLs in social comments.
**Learning:** String-based protocol checking is inherently vulnerable to bypasses using whitespace, control characters, or alternative execution protocols (e.g., `jav ascript:` or `\x01javascript:` or `vbscript:`).
**Prevention:** Always use the built-in `URL` constructor to parse URLs and validate against a strict allowlist of known-safe protocols (e.g., `['http:', 'https:', 'mailto:', 'tel:']`).
