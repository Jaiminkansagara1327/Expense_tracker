import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Wallet, TrendingUp, TrendingDown, PiggyBank,
    Plus, ArrowUpRight, ArrowDownRight,
    ShoppingBag, Coffee, Home, Car, CreditCard,
    Menu, X, Bell, Settings, User, Search, LogOut,
    TrendingUp as GrowthIcon,
} from 'lucide-react';
import {
    LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import './Dashboard.css';

/* ── Category colours ─────────────────────────────────────── */
const CAT_COLORS = {
    Food: '#a855f7', Transport: '#06b6d4', Rent: '#3b82f6',
    Entertainment: '#f59e0b', Shopping: '#22c55e',
    Utilities: '#f43f5e', Salary: '#10b981',
    Freelance: '#84cc16', Other: '#94a3b8',
};

/* ── Icon per category ────────────────────────────────────── */
const CategoryIcon = ({ category, size = 20 }) => {
    const map = {
        Food: Coffee, Transport: Car, Rent: Home,
        Shopping: ShoppingBag, Salary: Wallet, Freelance: CreditCard,
    };
    const Icon = map[category] || CreditCard;
    return <Icon size={size} />;
};

/* ── Custom chart tooltip ─────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: 'rgba(22,22,37,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 14px',
        }}>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
                    {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
                </p>
            ))}
        </div>
    );
};

const fmt = n => '₹' + Number(n).toLocaleString('en-IN');

/* ── Build monthly line-chart data ────────────────────────── */
function buildMonthlyData(transactions) {
    const map = {};
    transactions.forEach(t => {
        const mo = String(t.date).slice(0, 7); // "YYYY-MM"
        if (!map[mo]) map[mo] = { month: mo, income: 0, expenses: 0 };
        if (t.type === 'income') map[mo].income   += Number(t.amount);
        else                      map[mo].expenses += Number(t.amount);
    });
    return Object.values(map)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6)
        .map(d => ({
            ...d,
            month: new Date(d.month + '-01')
                .toLocaleString('default', { month: 'short' }),
        }));
}

/* ── Build donut-chart data ───────────────────────────────── */
function buildCategoryData(transactions) {
    const map = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            map[t.category] = (map[t.category] || 0) + Number(t.amount);
        });
    return Object.entries(map).map(([name, value]) => ({
        name, value, color: CAT_COLORS[name] || '#94a3b8',
    }));
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
function Dashboard({ user, onLogout }) {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [period, setPeriod]           = useState('month');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading]           = useState(true);

    /* ── Fetch every time the component mounts
         (i.e. every time user navigates back from Transactions) ── */
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        fetch('http://localhost:5001/api/transactions', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            credentials: 'include',
        })
            .then(res => res.json())
            .then(data => { if (!cancelled) setTransactions(Array.isArray(data) ? data : []); })
            .catch(err => console.error('Dashboard fetch error:', err))
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; }; // cleanup on unmount
    }, []); // ← runs on every fresh mount

    /* ── Derived values (recalculate when transactions change) ── */
    const stats = useMemo(() => {
        const income   = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const balance  = income - expenses;
        const savings  = income > 0 ? ((balance / income) * 100).toFixed(1) : '0.0';
        return { income, expenses, balance, savings };
    }, [transactions]);

    const monthlyData  = useMemo(() => buildMonthlyData(transactions),  [transactions]);
    const categoryData = useMemo(() => buildCategoryData(transactions),  [transactions]);
    const recent5      = useMemo(() =>
        [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5),
    [transactions]);

    /* ── Logout ── */
    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5001/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (_) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login');
    };

    const firstName = user?.name?.split(' ')[0] || 'User';

    /* ══════════════════════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════════════════════ */
    return (
        <div className="dashboard">

            {/* ── Sidebar ── */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
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
                    <Link to="/dashboard"    className="nav-item active">
                        <TrendingUp size={20} /><span>Dashboard</span>
                    </Link>
                    <Link to="/transactions" className="nav-item">
                        <Wallet size={20} /><span>Transactions</span>
                    </Link>
                    <Link to="/budgets" className="nav-item">
                        <PiggyBank size={20} /><span>Budgets</span>
                    </Link>
                    <a href="#" className="nav-item"><GrowthIcon size={20} /><span>Analytics</span></a>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar"><User size={20} /></div>
                        <div className="user-info">
                            <div className="user-name">{user?.name || 'User'}</div>
                            <div className="user-email">{user?.email || ''}</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="main-content">

                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </button>
                        <div className="header-title">
                            <h1>Dashboard</h1>
                            <p className="header-subtitle">Welcome back, {firstName}! 👋</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="search-bar">
                            <Search size={18} />
                            <input type="text" placeholder="Search transactions..." />
                        </div>
                        <button className="btn btn-icon">
                            <Bell size={20} />
                            <span className="notification-badge">3</span>
                        </button>
                        <button className="btn btn-icon"><Settings size={20} /></button>
                    </div>
                </header>

                {/* ── Loading spinner ── */}
                {loading ? (
                    <div className="dashboard-loading">
                        <div className="loading-spinner" />
                        <p>Loading your finances…</p>
                    </div>
                ) : (
                    <>
                        {/* ════ STAT CARDS ════ */}
                        <div className="stats-grid">
                            {[
                                {
                                    label: 'Total Balance',
                                    value: fmt(stats.balance),
                                    icon: <Wallet size={24} />,
                                    cls: 'stat-icon-primary',
                                    change: `${transactions.length} total transactions`,
                                    pos: stats.balance >= 0,
                                },
                                {
                                    label: 'Total Income',
                                    value: fmt(stats.income),
                                    icon: <TrendingUp size={24} />,
                                    cls: 'stat-icon-success',
                                    change: `${transactions.filter(t => t.type === 'income').length} income entries`,
                                    pos: true,
                                },
                                {
                                    label: 'Total Expenses',
                                    value: fmt(stats.expenses),
                                    icon: <TrendingDown size={24} />,
                                    cls: 'stat-icon-danger',
                                    change: `${transactions.filter(t => t.type === 'expense').length} expense entries`,
                                    pos: false,
                                },
                                {
                                    label: 'Savings Rate',
                                    value: stats.savings + '%',
                                    icon: <PiggyBank size={24} />,
                                    cls: 'stat-icon-warning',
                                    change: Number(stats.savings) > 20 ? 'Great progress! 🎉' : 'Keep saving!',
                                    pos: Number(stats.savings) > 0,
                                },
                            ].map(({ label, value, icon, cls, change, pos }, i) => (
                                <div
                                    key={label}
                                    className="stat-card card-glass animate-fadeIn"
                                    style={{ animationDelay: `${i * 0.08}s` }}
                                >
                                    <div className="stat-header">
                                        <div className={`stat-icon ${cls}`}>{icon}</div>
                                        <span className="stat-label">{label}</span>
                                    </div>
                                    <div className="stat-value">{value}</div>
                                    <div className="stat-footer">
                                        <span className={`stat-change ${pos ? 'positive' : 'negative'}`}>
                                            {pos
                                                ? <ArrowUpRight size={14} />
                                                : <ArrowDownRight size={14} />}
                                            {change}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ════ CHARTS ════ */}
                        <div className="charts-grid">

                            {/* Line chart */}
                            <div className="chart-card card-glass">
                                <div className="chart-header">
                                    <div>
                                        <h3 className="chart-title">Expense Overview</h3>
                                        <p className="chart-subtitle">Income vs Expenses over time</p>
                                    </div>
                                    <div className="period-selector">
                                        {['week', 'month', 'year'].map(p => (
                                            <button
                                                key={p}
                                                className={`period-btn ${period === p ? 'active' : ''}`}
                                                onClick={() => setPeriod(p)}
                                            >
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="chart-container">
                                    {monthlyData.length === 0 ? (
                                        <div className="chart-empty">
                                            Add transactions to see your chart
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={monthlyData}>
                                                <defs>
                                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" style={{ fontSize: 12 }} />
                                                <YAxis
                                                    stroke="rgba(255,255,255,0.3)"
                                                    style={{ fontSize: 12 }}
                                                    tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'}
                                                />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
                                                <Line
                                                    type="monotone" dataKey="income" name="Income"
                                                    stroke="#22c55e" strokeWidth={3}
                                                    dot={{ fill: '#22c55e', r: 5 }} activeDot={{ r: 7 }}
                                                />
                                                <Line
                                                    type="monotone" dataKey="expenses" name="Expenses"
                                                    stroke="#f43f5e" strokeWidth={3}
                                                    dot={{ fill: '#f43f5e', r: 5 }} activeDot={{ r: 7 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Donut chart */}
                            <div className="chart-card card-glass">
                                <div className="chart-header">
                                    <div>
                                        <h3 className="chart-title">Spending by Category</h3>
                                        <p className="chart-subtitle">Where your money goes</p>
                                    </div>
                                </div>
                                <div className="chart-container">
                                    {categoryData.length === 0 ? (
                                        <div className="chart-empty">No expense data yet</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    cx="50%" cy="50%"
                                                    innerRadius={60} outerRadius={90}
                                                    paddingAngle={5} dataKey="value"
                                                >
                                                    {categoryData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ChartTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="category-legend">
                                    {categoryData.length === 0
                                        ? <p className="legend-empty">Add expenses to see breakdown</p>
                                        : categoryData.map((cat, i) => (
                                            <div key={i} className="legend-item">
                                                <div className="legend-color" style={{ backgroundColor: cat.color }} />
                                                <span className="legend-label">{cat.name}</span>
                                                <span className="legend-value">{fmt(cat.value)}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        {/* ════ RECENT TRANSACTIONS ════ */}
                        <div className="transactions-section card-glass">
                            <div className="section-header">
                                <div>
                                    <h3 className="section-title">Recent Transactions</h3>
                                    <p className="section-subtitle">Your latest 5 activities</p>
                                </div>
                                <Link to="/transactions" className="btn btn-primary">
                                    <Plus size={18} /> Add Transaction
                                </Link>
                            </div>

                            <div className="transactions-list">
                                {recent5.length === 0 ? (
                                    <div className="empty-transactions">
                                        <Wallet size={40} />
                                        <p>No transactions yet.</p>
                                        <Link to="/transactions" className="btn btn-primary" style={{ marginTop: 12 }}>
                                            <Plus size={16} /> Add your first transaction
                                        </Link>
                                    </div>
                                ) : (
                                    recent5.map((t, i) => (
                                        <div
                                            key={t.id}
                                            className="transaction-item animate-slideInRight"
                                            style={{ animationDelay: `${i * 0.05}s` }}
                                        >
                                            <div className={`transaction-icon ${t.type}`}>
                                                <CategoryIcon category={t.category} size={20} />
                                            </div>
                                            <div className="transaction-details">
                                                <div className="transaction-title">{t.title}</div>
                                                <div className="transaction-meta">
                                                    <span className="transaction-category">{t.category}</span>
                                                    <span className="transaction-date">
                                                        {new Date(t.date).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`transaction-amount ${t.type}`}>
                                                {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}
        </div>
    );
}

export default Dashboard;