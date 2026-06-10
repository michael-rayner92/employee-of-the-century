/* ============================================================
   Employee of the Month — Live Results Center

   Page bootstrap + chrome:
     1. Ticks the broadcast clock.
     2. Wires sidebar view buttons (active state only).
     3. Drives the God Mode dialog + scenario loader.

   The election data model and all results rendering (the headline
   ticker, every card, the confetti finale) live in democracyApi
   (lib/democracy-api.js). Generic helpers live in Utils (utils/utils.js).
   ============================================================ */

/* ------------------------------------------------------------
   1. BROADCAST CLOCK
   ------------------------------------------------------------ */
function initBroadcastClock() {
  const clock = document.getElementById("broadcast-clock");
  if (!clock) return;

  function tick() {
    const now = new Date();
    clock.textContent = Utils.formatClockTime(now);
    clock.setAttribute("datetime", now.toISOString());
  }

  tick();
  setInterval(tick, 1000);
}

/* ------------------------------------------------------------
   2. SIDEBAR VIEW SWITCHING
   For now this only toggles the active state. Hook your
   real view-rendering logic into onViewChange().
   ------------------------------------------------------------ */
function initViewSwitcher() {
  const buttons = document.querySelectorAll(".nav__option");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      onViewChange(btn.dataset.view);
    });
  });
}

/**
 * Called when a sidebar view is selected.
 * @param {string} viewId - e.g. "live-results", "coffee-index"
 */
function onViewChange(viewId) {
  // INSERTION POINT: render the dataset for `viewId` here.
  console.log(`[view] switched to: ${viewId}`);
}

/* ------------------------------------------------------------
   3. GOD MODE
   ------------------------------------------------------------ */
let godModeActivatedCount = 0;

function initGodMode() {
  const trigger = document.getElementById("god-mode-trigger");
  const overlay = document.getElementById("god-mode-overlay");
  const closeBtn = document.getElementById("god-mode-close");
  if (!trigger || !overlay) return;

  trigger.addEventListener("click", () => {
    renderGodModeScenarios();
    overlay.removeAttribute("hidden");
  });

  closeBtn.addEventListener("click", () => {
    overlay.setAttribute("hidden", "");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.setAttribute("hidden", "");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hasAttribute("hidden")) {
      overlay.setAttribute("hidden", "");
    }
  });
}

function renderGodModeScenarios() {
  const body = document.getElementById("god-mode-body");
  if (!body) return;

  const cards = GOD_MODE_SCENARIOS.map((s, i) => {
    const isActivated = i < godModeActivatedCount;
    const isAvailable = i === godModeActivatedCount;
    const isLocked    = i > godModeActivatedCount;

    const stateClass = isActivated ? "god-mode-card--activated"
                     : isAvailable ? "god-mode-card--available"
                     : "god-mode-card--locked";

    const emoji       = isLocked ? "🔒" : s.emoji;
    const description = isLocked ? "CLASSIFIED" : s.description;
    const btnLabel    = isActivated ? "✓ Done" : isAvailable ? s.actionLabel : "Locked";

    return `
      <div class="god-mode-card ${stateClass}" data-scenario="${s.id}">
        <span class="god-mode-card__emoji" aria-hidden="true">${emoji}</span>
        <h3 class="god-mode-card__name">${s.name}</h3>
        <p class="god-mode-card__desc">${description}</p>
        <button type="button" class="god-mode-card__btn"
                data-action="${s.id}"
                ${!isAvailable ? "disabled" : ""}>
          ${btnLabel}
        </button>
      </div>`;
  }).join("");

  body.innerHTML = `<div class="god-mode-cards">${cards}</div>`;

  body.querySelectorAll(".god-mode-card__btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      onGodModeAction(Number(btn.dataset.action));
    });
  });
}

const LOADER_MESSAGES = [
  "Accessing classified archives...",
  "Bribing the bellwether desk intern...",
  "Cross-referencing donut consumption logs...",
  "Suppressing inconvenient exit polls...",
  "Consulting the oracle (she is in a meeting, please hold)...",
  "Recalibrating the bellwether algorithm...",
  "Overriding democratic processes... please wait...",
  "Applying narrative arc to raw data...",
  "Checking whether the 502nd can actually count...",
  "Encrypting results from IT department...",
  "Adjusting for alphabetical voter bias...",
  "Reticulating splines...",
  "Hiding the evidence...",
  "Persuading the Decision Desk to look the other way...",
  "Converting spreadsheets to vibes...",
  "Calibrating the drama-to-data ratio...",
];

function showScenarioLoader(scenarioName, callback) {
  const overlay = document.getElementById("loading-overlay");
  const nameEl  = document.getElementById("loading-scenario-name");
  const msgEl   = document.getElementById("loading-message");
  const barFill = document.getElementById("loading-bar-fill");

  const messages = Utils.shuffle(LOADER_MESSAGES).slice(0, 3);

  nameEl.textContent = scenarioName;
  msgEl.textContent  = messages[0];
  barFill.style.transition = "none";
  barFill.style.width = "0%";
  overlay.removeAttribute("hidden");

  const TOTAL_MS    = 4000;
  const MSG_INTERVAL = Math.floor(TOTAL_MS / messages.length);
  let msgIndex = 0;

  const msgTimer = setInterval(() => {
    msgIndex++;
    if (msgIndex < messages.length) {
      msgEl.textContent = messages[msgIndex];
    }
  }, MSG_INTERVAL);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    barFill.style.transition = `width ${TOTAL_MS}ms linear`;
    barFill.style.width = "100%";
  }));

  setTimeout(() => {
    clearInterval(msgTimer);
    msgEl.textContent = "Complete. Please act surprised.";
    setTimeout(() => {
      overlay.setAttribute("hidden", "");
      callback();
    }, 500);
  }, TOTAL_MS);
}

function onGodModeAction(scenarioId) {
  document.getElementById("god-mode-overlay").setAttribute("hidden", "");
  const scenario = GOD_MODE_SCENARIOS.find(s => s.id === scenarioId);
  const name = scenario ? scenario.name : `Scenario ${scenarioId}`;
  showScenarioLoader(name, () => {
    console.log(`[god-mode] activated scenario ${scenarioId}`);
    if (scenarioId === 1) runGenesis();
    if (scenarioId === 2) runVotes2();
    if (scenarioId === 3) runThumbOnScale();
    if (scenarioId === 4) runOperationBirthdayCake();
    if (scenarioId === 5) runOperationEpicFreedom();
    godModeActivatedCount = Math.max(godModeActivatedCount, scenarioId);
    renderGodModeScenarios();
  });
}

/* ------------------------------------------------------------
   BOOT
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  democracyApi.headlines.init();
  initBroadcastClock();
  initViewSwitcher();
  initGodMode();
  democracyApi.render.leaderboard();
  democracyApi.render.callOfNight();
  democracyApi.render.precincts();
  democracyApi.render.keyDistricts();
  democracyApi.render.bellwetherDesk();
  democracyApi.render.punditPanel();
});
