## 2024-03-17 - Reverse Tabnabbing via target="\_blank"

**Vulnerability:** External anchor tags using `target="_blank"` were missing `rel="noopener noreferrer"`.
**Learning:** Without `rel="noopener noreferrer"`, the newly opened page retains a reference to the original window via `window.opener`, allowing it to potentially redirect the original page to a malicious site (Reverse Tabnabbing).
**Prevention:** Always include `rel="noopener noreferrer"` on external anchor tags that use `target="_blank"` to prevent reverse tabnabbing and improve user privacy.
