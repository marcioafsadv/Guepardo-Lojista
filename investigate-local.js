
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificMission() {
    const missionId = 'e141df67-7bc1-41c2-9603-c29b8928f11d'; // From screenshot log

    console.log(`🔍 Checking mission status for ID: ${missionId}...`);

    // Check if it exists
    const { data: mission, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', missionId)
        .maybeSingle();

    if (error) {
        console.error('❌ Error fetching mission:', error.message);
        return;
    }

    if (!mission) {
        console.log('✅ Mission NOT FOUND in database.');
    } else {
        console.log(`⚠️ Mission found in DB! Status: ${mission.status}, Driver ID: ${mission.driver_id}`);

        // Attempt to DELETE it
        console.log(`🗑️ Deleting mission ${missionId}...`);
        const { error: deleteError } = await supabase
            .from('deliveries')
            .delete()
            .eq('id', missionId);

        if (deleteError) {
            console.error('❌ Error deleting mission:', deleteError.message);
            // Attempt to Cancel if FK constraint
            if (deleteError.message.includes('violates foreign key constraint') || deleteError.message.includes('policy')) {
                console.log('⚠️ Attempting to CANCEL instead...');
                const { error: cancelError } = await supabase
                    .from('deliveries')
                    .update({ status: 'CANCELED' })
                    .eq('id', missionId);
                if (cancelError) {
                    console.error('❌ Error cancelling mission:', cancelError.message);
                } else {
                    console.log('✅ Mission canceled successfully.');
                }
            }

        } else {
            console.log('✅ Mission deleted successfully.');
        }

    }

    // Also check for any OTHER pending missions for any user with name like Jessica
    console.log('🔍 Double checking any other active missions for Jessica...');
    const { data: couriers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%Jessica%Souza%');

    if (couriers && couriers.length > 0) {
        const courier = couriers[0];
        const { data: activeDeliveries } = await supabase
            .from('deliveries')
            .select('id, status')
            .eq('driver_id', courier.id)
            .neq('status', 'DELIVERED')
            .neq('status', 'CANCELED');

        if (activeDeliveries && activeDeliveries.length > 0) {
            console.log(`⚠️ Found ${activeDeliveries.length} OTHER active missions for Jessica:`);
            activeDeliveries.forEach(d => console.log(` - ID: ${d.id}, Status: ${d.status}`));

            // Delete them too
            const { error: deleteError2 } = await supabase
                .from('deliveries')
                .delete()
                .in('id', activeDeliveries.map(d => d.id));
            if (!deleteError2) console.log('✅ All other active missions deleted.');
        } else {
            console.log('✅ No other active missions found for Jessica.');
        }
    }
}

checkSpecificMission();
