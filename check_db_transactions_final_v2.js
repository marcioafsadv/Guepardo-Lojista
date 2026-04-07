
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function checkPendingTransactions() {
  console.log('--- Buscando Transações Pendentes (Definitive) ---');
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*, stores(fantasy_name)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro na query:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('Nenhuma transação PENDING encontrada.');
      return;
    }

    console.log(`Encontradas ${data.length} transações pendentes:`);
    data.forEach(tx => {
      console.log(`ID: ${tx.id} | Loja: ${tx.stores?.fantasy_name} | Valor: ${tx.amount} | Método: ${tx.payment_method} | ExtID: ${tx.external_id} | Criado em: ${tx.created_at}`);
    });
  } catch (e) {
    console.error('Erro:', e);
  }
}

checkPendingTransactions();
