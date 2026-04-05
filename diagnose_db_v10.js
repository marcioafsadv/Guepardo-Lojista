import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, fullKey);

async function diagnose() {
    console.log('--- Forçando Erro de Schema (V10) ---');
    
    // Tentar INSERT com coluna inexistente
    const { error } = await supabase.from('wallet_transactions').insert({ 
        "get_all_columns_please_123": "test" 
    });
    
    if (error) {
        console.log('MENSAGEM DE ERRO REAL:');
        console.log(error.message);
        // Às vezes o erro do PostgREST tem um campo 'hint' ou 'details'
        if (error.details) console.log('Detalhes:', error.details);
        if (error.hint) console.log('Dica:', error.hint);
    } else {
        console.log('INSERT FUNCIONOU? (Não deveria)');
    }
}

diagnose();
