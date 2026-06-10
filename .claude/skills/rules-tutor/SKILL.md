---
name: rules-tutor
description: Clean up a file or directory's rule violations while teaching — step through each issue, explain why it's a problem and what good looks like, then apply the fix. Use when the user wants violations fixed with explanations, a guided/educational cleanup, or to learn why the rules exist.
argument-hint: <file-or-directory-path>
---

# 🎓 Rules tutor — fix the code and explain every step

Build on the `rules-check` skill: first find the violations the same way it does, then — instead of only reporting — fix them pass by pass, teaching as you go. The output should read like a senior engineer pairing with a junior: every change is shown, justified, and generalized into a principle they can reuse.

## 🔍 Phase 1 — review (same as rules-check)

1. Resolve the target from `$ARGUMENTS` (file or directory; if none given, ask).
2. Read every rule file in `.claude/rules/`, match their `paths` globs against the target files, and read `.claude/CLAUDE.md` for layering rules and domain invariants.
3. Read each target file in full and collect its violations. Don't list them all up front — a short count ("14 issues across 5 themes, let's work through them") is enough to set the stage.

## 🧑‍🏫 Phase 2 — fix in themed passes, teaching each one

Group the violations into themed passes and work through them one pass at a time, in this order (skip passes with no findings):

1. **Declarations & language level** — `var` → `const`/`let`, `function(){}` → arrows, `==` → `===`
2. **Naming** — placeholder/cryptic names → descriptive ones
3. **Idioms** — loops → array pipelines, in-place sorts of data globals, lookup maps, ad-hoc logic that `Utils` already provides
4. **Architecture** — inline reimplementations of `democracyApi` members, layer violations, domain invariants
5. **Formatting** — indentation, quotes, alignment, trailing commas
6. **Documentation** — file banner, JSDoc, comment quality (why-not-what)

For **each pass**, follow this rhythm:

- **Show the problem**: quote one or two representative offending snippets with their location (`file.js:42`).
- **Name the rule**: cite which rule file and bullet it violates.
- **Teach the why** — this is the heart of the skill. Explain the underlying engineering reason, not just "the rule says so". Generalize beyond this file. Examples of the expected depth:
  - *`var` vs `let`/`const`*: `var` is function-scoped and hoisted, so it leaks out of blocks and allows accidental redeclaration; `const` documents that a binding never changes (most bindings don't), and `let` flags the few that do — so a reader can spot mutation at a glance. Default to `const`, use `let` only when reassignment is required (loop counters, accumulators), and never `var`.
  - *Naming*: a name like `id1` or `gv` forces the reader to hold a mental lookup table — and a comment like `// michael` next to it is a crutch that rots when the code changes. A descriptive name (`MICHAEL_ID`, `getVote`) makes the comment unnecessary; delete the crutch comment when you rename. Constants that never change get `SCREAMING_SNAKE_CASE` to signal config-like fixedness.
  - *Reimplementing API methods*: an inline copy of `recomputeLeader` works today, but the moment the real one changes (a new tie-break rule, disqualification handling), the copy silently disagrees — one source of truth, in `democracyApi`, means one place to fix.
- **Show the fix**: state the concrete change ("`var arr = VOTES.sort(...)` becomes `const prevByPct = [...VOTES].sort(...)` — note the spread copy, sorting a data global in place reorders it for everyone downstream").
- **Apply it**: make the edits for the whole pass with the Edit tool, then give a one-line recap before moving to the next pass.

Keep the lessons proportionate: explain a concept in depth the **first** time it appears, then just reference it ("same `==` issue as before — fixed in 4 more places").

## ✅ Phase 3 — verify and recap

- Re-check the finished file against every applicable rule — the result should pass a `rules-check` review cleanly.
- **Behavior must not change.** These are style and structure fixes; confirm the logic is equivalent to what you started with (same outputs, same mutations, same render calls). If a fix would change behavior, stop and say so instead of applying it.
- If a sibling "good" reference file exists (e.g. cleaning `foo.bad.js` next to `foo.js`), do NOT copy from it — fix from the rules alone, then optionally diff against it at the end as the proof of convergence.
- Close with a short recap table: pass → issues fixed → the one-line principle to remember.
