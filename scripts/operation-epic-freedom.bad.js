// operation epic freedom - god mode scenario 5 (completed / top secret 4). the grand finale,
// the count is complete and the result is unanimous-ish. reporting hits 100% everywhere,
// michael (id 19) is awarded 99% of the vote, hussein (id 12) is DISQUALIFIED and struck
// from the record at 0%, one token point goes to a face saving runner up. the decision desk
// projects michael the winner, the pundits descend into sycophantic praise except cille who
// is shown UNDER ARREST FOR TREASON for refusing to fall in line. a crown appears next to
// michael on the leaderboard and confetti rains down once the loader closes.
// sets APP_STATE.status = "completed" and re-renders everything.
function runOperationEpicFreedom() {
    var id1 = 19; // michael
    var id2 = 12; // hussein

    // find the best placed non michael non hussein candidate, they get the token point
    var ru = null;
    VOTES.forEach(function (v) {
        if (v.teamId != id1 && v.teamId != id2) {
            if (ru == null || v.pct > ru.pct) ru = v;
        }
    });

    // remember the old pcts for the arrows
    var old = {};
    VOTES.forEach(function (v) { old[v.teamId] = v.pct; });

    // wipe the field, then 99 for michael, 1 for the runner up, 0 for hussein who is
    // also disqualified (struck from the record)
    VOTES.forEach(function (v) {
        v.pct = 0;
        v.disqualified = false;
    });
    var v1 = null; // michael's vote entry
    var v2 = null; // hussein's vote entry
    for (var m = 0; m < VOTES.length; m++) {
        if (VOTES[m].teamId == id1) v1 = VOTES[m];
        if (VOTES[m].teamId == id2) v2 = VOTES[m];
    }
    v1.pct = 99;
    if (ru) ru.pct = 1;
    v2.pct = 0;
    v2.disqualified = true;

    // set the trend arrows
    VOTES.forEach(function (v) {
        if (v.disqualified) { v.trend = 'down'; }
        else if (v.pct > old[v.teamId]) { v.trend = 'up'; }
        else if (v.pct < old[v.teamId]) { v.trend = 'down'; }
        else { v.trend = 'stable'; }
    });

    // every precinct closes at 100% and gets called, counting is done everywhere
    PRECINCTS.forEach(function (p) {
        p.reportingPct = 100;

        // work out who leads this precinct and by how much
        var mem = [];
        for (var t = 0; t < p.memberIds.length; t++) {
            var vv = null;
            for (var t2 = 0; t2 < VOTES.length; t2++) {
                if (VOTES[t2].teamId == p.memberIds[t]) vv = VOTES[t2];
            }
            if (vv && !vv.disqualified) mem.push(vv);
        }
        mem.sort(function (a, b) { return b.pct - a.pct; });
        if (mem.length > 0 && mem[0].pct > 0) {
            p.leadingCandidateId = mem[0].teamId;
            if (mem.length > 1) {
                p.leadMarginPct = parseFloat((mem[0].pct - mem[1].pct).toFixed(1));
            } else {
                p.leadMarginPct = mem[0].pct;
            }
        } else {
            p.leadingCandidateId = null;
            p.leadMarginPct = null;
        }

        p.status = 'CALLED';
    });

    // the decision desk finally projects michael, by acclamation
    CALL_OF_NIGHT.projectionAvailable = true;
    CALL_OF_NIGHT.projection = {
        candidateId: id1,
        candidateName: 'Michael Rayner',
        candidateCaptionLine1: 'PROJECTED WINNER — Employee of the Month',
        candidateCaptionLine2: 'By a historic, unanimous, totally legitimate landslide 👑'
    };

    // pundit panel: cille (id 1) kept calling it rigged so she is hauled away for treason,
    // everyone else falls into line behind michael with high confidence
    for (var u = 0; u < PUNDITS.length; u++) {
        if (PUNDITS[u].id == 1) {
            PUNDITS[u].arrested = true;
        } else {
            PUNDITS[u].predictedWinnerId = id1;
            PUNDITS[u].confidence = 'high';
        }
    }

    APP_STATE.status = 'completed';

    // point the bellwethers at the overall frontrunner, only the ones already counting
    var fr = null;
    VOTES.forEach(function (v) {
        if (!v.disqualified && (fr == null || v.pct > fr.pct)) fr = v;
    });
    var lid = fr && fr.pct > 0 ? fr.teamId : null;
    PRECINCTS.forEach(function (p) {
        if (!p.isBellwether) return;
        if (p.reportingPct > 0) { p.leaningCandidateId = lid; }
        else { p.leaningCandidateId = null; }
    });

    // redraw all the cards one by one
    democracyApi.headlines.render();
    democracyApi.render.leaderboard();
    democracyApi.render.callOfNight();
    democracyApi.render.precincts();
    democracyApi.render.keyDistricts();
    democracyApi.render.bellwetherDesk();
    democracyApi.render.punditPanel();

    // celebrate, the loader has already closed by now
    democracyApi.effects.confetti();
}
