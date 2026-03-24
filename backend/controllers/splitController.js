const pool = require("../config/db");
const crypto = require("crypto");

const toNumber = (value) => Number.parseFloat(value);
const round2 = (value) => Number(value.toFixed(2));

const isGroupMember = async (groupId, userId) => {
  const result = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
    [groupId, userId]
  );
  return result.rows.length > 0;
};

const getGroupMemberIds = async (groupId) => {
  const result = await pool.query(
    "SELECT user_id FROM group_members WHERE group_id = $1",
    [groupId]
  );
  return result.rows.map((row) => row.user_id);
};

exports.getUsers = async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email FROM users ORDER BY name ASC"
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Get users error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.createGroup = async (req, res) => {
  const { name, memberIds = [] } = req.body;
  const createdBy = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Group name is required" });
  }

  try {
    const cleanMemberIds = Array.from(
      new Set(
        memberIds
          .map((id) => Number.parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );

    const allMembers = Array.from(new Set([createdBy, ...cleanMemberIds]));
    const existingUsers = await pool.query(
      "SELECT id FROM users WHERE id = ANY($1::int[])",
      [allMembers]
    );

    if (existingUsers.rows.length !== allMembers.length) {
      return res.status(400).json({ message: "Some selected members do not exist" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const groupResult = await client.query(
        "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at",
        [name.trim(), createdBy]
      );
      const group = groupResult.rows[0];

      for (const userId of allMembers) {
        await client.query(
          "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT (group_id, user_id) DO NOTHING",
          [group.id, userId]
        );
      }

      await client.query("COMMIT");
      return res.status(201).json(group);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Create group error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.created_by, g.created_at,
              ARRAY_AGG(gm2.user_id ORDER BY gm2.user_id) AS member_ids
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       JOIN group_members gm2 ON gm2.group_id = g.id
       WHERE gm.user_id = $1
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Get groups error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.addGroupMember = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  const userId = Number.parseInt(req.body.userId, 10);

  if (!groupId || !userId) {
    return res.status(400).json({ message: "Valid groupId and userId are required" });
  }

  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const insertResult = await pool.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, user_id) DO NOTHING
       RETURNING id`,
      [groupId, userId]
    );

    if (insertResult.rows.length === 0) {
      return res.status(400).json({ message: "User is already a member of this group" });
    }

    return res.status(201).json({
      message: "Member added successfully",
      member: userResult.rows[0],
    });
  } catch (err) {
    console.error("Add group member error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.removeGroupMember = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  const userId = Number.parseInt(req.params.userId, 10);

  if (!groupId || !userId) {
    return res.status(400).json({ message: "Valid groupId and userId are required" });
  }

  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    await pool.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );

    return res.json({ message: "Member removed successfully" });
  } catch (err) {
    console.error("Remove group member error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.addExpense = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  const {
    title,
    amount,
    splitType,
    paidBy,
    participants = [],
    expenseDate,
  } = req.body;

  if (!groupId || !title || !splitType) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const totalAmount = toNumber(amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return res.status(400).json({ message: "Amount must be greater than 0" });
  }

  if (!["equal", "exact", "percentage"].includes(splitType)) {
    return res.status(400).json({ message: "Invalid split type" });
  }

  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const memberIds = await getGroupMemberIds(groupId);
    const payerId = Number.parseInt(paidBy, 10) || req.user.id;

    if (!memberIds.includes(payerId)) {
      return res.status(400).json({ message: "Paid by user must be a group member" });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: "At least one participant is required" });
    }

    const normalizedParticipants = participants.map((p) => ({
      userId: Number.parseInt(p.userId, 10),
      exactAmount: p.exactAmount != null ? toNumber(p.exactAmount) : null,
      percentage: p.percentage != null ? toNumber(p.percentage) : null,
    }));

    if (normalizedParticipants.some((p) => !memberIds.includes(p.userId))) {
      return res.status(400).json({ message: "All participants must be group members" });
    }

    if (new Set(normalizedParticipants.map((p) => p.userId)).size !== normalizedParticipants.length) {
      return res.status(400).json({ message: "Duplicate participants are not allowed" });
    }

    let shares = [];
    if (splitType === "equal") {
      const perHead = round2(totalAmount / normalizedParticipants.length);
      let assigned = 0;
      shares = normalizedParticipants.map((p, idx) => {
        const owedAmount = idx === normalizedParticipants.length - 1
          ? round2(totalAmount - assigned)
          : perHead;
        assigned = round2(assigned + owedAmount);
        return { userId: p.userId, owedAmount, exactAmount: null, percentage: null };
      });
    } else if (splitType === "exact") {
      if (normalizedParticipants.some((p) => !Number.isFinite(p.exactAmount) || p.exactAmount < 0)) {
        return res.status(400).json({ message: "Exact split requires valid exact amounts" });
      }
      const exactTotal = round2(normalizedParticipants.reduce((sum, p) => sum + p.exactAmount, 0));
      if (Math.abs(exactTotal - round2(totalAmount)) > 0.01) {
        return res.status(400).json({ message: "Exact amounts must add up to total amount" });
      }
      shares = normalizedParticipants.map((p) => ({
        userId: p.userId,
        owedAmount: round2(p.exactAmount),
        exactAmount: round2(p.exactAmount),
        percentage: null,
      }));
    } else {
      if (normalizedParticipants.some((p) => !Number.isFinite(p.percentage) || p.percentage < 0)) {
        return res.status(400).json({ message: "Percentage split requires valid percentages" });
      }
      const percentageTotal = round2(
        normalizedParticipants.reduce((sum, p) => sum + p.percentage, 0)
      );
      if (Math.abs(percentageTotal - 100) > 0.01) {
        return res.status(400).json({ message: "Percentages must add up to 100" });
      }

      let assigned = 0;
      shares = normalizedParticipants.map((p, idx) => {
        const owedAmount = idx === normalizedParticipants.length - 1
          ? round2(totalAmount - assigned)
          : round2((totalAmount * p.percentage) / 100);
        assigned = round2(assigned + owedAmount);
        return {
          userId: p.userId,
          owedAmount,
          exactAmount: null,
          percentage: round2(p.percentage),
        };
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const expenseResult = await client.query(
        `INSERT INTO split_expenses (group_id, paid_by, title, amount, split_type, expense_date)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
         RETURNING id, group_id, paid_by, title, amount, split_type, expense_date, created_at`,
        [groupId, payerId, title.trim(), round2(totalAmount), splitType, expenseDate || null]
      );
      const expense = expenseResult.rows[0];

      for (const share of shares) {
        await client.query(
          `INSERT INTO split_expense_shares (expense_id, user_id, owed_amount, percentage, exact_amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            expense.id,
            share.userId,
            share.owedAmount,
            share.percentage,
            share.exactAmount,
          ]
        );
      }

      await client.query("COMMIT");
      return res.status(201).json(expense);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Add split expense error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getExpenses = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const expenseResult = await pool.query(
      `SELECT se.id, se.group_id, se.paid_by, u.name AS paid_by_name, se.title, se.amount, se.split_type, se.expense_date, se.created_at
       FROM split_expenses se
       JOIN users u ON u.id = se.paid_by
       WHERE se.group_id = $1
       ORDER BY se.expense_date DESC, se.created_at DESC`,
      [groupId]
    );

    const shareResult = await pool.query(
      `SELECT ses.expense_id, ses.user_id, u.name, ses.owed_amount, ses.percentage, ses.exact_amount
       FROM split_expense_shares ses
       JOIN users u ON u.id = ses.user_id
       JOIN split_expenses se ON se.id = ses.expense_id
       WHERE se.group_id = $1`,
      [groupId]
    );

    const sharesByExpense = shareResult.rows.reduce((acc, share) => {
      if (!acc[share.expense_id]) acc[share.expense_id] = [];
      acc[share.expense_id].push(share);
      return acc;
    }, {});

    const payload = expenseResult.rows.map((expense) => ({
      ...expense,
      shares: sharesByExpense[expense.id] || [],
    }));

    return res.json(payload);
  } catch (err) {
    console.error("Get split expenses error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getBalances = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);

  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY u.name ASC`,
      [groupId]
    );
    const members = membersResult.rows;

    const paidResult = await pool.query(
      `SELECT paid_by AS user_id, COALESCE(SUM(amount), 0) AS total_paid
       FROM split_expenses
       WHERE group_id = $1
       GROUP BY paid_by`,
      [groupId]
    );

    const owedResult = await pool.query(
      `SELECT ses.user_id, COALESCE(SUM(ses.owed_amount), 0) AS total_owed
       FROM split_expense_shares ses
       JOIN split_expenses se ON se.id = ses.expense_id
       WHERE se.group_id = $1
       GROUP BY ses.user_id`,
      [groupId]
    );

    const settlementsResult = await pool.query(
      `SELECT from_user, to_user, amount
       FROM settlements
       WHERE group_id = $1`,
      [groupId]
    );

    const paidMap = Object.fromEntries(
      paidResult.rows.map((row) => [row.user_id, toNumber(row.total_paid)])
    );
    const owedMap = Object.fromEntries(
      owedResult.rows.map((row) => [row.user_id, toNumber(row.total_owed)])
    );
    const settlementDelta = {};

    for (const settlement of settlementsResult.rows) {
      const from = settlement.from_user;
      const to = settlement.to_user;
      const amount = toNumber(settlement.amount);
      settlementDelta[from] = round2((settlementDelta[from] || 0) + amount);
      settlementDelta[to] = round2((settlementDelta[to] || 0) - amount);
    }

    const netBalances = members.map((member) => {
      const net = round2(
        (paidMap[member.id] || 0) - (owedMap[member.id] || 0) + (settlementDelta[member.id] || 0)
      );
      return {
        user_id: member.id,
        name: member.name,
        email: member.email,
        balance: net,
      };
    });

    const creditors = netBalances
      .filter((m) => m.balance > 0.01)
      .map((m) => ({ ...m, remaining: m.balance }));
    const debtors = netBalances
      .filter((m) => m.balance < -0.01)
      .map((m) => ({ ...m, remaining: Math.abs(m.balance) }));

    const settlements = [];
    let c = 0;
    let d = 0;
    while (c < creditors.length && d < debtors.length) {
      const amount = round2(Math.min(creditors[c].remaining, debtors[d].remaining));
      if (amount > 0) {
        settlements.push({
          from_user_id: debtors[d].user_id,
          from_name: debtors[d].name,
          to_user_id: creditors[c].user_id,
          to_name: creditors[c].name,
          amount,
        });
      }
      creditors[c].remaining = round2(creditors[c].remaining - amount);
      debtors[d].remaining = round2(debtors[d].remaining - amount);
      if (creditors[c].remaining <= 0.01) c += 1;
      if (debtors[d].remaining <= 0.01) d += 1;
    }

    return res.json({ netBalances, settlements });
  } catch (err) {
    console.error("Get balances error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.addSettlement = async (req, res) => {
  const { groupId, toUserId, amount, note } = req.body;
  const fromUserId = req.user.id;
  const parsedGroupId = Number.parseInt(groupId, 10);
  const parsedToUserId = Number.parseInt(toUserId, 10);
  const parsedAmount = toNumber(amount);

  if (!parsedGroupId || !parsedToUserId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: "Invalid settlement payload" });
  }
  if (fromUserId === parsedToUserId) {
    return res.status(400).json({ message: "Cannot settle with yourself" });
  }

  try {
    const fromMember = await isGroupMember(parsedGroupId, fromUserId);
    const toMember = await isGroupMember(parsedGroupId, parsedToUserId);
    if (!fromMember || !toMember) {
      return res.status(403).json({ message: "Both users must be in the same group" });
    }

    const result = await pool.query(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, group_id, from_user, to_user, amount, note, settled_at`,
      [parsedGroupId, fromUserId, parsedToUserId, round2(parsedAmount), note || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add settlement error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteGroup = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  if (!groupId) return res.status(400).json({ message: "Invalid group ID" });

  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      await client.query(
        "DELETE FROM split_expense_shares WHERE expense_id IN (SELECT id FROM split_expenses WHERE group_id = $1)",
        [groupId]
      );
      await client.query("DELETE FROM split_expenses WHERE group_id = $1", [groupId]);
      await client.query("DELETE FROM settlements WHERE group_id = $1", [groupId]);
      await client.query("DELETE FROM group_members WHERE group_id = $1", [groupId]);
      await client.query("DELETE FROM groups WHERE id = $1", [groupId]);

      await client.query("COMMIT");
      return res.json({ message: "Group deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Delete group error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteExpense = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  const expenseId = Number.parseInt(req.params.expenseId, 10);

  if (!groupId || !expenseId) return res.status(400).json({ message: "Invalid IDs" });

  try {
    const requesterIsMember = await isGroupMember(groupId, req.user.id);
    if (!requesterIsMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM split_expense_shares WHERE expense_id = $1", [expenseId]);
      await client.query("DELETE FROM split_expenses WHERE id = $1 AND group_id = $2", [expenseId, groupId]);
      await client.query("COMMIT");
      return res.json({ message: "Expense deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Delete expense error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── Invite Link ───────────────────────────────────────────────

exports.generateInvite = async (req, res) => {
  const groupId = Number.parseInt(req.params.groupId, 10);
  if (!groupId) return res.status(400).json({ message: "Invalid group ID" });

  try {
    const isMember = await isGroupMember(groupId, req.user.id);
    if (!isMember) return res.status(403).json({ message: "Not a group member" });

    // Generate UUID in Node so we don't need pgcrypto DB extension
    const inviteToken = crypto.randomUUID();
    await pool.query("DELETE FROM group_invites WHERE group_id = $1", [groupId]);
    const result = await pool.query(
      "INSERT INTO group_invites (group_id, token) VALUES ($1, $2) RETURNING token",
      [groupId, inviteToken]
    );
    const token = result.rows[0].token;
    return res.json({ token, link: `http://localhost:5173/join/${token}` });
  } catch (err) {
    console.error("Generate invite error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.getInviteInfo = async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      `SELECT g.id AS group_id, g.name AS group_name
       FROM group_invites gi
       JOIN groups g ON g.id = gi.group_id
       WHERE gi.token = $1`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Invalid or expired invite link" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Get invite info error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.joinViaInvite = async (req, res) => {
  const { token } = req.params;
  const userId = req.user.id;

  try {
    const inviteResult = await pool.query(
      "SELECT group_id FROM group_invites WHERE token = $1",
      [token]
    );
    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ message: "Invalid or expired invite link" });
    }
    const groupId = inviteResult.rows[0].group_id;

    await pool.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT (group_id, user_id) DO NOTHING",
      [groupId, userId]
    );

    return res.json({ message: "Joined group successfully", groupId });
  } catch (err) {
    console.error("Join via invite error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};