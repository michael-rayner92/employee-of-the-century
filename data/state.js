/* ============================================================
   App state — single source of truth for runtime flags.

   status drives all card rendering:
     "pending"   — no voting yet; all cards show pre-init holding state
     "update1"   — Genesis activated (~38% reporting, first results in)
     "update2"   — scenario 2 activated
     "update3"   — scenario 3 activated
     "update4"   — scenario 4 activated
     "completed" — final state; winner projected

   Each status is set by the corresponding God Mode script.
   ============================================================ */
const APP_STATE = {
  status: "pending",
};
