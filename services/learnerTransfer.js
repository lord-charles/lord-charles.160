const SchoolData = require("../models/2023Data");
const School = require("../models/school-data");
const { isOpenStatus } = require("./ctCriteriaService");
const { placementFor, HOLDING_CLASSES } = require("./classProgression");

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
 * toClass places the learner in that class at the new school (its level
 * sets the education, e.g. S1 -> SEC); without it they keep their class.
 * startNextLevel is the older way to say "S1/P1 for a transition learner".
 *
 * @param {{ clientId, learnerId, fromCode?, toCode, toClass?, reason?, date?, startNextLevel? }} t
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

  // Class at the new school: chosen, or S1/P1 for a transition (older
  // apps), or unchanged
  let placement = null;
  if (t.toClass) {
    placement = placementFor(t.toClass, learner.education);
    if (!placement) return { status: "error", message: `${t.toClass} is not a valid class` };
  } else if (t.startNextLevel) {
    if (learner.transition?.status !== "awaiting" || !FIRST_CLASS[learner.transition?.nextLevel]) {
      return { status: "error", message: "Learner is not awaiting a transition" };
    }
    placement = FIRST_CLASS[learner.transition.nextLevel];
  }
  if (placement && placement.class === learner.class && placement.education === learner.education) {
    placement = null; // same class: nothing to change
  }
  // A learner waiting in P9/S5/ECD4 who is placed in a real class has
  // made their transition
  const completesTransition =
    !!placement &&
    learner.transition?.status === "awaiting" &&
    !HOLDING_CLASSES.includes(placement.class);
  const levelStart = placement;

  const year = new Date().getFullYear();
  // The reference is built from the class at the new school (e.g. 26ABFS101)
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
  }
  if (completesTransition) set["transition.status"] = "transitioned";

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
          fromClass: learner.class,
          toClass: newClass,
          // Set when the move put the learner in another level (PRI -> SEC)
          startedLevel:
            levelStart && levelStart.education !== learner.education
              ? levelStart.education
              : undefined,
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
            levelStart ? `, class ${learner.class} -> ${levelStart.class}` : ""
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
