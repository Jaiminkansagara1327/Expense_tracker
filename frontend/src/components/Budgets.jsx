import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    PiggyBank,
    Plus,
    X,
    Trash2,
    User,
    LogOut,
    Menu,
    AlertCircle,
    CheckCircle,
    ChevronRight,
    Search,
    Bell,
    Settings,
    TrendingUp as GrowthIcon
} from 'lucide-react';
import { API_URL } from '../config/api';
import './Dashboard.css';

function Budgets({ user, onLogout }) {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [budgets, setBudgets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalError, setModalError] = useState('');
    const [formData, setFormData] = useState({
        category: 'Food',
        amount: '',
        period: 'monthly'
    });

    const categories = ['Food', 'Transport', 'Rent', 'Entertainment', 'Shopping', 'Utilities', 'Salary', 'Freelance'];

    const fetchData = async () => {
        try {
            const [budgetRes, transRes] = await Promise.all([
                fetch(`${API_URL}/budgets`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    credentials: 'include'
                }),
                fetch(`${API_URL}/transactions`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    credentials: 'include'
                })
            ]);

            const budgetData = await budgetRes.json();
            const transData = await transRes.json();

            if (budgetRes.ok) setBudgets(budgetData);
            if (transRes.ok) setTransactions(transData);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (err) { }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login');
    };

    const handleUpsert = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/budgets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                setModalError(data.message || 'Error saving budget');
            }
        } catch (err) {
            setModalError('Network error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this budget?")) return;
        try {
            const res = await fetch(`${API_URL}/budgets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                credentials: 'include'
            });
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const calculateSpent = (category) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return transactions
            .filter(t => t.category === category && t.type === 'expense' && new Date(t.date) >= startOfMonth)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    const firstName = user?.name?.split(' ')[0] || 'User';

    return (
        <div className="dashboard">
            {/* Sidebar */}
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
                    <Link to="/dashboard" className="nav-item">
                        <TrendingUp size={20} /><span>Dashboard</span>
                    </Link>
                    <Link to="/budgets" className="nav-item active">
                        <PiggyBank size={20} /><span>Budgets</span>
                    </Link>
                    <Link to="/transactions" className="nav-item">
                        <Wallet size={20} /><span>Transactions</span>
                    </Link>
                    <Link to="/splitwise" className="nav-item">
                        <GrowthIcon size={20} /><span>Splitwise</span>
                    </Link>
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

            {/* Main Content */}
            <main className="main-content">
                <header className="header">
                    <div className="header-left">
                        <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </button>
                        <div className="header-title">
                            <h1>Budgets</h1>
                            <p className="header-subtitle">Plan your monthly spending</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                            <Plus size={18} /> New Budget
                        </button>
                    </div>
                </header>

                <div className="budgets-grid">
                    {loading ? (
                        <div>Loading...</div>
                    ) : budgets.length === 0 ? (
                        <div className="empty-state">No budgets set. Start by adding one!</div>
                    ) : (
                        budgets.map(budget => {
                            const spent = calculateSpent(budget.category);
                            const percent = Math.min((spent / budget.amount) * 100, 100);
                            const isOver = spent > budget.amount;

                            return (
                                <div key={budget.id} className="card-glass animate-fadeIn" style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{budget.category}</h3>
                                        <button className="btn-icon" onClick={() => handleDelete(budget.id)} style={{ color: '#f43f5e' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ opacity: 0.7 }}>Spent: ₹{spent.toLocaleString()}</span>
                                        <span style={{ fontWeight: 'bold' }}>Limit: ₹{Number(budget.amount).toLocaleString()}</span>
                                    </div>

                                    <div className="budget-progress-bg">
                                        <div
                                            className="budget-progress-bar"
                                            style={{
                                                width: `${percent}%`,
                                                background: isOver ? '#f43f5e' : '#22c55e'
                                            }}
                                        ></div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                        {isOver ? (
                                            <><AlertCircle size={14} color="#f43f5e" /> <span style={{ color: '#f43f5e' }}>Over budget by ₹{(spent - budget.amount).toLocaleString()}</span></>
                                        ) : (
                                            <><CheckCircle size={14} color="#22c55e" /> <span style={{ color: '#22c55e' }}>₹{(budget.amount - spent).toLocaleString()} remaining</span></>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Budget Modal */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Set Category Budget</h2>
                            <button className="btn-icon" onClick={() => setModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        {modalError && (
                            <div style={{ color: 'red', marginBottom: '16px', padding: '10px', background: '#ffebee', borderRadius: '8px' }}>
                                {modalError}
                            </div>
                        )}
                        <form onSubmit={handleUpsert}>
                            <div className="form-group">
                                <label>Category</label>
                                <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Monthly Limit (₹)</label>
                                <input required type="number" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Budget</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Budgets;
