/* ============================================================
   Thumb on Scale — God Mode scenario 3 (update3 / Top Secret 2).
   "The Remote bureau's numbers arrive... suspiciously."

   A fresh, conveniently-timed dump of votes lands:
   - Pushes precinct reporting to ~71% overall:
       Main Office  95%  (all but counted)
       502nd        72%  (caught up)
       Remote       30%  (a curious surge — the thumb on the scale)
   - Michael Rayner gets a large boost and slots cleanly into 2nd,
     turning the board into a three-horse race: the incumbent leader,
     Michael, and Hussein pull clear while the rest fade to the margins.
   - Recomputes per-precinct leaders, margins, statuses and bellwether
     leanings. Well-reported, decided desks get CALLED; tight ones stay
     a KEY BATTLE — but the overall race is still NOT projected.
   - Pundits update: Cille holds her call on Hussein, the Remote bureau's
     Evy gleefully claims Michael's surge, and Vincent still has no call.
   - Sets APP_STATE.status = "update3" and re-renders everything.

   NOTE: this round intentionally does NOT call enforceVoteConstraints()
   — that helper keeps Michael out of the top 3, which was only an
   early-round (genesis + votes-2) storyline beat. From here Michael is a
   frontrunner by design.
   ============================================================ */
function runThumbOnScale() {
  const MICHAEL_ID = 19; // Michael Rayner — muscled into 2nd this round
  const HUSSEIN_ID = 12; // Hussein Aldor — holds the 3rd horse (Cille's call)

  // Normalise positive weights to integer percentages summing to exactly 100.
  function toPercentages(weights) {
    const total     = weights.reduce((s, w) => s + w, 0) || 1;
    const exact     = weights.map(w => (w / total) * 100);
    const floored   = exact.map(Math.floor);
    const remainder = 100 - floored.reduce((s, p) => s + p, 0);
    exact
      .map((v, i) => ({ i, frac: v % 1 }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, remainder)
      .forEach(({ i }) => floored[i]++);
    return floored;
  }

  const prevByPct = [...VOTES].sort((a, b) => b.pct - a.pct);
  const leaderId  = prevByPct[0].teamId;

  // The three horses: the incumbent leader, Michael, and Hussein. (Michael
  // is guaranteed outside the top 3 coming in, so he is never the leader.)
  const horseIds = [];
  const addHorse = id => { if (id != null && !horseIds.includes(id)) horseIds.push(id); };
  addHorse(leaderId);
  addHorse(MICHAEL_ID);
  addHorse(HUSSEIN_ID);
  for (const v of prevByPct) { if (horseIds.length >= 3) break; addHorse(v.teamId); }

  // The two non-Michael horses take 1st and 3rd; Michael takes 2nd.
  const nonMichael = horseIds.filter(id => id !== MICHAEL_ID);
  const firstId    = nonMichael[0];
  const thirdId    = nonMichael[1];

  // Build a believable value multiset: a tight leading trio well clear of a
  // pack that collapses into low single digits. The trio's relative order is
  // irrelevant here — values are assigned strictly by rank below, so jitter
  // can never flip Michael out of 2nd.
  const jitter  = () => 0.9 + Math.random() * 0.2;
  const weights = VOTES.map(v => {
    if (v.teamId === firstId)   return 30 * jitter();
    if (v.teamId === MICHAEL_ID) return 25 * jitter();
    if (v.teamId === thirdId)   return 20 * jitter();
    return (0.8 + v.pct * 0.2) * jitter(); // the fading pack
  });

  // Sort the resulting values high→low and hand them out by intended rank.
  const sortedVals = [...toPercentages(weights)].sort((a, b) => b - a);
  const assigned   = {};
  assigned[firstId]    = sortedVals[0]; // incumbent leader stays #1
  assigned[MICHAEL_ID] = sortedVals[1]; // Michael slots into #2
  assigned[thirdId]    = sortedVals[2]; // Hussein holds #3

  // Remaining values go to the pack, preserving their prior relative order.
  const packIds = prevByPct
    .map(v => v.teamId)
    .filter(id => id !== firstId && id !== MICHAEL_ID && id !== thirdId);
  packIds.forEach((id, k) => { assigned[id] = sortedVals[3 + k]; });

  // Apply the new values.
  const prevPcts = VOTES.map(v => v.pct);
  VOTES.forEach(v => { v.pct = assigned[v.teamId]; });

  // Guarantee a strict ordering first > Michael > third > pack, so an integer
  // tie at a boundary (broken by id order) can never knock Michael off 2nd or
  // Hussein out of the top 3. We open any tied gap by transferring a point
  // from the lowest pack member up the chain — the total stays at 100.
  const get        = id => VOTES.find(v => v.teamId === id);
  const packVotes  = packIds.map(get);
  const lowestPack = () => packVotes.filter(v => v.pct > 0).sort((a, b) => a.pct - b.pct)[0];
  const liftAbove  = (target, floorPct) => {
    let guard = 0;
    while (target.pct <= floorPct && guard++ < 100) {
      const donor = lowestPack();
      if (!donor) break;
      donor.pct -= 1;
      target.pct += 1;
    }
  };
  const third   = get(thirdId);
  const michael = get(MICHAEL_ID);
  const first   = get(firstId);
  liftAbove(third,   Math.max(0, ...packVotes.map(v => v.pct))); // third clear of the pack
  liftAbove(michael, third.pct);                                 // Michael clear of third
  liftAbove(first,   michael.pct);                               // leader clear of Michael

  // Derive trends from the change.
  VOTES.forEach((v, i) => {
    v.trend = v.pct > prevPcts[i] ? "up" : v.pct < prevPcts[i] ? "down" : "stable";
  });

  // Precinct reporting that yields ~71% overall:
  //   (10·0.95 + 8·0.72 + 6·0.30) / 24 = 17.06 / 24 = 71.1% → 71%
  const reportingMap = { "main-office": 95, "502nd": 72, "remote": 30 };

  PRECINCTS.forEach(p => {
    p.reportingPct = reportingMap[p.id] ?? 0;

    if (p.reportingPct === 0) {
      p.status             = "PENDING";
      p.leadingCandidateId = null;
      p.leadMarginPct      = null;
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

    // At 71% the well-reported, decided desks get CALLED; tight ones remain a
    // KEY BATTLE. The overall race is still NOT projected (see below).
    if (p.leadMarginPct === null) {
      p.status = "PENDING";
    } else if (p.reportingPct >= 70 && p.leadMarginPct >= 12) {
      p.status = "CALLED";
    } else if (p.reportingPct >= 45 && p.leadMarginPct <= 8) {
      p.status = "BATTLEGROUND";
    } else {
      p.status = "PENDING";
    }
  });

  // Re-point pundit predictions. Cille holds her call on Hussein; Evy backs
  // whoever now leads the Remote bureau (Michael, after his surge); Vincent
  // still refuses to commit.
  const remoteMemberIds = (PRECINCTS.find(p => p.id === "remote") || {}).memberIds || [];
  const remoteLeader    = [...VOTES]
    .filter(v => remoteMemberIds.includes(v.teamId))
    .sort((a, b) => b.pct - a.pct)[0];

  const punditCille = PUNDITS.find(p => p.id === 1);
  const punditEvy   = PUNDITS.find(p => p.id === 3);
  if (punditCille) punditCille.predictedWinnerId = HUSSEIN_ID;
  if (punditEvy)   punditEvy.predictedWinnerId   = remoteLeader ? remoteLeader.teamId : null;
  // Vincent (id 2) stays null — still no call.

  // Three-way fight — still too close to project a winner.
  CALL_OF_NIGHT.projectionAvailable = false;

  APP_STATE.status = "update3";

  applyBellwetherLeanings();
  renderHeadlines();
  renderLeaderboard();
  renderCallOfNight();
  renderPrecincts();
  renderKeyDistricts();
  renderBellwetherDesk();
  renderPunditPanel();
}
