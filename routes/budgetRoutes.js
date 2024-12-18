const express = require("express");
const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getEligibility,
  getBudgetByCode,
} = require("../controller/budgetController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: API endpoints for managing budgets
 */

/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budgets]
 *     description: Adds a new budget to the system.
 *     requestBody:
 *       description: Budget data to create a new budget
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submittedAmount
 *               - preparedBy
 *               - reviewedBy
 *               - reviewDate
 *               - groups
 *             properties:
 *               submittedAmount:
 *                 type: number
 *                 example: 100000
 *               preparedBy:
 *                 type: string
 *                 example: "John Doe"
 *               reviewedBy:
 *                 type: string
 *                 example: "Jane Smith"
 *               reviewDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-08-10"
 *               groups:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     group:
 *                       type: string
 *                       enum: [OPEX, CAPEX]
 *                       example: "OPEX"
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "123"
 *                           categoryName:
 *                             type: string
 *                             example: "Infrastructure"
 *     responses:
 *       201:
 *         description: Budget successfully created
 *       400:
 *         description: Bad request, invalid input
 */
router.post("/", createBudget);

/**
 * @swagger
 * /budgets:
 *   get:
 *     summary: Get all budgets
 *     tags: [Budgets]
 *     description: Retrieve a list of all budgets in the system.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of budgets
 *       500:
 *         description: Internal server error
 */
router.get("/", getBudgets);

/**
 * @swagger
 * /budgets/{id}:
 *   get:
 *     summary: Get a budget by ID
 *     tags: [Budgets]
 *     description: Retrieve a specific budget using its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the budget to retrieve
 *         schema:
 *           type: string
 *           example: "64da92f9aef84729b26a29a1"
 *     responses:
 *       200:
 *         description: Successfully retrieved the budget
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", getBudgetById);

/**
 * @swagger
 * /budgets/code/{code}:
 *   get:
 *     summary: Get a budget by code
 *     tags: [Budgets]
 *     description: Retrieve a specific budget using its code.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: The code of the budget to retrieve
 *         schema:
 *           type: string
 *           example: "ABB"
 *     responses:
 *       200:
 *         description: Successfully retrieved the budget
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Internal server error
 */
router.get("/code/:code/:year", getBudgetByCode);

/**
 * @swagger
 * /budgets/{id}:
 *   put:
 *     summary: Update a budget by ID
 *     tags: [Budgets]
 *     description: Update the details of an existing budget using its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the budget to update
 *         schema:
 *           type: string
 *           example: "64da92f9aef84729b26a29a1"
 *     requestBody:
 *       description: Updated budget data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               submittedAmount:
 *                 type: number
 *                 example: 120000
 *               reviewedBy:
 *                 type: string
 *                 example: "Jane Smith"
 *               reviewDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-08-15"
 *     responses:
 *       200:
 *         description: Successfully updated the budget
 *       400:
 *         description: Bad request, invalid input
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", updateBudget);

/**
 * @swagger
 * /budgets/{id}:
 *   delete:
 *     summary: Delete a budget by ID
 *     tags: [Budgets]
 *     description: Remove a budget from the system using its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the budget to delete
 *         schema:
 *           type: string
 *           example: "64da92f9aef84729b26a29a1"
 *     responses:
 *       200:
 *         description: Budget successfully deleted
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", deleteBudget);

router.get("/get/eligibility", getEligibility);

module.exports = router;
