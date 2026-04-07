
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function discoverColumns() {
  console.log('--- Descobrindo Colunas da Tabela wallet_transactions ---');
  try {
    // Pegamos uma linha qualquer para ver as chaves
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .limit(1);

    if (error) {
      // Se der erro 400 aqui também, tentaremos outro método
      console.error('Erro ao buscar dados:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('Colunas encontradas:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Tabela vazia, não foi possível inferir colunas via SELECT *');
      // Tentativa 2: RPC ou query de sistema se permitido
    }
  } catch (e) {
    console.error('Erro:', e);
  }
}

discoverColumns();
