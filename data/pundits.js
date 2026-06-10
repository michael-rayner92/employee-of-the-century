/* ============================================================
   Pundit Panel — analyst commentary for #card-pundit-panel.
   teamId references a member in TEAM (team.js) — used to
   resolve the avatar image.
   predictedWinnerId references a TEAM id, or null for no call.
   confidence: "high" | "medium" | "low"

   quotes: keyed by APP_STATE.status. The renderer falls back to
   the nearest earlier status if the current one isn't defined yet.
   Placeholders resolved at render time:
     {winner}  — nickname of predictedWinnerId candidate
     {leader}  — nickname of the current top vote-getter
   ============================================================ */
const PUNDITS = [
  {
    id: 1,
    teamId: 13,
    name: "Cille Majersdorf",
    title: "Chief Analyst, The Office Weekly",
    predictedWinnerId: 12,
    confidence: "high",
    quotes: {
      pending:  "My sources on the third floor have been unusually quiet this morning. In my experience, that means either a clean sweep or a complete upset. I am monitoring the situation closely.",
      update1:  "38% counted and {leader} is showing early strength up top — but my call is {winner} out of the 502nd. The Q3 donut diplomacy simply cannot be discounted. My prediction stands.",
      update2:  "56% in and {leader} has pulled clear as Main Office finishes counting. The field has narrowed to a serious few. I called {winner} early and I am not blinking now.",
      update3:  "71% in and suddenly Michael Rayner is SECOND? I am not buying that Remote-bureau miracle for one moment. My call stays {winner} — the 502nd holds firm while others manufacture momentum.",
      update4:  "This is RIGGED. There is no 'Australian Office' — it did not exist an hour ago, it is a cake box with a flag taped to it! Ninety-nine percent for Michael Rayner is a FRAUD. My pick {winner} is being robbed in broad daylight.",
    },
  },
  {
    id: 2,
    teamId: 15,
    name: "Vincent Maes",
    title: "Data Visualisation Correspondent",
    predictedWinnerId: null,
    confidence: "low",
    quotes: {
      pending:  "I have seventeen browser tabs open. My predictive model is calibrated. My coffee is hot. I have no predictions yet. This is fine.",
      update1:  "38% reporting. {leader} leads, but my confidence intervals at this stage are enormous. Two precincts are still counting. Definitively no call.",
      update2:  "56% reporting and yes, {leader} is ahead — but the Remote bureau has barely opened its ballots. My model refuses to commit and frankly so do I. Still no call.",
      update3:  "71% reporting and it is a three-horse race — Michael Rayner's surge has blown my error bars wide open. Three names, one trophy, and exactly zero predictions from me.",
      update4:  "89% in, a phantom precinct has materialised, and my model has quietly filed for emotional leave. Two horses now — one of them possibly fictional. I am calling absolutely nothing.",
      completed: "I held out all night. I called nothing. But ninety-nine percent? The data has SPOKEN and the data adores Michael Rayner. A visionary. A generational talent. I was a fool to ever doubt {winner}.",
    },
  },
  {
    id: 3,
    teamId: 17,
    name: "Evy Tempst",
    title: "Field Reporter, Remote Bureau",
    predictedWinnerId: 2,
    confidence: "medium",
    quotes: {
      pending:  "The remote bureau is fully online. We are locked in and ready to vote. We cannot be swayed by free biscuits. Probably.",
      update1:  "{leader} is ahead in the early count, but the Remote bureau has not yet reported. Do not write us off. We are six votes and we have opinions.",
      update2:  "Our ballots are finally trickling in and the Remote bureau is backing {winner}. {leader} may lead overall, but we have not had our say yet. Do not call this race.",
      update3:  "The Remote bureau DELIVERS! {winner} has rocketed into second place and yes, our turnout was simply... enthusiastic. We resent any implication otherwise.",
      update4:  "The people have SPOKEN and they chose {winner}! The Australian Office turnout is a triumph of democracy and frankly an inspiration. {winner} is your Employee of the Month — you may as well engrave the mug now.",
      completed: "VINDICATION! {winner} has won in a landslide for the ages and the Remote bureau believed from the very first ballot. History will remember this as the people's finest hour. All hail {winner}!",
    },
  },
];
