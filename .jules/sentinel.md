## 2024-05-24 - [Fix XSS Vulnerability & Enhance External Link Security]

**Vulnerability:** Use of `innerHTML` to inject dynamic DOM structures on client side, which is a potential source of DOM-based XSS attacks. Incomplete use of `rel="noopener"` instead of `rel="noopener noreferrer"` for external anchor tags with `target="_blank"`, missing a critical privacy-focused defense mechanism.
**Learning:** Even internal app state and API responses must be aggressively managed with safe DOM methods like `createElement` and `textContent`. Ensure universally enforced `rel="noopener noreferrer"` attributes across the app to deter reverse tabnabbing and tracking.
**Prevention:** Strictly enforce rules to reject `innerHTML` globally across all repositories unless accompanied by exhaustive contextual sanitization. Always pair `target="_blank"` with `rel="noopener noreferrer"` uniformly.
