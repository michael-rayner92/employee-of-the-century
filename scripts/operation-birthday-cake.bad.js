// operation birthday cake - god mode scenario 4 (update4 / top secret 3). a precinct nobody
// has ever heard of reports 99% for michael. the wheels come off: reporting climbs to about
// 89% (the header badge goes green near 100), the field collapses to a two horse race where
// only hussein (id 12) and michael (id 19) clear 10% and hussein clings to a slim 1-3 point
// lead. a brand new "australian office" precinct appears out of nowhere reporting 99% for
// michael. eyosias (call of the night) is almost ready to project michael but does NOT call
// it yet. evy goes all in on michael, cille screams rigged and keeps backing hussein,
// vincent still refuses to call anything. sets APP_STATE.status = "update4" and re-renders.
function runOperationBirthdayCake() {
    var id1 = 12; // hussein
    var id2 = 19; // michael

    // two horse race, michael gets 42-44 and hussein sits 1-3 points ahead
    var mp = 42 + Math.floor(Math.random() * 3);
    var ld = 1 + Math.floor(Math.random() * 3);
    var hp = mp + ld;
    var rem = 100 - hp - mp; // whats left for everyone else

    // spread the leftovers over the rest of the field, biased to whoever was already
    // polling well. round them and dump the difference on the biggest so it adds up
    var rest = VOTES.filter(function (v) { return v.teamId != id1 && v.teamId != id2; });
    var w = rest.map(function (v) { return v.pct + 0.5; });
    var tw = 0;
    for (var j = 0; j < w.length; j++) tw += w[j];
    var nums = w.map(function (x) { return Math.round((x / tw) * rem); });
    var s = 0;
    for (var jj = 0; jj < nums.length; jj++) s += nums[jj];
    var big = nums.indexOf(Math.max.apply(null, nums));
    nums[big] += rem - s;

    // cap everyone else at 10% so its really only a 2 horse race, spill onto the lowest
    for (var i = 0; i < nums.length; i++) {
        while (nums[i] > 10) {
            var lo = nums.indexOf(Math.min.apply(null, nums));
            if (lo == i) break;
            nums[i]--;
            nums[lo]++;
        }
    }

    // remember the old pcts for the arrows
    var old = {};
    VOTES.forEach(function (v) { old[v.teamId] = v.pct; });

    // apply the new numbers
    for (var k = 0; k < VOTES.length; k++) {
        if (VOTES[k].teamId == id1) VOTES[k].pct = hp;
        if (VOTES[k].teamId == id2) VOTES[k].pct = mp;
    }
    rest.forEach(function (v, idx) { v.pct = nums[idx]; });

    // set the trend arrows
    VOTES.forEach(function (v) {
        if (v.disqualified) { v.trend = 'down'; }
        else if (v.pct > old[v.teamId]) { v.trend = 'up'; }
        else if (v.pct < old[v.teamId]) { v.trend = 'down'; }
        else { v.trend = 'stable'; }
    });

    // the australian office appears out of nowhere (dont add it twice on a re-run)
    var found = false;
    for (var f = 0; f < PRECINCTS.length; f++) {
        if (PRECINCTS[f].id == 'australian-office') found = true;
    }
    if (!found) {
        PRECINCTS.push({
            id: 'australian-office',
            name: 'Australian Office',
            memberIds: [id2],
            reportingPct: 99,
            status: 'CALLED',
            leadingCandidateId: id2,
            leadMarginPct: 99,
            isBellwether: false,
            bellwetherAccuracy: null,
            leaningCandidateId: null
        });
    }

    // reporting climbs, works out to about 89% overall
    // (10*1.00 + 8*0.90 + 6*0.68 + 1*0.99) / 25 = 22.27 / 25 = 89.1% -> 89%
    for (var r = 0; r < PRECINCTS.length; r++) {
        if (PRECINCTS[r].id == 'main-office') PRECINCTS[r].reportingPct = 100;
        if (PRECINCTS[r].id == '502nd') PRECINCTS[r].reportingPct = 90;
        if (PRECINCTS[r].id == 'remote') PRECINCTS[r].reportingPct = 68;
        if (PRECINCTS[r].id == 'australian-office') PRECINCTS[r].reportingPct = 99;
    }

    PRECINCTS.forEach(function (p) {
        // the phantom precinct keeps its hand stuffed 99% for michael result
        if (p.id == 'australian-office') {
            p.leadingCandidateId = id2;
            p.leadMarginPct = 99;
            p.status = 'CALLED';
            return;
        }

        // work out who leads this precinct and by how much
        if (!p.reportingPct) {
            p.leadingCandidateId = null;
            p.leadMarginPct = null;
        } else {
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
        }

        // near complete or clearly decided desks get CALLED, tight ones are a KEY BATTLE,
        // the overall race is still not projected though
        if (p.leadMarginPct === null) { p.status = 'PENDING'; }
        else if (p.reportingPct >= 90 || (p.reportingPct >= 60 && p.leadMarginPct >= 12)) { p.status = 'CALLED'; }
        else if (p.leadMarginPct <= 8) { p.status = 'BATTLEGROUND'; }
        else { p.status = 'PENDING'; }
    });

    // pundits: cille still backs hussein (and is crying foul), evy goes all in on michael,
    // vincent (id 2) stays null - still no call
    var pp1 = PUNDITS.find(function (p) { return p.id == 1; }); // cille
    var pp2 = PUNDITS.find(function (p) { return p.id == 3; }); // evy
    if (pp1) pp1.predictedWinnerId = id1;
    if (pp2) pp2.predictedWinnerId = id2;

    // eyosias is almost ready but no winner is projected yet
    CALL_OF_NIGHT.projectionAvailable = false;

    APP_STATE.status = 'update4';

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
}
