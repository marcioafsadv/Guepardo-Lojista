
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing, functionality will be limited');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
