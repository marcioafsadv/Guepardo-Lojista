import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, fullKey);

async function findTheTruth() {
    console.log('--- Investigação Final de Colunas ---');
    try {
        // 1. Tentar pegar QUALQUER linha de QUALQUER tabela financeira para ver padrões
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
        
        // 2. Se wallet_transactions está vazia, tentar descobrir por erro de insert intencional
        console.log('Tentando insert intencionalmente errado para ler o erro do Postgres...');
        const { error: schemaError } = await supabase.from('wallet_transactions').insert({ 
            "coluna_que_nao_existe_123": true 
        });
        
        if (schemaError) {
            console.log('Mensagem de erro do Postgres:', schemaError.message);
            // Às vezes o erro lista as colunas válidas.
        }

    } catch (e) {
        console.error(e);
    }
}

findTheTruth();
