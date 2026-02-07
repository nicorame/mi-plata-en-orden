import React, { useState } from 'react';
import { supabase } from './supabaseConfig';

const Auth = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#191919',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '20px'
    }}>
      <div style={{
        background: '#1f1f1f',
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#fff', 
            margin: '0 0 8px 0' 
          }}>
            Mi Plata en Orden
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#9ca3af', 
            margin: 0 
          }}>
            Gestiona tus finanzas personales de forma simple
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.7 : 1
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
            <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
            <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
          </svg>
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          marginTop: '24px',
          lineHeight: '1.6'
        }}>
          Al continuar, aceptas nuestros términos de servicio y política de privacidad
        </p>
      </div>
    </div>
  );
};

export default Auth;