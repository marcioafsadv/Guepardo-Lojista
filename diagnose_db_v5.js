import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, fullKey);

async function diagnose() {
    console.log('--- Diagnosticando wallet_transactions (V5 - Ultra-minimalista) ---');
    
    // Tentar pegar uma loja válida para usar o ID
    const { data: store } = await supabase.from('stores').select('id').limit(1).single();
    if (!store) return;
    
    console.log('Usando Store ID:', store.id);

    // Tentar INSERT sem metadata, sem description, sem pix_qr_code
    const { error: insertError } = await supabase.from('wallet_transactions').insert({
        store_id: store.id,
        amount: 1, // valor pequeno de teste
        type: 'RECHARGE',
        payment_method: 'MANUAL',
        status: 'PENDING'
    });

    if (insertError) {
        console.log('RESULTADO V5:');
        console.log('Mensagem:', insertError.message);
        console.log('Detalhes:', insertError.details);
    } else {
        console.log('INSERT ULTRA-MINIMALISTA FUNCIONOU!');
    }
    
    // Agora tentar com description
    console.log('Tentando com description...');
    const { error: descError } = await supabase.from('wallet_transactions').insert({
        store_id: store.id,
        amount: 1,
        type: 'RECHARGE',
        payment_method: 'MANUAL',
        status: 'PENDING',
        description: 'Teste'
    });
    if (descError) {
        console.log('ERRO NO DESCRIPTION:', descError.message);
    } else {
        console.log('DESCRIPTION EXISTE!');
    }
}

diagnose();
