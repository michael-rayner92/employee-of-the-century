# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A satirical election-night "live results broadcast" for an office Employee of the Month vote. Pure static front-end: **zero dependencies, no package.json, no build step, no tests, no linter** — plain HTML, CSS, and vanilla JavaScript that works straight from `file://`.

## Running

```bash
open index.html              # simplest
npx serve .                  # or serve it (mirrors production)
python3 -m http.server 8000  # alternative
```

Deploys to Vercel as a plain static site (no build command, repo root as output).

## Architecture

Global-script design — no modules, no bundler. Everything is a global, and **script load order in `index.html` is the dependency graph**:

```
data/*.js  →  utils/utils.js  →  lib/democracy-api.js  →  script.js  →  scripts/*.js
```

Layering rules (enforced by convention — keep them intact):

- **`data/*.js`** — plain data globals, the single source of truth: `APP_STATE`, `TEAM`, `VOTES`, `PRECINCTS`, `PUNDITS`, `NEWS_HEADLINES_BY_STATUS`, `CALL_OF_NIGHT`, `GOD_MODE_SCENARIOS`.
- **`Utils`** (`utils/utils.js`) — pure, domain-free helpers only. Must know nothing about the data globals or the DOM. Anything domain- or DOM-aware belongs in `democracyApi` instead.
- **`democracyApi`** (`lib/democracy-api.js`) — the election data + DOM layer: derived reads (`getFrontrunner`, `getLeaderNickname`), shared mutations (`votes.*`, `precincts.*`, `bellwethers.*`), and all rendering (`headlines.*`, `render.*`, `effects.*`). Members prefixed `_` are internal. `lib/README.md` is a hand-maintained summary of this module's JSDoc — **update it whenever the API changes**.
- **`script.js`** — page bootstrap only: broadcast clock, sidebar view switcher, God Mode dialog + scenario dispatch (`onGodModeAction` maps scenario id → `run*()` function).
- **`scripts/*.js`** — one God Mode scenario per file, each exposing a single `run*()` function. Bespoke storyline beats (pundit quotes, projection copy, status thresholds) stay inline in the scenario; logic repeated across scenarios belongs in `democracyApi`.

### State machine

`APP_STATE.status` drives all rendering: `"pending"` → `"update1"` (Genesis) → `"update2"` → `"update3"` → `"update4"` → `"completed"`. Each God Mode scenario sets the next status. Scenarios unlock sequentially in the UI (`godModeActivatedCount` in `script.js`); headlines in `data/headlines.js` are keyed by status, with `{leader}` tokens resolved to the live frontrunner.

### Scenario script pattern

Every scenario follows the same shape (see `lib/README.md` "Typical usage"):

1. Snapshot percentages: `const prevPcts = democracyApi.votes.snapshotPcts()` — **before** mutating.
2. Reassign `VOTES[i].pct` — percentages **must sum to exactly 100**; use `Utils.largestRemainderApportion(weights)` to guarantee this.
3. Early rounds only: `democracyApi.votes.enforceStorylineConstraints()` (keeps Hussein Aldor, id 12, in the top 3 and Michael Rayner, id 19, out of it — later scenarios deliberately skip this).
4. `democracyApi.votes.applyTrends(prevPcts)` to derive the ▲/▼/— arrows.
5. `democracyApi.precincts.setReporting({...})`, then `recomputeLeader(p)` per precinct and set scenario-specific `p.status` (`"CALLED"` / `"BATTLEGROUND"` / `"PENDING"`).
6. Bespoke beats (pundits, Call of the Night), set `APP_STATE.status`.
7. `democracyApi.bellwethers.applyLeanings()`, then `democracyApi.render.all()`.

To add a scenario: new file in `scripts/`, a `<script>` tag in `index.html`, an entry in `data/god-mode.js`, and a dispatch line in `onGodModeAction` in `script.js`.
