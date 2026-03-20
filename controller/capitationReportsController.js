const Budget = require("../models/budget");
const Accountability = require("../models/accountability");

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
    const [budgets, accountabilities] = await Promise.all([
      Budget.find(budgetQuery)
        .select(
          "code school state10 county28 year budget.groups accountability",
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
    ]);

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
      Promise.resolve(processDisbursementSummary(accountabilities)),
      Promise.resolve(processAccountabilityStatus(accountabilities)),
      Promise.resolve(processFundingGroupAnalysis(budgets, accountabilities)),
      Promise.resolve(processSchoolWiseSummary(budgets, accountabilities)),
      Promise.resolve(processExpenditureByCategory(accountabilities)),
    ]);

    const overallStats = calculateOverallStats(budgets, accountabilities);

    const reports = {
      budgetVsActual,
      disbursementSummary,
      accountabilityStatus,
      fundingGroupAnalysis,
      schoolWiseSummary,
      expenditureByCategory,
      overallStats,
    };

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching capitation reports:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process Budget vs Actual data
 */
function processBudgetVsActual(budgets, fundingGroup) {
  const data = [];

  budgets.forEach((budget) => {
    if (!budget.budget?.groups) return;

    budget.budget.groups.forEach((group) => {
      // Filter by funding group if specified
      if (
        fundingGroup &&
        fundingGroup !== "ALL" &&
        group.group !== fundingGroup
      )
        return;

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
function processDisbursementSummary(accountabilities) {
  const summary = {
    totalDisbursed: 0,
    byPaymentMethod: {},
    byFundingGroup: {},
    byMonth: {},
    tranches: [],
  };

  accountabilities.forEach((acc) => {
    acc.tranches?.forEach((tranche) => {
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
function processAccountabilityStatus(accountabilities) {
  const status = {
    totalSchools: accountabilities.length,
    fullyAccounted: 0,
    partiallyAccounted: 0,
    notAccounted: 0,
    schools: [],
  };

  accountabilities.forEach((acc) => {
    const totalDisbursed =
      acc.tranches?.reduce((sum, t) => sum + (t.amountDisbursed || 0), 0) || 0;

    const totalAccounted =
      acc.tranches?.reduce((sum, tranche) => {
        const entries = tranche.fundsAccountability?.accountingEntries || [];
        return (
          sum +
          entries
            .filter((e) => e.status === "approved")
            .reduce((s, e) => s + (e.value || 0), 0)
        );
      }, 0) || 0;

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
function processFundingGroupAnalysis(budgets, accountabilities) {
  const analysis = {};

  // From budgets
  budgets.forEach((budget) => {
    budget.budget?.groups?.forEach((group) => {
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
function processSchoolWiseSummary(budgets, accountabilities) {
  const summary = [];
  const accMap = new Map(accountabilities.map((a) => [a.code, a]));

  budgets.forEach((budget) => {
    const acc = accMap.get(budget.code);

    const totalBudgeted =
      budget.budget?.groups?.reduce((sum, group) => {
        return (
          sum +
          group.categories.reduce((s, cat) => {
            return (
              s + cat.items.reduce((i, item) => i + (item.totalCostSSP || 0), 0)
            );
          }, 0)
        );
      }, 0) || 0;

    const totalDisbursed =
      acc?.tranches?.reduce((sum, t) => sum + (t.amountDisbursed || 0), 0) || 0;

    const totalAccounted =
      acc?.tranches?.reduce((sum, tranche) => {
        const entries = tranche.fundsAccountability?.accountingEntries || [];
        return (
          sum +
          entries
            .filter((e) => e.status === "approved")
            .reduce((s, e) => s + (e.value || 0), 0)
        );
      }, 0) || 0;

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
function processExpenditureByCategory(accountabilities) {
  const categories = {};

  accountabilities.forEach((acc) => {
    acc.tranches?.forEach((tranche) => {
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
function calculateOverallStats(budgets, accountabilities) {
  const totalBudgeted = budgets.reduce((sum, budget) => {
    return (
      sum +
      (budget.budget?.groups?.reduce((s, group) => {
        return (
          s +
          group.categories.reduce((c, cat) => {
            return (
              c + cat.items.reduce((i, item) => i + (item.totalCostSSP || 0), 0)
            );
          }, 0)
        );
      }, 0) || 0)
    );
  }, 0);

  const totalDisbursed = accountabilities.reduce((sum, acc) => {
    return (
      sum +
      (acc.tranches?.reduce((s, t) => s + (t.amountDisbursed || 0), 0) || 0)
    );
  }, 0);

  const totalAccounted = accountabilities.reduce((sum, acc) => {
    return (
      sum +
      (acc.tranches?.reduce((s, tranche) => {
        const entries = tranche.fundsAccountability?.accountingEntries || [];
        return (
          s +
          entries
            .filter((e) => e.status === "approved")
            .reduce((a, e) => a + (e.value || 0), 0)
        );
      }, 0) || 0)
    );
  }, 0);

  return {
    totalSchools: budgets.length,
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
