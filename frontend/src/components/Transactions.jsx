import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Search,
    LogOut,
    Bell,
    Settings,
    Menu,
    X,
    Plus,
    Trash2,
    Edit2,
    User,
    TrendingUp as GrowthIcon,
    CreditCard
} from 'lucide-react';
import './Dashboard.css'; // Inherits base layout styling
import './Transactions.css';

function Transactions({ user, onLogout }) {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [modalError, setModalError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString().split('T')[0]
    });

    const categories = ['Food', 'Transport', 'Rent', 'Entertainment', 'Shopping', 'Utilities', 'Salary', 'Freelance'];

    const fetchData = async () => {
        try {
            const [transRes, budgetRes] = await Promise.all([
                fetch('http://localhost:5000/api/transactions', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    credentials: 'include'
                }),
                fetch('http://localhost:5000/api/budgets', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    credentials: 'include'
                })
            ]);
            const tData = await transRes.json();
            const bData = await budgetRes.json();

            if (transRes.ok) setTransactions(tData);
            if (budgetRes.ok) setBudgets(bData);
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
            await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (err) { }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
        navigate('/login');
    };

    const handleOpenModal = (trx = null) => {
        if (trx) {
            setEditingId(trx.id);
            setFormData({
                title: trx.title,
                amount: trx.amount,
                type: trx.type,
                category: trx.category,
                date: new Date(trx.date).toISOString().split('T')[0]
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                amount: '',
                type: 'expense',
                category: 'Food',
                date: new Date().toISOString().split('T')[0]
            });
        }
        setModalError('');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId
            ? `http://localhost:5000/api/transactions/${editingId}`
            : 'http://localhost:5000/api/transactions';
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                // Check if budget is crossed
                const categoryBudget = budgets.find(b => b.category === formData.category);
                if (categoryBudget && formData.type === 'expense') {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const spentSoFar = transactions
                        .filter(t => t.category === formData.category && t.type === 'expense' && new Date(t.date) >= startOfMonth)
                        .reduce((sum, t) => sum + Number(t.amount), 0);

                    const newTotal = spentSoFar + Number(formData.amount);
                    if (newTotal > categoryBudget.amount) {
                        alert(`⚠️ Budget Alert: You have exceeded your ₹${categoryBudget.amount} budget for ${formData.category}!`);
                    }
                }

                setModalOpen(false);
                fetchData();
            } else {
                const errorData = await res.json();
                setModalError(errorData.message || 'Failed to save transaction');
                console.error("Backend returned error:", errorData);
            }
        } catch (err) {
            setModalError('Network error. Please try again.');
            console.error('Save failed', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                credentials: 'include'
            });
            if (res.ok) fetchTransactions();
        } catch (err) {
            console.error('Delete failed', err);
        }
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
                    <Link to="/budgets" className="nav-item">
                        <PiggyBank size={20} /><span>Budgets</span>
                    </Link>
                    <Link to="/transactions" className="nav-item active">
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
                            <h1>Transactions</h1>
                            <p className="header-subtitle">Manage your income and expenses</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                            <Plus size={18} /> New Transaction
                        </button>
                    </div>
                </header>

                <div className="transactions-container">
                    {loading ? (
                        <div className="loading-state">Loading transactions...</div>
                    ) : transactions.length === 0 ? (
                        <div className="empty-state">No transactions found. Adding one!</div>
                    ) : (
                        <div className="transactions-table-wrapper">
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(trx => (
                                        <tr key={trx.id}>
                                            <td>{new Date(trx.date).toLocaleDateString()}</td>
                                            <td>{trx.title}</td>
                                            <td>
                                                <span className="category-badge">{trx.category}</span>
                                            </td>
                                            <td>
                                                <span className={`type-badge ${trx.type}`}>
                                                    {trx.type.charAt(0).toUpperCase() + trx.type.slice(1)}
                                                </span>
                                            </td>
                                            <td className={trx.type === 'income' ? 'text-success' : 'text-danger'}>
                                                {trx.type === 'income' ? '+' : '-'}₹{Number(trx.amount).toLocaleString()}
                                            </td>
                                            <td className="actions-cell">
                                                <button className="action-btn edit" onClick={() => handleOpenModal(trx)}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="action-btn delete" onClick={() => handleDelete(trx.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Transaction Modal */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
                            <button className="btn-icon" onClick={() => setModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        {modalError && (
                            <div style={{ color: 'red', marginBottom: '16px', padding: '10px', background: '#ffebee', borderRadius: '8px' }}>
                                {modalError}
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Title</label>
                                <input required type="text" className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Groceries" />
                            </div>
                            <div className="form-group">
                                <label>Amount (₹)</label>
                                <input required type="number" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <select className="form-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input required type="date" className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transactions;
