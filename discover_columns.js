import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, fullKey);

async function discover() {
    console.log('--- Descobrindo colunas de wallet_transactions ---');
    try {
        // Tentar um SELECT super genérico
        const { data, error } = await supabase.from('wallet_transactions').select('*').limit(1);
        
        if (error) {
            console.log('ERRO NO SELECT:', error.message);
        } else if (data && data.length > 0) {
            console.log('COLUNAS ENCONTRADAS:', Object.keys(data[0]).join(', '));
        } else {
            console.log('Tabela vazia. Tentando INSERT minimalista para puxar o esquema...');
            // Se a tabela estiver vazia, talvez o SELECT * não traga as chaves se o driver for preguiçoso
            // Mas em PostgREST ele traz.
            
            // Vamos tentar um insert que SABEMOS que funciona (dos 5 campos base + pix)
            const { data: inserted, error: insertError } = await supabase.from('wallet_transactions').insert({
                amount: 0,
                type: 'REFUND', // algo que não atrapalhe
                status: 'FAILED',
                payment_method: 'PIX'
                // O store_id é obrigatório? Vamos ver
            }).select('*').single();
            
            if (insertError) {
                console.log('ERRO NO INSERT DE DESCOBERTA:', insertError.message);
                if (insertError.message.includes('violates row-level security')) {
                   console.log('RLS está bloqueando, mas pelo menos sabemos que a tabela existe e aceita esses campos.');
                }
            } else if (inserted) {
                console.log('COLUNAS REAIS:', Object.keys(inserted).join(', '));
            }
        }
    } catch (e) {
        console.error('Falha crítica:', e.message);
    }
}

discover();
