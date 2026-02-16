
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eviukbluwrwcblwhkzwz.supabase.co';
// Using legacy anon key for Realtime support
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing, functionality will be limited');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        },
        // Enable logging to debug connection issues
        logger: (kind, msg, data) => {
            console.log(`[Realtime ${kind}] ${msg}`, data);
        },
        logLevel: 'info',
        // Increase timeout to 30 seconds
        timeout: 30000
    }
});
