import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, fullKey);

async function diagnose() {
    console.log('--- Diagnosticando wallet_transactions (V9 - Chave Moderna) ---');
    
    // Tentar SELECT genérico
    const { data, error } = await supabase.from('wallet_transactions').select('*').limit(1);
    
    if (error) {
        console.log('ERRO NO SELECT:', error.message);
        if (error.message.includes('JWT')) {
            console.log('Chave JWT inválida ou expirada.');
        }
    } else {
        console.log('SELECT FUNCIONOU COM CHAVE MODERNA!');
        if (data && data.length > 0) {
            console.log('Colunas:', Object.keys(data[0]).join(', '));
        } else {
            console.log('Tabela vazia.');
        }
    }
}

diagnose();
