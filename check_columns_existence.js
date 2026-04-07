
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function checkColumnsExistence() {
  console.log('--- Testando Existência de Colunas na wallet_transactions ---');
  const columnsToTest = ['external_id', 'asaas_id', 'transaction_id', 'payment_id', 'pix_qr_code'];
  
  for (const col of columnsToTest) {
    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .select(col)
        .limit(1);

      if (error) {
        console.log(`❌ Coluna '${col}': NÃO existe (Erro: ${error.code})`);
      } else {
        console.log(`✅ Coluna '${col}': EXISTE!`);
      }
    } catch (e) {
      console.log(`❌ Coluna '${col}': Erro desconhecido`);
    }
  }
}

checkColumnsExistence();
