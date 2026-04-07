
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function listTables() {
  console.log('--- Listando Tabelas do Banco eviukbluwrwcblwhkzwz ---');
  try {
    // Usando a query HTTP direta via Supabase para ver as definições
    const { data: stores, error: errStores } = await supabase.from('stores').select('id').limit(1);
    const { data: profiles, error: errProfiles } = await supabase.from('profiles').select('id').limit(1);
    const { data: wallet, error: errWallet } = await supabase.from('wallet_transactions').select('*').limit(1);

    console.log('Tabela Stores:', errStores ? `ERRO: ${errStores.message}` : (stores.length > 0 ? 'EXISTE E TEM DADOS' : 'EXISTE E ESTÁ VAZIA'));
    console.log('Tabela Profiles:', errProfiles ? `ERRO: ${errProfiles.message}` : (profiles.length > 0 ? 'EXISTE E TEM DADOS' : 'EXISTE E ESTÁ VAZIA'));
    console.log('Tabela Wallet:', errWallet ? `ERRO: ${errWallet.message}` : (wallet.length > 0 ? 'EXISTE E TEM DADOS' : 'EXISTE E ESTÁ VAZIA'));

  } catch (e) {
    console.error('Erro:', e);
  }
}

listTables();
