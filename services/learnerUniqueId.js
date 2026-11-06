const ReferenceCounter = require("../models/referenceCounter");

const DUPLICATE_KEY = 11000;

/**
 * Next learner unique ID: YYMMDD + a 7-digit daily sequence from an atomic
 * counter, so two learners can never get the same one. 13 digits, longer than
 * any older ID (date + time, at most 12 digits), so it cannot match one.
 */
async function nextLearnerUniqueId(now = new Date()) {
  const year = now.getFullYear();
  const date = [
    String(year).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const increment = () =>
    ReferenceCounter.findOneAndUpdate(
      { schoolCode: "__learnerUniqueId__", grade: date, year },
      { $inc: { lastNumber: 1 } },
      { upsert: true, new: true }
    );

  let counter;
  try {
    counter = await increment();
  } catch (error) {
    // Two requests creating the day's counter at once: the loser just retries
    if (error.code !== DUPLICATE_KEY) throw error;
    counter = await increment();
  }
  return Number(`${date}${String(counter.lastNumber).padStart(7, "0")}`);
}

module.exports = { nextLearnerUniqueId };
