// Test Realtime connection directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        logger: (kind, msg, data) => {
            console.log(`[TEST ${kind}] ${msg}`, data);
        },
        logLevel: 'info'
    }
});

console.log('🧪 Testing Realtime connection...');

const testChannel = supabase
    .channel('test-connection')
    .on('broadcast', { event: 'test' }, (payload) => {
        console.log('✅ Received test broadcast:', payload);
    })
    .subscribe((status, err) => {
        console.log('📡 Test channel status:', status);
        if (err) {
            console.error('❌ Test channel error:', err);
        }

        if (status === 'SUBSCRIBED') {
            console.log('✅ REALTIME IS WORKING!');
            // Send a test message
            testChannel.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: 'Hello from test!' }
            });
        } else if (status === 'TIMED_OUT') {
            console.error('❌ REALTIME TIMED OUT - Possible causes:');
            console.error('1. Realtime is disabled in Supabase project settings');
            console.error('2. Firewall/antivirus blocking WebSocket connections');
            console.error('3. Network/proxy blocking WSS protocol');
            console.error('4. Supabase project is paused or has issues');
        } else if (status === 'CLOSED') {
            console.error('❌ REALTIME CLOSED - Connection was rejected');
            console.error('Check Supabase dashboard for Realtime status');
        }
    });

// Keep the connection alive for 10 seconds
setTimeout(() => {
    console.log('🛑 Closing test connection');
    supabase.removeChannel(testChannel);
}, 10000);
