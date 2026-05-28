const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const orderId = '539062cb-1ef6-4bf9-bbfe-b1e5ae22b58b';

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: `/rest/v1/deliveries?external_order_id=eq.${orderId}`,
  method: 'DELETE',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  console.log("STATUS DO DELETE:", res.statusCode);
});

req.on('error', (e) => { console.error(e); });
req.end();
