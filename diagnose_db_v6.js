import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, fullKey);

async function diagnose() {
    console.log('--- Diagnosticando wallet_transactions (V6 - Simulação Manual) ---');
    
    const { data: store } = await supabase.from('stores').select('id').limit(1).single();
    if (!store) return;
    
    console.log('Usando Store ID:', store.id);

    // Simular o objeto que a Edge Function está enviando para MANUAL
    const testData = {
        store_id: store.id,
        amount: 25.50,
        type: 'RECHARGE',
        payment_method: 'MANUAL',
        status: 'PENDING',
        pix_qr_code: null,
        pix_copy_paste: null,
        external_id: null
    };

    console.log('Dados do teste:', JSON.stringify(testData, null, 2));

    const { error: insertError } = await supabase.from('wallet_transactions').insert(testData);

    if (insertError) {
        console.log('RESULTADO V6:');
        console.log('Mensagem:', insertError.message);
        console.log('Código:', insertError.code);
    } else {
        console.log('SUCESSO NA SIMULAÇÃO V6!');
    }
}

diagnose();
