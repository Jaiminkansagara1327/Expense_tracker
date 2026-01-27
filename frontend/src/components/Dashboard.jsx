import { useState } from 'react';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Calendar,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    ShoppingBag,
    Coffee,
    Home,
    Car,
    TrendingUp as GrowthIcon,
    Menu,
    X,
    Bell,
    Settings,
    User,
    Search
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import './Dashboard.css';

// Sample data for demonstration - Indian Context
const expenseData = [
    { month: 'Jan', income: 65000, expenses: 42000 },
    { month: 'Feb', income: 68000, expenses: 45000 },
    { month: 'Mar', income: 65000, expenses: 38000 },
    { month: 'Apr', income: 72000, expenses: 48000 },
    { month: 'May', income: 70000, expenses: 44000 },
    { month: 'Jun', income: 75000, expenses: 46000 },
];

const categoryData = [
    { name: 'Groceries & Food', value: 12500, color: '#a855f7' },
    { name: 'Shopping', value: 8500, color: '#22c55e' },
    { name: 'Auto/Metro', value: 3200, color: '#f43f5e' },
    { name: 'Rent', value: 15000, color: '#3b82f6' },
    { name: 'Entertainment', value: 4500, color: '#f59e0b' },
    { name: 'Bills & Utilities', value: 2300, color: '#06b6d4' },
];

const recentTransactions = [
    { id: 1, title: 'D-Mart Groceries', category: 'Groceries & Food', amount: -2450, date: '2026-01-27', type: 'expense', icon: ShoppingBag },
    { id: 2, title: 'Salary Credited', category: 'Income', amount: 75000, date: '2026-01-25', type: 'income', icon: Wallet },
    { id: 3, title: 'Café Coffee Day', category: 'Groceries & Food', amount: -320, date: '2026-01-26', type: 'expense', icon: Coffee },
    { id: 4, title: 'House Rent', category: 'Rent', amount: -15000, date: '2026-01-24', type: 'expense', icon: Home },
    { id: 5, title: 'Ola Auto', category: 'Auto/Metro', amount: -85, date: '2026-01-27', type: 'expense', icon: Car },
    { id: 6, title: 'Freelance Project', category: 'Income', amount: 12000, date: '2026-01-23', type: 'income', icon: CreditCard },
];

function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('month');

    const totalIncome = 87000;
    const totalExpenses = 46000;
    const balance = totalIncome - totalExpenses;
    const savingsRate = ((balance / totalIncome) * 100).toFixed(1);

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <Wallet size={28} />
                        </div>
                        <span className="logo-text">ExpenseFlow</span>
                    </div>
                    <button className="btn btn-icon sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <a href="#" className="nav-item active">
                        <TrendingUp size={20} />
                        <span>Dashboard</span>
                    </a>
                    <a href="#" className="nav-item">
                        <Wallet size={20} />
                        <span>Transactions</span>
                    </a>
                    <a href="#" className="nav-item">
                        <PiggyBank size={20} />
                        <span>Budgets</span>
                    </a>
                    <a href="#" className="nav-item">
                        <GrowthIcon size={20} />
                        <span>Analytics</span>
                    </a>
                    <a href="#" className="nav-item">
                        <CreditCard size={20} />
                        <span>Cards</span>
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            <User size={20} />
                        </div>
                        <div className="user-info">
                            <div className="user-name">Jaimin Kansagara</div>
                            <div className="user-email">jaimin@example.com</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </button>
                        <div className="header-title">
                            <h1>Dashboard</h1>
                            <p className="header-subtitle">Welcome back, Jaimin! 👋</p>
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
                        <button className="btn btn-icon">
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card card-glass animate-fadeIn">
                        <div className="stat-header">
                            <div className="stat-icon stat-icon-primary">
                                <Wallet size={24} />
                            </div>
                            <span className="stat-label">Total Balance</span>
                        </div>
                        <div className="stat-value">₹{balance.toLocaleString()}</div>
                        <div className="stat-footer">
                            <span className="stat-change positive">
                                <ArrowUpRight size={16} />
                                +12.5% from last month
                            </span>
                        </div>
                    </div>

                    <div className="stat-card card-glass animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                        <div className="stat-header">
                            <div className="stat-icon stat-icon-success">
                                <TrendingUp size={24} />
                            </div>
                            <span className="stat-label">Total Income</span>
                        </div>
                        <div className="stat-value">₹{totalIncome.toLocaleString()}</div>
                        <div className="stat-footer">
                            <span className="stat-change positive">
                                <ArrowUpRight size={16} />
                                +8.3% from last month
                            </span>
                        </div>
                    </div>

                    <div className="stat-card card-glass animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                        <div className="stat-header">
                            <div className="stat-icon stat-icon-danger">
                                <TrendingDown size={24} />
                            </div>
                            <span className="stat-label">Total Expenses</span>
                        </div>
                        <div className="stat-value">₹{totalExpenses.toLocaleString()}</div>
                        <div className="stat-footer">
                            <span className="stat-change negative">
                                <ArrowDownRight size={16} />
                                +5.2% from last month
                            </span>
                        </div>
                    </div>

                    <div className="stat-card card-glass animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                        <div className="stat-header">
                            <div className="stat-icon stat-icon-warning">
                                <PiggyBank size={24} />
                            </div>
                            <span className="stat-label">Savings Rate</span>
                        </div>
                        <div className="stat-value">{savingsRate}%</div>
                        <div className="stat-footer">
                            <span className="stat-change positive">
                                <ArrowUpRight size={16} />
                                Great progress!
                            </span>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="charts-grid">
                    {/* Expense Overview Chart */}
                    <div className="chart-card card-glass">
                        <div className="chart-header">
                            <div>
                                <h3 className="chart-title">Expense Overview</h3>
                                <p className="chart-subtitle">Income vs Expenses over time</p>
                            </div>
                            <div className="period-selector">
                                <button
                                    className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
                                    onClick={() => setSelectedPeriod('week')}
                                >
                                    Week
                                </button>
                                <button
                                    className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
                                    onClick={() => setSelectedPeriod('month')}
                                >
                                    Month
                                </button>
                                <button
                                    className={`period-btn ${selectedPeriod === 'year' ? 'active' : ''}`}
                                    onClick={() => setSelectedPeriod('year')}
                                >
                                    Year
                                </button>
                            </div>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={expenseData}>
                                    <defs>
                                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="rgba(255,255,255,0.3)"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.3)"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(30, 30, 40, 0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        fill="url(#incomeGradient)"
                                        dot={{ fill: '#22c55e', r: 5 }}
                                        activeDot={{ r: 7 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expenses"
                                        stroke="#f43f5e"
                                        strokeWidth={3}
                                        fill="url(#expenseGradient)"
                                        dot={{ fill: '#f43f5e', r: 5 }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="chart-card card-glass">
                        <div className="chart-header">
                            <div>
                                <h3 className="chart-title">Spending by Category</h3>
                                <p className="chart-subtitle">This month's breakdown</p>
                            </div>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(30, 30, 40, 0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="category-legend">
                            {categoryData.map((category, index) => (
                                <div key={index} className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: category.color }}></div>
                                    <span className="legend-label">{category.name}</span>
                                    <span className="legend-value">₹{category.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="transactions-section card-glass">
                    <div className="section-header">
                        <div>
                            <h3 className="section-title">Recent Transactions</h3>
                            <p className="section-subtitle">Your latest activity</p>
                        </div>
                        <button className="btn btn-primary">
                            <Plus size={18} />
                            Add Transaction
                        </button>
                    </div>

                    <div className="transactions-list">
                        {recentTransactions.map((transaction, index) => {
                            const Icon = transaction.icon;
                            return (
                                <div
                                    key={transaction.id}
                                    className="transaction-item animate-slideInRight"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="transaction-icon">
                                        <Icon size={20} />
                                    </div>
                                    <div className="transaction-details">
                                        <div className="transaction-title">{transaction.title}</div>
                                        <div className="transaction-meta">
                                            <span className="transaction-category">{transaction.category}</span>
                                            <span className="transaction-date">{transaction.date}</span>
                                        </div>
                                    </div>
                                    <div className={`transaction-amount ${transaction.type}`}>
                                        {transaction.type === 'income' ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
            )}
        </div>
    );
}

export default Dashboard;
