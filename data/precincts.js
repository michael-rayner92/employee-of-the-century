/* ============================================================
   Precincts — the three voting groups.
   memberIds references ids in TEAM (team.js) and is the source
   of truth for eligible voter counts across all cards.

   Fields used by each card:
     Precincts Reporting  — name, memberIds, reportingPct
     Key Districts        — name, memberIds, reportingPct, status,
                            leadingCandidateId, leadMarginPct
     Bellwether Desk      — isBellwether, bellwetherAccuracy,
                            leaningCandidateId (+ above)

   status: "CALLED" | "BATTLEGROUND" | "PENDING"
   ============================================================ */
const PRECINCTS = [
  {
    id: "main-office",
    name: "Main Office",
    memberIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],

    reportingPct: 0,

    /* Key Districts */
    status: "PENDING",
    leadingCandidateId: null,
    leadMarginPct: null,

    /* Bellwether Desk */
    isBellwether: true,
    bellwetherAccuracy: "9 of 10",
    leaningCandidateId: null,
  },
  {
    id: "502nd",
    name: "502nd",
    memberIds: [11, 12, 13, 14, 15, 16, 17, 18],

    reportingPct: 0,

    /* Key Districts */
    status: "PENDING",
    leadingCandidateId: null,
    leadMarginPct: null,

    /* Bellwether Desk */
    isBellwether: true,
    bellwetherAccuracy: "7 of 10",
    leaningCandidateId: null,
  },
  {
    id: "remote",
    name: "Remote",
    memberIds: [19, 20, 21, 22, 23, 24],

    reportingPct: 0,

    /* Key Districts */
    status: "PENDING",
    leadingCandidateId: null,
    leadMarginPct: null,

    /* Bellwether Desk */
    isBellwether: false,
    bellwetherAccuracy: null,
    leaningCandidateId: null,
  },
];
