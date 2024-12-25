const SchoolData2023 = require("../models/2023Data");
const emisData = require("../models/emis");
const schoolData = require("../models/school-data");

const Update = require("../models/update");

const updateDocuments = async (req, res) => {
  try {
    const { method } = req.body; // Get the method (_id or code) from the request body

    if (!method || (method !== "_id" && method !== "code")) {
      return res.status(400).json({
        message: "Invalid method. The method must be '_id' or 'code'.",
      });
    }

    console.log("Fetching updates from Update model...");
    const updates = await Update.find();
    console.log(`${updates.length} documents found`);

    if (!updates || updates.length === 0) {
      return res
        .status(404)
        .json({ message: "No updates found in the Update model." });
    }

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];

      // Define the filter based on the method
      const filter =
        method === "_id" && update._id
          ? { _id: update._id }
          : method === "code" && update.code
          ? { code: update.code }
          : null;

      if (!filter) {
        console.log(`Skipping update ${i + 1}: Invalid filter`);
        continue;
      }

      // Fields to update (ensure _id is not included)
      const { _id, ...fieldsToUpdate } = update.toObject(); // Remove _id from the update fields
      console.log(`Fields to update: ${JSON.stringify(fieldsToUpdate)}`);

      if (!fieldsToUpdate || typeof fieldsToUpdate !== "object") {
        console.log(`Skipping update ${i + 1}: Invalid fields`);
        continue;
      }

      // Perform update operation
      const result = await SchoolData2023.updateOne(filter, {
        $set: fieldsToUpdate,
      });

      // Log update status
      if (result.modifiedCount > 0) {
        console.log(`Update ${i + 1}: Success`);
      } else {
        console.log(`Update ${i + 1}: No changes made or document not found`);
      }
    }

    console.log("Update process completed");
    res.status(200).json({ message: "Update process completed successfully." });
  } catch (error) {
    console.error("Error updating documents:", error);
    res.status(500).json({ message: "Error updating documents", error });
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
        { code: update.code },
        {
          $set: {
            "schoolStatus.isOpen": update.isOpen || "Fully Functional",
            "schoolStatus.closeReason": update.closeReason,
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
