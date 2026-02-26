const pool = require("../config/db");

// @desc    Get all transactions for user
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get transactions error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add new transaction
// @route   POST /api/transactions
const addTransaction = async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    if (!title || !amount || !type || !category || !date) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    const newTransaction = await pool.query(
      "INSERT INTO transactions (user_id, title, amount, type, category, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.user.id, title, amount, type, category, date]
    );

    res.status(201).json(newTransaction.rows[0]);
  } catch (err) {
    console.error("Add transaction error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, type, category, date } = req.body;

    // Check if transaction belongs to user
    const transaction = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const updatedTransaction = await pool.query(
      "UPDATE transactions SET title = $1, amount = $2, type = $3, category = $4, date = $5 WHERE id = $6 AND user_id = $7 RETURNING *",
      [title, amount, type, category, date, id, req.user.id]
    );

    res.json(updatedTransaction.rows[0]);
  } catch (err) {
    console.error("Update transaction error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transaction belongs to user
    const transaction = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await pool.query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [
      id,
      req.user.id,
    ]);

    res.json({ message: "Transaction removed" });
  } catch (err) {
    console.error("Delete transaction error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
