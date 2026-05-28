
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const fullKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

const supabase = createClient(supabaseUrl, fullKey);

async function findColumns() {
    console.log('--- Finding columns via targeted selection ---');
    const commonCols = [
        'id', 'store_id', 'amount', 'type', 'status', 'created_at', 'updated_at',
        'payment_method', 'method', 'description', 'external_id', 'asaas_id',
        'payment_id', 'transaction_id', 'pix_qr_code', 'pix_copy_paste',
        'mercadopago_payment_id', 'asaas_customer_id'
    ];

    for (const col of commonCols) {
        const { error } = await supabase.from('wallet_transactions').select(col).limit(1);
        if (!error) {
            console.log(`✅ ${col}`);
        } else {
            console.log(`❌ ${col} (${error.message})`);
        }
    }
}

findColumns();
