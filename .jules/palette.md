# Palette's Journal

## 2024-05-18 - Missing Focus States and Alt Text

**Learning:** Found several places missing keyboard focus states. Wait, let me check the existing CSS before adding my own. Also noticed `PostCardView.astro` has alt text that just says "Preview".
**Action:** Need to find one small, simple UX enhancement that is high impact.

## 2025-03-18 - Redundant Adjacent Links in Post Cards

**Learning:** Found a common accessibility pattern in PostCardView.astro where an image and title sequentially linked to the exact same destination. This redundancy can be annoying and repetitive for screen reader users, forcing them to navigate through identical sequential destinations.
**Action:** Used `tabindex="-1"` and `aria-hidden="true"` on the redundant image link to remove it from the keyboard tab order and the accessibility tree, leaving the title link as the single semantically meaningful, accessible anchor, without altering the visual structure or existing grid/flex layouts.

## 2025-03-18 - Missing progressive enhancement on Share Button

**Learning:** Found a UX issue in ShareButton.astro where the "Share" button relies on the `navigator.share` Web API but renders unconditionally. On browsers or contexts that don't support the API, the button is visible but clicking it results in a console error and no user feedback, which is a broken experience.
**Action:** Applied progressive enhancement by hiding the button by default (`style="display: none;"`) and removing the inline style via client-side JavaScript only after verifying `navigator.share` is present.
