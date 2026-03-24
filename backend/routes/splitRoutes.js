const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getUsers,
  createGroup,
  getGroups,
  addGroupMember,
  addExpense,
  getExpenses,
  getBalances,
  addSettlement,
  deleteGroup,
  deleteExpense,
  removeGroupMember,
  generateInvite,
  getInviteInfo,
  joinViaInvite,
} = require("../controllers/splitController");

// ── Public invite route (no auth) ──────────────
router.get("/invite/:token", getInviteInfo);

// ── All routes below require authentication ─────
router.use(auth);

router.get("/users", getUsers);
router.post("/groups", createGroup);
router.get("/groups", getGroups);
router.post("/groups/:groupId/members", addGroupMember);
router.post("/groups/:groupId/expenses", addExpense);
router.get("/groups/:groupId/expenses", getExpenses);
router.get("/groups/:groupId/balances", getBalances);
router.post("/settlements", addSettlement);
router.delete("/groups/:groupId", deleteGroup);
router.delete("/groups/:groupId/expenses/:expenseId", deleteExpense);
router.delete("/groups/:groupId/members/:userId", removeGroupMember);
router.post("/groups/:groupId/invite", generateInvite);
router.post("/invite/:token/join", joinViaInvite);

module.exports = router;
