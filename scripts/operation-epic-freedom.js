/* ============================================================
   Operation Epic Freedom — God Mode scenario 5 (completed / Top Secret 4).
   "The count is complete. The result is... unanimous-ish."

   The grand finale:
   - Reporting hits 100% across every precinct.
   - Michael Rayner is awarded 99% of the vote.
   - Hussein Aldor is DISQUALIFIED — struck from the record at 0%.
   - The Decision Desk projects Michael the winner; the Call of the Night
     and Pundit Panel descend into sycophantic praise — except Cille, who
     is shown UNDER ARREST FOR TREASON for refusing to fall in line.
   - A crown appears beside Michael on the main leaderboard.
   - Confetti rains down once the loader closes and the winner is revealed.
   - Sets APP_STATE.status = "completed" and re-renders everything.
   ============================================================ */
function runOperationEpicFreedom() {
  const MICHAEL_ID = 19;
  const HUSSEIN_ID = 12;

  // --- 1. Final tally: 99% for Michael, Hussein disqualified -----------
  // A single token point is left for a face-saving runner-up.
  const runnerUp = [...VOTES]
    .filter(v => v.teamId !== MICHAEL_ID && v.teamId !== HUSSEIN_ID)
    .sort((a, b) => b.pct - a.pct)[0];

  const prevPcts = VOTES.map(v => v.pct);
  VOTES.forEach(v => { v.pct = 0; v.disqualified = false; });

  const michaelV = VOTES.find(v => v.teamId === MICHAEL_ID);
  const husseinV = VOTES.find(v => v.teamId === HUSSEIN_ID);
  michaelV.pct = 99;
  if (runnerUp) runnerUp.pct = 1;
  husseinV.pct = 0;
  husseinV.disqualified = true; // struck from the record

  VOTES.forEach((v, i) => {
    v.trend = v.disqualified            ? "down"
            : v.pct > prevPcts[i]       ? "up"
            : v.pct < prevPcts[i]       ? "down"
            : "stable";
  });

  // --- 2. Every precinct closes at 100% --------------------------------
  PRECINCTS.forEach(p => {
    p.reportingPct = 100;

    const members = p.memberIds
      .map(id => VOTES.find(v => v.teamId === id))
      .filter(v => v && !v.disqualified)
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
    p.status = "CALLED"; // counting is done everywhere
  });

  // --- 3. Project the winner: Michael, by acclamation ------------------
  CALL_OF_NIGHT.projectionAvailable = true;
  CALL_OF_NIGHT.projection = {
    candidateId: MICHAEL_ID,
    candidateName: "Michael Rayner",
    candidateCaptionLine1: "PROJECTED WINNER — Employee of the Month",
    candidateCaptionLine2: "By a historic, unanimous, totally legitimate landslide 👑",
  };

  // --- 4. Pundit panel: Cille is hauled away; the rest fall into line --
  PUNDITS.forEach(p => {
    if (p.id === 1) {
      // Cille kept calling it rigged — now detained for treason.
      p.arrested = true;
      return;
    }
    p.predictedWinnerId = MICHAEL_ID;
    p.confidence = "high";
  });

  APP_STATE.status = "completed";

  applyBellwetherLeanings();
  renderHeadlines();
  renderLeaderboard();
  renderCallOfNight();
  renderPrecincts();
  renderKeyDistricts();
  renderBellwetherDesk();
  renderPunditPanel();

  // --- 5. Celebrate (the loader has already closed by now) -------------
  if (typeof launchConfetti === "function") launchConfetti();
}
