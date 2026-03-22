# Palette's Journal

## 2024-05-18 - Missing Focus States and Alt Text

**Learning:** Found several places missing keyboard focus states. Wait, let me check the existing CSS before adding my own. Also noticed `PostCardView.astro` has alt text that just says "Preview".
**Action:** Need to find one small, simple UX enhancement that is high impact.

## 2025-03-18 - Redundant Adjacent Links in Post Cards

**Learning:** Found a common accessibility pattern in PostCardView.astro where an image and title sequentially linked to the exact same destination. This redundancy can be annoying and repetitive for screen reader users, forcing them to navigate through identical sequential destinations.
**Action:** Used `tabindex="-1"` and `aria-hidden="true"` on the redundant image link to remove it from the keyboard tab order and the accessibility tree, leaving the title link as the single semantically meaningful, accessible anchor, without altering the visual structure or existing grid/flex layouts.

## 2025-03-22 - Progressive Enhancement for Browser APIs

**Learning:** When using browser-specific APIs (like `navigator.share`) that are not supported across all browsers or contexts (e.g., desktop vs mobile, or unsupported desktop browsers), displaying interactive elements that rely on them can lead to dead UI.
**Action:** Implemented a progressive enhancement pattern where the UI elements relying on specific APIs are hidden by default (using `style="display: none;"`) and are only revealed via client-side JavaScript once the API's presence is verified.
