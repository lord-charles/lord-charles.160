const asyncHandler = require("express-async-handler");
const Census = require("../models/censusModel");
const { validateObjectId } = require("../utils/validators");


const buildFilters = (query) => {
  const filters = {};
  
  // Year filter
  if (query.year) {
    filters.year = parseInt(query.year);
  }
  
  // School code filter
  if (query.schoolCode) {
    filters.schoolCode = query.schoolCode.toUpperCase();
  }
  
  // Operational status filter
  if (query.operational) {
    filters.operational = query.operational;
  }
  
  // Ownership filter
  if (query.ownership) {
    filters.ownership = query.ownership;
  }
  
  // Submission status filter
  if (query.isSubmitted !== undefined) {
    filters.isSubmitted = query.isSubmitted === 'true';
  }
  
  // Validation status filter
  if (query.isValidated !== undefined) {
    filters.isValidated = query.isValidated === 'true';
  }
  
  // Date range filter
  if (query.startDate || query.endDate) {
    filters.dataCollectionDate = {};
    if (query.startDate) {
      filters.dataCollectionDate.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.dataCollectionDate.$lte = new Date(query.endDate);
    }
  }
  
  return filters;
};

// Build sort options from request parameters
const buildSort = (query) => {
  const sort = {};
  
  if (query.sortBy) {
    const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
    sort[query.sortBy] = sortOrder;
  } else {
    // Default sort by collection date (newest first)
    sort.dataCollectionDate = -1;
  }
  
  return sort;
};

// Calculate pagination parameters
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

// Create new census record
const createCensus = asyncHandler(async (req, res) => {
  try {
    const existingCensus = await Census.findOne({
      year: req.body.year,
      schoolCode: req.body.schoolCode?.toUpperCase()
    });
    
    if (existingCensus) {
      return res.status(409).json({
        success: false,
        message: `Census record already exists for school ${req.body.schoolCode} in year ${req.body.year}`,
        data: null
      });
    }
    
    // Ensure school code is uppercase
    if (req.body.schoolCode) {
      req.body.schoolCode = req.body.schoolCode.toUpperCase();
    }
    
    // Create new census record
    const census = await Census.create(req.body);
    
    res.status(201).json({
      success: true,
      message: "Census record created successfully",
      data: census
    });
    
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Census record already exists for this year and school",
        data: null
      });
    }
    
    throw error;
  }
});


const getAllCensus = asyncHandler(async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const sort = buildSort(req.query);
    const { page, limit, skip } = getPagination(req.query);
    
    // Build aggregation pipeline for enhanced queries
    const pipeline = [
      { $match: filters },
      {
        $lookup: {
          from: 'schooldata',
          localField: 'schoolCode',
          foreignField: 'code',
          as: 'schoolInfo'
        }
      },
      {
        $addFields: {
          totalEnrollment: {
            $add: ['$enrollment.summary.male', '$enrollment.summary.female']
          },
          totalTeachers: {
            $add: ['$teachers.summary.male', '$teachers.summary.female']
          },
          completionStatus: {
            $cond: {
              if: '$isValidated',
              then: 'Validated',
              else: {
                $cond: {
                  if: '$isSubmitted',
                  then: 'Submitted',
                  else: 'Draft'
                }
              }
            }
          }
        }
      },
      { $sort: sort }
    ];
    
    // Execute aggregation with pagination
    const [censusRecords, totalCount] = await Promise.all([
      Census.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
      ]),
      Census.aggregate([
        ...pipeline,
        { $count: 'total' }
      ])
    ]);
    
    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      success: true,
      message: "Census records retrieved successfully",
      data: censusRecords,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    throw error;
  }
});


const getCensusById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate ObjectId
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid census ID format",
      data: null
    });
  }
  
  try {
    const census = await Census.findById(id)
      .populate({
        path: 'schoolCode',
        select: 'schoolName state10 county28 payam28'
      });
    
    if (!census) {
      return res.status(404).json({
        success: false,
        message: "Census record not found",
        data: null
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Census record retrieved successfully",
      data: census
    });
    
  } catch (error) {
    throw error;
  }
});

const getCensusBySchoolAndYear = asyncHandler(async (req, res) => {
  const { schoolCode, year } = req.params;
  
  try {
    const census = await Census.findOne({
      schoolCode: schoolCode.toUpperCase(),
      year: parseInt(year)
    }).populate({
      path: 'schoolCode',
      select: 'schoolName state10 county28 payam28'
    });
    
    if (!census) {
      return res.status(404).json({
        success: false,
        message: `No census record found for school ${schoolCode} in year ${year}`,
        data: null
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Census record retrieved successfully",
      data: census
    });
    
  } catch (error) {
    throw error;
  }
});

const updateCensus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid census ID format",
      data: null
    });
  }
  
  try {
    // Check if census exists
    const existingCensus = await Census.findById(id);
    if (!existingCensus) {
      return res.status(404).json({
        success: false,
        message: "Census record not found",
        data: null
      });
    }
    
    // Prevent updates to submitted/validated records without proper authorization
    if (existingCensus.isValidated && !req.body.forceUpdate) {
      return res.status(403).json({
        success: false,
        message: "Cannot update validated census record. Use forceUpdate flag if authorized.",
        data: null
      });
    }
    
    // Ensure school code is uppercase if provided
    if (req.body.schoolCode) {
      req.body.schoolCode = req.body.schoolCode.toUpperCase();
    }
    
    // Update the record
    const updatedCensus = await Census.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );
    
    res.status(200).json({
      success: true,
      message: "Census record updated successfully",
      data: updatedCensus
    });
    
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }
    
    throw error;
  }
});

const deleteCensus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid census ID format",
      data: null
    });
  }
  
  try {
    const census = await Census.findById(id);
    
    if (!census) {
      return res.status(404).json({
        success: false,
        message: "Census record not found",
        data: null
      });
    }
    
    // Prevent deletion of validated records without proper authorization
    if (census.isValidated && !req.body.forceDelete) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete validated census record. Use forceDelete flag if authorized.",
        data: null
      });
    }
    
    await Census.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Census record deleted successfully",
      data: { deletedId: id }
    });
    
  } catch (error) {
    throw error;
  }
});

// ================================
// WORKFLOW OPERATIONS
// ================================

// Submit census record for validation
const submitCensus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid census ID format",
      data: null
    });
  }
  
  try {
    const census = await Census.findById(id);
    
    if (!census) {
      return res.status(404).json({
        success: false,
        message: "Census record not found",
        data: null
      });
    }
    
    if (census.isSubmitted) {
      return res.status(409).json({
        success: false,
        message: "Census record has already been submitted",
        data: null
      });
    }
    
    // Use the model's submit method
    await census.submit();
    
    res.status(200).json({
      success: true,
      message: "Census record submitted successfully",
      data: census
    });
    
  } catch (error) {
    if (error.message.includes('Required field')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
    throw error;
  }
});

// Validate census record
const validateCensus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { validatorName, validatorRole, comments } = req.body;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid census ID format",
      data: null
    });
  }
  
  if (!validatorName || !validatorRole) {
    return res.status(400).json({
      success: false,
      message: "Validator name and role are required",
      data: null
    });
  }
  
  try {
    const census = await Census.findById(id);
    
    if (!census) {
      return res.status(404).json({
        success: false,
        message: "Census record not found",
        data: null
      });
    }
    
    // Use the model's validateRecord method (renamed to avoid conflict with Mongoose's internal validate)
    await census.validateRecord(validatorName, validatorRole, comments);
    
    res.status(200).json({
      success: true,
      message: "Census record validated successfully",
      data: census
    });
    
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

// ================================
// ANALYTICS & REPORTING
// ================================

// Get census statistics for a year
const getCensusStatistics = asyncHandler(async (req, res) => {
  const { year } = req.params;
  const filters = buildFilters(req.query);
  
  try {
    const pipeline = [
      { 
        $match: { 
          year: parseInt(year), 
          isSubmitted: true,
          ...filters
        } 
      },
      {
        $group: {
          _id: null,
          totalSchools: { $sum: 1 },
          totalEnrollment: {
            $sum: { $add: ['$enrollment.summary.male', '$enrollment.summary.female'] }
          },
          totalTeachers: {
            $sum: { $add: ['$teachers.summary.male', '$teachers.summary.female'] }
          },
          operationalSchools: {
            $sum: { $cond: [{ $eq: ['$operational', 'Operational'] }, 1, 0] }
          },
          validatedSchools: {
            $sum: { $cond: ['$isValidated', 1, 0] }
          },
          governmentSchools: {
            $sum: { $cond: [{ $eq: ['$ownership', 'Government'] }, 1, 0] }
          },
          privateSchools: {
            $sum: { $cond: [{ $eq: ['$ownership', 'Private'] }, 1, 0] }
          }
        }
      }
    ];
    
    const statistics = await Census.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      message: `Census statistics for year ${year} retrieved successfully`,
      data: statistics[0] || {
        totalSchools: 0,
        totalEnrollment: 0,
        totalTeachers: 0,
        operationalSchools: 0,
        validatedSchools: 0,
        governmentSchools: 0,
        privateSchools: 0
      }
    });
    
  } catch (error) {
    throw error;
  }
});

// Get census data by region
const getRegionalStatistics = asyncHandler(async (req, res) => {
  const { year } = req.params;
  const { groupBy = 'state10' } = req.query;
  
  try {
    const pipeline = [
      { $match: { year: parseInt(year), isSubmitted: true } },
      {
        $lookup: {
          from: 'schooldata',
          localField: 'schoolCode',
          foreignField: 'code',
          as: 'school'
        }
      },
      { $unwind: '$school' },
      {
        $group: {
          _id: `$school.${groupBy}`,
          region: { $first: `$school.${groupBy}` },
          totalSchools: { $sum: 1 },
          totalEnrollment: {
            $sum: { $add: ['$enrollment.summary.male', '$enrollment.summary.female'] }
          },
          totalTeachers: {
            $sum: { $add: ['$teachers.summary.male', '$teachers.summary.female'] }
          },
          operationalSchools: {
            $sum: { $cond: [{ $eq: ['$operational', 'Operational'] }, 1, 0] }
          }
        }
      },
      { $sort: { totalEnrollment: -1 } }
    ];
    
    const regionalData = await Census.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      message: `Regional census statistics for year ${year} retrieved successfully`,
      data: regionalData
    });
    
  } catch (error) {
    throw error;
  }
});

module.exports = {
  createCensus,
  getAllCensus,
  getCensusById,
  getCensusBySchoolAndYear,
  updateCensus,
  deleteCensus,
  submitCensus,
  validateCensus,
  getCensusStatistics,
  getRegionalStatistics
};
