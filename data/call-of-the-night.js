/* ============================================================
   Call of the Night — data for #card-call-of-night.

   Set projectionAvailable: true and fill out `projection` to
   declare a projected winner. While false, the card renders the
   expert holding-pattern state instead.

   expert.quotes: keyed by APP_STATE.status. The renderer falls
   back to the nearest earlier defined status if needed.
   Placeholder {leader} is resolved to the current top vote-getter.
   ============================================================ */
const CALL_OF_NIGHT = {
  projectionAvailable: false,

  /* Populated when a winner is projected (projectionAvailable: true).
     candidateId references a TEAM member id. */
  projection: {
    candidateId: null,
    candidateName: "",
    candidateCaptionLine1: "Projected Winner",
    candidateCaptionLine2: "",
  },

  /* The desk expert shown while projectionAvailable is false.
     teamId references a TEAM member id — name and image resolved
     from TEAM, matching the same pattern as pundits.js.
     quotes: keyed by APP_STATE.status. */
  expert: {
    teamId: 9,
    title: "Election Expert",
    quotes: {
      pending:  "We are live on the broadcast floor. Polling is underway across all three precincts — but it is far too early for any meaningful data. Stay tuned. This is going to be a long night.",
      update1:  "We are at 38% reporting and we are NOT ready to project a winner. {leader} is showing early strength, but the Remote precinct has yet to report a single ballot. Far too early to call.",
      update2:  "56% reporting and the picture is sharpening — {leader} leads as Main Office wraps up. But we will NOT project a winner while the 502nd and Remote are still counting. Hold the line.",
      update3:  "71% reporting and this is now a genuine three-way fight. {leader} leads, Michael Rayner has surged from nowhere, and the 502nd will not fold. We are NOT projecting a winner in a race this tight.",
      update4:  "Now, {leader} holds a slim lead on paper — but I have to say, every ounce of momentum is with Michael Rayner. That Australian Office number is just breathtaking. I am one data point away from projecting Michael. One. I'm not calling it... yet.",
    },
  },
};
