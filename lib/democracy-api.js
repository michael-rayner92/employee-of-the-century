/* ============================================================
   democracyApi — the election data + DOM layer.

   A single object the scenario scripts (scripts/*.js) and the page
   bootstrap (script.js) talk to instead of poking the data globals
   (VOTES, TEAM, PRECINCTS, PUNDITS, CALL_OF_NIGHT, APP_STATE) and the
   DOM directly. It owns two things:

     • DATA   — derived reads and the shared mutations every scenario
                repeats (storyline constraints, trends, precinct leaders,
                bellwether leanings).
     • RENDER — turning that data into the page (the breaking-news
                ticker, every results card, the confetti finale).

   Bespoke, one-off storyline beats (which pundit calls whom, the exact
   projection copy, scenario-specific status thresholds) stay in the
   individual scenario scripts — this layer only holds what is shared.

   Generic, domain-free helpers live in Utils (utils/utils.js). This file
   loads after Utils and the data globals, before script.js + scenarios.
   ============================================================ */
const democracyApi = {
  /* ----------------------------------------------------------
     DERIVED READS
     ---------------------------------------------------------- */

  /**
   * The current top vote-getter.
   * @param {{excludeDisqualified?: boolean}} [opts]
   * @returns {object|null} the VOTES entry, or null if there are none
   */
  getFrontrunner({ excludeDisqualified = false } = {}) {
    const pool = excludeDisqualified ? VOTES.filter(v => !v.disqualified) : VOTES;
    return [...pool].sort((a, b) => b.pct - a.pct)[0] || null;
  },

  /**
   * Display nickname of the current leader, for {leader} substitutions.
   * Falls back to "the frontrunner" before anyone has real votes.
   * @returns {string}
   */
  getLeaderNickname() {
    const leader = democracyApi.getFrontrunner();
    const nickname = (leader && leader.pct > 0)
      ? TEAM.find(t => t.id === leader.teamId)?.nickname
      : null;
    return nickname || "the frontrunner";
  },

  /* ----------------------------------------------------------
     VOTES (data)
     ---------------------------------------------------------- */
  votes: {
    /** Snapshot current percentages — capture this BEFORE reassigning
     *  pcts so trends can be derived against it afterwards. */
    snapshotPcts() {
      return VOTES.map(v => v.pct);
    },

    /**
     * Sets each vote's .trend by comparing its current pct against a
     * snapshot. Disqualified candidates always read as "down".
     * @param {number[]} prevPcts - from snapshotPcts(), aligned to VOTES
     */
    applyTrends(prevPcts) {
      VOTES.forEach((v, i) => {
        v.trend = v.disqualified ? "down" : Utils.deriveTrend(v.pct, prevPcts[i]);
      });
    },

    /**
     * Adjusts VOTES in place so the standings respect two fixed storyline
     * constraints (the field still sums to exactly 100 — points are moved):
     *   - Hussein Aldor (id 12) is always somewhere in the top 3.
     *   - Michael Rayner (id 19) never sits in the top 3.
     * Call after assigning fresh percentages but BEFORE deriving trends.
     *
     * NOTE: keeping Michael out of the top 3 is an early-round storyline
     * beat (genesis + votes-2); later scenarios deliberately skip this.
     */
    enforceStorylineConstraints() {
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
    },
  },

  /* ----------------------------------------------------------
     PRECINCTS (data)
     ---------------------------------------------------------- */
  precincts: {
    /**
     * Assigns reporting percentages from an {id: pct} map. Precincts not
     * present in the map are left untouched.
     * @param {Record<string, number>} map
     */
    setReporting(map) {
      Object.entries(map).forEach(([id, pct]) => {
        const p = PRECINCTS.find(x => x.id === id);
        if (p) p.reportingPct = pct;
      });
    },

    /**
     * Recomputes a precinct's leading candidate and lead margin from its
     * members' current votes (disqualified candidates are ignored). A
     * precinct that is not yet reporting has no leader.
     * Call AFTER reporting percentages and votes are set.
     * @param {object} precinct
     * @returns {object} the same precinct, mutated
     */
    recomputeLeader(precinct) {
      if (!precinct.reportingPct) {
        precinct.leadingCandidateId = null;
        precinct.leadMarginPct      = null;
        return precinct;
      }

      const members = precinct.memberIds
        .map(id => VOTES.find(v => v.teamId === id))
        .filter(v => v && !v.disqualified)
        .sort((a, b) => b.pct - a.pct);

      if (members.length > 0 && members[0].pct > 0) {
        precinct.leadingCandidateId = members[0].teamId;
        precinct.leadMarginPct = members.length > 1
          ? parseFloat((members[0].pct - members[1].pct).toFixed(1))
          : members[0].pct;
      } else {
        precinct.leadingCandidateId = null;
        precinct.leadMarginPct      = null;
      }
      return precinct;
    },
  },

  /* ----------------------------------------------------------
     BELLWETHERS (data)
     ---------------------------------------------------------- */
  bellwethers: {
    /**
     * Points every bellwether precinct at the current overall frontrunner.
     *
     * A bellwether forecasts the WHOLE race, so its lean tracks the
     * leaderboard leader (disqualified candidates are never the lean). A
     * precinct only signals once its own count is underway. Call after
     * votes and precinct reporting are updated, before rendering.
     */
    applyLeanings() {
      const frontrunner = democracyApi.getFrontrunner({ excludeDisqualified: true });
      const leansId = (frontrunner && frontrunner.pct > 0) ? frontrunner.teamId : null;

      PRECINCTS.forEach(p => {
        if (!p.isBellwether) return;
        p.leaningCandidateId = (p.reportingPct > 0) ? leansId : null;
      });
    },
  },

  /* ----------------------------------------------------------
     BREAKING-NEWS TICKER (render)
     Headlines live in data/headlines.js as NEWS_HEADLINES_BY_STATUS,
     keyed by status. render() swaps the active set for the current
     status; scenario scripts call it after updating APP_STATE.status.
     ---------------------------------------------------------- */
  headlines: {
    _intervalMs: 4500,
    _index: 0,
    _active: [],

    /** Resolve {leader} to the current top vote-getter's nickname. */
    _resolve(text) {
      return text.replace(/{leader}/g, democracyApi.getLeaderNickname());
    },

    _paint(item, i) {
      item.textContent = democracyApi.headlines._resolve(democracyApi.headlines._active[i]);
      item.dataset.headlineIndex = String(i);
      // restart the entrance animation
      item.style.animation = "none";
      // force reflow so the animation can replay
      void item.offsetWidth;
      item.style.animation = "";
    },

    /** Swap the ticker to the set for the current status and restart it. */
    render() {
      const item = document.getElementById("news-ticker-item");
      if (!item) return;

      this._active = NEWS_HEADLINES_BY_STATUS[APP_STATE.status]
        || NEWS_HEADLINES_BY_STATUS.update1
        || NEWS_HEADLINES_BY_STATUS.pending;

      this._index = 0;
      if (this._active.length) this._paint(item, this._index);
    },

    /** Initial paint + start the rotation timer. */
    init() {
      const item = document.getElementById("news-ticker-item");
      if (!item) return;

      this.render(); // initial paint from the current status

      setInterval(() => {
        if (!this._active.length) return;
        this._index = (this._index + 1) % this._active.length;
        this._paint(item, this._index);
      }, this._intervalMs);
    },
  },

  /* ----------------------------------------------------------
     CARD RENDERING (render)
     ---------------------------------------------------------- */
  render: {
    /** Re-render the ticker and every results card from current state. */
    all() {
      democracyApi.headlines.render();
      democracyApi.render.leaderboard();
      democracyApi.render.callOfNight();
      democracyApi.render.precincts();
      democracyApi.render.keyDistricts();
      democracyApi.render.bellwetherDesk();
      democracyApi.render.punditPanel();
    },

    /**
     * Renders the leaderboard from VOTES + TEAM.
     * Bar widths are relative to the leader (leader = full width).
     */
    leaderboard() {
      const list = document.getElementById("leaderboard");
      if (!list) return;

      // The modifier stretches the list so the empty state centers vertically.
      const isPreInit = APP_STATE.status === "pending";
      list.classList.toggle("leaderboard--empty", isPreInit);

      if (isPreInit) {
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
    },

    /**
     * Renders the #card-call-of-night card from CALL_OF_NIGHT.
     * projectionAvailable=false shows the expert holding-pattern;
     * true shows the projected winner (resolved from TEAM by candidateId).
     */
    callOfNight() {
      const body   = document.querySelector("#card-call-of-night .card__body");
      const badge  = document.querySelector("#card-call-of-night .card__badge");
      if (!body) return;

      if (!CALL_OF_NIGHT.projectionAvailable) {
        const { teamId, title, quotes } = CALL_OF_NIGHT.expert;
        const member = TEAM.find(t => t.id === teamId);
        const name   = member?.name  || "Election Expert";
        const image  = member?.image || "";

        const leaderNickname = democracyApi.getLeaderNickname();

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
    },

    /**
     * Renders the #card-precincts card: overall weighted reporting % and a
     * per-precinct progress bar. Eligible voters = memberIds.length.
     */
    precincts() {
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
    },

    /**
     * Renders the #card-key-districts card: each precinct's status badge,
     * leader, margin and reporting %.
     */
    keyDistricts() {
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
    },

    /**
     * Renders the #card-bellwether-desk card (only isBellwether precincts)
     * plus a summary verdict line.
     */
    bellwetherDesk() {
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
    },

    /**
     * Renders the #card-pundit-panel card from PUNDITS.
     * Avatars and predictions are resolved from TEAM.
     */
    punditPanel() {
      const body = document.querySelector("#card-pundit-panel .card__body");
      if (!body) return;

      const confidenceLabel = { high: "confident", medium: "leaning", low: "undecided" };
      const confidenceClass = { high: "pundit__confidence--high", medium: "pundit__confidence--medium", low: "pundit__confidence--low" };

      const leaderNickname = democracyApi.getLeaderNickname();

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
    },
  },

  /* ----------------------------------------------------------
     EFFECTS (render)
     ---------------------------------------------------------- */
  effects: {
    /**
     * Fires a celebratory confetti burst over the whole viewport for a few
     * seconds. Self-contained canvas animation — no libraries, file:// safe.
     */
    confetti() {
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
    },
  },
};
