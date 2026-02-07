import { createClient } from '@supabase/supabase-js';

// Las credenciales se leen desde variables de entorno
// Esto mantiene las credenciales seguras y fuera de GitHub
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validación para desarrollo
if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Faltan credenciales de Supabase!');
  console.error('Crea un archivo .env.local en la raíz del proyecto con:');
  console.error('REACT_APP_SUPABASE_URL=tu-url');
  console.error('REACT_APP_SUPABASE_ANON_KEY=tu-key');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Schema para las tablas de Supabase (ejecutar en SQL Editor)
/*

-- Tabla de Cuentas
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Transacciones
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  account_id UUID REFERENCES accounts ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Compras en Cuotas
CREATE TABLE installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  paid DECIMAL(12,2) DEFAULT 0,
  installments_paid INTEGER DEFAULT 0,
  total_installments INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own installments" ON installments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own installments" ON installments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own installments" ON installments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own installments" ON installments
  FOR DELETE USING (auth.uid() = user_id);

-- Índices para mejorar performance
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_installments_user ON installments(user_id);

*/