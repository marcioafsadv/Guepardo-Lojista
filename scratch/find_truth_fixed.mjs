
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, fullKey);

async function findTheTruth() {
    console.log('--- Investigação Final de Colunas (Correct Key) ---');
    try {
        const tables = ['wallet_transactions', 'withdrawal_requests', 'deliveries'];
        
        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`Erro na tabela ${table}:`, error.message);
            } else if (data && data.length > 0) {
                console.log(`Colunas de ${table}:`, Object.keys(data[0]).join(', '));
            } else {
                console.log(`Tabela ${table} está vazia.`);
            }
        }
        
        console.log('Tentando insert intencionalmente errado para ler o erro do Postgres...');
        const { error: schemaError } = await supabase.from('wallet_transactions').insert({ 
            "coluna_que_nao_existe_123": true 
        });
        
        if (schemaError) {
            console.log('Mensagem de erro do Postgres:', schemaError.message);
            console.log('Detalhes:', schemaError.details);
            console.log('Dica:', schemaError.hint);
        }

    } catch (e) {
        console.error(e);
    }
}

findTheTruth();
