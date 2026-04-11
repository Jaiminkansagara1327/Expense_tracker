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
  Settings,
  Trash2,
  History,
  Link as LinkIcon,
  AlertCircle
} from "lucide-react";
import { API_URL } from "../config/api";
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
        callApi(`${API_URL}/split/users`),
        callApi(`${API_URL}/split/groups`),
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
        callApi(`${API_URL}/split/groups/${groupId}/expenses`),
        callApi(`${API_URL}/split/groups/${groupId}/balances`),
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
      await fetch(`${API_URL}/auth/logout`, {
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
      await callApi(`${API_URL}/split/groups`, {
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
      await callApi(`${API_URL}/split/groups/${selectedGroupId}/expenses`, {
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
      await callApi(`${API_URL}/split/groups/${selectedGroupId}/members`, {
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
      await callApi(`${API_URL}/split/settlements`, {
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
      await callApi(`${API_URL}/split/groups/${selectedGroupId}/members/${userId}`, {
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
      await callApi(`${API_URL}/split/groups/${groupId}`, {
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
      await callApi(`${API_URL}/split/groups/${selectedGroupId}/expenses/${expenseId}`, {
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

        {error && (
          <div className="card" style={{ marginBottom: "var(--space-lg)", color: "var(--color-danger)", background: "var(--color-danger-bg)", borderColor: "var(--color-danger-light)", display: "flex", gap: "var(--space-md)", alignItems: "center", padding: "var(--space-md)" }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-3xl)" }}>
            <div className="animate-pulse" style={{ color: "var(--color-primary)" }}>Loading splitwise data...</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
            {/* 1. TOP ROW: GROUP MANAGEMENT */}
            <div className="stats-grid">
              {/* Create Group */}
              <div className="card-glass">
                <h3 className="section-title" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "var(--space-md)" }}>
                  <div className="stat-icon stat-icon-primary" style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)" }}>
                    <Users size={16} />
                  </div>
                  Create Group
                </h3>

                <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                  <div className="input-group">
                    <input className="input" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "var(--space-sm)" }}>
                    <Plus size={16} /> Create Group
                  </button>
                </form>
              </div>

              {/* Manage Group */}
              <div className="card-glass">
                <h3 className="section-title" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "var(--space-md)" }}>
                  <div className="stat-icon stat-icon-warning" style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)" }}>
                    <Settings size={16} />
                  </div>
                  Manage Group
                </h3>

                <div className="input-group" style={{ marginBottom: "var(--space-lg)" }}>
                  <label className="input-label">Select Group</label>
                  <select className="input" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                    <option value="">-- Select a group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {activeGroup ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>Members of <em>{activeGroup.name}</em></span>
                      <button type="button" className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px", color: "var(--color-danger)", borderColor: "var(--color-danger-bg)" }} onClick={() => handleDeleteGroup(activeGroup.id)}>
                        <Trash2 size={12} style={{ marginRight: "4px" }} /> Delete Group
                      </button>
                    </div>

                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-bg-tertiary)" }}>
                      {users.filter((u) => activeGroup.member_ids?.includes(u.id)).map((u) => (
                        <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid var(--color-border)" }}>
                          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{u.name}</span>
                          {u.id !== user.id ? (
                            <button className="btn btn-icon" style={{ padding: "4px", color: "var(--color-danger)", width: "auto", height: "auto" }} onClick={() => handleRemoveMember(u.id)}>
                              <X size={14} />
                            </button>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}>You</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="input-group" style={{ marginTop: "var(--space-sm)" }}>
                      <label className="input-label">Add Registered Member</label>
                      <div style={{ position: "relative" }}>
                        <input
                          className="input"
                          placeholder="Search by name or email…"
                          value={memberSearchQuery}
                          onChange={(e) => { setMemberSearchQuery(e.target.value); setMemberToAdd(""); }}
                        />
                        {!memberToAdd && memberSearchQuery.trim().length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", maxHeight: "160px", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>
                            {users.filter((u) => !activeGroup.member_ids?.includes(u.id) && (u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))).map((u) => (
                              <div
                                key={u.id}
                                style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--color-border)", background: memberToAdd === String(u.id) ? "var(--color-primary-bg)" : "transparent" }}
                                onClick={() => { setMemberToAdd(String(u.id)); setMemberSearchQuery(u.name); }}
                              >
                                <div style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{u.name}</div>
                                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{u.email}</div>
                              </div>
                            ))}
                            {users.filter((u) => !activeGroup.member_ids?.includes(u.id) && (u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))).length === 0 && (
                              <div style={{ padding: "10px 12px", fontSize: "13px", color: "var(--color-text-tertiary)" }}>No registered user found. Use invite link.</div>
                            )}
                          </div>
                        )}
                      </div>
                      <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "var(--space-sm)" }} disabled={!memberToAdd} onClick={handleAddMember}>
                        <Plus size={14} /> Add Member
                      </button>
                    </div>

                    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-sm)" }}>
                      <label className="input-label" style={{ marginBottom: "var(--space-sm)", display: "block" }}>Invite Link</label>
                      <button type="button" className="btn btn-secondary" style={{ width: "100%", marginBottom: "var(--space-sm)" }} onClick={async () => {
                        try {
                          const data = await callApi(`${API_URL}/split/groups/${selectedGroupId}/invite`, { method: "POST" });
                          setInviteLink(data.link);
                        } catch (err) { setError(err.message); }
                      }}>
                        <LinkIcon size={14} /> Generate Invite Link
                      </button>
                      {inviteLink && (
                        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
                          <input className="input" readOnly value={inviteLink} onFocus={(e) => e.target.select()} style={{ flex: 1, padding: "8px", fontSize: "12px" }} />
                          <button type="button" className="btn btn-primary" style={{ padding: "8px 12px" }} onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "var(--space-xl) 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}>
                    Select a group above to view and manage its members.
                  </div>
                )}
              </div>
            </div>

            {/* 2. MIDDLE ROW: EXPENSES & BALANCES */}
            <div className="charts-grid">
              {/* Add Expense (Left side, takes 2fr because it is wide) */}
              <div className="card-glass" style={{ display: "flex", flexDirection: "column" }}>
                <h3 className="section-title" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "var(--space-lg)" }}>
                  <div className="stat-icon stat-icon-success" style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)" }}>
                    <ReceiptIndianRupee size={16} />
                  </div>
                  Add Split Expense
                </h3>

                <form onSubmit={handleCreateExpense} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", flex: 1 }}>
                  <div className="input-group">
                    <label className="input-label">Group</label>
                    <select className="input" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                      <option value="">Select group</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                    <div className="input-group">
                      <label className="input-label">Title</label>
                      <input className="input" placeholder="E.g. Dinner" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Amount</label>
                      <input className="input" type="number" placeholder="0.00" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-md)", alignItems: "end" }}>
                    <div className="input-group">
                      <label className="input-label">Date</label>
                      <input className="input" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Paid by</label>
                      <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                        <option value="">Select</option>
                        {groupMembersForForm.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Split Type</label>
                      <select className="input" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
                        <option value="equal">Equal</option>
                        <option value="exact">Exact</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Participants</label>
                    <select
                      className="input"
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id && !participantIds.includes(id)) {
                          setParticipantIds((prev) => [...prev, id]);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">-- Select Member to Add --</option>
                      {groupMembersForForm
                        .filter((m) => !participantIds.includes(m.id))
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                    </select>

                    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-md)", background: "var(--color-bg-tertiary)", maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
                      {participantIds.length === 0 ? (
                        <div style={{ fontSize: "13px", color: "var(--color-text-tertiary)", textAlign: "center" }}>No participants selected.</div>
                      ) : (
                        participantIds.map((id) => {
                          const member = groupMembersForForm.find((m) => m.id === id);
                          if (!member) return null;
                          return (
                            <div key={member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-sm)", background: "var(--color-bg-secondary)", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                              <span style={{ fontSize: "var(--font-size-sm)", flex: 1, fontWeight: 500 }}>{member.name}</span>
                              {splitType === "exact" && (
                                <input className="input" style={{ width: "100px", padding: "6px 8px" }} type="number" placeholder="Amount" value={exactMap[member.id] || ""} onChange={(e) => setExactMap((prev) => ({ ...prev, [member.id]: e.target.value }))} />
                              )}
                              {splitType === "percentage" && (
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input className="input" style={{ width: "70px", padding: "6px 8px" }} type="number" placeholder="%" value={percentageMap[member.id] || ""} onChange={(e) => setPercentageMap((prev) => ({ ...prev, [member.id]: e.target.value }))} />
                                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>%</span>
                                </div>
                              )}
                              <button type="button" className="btn btn-icon" style={{ padding: "4px", color: "var(--color-danger)" }} onClick={() => setParticipantIds((prev) => prev.filter((p) => p !== id))}>
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: "auto" }}>
                    <Plus size={16} /> Add Expense
                  </button>
                </form>
              </div>

              {/* Balances (Right side) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                <div className="card-glass">
                  <h3 className="section-title" style={{ marginBottom: "var(--space-md)", fontSize: "var(--font-size-base)" }}>Net Balances</h3>
                  {balances.netBalances.length === 0 ? (
                    <div style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)", fontStyle: "italic" }}>No balances to show.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                      {balances.netBalances.map((row) => (
                        <div key={row.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-sm) 0", borderBottom: "1px solid var(--color-border)" }}>
                          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>{row.name}</span>
                          <span className={`badge ${row.balance >= 0 ? "badge-success" : "badge-danger"}`} style={{ fontSize: "14px", padding: "4px 8px" }}>
                            {row.balance >= 0 ? "+" : ""}₹{Number(row.balance).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-glass" style={{ flex: 1 }}>
                  <h3 className="section-title" style={{ marginBottom: "var(--space-md)", fontSize: "var(--font-size-base)" }}>Who Owes Whom</h3>
                  {balances.settlements.length === 0 ? (
                    <div style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)", fontStyle: "italic", textAlign: "center", padding: "var(--space-xl) 0" }}>
                      <div style={{ marginBottom: "var(--space-sm)", fontSize: "24px" }}>🎉</div> All settled up!
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                      {balances.settlements.map((s, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", padding: "var(--space-md)", background: "var(--color-bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-sm)" }}>
                            <span><strong>{s.from_name}</strong> owes <strong>{s.to_name}</strong></span>
                            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>₹{Number(s.amount).toFixed(2)}</span>
                          </div>
                          {Number(s.from_user_id) === Number(user.id) && (
                            <button className="btn btn-secondary" style={{ padding: "4px 12px", marginTop: "var(--space-xs)" }} onClick={() => handleSettle(s)}>Settle Up</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. BOTTOM ROW: EXPENSE HISTORY */}
            <div className="card-glass">
              <h3 className="section-title" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "var(--space-lg)" }}>
                <div className="stat-icon stat-icon-info" style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)" }}>
                  <History size={16} />
                </div>
                Expense History
              </h3>

              {expenses.length === 0 ? (
                <div style={{ color: "var(--color-text-tertiary)", textAlign: "center", padding: "var(--space-xl)" }}>No expenses recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {expenses.map((exp) => (
                    <div key={exp.id} className="transaction-item" style={{ borderBottom: "1px solid var(--color-border)", borderRadius: 0, background: "transparent", padding: "var(--space-md) 0" }}>
                      <div className="transaction-icon" style={{ background: "var(--color-info-bg)", color: "var(--color-info)" }}>
                        <ReceiptIndianRupee size={20} />
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-title">{exp.title}</div>
                        <div className="transaction-meta">
                          <span className="transaction-category">Paid by {exp.paid_by_name}</span>
                          <span className="transaction-date">{new Date(exp.expense_date).toLocaleDateString()}</span>
                          <span className="badge badge-info" style={{ marginLeft: "var(--space-sm)", textTransform: "capitalize" }}>{exp.split_type} split</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)" }}>
                        <div className="transaction-amount">₹{Number(exp.amount).toFixed(2)}</div>
                        <button className="btn btn-icon" style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)" }} onClick={() => handleDeleteExpense(exp.id)} title="Delete Expense">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Splitwise;
