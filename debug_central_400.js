
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function debugError400() {
  console.log('--- Simulando Query do Central para Capturar Erro 400 ---');
  try {
    const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
            *,
            stores:store_id (
                fantasy_name,
                company_name
            )
        `)
        .or('payment_method.eq.MANUAL,payment_method.eq.PIX')
        .is('external_id', null)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ ERRO CAPTURADO:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ SUCESSO INESPERADO (Query funcionou aqui):', data.length, 'itens');
  } catch (e) {
    console.error('Erro catastrofico:', e);
  }
}

debugError400();
