/* ============================================================
   Genesis — God Mode scenario 1 (update1).
   - Randomly distributes vote percentages across all team members
     (always sums to exactly 100).
   - Sets precinct reporting to ~38% overall:
       Main Office  70%  (members 1–10)
       502nd        25%  (members 11–18)
       Remote        0%  (members 19–24)
   - Computes the leading candidate within each reporting precinct
     and sets bellwether leanings accordingly.
   - All districts remain PENDING — too early to call at 38%.
   - Sets APP_STATE.status = "update1" and re-renders all cards.
   ============================================================ */
function runGenesis() {
  const n = VOTES.length;

  // Random weights with a small floor so nobody is guaranteed zero
  const weights = Array.from({ length: n }, () => Math.random() * 0.9 + 0.1);
  const total   = weights.reduce((s, w) => s + w, 0);

  // Floor each share then redistribute the remainder to the entries
  // with the largest fractional parts (guarantees sum === 100 exactly)
  const floored   = weights.map(w => Math.floor(w / total * 100));
  const remainder = 100 - floored.reduce((s, p) => s + p, 0);
  weights
    .map((w, i) => ({ i, frac: (w / total * 100) % 1 }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remainder)
    .forEach(({ i }) => floored[i]++);

  // Apply new values, enforce the fixed storyline constraints (Hussein in
  // the top 3, Michael out of it), then derive trends from the change so
  // the arrows match the final ordering.
  const prevPcts = VOTES.map(v => v.pct);
  VOTES.forEach((entry, i) => { entry.pct = floored[i]; });
  enforceVoteConstraints();
  VOTES.forEach((entry, i) => {
    entry.trend = entry.pct > prevPcts[i] ? "up" : entry.pct < prevPcts[i] ? "down" : "stable";
  });

  // Precinct reporting percentages that yield ~38% overall weighted average
  const reportingMap = { "main-office": 70, "502nd": 25, "remote": 0 };

  PRECINCTS.forEach(p => {
    p.reportingPct = reportingMap[p.id] ?? 0;
    p.status       = "PENDING";

    if (p.reportingPct === 0) {
      p.leadingCandidateId = null;
      p.leadMarginPct      = null;
      return;
    }

    // Find leading candidate among this precinct's members
    const members = p.memberIds
      .map(id => VOTES.find(v => v.teamId === id))
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);

    if (members.length > 0 && members[0].pct > 0) {
      p.leadingCandidateId = members[0].teamId;
      p.leadMarginPct = members.length > 1
        ? parseFloat((members[0].pct - members[1].pct).toFixed(1))
        : members[0].pct;
    }
  });

  // Dynamically assign pundit predictions based on the randomised vote outcome.
  const HUSSEIN_ID = 12; // Hussein Aldor — guaranteed a top-3 spot (see enforceVoteConstraints)
  const remoteMemberIds = (PRECINCTS.find(p => p.id === "remote") || {}).memberIds || [];
  const remoteLeader = [...VOTES]
    .filter(v => remoteMemberIds.includes(v.teamId))
    .sort((a, b) => b.pct - a.pct)[0];

  const punditCille   = PUNDITS.find(p => p.id === 1);
  const punditEvy     = PUNDITS.find(p => p.id === 3);
  // Cille calls Hussein (the 502nd frontrunner) — at least one pundit always backs him.
  if (punditCille) punditCille.predictedWinnerId = HUSSEIN_ID;
  if (punditEvy)   punditEvy.predictedWinnerId   = remoteLeader ? remoteLeader.teamId : null;
  // Vincent (id 2) stays null — low confidence, no call

  APP_STATE.status = "update1";

  applyBellwetherLeanings();
  renderHeadlines();
  renderLeaderboard();
  renderCallOfNight();
  renderPrecincts();
  renderKeyDistricts();
  renderBellwetherDesk();
  renderPunditPanel();
}
