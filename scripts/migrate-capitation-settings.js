const mongoose = require("mongoose");
const CapitationSettings = require("../models/capitationSettings");

// Migration script to convert legacy capitation settings to new dynamic format
async function migrateCapitationSettings() {
  try {
    console.log("Starting capitation settings migration...");

    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/sams"
    );
    console.log("Connected to database");

    // Find all existing settings
    const allSettings = await CapitationSettings.find({});
    console.log(`Found ${allSettings.length} settings documents to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const settings of allSettings) {
      // Check if already migrated (has grantRules field)
      if (settings.grantRules && settings.grantRules.length > 0) {
        console.log(`Skipping ${settings.academicYear} - already migrated`);
        skippedCount++;
        continue;
      }

      console.log(`Migrating settings for year ${settings.academicYear}...`);

      const updates = {
        // Ensure new structure exists
        schoolTypes: settings.schoolTypes || [
          {
            code: "PRI",
            name: "Primary School",
            description: "Basic primary education",
            category: "Basic Education",
            isActive: true,
          },
          {
            code: "SEC",
            name: "Secondary School",
            description: "Secondary education",
            category: "Basic Education",
            isActive: true,
          },
          {
            code: "ALP",
            name: "Adult Learning Program",
            description: "Adult literacy programs",
            category: "Adult Education",
            isActive: true,
          },
        ],
        fundingCategories: settings.fundingCategories || [
          {
            code: "OPEX",
            name: "Operational Expenditure",
            description: "Day-to-day operational costs",
            isActive: true,
            allowedExpenseTypes: ["Salaries", "Utilities", "Supplies"],
            restrictions: [],
          },
          {
            code: "CAPEX",
            name: "Capital Expenditure",
            description: "Infrastructure and equipment",
            isActive: true,
            allowedExpenseTypes: ["Buildings", "Equipment", "Furniture"],
            restrictions: [],
          },
        ],
        grantRules: [],
        status: settings.status || "ACTIVE",
        version: settings.version || "1.0",
      };

      // Convert legacy OPEX rules
      if (settings.capitationGrants?.rules) {
        settings.capitationGrants.rules.forEach((rule) => {
          const newRule = {
            schoolTypeCode: rule.schoolType,
            fundingCategoryCode: "OPEX",
            currency: rule.currency,
            amountPerLearner: rule.amountPerLearner,
            amountPerSchool: rule.amountPerSchool,
            exchangeRateToSSP: rule.exchangeRateToSSP,
            tranches: [],
            isActive: true,
          };

          // Convert legacy tranche distribution
          if (rule.trancheDistribution) {
            const td = rule.trancheDistribution;
            if (td.tranche1Pct) {
              newRule.tranches.push({
                trancheNumber: 1,
                name: "First Tranche",
                percentage: td.tranche1Pct,
                inflationCorrectionPct: td.tranche1InflationCorrectionPct || 0,
                isActive: true,
              });
            }
            if (td.tranche2Pct) {
              newRule.tranches.push({
                trancheNumber: 2,
                name: "Second Tranche",
                percentage: td.tranche2Pct,
                inflationCorrectionPct: td.tranche2InflationCorrectionPct || 0,
                isActive: true,
              });
            }
            if (td.tranche3Pct) {
              newRule.tranches.push({
                trancheNumber: 3,
                name: "Third Tranche",
                percentage: td.tranche3Pct,
                inflationCorrectionPct: td.tranche3InflationCorrectionPct || 0,
                isActive: true,
              });
            }
          }

          updates.grantRules.push(newRule);
        });
      }

      // Convert legacy CAPEX rules
      if (settings.capitalSpend?.rules) {
        settings.capitalSpend.rules.forEach((rule) => {
          const newRule = {
            schoolTypeCode: rule.schoolType,
            fundingCategoryCode: "CAPEX",
            currency: rule.currency,
            amountPerLearner: rule.amountPerLearner,
            amountPerSchool: rule.amountPerSchool,
            exchangeRateToSSP: rule.exchangeRateToSSP,
            tranches: [],
            isActive: true,
          };

          // Convert legacy tranche distribution
          if (rule.trancheDistribution) {
            const td = rule.trancheDistribution;
            if (td.tranche1Pct) {
              newRule.tranches.push({
                trancheNumber: 1,
                name: "First Tranche",
                percentage: td.tranche1Pct,
                inflationCorrectionPct: td.tranche1InflationCorrectionPct || 0,
                isActive: true,
              });
            }
            if (td.tranche2Pct) {
              newRule.tranches.push({
                trancheNumber: 2,
                name: "Second Tranche",
                percentage: td.tranche2Pct,
                inflationCorrectionPct: td.tranche2InflationCorrectionPct || 0,
                isActive: true,
              });
            }
            if (td.tranche3Pct) {
              newRule.tranches.push({
                trancheNumber: 3,
                name: "Third Tranche",
                percentage: td.tranche3Pct,
                inflationCorrectionPct: td.tranche3InflationCorrectionPct || 0,
                isActive: true,
              });
            }
          }

          updates.grantRules.push(newRule);
        });
      }

      // Convert legacy disbursement structure
      if (settings.disbursement && !settings.disbursementChannels) {
        const channels = [];
        if (settings.disbursement.bank !== undefined) {
          channels.push({
            code: "BANK",
            name: "Bank Transfer",
            isEnabled: settings.disbursement.bank,
            processingTimeDays: 3,
            fees: 0,
          });
        }
        if (settings.disbursement.stateMinistry !== undefined) {
          channels.push({
            code: "MINISTRY",
            name: "State Ministry",
            isEnabled: settings.disbursement.stateMinistry,
            processingTimeDays: 7,
            fees: 0,
          });
        }
        if (settings.disbursement.stateAnchor !== undefined) {
          channels.push({
            code: "ANCHOR",
            name: "State Anchor",
            isEnabled: settings.disbursement.stateAnchor,
            processingTimeDays: 5,
            fees: 0,
          });
        }
        if (settings.disbursement.thirdPartyAgents !== undefined) {
          channels.push({
            code: "AGENTS",
            name: "Third Party Agents",
            isEnabled: settings.disbursement.thirdPartyAgents,
            processingTimeDays: 2,
            fees: 0,
          });
        }
        updates.disbursementChannels = channels;
      }

      // Convert legacy funding types
      if (settings.fundingTypes && !settings.fundingSources) {
        const sources = [];
        if (settings.fundingTypes.capitationGrants !== undefined) {
          sources.push({
            code: "CG",
            name: "Capitation Grants",
            isEnabled: settings.fundingTypes.capitationGrants,
            description: "Government capitation grants",
          });
        }
        if (settings.fundingTypes.otherIncomes !== undefined) {
          sources.push({
            code: "OTHER_INCOME",
            name: "Other Incomes",
            isEnabled: settings.fundingTypes.otherIncomes,
            description: "Additional school income",
          });
        }
        if (settings.fundingTypes.otherDonors !== undefined) {
          sources.push({
            code: "DONORS",
            name: "Other Donors",
            isEnabled: settings.fundingTypes.otherDonors,
            description: "External donor funding",
          });
        }
        updates.fundingSources = sources;
      }

      // Add configuration defaults
      if (!settings.configuration) {
        updates.configuration = {
          allowCustomSchoolTypes: false,
          allowCustomFundingCategories: false,
          requireApprovalForChanges: true,
          maxTrancheCount: 5,
          minTranchePercentage: 5,
        };
      }

      // Add audit trail entry
      if (!settings.auditTrail) {
        updates.auditTrail = [
          {
            action: "MIGRATE",
            performedBy: "system",
            performedAt: new Date(),
            changes: { migratedToNewFormat: true },
            reason: "Automated migration to dynamic capitation settings format",
          },
        ];
      }

      // Update the document
      await CapitationSettings.findByIdAndUpdate(
        settings._id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      console.log(`✓ Migrated settings for year ${settings.academicYear}`);
      migratedCount++;
    }

    console.log(`\nMigration completed!`);
    console.log(`- Migrated: ${migratedCount} documents`);
    console.log(`- Skipped: ${skippedCount} documents (already migrated)`);
    console.log(`- Total: ${allSettings.length} documents processed`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCapitationSettings()
    .then(() => {
      console.log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateCapitationSettings };
