import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  User,
  LogOut,
  Menu,
  X,
  Plus,
  Users,
  ReceiptIndianRupee,
  TrendingUp as GrowthIcon,
} from "lucide-react";
import "./Dashboard.css";

function Splitwise({ user, onLogout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ netBalances: [], settlements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [groupName, setGroupName] = useState("");
  const [groupMemberNames, setGroupMemberNames] = useState([]);  // free-text names
  const [newMemberNameInput, setNewMemberNameInput] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const [splitType, setSplitType] = useState("equal");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState("");
  const [participantIds, setParticipantIds] = useState([]);
  const [exactMap, setExactMap] = useState({});
  const [percentageMap, setPercentageMap] = useState({});

  const token = localStorage.getItem("token");

  const activeGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(selectedGroupId)),
    [groups, selectedGroupId]
  );

  const groupMembersForForm = useMemo(() => {
    if (!activeGroup) return [];
    return users.filter((u) => activeGroup.member_ids?.includes(u.id));
  }, [activeGroup, users]);

  const callApi = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  const fetchBaseData = async () => {
    setLoading(true);
    setError("");
    try {
      const [allUsers, myGroups] = await Promise.all([
        callApi("http://localhost:5001/api/split/users"),
        callApi("http://localhost:5001/api/split/groups"),
      ]);

      setUsers(allUsers);
      setGroups(myGroups);
      if (myGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(String(myGroups[0].id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupData = async (groupId) => {
    if (!groupId) {
      setExpenses([]);
      setBalances({ netBalances: [], settlements: [] });
      return;
    }
    try {
      const [expenseData, balanceData] = await Promise.all([
        callApi(`http://localhost:5001/api/split/groups/${groupId}/expenses`),
        callApi(`http://localhost:5001/api/split/groups/${groupId}/balances`),
      ]);
      setExpenses(expenseData);
      setBalances(balanceData);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchGroupData(selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5001/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (_err) { }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
    navigate("/login");
  };

  const toggleId = (ids, id) =>
    ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id];

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    try {
      // Only the creator's ID is sent; typed member names are display-only
      // (they are not registered users, so no IDs are available)
      await callApi("http://localhost:5001/api/split/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName, memberIds: [] }),
      });
      setGroupName("");
      // Keep groupMemberNames — they flow into Manage Group's Add Member dropdown
      await fetchBaseData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedGroupId) {
      setError("Please select a group first");
      return;
    }
    if (!expenseTitle.trim() || !expenseAmount || participantIds.length === 0) {
      setError("Fill title, amount, and participants");
      return;
    }

    const participants = participantIds.map((id) => ({
      userId: id,
      exactAmount: splitType === "exact" ? exactMap[id] || 0 : undefined,
      percentage: splitType === "percentage" ? percentageMap[id] || 0 : undefined,
    }));

    try {
      await callApi(`http://localhost:5001/api/split/groups/${selectedGroupId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          title: expenseTitle,
          amount: expenseAmount,
          splitType,
          paidBy: paidBy || user.id,
          participants,
          expenseDate,
        }),
      });
      setExpenseTitle("");
      setExpenseAmount("");
      setSplitType("equal");
      setPaidBy("");
      setParticipantIds([]);
      setExactMap({});
      setPercentageMap({});
      await fetchGroupData(selectedGroupId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedGroupId) {
      setError("Please select a group first");
      return;
    }
    if (!memberToAdd) {
      setError("Please select a user to add");
      return;
    }
    try {
      await callApi(`http://localhost:5001/api/split/groups/${selectedGroupId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: Number(memberToAdd) }),
      });
      setMemberToAdd("");
      await fetchBaseData();
      await fetchGroupData(selectedGroupId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSettle = async (settlement) => {
    try {
      await callApi("http://localhost:5001/api/split/settlements", {
        method: "POST",
        body: JSON.stringify({
          groupId: selectedGroupId,
          toUserId: settlement.to_user_id,
          amount: settlement.amount,
          note: `Settlement from UI`,
        }),
      });
      await fetchGroupData(selectedGroupId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member from the group?")) return;
    try {
      await callApi(`http://localhost:5001/api/split/groups/${selectedGroupId}/members/${userId}`, {
        method: "DELETE",
      });
      await fetchBaseData();
      await fetchGroupData(selectedGroupId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group? All expenses and settlements will be permanently removed.")) return;
    try {
      await callApi(`http://localhost:5001/api/split/groups/${groupId}`, {
        method: "DELETE",
      });
      if (String(selectedGroupId) === String(groupId)) {
        setSelectedGroupId("");
        setExpenses([]);
        setBalances({ netBalances: [], settlements: [] });
      }
      await fetchBaseData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await callApi(`http://localhost:5001/api/split/groups/${selectedGroupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      await fetchGroupData(selectedGroupId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon"><Wallet size={28} /></div>
            <span className="logo-text">ExpenseFlow</span>
          </div>
          <button className="btn btn-icon sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item"><TrendingUp size={20} /><span>Dashboard</span></Link>
          <Link to="/budgets" className="nav-item"><PiggyBank size={20} /><span>Budgets</span></Link>
          <Link to="/transactions" className="nav-item"><Wallet size={20} /><span>Transactions</span></Link>
          <Link to="/splitwise" className="nav-item active"><GrowthIcon size={20} /><span>Splitwise</span></Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar"><User size={20} /></div>
            <div className="user-info">
              <div className="user-name">{user?.name || "User"}</div>
              <div className="user-email">{user?.email || ""}</div>
            </div>
          </div>
          <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <div className="header-title">
              <h1>Splitwise</h1>
              <p className="header-subtitle">Split expenses with friends and settle easily</p>
            </div>
          </div>
        </header>

        {error ? (
          <div style={{ marginBottom: "16px", color: "#f43f5e", background: "#ffebee", padding: "12px", borderRadius: "8px" }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div>Loading splitwise data...</div>
        ) : (
          <>
            <div className="charts-grid" style={{ marginBottom: "20px" }}>
              {/* ── Create Group ─────────────────────────────── */}
              <div className="chart-card card-glass" style={{ padding: "18px" }}>
                <h3 style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <Users size={18} /> Create Group
                </h3>

                <form onSubmit={handleCreateGroup}>
                  <input
                    className="form-input"
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={{ marginBottom: "12px" }}
                  />

                  {/* Type member names manually */}
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", opacity: 0.7 }}>
                    Add Members
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                    <input
                      className="form-input"
                      placeholder="Type friend's name…"
                      value={newMemberNameInput}
                      onChange={(e) => setNewMemberNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const name = newMemberNameInput.trim();
                          if (name && !groupMemberNames.includes(name)) {
                            setGroupMemberNames((prev) => [...prev, name]);
                            setNewMemberNameInput("");
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ whiteSpace: "nowrap", padding: "6px 14px" }}
                      onClick={() => {
                        const name = newMemberNameInput.trim();
                        if (name && !groupMemberNames.includes(name)) {
                          setGroupMemberNames((prev) => [...prev, name]);
                          setNewMemberNameInput("");
                        }
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {/* Live member preview list */}
                  {groupMemberNames.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "6px" }}>Members added:</div>
                      <div style={{ maxHeight: "130px", overflow: "auto" }}>
                        {groupMemberNames.map((name) => (
                          <div
                            key={name}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", marginBottom: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}
                          >
                            <span style={{ fontSize: "14px" }}>{name}</span>
                            <button
                              type="button"
                              className="btn btn-icon"
                              style={{ padding: "2px 4px", color: "#f43f5e", minWidth: "unset" }}
                              title="Remove"
                              onClick={() => setGroupMemberNames((prev) => prev.filter((n) => n !== name))}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    <Plus size={16} /> Create Group
                  </button>
                </form>
              </div>

              {/* ── Manage Group ──────────────────────────────── */}
              <div className="chart-card card-glass" style={{ padding: "18px" }}>
                <h3 style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <Users size={18} /> Manage Group
                </h3>

                {/* Group selector */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", opacity: 0.7 }}>Select Group</label>
                  <select
                    className="form-input"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">-- Select a group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {activeGroup ? (
                  <>
                    {/* Header with delete */}
                    <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>
                        Members of <em>{activeGroup.name}</em>
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(244,63,94,0.12)", color: "#f43f5e", borderColor: "rgba(244,63,94,0.25)" }}
                        onClick={() => handleDeleteGroup(activeGroup.id)}
                      >
                        Delete Group
                      </button>
                    </div>

                    {/* Current member list with remove buttons */}
                    <div style={{ maxHeight: "130px", overflow: "auto", marginBottom: "12px" }}>
                      {users
                        .filter((u) => activeGroup.member_ids?.includes(u.id))
                        .map((u) => (
                          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <span style={{ fontSize: "14px" }}>{u.name}</span>
                            {u.id !== user.id && (
                              <button
                                className="btn btn-icon"
                                style={{ padding: "2px 4px", color: "#f43f5e", minWidth: "unset" }}
                                title="Remove member"
                                onClick={() => handleRemoveMember(u.id)}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* ── Add Member ─────────────────────────────────── */}
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", opacity: 0.7 }}>
                      Add Registered Member
                    </label>

                    {/* Search box that filters real registered users */}
                    <div style={{ marginBottom: "8px", position: "relative" }}>
                      <input
                        className="form-input"
                        placeholder="Search by name or email…"
                        value={memberSearchQuery}
                        onChange={(e) => { setMemberSearchQuery(e.target.value); setMemberToAdd(""); }}
                        style={{ width: "100%" }}
                      />
                      {!memberToAdd && memberSearchQuery.trim().length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", maxHeight: "160px", overflow: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                          {users
                            .filter((u) =>
                              !activeGroup.member_ids?.includes(u.id) &&
                              (u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                                u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                            )
                            .map((u) => (
                              <div
                                key={u.id}
                                style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", background: memberToAdd === String(u.id) ? "rgba(99,102,241,0.2)" : "transparent" }}
                                onClick={() => { setMemberToAdd(String(u.id)); setMemberSearchQuery(u.name); }}
                              >
                                <div style={{ fontWeight: 500, fontSize: "14px" }}>{u.name}</div>
                                <div style={{ fontSize: "12px", opacity: 0.6 }}>{u.email}</div>
                              </div>
                            ))}
                          {users.filter((u) =>
                            !activeGroup.member_ids?.includes(u.id) &&
                            (u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                              u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                          ).length === 0 && (
                              <div style={{ padding: "10px 12px", opacity: 0.6, fontSize: "13px" }}>
                                No registered user found.{" "}
                                <span style={{ color: "#a78bfa" }}>Use invite link below →</span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: "100%", marginBottom: "16px" }}
                      disabled={!memberToAdd}
                      onClick={async () => {
                        if (!memberToAdd) return;
                        setError("");
                        try {
                          await callApi(`http://localhost:5001/api/split/groups/${selectedGroupId}/members`, {
                            method: "POST",
                            body: JSON.stringify({ userId: Number(memberToAdd) }),
                          });
                          setMemberToAdd("");
                          setMemberSearchQuery("");
                          await fetchBaseData();
                          await fetchGroupData(selectedGroupId);
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      <Plus size={14} /> Add Member
                    </button>

                    {/* ── Invite Link ────────────────────────────────── */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", opacity: 0.7 }}>
                        Or share an invite link
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: "100%", marginBottom: "8px" }}
                        onClick={async () => {
                          try {
                            const data = await callApi(`http://localhost:5001/api/split/groups/${selectedGroupId}/invite`, { method: "POST" });
                            setInviteLink(data.link);
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        🔗 Generate Invite Link
                      </button>
                      {inviteLink && (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            className="form-input"
                            readOnly
                            value={inviteLink}
                            style={{ flex: 1, fontSize: "12px", cursor: "text" }}
                            onFocus={(e) => e.target.select()}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ whiteSpace: "nowrap", padding: "6px 12px" }}
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                          >
                            {copied ? "✓ Copied!" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ opacity: 0.6, fontSize: "14px" }}>Select a group above to view and manage its members.</div>
                )}
              </div>


              {/* ── Add Split Expense ─────────────────────────── */}
              <div className="chart-card card-glass" style={{ padding: "18px" }}>
                <h3 style={{ marginBottom: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <ReceiptIndianRupee size={18} /> Add Split Expense
                </h3>

                <div style={{ marginBottom: "8px" }}>
                  <label>Group</label>
                  <select
                    className="form-input"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">Select group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <form onSubmit={handleCreateExpense}>
                  <input
                    className="form-input"
                    placeholder="Expense title"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  />
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Amount"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  />
                  <input
                    className="form-input"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  />
                  <select
                    className="form-input"
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  >
                    <option value="equal">Equal</option>
                    <option value="exact">Exact</option>
                    <option value="percentage">Percentage</option>
                  </select>

                  <select
                    className="form-input"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  >
                    <option value="">Paid by </option>
                    {groupMembersForForm.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>

                  <div style={{ maxHeight: "140px", overflow: "auto", marginBottom: "8px" }}>
                    {groupMembersForForm.map((member) => (
                      <div key={member.id} style={{ marginBottom: "6px" }}>
                        <label>
                          <input
                            type="checkbox"
                            checked={participantIds.includes(member.id)}
                            onChange={() => setParticipantIds((prev) => toggleId(prev, member.id))}
                          />{" "}
                          {member.name}
                        </label>

                        {participantIds.includes(member.id) && splitType === "exact" ? (
                          <input
                            className="form-input"
                            style={{ marginTop: "6px" }}
                            type="number"
                            placeholder="Exact amount"
                            value={exactMap[member.id] || ""}
                            onChange={(e) =>
                              setExactMap((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                          />
                        ) : null}

                        {participantIds.includes(member.id) && splitType === "percentage" ? (
                          <input
                            className="form-input"
                            style={{ marginTop: "6px" }}
                            type="number"
                            placeholder="Percentage"
                            value={percentageMap[member.id] || ""}
                            onChange={(e) =>
                              setPercentageMap((prev) => ({ ...prev, [member.id]: e.target.value }))
                            }
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Add Expense
                  </button>
                </form>
              </div>
            </div>


            <div className="chart-card card-glass" style={{ padding: "18px", marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "10px" }}>Net Balances ({activeGroup?.name || "No group"})</h3>
              {balances.netBalances.length === 0 ? (
                <div>No balances yet.</div>
              ) : (
                balances.netBalances.map((row) => (
                  <div key={row.user_id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span>{row.name}</span>
                    <strong style={{ color: row.balance >= 0 ? "#22c55e" : "#f43f5e" }}>
                      {row.balance >= 0 ? "+" : ""}₹{Number(row.balance).toFixed(2)}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div className="chart-card card-glass" style={{ padding: "18px", marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "10px" }}>Who Owes Whom</h3>
              {balances.settlements.length === 0 ? (
                <div>All settled up.</div>
              ) : (
                balances.settlements.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "10px" }}>
                    <span>{s.from_name} pays {s.to_name}</span>
                    <span>
                      <strong>₹{Number(s.amount).toFixed(2)}</strong>{" "}
                      {Number(s.from_user_id) === Number(user.id) ? (
                        <button className="btn btn-secondary" onClick={() => handleSettle(s)}>Settle</button>
                      ) : null}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="chart-card card-glass" style={{ padding: "18px" }}>
              <h3 style={{ marginBottom: "10px" }}>Expense History</h3>
              {expenses.length === 0 ? (
                <div>No split expenses found.</div>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong>{exp.title}</strong>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <strong>₹{Number(exp.amount).toFixed(2)}</strong>
                        <button
                          className="btn btn-icon"
                          style={{ padding: "2px", color: "#f43f5e" }}
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Delete Expense"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", opacity: 0.8 }}>
                      Paid by {exp.paid_by_name} | {exp.split_type} split | {new Date(exp.expense_date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Splitwise;
