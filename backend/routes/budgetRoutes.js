const express = require("express");
const router = express.Router();
const { getBudgets, upsertBudget, deleteBudget } = require("../controllers/budgetController");
const auth = require("../middleware/auth");

router.use(auth); // Protect all budget routes

router.get("/", getBudgets);
router.post("/", upsertBudget);
router.delete("/:id", deleteBudget);

module.exports = router;
