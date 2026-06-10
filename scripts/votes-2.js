/* ============================================================
   Votes 2 — God Mode scenario 2 (update2 / Top Secret 1).
   "Early precincts come in hot. The leaderboard is about to shift."

   A fresh round of votes lands:
   - Consolidates the field: the existing leaders surge while the
     long tail fades, so a smaller set of frontrunners emerges.
   - Pushes precinct reporting to ~56% overall:
       Main Office  90%  (comes in hot — nearly complete)
       502nd        45%
       Remote       15%  (ballots finally trickling in)
   - Recomputes per-precinct leaders, margins and bellwether leanings.
   - A high-reporting precinct with a tight margin becomes a KEY BATTLE,
     but nothing is CALLED — 56% is still too early.
   - Call of the Night is NOT made (projection stays off) and at least
     one pundit (Vincent) keeps "No call".
   - Sets APP_STATE.status = "update2" and re-renders everything.
   ============================================================ */
function runVotes2() {
  // Normalise an array of positive weights to integer percentages
  // summing to exactly 100 (largest-remainder method).
  function toPercentages(weights) {
    const total   = weights.reduce((s, w) => s + w, 0) || 1;
    const exact   = weights.map(w => (w / total) * 100);
    const floored = exact.map(Math.floor);
    const remainder = 100 - floored.reduce((s, p) => s + p, 0);
    exact
      .map((v, i) => ({ i, frac: v % 1 }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, remainder)
      .forEach(({ i }) => floored[i]++);
    return floored;
  }

  // Consolidate the field: boost the current frontrunners, shrink the
  // tail. Evolving from the existing standings keeps trends believable.
  const ranked     = [...VOTES].sort((a, b) => b.pct - a.pct);
  const frontIds   = new Set(ranked.slice(0, 4).map(v => v.teamId));

  const weights = VOTES.map(v => {
    const base   = v.pct + 1; // +1 so a zero-vote member isn't locked out forever
    const jitter = 0.85 + Math.random() * 0.3;                          // 0.85–1.15
    const factor = frontIds.has(v.teamId)
      ? 2.2 + Math.random() * 0.9                                       // frontrunners surge
      : 0.25 + Math.random() * 0.25;                                    // tail fades
    return base * factor * jitter;
  });

  const newPcts  = toPercentages(weights);
  const prevPcts = VOTES.map(v => v.pct);
  VOTES.forEach((entry, i) => { entry.pct = newPcts[i]; });
  // Enforce the fixed storyline constraints (Hussein in the top 3, Michael
  // out of it) before deriving trends, so the arrows match the final order.
  enforceVoteConstraints();
  VOTES.forEach((entry, i) => {
    entry.trend = entry.pct > prevPcts[i] ? "up" : entry.pct < prevPcts[i] ? "down" : "stable";
  });

  // Precinct reporting that yields ~56% overall weighted average:
  //   (10·0.90 + 8·0.45 + 6·0.15) / 24 = 13.5 / 24 = 56.25% → 56%
  const reportingMap = { "main-office": 90, "502nd": 45, "remote": 15 };

  PRECINCTS.forEach(p => {
    p.reportingPct = reportingMap[p.id] ?? 0;

    if (p.reportingPct === 0) {
      p.status             = "PENDING";
      p.leadingCandidateId = null;
      p.leadMarginPct      = null;
      return;
    }

    // Leading candidate among this precinct's members
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

    // A well-reported precinct with a tight margin is a KEY BATTLE.
    // Nothing is CALLED yet — 56% overall is still too early.
    p.status = (p.reportingPct >= 50 && p.leadMarginPct !== null && p.leadMarginPct <= 8)
      ? "BATTLEGROUND"
      : "PENDING";
  });

  // Re-point pundit predictions at the new standings (Vincent stays "No call").
  const HUSSEIN_ID      = 12; // Hussein Aldor — guaranteed a top-3 spot (see enforceVoteConstraints)
  const remoteMemberIds = (PRECINCTS.find(p => p.id === "remote") || {}).memberIds || [];
  const remoteLeader    = [...VOTES]
    .filter(v => remoteMemberIds.includes(v.teamId))
    .sort((a, b) => b.pct - a.pct)[0];

  const punditCille = PUNDITS.find(p => p.id === 1);
  const punditEvy   = PUNDITS.find(p => p.id === 3);
  // Cille calls Hussein (the 502nd frontrunner) — at least one pundit always backs him.
  if (punditCille) punditCille.predictedWinnerId = HUSSEIN_ID;
  if (punditEvy)   punditEvy.predictedWinnerId   = remoteLeader ? remoteLeader.teamId : null;
  // Vincent (id 2) stays null — still no call.

  // Call of the Night stays in its holding pattern — no projection yet.
  CALL_OF_NIGHT.projectionAvailable = false;

  APP_STATE.status = "update2";

  applyBellwetherLeanings();
  renderHeadlines();
  renderLeaderboard();
  renderCallOfNight();
  renderPrecincts();
  renderKeyDistricts();
  renderBellwetherDesk();
  renderPunditPanel();
}
