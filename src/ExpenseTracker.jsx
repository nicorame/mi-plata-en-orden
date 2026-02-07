import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, Calendar, ChevronDown, LogOut } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { supabase } from './supabaseConfig';

const ExpenseTracker = ({ session }) => {
  const [accounts, setAccounts] = useState([
    { id: 1, name: 'Efectivo', balance: 50000, color: '#6366f1' },
    { id: 2, name: 'Banco', balance: 150000, color: '#8b5cf6' }
  ]);
  
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'expense', amount: 25000, description: 'Supermercado', accountId: 1, date: '2024-02-06', category: 'Comida' },
    { id: 2, type: 'income', amount: 180000, description: 'Salario', accountId: 2, date: '2024-02-01', category: 'Trabajo' },
    { id: 3, type: 'expense', amount: 45000, description: 'Alquiler', accountId: 2, date: '2024-02-03', category: 'Vivienda' },
    { id: 4, type: 'expense', amount: 8000, description: 'Netflix', accountId: 2, date: '2024-02-05', category: 'Entretenimiento' },
    { id: 5, type: 'expense', amount: 15000, description: 'Combustible', accountId: 1, date: '2024-01-28', category: 'Transporte' },
    { id: 6, type: 'income', amount: 180000, description: 'Salario', accountId: 1, date: '2024-01-25', category: 'Trabajo' },
    { id: 7, type: 'expense', amount: 20000, description: 'Supermercado', accountId: 1, date: '2024-01-20', category: 'Comida' },
    { id: 8, type: 'expense', amount: 45000, description: 'Alquiler', accountId: 2, date: '2024-01-10', category: 'Vivienda' },
  ]);
  
  const [installments, setInstallments] = useState([
    { id: 1, name: 'Notebook', total: 300000, paid: 100000, installmentsPaid: 2, totalInstallments: 6 }
  ]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [timeRange, setTimeRange] = useState('3m'); // 3m, 6m, 1y

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const getFilteredTransactions = () => {
    const now = new Date();
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    const cutoffDate = new Date(now.setMonth(now.getMonth() - months));
    
    return transactions.filter(t => new Date(t.date) >= cutoffDate);
  };

  const filteredTransactions = getFilteredTransactions();
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMonthlyData = () => {
    const monthlyData = {};
    
    filteredTransactions.forEach(transaction => {
      const month = transaction.date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { month, income: 0, expense: 0, balance: 0 };
      }
      
      if (transaction.type === 'income') {
        monthlyData[month].income += transaction.amount;
      } else {
        monthlyData[month].expense += transaction.amount;
      }
    });
    
    const sorted = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    // Calcular balance acumulado
    let runningBalance = 0;
    return sorted.map(m => {
      runningBalance += (m.income - m.expense);
      return {
        ...m,
        balance: runningBalance,
        monthName: new Date(m.month + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      };
    });
  };

  const getCategoryData = () => {
    const categoryData = {};
    
    filteredTransactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(transaction => {
        if (!categoryData[transaction.category]) {
          categoryData[transaction.category] = 0;
        }
        categoryData[transaction.category] += transaction.amount;
      });
    
    return Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const Modal = ({ children, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  const AddTransactionModal = () => {
    const [formData, setFormData] = useState({
      type: 'expense',
      amount: '',
      description: '',
      accountId: accounts[0]?.id || 1,
      category: '',
      date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const newTransaction = {
        ...formData,
        id: Date.now(),
        amount: parseFloat(formData.amount)
      };
      
      setTransactions([newTransaction, ...transactions]);
      
      setAccounts(accounts.map(acc => 
        acc.id === formData.accountId 
          ? { ...acc, balance: acc.balance + (formData.type === 'income' ? parseFloat(formData.amount) : -parseFloat(formData.amount)) }
          : acc
      ));
      
      setShowModal(false);
    };

    return (
      <Modal onClose={() => setShowModal(false)}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
          {formData.type === 'expense' ? 'Nuevo Gasto' : 'Nuevo Ingreso'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Tipo</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'expense'})}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: formData.type === 'expense' ? '2px solid #ef4444' : '1px solid #2a2a2a',
                  background: formData.type === 'expense' ? 'rgba(239, 68, 68, 0.1)' : '#1f2937',
                  color: formData.type === 'expense' ? '#ef4444' : '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                💸 Gasto
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'income'})}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: formData.type === 'income' ? '2px solid #10b981' : '1px solid #2a2a2a',
                  background: formData.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : '#1f2937',
                  color: formData.type === 'income' ? '#10b981' : '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                💰 Ingreso
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Monto</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff', fontSize: '16px' }}
              placeholder="0"
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Descripción</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Cuenta</label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({...formData, accountId: parseInt(e.target.value)})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Categoría</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              placeholder="Ej: Comida, Transporte"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: 'transparent', color: '#fff', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: formData.type === 'income' ? '#10b981' : '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const AddAccountModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      balance: '',
      color: '#6366f1'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      setAccounts([...accounts, {
        ...formData,
        id: Date.now(),
        balance: parseFloat(formData.balance)
      }]);
      setShowModal(false);
    };

    return (
      <Modal onClose={() => setShowModal(false)}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>Nueva Cuenta</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              placeholder="Ej: Efectivo, Banco"
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Balance Inicial</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              placeholder="0"
              required
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
              Crear Cuenta
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const AddInstallmentModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      total: '',
      totalInstallments: '',
      installmentsPaid: 0
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      const total = parseFloat(formData.total);
      const paid = (total / formData.totalInstallments) * formData.installmentsPaid;
      
      setInstallments([...installments, {
        ...formData,
        id: Date.now(),
        total,
        paid,
        totalInstallments: parseInt(formData.totalInstallments),
        installmentsPaid: parseInt(formData.installmentsPaid)
      }]);
      setShowModal(false);
    };

    return (
      <Modal onClose={() => setShowModal(false)}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>Nueva Compra en Cuotas</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Total</label>
            <input
              type="number"
              value={formData.total}
              onChange={(e) => setFormData({...formData, total: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Cuotas Totales</label>
            <input
              type="number"
              value={formData.totalInstallments}
              onChange={(e) => setFormData({...formData, totalInstallments: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Cuotas Pagadas</label>
            <input
              type="number"
              value={formData.installmentsPaid}
              onChange={(e) => setFormData({...formData, installmentsPaid: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#0d0d0d', color: '#fff' }}
              min="0"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1f1f1f',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '12px',
        }}>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '14px', fontWeight: '600' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#191919',
      color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '0'
    }}>
      {/* Header */}
      <header style={{
        background: '#191919',
        padding: '20px',
        borderBottom: '1px solid #2a2a2a',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>💰 Mi Plata en Orden</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {session?.user?.email && (
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                {session.user.email}
              </span>
            )}
            
            <button
              onClick={() => openModal('transaction')}
              style={{
                background: '#10b981',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={20} /> Agregar
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                padding: '12px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Balance Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{
            background: '#1f1f1f',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #2a2a2a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Wallet size={20} style={{ opacity: 0.6 }} />
              <span style={{ fontSize: '14px', opacity: 0.6 }}>Balance Total</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>{formatCurrency(totalBalance)}</div>
          </div>

          <div style={{
            background: '#1f1f1f',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #2a2a2a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendingUp size={20} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '14px', opacity: 0.6 }}>Ingresos</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(totalIncome)}</div>
          </div>

          <div style={{
            background: '#1f1f1f',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #2a2a2a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendingDown size={20} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '14px', opacity: 0.6 }}>Gastos</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{formatCurrency(totalExpense)}</div>
          </div>
        </div>

        {/* Cuentas */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Cuentas</h2>
            <button
              onClick={() => openModal('account')}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                padding: '8px 16px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Nueva Cuenta
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {accounts.map(account => (
              <div
                key={account.id}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #2a2a2a',
                  padding: '20px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${account.color}`
                }}
              >
                <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>{account.name}</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{formatCurrency(account.balance)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Evolución de tus finanzas</h2>
            <div style={{ display: 'flex', gap: '8px', background: '#1f1f1f', padding: '4px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
              {['3m', '6m', '1y'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    background: timeRange === range ? '#10b981' : 'transparent',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: timeRange === range ? '600' : '400'
                  }}
                >
                  {range === '3m' ? '3 meses' : range === '6m' ? '6 meses' : '1 año'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ 
            background: '#1f1f1f', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #2a2a2a',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', opacity: 0.9 }}>
              Resumen unificado en Pesos (ARS)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '20px', marginBottom: '30px' }}>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>Ingresos</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(totalIncome)}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>Gastos</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{formatCurrency(totalExpense)}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>Balance</div>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  color: totalIncome - totalExpense >= 0 ? '#10b981' : '#ef4444' 
                }}>
                  {formatCurrency(totalIncome - totalExpense)}
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="monthName" 
                  stroke="#6b7280" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#2a2a2a' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#2a2a2a' }}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#colorIncome)"
                  name="Ingresos"
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fill="url(#colorExpense)"
                  name="Gastos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking de Categorías */}
          <div style={{
            background: '#1f1f1f',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #2a2a2a'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              Ranking de Categorías
            </h3>
            
            {categoryData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {categoryData.map((cat, index) => {
                  const percentage = (cat.value / totalExpense) * 100;
                  return (
                    <div key={cat.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '500' }}>{cat.name}</span>
                        <span style={{ fontWeight: '700' }}>{formatCurrency(cat.value)}</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#2a2a2a',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                No hay gastos registrados
              </div>
            )}
          </div>
        </div>

        {/* Transacciones Recientes */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Transacciones Recientes</h2>
          <div style={{ background: '#1f1f1f', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            {transactions.slice(0, 5).map((transaction, index) => (
              <div
                key={transaction.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < 4 ? '1px solid #2a2a2a' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{transaction.description}</div>
                  <div style={{ fontSize: '12px', opacity: 0.5 }}>{transaction.category} • {transaction.date}</div>
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: transaction.type === 'income' ? '#10b981' : '#ef4444'
                }}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compras en Cuotas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Compras en Cuotas</h2>
            <button
              onClick={() => openModal('installment')}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                padding: '8px 16px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Nueva Cuota
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {installments.map(item => {
              const remaining = item.total - item.paid;
              const progress = (item.paid / item.total) * 100;
              
              return (
                <div
                  key={item.id}
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #2a2a2a',
                    padding: '20px',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', opacity: 0.5 }}>
                        {item.installmentsPaid}/{item.totalInstallments} cuotas pagadas
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', opacity: 0.5 }}>Total</div>
                      <div style={{ fontSize: '18px', fontWeight: '700' }}>{formatCurrency(item.total)}</div>
                    </div>
                  </div>
                  
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#2a2a2a',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: '#10b981',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <div>
                      <span style={{ opacity: 0.5 }}>Pagado: </span>
                      <span style={{ color: '#10b981', fontWeight: '600' }}>{formatCurrency(item.paid)}</span>
                    </div>
                    <div>
                      <span style={{ opacity: 0.5 }}>Restante: </span>
                      <span style={{ color: '#ef4444', fontWeight: '600' }}>{formatCurrency(remaining)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && modalType === 'transaction' && <AddTransactionModal />}
      {showModal && modalType === 'account' && <AddAccountModal />}
      {showModal && modalType === 'installment' && <AddInstallmentModal />}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          background: #1f1f1f;
          padding: 32px;
          borderRadius: 16px;
          maxWidth: 500px;
          width: 100%;
          border: 1px solid #2a2a2a;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        input, select {
          font-family: inherit;
        }
        
        button {
          transition: all 0.2s ease;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          opacity: 0.9;
        }
        
        @media (max-width: 768px) {
          .modal-content {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default ExpenseTracker;