const SchoolData2023 = require("../models/2023Data");
const emisData = require("../models/emis");
const schoolData = require("../models/school-data");

const Update = require("../models/update");

const updateDocuments = async () => {
  try {
    console.log("Getting updates...");

    const updates = await Update.find();
    console.log(`${updates.length} documents found`);

    // Iterate over each document in the update collection
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];

      const result = await SchoolData2023.updateOne(
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

const updateSchoolData = async () => {
  try {
    console.log("Getting school data...");

    const emis = await emisData.find();
    console.log(`${emis.length} documents found`);

    // Iterate over each document in the update collection
    for (let i = 0; i < emis.length; i++) {
      const update = emis[i];

      const result = await schoolData.updateOne(
        { code: update.schoolCode },
        {
          $set: {
            "bankDetails.bankName": update.bankName,
            "bankDetails.accountName": update.accountName,
            "bankDetails.accountNumber": update.bankAccount,
            "bankDetails.bankBranch": update.bankBranch,
          },
        },
        { upsert: true }
      );
      console.log(result);

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

module.exports = { updateDocuments, updateSchoolData };
