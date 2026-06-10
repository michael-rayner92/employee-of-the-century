/* ============================================================
   Operation Birthday Cake — God Mode scenario 4 (update4 / Top Secret 3).
   "A precinct nobody has ever heard of reports 99% for Michael."

   The wheels come off:
   - Reporting climbs to ~89% (the header badge turns green to show we are
     closing in on 100%).
   - The field collapses to a two-horse race: only Hussein and Michael clear
     10%, with Hussein clinging to a slim lead.
   - A brand-new precinct — the "Australian Office" — materialises out of
     nowhere, reporting 99% for Michael Rayner.
   - Eyosias (Call of the Night) turns suspiciously pro-Michael, one data
     point away from projecting him (but does NOT call it yet).
   - Evy goes all-in on Michael ("the people have spoken"); Cille screams
     rigged and points at the phantom Australian Office; Vincent still
     refuses to call anything.
   - Sets APP_STATE.status = "update4" and re-renders everything.
   ============================================================ */
function runOperationBirthdayCake() {
  const HUSSEIN_ID = 12;
  const MICHAEL_ID = 19;

  // --- 1. Recast the field as a two-horse race -------------------------
  // Only Hussein and Michael clear 10%; Hussein sits slightly ahead.
  const michaelPct = 42 + Math.floor(Math.random() * 3); // 42–44
  const lead       = 1 + Math.floor(Math.random() * 3);  // 1–3 (a slim lead)
  const husseinPct = michaelPct + lead;
  const remaining  = 100 - husseinPct - michaelPct;      // shared by the rest

  // Spread the leftovers across the rest of the field, biased toward whoever
  // was already polling well, and capped so nobody else crosses 10%.
  const others = VOTES.filter(v => v.teamId !== HUSSEIN_ID && v.teamId !== MICHAEL_ID);
  const ow     = others.map(v => v.pct + 0.5);
  const owTot  = ow.reduce((s, w) => s + w, 0) || 1;
  const exact  = ow.map(w => (w / owTot) * remaining);
  const alloc  = exact.map(Math.floor);
  const leftover = remaining - alloc.reduce((s, x) => s + x, 0);
  exact
    .map((v, i) => ({ i, frac: v % 1 }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, leftover)
    .forEach(({ i }) => alloc[i]++);
  // Safety cap: keep every also-ran at 10% or below, spilling onto the lowest.
  for (let i = 0; i < alloc.length; i++) {
    while (alloc[i] > 10) {
      const lowest = alloc.indexOf(Math.min(...alloc));
      if (lowest === i) break;
      alloc[i]--; alloc[lowest]++;
    }
  }

  const prevPcts = VOTES.map(v => v.pct);
  VOTES.find(v => v.teamId === HUSSEIN_ID).pct = husseinPct;
  VOTES.find(v => v.teamId === MICHAEL_ID).pct = michaelPct;
  others.forEach((v, i) => { v.pct = alloc[i]; });

  VOTES.forEach((v, i) => {
    v.trend = v.pct > prevPcts[i] ? "up" : v.pct < prevPcts[i] ? "down" : "stable";
  });

  // --- 2. The "Australian Office" appears (guard against re-runs) -------
  if (!PRECINCTS.find(p => p.id === "australian-office")) {
    PRECINCTS.push({
      id: "australian-office",
      name: "Australian Office",
      memberIds: [MICHAEL_ID],
      reportingPct: 99,
      status: "CALLED",
      leadingCandidateId: MICHAEL_ID,
      leadMarginPct: 99,
      isBellwether: false,
      bellwetherAccuracy: null,
      leaningCandidateId: null,
    });
  }

  // --- 3. Reporting climbs to ~89% -------------------------------------
  //   (10·1.00 + 8·0.90 + 6·0.68 + 1·0.99) / 25 = 22.27 / 25 = 89.1% → 89%
  const reportingMap = {
    "main-office": 100,
    "502nd": 90,
    "remote": 68,
    "australian-office": 99,
  };

  PRECINCTS.forEach(p => {
    p.reportingPct = reportingMap[p.id] ?? p.reportingPct;

    // The phantom precinct keeps its hand-stuffed 99%-for-Michael result.
    if (p.id === "australian-office") {
      p.leadingCandidateId = MICHAEL_ID;
      p.leadMarginPct      = 99;
      p.status             = "CALLED";
      return;
    }

    const members = p.memberIds
      .map(id => VOTES.find(v => v.teamId === id))
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);

    if (members.length > 0 && members[0].pct > 0) {
      p.leadingCandidateId = members[0].teamId;
      p.leadMarginPct = members.length > 1
        ? parseFloat((members[0].pct - members[1].pct).toFixed(1))
        : members[0].pct;
    } else {
      p.leadingCandidateId = null;
      p.leadMarginPct      = null;
    }

    // Near-complete or clearly-decided desks are CALLED; tight ones a KEY
    // BATTLE. The overall race is still NOT projected (see below).
    p.status =
      (p.leadMarginPct === null)                                  ? "PENDING"
      : (p.reportingPct >= 90 || (p.reportingPct >= 60 && p.leadMarginPct >= 12)) ? "CALLED"
      : (p.leadMarginPct <= 8)                                    ? "BATTLEGROUND"
      : "PENDING";
  });

  // --- 4. Pundits & desk ------------------------------------------------
  const punditCille = PUNDITS.find(p => p.id === 1);
  const punditEvy   = PUNDITS.find(p => p.id === 3);
  if (punditCille) punditCille.predictedWinnerId = HUSSEIN_ID; // still backs Hussein — now crying foul
  if (punditEvy)   punditEvy.predictedWinnerId   = MICHAEL_ID; // all-in on Michael
  // Vincent (id 2) stays null — still no call.

  // Eyosias is "almost" ready — but no winner is projected yet.
  CALL_OF_NIGHT.projectionAvailable = false;

  APP_STATE.status = "update4";

  applyBellwetherLeanings();
  renderHeadlines();
  renderLeaderboard();
  renderCallOfNight();
  renderPrecincts();
  renderKeyDistricts();
  renderBellwetherDesk();
  renderPunditPanel();
}
