---
paths:
  - "**/*.html"
---

# 🏗️ HTML style rules

- 2-space indent, double-quoted attributes, void elements self-closed (`<meta ... />`, `<img ... />`).
- Use semantic elements (`header`, `aside`, `main`, `section`, `nav`, `time`, `button type="button"`) — no div soup.
- Class names follow BEM (`breaking-banner__label`, `nav__option`); state is a separate class (`is-active`).
- Elements that JavaScript targets get an `id` and/or a `data-*` hook (`data-view`, `data-metric`); JS never selects by styling classes.
- Accessibility is part of the markup: `aria-label` on landmarks, `aria-hidden="true"` on decorative icons/emoji, `aria-live` for the ticker, `aria-pressed` on toggle buttons, `role="list"` on styled lists.
- Major page regions are introduced by the same `<!-- ====== -->` banner comments used in the JS/CSS files.
- All `<script>` tags load at the end of `<body>` and their order **is** the dependency graph: `data/*.js` → `utils/utils.js` → `api/democracy-api.js` → `script.js` → `scripts/*.js`. New files must be slotted into the right layer.