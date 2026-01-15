const Accountability = require("../models/accountability");

/**
 * Financial Calculation Service
 * Handles all financial calculations for accountability records
 * Ensures accurate, real-time calculations without relying on stale data
 */
class FinancialCalculationService {
  /**
   * Calculate complete financial summary for an accountability record
   * @param {string} accountabilityId - The accountability record ID
   * @param {number} academicYear - The academic year
   * @returns {Promise<Object>} Complete financial summary
   */
  static async calculateFinancialSummary(accountabilityId, academicYear) {
    const accountability = await Accountability.findById(accountabilityId);

    if (!accountability) {
      throw new Error("Accountability record not found");
    }

    // 1. Calculate opening balance from previous year's unaccounted funds
    const openingBalance = await this.calculateOpeningBalance(
      accountability.code,
      academicYear
    );

    // 2. Calculate current year total disbursements
    const totalDisbursed = accountability.tranches.reduce(
      (sum, tranche) => sum + (tranche.amountDisbursed || 0),
      0
    );

    // 3. Calculate total accounted (sum of all accounting entries)
    const totalAccounted = accountability.tranches.reduce((sum, tranche) => {
      const entries = tranche.fundsAccountability?.accountingEntries || [];
      const trancheTotal = entries.reduce(
        (s, entry) => s + (entry.value || 0),
        0
      );
      return sum + trancheTotal;
    }, 0);

    // 4. Calculate total revenue from all tranches
    const totalRevenue = accountability.tranches.reduce((sum, tranche) => {
      const revenues = tranche.revenues || [];
      return sum + revenues.reduce((s, rev) => s + (rev.amount || 0), 0);
    }, 0);

    // 5. Calculate expenditure (same as accounted for now)
    const totalExpenditure = totalAccounted;

    // 6. Calculate closing balance
    // Closing = Opening + Revenue - Expenditure
    const closingBalance = openingBalance + totalRevenue - totalExpenditure;

    // 7. Calculate unaccounted balance (funds disbursed but not yet accounted for)
    const unaccountedBalance = totalDisbursed - totalAccounted;

    // 8. Calculate accounting percentage
    const accountingPercentage =
      totalDisbursed > 0 ? (totalAccounted / totalDisbursed) * 100 : 0;

    // 9. Get previous year accounting status
    const previousYearStatus = await this.getPreviousYearStatus(
      accountability.code,
      academicYear
    );

    return {
      openingBalance: Math.round(openingBalance * 100) / 100,
      totalDisbursed: Math.round(totalDisbursed * 100) / 100,
      totalAccounted: Math.round(totalAccounted * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenditure: Math.round(totalExpenditure * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      unaccountedBalance: Math.round(unaccountedBalance * 100) / 100,
      accountingPercentage: Math.round(accountingPercentage * 10) / 10,
      previousYearLedgerAccountedFor: previousYearStatus.fullyAccounted,
      percentageAccountedPreviousYear:
        Math.round(previousYearStatus.percentage * 10) / 10,
    };
  }

  /**
   * Calculate opening balance from previous year's unaccounted funds
   * Opening balance = Previous year's (Disbursed - Accounted)
   * @param {string} schoolCode - School code
   * @param {number} currentYear - Current academic year
   * @returns {Promise<number>} Opening balance amount
   */
  static async calculateOpeningBalance(schoolCode, currentYear) {
    const previousYear = currentYear - 1;

    const previousRecord = await Accountability.findOne({
      code: schoolCode,
      academicYear: previousYear,
    });

    if (!previousRecord) {
      return 0; // No previous year data means no opening balance
    }

    // Calculate total disbursed in previous year
    const totalDisbursed = previousRecord.tranches.reduce(
      (sum, tranche) => sum + (tranche.amountDisbursed || 0),
      0
    );

    // Calculate total accounted in previous year
    const totalAccounted = previousRecord.tranches.reduce((sum, tranche) => {
      const entries = tranche.fundsAccountability?.accountingEntries || [];
      return sum + entries.reduce((s, entry) => s + (entry.value || 0), 0);
    }, 0);

    // Unaccounted funds from previous year become opening balance
    const unaccounted = totalDisbursed - totalAccounted;

    return unaccounted > 0 ? unaccounted : 0; // Only positive balances carry forward
  }

  /**
   * Get previous year accounting status
   * @param {string} schoolCode - School code
   * @param {number} currentYear - Current academic year
   * @returns {Promise<Object>} Previous year status
   */
  static async getPreviousYearStatus(schoolCode, currentYear) {
    const previousYear = currentYear - 1;

    const previousRecord = await Accountability.findOne({
      code: schoolCode,
      academicYear: previousYear,
    });

    if (!previousRecord) {
      return {
        fullyAccounted: true,
        percentage: 100,
      };
    }

    const totalDisbursed = previousRecord.tranches.reduce(
      (sum, tranche) => sum + (tranche.amountDisbursed || 0),
      0
    );

    const totalAccounted = previousRecord.tranches.reduce((sum, tranche) => {
      const entries = tranche.fundsAccountability?.accountingEntries || [];
      return sum + entries.reduce((s, entry) => s + (entry.value || 0), 0);
    }, 0);

    const percentage =
      totalDisbursed > 0 ? (totalAccounted / totalDisbursed) * 100 : 100;

    return {
      fullyAccounted: percentage >= 99.9, // Allow for small rounding differences
      percentage,
    };
  }

  /**
   * Calculate per-tranche summary
   * @param {Object} tranche - Tranche object
   * @returns {Object} Tranche financial summary
   */
  static calculateTrancheSummary(tranche) {
    const amountDisbursed = tranche.amountDisbursed || 0;
    const entries = tranche.fundsAccountability?.accountingEntries || [];
    const totalAccounted = entries.reduce(
      (sum, entry) => sum + (entry.value || 0),
      0
    );
    const remaining = amountDisbursed - totalAccounted;
    const percentage =
      amountDisbursed > 0 ? (totalAccounted / amountDisbursed) * 100 : 0;

    return {
      amountDisbursed: Math.round(amountDisbursed * 100) / 100,
      totalAccounted: Math.round(totalAccounted * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
    };
  }

  /**
   * Update financial summary in database (optional - for caching)
   * Call this after significant changes to update stored summary
   * @param {string} accountabilityId - The accountability record ID
   */
  static async updateStoredFinancialSummary(accountabilityId) {
    const accountability = await Accountability.findById(accountabilityId);

    if (!accountability) {
      throw new Error("Accountability record not found");
    }

    const summary = await this.calculateFinancialSummary(
      accountabilityId,
      accountability.academicYear
    );

    // Update the stored financial summary
    accountability.financialSummary = {
      openingBalance: summary.openingBalance,
      totalRevenue: summary.totalRevenue,
      totalExpenditure: summary.totalExpenditure,
      closingBalance: summary.closingBalance,
      unaccountedBalance: summary.unaccountedBalance,
      previousYearLedgerAccountedFor: summary.previousYearLedgerAccountedFor,
      percentageAccountedPreviousYear: summary.percentageAccountedPreviousYear,
    };

    await accountability.save();

    return summary;
  }
}

module.exports = FinancialCalculationService;
