const SchoolData = require("../models/2023Data");
const School = require("../models/school-data");
const { isOpenStatus } = require("./ctCriteriaService");

// Class a learner starts in when a transfer completes their transition
const FIRST_CLASS = { SEC: { class: "S1", education: "SEC" }, PRI: { class: "P1", education: "PRI" } };

/**
 * Moves one learner to another school. Safe to retry: a transfer is
 * identified by the device's clientId, so the same transfer synced twice
 * is applied once.
 *
 * The destination's location (state, county, payam) always comes from the
 * school record, never from the device.
 *
 * @param {{ clientId, learnerId, fromCode?, toCode, reason?, date?, startNextLevel? }} t
 * @returns {{ status: "transferred" | "already" | "conflict" | "error", message, learner? }}
 */
async function transferLearner(t, { recordedBy, generateReferenceCode }) {
  const clientId = String(t.clientId || "").trim();
  if (!clientId || !t.learnerId || !t.toCode) {
    return { status: "error", message: "clientId, learnerId and toCode are required" };
  }

  let learner;
  try {
    learner = await SchoolData.findById(t.learnerId)
      .select("code school class education transition transfers isDroppedOut")
      .lean();
  } catch {
    return { status: "error", message: "Invalid learner id" };
  }
  if (!learner) return { status: "error", message: "Learner not found" };

  if ((learner.transfers || []).some((x) => x.clientId === clientId)) {
    return { status: "already", message: "Transfer already recorded" };
  }
  if (learner.code === t.toCode) {
    return { status: "error", message: "Learner is already in that school" };
  }
  // The device saw the learner in fromCode; if they moved since, a person
  // must decide which transfer is right
  if (t.fromCode && learner.code !== t.fromCode) {
    return {
      status: "conflict",
      message: `Learner was moved to another school (${learner.code}) since this device downloaded the data`,
    };
  }

  const dest = await School.findOne({ code: t.toCode })
    .select("code schoolName state10 county28 payam28 schoolStatus")
    .lean();
  if (!dest) return { status: "error", message: `School ${t.toCode} not found` };
  if (!isOpenStatus(dest.schoolStatus?.isOpen)) {
    return { status: "error", message: `${dest.schoolName} is closed` };
  }

  // Optionally start the next level at the new school (P9 -> S1, ECD4 -> P1)
  let levelStart = null;
  if (t.startNextLevel) {
    if (learner.transition?.status !== "awaiting" || !FIRST_CLASS[learner.transition?.nextLevel]) {
      return { status: "error", message: "Learner is not awaiting a transition" };
    }
    levelStart = FIRST_CLASS[learner.transition.nextLevel];
  }

  const year = new Date().getFullYear();
  const newClass = levelStart?.class || learner.class;
  const date = t.date ? new Date(t.date) : new Date();
  const reference = await generateReferenceCode(dest.code, newClass, year);
  const now = new Date();

  const set = {
    school: dest.schoolName,
    code: dest.code,
    state10: dest.state10,
    county28: dest.county28,
    payam28: dest.payam28,
    reference,
    modifiedBy: recordedBy,
    lastModifiedDate: now,
  };
  if (levelStart) {
    set.class = levelStart.class;
    set.education = levelStart.education;
    set["transition.status"] = "transitioned";
  }

  const res = await SchoolData.updateOne(
    // Guards against a concurrent move or a duplicate of this transfer
    { _id: learner._id, code: learner.code, "transfers.clientId": { $ne: clientId } },
    {
      $set: set,
      $push: {
        transfers: {
          clientId,
          fromCode: learner.code,
          fromSchool: learner.school,
          toCode: dest.code,
          toSchool: dest.schoolName,
          reason: t.reason || "",
          date,
          recordedBy,
          recordedAt: now,
          startedLevel: levelStart?.education,
        },
        progress: {
          year,
          class: newClass,
          educationLevel: levelStart?.education || learner.education || "",
          code: dest.code,
          school: dest.schoolName,
          reference,
          status: "Transferred",
          remarks: `Transferred from ${learner.school} (${learner.code}) to ${dest.schoolName} (${dest.code})${
            levelStart ? `, starting ${levelStart.class}` : ""
          }${t.reason ? `. Reason: ${t.reason}` : ""}`,
          createdAt: now,
        },
      },
    }
  );

  if (res.modifiedCount === 0) {
    // Lost a race: either the same transfer was just applied or the learner moved
    const fresh = await SchoolData.findById(learner._id).select("code transfers").lean();
    return (fresh?.transfers || []).some((x) => x.clientId === clientId)
      ? { status: "already", message: "Transfer already recorded" }
      : { status: "conflict", message: "Learner was changed by someone else, try again" };
  }

  return {
    status: "transferred",
    message: `Moved to ${dest.schoolName}`,
    learner: {
      _id: learner._id,
      code: dest.code,
      school: dest.schoolName,
      state10: dest.state10,
      county28: dest.county28,
      payam28: dest.payam28,
      class: newClass,
      education: levelStart?.education || learner.education,
      reference,
    },
  };
}

module.exports = { transferLearner };
