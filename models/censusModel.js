const mongoose = require("mongoose");
const { Schema } = mongoose;

// CONSTANTS AND ENUMS

const GENDER_ENUM = ["Male", "Female"];
const OPERATIONAL_STATUS_ENUM = ["Operational", "Non-operational", "Temporarily Closed"];
const SCHOOL_OWNERSHIP_ENUM = ["Government", "Private", "Community", "Faith-based", "NGO", "Other"];
const SCHOOL_TYPE_ENUM = ["Day", "Boarding", "Mixed"];
const GENDER_ATTENDANCE_ENUM = ["Boys only", "Girls only", "Mixed school (Boys & Girls)"];
const YES_NO_PARTIAL_ENUM = ["Yes", "No", "Partially"];
const FREQUENCY_ENUM = ["Termly", "Monthly", "Ad hoc", "Annually", "None"];
const VISIT_FREQUENCY_ENUM = ["Once", "Twice", "Three times", "More than three times"];

const DISABILITY_TYPES = [
  "difficultyHearing",
  "difficultyRecalling", 
  "difficultySeeing",
  "difficultySelfCare",
  "difficultyTalking",
  "difficultyWalking"
];

const EDUCATION_LEVELS = [
  "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8",
  "S1", "S2", "S3", "S4",
  "TVET1", "TVET2", "TVET3",
  "Level1", "Level2", "Level3", "Level4", "Level5", "Level6",
  "ECD1", "ECD2", "ECD3","ECD4",
  "Adult Literacy"
];

// SUB-SCHEMAS

// Gender-based count schema for consistent data structure
const GenderCountSchema = new Schema({
  male: { type: Number, min: 0, default: 0, required: true },
  female: { type: Number, min: 0, default: 0, required: true }
}, { _id: false });

// Disability breakdown schema following SAMS standards
const DisabilitySchema = new Schema({
  difficultyHearing: { type: Number, min: 0, default: 0 },
  difficultyRecalling: { type: Number, min: 0, default: 0 },
  difficultySeeing: { type: Number, min: 0, default: 0 },
  difficultySelfCare: { type: Number, min: 0, default: 0 },
  difficultyTalking: { type: Number, min: 0, default: 0 },
  difficultyWalking: { type: Number, min: 0, default: 0 }
}, { _id: false });

// Contact information schema
const ContactSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phoneNumber: { type: String },
  email: { type: String, trim: true, lowercase: true },
}, { _id: false });

// MAIN CENSUS SCHEMA

const CensusSchema = new Schema(
  {
    // BASIC IDENTIFICATION
    year: {
      type: Number,
      required: [true, "Census year is required"],
      index: true
    },
    
    schoolCode: {
      type: String,
      required: [true, "School code is required"],
      trim: true,
      uppercase: true,
      ref: "schooldata",
      index: true,
    },
    
    // School Leadership
    schoolHead: {
      name: { type: String, required: true },
      phoneNumber: { type: String },
      gender: {
        type: String,
        enum: ["F", "M"],
        required: true,
      },
    },
    
    deputyHead: {
      name: { type: String },
      phoneNumber: { type: String },
      gender: {
        type: String,
        enum: ["F", "M"],
      },
    },
    
    ptaChairperson: {
      name: { type: String },
      hasPhone: { type: Boolean, default: false },
      phoneNumber: { type: String },
    },
    
    numberOfPTAs: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    // School Operations
    ownership: {
      type: String,
      enum: [
        "Government",
        "Private",
        "Community",
        "Faith-based",
        "NGO",
        "Other",
      ],
      required: true,
    },
    
    operational: {
      type: String,
      enum: ["Operational", "Non-operational", "Temporarily Closed"],
      required: true,
    },
    
    closureReasons: {
      type: [String],
      enum: [
        "Insecurity",
        "Flooding",
        "Lack of teachers",
        "Lack of funding",
        "Infrastructure damage",
        "Low enrollment",
        "Other",
      ],
    },
    
    // School Details
    schoolType: {
      type: String,
      enum: ["Day", "Boarding", "Mixed"],
      required: true,
    },
    
    genderAttendance: {
      type: String,
      enum: ["Boys only", "Girls only", "Mixed school (Boys & Girls)"],
      required: true,
    },
    
    hasShift: {
      type: Boolean,
      default: false,
    },
    
    numberOfShifts: {
      type: String,
      enum: ["Single", "Double"],
      default: "Single",
    },
    
    sharesPremise: {
      type: Boolean,
      default: false,
    },
    
    sharedWithSchool: {
      type: String,
    },
    
    // School Feeding
    schoolFeeding: {
      receives: { type: Boolean, default: false },
      providers: {
        type: [String],
        enum: [
          "Community",
          "Home grown",
          "Government",
          "Faith based",
          "NGO",
          "WFP",
        ],
      },
      ngoNames: [String],
    },
    
    // School Accessibility
    accessibility: {
      walkingTimeFromFurthestVillage: {
        type: String,
        enum: [
          "Less than 1 hour",
          "About 1 hour and 30 minutes",
          "More than 1 hour",
          "More than 2 hours",
          "N/A (not applicable)",
        ],
      },
      accessibleYearRound: { type: Boolean, default: true },
      inaccessibleMonths: {
        type: [String],
        enum: [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ],
      },
      inaccessibilityReasons: {
        type: [String],
        enum: ["Flooding", "Insecurity", "Other"],
      },
      otherInaccessibilityReasons: String,
    },
    
    // Language of Instruction
    languageOfInstruction: {
      type: [String],
      enum: ["English", "Arabic", "National languages", "Other"],
      required: true,
    },
    otherLanguageOfInstruction: String,
    
    // Enrollment Data for 2025
    enrollment: {
      summary: {
        male: { type: Number, min: 0, default: 0 },
        female: { type: Number, min: 0, default: 0 },
      },
      byLevel: [
        {
          level: {
            type: String,
          },
          male: { type: Number, min: 0, default: 0 },
          female: { type: Number, min: 0, default: 0 },
          refugees: {
            male: { type: Number, min: 0, default: 0 },
            female: { type: Number, min: 0, default: 0 },
            originCountries: [String],
          },
          returnees: {
            male: { type: Number, min: 0, default: 0 },
            female: { type: Number, min: 0, default: 0 },
          },
          foreignResidents: {
            male: { type: Number, min: 0, default: 0 },
            female: { type: Number, min: 0, default: 0 },
          },
          idp: {
            male: { type: Number, min: 0, default: 0 },
            female: { type: Number, min: 0, default: 0 },
          },
          repeaters: {
            male: { type: Number, min: 0, default: 0 },
            female: { type: Number, min: 0, default: 0 },
          },
          lwd: {
            male: { type: Number, min: 0, default: 0 },
            female: { type: Number, min: 0, default: 0 },
          },
          disabilities: {
            male: {
              difficultyHearing: { type: Number, min: 0, default: 0 },
              difficultyRecalling: { type: Number, min: 0, default: 0 },
              difficultySeeing: { type: Number, min: 0, default: 0 },
              difficultySelfCare: { type: Number, min: 0, default: 0 },
              difficultyTalking: { type: Number, min: 0, default: 0 },
              difficultyWalking: { type: Number, min: 0, default: 0 },
            },
            female: {
              difficultyHearing: { type: Number, min: 0, default: 0 },
              difficultyRecalling: { type: Number, min: 0, default: 0 },
              difficultySeeing: { type: Number, min: 0, default: 0 },
              difficultySelfCare: { type: Number, min: 0, default: 0 },
              difficultyTalking: { type: Number, min: 0, default: 0 },
              difficultyWalking: { type: Number, min: 0, default: 0 },
            },
          },
        },
      ],
    },
    
    // Learner Dropout
    dropout: {
      causes: [
        {
          reason: {
            type: String,
            enum: [
              "No Dropout",
              "Financial reasons",
              "Long distance to school",
              "Family or personal problem",
              "Looked for or found a job/work",
              "Prolonged illness, sickness",
              "Insecurity on the way to school",
              "Marriage",
              "Pregnancy",
              "In prison",
              "Disability",
              "Unknown reason",
            ],
          },
          maleCount: { type: Number, min: 0, default: 0 },
          femaleCount: { type: Number, min: 0, default: 0 },
        },
      ],
    },
    
    // Teachers Data
    teachers: {
      summary: {
        male: { type: Number, min: 0, default: 0 },
        female: { type: Number, min: 0, default: 0 },
      },
      byQualification: [
        {
          qualification: {
            type: String,
            enum: [
              "Untrained",
              "Certificate",
              "Diploma",
              "Degree",
              "Masters",
              "PhD",
              "Other",
            ],
          },
          male: { type: Number, min: 0, default: 0 },
          female: { type: Number, min: 0, default: 0 },
        },
      ],
    },
    
    // Institution Curriculum
    curriculum: {
      prePrimaryCurriculum: {
        type: String,
        enum: ["New Curriculum", "Old Curriculum"],
      },
      inServiceCertificate: {
        type: String,
        enum: ["Unified curriculum for Teacher education 2014", "University of Juba Unified Curriculum", "Other"],
      },
      preServiceCertificate: {
        type: String,
        enum: ["Unified curriculum for Teacher education 2014", "University of Juba Unified Curriculum", "Other"],
      },
      preServiceDiploma: {
        type: String,
        enum: ["Unified curriculum for Teacher education 2014", "University of Juba Unified Curriculum", "Other"],
      },
      otherProgramme: {
        type: String,
        enum: ["Unified curriculum for Teacher education 2014", "University of Juba Unified Curriculum", "Other"],
      },
      otherSpecifications: [String],
    },
    
    // TVET Programs
    tvetPrograms: {
      offered: { type: Boolean, default: false },
      types: {
        type: [String],
        enum: ["Formal", "Non-Formal"],
      },
      formalPrograms: {
        type: [String],
        enum: ["Agricultural", "Commercial", "Technical"],
      },
    },
    
    // Alternative Education Programs
    alternativePrograms: {
      type: [String],
      enum: [
        "ALP (Accelerated Learning Programme)",
        "BALP (Basic Adult Literacy Programme)",
        "FALP (Functional Adult Literacy Programme)",
        "CGS (Community Girls School)",
        "IEC (Intensive English Course)",
        "PEP (Pastoralist Education Programme)",
        "APEPT (Accelerated Primary Education Programme for Teachers)",
        "Other",
      ],
    },
    otherAlternativePrograms: String,
    
    // Class/Programme Levels Available
    availableLevels: {
      type: [String]
    },
    
    // School Infrastructure
    infrastructure: {
      condition: {
        type: String,
        enum: ["Not damaged", "Partially damaged", "Completely damaged", "Dilapidated"],
        required: true,
      },
      damageReasons: {
        type: [String],
        enum: ["Wind", "Fire", "Conflict", "Flood", "Other"],
      },
      otherDamageReason: String,
      accessibleForDisability: {
        type: String,
        enum: ["Yes", "No", "Partially"],
      },
      classrooms: {
        permanent: { type: Number, min: 0, default: 0 },
        semiPermanent: { type: Number, min: 0, default: 0 },
        roofOnly: { type: Number, min: 0, default: 0 },
        tent: { type: Number, min: 0, default: 0 },
        underTree: { type: Number, min: 0, default: 0 },
        temporaryLearningSpace: { type: Number, min: 0, default: 0 },
      },
      classroomsByPartners: {
        permanent: { type: Number, min: 0, default: 0 },
        semiPermanent: { type: Number, min: 0, default: 0 },
        tent: { type: Number, min: 0, default: 0 },
      },
      classroomFurniture: {
        chairs: { type: Number, min: 0, default: 0 },
        stools: { type: Number, min: 0, default: 0 },
        benches: { type: Number, min: 0, default: 0 },
        woodenPoles: { type: Number, min: 0, default: 0 },
        desks: { type: Number, min: 0, default: 0 },
        tables: { type: Number, min: 0, default: 0 },
      },
      officeFurniture: {
        chairs: { type: Number, min: 0, default: 0 },
        desks: { type: Number, min: 0, default: 0 },
        filingCabinets: { type: Number, min: 0, default: 0 },
        cupboards: { type: Number, min: 0, default: 0 },
        shelves: { type: Number, min: 0, default: 0 },
      },
    },
    
    // School Facilities & Utilities
    facilities: {
      available: {
        type: [String],
        enum: [
          "None", "Health unit", "Food Storeroom", "Fence", "Computer Lab",
          "Library", "Teachers quarters", "Sport ground", "School garden/farm",
          "Teaching learning materials Storeroom", "Kitchen", "Hand washing facility",
          "Dormitory", "Changing room", "Daycare room", "Workshop", "Others",
        ],
      },
      otherFacilities: String,
      computerLabFunctional: { type: Boolean, default: false },
      utilities: {
        type: [String],
        enum: [
          "None", "Electricity", "Equipment for pupils with disabilities",
          "Internet", "Laptops", "Computers", "First aid kit",
          "TVET equipment", "TVET tools", "Others",
        ],
      },
      otherUtilities: String,
      internetProviders: {
        type: [String],
        enum: ["Government", "Telecommunication Company", "School own initiative", "NGO", "Other"],
      },
      otherInternetProvider: String,
      devices: {
        laptopsAvailable: { type: Number, min: 0, default: 0 },
        computersAvailable: { type: Number, min: 0, default: 0 },
        teacherComputerAccess: {
          type: String,
          enum: ["Yes", "Partial", "No"],
        },
        learnerComputerAccess: {
          type: String,
          enum: ["Yes", "Partial", "No"],
        },
        teacherLaptopAccess: {
          type: String,
          enum: ["Yes", "Partial", "No"],
        },
        learnerLaptopAccess: {
          type: String,
          enum: ["Yes", "Partial", "No"],
        },
      },
    },
    
    // Power/Energy Source
    powerSource: {
      hasPower: { type: Boolean, default: false },
      sources: {
        type: [String],
        enum: ["Solar Power", "Electricity", "Power generator", "Other"],
      },
      otherSource: String,
    },
    
    // WASH Facilities
    washFacilities: {
      water: {
        mainSource: {
          type: String,
          enum: [
            "Bore hole", "Protected well", "Unprotected well", "Unprotected spring",
            "Protected spring", "Surface water", "Rain water", "Piped water",
            "Tanker supplied", "Other water source",
          ],
        },
        otherMainSource: String,
        otherSources: {
          type: [String],
          enum: [
            "Bore hole", "Protected well", "Unprotected well", "Unprotected spring",
            "Protected spring", "Surface water", "Rain water", "Piped water",
            "Tanker supplied", "Other water source",
          ],
        },
        otherSourcesSpecify: String,
        proximity: {
          type: String,
          enum: ["Within the school compound", "Outside the school compound"],
        },
        ownership: {
          type: String,
          enum: ["School", "Community", "NGO", "Faith-based", "No ownership", "Other"],
        },
      },
      toilets: {
        hasToilets: { type: Boolean, default: false },
        teachersShareWithLearners: { type: Boolean, default: false },
        learnersSeparateByGender: { type: Boolean, default: false },
        teachersAndLearnersSeparateByGender: { type: Boolean, default: false },
        totalRooms: { type: Number, min: 0, default: 0 },
        maleRooms: { type: Number, min: 0, default: 0 },
        femaleRooms: { type: Number, min: 0, default: 0 },
        learnerAccessibilityForDisability: {
          type: String,
          enum: ["Yes", "No", "Partially"],
        },
        teachersSeparateByGender: { type: Boolean, default: false },
        teacherAccessibilityForDisability: {
          type: String,
          enum: ["Yes", "No", "Partially"],
        },
        teachersAndLearnersAccessibilityForDisability: {
          type: String,
          enum: ["Yes", "No", "Partially"],
        },
        accessibilityFeatures: {
          type: [String],
          enum: [
            "Entrance to the toilet step free",
            "Ramp gradient shallow enough",
            "Entrance to the toilet wide enough for a wheelchair",
            "The door handle are easy to reach for wheel chair user",
            "The toilet door open inwards",
            "At least one toilet have a wide enough turning space for a wheel chair",
            "There are grab rails close to the toilet",
            "The light in the toilet adequate",
            "There is water available for flush close to the toilet",
            "The toilets have seats",
            "Toilet seat at similar level to a wheelchair",
            "Are the walkways to the toilet accessible- clear pathways free from hazards?",
          ],
        },
      },
    },
    
    // School Library
    library: {
      hasLibrary: { type: Boolean, default: false },
      hasLibrarian: { type: Boolean, default: false },
    },
    
    // School Finance
    finance: {
      supportReceived2024: {
        type: [String],
        enum: [
          "None", "Capitation Grant", "Teacher incentives", "Cash transfers",
          "Salaries", "Financial support", "Training support", "School materials",
          "Training materials", "Others",
        ],
      },
      otherSupport: String,
      fundingSources: {
        type: [String],
        enum: ["Government", "Education partners", "School Fees", "Parent support", "Others"],
      },
      otherFundingSource: String,
      schoolFeesSSP: { type: Number, min: 0, default: 0 },
    },
    
    // School Management Bodies
    managementBodies: {
      hasSMC_TMC: { type: Boolean, default: false },
      smcMeetingFrequency: {
        type: String,
        enum: ["Termly", "Monthly", "Ad hoc", "Annually", "None"],
      },
      hasBOG: { type: Boolean, default: false },
      bogMeetingFrequency: {
        type: String,
        enum: ["Termly", "Monthly", "Ad hoc", "Annually", "None"],
      },
      hasPTA: { type: Boolean, default: false },
      ptaMeetingFrequency: {
        type: String,
        enum: ["Termly", "Monthly", "Ad hoc", "Annually", "None"],
      },
    },
    
    // Policy Documents
    policyDocuments: {
      available: {
        type: [String],
        enum: [
          "None", "Teachers Code of Conduct", "Education Act 2012",
          "School Development Plan", "School Management Guide", "Inspection policy",
          "Inspection Guide", "National Professional Standards for Teachers in South Sudan, 2012",
          "School Based Assessment Guide", "New Curriculum Framework", "School Reopening Guidelines",
          "National Girls Education Strategy", "The new ECD Curriculum",
          "Curriculum and guidance for the early childhood development", "Curriculum ECD inspection framework",
          "National youth and Adults policy", "AES Strategy", "AES Guidelines",
          "TVET Policy", "Education Transfers Guidelines", "Inclusive Education Policy", "Other",
        ],
      },
      otherDocuments: String,
    },
    
    // County and Payam Education Supervision
    supervision: {
      countyInspector: {
        visitedFirstTerm: { type: Boolean, default: false },
        visitFrequency: {
          type: String,
          enum: ["Once", "Twice", "Three times", "More than three times"],
        },
      },
      payamSupervisor: {
        visitedFirstTerm: { type: Boolean, default: false },
        visitFrequency: {
          type: String,
          enum: ["Once", "Twice", "Three times", "More than three times"],
        },
      },
    },
    
    // Life Skills Education
    lifeSkillsEducation: {
      hasOrientationSessions: { type: Boolean, default: false },
      topicsCovered: {
        type: [String],
        enum: [
          "Decision making/communications/critical thinking skills",
          "Conflict resolution/sensitivity",
          "Psychosocial support",
          "Sexual reproductive health/sexuality education",
          "HIV/STIs transmission and prevention",
          "Health and hygiene education",
          "Other",
        ],
      },
      otherTopics: String,
      teachersTrainedLifeSkills: {
        male: { type: Number, min: 0, default: 0 },
        female: { type: Number, min: 0, default: 0 },
      },
      teachersTrainedInclusiveEducation: {
        male: { type: Number, min: 0, default: 0 },
        female: { type: Number, min: 0, default: 0 },
      },
    },
    
    // Head Count (Actual attendance during visit)
    headCount: {
      learners: {
        year1: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year2: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year3: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year4: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year5: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year6: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year7: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
        year8: { male: { type: Number, min: 0, default: 0 }, female: { type: Number, min: 0, default: 0 } },
      },
      teachers: {
        male: { type: Number, min: 0, default: 0 },
        female: { type: Number, min: 0, default: 0 },
      },
    },
    
    // GPS Location
    gpsLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      altitude: { type: Number },
      accuracy: { type: Number },
    },
    
    // Enumerator Information
    enumerator: {
      name: { type: String },
      phoneNumber: { type: String },
      email: { type: String },
    },
    
    // Data Collection Metadata
    dataCollector: {
      name: { type: String, required: true },
      phoneNumber: { type: String },
      email: { type: String },
      role: { type: String },
    },
    
    dataCollectionDate: {
      type: Date,
      default: Date.now,
    },
    
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    
    submittedAt: Date,
    
    isValidated: {
      type: Boolean,
      default: false,
    },
    
    validatedBy: {
      name: String,
      role: String,
      date: Date,
    },
    
    validationComments: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
CensusSchema.index({ year: 1, schoolCode: 1 }, { unique: true });
CensusSchema.index({ year: 1 });
CensusSchema.index({ schoolCode: 1 });
CensusSchema.index({ operational: 1 });
CensusSchema.index({ isSubmitted: 1 });
CensusSchema.index({ isValidated: 1 });
CensusSchema.index({ dataCollectionDate: 1 });

// Virtual for total enrollment
CensusSchema.virtual("totalEnrollment").get(function () {
  return this.enrollment.summary.male + this.enrollment.summary.female;
});

// Virtual for total teachers
CensusSchema.virtual("totalTeachers").get(function () {
  return this.teachers.summary.male + this.teachers.summary.female;
});

// Pre-save middleware to calculate totals
CensusSchema.pre("save", function (next) {
  // Calculate enrollment summary from detailed breakdown
  if (this.enrollment.byLevel && this.enrollment.byLevel.length > 0) {
    let totalMale = 0;
    let totalFemale = 0;
    
    this.enrollment.byLevel.forEach((level) => {
      totalMale += level.male || 0;
      totalFemale += level.female || 0;
    });
    
    this.enrollment.summary.male = totalMale;
    this.enrollment.summary.female = totalFemale;
  }
  
  // Calculate teacher summary from detailed breakdown
  if (this.teachers.byQualification && this.teachers.byQualification.length > 0) {
    let totalMale = 0;
    let totalFemale = 0;
    
    this.teachers.byQualification.forEach((qual) => {
      totalMale += qual.male || 0;
      totalFemale += qual.female || 0;
    });
    
    this.teachers.summary.male = totalMale;
    this.teachers.summary.female = totalFemale;
  }
  
  next();
});

// Method to submit census data
CensusSchema.methods.submit = function () {
  this.isSubmitted = true;
  this.submittedAt = new Date();
  return this.save();
};

// Method to validate census data (renamed to avoid clashing with Mongoose internal 'validate')
CensusSchema.methods.validateRecord = function (validatorName, validatorRole, comments) {
  this.isValidated = true;
  this.validatedBy = {
    name: validatorName,
    role: validatorRole,
    date: new Date(),
  };
  this.validationComments = comments;
  return this.save();
};


const Census = mongoose.model("Census", CensusSchema);

module.exports = Census;
