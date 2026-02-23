
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or Key missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearOrdersForCourier() {
    console.log('🔍 Searching for courier "Jessica da Silva Souza"...');

    // 1. Find the courier ID
    const { data: couriers, error: courierError } = await supabase
        .from('courier_profiles')
        .select('id, name')
        .ilike('name', '%Jessica%Souza%');

    if (courierError) {
        console.error('❌ Error finding courier:', courierError.message);
        return;
    }

    if (!couriers || couriers.length === 0) {
        console.error('❌ Courier "Jessica da Silva Souza" not found.');
        return;
    }

    const courier = couriers[0];
    console.log(`✅ Found courier: ${courier.name} (ID: ${courier.id})`);

    // 2. Delete deliveries assigned to this courier that are NOT delivered or canceled
    console.log(`🗑️ Deleting active deliveries for ${courier.name}...`);

    const { data: deleted, error: deleteError } = await supabase
        .from('deliveries')
        .delete()
        .eq('courier_id', courier.id)
        .neq('status', 'DELIVERED')
        .neq('status', 'CANCELED')
        .select();

    if (deleteError) {
        console.error('❌ Error deleting deliveries:', deleteError.message);
    } else {
        console.log(`✅ ${deleted.length} active deliveries deleted for ${courier.name}.`);
    }
}

clearOrdersForCourier();
