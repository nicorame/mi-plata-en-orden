import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseConfig';
import Auth from './Auth.jsx';
import ExpenseTracker from './ExpenseTracker.jsx';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('✅ Session loaded:', session);
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      console.log('👤 User ID:', session.user.id);
      console.log('📧 User email:', session.user.email);
    }
  }, [session]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#191919',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '18px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <div>Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!session ? (
        <Auth />
      ) : (
        <ExpenseTracker session={session} />
      )}
    </>
  );
}

export default App;