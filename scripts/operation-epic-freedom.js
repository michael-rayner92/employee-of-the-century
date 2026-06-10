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

  const prevPcts = democracyApi.votes.snapshotPcts();
  VOTES.forEach(v => { v.pct = 0; v.disqualified = false; });

  const michaelV = VOTES.find(v => v.teamId === MICHAEL_ID);
  const husseinV = VOTES.find(v => v.teamId === HUSSEIN_ID);
  michaelV.pct = 99;
  if (runnerUp) runnerUp.pct = 1;
  husseinV.pct = 0;
  husseinV.disqualified = true; // struck from the record

  democracyApi.votes.applyTrends(prevPcts);

  // --- 2. Every precinct closes at 100% --------------------------------
  PRECINCTS.forEach(p => {
    p.reportingPct = 100;
    democracyApi.precincts.recomputeLeader(p);
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

  democracyApi.bellwethers.applyLeanings();
  democracyApi.render.all();

  // --- 5. Celebrate (the loader has already closed by now) -------------
  democracyApi.effects.confetti();
}
