
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eviukbluwrwcblwhkzwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E'
);

async function findTargetId() {
  const targetId = '9f7a6f43-6bab-4267-b433-9d0e96364e07';
  console.log(`--- Caçando ID: ${targetId} ---`);
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', targetId);

    if (error) {
      console.error('Erro na query:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('ID NÃO encontrado no banco eviukbluwrwcblwhkzwz.');
      return;
    }

    console.log('✅ ACHEI! Detalhes da transação:');
    console.log(JSON.stringify(data[0], null, 2));
  } catch (e) {
    console.error('Erro:', e);
  }
}

findTargetId();
