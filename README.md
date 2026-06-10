# 🗳️ Employee of the Month — Live Results Center

A satirical, election-night-style **live results broadcast** — for the most
hotly contested race in the office: **Employee of the Month**.

Breaking-news ticker, a live broadcast clock, a candidate leaderboard, precinct
reporting, a bellwether desk, a pundit panel, and a Decision Desk "Call of the
Night" — all the theatre of a national election, applied to who refilled the
coffee. Then there's **God Mode**, where the results get... *adjusted*.

> Built as a self-contained front-end demo: **zero dependencies, no build
> step** — just static HTML, CSS, and vanilla JavaScript.

## ✨ Features

- **Breaking-news ticker** — rotating headlines that react to the current stage
  of the count, with `{leader}` tokens resolved to the live frontrunner.
- **Live leaderboard** — ranked candidates with leader-relative bars, ▲/▼/—
  trend arrows, disqualifications, and a 👑 for the winner.
- **Precincts reporting** — weighted overall reporting % plus per-desk progress.
- **Key Districts & Bellwether Desk** — per-precinct leaders, margins, CALLED /
  KEY BATTLE / PENDING statuses, and bellwether leanings.
- **Pundit Panel & Call of the Night** — analyst predictions and the Decision
  Desk's projection, all driven by the live data.
- **God Mode** 🎛️ — a sequence of escalating scenarios that rewrite the results
  in real time, from honest first returns to a *totally legitimate* landslide.
- **Confetti finale** — a self-contained canvas celebration for the winner.

## 🎛️ God Mode

A floating **⚡ GOD MODE** button opens a control panel of scenarios that unlock
**sequentially** — each one is `CLASSIFIED` until the previous has run. They
walk the night from a clean count through increasingly suspicious "updates" to
a triumphant projection. Watch the leaderboard, pundits, and Decision Desk
react at each stage. (Discovering exactly how the night unfolds is half the
fun — go press the button.)

## 🚀 Running locally

It's a static site with no build step, so either option works:

```bash
# Option 1 — just open the file
open index.html            # macOS  (or double-click it)

# Option 2 — serve it (recommended; mirrors production)
npx serve .                # then visit the printed localhost URL
# or:  python3 -m http.server 8000   →  http://localhost:8000
```

No installation, no dependencies, no `package.json`.

## 🌐 Deploying to Vercel

This is a plain static site, so Vercel needs **no build configuration**:

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework Preset: **Other** · Build Command: *(none)* · Output Directory:
   *(leave as the repo root)*.
4. **Deploy** — `index.html` is served from the root.

Or from the command line:

```bash
npm i -g vercel
vercel            # preview deploy
vercel --prod     # production deploy
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-vote-demo)

<!-- Replace `your-username/ai-vote-demo` above with your repo, and add the live
URL here once deployed. -->

## 🗂️ Project structure

```
.
├── index.html              # markup + script load order
├── styles.css              # all styling
├── script.js               # page bootstrap: clock, view switcher, God Mode UI
├── data/                   # data globals (loaded first)
│   ├── state.js            #   APP_STATE — drives all rendering
│   ├── team.js             #   candidates (TEAM)
│   ├── votes.js            #   VOTES
│   ├── precincts.js        #   PRECINCTS
│   ├── pundits.js          #   PUNDITS
│   ├── headlines.js        #   NEWS_HEADLINES_BY_STATUS
│   ├── call-of-the-night.js#   CALL_OF_NIGHT
│   └── god-mode.js         #   GOD_MODE_SCENARIOS
├── utils/
│   └── utils.js            # Utils — generic, domain-free helpers
├── api/
│   ├── democracy-api.js    # democracyApi — election data + DOM layer
│   └── README.md           # democracyApi API reference
└── scripts/                # God Mode scenarios (one file each)
```

## 🧩 Architecture

A simple, layered, global-script design (no modules/bundler), loaded in order:

**`data/*.js` → `utils/utils.js` → `lib/democracy-api.js` → `script.js` → `scripts/*.js`**

- **`data/`** — plain data globals; the single source of truth for runtime state.
- **`Utils`** ([`utils/utils.js`](utils/utils.js)) — generic, domain-free helpers
  (percentage apportionment, trend derivation, shuffle, time formatting).
- **`democracyApi`** ([`lib/democracy-api.js`](lib/democracy-api.js)) — the
  election **data + DOM layer**: derived reads, the shared mutations every
  scenario repeats, and all card/ticker rendering. See the
  **[API reference](lib/README.md)**.
- **`scripts/`** — each God Mode scenario mutates the data, then calls
  `democracyApi.render.all()`. Bespoke storyline beats live here; shared logic
  lives in the API.

## 🛠️ Tech

Vanilla **HTML + CSS + JavaScript**. No frameworks, no build tooling, no
dependencies. Works straight from `file://`.
