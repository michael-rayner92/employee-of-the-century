---
paths:
  - "**/*.js"
---

# JavaScript style rules

Derived from the existing code in this repo. Match these when writing or editing any `.js` file.

## Module shape

- No modules, no `import`/`export`, no classes. Every file contributes globals; dependency order is the `<script>` tag order in `index.html`.
- Namespaces are plain object literals assigned to a `const` (`Utils`, `democracyApi`). Related methods are grouped into nested sub-objects (`democracyApi.votes`, `democracyApi.render`).
- Internal/private members are prefixed with `_` (e.g. `headlines._paint`, `_intervalMs`) and excluded from the public API docs.

## File and section comments

- Every file opens with a banner block comment:
  ```js
  /* ============================================================
     Title — one-line role.

     A few lines on what the file owns, what it must NOT contain,
     and its place in the load order.
     ============================================================ */
  ```
- Major sections within a file are separated by lighter dividers:
  ```js
  /* ----------------------------------------------------------
     SECTION NAME
     ---------------------------------------------------------- */
  ```
- **JSDoc is required on every non-trivial function** — all top-level functions, every public namespace method (`Utils.*`, `democracyApi.*`), and every scenario entry point (`run*()`) must carry a JSDoc block: a one-line summary (plus behavioral notes such as call-order constraints where relevant), `@param {type} name - description` for each parameter, and `@returns {type}` when a value is returned. Union string types are written literally: `@returns {"up"|"down"|"stable"}`. Only inline arrow callbacks inside a pipeline (`.map(v => ...)`, event handlers) and `_`-prefixed internals are exempt — internals get at most a short `/** ... */` or `//` note.
- Inline comments explain *why* — constraints, ordering requirements, domain rationale ("capture BEFORE reassigning", "no intermediate rounding") — not what the next line does. Emphasis uses CAPS (BEFORE, AFTER, NOT) sparingly.

## Naming

- Data globals and module-level constants: `SCREAMING_SNAKE_CASE` (`VOTES`, `APP_STATE`, `LOADER_MESSAGES`, `HUSSEIN_ID`, `TOTAL_MS`).
- Functions, methods, and locals: `camelCase`. Booleans read as predicates (`isAvailable`, `isWon`, `isPreInit`).
- Names are descriptive and self-explanatory (`remoteLeader`, `packIds`, `leaderPct`) — never placeholder names (`arr`, `obj`, `tmp`, `x`), cryptic abbreviations (`gv`, `mx`), or numbered variants (`id1`, `a2`). A name should not need a comment to explain what it holds.
- Bootstrap wiring functions: `initX()` (`initGodMode`, `initBroadcastClock`). God Mode scenario entry points: `runScenarioName()` (`runGenesis`, `runVotes2`), one per file.
- File names: kebab-case matching their content (`operation-birthday-cake.js`, `call-of-the-night.js`).

## Formatting

- 2-space indent, semicolons, **double quotes** for strings; template literals for interpolation and all HTML.
- Trailing commas in multi-line arrays/objects.
- Vertical alignment of `=` and `:` in related declaration groups is used throughout (`const name   = ...` / `const image  = ...`); preserve it within blocks you touch.
- Compact single-line bodies are acceptable for trivial guards and pairs: `if (p) p.reportingPct = pct;`, `{ donor.pct -= 1; hussein.pct += 1; }`.

## Idioms

- Modern vanilla JS: arrow functions for callbacks, destructuring (incl. default-valued options objects: `({ excludeDisqualified = false } = {})`), spread, optional chaining with `||` fallbacks (`member?.nickname || member?.name.split(" ")[0]`).
- Array pipelines (`map`/`filter`/`sort`/`reduce`/`forEach`) over loops; `for` loops only where mechanically needed (Fisher–Yates, animation frames).
- Copy before sorting — never sort a data global in place: `[...VOTES].sort((a, b) => b.pct - a.pct)`.
- Small lookup-object maps instead of `switch`/if-chains: `const trendMeta = { up: {...}, down: {...}, stable: {...} }`, then `trendMeta[key] || trendMeta.stable`.
- `Utils` methods must stay pure and domain-free (no data globals, no DOM). Mutation of data globals happens in `democracyApi` (shared) or scenario scripts (bespoke).

## DOM / rendering

- Render functions look up their target first and are safe no-ops when it's missing: `const body = document.querySelector(...); if (!body) return;`.
- Build markup as a template-literal string with `array.map(item => \`...\`).join("")` and assign `innerHTML` once — no incremental `createElement` for cards (the confetti canvas is the only exception).
- CSS classes follow BEM (`leaderboard__row`, `god-mode-card--locked`); state hooks use `data-*` attributes (`data-candidate`, `data-precinct`, `data-field`); decorative elements get `aria-hidden="true"`, meaningful ones get `aria-label`. Lists rendered as `<ul role="list">`.
- Conditional fragments inline via ternaries that default to an empty string: `${image ? `<img ... />` : ""}`.

## Use the `democracyApi` layer

- **Always reach for an existing `democracyApi` method before writing your own logic.** If `api/democracy-api.js` already exposes what you need, call it — never reimplement it inline:
  - Finding the leader → `democracyApi.getFrontrunner(opts)` / `democracyApi.getLeaderNickname()`, not an ad-hoc `[...VOTES].sort(...)` or `{leader}` substitution.
  - Vote trends → `votes.snapshotPcts()` + `votes.applyTrends(prevPcts)`, not manual `.trend` assignment.
  - Storyline standings → `votes.enforceStorylineConstraints()`, not hand-moving points.
  - Precinct reporting/leaders → `precincts.setReporting(map)` + `precincts.recomputeLeader(p)`, not direct field writes.
  - Bellwether leans → `bellwethers.applyLeanings()`.
  - Repainting the page → `democracyApi.render.all()` (or a specific `render.*` card method), never direct DOM writes to the cards or ticker from outside the API.
- Scenario scripts (`scripts/*.js`) and `script.js` may set scenario-specific fields (`p.status`, pundit predictions, `CALL_OF_NIGHT`, `APP_STATE.status`) directly, but anything `democracyApi` covers must go through it.
- If you find yourself writing the same data/DOM logic in a second scenario, move it into `democracyApi` instead of duplicating it — and update `api/README.md` to document the new member.
- Members prefixed `_` are internal — never call them from outside `democracyApi`.

## Domain invariants

- Vote percentages are **integers that sum to exactly 100**; produce them with `Utils.largestRemainderApportion(weights)` rather than ad-hoc rounding.
- Follow the snapshot/trend bracket when changing votes: `snapshotPcts()` before mutating, `applyTrends(prevPcts)` after.
- Compute weighted aggregates without intermediate rounding — sum fractions, round once at the end.
