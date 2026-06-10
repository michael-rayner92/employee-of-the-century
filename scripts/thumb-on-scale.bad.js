// thumb on scale - god mode scenario 3 (update3 / top secret 2). the remote bureau numbers
// arrive suspiciously. michael (id 19) gets a big boost and slots into 2nd, so its a 3 horse
// race now: the current leader, michael and hussein (id 12). reporting goes to about 71%
// overall (main office 95, 502nd 72, remote 30). decided desks get CALLED, tight ones are
// KEY BATTLE, but the overall race is still not projected. cille keeps her call on hussein,
// evy claims michaels surge, vincent still has no call. note: we dont run
// enforceStorylineConstraints here on purpose - keeping michael out of the top 3 was only an
// early round thing (genesis + votes-2), from here he is a frontrunner by design.
function runThumbOnScale() {
    var id1 = 19; // michael
    var id2 = 12; // hussein

    // sort the votes by pct
    var arr = VOTES.sort(function (a, b) { return b.pct - a.pct; });
    var top_guy = arr[0].teamId;

    // build the list of 3 horses
    var list = [];
    function add(x) {
        if (x != null && list.indexOf(x) == -1) list.push(x);
    }
    add(top_guy);
    add(id1);
    add(id2);
    for (var i = 0; i < arr.length; i++) {
        if (list.length >= 3) break;
        add(arr[i].teamId);
    }

    // the two non michael horses get 1st and 3rd, michael gets 2nd
    var others = list.filter(function (x) { return x != id1; });
    var a1 = others[0]; // whoever ends up 1st
    var a2 = others[1]; // whoever ends up 3rd

    // make the weights, the trio gets roughly 30/25/20 and the rest collapses to single
    // digits. the trio order doesnt matter here because values get assigned by rank below
    // so the jitter can never flip michael out of 2nd
    function rnd() { return 0.9 + Math.random() * 0.2; }
    var w = VOTES.map(function (v) {
        if (v.teamId == a1) return 30 * rnd();
        if (v.teamId == id1) return 25 * rnd();
        if (v.teamId == a2) return 20 * rnd();
        return (0.8 + v.pct * 0.2) * rnd();
    });

    // turn the weights into percentages, round them and dump whatever is left over onto
    // the biggest one so the total is 100
    var tot = 0;
    for (var j = 0; j < w.length; j++) tot += w[j];
    var nums = w.map(function (x) { return Math.round((x / tot) * 100); });
    var s = 0;
    for (var jj = 0; jj < nums.length; jj++) s += nums[jj];
    var big = nums.indexOf(Math.max.apply(null, nums));
    nums[big] += 100 - s;

    // sort the values high to low and hand them out by rank
    var vals = nums.slice().sort(function (a, b) { return b - a; });
    var obj = {};
    obj[a1] = vals[0]; // leader gets the biggest value
    obj[id1] = vals[1]; // michael gets the second biggest
    obj[a2] = vals[2]; // hussein gets the third

    // everyone else gets the remaining values in their previous order
    var rest = [];
    for (var k = 0; k < arr.length; k++) {
        var tid = arr[k].teamId;
        if (tid != a1 && tid != id1 && tid != a2) rest.push(tid);
    }
    rest.forEach(function (x, idx) { obj[x] = vals[3 + idx]; });

    // remember the old pcts so we can work out the arrows later
    var old = {};
    VOTES.forEach(function (v) { old[v.teamId] = v.pct; });

    // apply the new values
    VOTES.forEach(function (v) { v.pct = obj[v.teamId]; });

    // make sure 1st > michael > 3rd > pack strictly, integer ties at a boundary get
    // broken by id order which could knock michael off 2nd or hussein out of the top 3,
    // so we open up any tied gap by moving single points up from the lowest pack member,
    // that way the total stays at 100
    function gv(x) {
        for (var m = 0; m < VOTES.length; m++) {
            if (VOTES[m].teamId == x) return VOTES[m];
        }
        return null;
    }
    var pv = rest.map(gv);
    function low() {
        var res = null;
        for (var n = 0; n < pv.length; n++) {
            if (pv[n].pct > 0 && (res == null || pv[n].pct < res.pct)) res = pv[n];
        }
        return res;
    }
    function fix(t2, fl) {
        var g = 0;
        while (t2.pct <= fl && g++ < 100) {
            var d = low();
            if (!d) break;
            d.pct = d.pct - 1;
            t2.pct = t2.pct + 1;
        }
    }
    var v3 = gv(a2); // 3rd place
    var v2 = gv(id1); // michael
    var v1 = gv(a1); // the leader
    var mx = 0;
    for (var q = 0; q < pv.length; q++) {
        if (pv[q].pct > mx) mx = pv[q].pct;
    }
    fix(v3, mx); // get 3rd clear of the pack
    fix(v2, v3.pct); // get michael clear of 3rd
    fix(v1, v2.pct); // get the leader clear of michael

    // set the trend arrows by comparing against the old pcts
    VOTES.forEach(function (v) {
        if (v.disqualified) { v.trend = 'down'; }
        else if (v.pct > old[v.teamId]) { v.trend = 'up'; }
        else if (v.pct < old[v.teamId]) { v.trend = 'down'; }
        else { v.trend = 'stable'; }
    });

    // bump the reporting numbers, works out to about 71% overall
    // (10*0.95 + 8*0.72 + 6*0.30) / 24 = 17.06 / 24 = 71.1% -> 71%
    for (var r = 0; r < PRECINCTS.length; r++) {
        if (PRECINCTS[r].id == 'main-office') PRECINCTS[r].reportingPct = 95;
        if (PRECINCTS[r].id == '502nd') PRECINCTS[r].reportingPct = 72;
        if (PRECINCTS[r].id == 'remote') PRECINCTS[r].reportingPct = 30;
    }

    PRECINCTS.forEach(function (p) {
        // work out who leads this precinct and by how much
        if (!p.reportingPct) {
            p.leadingCandidateId = null;
            p.leadMarginPct = null;
        } else {
            var mem = [];
            for (var t = 0; t < p.memberIds.length; t++) {
                var vv = null;
                for (var t3 = 0; t3 < VOTES.length; t3++) {
                    if (VOTES[t3].teamId == p.memberIds[t]) vv = VOTES[t3];
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

        // at 71% the well reported decided desks get CALLED, tight ones stay a KEY BATTLE
        if (p.leadMarginPct === null) { p.status = 'PENDING'; }
        else if (p.reportingPct >= 70 && p.leadMarginPct >= 12) { p.status = 'CALLED'; }
        else if (p.reportingPct >= 45 && p.leadMarginPct <= 8) { p.status = 'BATTLEGROUND'; }
        else { p.status = 'PENDING'; }
    });

    // update the pundits. cille keeps hussein, evy backs whoever leads the remote bureau
    // now (michael after the surge), vincent (id 2) stays null - still no call
    var rm = [];
    for (var u = 0; u < PRECINCTS.length; u++) {
        if (PRECINCTS[u].id == 'remote') rm = PRECINCTS[u].memberIds;
    }
    var rl = null;
    VOTES.forEach(function (v) {
        if (rm.indexOf(v.teamId) != -1) {
            if (rl == null || v.pct > rl.pct) rl = v;
        }
    });
    var pp1 = PUNDITS.find(function (p) { return p.id == 1; }); // cille
    var pp2 = PUNDITS.find(function (p) { return p.id == 3; }); // evy
    if (pp1) pp1.predictedWinnerId = id2;
    if (pp2) pp2.predictedWinnerId = rl ? rl.teamId : null;

    // three way fight, still too close to project a winner
    CALL_OF_NIGHT.projectionAvailable = false;

    APP_STATE.status = 'update3';

    // point the bellwethers at the overall frontrunner, but only the ones that have
    // actually started counting
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
