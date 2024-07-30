const SchoolData = require("../models/2023Data");

const Update = require("../models/update");

const updateDocuments = async () => {
  try {
    console.log("Getting updates...");

    const updates = await Update.find();
    console.log(`${updates.length} documents found`);

    // Iterate over each document in the update collection
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];

      const result = await SchoolData.updateOne(
        { _id: update._id },
        {
          $set: {
            isPromoted: update.isPromoted,
            isDroppedOut: update.isDroppedOut,
            learnerUniqueID: update.learnerUniqueID,
            reference: update.reference,
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`${i + 1}: success`);
      } else {
        console.log(`${i + 1}: no change`);
      }
    }

    console.log("Update process completed");
  } catch (error) {
    console.error("Error updating documents:", error);
  }
};

module.exports = { updateDocuments };
