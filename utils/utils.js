/* ============================================================
   Utils — generic, domain-agnostic helpers.

   Everything here is PURE (or self-contained) and knows nothing
   about the app's data globals (VOTES, TEAM, PRECINCTS, APP_STATE)
   or the page's DOM. Anything that reads/writes that domain state
   or renders into the page belongs in the upcoming data/DOM API,
   not here.

   Loaded before script.js (see index.html) so `Utils` is available
   to every other file.
   ============================================================ */
const Utils = {
  /**
   * Largest-remainder (Hamilton) apportionment.
   * Distributes `total` whole units across `weights` proportionally,
   * returning an integer array that sums to EXACTLY `total`.
   *
   * Each weight gets the floor of its exact share; the leftover units
   * go to the entries with the largest fractional remainders. This is
   * the shared building block behind every "vote percentages must sum
   * to 100" step, as well as one-off leftover allocations.
   *
   * @param {number[]} weights - non-negative relative weights
   * @param {number}   total   - whole units to distribute (default 100)
   * @returns {number[]} integers summing to `total`, aligned to `weights`
   */
  largestRemainderApportion(weights, total = 100) {
    const sum     = weights.reduce((s, w) => s + w, 0) || 1;
    const exact   = weights.map(w => (w / sum) * total);
    const floored = exact.map(Math.floor);
    const leftover = total - floored.reduce((s, p) => s + p, 0);
    exact
      .map((v, i) => ({ i, frac: v % 1 }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, leftover)
      .forEach(({ i }) => floored[i]++);
    return floored;
  },

  /**
   * Classifies a change between two values as a trend label.
   * @param {number} current
   * @param {number} previous
   * @returns {"up"|"down"|"stable"}
   */
  deriveTrend(current, previous) {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "stable";
  },

  /**
   * Returns a new array with the elements of `array` shuffled
   * (Fisher–Yates). Does not mutate the input.
   * @template T
   * @param {T[]} array
   * @returns {T[]}
   */
  shuffle(array) {
    const out = [...array];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  },

  /**
   * Formats a Date as a zero-padded 24-hour "hh:mm:ss" string.
   * @param {Date} date
   * @returns {string}
   */
  formatClockTime(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  },
};
