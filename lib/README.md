# `democracyApi` — API reference

The election **data + DOM layer**. A single global object that the scenario
scripts (`scripts/*.js`) and the page bootstrap (`script.js`) talk to instead
of poking the data globals or the DOM directly.

> **Source of truth:** [`lib/democracy-api.js`](./democracy-api.js). This file
> is a hand-maintained summary of the JSDoc in that module — update it when the
> API changes.

## Contents

- [Overview](#overview)
- [Typical usage](#typical-usage)
- [Derived reads](#derived-reads)
- [`votes` — vote data](#votes--vote-data)
- [`precincts` — precinct data](#precincts--precinct-data)
- [`bellwethers` — bellwether data](#bellwethers--bellwether-data)
- [`headlines` — breaking-news ticker](#headlines--breaking-news-ticker)
- [`render` — card rendering](#render--card-rendering)
- [`effects` — visual effects](#effects--visual-effects)

## Overview

`democracyApi` owns two things:

- **DATA** — derived reads and the shared mutations every scenario repeats
  (storyline constraints, trends, precinct leaders, bellwether leanings).
- **RENDER** — turning that data into the page (the breaking-news ticker, every
  results card, the confetti finale).

Bespoke, one-off storyline beats (which pundit calls whom, the exact projection
copy, scenario-specific status thresholds) stay in the individual scenario
scripts — this layer only holds what is shared.

It reads/writes the data globals defined in `data/*.js`: `VOTES`, `TEAM`,
`PRECINCTS`, `PUNDITS`, `CALL_OF_NIGHT`, `APP_STATE`,
`NEWS_HEADLINES_BY_STATUS`. Generic, domain-free helpers live in `Utils`
([`utils/utils.js`](../utils/utils.js)).

**Load order** (see `index.html`): data globals → `utils/utils.js` →
`lib/democracy-api.js` → `script.js` → `scripts/*.js`.

## Typical usage

A scenario script follows the same shape: mutate the data, then render. The
snapshot/trend pair brackets the vote reassignment so the ▲/▼ arrows reflect
the change.

```js
function runMyScenario() {
  // 1. Reassign vote percentages (must still sum to 100).
  const prevPcts = democracyApi.votes.snapshotPcts();   // capture BEFORE
  VOTES.forEach((v, i) => { v.pct = newPcts[i]; });
  democracyApi.votes.enforceStorylineConstraints();     // optional (early rounds)
  democracyApi.votes.applyTrends(prevPcts);             // derive ▲/▼/—

  // 2. Update precinct reporting + recompute each leader.
  democracyApi.precincts.setReporting({ "main-office": 90, "502nd": 45, "remote": 15 });
  PRECINCTS.forEach(p => {
    democracyApi.precincts.recomputeLeader(p);
    p.status = /* scenario-specific threshold rules */ "PENDING";
  });

  // 3. Bespoke storyline beats (pundits, projection copy) stay inline here.

  APP_STATE.status = "update2";

  // 4. Sync bellwethers to the new leader, then render everything.
  democracyApi.bellwethers.applyLeanings();
  democracyApi.render.all();
}
```

---

## Derived reads

### `democracyApi.getFrontrunner(opts?)`

The current top vote-getter.

| Param | Type | Description |
|-------|------|-------------|
| `opts.excludeDisqualified` | `boolean` | When `true`, ignores disqualified candidates. Default `false`. |

**Returns** `object \| null` — the `VOTES` entry, or `null` if there are none.

### `democracyApi.getLeaderNickname()`

Display nickname of the current leader, for `{leader}` substitutions in
headlines and quotes. Falls back to `"the frontrunner"` before anyone has real
votes (i.e. the leader's `pct` is 0).

**Returns** `string`.

---

## `votes` — vote data

### `democracyApi.votes.snapshotPcts()`

Snapshot the current percentages. Capture this **before** reassigning `pct`
values so trends can be derived against it afterwards.

**Returns** `number[]` — aligned to `VOTES`.

### `democracyApi.votes.applyTrends(prevPcts)`

Sets each vote's `.trend` (`"up"` / `"down"` / `"stable"`) by comparing its
current `pct` against a snapshot. Disqualified candidates always read as
`"down"`.

| Param | Type | Description |
|-------|------|-------------|
| `prevPcts` | `number[]` | From `snapshotPcts()`, aligned to `VOTES`. |

### `democracyApi.votes.enforceStorylineConstraints()`

Adjusts `VOTES` in place so the standings respect two fixed storyline
constraints (the field still sums to exactly 100 — points are moved):

- Hussein Aldor (id 12) is always somewhere in the top 3.
- Michael Rayner (id 19) never sits in the top 3.

Call **after** assigning fresh percentages but **before** deriving trends.

> **Note:** keeping Michael out of the top 3 is an early-round beat (genesis +
> votes-2); later scenarios deliberately skip this call.

---

## `precincts` — precinct data

### `democracyApi.precincts.setReporting(map)`

Assigns reporting percentages from an `{ id: pct }` map. Precincts not present
in the map are left untouched.

| Param | Type | Description |
|-------|------|-------------|
| `map` | `Record<string, number>` | Precinct id → reporting percentage. |

### `democracyApi.precincts.recomputeLeader(precinct)`

Recomputes a precinct's `leadingCandidateId` and `leadMarginPct` from its
members' current votes (disqualified candidates are ignored). A precinct that
is not yet reporting (`reportingPct` falsy) has no leader. Call **after**
reporting percentages and votes are set.

| Param | Type | Description |
|-------|------|-------------|
| `precinct` | `object` | A `PRECINCTS` entry. |

**Returns** the same `precinct`, mutated.

---

## `bellwethers` — bellwether data

### `democracyApi.bellwethers.applyLeanings()`

Points every bellwether precinct at the current overall frontrunner. A
bellwether forecasts the *whole* race, so its lean tracks the leaderboard
leader (disqualified candidates are never the lean), and a precinct only
signals once its own count is underway. Call after votes and precinct reporting
are updated, before rendering.

---

## `headlines` — breaking-news ticker

Headlines live in `data/headlines.js` as `NEWS_HEADLINES_BY_STATUS`, keyed by
status. `{leader}` tokens are resolved via `getLeaderNickname()`.

### `democracyApi.headlines.init()`

Initial paint + start the rotation timer. Called once on boot.

### `democracyApi.headlines.render()`

Swap the ticker to the set for the current `APP_STATE.status` and restart it.
Scenario scripts call this after updating the status (it is also part of
`render.all()`).

> Members prefixed with `_` (`_resolve`, `_paint`, `_index`, `_active`,
> `_intervalMs`) are internal to the ticker and not part of the public API.

---

## `render` — card rendering

Each method reads current state and writes a card's DOM. All are safe no-ops if
their target element is missing.

### `democracyApi.render.all()`

Re-render the ticker and every results card from current state. This is the
one-call convenience used at the end of every scenario. Equivalent to calling
`headlines.render()` followed by the six card renderers below.

### `democracyApi.render.leaderboard()`

Renders the leaderboard from `VOTES` + `TEAM`. Bar widths are relative to the
leader (leader = full width). Disqualified candidates sink to the bottom; the
winner is crowned once `APP_STATE.status === "completed"`.

### `democracyApi.render.callOfNight()`

Renders the `#card-call-of-night` card from `CALL_OF_NIGHT`.
`projectionAvailable === false` shows the expert holding-pattern;
`true` shows the projected winner (resolved from `TEAM` by `candidateId`).

### `democracyApi.render.precincts()`

Renders the `#card-precincts` card: overall weighted reporting % and a
per-precinct progress bar. Eligible voters = `memberIds.length`. Also keeps the
leaderboard header badge (`[data-metric='precincts-reporting']`) in sync.

### `democracyApi.render.keyDistricts()`

Renders the `#card-key-districts` card: each precinct's status badge, leader,
margin and reporting %.

### `democracyApi.render.bellwetherDesk()`

Renders the `#card-bellwether-desk` card (only `isBellwether` precincts) plus a
summary verdict line counting how many bellwethers lean the same way.

### `democracyApi.render.punditPanel()`

Renders the `#card-pundit-panel` card from `PUNDITS`. Avatars and predictions
are resolved from `TEAM`; arrested analysts show a redacted "detained" notice.

---

## `effects` — visual effects

### `democracyApi.effects.confetti()`

Fires a celebratory confetti burst over the whole viewport for a few seconds.
Self-contained canvas animation — no libraries, `file://` safe. Used by the
finale scenario.
