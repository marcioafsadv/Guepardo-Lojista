import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log('--- Diagnosing deliveries table ---');

    // 1. Get a recent delivery record to see actual columns
    const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.log('SELECT error:', error.message, error.code, error.details);
    } else if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        console.log('COLUMNS:', cols.join(', '));
        console.log('\nHas cancellation_reason:', cols.includes('cancellation_reason'));
        console.log('Has status:', cols.includes('status'));
        console.log('Current status value:', data[0].status);
        console.log('Full row:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No deliveries found. Checking table by doing a SELECT on specific column...');
        const { error: colErr } = await supabase.from('deliveries').select('cancellation_reason').limit(1);
        if (colErr) {
            console.log('ERROR selecting cancellation_reason:', colErr.message);
        } else {
            console.log('Column cancellation_reason EXISTS.');
        }
    }

    // 2. Test a controlled update on a non-existent ID to catch RLS or column errors
    console.log('\n--- Testing update with cancellation_reason ---');
    const { error: updateErr } = await supabase
        .from('deliveries')
        .update({ status: 'cancelled', cancellation_reason: 'test' })
        .eq('id', '00000000-0000-0000-0000-000000000000'); // Fake ID

    if (updateErr) {
        console.log('UPDATE ERROR:', updateErr.message, '| Code:', updateErr.code, '| Details:', updateErr.details);
    } else {
        console.log('UPDATE test passed (no matching row, but no column/RLS error).');
    }

    // 3. Test update WITHOUT cancellation_reason to isolate the issue
    console.log('\n--- Testing update WITHOUT cancellation_reason ---');
    const { error: updateErr2 } = await supabase
        .from('deliveries')
        .update({ status: 'cancelled' })
        .eq('id', '00000000-0000-0000-0000-000000000000');

    if (updateErr2) {
        console.log('UPDATE ERROR (no cancellation_reason):', updateErr2.message, '| Code:', updateErr2.code);
    } else {
        console.log('UPDATE without cancellation_reason also passes.');
    }
}

diagnose().catch(console.error);
