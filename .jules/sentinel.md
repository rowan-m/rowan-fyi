## 2024-05-24 - [Reverse Tabnabbing Vulnerability via target="_blank"]

**Vulnerability:** Found `target="_blank"` anchor tags without `rel="noopener noreferrer"` across multiple Astro components (`SocialComments.astro`, `[id]/index.astro`). This allows the newly opened page to potentially access and modify the `window.opener` object, leading to reverse tabnabbing (phishing/malicious redirects of the original tab).
**Learning:** External links often miss this crucial security attribute, especially when dynamically generating components. Although modern browsers default to `noopener` for `target="_blank"`, explicit `rel="noopener noreferrer"` guarantees protection across all browsers and environments.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"` on all external links. Add linting rules (like `eslint-plugin-react`'s `jsx-no-target-blank`, or configure ESLint AST plugins) to enforce this.
