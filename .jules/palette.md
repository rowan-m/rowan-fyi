# Palette's Journal

## 2024-05-18 - Missing Focus States and Alt Text

**Learning:** Found several places missing keyboard focus states. Wait, let me check the existing CSS before adding my own. Also noticed `PostCardView.astro` has alt text that just says "Preview".
**Action:** Need to find one small, simple UX enhancement that is high impact.

## 2025-03-18 - Redundant Adjacent Links in Post Cards

**Learning:** Found a common accessibility pattern in PostCardView.astro where an image and title sequentially linked to the exact same destination. This redundancy can be annoying and repetitive for screen reader users, forcing them to navigate through identical sequential destinations.
**Action:** Used `tabindex="-1"` and `aria-hidden="true"` on the redundant image link to remove it from the keyboard tab order and the accessibility tree, leaving the title link as the single semantically meaningful, accessible anchor, without altering the visual structure or existing grid/flex layouts.

## 2025-03-22 - Hiding Unsupported Share Buttons

**Learning:** The native `navigator.share` API is not supported on all browsers. If a "Share" button is displayed by default, clicking it on an unsupported browser fails silently, creating a broken user experience. This is a common pattern for features relying on newer browser APIs.
**Action:** Implemented progressive enhancement by hiding the `<button>` element by default with `style="display: none;"`. A client-side script then conditionally removes this inline style (e.g., `button.style.display = ""`) only if `navigator.share` evaluates to true, ensuring the interactive element is only visible when it actually functions.
