const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const splitRoutes = require("./routes/splitRoutes");

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Create users table on startup
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        period VARCHAR(50) DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_expenses (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        paid_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
        split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('equal','exact','percentage')),
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_expense_shares (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES split_expenses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        owed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        percentage NUMERIC(5, 2),
        exact_amount NUMERIC(10, 2),
        UNIQUE(expense_id, user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settlements (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        from_user INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_user INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
        note VARCHAR(255),
        settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`DROP TABLE IF EXISTS group_invites CASCADE`);
    await pool.query(`
      CREATE TABLE group_invites (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        token VARCHAR(36) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Backward-compatible migrations for earlier splitwise schema versions.
    await pool.query(`
      ALTER TABLE groups
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    await pool.query(`
      ALTER TABLE split_expenses
      ADD COLUMN IF NOT EXISTS title VARCHAR(255)
    `);
    // Safely migrate old data if exists
    const hasDescription = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='split_expenses' AND column_name='description'
    `);
    if (hasDescription.rowCount > 0) {
      await pool.query(`
        UPDATE split_expenses
        SET title = COALESCE(title, description, 'Expense')
        WHERE title IS NULL
      `);
    } else {
      await pool.query(`
        UPDATE split_expenses
        SET title = COALESCE(title, 'Expense')
        WHERE title IS NULL
      `);
    }
    await pool.query(`
      ALTER TABLE split_expenses
      ADD COLUMN IF NOT EXISTS split_type VARCHAR(20) DEFAULT 'equal'
    `);
    await pool.query(`
      UPDATE split_expenses
      SET split_type = 'equal'
      WHERE split_type IS NULL
    `);
    await pool.query(`
      ALTER TABLE split_expenses
      ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE
    `);
    await pool.query(`
      UPDATE split_expenses
      SET expense_date = CURRENT_DATE
      WHERE expense_date IS NULL
    `);
    await pool.query(`
      ALTER TABLE split_expenses
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    await pool.query(`
      UPDATE split_expenses
      SET created_at = CURRENT_TIMESTAMP
      WHERE created_at IS NULL
    `);
    await pool.query(`
      ALTER TABLE split_expenses
      ALTER COLUMN title SET NOT NULL
    `);
    await pool.query(`
      ALTER TABLE split_expenses
      ALTER COLUMN split_type SET NOT NULL
    `);
    await pool.query(`
      ALTER TABLE split_expenses
      ALTER COLUMN expense_date SET NOT NULL
    `);
    await pool.query(`
      DELETE FROM group_members gm
      USING group_members dup
      WHERE gm.id > dup.id
        AND gm.group_id = dup.group_id
        AND gm.user_id = dup.user_id
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS group_members_group_user_unique
      ON group_members (group_id, user_id)
    `);
    console.log("✅ Users table ready");
    console.log("✅ Transactions table ready");
    console.log("✅ Budgets table ready");
    console.log("✅ Split groups and expenses tables ready");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  }
};

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Expense Tracker API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/split", splitRoutes);

// Global error handlers — prevent crashes on unhandled errors
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught Exception:", err.message);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  initDB();
});


