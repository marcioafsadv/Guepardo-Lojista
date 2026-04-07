
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function checkTransactions() {
  console.log('--- Verificando últimas 10 transações de carteira ---');
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro na query:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('Nenhuma transação encontrada.');
      return;
    }

    console.log('✅ Últimas transações:');
    data.forEach(tx => {
       console.log(`[${tx.created_at}] ID: ${tx.id} | Status: ${tx.status} | Valor: R$ ${tx.amount} | Método: ${tx.payment_method}`);
    });
  } catch (e) {
    console.error('Erro:', e);
  }
}

checkTransactions();
