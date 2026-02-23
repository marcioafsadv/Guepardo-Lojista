
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearOrdersForCourier() {
    console.log('🔍 Searching for courier "Jessica da Silva Souza"...');

    // 1. Find the courier ID
    const { data: couriers, error: courierError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%Jessica%Souza%');

    if (courierError) {
        console.error('❌ Error finding courier:', courierError.message);
        return;
    }

    if (!couriers || couriers.length === 0) {
        console.error('❌ Courier "Jessica da Silva Souza" not found.');
        return;
    }

    const courier = couriers[0];
    console.log(`✅ Found courier: ${courier.full_name} (ID: ${courier.id})`);

    // 2. Delete deliveries assigned to this courier that are NOT delivered or canceled
    console.log(`🗑️ Deleting active deliveries for ${courier.name}...`);

    // We select first to confirm what we would delete, then delete by ID to be safe
    // But since RLS might allow us to just delete by courier_id if we have anon key... let's try direct delete.
    // However, anon key usually respects RLS. If RLS blocks allow update/delete based on user_id matching auth.uid(), 
    // this script (running as anon/public) might fail if RLS is strict.
    // Lojista app usually uses the same key... let's hop it works or we need service_role key (which I don't have).

    const { data: activeDeliveries, error: fetchError } = await supabase
        .from('deliveries')
        .select('id')
        .eq('driver_id', courier.id)
        .neq('status', 'DELIVERED')
        .neq('status', 'CANCELED');

    if (fetchError) {
        console.error('❌ Error fetching active deliveries:', fetchError.message);
        return;
    }

    console.log(`📋 Found ${activeDeliveries.length} active deliveries to cancel.`);

    if (activeDeliveries.length > 0) {
        // Try deleting them
        const { error: deleteError } = await supabase
            .from('deliveries')
            .delete()
            .in('id', activeDeliveries.map(d => d.id));

        if (deleteError) {
            console.error('❌ Error deleting deliveries:', deleteError.message);
            // Fallback: Try updating status to CANCELED incase delete is blocked
            console.log('⚠️ Attempting to cancel instead of delete...');
            const { error: updateError } = await supabase
                .from('deliveries')
                .update({ status: 'CANCELED' })
                .in('id', activeDeliveries.map(d => d.id));

            if (updateError) {
                console.error('❌ Error cancelling deliveries:', updateError.message);
            } else {
                console.log('✅ Deliveries cancelled successfully.');
            }

        } else {
            console.log(`✅ Active deliveries deleted for ${courier.name}.`);
        }
    } else {
        console.log('ℹ️ No active deliveries found to delete.');
    }
}

clearOrdersForCourier();
