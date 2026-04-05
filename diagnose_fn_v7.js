import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, fullKey);

async function diagnose() {
    console.log('--- Invocando Edge Function (V7 - Debug Real) ---');
    
    // Pegar um ID de loja real
    const { data: store } = await supabase.from('stores').select('id').limit(1).single();
    if (!store) {
        console.log('Nenhuma loja encontrada para testar.');
        return;
    }
    
    console.log('Testando com Store ID:', store.id);

    try {
        const { data, error } = await supabase.functions.invoke('asaas-create-charge', {
            body: { 
                storeId: store.id, 
                amount: 25.00,
                billingType: 'MANUAL'
            }
        });

        if (error) {
            console.log('ERRO NA INVOCAÇÃO:');
            console.log('Status HTTP:', error.status); // Ver se existe status
            console.log('Mensagem:', error.message);
            // Tentar extrair o corpo do erro se possível
            if (error.context) {
              const body = await error.context.json();
              console.log('Corpo da Resposta (Erro):', JSON.stringify(body, null, 2));
            }
        } else {
            console.log('SUCESSO NA INVOCAÇÃO!');
            console.log('Dados recebidos:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log('Falha na tentativa de invocar:', e.message);
    }
}

diagnose();
