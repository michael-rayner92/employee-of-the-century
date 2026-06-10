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

  // Random weights with a small floor so nobody is guaranteed zero,
  // apportioned to integer percentages summing to exactly 100.
  const weights = Array.from({ length: n }, () => Math.random() * 0.9 + 0.1);
  const floored = Utils.largestRemainderApportion(weights);

  // Apply new values, enforce the fixed storyline constraints (Hussein in
  // the top 3, Michael out of it), then derive trends from the change so
  // the arrows match the final ordering.
  const prevPcts = democracyApi.votes.snapshotPcts();
  VOTES.forEach((entry, i) => { entry.pct = floored[i]; });
  democracyApi.votes.enforceStorylineConstraints();
  democracyApi.votes.applyTrends(prevPcts);

  // Precinct reporting percentages that yield ~38% overall weighted average.
  // All districts stay PENDING — too early to call anything at 38%.
  democracyApi.precincts.setReporting({ "main-office": 70, "502nd": 25, "remote": 0 });
  PRECINCTS.forEach(p => {
    democracyApi.precincts.recomputeLeader(p);
    p.status = "PENDING";
  });

  // Dynamically assign pundit predictions based on the randomised vote outcome.
  const HUSSEIN_ID = 12; // Hussein Aldor — guaranteed a top-3 spot (see votes.enforceStorylineConstraints)
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

  democracyApi.bellwethers.applyLeanings();
  democracyApi.render.all();
}
