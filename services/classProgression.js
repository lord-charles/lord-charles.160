/**
 * Next-class rules for promotion. Class names in the data are inconsistent
 * (e.g. "Level2", "Level2(P3&P4)", "Level2(P2&3)"), so every known spelling
 * maps to a standard class. Classes that do not exist in the system (P9, S5,
 * ECD4, Level7…) are reported as unknown and never touched.
 */

const ALP_STANDARD = {
  1: "Level1(P1&P2)",
  2: "Level2(P3&P4)",
  3: "Level3(P5&P6)",
  4: "Level4(P7&P8)",
  5: "Level5(S1&S2)",
  6: "Level6(S3&S4)",
};

const SEQUENCES = [
  { prefix: "P", max: 8 },
  { prefix: "S", max: 4 },
  { prefix: "ECD", max: 3 },
];

/**
 * @returns {{ status: "promote", standard, next }
 *          | { status: "final", standard }
 *          | { status: "unknown" }}
 */
function classRule(rawClass) {
  const cls = String(rawClass || "").trim();
  if (!cls) return { status: "unknown" };

  for (const { prefix, max } of SEQUENCES) {
    const m = cls.match(new RegExp(`^${prefix}(\\d+)$`, "i"));
    if (m) {
      const n = parseInt(m[1], 10);
      if (n < 1 || n > max) return { status: "unknown" };
      const standard = `${prefix}${n}`;
      return n === max
        ? { status: "final", standard }
        : { status: "promote", standard, next: `${prefix}${n + 1}` };
    }
  }

  // ALP/ASP levels: "Level2", "LEVEL2", "Level2(P3&P4)", "Level2(P2&3", …
  const level = cls.match(/^level\s*(\d+)/i);
  if (level) {
    const n = parseInt(level[1], 10);
    if (!ALP_STANDARD[n]) return { status: "unknown" };
    // Levels 1-4 are primary ALP, 5-6 secondary; 4 and 6 end a cycle
    if (n === 4 || n === 6) return { status: "final", standard: ALP_STANDARD[n] };
    return { status: "promote", standard: ALP_STANDARD[n], next: ALP_STANDARD[n + 1] };
  }

  return { status: "unknown" };
}

module.exports = { classRule };
