const mongoose = require('mongoose');

// Define schema for activity items
const ItemSchema = new mongoose.Schema({
    budgetCode: { type: String, required: true },
    activityDescription: { type: String, required: true }
});

// Define schema for categories
const CategorySchema = new mongoose.Schema({
    category: { type: String, required: true },
    categoryCode: { type: String, required: true },
    items: [ItemSchema]
});

// Define schema for main type grouping (Revenue, Expenditure)
const BudgetCodeSchema = new mongoose.Schema({
    type: { 
        type: String, 
        required: true, 
        enum: ['Revenue', 'Expenditure']
    },
    categories: [CategorySchema]
});

// Export model
module.exports = mongoose.model('BudgetCodes', BudgetCodeSchema);
