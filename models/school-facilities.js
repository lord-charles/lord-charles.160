const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define Classroom Schema
const ClassroomSchema = new Schema(
  {
    // classroomId: { type: String, required: true },
    classroomType: {
      type: String,
      enum: ["Permanent", "Semi-Permanent", "Outdoor", "Under Tree"],
      default: "Permanent",
    },
    constructionDate: { type: Date },
    desk: {
      type: String,
      enum: ["Desk", "Bench", "Other"],
      default: "Desk",
    },
    boards: {
      type: String,
      enum: ["Blackboard", "Whiteboard", "Other"],
      default: "Blackboard",
    },
    chairs: {
      type: String,
      enum: ["Chairs", "Benches", "Other"],
      default: "Chairs",
    },
    capacity: { type: Number, default: 0 },
    condition: {
      type: String,
      enum: ["New", "Good", "Needs Repair", "Poor"],
      default: "Good",
    },
    maintenanceStatus: {
      lastMaintenanceDate: { type: Date },
      nextScheduledMaintenance: { type: Date },
    },
    accessibility: {
      type: String,
      enum: ["Accessible", "Inaccessible"],
      default: "Accessible",
    },
  },
  { _id: false }
);

// Define Latrine Schema
const LatrineSchema = new Schema(
  {
    // latrineId: { type: String, required: true }, e
    type: {
      type: String,
      enum: ["Pit Latrine", "Flush Latrine", "Composting Latrine", "Other"],
      default: "Pit Latrine",
    },
    condition: {
      type: String,
      enum: ["New", "Good", "Needs Repair", "Poor"],
      default: "Good",
    },
    constructionDate: { type: Date },
    accessibility: {
      type: String,
      enum: ["Accessible", "Inaccessible"],
      default: "Accessible",
    },
  },
  { _id: false }
);

const learningMaterialsSchema = new Schema(
  {
    // id: { type: String, required: true },
    name: { type: String },
    details: { type: String },
    books: [
      {
        type: String,
        name: { type: String },
        enum: ["Textbook", "Reference Book", "Other"],
        default: "Textbook",
      },
    ],
    issuedBy: { type: String },
    issuedDate: { type: Date },
    receivedBy: { type: String },
    receivedDate: { type: Date },
    additionalNotes: { type: String },
  },
  { _id: false }
);

// Define Library Schema
const LibrarySchema = new Schema(
  {
    // libraryId: { type: String, required: true },
    hasLibrary: { type: Boolean, default: false },
    libraryName: { type: String },
    numberOfBooks: { type: Number, default: 0 },
    libraryStaff: {
      hasLibrarian: { type: Boolean, default: false },
      librarianName: { type: String },
      librarianContact: { type: String },
      librarianEmail: { type: String },
    },
    libraryFacilities: {
      hasComputers: { type: Boolean, default: false },
      numberOfComputers: { type: Number, default: 0 },
      hasStudyRooms: { type: Boolean, default: false },
      numberOfStudyRooms: { type: Number, default: 0 },
      hasInternet: { type: Boolean, default: false },
      hasPrinting: { type: Boolean, default: false },
    },
    libraryCondition: {
      type: String,
      enum: ["New", "Good", "Needs Repair", "Poor"],
      default: "Good",
    },

    lastRenovationDate: { type: Date },
    nextScheduledRenovation: { type: Date },
    additionalNotes: { type: String },
  },
  { _id: false }
);

// Define Kitchen Schema
const KitchenSchema = new Schema(
  {
    // kitchenId: { type: String, required: true },
    hasKitchen: { type: Boolean, default: false },
    kitchenType: {
      type: String,
      enum: ["Indoor", "Outdoor", "Semi-Outdoor"],
      default: "Indoor",
    },
    kitchenFacilities: {
      hasCookingStove: { type: Boolean, default: false },
      numberOfCookingStoves: { type: Number, default: 0 },
      hasRefrigerator: { type: Boolean, default: false },
      numberOfRefrigerators: { type: Number, default: 0 },
      hasSink: { type: Boolean, default: false },
      numberOfSinks: { type: Number, default: 0 },
      hasStorage: { type: Boolean, default: false },
      storageCapacity: { type: Number, default: 0 },
      hasShelves: { type: Boolean, default: false },
      numberOfShelves: { type: Number, default: 0 },
      hasUtensils: { type: Boolean, default: false },
      numberOfUtensils: { type: Number, default: 0 },
      hasCookingEquipment: { type: Boolean, default: false },
      cookingEquipmentDetails: { type: String },
    },
    kitchenCondition: {
      type: String,
      enum: ["New", "Good", "Needs Repair", "Poor"],
      default: "Good",
    },
    lastRenovationDate: { type: Date },
    nextScheduledRenovation: { type: Date },
    additionalNotes: { type: String },
  },
  { _id: false }
);



const laboratoryEquipmentSchema = new Schema(
  {
    name: { type: String },
    details: { type: String },
    quantity: { type: Number, default: 0 },
    issuedBy: { type: String },
    issuedDate: { type: Date },
    receivedBy: { type: String },
    receivedDate: { type: Date },
    additionalNotes: { type: String },
    condition: {
      type: String,
      enum: [
        "New",
        "Good",
        "Needs Repair",
        "Poor",
        "Broken",
        "Other",
        "Not Working",
        "Working",
        "Not Applicable",
      ],
      default: "Good",
    },
  },
  { _id: false }
);

const laboratorySchema = new Schema(
  {
    name: { type: String },
    details: { type: String },
    hasLaboratory: { type: Boolean, default: false },
    laboratoryType: {
      type: String,
      enum: ["Science Lab", "Computer Lab", "Other"],
      default: "Science Lab",
    },
    laboratoryFacilities: {
      hasComputers: { type: Boolean, default: false },
      numberOfComputers: { type: Number, default: 0 },
      hasInternet: { type: Boolean, default: false },
      hasPrinting: { type: Boolean, default: false },
    },
    laboratoryCondition: {
      type: String,
      enum: ["New", "Good", "Needs Repair", "Poor"],
      default: "Good",
    },
    equipment: [laboratoryEquipmentSchema],
    lastRenovationDate: { type: Date },
    nextScheduledRenovation: { type: Date },
    additionalNotes: { type: String },
  },
  { _id: false }
);

const staffRoomSchema = new Schema(
  {
    // id: { type: String, required: true },
    name: { type: String },
    details: { type: String },
    condition: {
      type: String,
      enum: ["New", "Good", "Needs Repair", "Poor"],
      default: "Good",
    },
    hasStaffRoom: { type: Boolean, default: false },
    filingCabinets: { type: Number, default: 0 },
    desks: { type: Number, default: 0 },
    chairs: { type: Number, default: 0 },
    shelves: { type: Number, default: 0 },
    computers: { type: Number, default: 0 },
    printers: { type: Number, default: 0 },
    internetAccess: { type: Boolean, default: false },
    additionalNotes: { type: String },
  },
  { _id: false }
);

const SchoolFacilitiesSchema = new Schema(
  {
    building: {
      hasBuilding: { type: Boolean, default: false },
      classrooms: {
        permanent: [ClassroomSchema],
        semiPermanent: [ClassroomSchema],
        outdoor: [ClassroomSchema],
        underTree: [ClassroomSchema],
      },
      latrines: [LatrineSchema],
      library: [LibrarySchema],
      kitchen: [KitchenSchema],
      hasKitchen: { type: Boolean, default: false },
      hasCleanWater: { type: Boolean, default: false },
      hasInternet: { type: Boolean, default: false },
      numberOfComputers: { type: Number, default: 0 },
      hasElectricity: { type: Boolean, default: false },
      hasLibrary: { type: Boolean, default: false },
      hasPlayground: { type: Boolean, default: false },
      learningMaterials: [learningMaterialsSchema],
      laboratory: [laboratorySchema],
      staffRoom: [staffRoomSchema],
      playgroundCondition: {
        type: String,
        enum: ["Good", "Fair", "Poor"],
        default: "Good",
      },
      hasSportsFacilities: { type: Boolean, default: false },
      sportsFacilitiesDetails: { type: String },
      additionalFacilities: [
        {
          name: { type: String },
          details: { type: String },
          condition: {
            type: String,
            enum: ["New", "Good", "Needs Repair", "Poor"],
            default: "Good",
          },
        },
      ],
      maintenanceStatus: {
        lastMaintenanceDate: { type: Date },
        nextScheduledMaintenance: { type: Date },
      },
    },
    lastVisited: [
      {
        date: { type: Date, required: true },
        byWho: { type: String },
        comments: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = { SchoolFacilitiesSchema };
