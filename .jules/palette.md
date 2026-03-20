# Palette's Journal

## 2024-05-18 - Missing Focus States and Alt Text

**Learning:** Found several places missing keyboard focus states. Wait, let me check the existing CSS before adding my own. Also noticed `PostCardView.astro` has alt text that just says "Preview".
**Action:** Need to find one small, simple UX enhancement that is high impact.

## 2025-03-18 - Redundant Adjacent Links in Post Cards

**Learning:** Found a common accessibility pattern in PostCardView.astro where an image and title sequentially linked to the exact same destination. This redundancy can be annoying and repetitive for screen reader users, forcing them to navigate through identical sequential destinations.
**Action:** Used `tabindex="-1"` and `aria-hidden="true"` on the redundant image link to remove it from the keyboard tab order and the accessibility tree, leaving the title link as the single semantically meaningful, accessible anchor, without altering the visual structure or existing grid/flex layouts.

## 2025-05-19 - Progressive Enhancement for Browser APIs (Share Button)

**Learning:** The native `navigator.share` API is not supported in all browsers (e.g., older desktop browsers). Previously, the Share button was always visible but did nothing when clicked if the API was unsupported, creating a frustrating "dead click" experience.
**Action:** Apply progressive enhancement by hiding interactive elements that rely on browser-specific APIs by default (`style="display: none;"`). Then, use client-side JavaScript to check for API support (`if (navigator.share)`) and conditionally reveal the element. This prevents dead UI interactions for unsupported users while enhancing the experience for supported users.
