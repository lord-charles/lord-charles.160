const Budget = require("../models/budget");
const Accountability = require("../models/accountability");
const CapitationSettings = require("../models/capitationSettings");

/**
 * Get all funding groups for a year
 */
exports.getFundingGroups = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: "Year is required" });
    }

    const settings = await CapitationSettings.findOne({
      academicYear: parseInt(year),
    })
      .select("fundingGroups")
      .lean()
      .exec();

    if (!settings || !settings.fundingGroups) {
      return res.status(200).json({ fundingGroups: [] });
    }

    const fundingGroups = [];
    const rawFundingGroups = settings.fundingGroups;

    // Handle both Map and plain object
    const entries =
      rawFundingGroups instanceof Map
        ? Array.from(rawFundingGroups.entries())
        : Object.entries(rawFundingGroups || {});

    entries.forEach(([key, cfg]) => {
      if (!cfg) return;
      const displayName = String(cfg.displayName || cfg.name || "").trim();
      if (displayName) {
        fundingGroups.push(displayName);
      }
    });

    res.status(200).json({ fundingGroups });
  } catch (error) {
    console.error("Error fetching funding groups:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get comprehensive capitation grants reports
 * Optimized with lean queries, selective field projection, and parallel processing
 */
exports.getCapitationReports = async (req, res) => {
  try {
    const { year, state, county, fundingGroup } = req.query;

    // Build query filters
    const budgetQuery = {};
    const accountabilityQuery = {};

    if (year) {
      budgetQuery.year = parseInt(year);
      accountabilityQuery.academicYear = parseInt(year);
    }
    if (state && state !== "ALL") {
      budgetQuery.state10 = state;
      accountabilityQuery.state10 = state;
    }
    if (county && county !== "ALL") {
      budgetQuery.county28 = county;
      accountabilityQuery.county28 = county;
    }

    // Fetch budgets and accountability records with selective field projection
    // Using lean() for better performance and only selecting needed fields
    const [budgets, accountabilities, settings] = await Promise.all([
      Budget.find(budgetQuery)
        .select(
          "code school state10 county28 year schoolType budget.groups accountability",
        )
        .populate({
          path: "accountability",
          select: "code schoolName tranches",
        })
        .lean()
        .exec(),
      Accountability.find(accountabilityQuery)
        .select("code schoolName state10 county28 academicYear tranches")
        .lean()
        .exec(),
      year
        ? CapitationSettings.findOne({ academicYear: parseInt(year) })
            .select("fundingGroups")
            .lean()
            .exec()
        : null,
    ]);

    // Build currency map from funding groups
    const currencyByFundingGroup = buildCurrencyMap(settings);

    // Process data for reports in parallel where possible
    const [
      budgetVsActual,
      disbursementSummary,
      accountabilityStatus,
      fundingGroupAnalysis,
      schoolWiseSummary,
      expenditureByCategory,
    ] = await Promise.all([
      Promise.resolve(processBudgetVsActual(budgets, fundingGroup)),
      Promise.resolve(
        processDisbursementSummary(accountabilities, fundingGroup),
      ),
      Promise.resolve(
        processAccountabilityStatus(accountabilities, fundingGroup),
      ),
      Promise.resolve(
        processFundingGroupAnalysis(budgets, accountabilities, fundingGroup),
      ),
      Promise.resolve(
        processSchoolWiseSummary(budgets, accountabilities, fundingGroup),
      ),
      Promise.resolve(
        processExpenditureByCategory(accountabilities, fundingGroup),
      ),
    ]);

    const overallStats = calculateOverallStats(
      budgets,
      accountabilities,
      fundingGroup,
    );

    const reports = {
      budgetVsActual,
      disbursementSummary,
      accountabilityStatus,
      fundingGroupAnalysis,
      schoolWiseSummary,
      expenditureByCategory,
      overallStats,
      currencyByFundingGroup, // Include currency mapping
    };

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching capitation reports:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Build currency map from funding groups configuration
 */
function buildCurrencyMap(settings) {
  const map = {};

  if (!settings || !settings.fundingGroups) {
    return map;
  }

  const rawFundingGroups = settings.fundingGroups;

  // Handle both Map and plain object
  const entries =
    rawFundingGroups instanceof Map
      ? Array.from(rawFundingGroups.entries())
      : Object.entries(rawFundingGroups || {});

  entries.forEach(([key, cfg]) => {
    if (!cfg) return;

    const displayName = String(cfg.displayName || cfg.name || "")
      .trim()
      .toLowerCase();
    if (!displayName) return;

    const schoolCurrencyMap = {};
    const rules = Array.isArray(cfg.rules) ? cfg.rules : [];

    rules.forEach((rule) => {
      const st = String(rule?.schoolType || "").toUpperCase();
      if (!st) return;
      if (!schoolCurrencyMap[st]) {
        schoolCurrencyMap[st] = rule.currency || "SSP";
      }
    });

    if (Object.keys(schoolCurrencyMap).length > 0) {
      map[displayName] = schoolCurrencyMap;
    }
  });

  return map;
}

/**
 * Process Budget vs Actual data
 */
function processBudgetVsActual(budgets, fundingGroupFilter) {
  const data = [];

  budgets.forEach((budget) => {
    if (!budget.budget?.groups) return;

    budget.budget.groups.forEach((group) => {
      // Filter by funding group if specified
      if (fundingGroupFilter && group.group !== fundingGroupFilter) return;

      const budgetedAmount = group.categories.reduce((sum, cat) => {
        return (
          sum + cat.items.reduce((s, item) => s + (item.totalCostSSP || 0), 0)
        );
      }, 0);

      // Get actual expenditure from accountability
      const actualAmount =
        budget.accountability?.tranches?.reduce((sum, tranche) => {
          if (tranche.fundingGroup === group.group) {
            return (
              sum +
              (tranche.expenditures?.reduce(
                (s, exp) => s + (exp.amount || 0),
                0,
              ) || 0)
            );
          }
          return sum;
        }, 0) || 0;

      data.push({
        school: budget.school || budget.code,
        code: budget.code,
        fundingGroup: group.group,
        budgeted: budgetedAmount,
        actual: actualAmount,
        variance: budgetedAmount - actualAmount,
        utilizationRate: budgetedAmount
          ? ((actualAmount / budgetedAmount) * 100).toFixed(2)
          : 0,
      });
    });
  });

  return data;
}

/**
 * Process Disbursement Summary
 */
function processDisbursementSummary(accountabilities, fundingGroupFilter) {
  const summary = {
    totalDisbursed: 0,
    byPaymentMethod: {},
    byFundingGroup: {},
    byMonth: {},
    tranches: [],
  };

  accountabilities.forEach((acc) => {
    acc.tranches?.forEach((tranche) => {
      // Filter by funding group if specified
      if (fundingGroupFilter && tranche.fundingGroup !== fundingGroupFilter) {
        return;
      }

      const amount = tranche.amountDisbursed || 0;
      summary.totalDisbursed += amount;

      // By payment method
      const method = tranche.paidThrough || "Unknown";
      summary.byPaymentMethod[method] =
        (summary.byPaymentMethod[method] || 0) + amount;

      // By funding group
      const group = tranche.fundingGroup || "General";
      summary.byFundingGroup[group] =
        (summary.byFundingGroup[group] || 0) + amount;

      // By month
      if (tranche.dateDisbursed) {
        const month = new Date(tranche.dateDisbursed).toLocaleString(
          "default",
          { month: "short", year: "numeric" },
        );
        summary.byMonth[month] = (summary.byMonth[month] || 0) + amount;
      }

      // Individual tranches
      summary.tranches.push({
        school: acc.schoolName || acc.code,
        code: acc.code,
        trancheName: tranche.name,
        amount: amount,
        date: tranche.dateDisbursed,
        method: method,
        fundingGroup: tranche.fundingGroup,
      });
    });
  });

  return summary;
}

/**
 * Process Accountability Status
 */
function processAccountabilityStatus(accountabilities, fundingGroupFilter) {
  const status = {
    totalSchools: 0,
    fullyAccounted: 0,
    partiallyAccounted: 0,
    notAccounted: 0,
    schools: [],
  };

  accountabilities.forEach((acc) => {
    // Filter tranches by funding group if specified
    const relevantTranches = fundingGroupFilter
      ? acc.tranches?.filter((t) => t.fundingGroup === fundingGroupFilter) || []
      : acc.tranches || [];

    // Skip if no relevant tranches
    if (relevantTranches.length === 0) return;

    status.totalSchools++;

    const totalDisbursed = relevantTranches.reduce(
      (sum, t) => sum + (t.amountDisbursed || 0),
      0,
    );

    const totalAccounted = relevantTranches.reduce((sum, tranche) => {
      const entries = tranche.fundsAccountability?.accountingEntries || [];
      return (
        sum +
        entries
          .filter((e) => e.status === "approved")
          .reduce((s, e) => s + (e.value || 0), 0)
      );
    }, 0);

    const accountingRate = totalDisbursed
      ? (totalAccounted / totalDisbursed) * 100
      : 0;

    let accountingStatus = "Not Accounted";
    if (accountingRate >= 90) {
      status.fullyAccounted++;
      accountingStatus = "Fully Accounted";
    } else if (accountingRate > 0) {
      status.partiallyAccounted++;
      accountingStatus = "Partially Accounted";
    } else {
      status.notAccounted++;
    }

    status.schools.push({
      school: acc.schoolName || acc.code,
      code: acc.code,
      totalDisbursed,
      totalAccounted,
      accountingRate: accountingRate.toFixed(2),
      status: accountingStatus,
    });
  });

  return status;
}

/**
 * Process Funding Group Analysis
 */
function processFundingGroupAnalysis(
  budgets,
  accountabilities,
  fundingGroupFilter,
) {
  const analysis = {};

  // From budgets
  budgets.forEach((budget) => {
    budget.budget?.groups?.forEach((group) => {
      // Filter by funding group if specified
      if (fundingGroupFilter && group.group !== fundingGroupFilter) {
        return;
      }

      if (!analysis[group.group]) {
        analysis[group.group] = {
          budgeted: 0,
          disbursed: 0,
          accounted: 0,
          schools: 0,
        };
      }

      const budgetedAmount = group.categories.reduce((sum, cat) => {
        return (
          sum + cat.items.reduce((s, item) => s + (item.totalCostSSP || 0), 0)
        );
      }, 0);

      analysis[group.group].budgeted += budgetedAmount;
      analysis[group.group].schools++;
    });
  });

  // From accountability
  accountabilities.forEach((acc) => {
    acc.tranches?.forEach((tranche) => {
      const group = tranche.fundingGroup || "General";

      // Filter by funding group if specified
      if (fundingGroupFilter && group !== fundingGroupFilter) {
        return;
      }

      if (!analysis[group]) {
        analysis[group] = {
          budgeted: 0,
          disbursed: 0,
          accounted: 0,
          schools: 0,
        };
      }

      analysis[group].disbursed += tranche.amountDisbursed || 0;

      const accounted =
        tranche.fundsAccountability?.accountingEntries
          ?.filter((e) => e.status === "approved")
          .reduce((s, e) => s + (e.value || 0), 0) || 0;

      analysis[group].accounted += accounted;
    });
  });

  return Object.entries(analysis).map(([group, data]) => ({
    fundingGroup: group,
    ...data,
    utilizationRate: data.budgeted
      ? ((data.disbursed / data.budgeted) * 100).toFixed(2)
      : 0,
    accountingRate: data.disbursed
      ? ((data.accounted / data.disbursed) * 100).toFixed(2)
      : 0,
  }));
}

/**
 * Process School-wise Summary
 */
function processSchoolWiseSummary(
  budgets,
  accountabilities,
  fundingGroupFilter,
) {
  const summary = [];
  const accMap = new Map(accountabilities.map((a) => [a.code, a]));

  budgets.forEach((budget) => {
    const acc = accMap.get(budget.code);

    // Filter budget groups by funding group if specified
    const relevantGroups = fundingGroupFilter
      ? budget.budget?.groups?.filter((g) => g.group === fundingGroupFilter) ||
        []
      : budget.budget?.groups || [];

    const totalBudgeted = relevantGroups.reduce((sum, group) => {
      return (
        sum +
        group.categories.reduce((s, cat) => {
          return (
            s + cat.items.reduce((i, item) => i + (item.totalCostSSP || 0), 0)
          );
        }, 0)
      );
    }, 0);

    // Filter accountability tranches by funding group if specified
    const relevantTranches = fundingGroupFilter
      ? acc?.tranches?.filter((t) => t.fundingGroup === fundingGroupFilter) ||
        []
      : acc?.tranches || [];

    const totalDisbursed = relevantTranches.reduce(
      (sum, t) => sum + (t.amountDisbursed || 0),
      0,
    );

    const totalAccounted = relevantTranches.reduce((sum, tranche) => {
      const entries = tranche.fundsAccountability?.accountingEntries || [];
      return (
        sum +
        entries
          .filter((e) => e.status === "approved")
          .reduce((s, e) => s + (e.value || 0), 0)
      );
    }, 0);

    // Skip schools with no data for the selected funding group
    if (totalBudgeted === 0 && totalDisbursed === 0) return;

    summary.push({
      school: budget.school || budget.code,
      code: budget.code,
      state: budget.state10,
      county: budget.county28,
      totalBudgeted,
      totalDisbursed,
      totalAccounted,
      unaccounted: totalDisbursed - totalAccounted,
      budgetUtilization: totalBudgeted
        ? ((totalDisbursed / totalBudgeted) * 100).toFixed(2)
        : 0,
      accountingRate: totalDisbursed
        ? ((totalAccounted / totalDisbursed) * 100).toFixed(2)
        : 0,
    });
  });

  return summary;
}

/**
 * Process Expenditure by Category
 */
function processExpenditureByCategory(accountabilities, fundingGroupFilter) {
  const categories = {};

  accountabilities.forEach((acc) => {
    acc.tranches?.forEach((tranche) => {
      // Filter by funding group if specified
      if (fundingGroupFilter && tranche.fundingGroup !== fundingGroupFilter) {
        return;
      }

      tranche.expenditures?.forEach((exp) => {
        const category = exp.category || "Uncategorized";
        if (!categories[category]) {
          categories[category] = {
            total: 0,
            count: 0,
            schools: new Set(),
          };
        }

        categories[category].total += exp.amount || 0;
        categories[category].count++;
        categories[category].schools.add(acc.code);
      });
    });
  });

  return Object.entries(categories).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
    schools: data.schools.size,
    average: data.count ? (data.total / data.count).toFixed(2) : 0,
  }));
}

/**
 * Calculate Overall Statistics
 */
function calculateOverallStats(budgets, accountabilities, fundingGroupFilter) {
  // Filter budget groups by funding group if specified
  const totalBudgeted = budgets.reduce((sum, budget) => {
    const relevantGroups = fundingGroupFilter
      ? budget.budget?.groups?.filter((g) => g.group === fundingGroupFilter) ||
        []
      : budget.budget?.groups || [];

    return (
      sum +
      relevantGroups.reduce((s, group) => {
        return (
          s +
          group.categories.reduce((c, cat) => {
            return (
              c + cat.items.reduce((i, item) => i + (item.totalCostSSP || 0), 0)
            );
          }, 0)
        );
      }, 0)
    );
  }, 0);

  // Filter accountability tranches by funding group if specified
  const totalDisbursed = accountabilities.reduce((sum, acc) => {
    const relevantTranches = fundingGroupFilter
      ? acc.tranches?.filter((t) => t.fundingGroup === fundingGroupFilter) || []
      : acc.tranches || [];

    return (
      sum + relevantTranches.reduce((s, t) => s + (t.amountDisbursed || 0), 0)
    );
  }, 0);

  const totalAccounted = accountabilities.reduce((sum, acc) => {
    const relevantTranches = fundingGroupFilter
      ? acc.tranches?.filter((t) => t.fundingGroup === fundingGroupFilter) || []
      : acc.tranches || [];

    return (
      sum +
      relevantTranches.reduce((s, tranche) => {
        const entries = tranche.fundsAccountability?.accountingEntries || [];
        return (
          s +
          entries
            .filter((e) => e.status === "approved")
            .reduce((a, e) => a + (e.value || 0), 0)
        );
      }, 0)
    );
  }, 0);

  // Count schools with data for the selected funding group
  const schoolsWithData = new Set();
  budgets.forEach((budget) => {
    const relevantGroups = fundingGroupFilter
      ? budget.budget?.groups?.filter((g) => g.group === fundingGroupFilter) ||
        []
      : budget.budget?.groups || [];

    if (relevantGroups.length > 0) {
      schoolsWithData.add(budget.code);
    }
  });

  return {
    totalSchools: schoolsWithData.size,
    totalBudgeted,
    totalDisbursed,
    totalAccounted,
    unaccounted: totalDisbursed - totalAccounted,
    budgetUtilization: totalBudgeted
      ? ((totalDisbursed / totalBudgeted) * 100).toFixed(2)
      : 0,
    accountingRate: totalDisbursed
      ? ((totalAccounted / totalDisbursed) * 100).toFixed(2)
      : 0,
  };
}
