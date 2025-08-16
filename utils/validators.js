const mongoose = require("mongoose");

/**
 * @fileoverview Validation utilities for SAMS
 * @description Common validation functions used across the application
 * @version 1.0.0
 */

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid ObjectId, false otherwise
 */
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (basic international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[+]?[\d\s\-()]+$/;
  return phoneRegex.test(phone);
};

/**
 * Validate year range
 * @param {number} year - Year to validate
 * @param {number} minYear - Minimum allowed year (default: 2020)
 * @param {number} maxYear - Maximum allowed year (default: current year + 5)
 * @returns {boolean} True if year is within valid range
 */
const validateYear = (year, minYear = 2020, maxYear = new Date().getFullYear() + 5) => {
  return Number.isInteger(year) && year >= minYear && year <= maxYear;
};

/**
 * Validate GPS coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {boolean} True if coordinates are valid
 */
const validateGPSCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' && 
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

/**
 * Sanitize and validate school code
 * @param {string} schoolCode - School code to validate
 * @returns {Object} Validation result with isValid and sanitized code
 */
const validateSchoolCode = (schoolCode) => {
  if (!schoolCode || typeof schoolCode !== 'string') {
    return { isValid: false, code: null, message: 'School code is required' };
  }
  
  const sanitized = schoolCode.trim().toUpperCase();
  const codeRegex = /^[A-Z0-9]{3,20}$/;
  
  if (!codeRegex.test(sanitized)) {
    return { 
      isValid: false, 
      code: sanitized, 
      message: 'School code must be 3-20 alphanumeric characters' 
    };
  }
  
  return { isValid: true, code: sanitized, message: null };
};

/**
 * Validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validated pagination parameters
 */
const validatePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  
  return { page, limit };
};

/**
 * Validate sort parameters
 * @param {Object} query - Query parameters
 * @param {Array} allowedFields - Array of allowed sort fields
 * @returns {Object} Validated sort parameters
 */
const validateSort = (query, allowedFields = []) => {
  const { sortBy, sortOrder = 'desc' } = query;
  
  if (!sortBy || !allowedFields.includes(sortBy)) {
    return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
  
  const validOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
  
  return { sortBy, sortOrder: validOrder };
};

module.exports = {
  validateObjectId,
  validateEmail,
  validatePhone,
  validateYear,
  validateGPSCoordinates,
  validateSchoolCode,
  validatePagination,
  validateSort
};
