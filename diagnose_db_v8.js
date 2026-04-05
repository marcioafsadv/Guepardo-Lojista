import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, fullKey);

async function diagnose() {
    console.log('--- Diagnóstico de Lojas e Perfis (V8) ---');
    
    // 1. Tentar pegar a loja que o V5 achou
    const idSugerido = '0decb1d7-eca8-4382-83db-c2116dcb3864';
    const { data: store, error: storeError } = await supabase.from('stores').select('*').eq('id', idSugerido).single();
    
    if (storeError) {
        console.log('Erro ao buscar loja pelo ID sugerido:', storeError.message);
    } else if (store) {
        console.log('Loja encontrada!');
        console.log('ID:', store.id);
        console.log('Dono/Perfil (owner_id ou user_id?):');
        console.log(JSON.stringify(store, null, 2));
    }
}

diagnose();
