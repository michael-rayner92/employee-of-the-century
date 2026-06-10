/* ============================================================
   Employee of the Month — Live Results Center
   Demo behavior. For now this only:
     1. Cycles the breaking-news headlines.
     2. Ticks the broadcast clock.
     3. Wires sidebar view buttons (active state only).
   Data injection hooks are stubbed at the bottom.
   ============================================================ */

/* ------------------------------------------------------------
   1. BREAKING NEWS HEADLINES
   Headlines live in data/headlines.js (loaded before this file
   in index.html) as NEWS_HEADLINES_BY_STATUS, keyed by status.
   renderHeadlines() swaps the active set when the status changes;
   scenario scripts call it after updating APP_STATE.status.
   ------------------------------------------------------------ */
const HEADLINE_INTERVAL_MS = 4500;

let tickerIndex     = 0;
let activeHeadlines = [];

/* Resolve {leader} to the current top vote-getter's nickname. */
function resolveHeadline(text) {
  const leaderEntry = [...VOTES].sort((a, b) => b.pct - a.pct)[0];
  const leaderNickname = (leaderEntry && leaderEntry.pct > 0
    ? TEAM.find(t => t.id === leaderEntry.teamId)?.nickname
    : null) || "the frontrunner";
  return text.replace(/{leader}/g, leaderNickname);
}

function paintHeadline(item, i) {
  item.textContent = resolveHeadline(activeHeadlines[i]);
  item.dataset.headlineIndex = String(i);
  // restart the entrance animation
  item.style.animation = "none";
  // force reflow so the animation can replay
  void item.offsetWidth;
  item.style.animation = "";
}

/* Swap the ticker to the set for the current status and restart it. */
function renderHeadlines() {
  const item = document.getElementById("news-ticker-item");
  if (!item) return;

  activeHeadlines = NEWS_HEADLINES_BY_STATUS[APP_STATE.status]
    || NEWS_HEADLINES_BY_STATUS.update1
    || NEWS_HEADLINES_BY_STATUS.pending;

  tickerIndex = 0;
  if (activeHeadlines.length) paintHeadline(item, tickerIndex);
}

function initNewsTicker() {
  const item = document.getElementById("news-ticker-item");
  if (!item) return;

  renderHeadlines(); // initial paint from the current status

  setInterval(() => {
    if (!activeHeadlines.length) return;
    tickerIndex = (tickerIndex + 1) % activeHeadlines.length;
    paintHeadline(item, tickerIndex);
  }, HEADLINE_INTERVAL_MS);
}

/* ------------------------------------------------------------
   2. BROADCAST CLOCK
   ------------------------------------------------------------ */
function initBroadcastClock() {
  const clock = document.getElementById("broadcast-clock");
  if (!clock) return;

  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    clock.textContent = `${hh}:${mm}:${ss}`;
    clock.setAttribute("datetime", now.toISOString());
  }

  tick();
  setInterval(tick, 1000);
}

/* ------------------------------------------------------------
   3. SIDEBAR VIEW SWITCHING
   For now this only toggles the active state. Hook your
   real view-rendering logic into onViewChange().
   ------------------------------------------------------------ */
function initViewSwitcher() {
  const buttons = document.querySelectorAll(".nav__option");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      onViewChange(btn.dataset.view);
    });
  });
}

/* ============================================================
   DATA INJECTION HOOKS  (stubbed — fill in later)
   ============================================================ */

/**
 * Called when a sidebar view is selected.
 * @param {string} viewId - e.g. "live-results", "coffee-index"
 */
function onViewChange(viewId) {
  // INSERTION POINT: render the dataset for `viewId` here.
  console.log(`[view] switched to: ${viewId}`);
}

/**
 * Adjusts VOTES in place so the standings respect two fixed storyline
 * constraints (the field still sums to exactly 100 — values are swapped):
 *   - Hussein Aldor (id 12) is always somewhere in the top 3.
 *   - Michael Rayner (id 19) never sits in the top 3.
 * Call after assigning fresh percentages but BEFORE deriving trends, so
 * the ▲/▼ arrows reflect the final ordering.
 *
 * NOTE: today this is only called from the early rounds (genesis +
 * votes-2). Keeping Michael out of the top 3 is an early-round storyline
 * beat — later scenarios are expected to let that change, so revisit the
 * Michael rule (step 2) when wiring up the remaining rounds.
 */
function enforceVoteConstraints() {
  const HUSSEIN_ID = 12;
  const MICHAEL_ID = 19;
  // Single-point transfers (not value swaps): the field is integer
  // percentages with frequent ties, and swapping equal values is a no-op
  // that can't break a boundary tie. Moving one point at a time keeps the
  // total at exactly 100 while guaranteeing strict separation.
  const ranked  = () => [...VOTES].sort((a, b) => b.pct - a.pct);
  const inTop3  = id => ranked().slice(0, 3).some(v => v.teamId === id);
  const hussein = VOTES.find(v => v.teamId === HUSSEIN_ID);
  const michael = VOTES.find(v => v.teamId === MICHAEL_ID);

  let guard = 0;
  while (guard++ < 5000 &&
         ((hussein && !inTop3(HUSSEIN_ID)) || (michael && inTop3(MICHAEL_ID)))) {
    // Lift Hussein into the top 3: take a point from the weakest current
    // top-3 occupant (never Hussein or Michael).
    if (hussein && !inTop3(HUSSEIN_ID)) {
      const top3  = ranked().slice(0, 3);
      const donor = [...top3].reverse().find(v => v.teamId !== HUSSEIN_ID && v.teamId !== MICHAEL_ID)
                 || top3.find(v => v.teamId !== HUSSEIN_ID);
      if (donor && donor.pct > 0) { donor.pct -= 1; hussein.pct += 1; }
    }
    // Drop Michael out of the top 3: shed a point onto the lowest-ranked
    // member (never Hussein or Michael), so the top of the board is undisturbed.
    if (michael && inTop3(MICHAEL_ID)) {
      const recipient = [...ranked()].reverse().find(v => v.teamId !== HUSSEIN_ID && v.teamId !== MICHAEL_ID);
      if (recipient && michael.pct > 0) { michael.pct -= 1; recipient.pct += 1; }
    }
  }
}

/**
 * Points every bellwether precinct at the current overall frontrunner.
 *
 * A bellwether's job is to forecast the WHOLE race, not just its own desk,
 * so its lean tracks the leaderboard leader (disqualified candidates are
 * never the lean). A precinct only signals once its own count is underway.
 *
 * Shared by all God Mode scripts so the Bellwether Desk always agrees with
 * the rest of the board — call it after vote percentages and precinct
 * reporting have been updated, before rendering.
 */
function applyBellwetherLeanings() {
  const frontrunner = [...VOTES]
    .filter(v => !v.disqualified)
    .sort((a, b) => b.pct - a.pct)[0];
  const leansId = (frontrunner && frontrunner.pct > 0) ? frontrunner.teamId : null;

  PRECINCTS.forEach(p => {
    if (!p.isBellwether) return;
    p.leaningCandidateId = (p.reportingPct > 0) ? leansId : null;
  });
}

/**
 * Renders the leaderboard from VOTES + TEAM globals.
 * Bar widths are relative to the leader (leader = full width).
 * Call with no arguments — reads VOTES and TEAM directly.
 */
function renderLeaderboard() {
  const list = document.getElementById("leaderboard");
  if (!list) return;

  if (APP_STATE.status === "pending") {
    list.innerHTML = `
      <li class="leaderboard__empty-state">
        <span class="leaderboard__empty-icon" aria-hidden="true">🗳️</span>
        <span class="leaderboard__empty-msg">Polls are open. Awaiting first results.</span>
      </li>`;
    return;
  }

  // Disqualified candidates always sink to the bottom, regardless of pct.
  const ranked = VOTES
    .map(v => ({ ...v, member: TEAM.find(t => t.id === v.teamId) }))
    .filter(v => v.member)
    .sort((a, b) => {
      if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
      return b.pct - a.pct;
    });

  const leaderPct = ranked.find(v => !v.disqualified)?.pct || 1;
  const isWon     = APP_STATE.status === "completed";

  const trendMeta = {
    up:     { symbol: "▲", cls: "leaderboard__trend--up" },
    down:   { symbol: "▼", cls: "leaderboard__trend--down" },
    stable: { symbol: "—", cls: "leaderboard__trend--stable" },
  };

  list.innerHTML = ranked.map((entry, i) => {
    // Disqualified row: struck-out name, empty red bar, "Disqualified" in
    // place of the percentage.
    if (entry.disqualified) {
      return `
        <li class="leaderboard__row leaderboard__row--dq" data-candidate="${entry.teamId}" data-pct="0">
          <span class="leaderboard__rank">${i + 1}</span>
          <span class="leaderboard__name" data-field="name">${entry.member.name}</span>
          <span class="leaderboard__bar-wrap leaderboard__bar-wrap--dq" aria-hidden="true">
            <span class="leaderboard__dq-label">DISQUALIFIED</span>
          </span>
          <span class="leaderboard__pct" data-field="pct">0%</span>
          <span class="leaderboard__trend leaderboard__trend--down" aria-label="disqualified">✕</span>
        </li>`;
    }

    const barWidth = ((entry.pct / leaderPct) * 100).toFixed(1);
    const trend    = trendMeta[entry.trend] || trendMeta.stable;
    // Crown the winner (top of the board) once the race is completed.
    const crown    = (isWon && i === 0)
      ? `<span class="leaderboard__crown" aria-label="winner">👑</span> `
      : "";
    return `
      <li class="leaderboard__row${isWon && i === 0 ? " leaderboard__row--winner" : ""}" data-candidate="${entry.teamId}" data-pct="${entry.pct}">
        <span class="leaderboard__rank">${i + 1}</span>
        <span class="leaderboard__name" data-field="name">${crown}${entry.member.name}</span>
        <span class="leaderboard__bar-wrap" aria-hidden="true">
          <span class="leaderboard__bar" data-field="bar" style="width: ${barWidth}%; background: linear-gradient(90deg, ${entry.member.color}, ${entry.member.color}99);"></span>
        </span>
        <span class="leaderboard__pct" data-field="pct">${entry.pct}%</span>
        <span class="leaderboard__trend ${trend.cls}" aria-label="trend ${entry.trend}">${trend.symbol}</span>
      </li>`;
  }).join("");
}

/**
 * Renders the #card-call-of-night card from the CALL_OF_NIGHT global.
 * When projectionAvailable is false, shows the expert holding-pattern.
 * When true, shows the projected winner (resolved from TEAM by candidateId).
 */
function renderCallOfNight() {
  const body   = document.querySelector("#card-call-of-night .card__body");
  const badge  = document.querySelector("#card-call-of-night .card__badge");
  if (!body) return;

  if (!CALL_OF_NIGHT.projectionAvailable) {
    const { teamId, title, quotes } = CALL_OF_NIGHT.expert;
    const member = TEAM.find(t => t.id === teamId);
    const name   = member?.name  || "Election Expert";
    const image  = member?.image || "";

    const leaderEntry    = [...VOTES].sort((a, b) => b.pct - a.pct)[0];
    const leaderNickname = (leaderEntry ? TEAM.find(t => t.id === leaderEntry.teamId)?.nickname : null) || "the frontrunner";

    const badgeByStatus = { pending: "STANDING BY", update1: "TOO EARLY", update2: "TOO EARLY", update3: "LEANING", update4: "LEANING" };
    const rawQuote    = quotes[APP_STATE.status] || quotes.update1 || quotes.pending;
    const displayQuote = rawQuote.replace(/{leader}/g, leaderNickname);

    badge.textContent = badgeByStatus[APP_STATE.status] || "TOO EARLY";
    badge.classList.remove("card__badge--accent");
    badge.classList.add("card__badge--muted");
    body.innerHTML = `
      <div class="call-expert">
        ${image ? `<img class="call-expert__avatar" src="${image}" alt="${name}" />` : ""}
        <div class="call-expert__info">
          <span class="call-expert__title">${title}</span>
          <span class="call-expert__name">${name}</span>
        </div>
      </div>
      <blockquote class="call-expert__quote">&ldquo;${displayQuote}&rdquo;</blockquote>`;
    return;
  }

  // Resolve candidate from TEAM if an id is provided
  const p = CALL_OF_NIGHT.projection;
  const member = TEAM.find(t => t.id === p.candidateId);
  const name   = member?.name  || p.candidateName;
  const image  = member?.image || "";

  badge.textContent = "PROJECTED";
  badge.classList.add("card__badge--accent");
  badge.classList.remove("card__badge--muted");
  body.innerHTML = `
    <div class="call-winner">
      ${image ? `<img class="call-winner__avatar" src="${image}" alt="${name}" />` : ""}
      <div class="call-winner__info">
        <span class="call-winner__caption">${p.candidateCaptionLine1}</span>
        <span class="call-winner__name">${name}</span>
        ${p.candidateCaptionLine2 ? `<span class="call-winner__sub">${p.candidateCaptionLine2}</span>` : ""}
      </div>
    </div>`;
}

/**
 * Renders the #card-precincts card.
 * Shows the overall weighted reporting % and a per-precinct progress bar.
 * Eligible voter counts are derived from PRECINCTS[].memberIds.length.
 */
function renderPrecincts() {
  const body = document.querySelector("#card-precincts .card__body");
  if (!body) return;

  if (APP_STATE.status === "pending") {
    const badge = document.querySelector("[data-metric='precincts-reporting']");
    if (badge) { badge.textContent = "0% reporting"; badge.dataset.value = "0"; }
    body.innerHTML = `<p class="card-pre-init">Precincts are standing by. No votes have been counted yet.</p>`;
    return;
  }

  const totalVoters    = PRECINCTS.reduce((s, p) => s + p.memberIds.length, 0);
  // No intermediate rounding — sum fractional reported voters then round once at the end
  const reportedVoters = PRECINCTS.reduce((s, p) => s + p.memberIds.length * p.reportingPct / 100, 0);
  const overallPct     = Math.round(reportedVoters / totalVoters * 100);

  // Keep the leaderboard header badge in sync
  const badge = document.querySelector("[data-metric='precincts-reporting']");
  if (badge) {
    badge.textContent = `${overallPct}% reporting`;
    badge.dataset.value = String(overallPct);
    // Turn the badge green once we are closing in on a complete count.
    badge.classList.toggle("card__badge--reporting-high", overallPct >= 85);
  }

  const bars = PRECINCTS.map(p => `
    <div class="precinct-row" data-precinct="${p.id}">
      <span class="precinct-row__name">${p.name}</span>
      <span class="precinct-row__bar-wrap" aria-hidden="true">
        <span class="precinct-row__bar" style="width: ${p.reportingPct}%;"></span>
      </span>
      <span class="precinct-row__pct">${p.reportingPct}%</span>
    </div>`).join("");

  body.innerHTML = `
    <div class="stat">
      <span class="stat__value" data-field="value">${overallPct}%</span>
      <span class="stat__label">of eligible voters counted</span>
    </div>
    ${bars}`;
}

/**
 * Renders the #card-key-districts card.
 * Shows each precinct's status badge, leader, margin, and reporting %.
 */
function renderKeyDistricts() {
  const body = document.querySelector("#card-key-districts .card__body");
  if (!body) return;

  if (APP_STATE.status === "pending") {
    body.innerHTML = `<p class="card-pre-init">Districts are standing by. Polls have opened across all locations.</p>`;
    return;
  }

  const statusClass = { CALLED: "status--called", BATTLEGROUND: "status--battleground", PENDING: "status--pending" };
  const statusLabel = { CALLED: "CALLED", BATTLEGROUND: "KEY BATTLE", PENDING: "PENDING" };

  const rows = PRECINCTS.map(p => {
    const leader = p.leadingCandidateId ? TEAM.find(t => t.id === p.leadingCandidateId) : null;
    const leaderText = leader
      ? `${leader.nickname || leader.name.split(" ")[0]} +${p.leadMarginPct}%`
      : "—";
    return `
      <li class="district-row" data-precinct="${p.id}">
        <span class="district-row__status status-badge ${statusClass[p.status] || ""}">${statusLabel[p.status] || p.status}</span>
        <span class="district-row__name">${p.name}</span>
        <span class="district-row__leader">${leaderText}</span>
        <span class="district-row__reporting">${p.reportingPct}%</span>
      </li>`;
  }).join("");

  body.innerHTML = `<ul class="district-list" role="list">${rows}</ul>`;
}

/**
 * Renders the #card-bellwether-desk card.
 * Only shows precincts where isBellwether is true.
 * Adds a summary verdict line at the bottom.
 */
function renderBellwetherDesk() {
  const body = document.querySelector("#card-bellwether-desk .card__body");
  if (!body) return;

  if (APP_STATE.status === "pending") {
    body.innerHTML = `<p class="card-pre-init">Bellwethers are on watch. First signals expected once votes begin to roll in.</p>`;
    return;
  }

  const bellwethers = PRECINCTS.filter(p => p.isBellwether);

  const rows = bellwethers.map(p => {
    const leaningMember = p.leaningCandidateId ? TEAM.find(t => t.id === p.leaningCandidateId) : null;
    const leaning = leaningMember
      ? (leaningMember.nickname || leaningMember.name.split(" ")[0])
      : "Too early";
    return `
      <li class="bellwether-row" data-precinct="${p.id}">
        <span class="bellwether-row__name">${p.name}</span>
        <span class="bellwether-row__accuracy">${p.bellwetherAccuracy} correct</span>
        <span class="bellwether-row__lean ${p.leaningCandidateId ? "bellwether-row__lean--set" : "bellwether-row__lean--early"}">${leaning}</span>
      </li>`;
  }).join("");

  // Summary: how many bellwethers lean toward the same candidate
  const leanCounts = {};
  bellwethers.filter(p => p.leaningCandidateId).forEach(p => {
    leanCounts[p.leaningCandidateId] = (leanCounts[p.leaningCandidateId] || 0) + 1;
  });
  const topLeanId   = Object.entries(leanCounts).sort((a, b) => b[1] - a[1])[0];
  const topMember   = topLeanId ? TEAM.find(t => t.id === Number(topLeanId[0])) : null;
  const verdictText = topMember
    ? `${topLeanId[1]} of ${bellwethers.length} bellwethers lean ${topMember.nickname || topMember.name.split(" ")[0]}`
    : "Bellwethers not yet leaning";

  body.innerHTML = `
    <ul class="bellwether-list" role="list">${rows}</ul>
    <p class="bellwether-verdict">${verdictText}</p>`;
}

/**
 * Renders the #card-pundit-panel card from the PUNDITS global.
 * Avatars are resolved from TEAM via teamId.
 * Predictions are resolved from TEAM via predictedWinnerId.
 */
function renderPunditPanel() {
  const body = document.querySelector("#card-pundit-panel .card__body");
  if (!body) return;

  const confidenceLabel = { high: "confident", medium: "leaning", low: "undecided" };
  const confidenceClass = { high: "pundit__confidence--high", medium: "pundit__confidence--medium", low: "pundit__confidence--low" };

  const leaderEntry    = [...VOTES].sort((a, b) => b.pct - a.pct)[0];
  const leaderNickname = (leaderEntry ? TEAM.find(t => t.id === leaderEntry.teamId)?.nickname : null) || "the frontrunner";

  const items = PUNDITS.map(p => {
    const member    = TEAM.find(t => t.id === p.teamId);

    // Arrested analyst: the panel shows a redacted "detained" notice instead
    // of their commentary.
    if (p.arrested) {
      const mug = member?.image
        ? `<img class="pundit__avatar pundit__avatar--arrested" src="${member.image}" alt="${p.name}" />`
        : `<span class="pundit__avatar pundit__avatar--placeholder"></span>`;
      return `
        <li class="pundit pundit--arrested" data-pundit="${p.id}">
          <div class="pundit__head">
            ${mug}
            <div class="pundit__meta">
              <span class="pundit__name">${p.name}</span>
              <span class="pundit__title">${p.title}</span>
            </div>
            <span class="pundit__confidence pundit__confidence--arrested">DETAINED</span>
          </div>
          <p class="pundit__arrest-notice">
            <span class="pundit__arrest-icon" aria-hidden="true">🚨</span>
            UNDER ARREST FOR TREASON
          </p>
        </li>`;
    }

    const predicted = p.predictedWinnerId ? TEAM.find(t => t.id === p.predictedWinnerId) : null;
    const avatar    = member?.image ? `<img class="pundit__avatar" src="${member.image}" alt="${p.name}" />` : `<span class="pundit__avatar pundit__avatar--placeholder"></span>`;
    const winnerNickname = predicted?.nickname || predicted?.name.split(" ")[0] || "";
    const isPreInit  = APP_STATE.status === "pending";
    const callText   = isPreInit ? "—" : (predicted ? winnerNickname : "No call");
    const rawQuote   = p.quotes[APP_STATE.status] || p.quotes.update1 || p.quotes.pending;
    const displayQuote = rawQuote
      .replace(/{winner}/g, winnerNickname)
      .replace(/{leader}/g, leaderNickname);

    return `
      <li class="pundit" data-pundit="${p.id}">
        <div class="pundit__head">
          ${avatar}
          <div class="pundit__meta">
            <span class="pundit__name">${p.name}</span>
            <span class="pundit__title">${p.title}</span>
          </div>
          <span class="pundit__confidence ${confidenceClass[p.confidence] || ""}">${callText}</span>
        </div>
        <p class="pundit__quote">&ldquo;${displayQuote}&rdquo;</p>
      </li>`;
  }).join("");

  body.innerHTML = `<ul class="pundit-list" role="list">${items}</ul>`;
}

/* ------------------------------------------------------------
   GOD MODE
   ------------------------------------------------------------ */
let godModeActivatedCount = 0;

function initGodMode() {
  const trigger = document.getElementById("god-mode-trigger");
  const overlay = document.getElementById("god-mode-overlay");
  const closeBtn = document.getElementById("god-mode-close");
  if (!trigger || !overlay) return;

  trigger.addEventListener("click", () => {
    renderGodModeScenarios();
    overlay.removeAttribute("hidden");
  });

  closeBtn.addEventListener("click", () => {
    overlay.setAttribute("hidden", "");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.setAttribute("hidden", "");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hasAttribute("hidden")) {
      overlay.setAttribute("hidden", "");
    }
  });
}

function renderGodModeScenarios() {
  const body = document.getElementById("god-mode-body");
  if (!body) return;

  const cards = GOD_MODE_SCENARIOS.map((s, i) => {
    const isActivated = i < godModeActivatedCount;
    const isAvailable = i === godModeActivatedCount;
    const isLocked    = i > godModeActivatedCount;

    const stateClass = isActivated ? "god-mode-card--activated"
                     : isAvailable ? "god-mode-card--available"
                     : "god-mode-card--locked";

    const emoji       = isLocked ? "🔒" : s.emoji;
    const description = isLocked ? "CLASSIFIED" : s.description;
    const btnLabel    = isActivated ? "✓ Done" : isAvailable ? s.actionLabel : "Locked";

    return `
      <div class="god-mode-card ${stateClass}" data-scenario="${s.id}">
        <span class="god-mode-card__emoji" aria-hidden="true">${emoji}</span>
        <h3 class="god-mode-card__name">${s.name}</h3>
        <p class="god-mode-card__desc">${description}</p>
        <button type="button" class="god-mode-card__btn"
                data-action="${s.id}"
                ${!isAvailable ? "disabled" : ""}>
          ${btnLabel}
        </button>
      </div>`;
  }).join("");

  body.innerHTML = `<div class="god-mode-cards">${cards}</div>`;

  body.querySelectorAll(".god-mode-card__btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      onGodModeAction(Number(btn.dataset.action));
    });
  });
}

const LOADER_MESSAGES = [
  "Accessing classified archives...",
  "Bribing the bellwether desk intern...",
  "Cross-referencing donut consumption logs...",
  "Suppressing inconvenient exit polls...",
  "Consulting the oracle (she is in a meeting, please hold)...",
  "Recalibrating the bellwether algorithm...",
  "Overriding democratic processes... please wait...",
  "Applying narrative arc to raw data...",
  "Checking whether the 502nd can actually count...",
  "Encrypting results from IT department...",
  "Adjusting for alphabetical voter bias...",
  "Reticulating splines...",
  "Hiding the evidence...",
  "Persuading the Decision Desk to look the other way...",
  "Converting spreadsheets to vibes...",
  "Calibrating the drama-to-data ratio...",
];

function showScenarioLoader(scenarioName, callback) {
  const overlay = document.getElementById("loading-overlay");
  const nameEl  = document.getElementById("loading-scenario-name");
  const msgEl   = document.getElementById("loading-message");
  const barFill = document.getElementById("loading-bar-fill");

  const shuffled = [...LOADER_MESSAGES].sort(() => Math.random() - 0.5);
  const messages = shuffled.slice(0, 3);

  nameEl.textContent = scenarioName;
  msgEl.textContent  = messages[0];
  barFill.style.transition = "none";
  barFill.style.width = "0%";
  overlay.removeAttribute("hidden");

  const TOTAL_MS    = 4000;
  const MSG_INTERVAL = Math.floor(TOTAL_MS / messages.length);
  let msgIndex = 0;

  const msgTimer = setInterval(() => {
    msgIndex++;
    if (msgIndex < messages.length) {
      msgEl.textContent = messages[msgIndex];
    }
  }, MSG_INTERVAL);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    barFill.style.transition = `width ${TOTAL_MS}ms linear`;
    barFill.style.width = "100%";
  }));

  setTimeout(() => {
    clearInterval(msgTimer);
    msgEl.textContent = "Complete. Please act surprised.";
    setTimeout(() => {
      overlay.setAttribute("hidden", "");
      callback();
    }, 500);
  }, TOTAL_MS);
}

/**
 * Fires a celebratory confetti burst over the whole viewport for a few
 * seconds. Self-contained canvas animation — no libraries, file:// safe.
 */
function launchConfetti() {
  const existing = document.getElementById("confetti-canvas");
  if (existing) existing.remove();

  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);

  const ctx    = canvas.getContext("2d");
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#f5b62f", "#e11d2a", "#3b82f6", "#22c55e", "#a855f7", "#fb923c", "#ec4899"];
  const pieces = Array.from({ length: 240 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    vy: 2 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 2,
    sway: Math.random() * Math.PI * 2,
  }));

  const DURATION = 5000;
  const start    = performance.now();

  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fade = elapsed > DURATION - 1200 ? Math.max(0, (DURATION - elapsed) / 1200) : 1;
    pieces.forEach(p => {
      p.sway += 0.05;
      p.x += p.vx + Math.sin(p.sway) * 0.8;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < DURATION) {
      requestAnimationFrame(frame);
    } else {
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}

function onGodModeAction(scenarioId) {
  document.getElementById("god-mode-overlay").setAttribute("hidden", "");
  const scenario = GOD_MODE_SCENARIOS.find(s => s.id === scenarioId);
  const name = scenario ? scenario.name : `Scenario ${scenarioId}`;
  showScenarioLoader(name, () => {
    console.log(`[god-mode] activated scenario ${scenarioId}`);
    if (scenarioId === 1) runGenesis();
    if (scenarioId === 2) runVotes2();
    if (scenarioId === 3) runThumbOnScale();
    if (scenarioId === 4) runOperationBirthdayCake();
    if (scenarioId === 5) runOperationEpicFreedom();
    godModeActivatedCount = Math.max(godModeActivatedCount, scenarioId);
    renderGodModeScenarios();
  });
}

/* ------------------------------------------------------------
   BOOT
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initNewsTicker();
  initBroadcastClock();
  initViewSwitcher();
  initGodMode();
  renderLeaderboard();
  renderCallOfNight();
  renderPrecincts();
  renderKeyDistricts();
  renderBellwetherDesk();
  renderPunditPanel();
});
