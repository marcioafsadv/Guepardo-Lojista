import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
// Service role key needed for DDL — using anon for now will test if RLS allows
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addColumn() {
    console.log('Adding cancellation_reason column to deliveries table...');

    // Use rpc to run raw SQL (requires admin/service role in Supabase usually)
    const { error } = await supabase.rpc('exec_sql', {
        sql: "ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;"
    });

    if (error) {
        console.log('RPC error (expected if not service role):', error.message);
        console.log('\nYou need to run this SQL manually in the Supabase SQL Editor:');
        console.log('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;');
    } else {
        console.log('Column added successfully!');
    }

    // Also test the update now
    const { error: updateErr } = await supabase
        .from('deliveries')
        .update({ status: 'cancelled', cancellation_reason: 'test' })
        .eq('id', '00000000-0000-0000-0000-000000000000');

    if (updateErr) {
        console.log('Update still failing:', updateErr.message);
    } else {
        console.log('Update now works!');
    }
}

addColumn().catch(console.error);
