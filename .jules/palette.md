# Palette's Journal

## 2024-05-18 - Missing Focus States and Alt Text

**Learning:** Found several places missing keyboard focus states. Wait, let me check the existing CSS before adding my own. Also noticed `PostCardView.astro` has alt text that just says "Preview".
**Action:** Need to find one small, simple UX enhancement that is high impact.

## 2025-03-18 - Redundant Adjacent Links in Post Cards

**Learning:** Found a common accessibility pattern in PostCardView.astro where an image and title sequentially linked to the exact same destination. This redundancy can be annoying and repetitive for screen reader users, forcing them to navigate through identical sequential destinations.
**Action:** Used `tabindex="-1"` and `aria-hidden="true"` on the redundant image link to remove it from the keyboard tab order and the accessibility tree, leaving the title link as the single semantically meaningful, accessible anchor, without altering the visual structure or existing grid/flex layouts.

## 2025-05-19 - Fallbacks for Browser APIs (Share Button)

**Learning:** Hiding elements conditionally based on client-side JS checks (like checking for `navigator.share`) can lead to layout shifts and buttons "popping in" when the page loads, which is a poor user experience.
**Action:** Provide graceful fallbacks instead of hiding UI elements. If an API like `navigator.share` is unavailable, use a fallback action such as copying the URL to the clipboard using `navigator.clipboard` and provide visual feedback to the user ("Copied!").
