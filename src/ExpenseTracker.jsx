import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, LogOut } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { supabase } from './supabaseConfig';

const ExpenseTracker = ({ session }) => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [timeRange, setTimeRange] = useState('3m'); // 3m, 6m, 1y, custom
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Función para mostrar notificaciones
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Cargar datos desde Supabase
  useEffect(() => {
    console.log('✅ ExpenseTracker montado. User ID:', session?.user?.id);
    console.log('✅ User email:', session?.user?.email);
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar cuentas
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (accountsError) {
          console.error('❌ Error loading accounts:', accountsError);
        } else {
          console.log('✅ Accounts loaded:', accountsData);
        }
        
        // Cargar transacciones
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('date', { ascending: false });
        
        if (transactionsError) {
          console.error('❌ Error loading transactions:', transactionsError);
        } else {
          console.log('✅ Transactions loaded:', transactionsData);
        }
        
        // Cargar cuotas
        const { data: installmentsData, error: installmentsError } = await supabase
          .from('installments')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (installmentsError) {
          console.error('❌ Error loading installments:', installmentsError);
        } else {
          console.log('✅ Installments loaded:', installmentsData);
        }
        
        setAccounts(accountsData || []);
        setTransactions(transactionsData || []);
        setInstallments(installmentsData || []);
      } catch (error) {
        console.error('❌ Fatal error loading data:', error);
        setAccounts([]);
        setTransactions([]);
        setInstallments([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest('button')) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const getFilteredTransactions = () => {
    if (timeRange === 'custom') {
      // Filtrar por mes específico
      const filtered = transactions.filter(t => t.date.slice(0, 7) === selectedMonth);
      
      // Filtrar por categorías si hay seleccionadas
      if (selectedCategories.length > 0) {
        return filtered.filter(t => selectedCategories.includes(t.category));
      }
      return filtered;
    }
    
    // Filtro por rango (3m, 6m, 1y)
    const now = new Date();
    const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
    const cutoffDate = new Date(now.setMonth(now.getMonth() - months));
    
    const filtered = transactions.filter(t => new Date(t.date) >= cutoffDate);
    
    // Filtrar por categorías si hay seleccionadas
    if (selectedCategories.length > 0) {
      return filtered.filter(t => selectedCategories.includes(t.category));
    }
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // Obtener todas las categorías únicas
  const allCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();

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

  const deleteTransaction = async (transactionId) => {
    setConfirmDialog({
      title: '🗑️ Eliminar transacción',
      message: '¿Estás seguro de que quieres eliminar esta transacción?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId);

          if (error) throw error;

          // Actualizar estado local
          setTransactions(transactions.filter(t => t.id !== transactionId));
          
          // Recargar cuentas para actualizar balances
          const { data: accountsData } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', session.user.id);
          
          setAccounts(accountsData || []);
          showToast('🗑️ Transacción eliminada correctamente', 'success');
        } catch (error) {
          console.error('Error al eliminar transacción:', error);
          showToast('❌ Error al eliminar la transacción', 'error');
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const editTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setModalType('transaction');
    setShowModal(true);
  };

  const deleteAccount = async (accountId) => {
    setConfirmDialog({
      title: '🗑️ Eliminar cuenta',
      message: '¿Estás seguro de que quieres eliminar esta cuenta? Se eliminarán todas las transacciones asociadas.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId);

          if (error) throw error;

          // Actualizar estado local
          setAccounts(accounts.filter(a => a.id !== accountId));
          
          // Recargar transacciones (las asociadas se habrán eliminado por CASCADE)
          const { data: transactionsData } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .order('date', { ascending: false });
          
          setTransactions(transactionsData || []);
          showToast('🗑️ Cuenta eliminada correctamente', 'success');
        } catch (error) {
          console.error('Error al eliminar cuenta:', error);
          showToast('❌ Error al eliminar la cuenta', 'error');
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const editAccount = (account) => {
    setEditingAccount(account);
    setModalType('account');
    setShowModal(true);
  };

  const deleteInstallment = async (installmentId) => {
    setConfirmDialog({
      title: '🗑️ Eliminar cuota',
      message: '¿Estás seguro de que quieres eliminar esta compra en cuotas?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('installments')
            .delete()
            .eq('id', installmentId);

          if (error) throw error;

          setInstallments(installments.filter(i => i.id !== installmentId));
          showToast('🗑️ Cuota eliminada correctamente', 'success');
        } catch (error) {
          console.error('Error al eliminar cuota:', error);
          showToast('❌ Error al eliminar la cuota', 'error');
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const editInstallment = (installment) => {
    setEditingInstallment(installment);
    setModalType('installment');
    setShowModal(true);
  };

  const Modal = ({ children, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  const AddTransactionModal = () => {
    const [formData, setFormData] = useState(
      editingTransaction ? {
        type: editingTransaction.type,
        amount: editingTransaction.amount.toString(),
        description: editingTransaction.description,
        accountId: editingTransaction.account_id,
        category: editingTransaction.category,
        date: editingTransaction.date
      } : {
        type: 'expense',
        amount: '',
        description: '',
        accountId: accounts[0]?.id || '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      }
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (editingTransaction) {
          // Editar transacción existente
          const { data, error } = await supabase
            .from('transactions')
            .update({
              type: formData.type,
              amount: parseFloat(formData.amount),
              description: formData.description,
              category: formData.category,
              date: formData.date,
              account_id: formData.accountId
            })
            .eq('id', editingTransaction.id)
            .select();

          if (error) throw error;
          
          // Actualizar estado local
          setTransactions(transactions.map(t => 
            t.id === editingTransaction.id ? data[0] : t
          ));
          
          // Recargar cuentas para actualizar balances
          const { data: accountsData } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', session.user.id);
          
          setAccounts(accountsData || []);
        } else {
          // Crear nueva transacción
          const { data, error } = await supabase
            .from('transactions')
            .insert([{
              user_id: session.user.id,
              account_id: formData.accountId,
              type: formData.type,
              amount: parseFloat(formData.amount),
              description: formData.description,
              category: formData.category,
              date: formData.date
            }])
            .select();

          if (error) throw error;
          
          setTransactions([data[0], ...transactions]);
          
          // Recargar cuentas para actualizar balances
          const { data: accountsData } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', session.user.id);
          
          setAccounts(accountsData || []);
        }
        
        setShowModal(false);
        setEditingTransaction(null);
        showToast(editingTransaction ? '✅ Transacción actualizada' : '✅ Transacción creada', 'success');
      } catch (error) {
        console.error('Error saving transaction:', error);
        showToast('❌ Error al guardar la transacción', 'error');
      }
    };

    const handleClose = () => {
      setShowModal(false);
      setEditingTransaction(null);
    };

    return (
      <Modal onClose={handleClose}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
          {editingTransaction ? '✏️ Editar Transacción' : (formData.type === 'expense' ? '💸 Nuevo Gasto' : '💰 Nuevo Ingreso')}
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
    const [formData, setFormData] = useState(
      editingAccount ? {
        name: editingAccount.name,
        balance: editingAccount.balance.toString(),
        color: editingAccount.color
      } : {
        name: '',
        balance: '',
        color: '#6366f1'
      }
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (editingAccount) {
          // Editar cuenta existente
          const { data, error } = await supabase
            .from('accounts')
            .update({
              name: formData.name,
              balance: parseFloat(formData.balance),
              color: formData.color
            })
            .eq('id', editingAccount.id)
            .select();

          if (error) throw error;
          
          setAccounts(accounts.map(a => 
            a.id === editingAccount.id ? data[0] : a
          ));
          showToast('✅ Cuenta actualizada correctamente', 'success');
        } else {
          // Crear nueva cuenta
          const { data, error } = await supabase
            .from('accounts')
            .insert([{
              user_id: session.user.id,
              name: formData.name,
              balance: parseFloat(formData.balance),
              color: formData.color
            }])
            .select();

          if (error) throw error;
          
          setAccounts([...accounts, data[0]]);
          showToast('✅ Cuenta creada correctamente', 'success');
        }
        
        setShowModal(false);
        setEditingAccount(null);
      } catch (error) {
        console.error('Error saving account:', error);
        showToast('❌ Error al guardar cuenta', 'error');
      }
    };

    const handleClose = () => {
      setShowModal(false);
      setEditingAccount(null);
    };

    return (
      <Modal onClose={handleClose}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
          {editingAccount ? '✏️ Editar Cuenta' : '💳 Nueva Cuenta'}
        </h2>
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
    const [formData, setFormData] = useState(
      editingInstallment ? {
        name: editingInstallment.name,
        total: editingInstallment.total.toString(),
        totalInstallments: editingInstallment.total_installments.toString(),
        installmentsPaid: editingInstallment.installments_paid.toString()
      } : {
        name: '',
        total: '',
        totalInstallments: '',
        installmentsPaid: '0'
      }
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const total = parseFloat(formData.total);
        const installmentsPaid = parseInt(formData.installmentsPaid);
        const totalInstallments = parseInt(formData.totalInstallments);
        const paid = (total / totalInstallments) * installmentsPaid;
        
        if (editingInstallment) {
          // Editar cuota existente
          const { data, error } = await supabase
            .from('installments')
            .update({
              name: formData.name,
              total: total,
              paid: paid,
              installments_paid: installmentsPaid,
              total_installments: totalInstallments
            })
            .eq('id', editingInstallment.id)
            .select();

          if (error) throw error;
          
          setInstallments(installments.map(i => 
            i.id === editingInstallment.id ? data[0] : i
          ));
          showToast('✅ Cuota actualizada correctamente', 'success');
        } else {
          // Crear nueva cuota
          const { data, error } = await supabase
            .from('installments')
            .insert([{
              user_id: session.user.id,
              name: formData.name,
              total: total,
              paid: paid,
              installments_paid: installmentsPaid,
              total_installments: totalInstallments
            }])
            .select();

          if (error) throw error;
          
          setInstallments([...installments, data[0]]);
          showToast('✅ Compra en cuotas creada', 'success');
        }
        
        setShowModal(false);
        setEditingInstallment(null);
      } catch (error) {
        console.error('Error saving installment:', error);
        showToast('❌ Error al guardar cuota', 'error');
      }
    };

    const handleClose = () => {
      setShowModal(false);
      setEditingInstallment(null);
    };

    return (
      <Modal onClose={handleClose}>
        <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700' }}>
          {editingInstallment ? '💳 Actualizar Cuotas' : '🛒 Nueva Compra en Cuotas'}
        </h2>
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Cuotas Pagadas
              {formData.totalInstallments && (
                <span style={{ opacity: 0.6, fontSize: '12px', marginLeft: '8px' }}>
                  ({formData.installmentsPaid} de {formData.totalInstallments})
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(formData.installmentsPaid) || 0;
                  if (current > 0) {
                    setFormData({...formData, installmentsPaid: (current - 1).toString()});
                  }
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a',
                  background: '#1f1f1f',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  minWidth: '48px'
                }}
              >
                −
              </button>
              <input
                type="number"
                value={formData.installmentsPaid}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  const max = parseInt(formData.totalInstallments) || 999;
                  if (value >= 0 && value <= max) {
                    setFormData({...formData, installmentsPaid: e.target.value});
                  }
                }}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #2a2a2a', 
                  background: '#0d0d0d', 
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
                min="0"
                max={formData.totalInstallments || 999}
              />
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(formData.installmentsPaid) || 0;
                  const max = parseInt(formData.totalInstallments) || 999;
                  if (current < max) {
                    setFormData({...formData, installmentsPaid: (current + 1).toString()});
                  }
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a',
                  background: '#1f1f1f',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  minWidth: '48px'
                }}
              >
                +
              </button>
            </div>
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#191919',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <div>Cargando tus datos...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#191919',
      color: '#fff',
      fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
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
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto'
        }}>
          {/* Title - Top */}
          <h1 style={{ 
            fontSize: '22px', 
            fontWeight: '700', 
            margin: '0 0 16px 0',
            textAlign: 'center'
          }}>
            💰 Mi Plata en Orden
          </h1>

          {/* Buttons Row - Bottom */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            {/* User Menu - Left */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '20px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                👤
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '54px',
                  left: 0,
                  background: '#1f1f1f',
                  border: '1px solid #2a2a2a',
                  borderRadius: '12px',
                  padding: '12px',
                  minWidth: '240px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  animation: 'slideUp 0.2s ease'
                }}>
                  {/* Email */}
                  {session?.user?.email && (
                    <div style={{
                      padding: '12px',
                      borderBottom: '1px solid #2a2a2a',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '4px' }}>
                        Cuenta
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {session.user.email}
                      </div>
                    </div>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={18} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
            
            {/* Add Button - Right */}
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
                justifyContent: 'center',
                gap: '8px',
                flex: 1
              }}
            >
              <Plus size={20} /> Agregar
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
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>💳 Cuentas</h2>
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
                  borderLeft: `4px solid ${account.color}`,
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>{account.name}</div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>{formatCurrency(account.balance)}</div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => editAccount(account)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2a2a2a',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.2s',
                      flex: 1
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#10b98110'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2a2a2a',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.2s',
                      flex: 1
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#ef444410'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>📊 Evolución de tus finanzas</h2>
            
            {/* Time Range Selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#1f1f1f', padding: '4px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                {['3m', '6m', '1y', 'custom'].map(range => (
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
                    {range === '3m' ? '3 meses' : range === '6m' ? '6 meses' : range === '1y' ? '1 año' : '📅 Mes específico'}
                  </button>
                ))}
              </div>

              {/* Month Selector */}
              {timeRange === 'custom' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #2a2a2a',
                    background: '#1f1f1f',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                />
              )}
            </div>

            {/* Category Filter */}
            {allCategories.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>
                  Filtrar por categorías:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedCategories([])}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: selectedCategories.length === 0 ? '2px solid #10b981' : '1px solid #2a2a2a',
                      background: selectedCategories.length === 0 ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: selectedCategories.length === 0 ? '600' : '400'
                    }}
                  >
                    Todas
                  </button>
                  {allCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => {
                        if (selectedCategories.includes(category)) {
                          setSelectedCategories(selectedCategories.filter(c => c !== category));
                        } else {
                          setSelectedCategories([...selectedCategories, category]);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: selectedCategories.includes(category) ? '2px solid #10b981' : '1px solid #2a2a2a',
                        background: selectedCategories.includes(category) ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: selectedCategories.includes(category) ? '600' : '400'
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              💰 Ranking de Categorías
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
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>📝 Transacciones Recientes</h2>
          <div style={{ background: '#1f1f1f', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            {transactions.slice(0, 10).map((transaction, index) => (
              <div
                key={transaction.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < 9 ? '1px solid #2a2a2a' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1 }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => editTransaction(transaction)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2a2a2a',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#10b98110'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteTransaction(transaction.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2a2a2a',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#ef444410'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compras en Cuotas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>🛒 Compras en Cuotas</h2>
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
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ opacity: 0.5 }}>Pagado: </span>
                      <span style={{ color: '#10b981', fontWeight: '600' }}>{formatCurrency(item.paid)}</span>
                    </div>
                    <div>
                      <span style={{ opacity: 0.5 }}>Restante: </span>
                      <span style={{ color: '#ef4444', fontWeight: '600' }}>{formatCurrency(remaining)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => editInstallment(item)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #2a2a2a',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        flex: 1,
                        fontWeight: '500',
                        color: '#ffffff'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#10b98110';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      title="Pagar cuota"
                    >
                      💳 Pagar cuota
                    </button>
                    <button
                      onClick={() => deleteInstallment(item.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #2a2a2a',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s',
                        flex: 1,
                        color: '#ffffff'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#ef444410';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
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
          maxWidth: 440px;
          width: 70%;
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
            width: 100%;
          }
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInBounce {
          0% {
            transform: translateX(400px) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translateX(-10px) scale(1.02);
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes popIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)',
          border: '1px solid #3a3a3a',
          borderRadius: '16px',
          boxShadow: `
            0 10px 40px rgba(0, 0, 0, 0.4),
            0 4px 20px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          padding: '20px 24px',
          minWidth: '320px',
          maxWidth: '450px',
          zIndex: 10000,
          animation: 'slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '32px',
              lineHeight: 1,
              animation: 'popIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both'
            }}>
              {toast.message.split(' ')[0]}
            </div>
            
            {/* Message */}
            <div style={{
              flex: 1,
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              letterSpacing: '0.3px',
              lineHeight: '1.5'
            }}>
              {toast.message.split(' ').slice(1).join(' ')}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'rotate(90deg)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'rotate(0deg)';
              }}
            >
              ×
            </button>
          </div>
          
          {/* Progress bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            animation: 'shrink 3s linear',
            transformOrigin: 'left'
          }} />
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div 
          className="modal-overlay" 
          onClick={confirmDialog.onCancel}
          style={{ zIndex: 10001 }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()}
            style={{ 
              maxWidth: '380px',
              textAlign: 'center',
              padding: '28px'
            }}
          >
            <h2 style={{ 
              marginBottom: '16px', 
              fontSize: '24px', 
              fontWeight: '700'
            }}>
              {confirmDialog.title}
            </h2>
            
            <p style={{ 
              marginBottom: '32px', 
              fontSize: '15px', 
              opacity: 0.8,
              lineHeight: '1.6'
            }}>
              {confirmDialog.message}
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;