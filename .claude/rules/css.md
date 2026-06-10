---
paths:
  - "**/*.css"
---

# 🎨 CSS style rules

- All styling lives in the single `styles.css` — no preprocessors, no inline `<style>` blocks (inline `style=""` is allowed only for JS-driven values like bar widths).
- Design tokens are CSS custom properties declared in `:root` (`--bg-card`, `--accent-red`, `--gap`, `--radius`); reference them with `var(--token)` instead of hardcoding colors or sizes. Add new tokens to `:root` with an aligned value and a short comment.
- Selectors follow BEM: `.block__element--modifier` (`.leaderboard__row--dq`), with `is-*` classes for JS-toggled state. Keep specificity flat — single class selectors, no ids, no deep nesting.
- Sections are separated with the same `/* ====== */` banner comments used in the JS files, one per page region/card.
- Short keyframes and trivial rules may be written on one line (`* { box-sizing: border-box; }`, `50% { opacity: 0.35; transform: scale(0.7); }`).
- Desktop is a locked, full-viewport broadcast layout; below 900px the page stacks and scrolls. All responsive overrides live in the `RESPONSIVE LAYOUT` section at the bottom of `styles.css` (breakpoints: a `min-width: 901px` desktop-only block for the collapsed sidebar rail, then 1200px, 900px, 640px, 520px, 420px, plus `hover: none` for touch) — add mobile tweaks there, ordered widest → narrowest, rather than scattering media queries through the file.