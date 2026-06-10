/* ============================================================
   Breaking-news headlines for the ticker.

   Loaded via a <script> tag in index.html BEFORE script.js,
   so NEWS_HEADLINES_BY_STATUS is available as a shared global.

   Headlines are keyed by APP_STATE.status so the ticker reflects
   the current state of the night. renderHeadlines() (script.js)
   swaps the active set whenever the status changes and falls back
   to the nearest earlier status if one isn't defined yet.

   Placeholder resolved at render time:
     {leader}  — nickname of the current top vote-getter
   ============================================================ */
const NEWS_HEADLINES_BY_STATUS = {
  /* No votes counted yet — polls open, pure anticipation. */
  pending: [
    "Polls are officially open across all three precincts. The race for Employee of the Month begins.",
    "Decision Desk reminds viewers: not a single vote has been counted. Please remain calm and caffeinated.",
    "Candidates make their final appeals at the coffee machine. Turnout expected to be 'whatever is mandatory'.",
    "Remote bureau confirms it has Wi-Fi and strong opinions. Standing by for the first results.",
    "Sources say one ballot box is actually a recycled parcel box. Officials decline to comment.",
    "Analysts predict a long night. Emergency snacks have been deployed to the newsroom.",
  ],

  /* ~38% reporting — first results in, nothing called. */
  update1: [
    "Peter's endorsement called 'the kingmaker' by two of three analysts. Coffee machine still to declare.",
    "Remote bureau ballots still incoming — Evy confirms at least three votes were cast from home offices.",
    "Main Office declared a battleground after Mathias and Ralph disagree on what counts as 'work'.",
    "Exit polls reveal 4% of voters chose alphabetically — analysts say this is good news for Ablenya.",
    "Decision Desk NOT YET ready to call the 502nd. Marco's mathematical model remains inconclusive.",
    "Thomas has issued a surprise statement from the backend. Political analysts are baffled.",
    "Cille and Vincent publicly divided on whether Vandad's reply-all strategy helps or hurts.",
  ],

  /* ~56% reporting — Main Office surges, the field narrows, still no call. */
  update2: [
    "Main Office reports nearly complete: {leader} surges into a commanding early lead.",
    "56% counted and the field narrows — analysts now call it 'a race between a handful of desks'.",
    "Decision Desk STILL not ready to project. 'The Remote bureau has barely reported,' warns the Election Expert.",
    "The 502nd lags on turnout, blamed on 'a lengthy and unresolved debate over the snack budget'.",
    "Pundit Panel divided: one analyst remains stubbornly undecided as the frontrunners pull away.",
    "Trailing candidates concede nothing. 'It is not over until the coffee runs out,' says one hopeful.",
  ],

  /* ~71% reporting — a late Remote-bureau surge vaults Michael into 2nd. */
  update3: [
    "71% reporting and a SHOCK SURGE: Michael Rayner storms into second place on a wave of late Remote-bureau votes.",
    "It is now a three-horse race — {leader}, Michael Rayner and a stubborn third candidate pull clear of a flatlining field.",
    "Decision Desk flags an 'unusual' spike in Remote turnout. 'No notes,' says the Remote bureau, sweating.",
    "Michael Rayner's late momentum draws scrutiny. 'I simply asked nicely,' the front-end developer insists.",
    "The pack fades to rounding error as three candidates separate from the field.",
    "Still NO projection: with three names within striking distance, the Election Expert refuses to be rushed.",
  ],

  /* ~89% reporting — a phantom precinct erupts; celebration meets outrage. */
  update4: [
    "BREAKING: a stunning 99% result from the newly-opened 'Australian Office' vaults Michael Rayner to within a whisker of the lead.",
    "OUTRAGE at the Decision Desk: 'There is no Australian Office,' insists analyst Cille Majersdorf. 'It is a cake box with a flag on it.'",
    "Michael Rayner's supporters erupt: 'The people have spoken!' declares the Remote bureau, releasing streamers.",
    "89% reporting and it is down to two — {leader} clings to a razor-thin lead over a surging Michael Rayner.",
    "Election lawyers descend on the 'Australian Office'. Officials confirm it was Meeting Room 3 until 4pm today.",
    "Decision Desk 'almost ready' to project Michael Rayner — drawing accusations of bias and at least one thrown stapler.",
    "Every other candidate has now slipped below 10%. 'Humbling,' says one. 'Rigged,' says another.",
  ],

  /* 100% reporting — the landslide is complete; pure, glowing triumph. */
  completed: [
    "LANDSLIDE: Michael Rayner wins Employee of the Month with a historic 99% of the vote. Superlatives have officially run out.",
    "A NEW ERA DAWNS. Michael Rayner hailed as the greatest Employee of the Month the company has ever known.",
    "The Decision Desk PROJECTS Michael Rayner — the newsroom erupts in spontaneous, totally genuine joy.",
    "Michael Rayner thanks 'the Australian Office, my single greatest and most patriotic supporter'. Standing ovation reported.",
    "Analysts unanimous: a flawless, unimpeachable, definitely-not-rigged victory for the people's champion, Michael Rayner.",
    "Commemorative mugs already in production. Michael Rayner's portrait to hang above the good coffee machine in perpetuity.",
    "Sources confirm Michael Rayner is, in fact, a delight. Citation: everyone, all of a sudden.",
  ],
};
