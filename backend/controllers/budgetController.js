const pool = require("../config/db");

// @desc    Get all budgets for a user
// @route   GET /api/budgets
const getBudgets = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM budgets WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("GetBudgets error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Create or update a budget
// @route   POST /api/budgets
const upsertBudget = async (req, res) => {
    try {
        const { category, amount, period } = req.body;

        if (!category || !amount) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }

        const result = await pool.query(
            "INSERT INTO budgets (user_id, category, amount, period) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, category) DO UPDATE SET amount = EXCLUDED.amount, period = EXCLUDED.period RETURNING *",
            [req.user.id, category, amount, period || 'monthly']
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("UpsertBudget error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM budgets WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        res.json({ message: "Budget deleted successfully" });
    } catch (err) {
        console.error("DeleteBudget error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getBudgets, upsertBudget, deleteBudget };
