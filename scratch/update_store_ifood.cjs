const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';
const storeId = 'bcb22ff3-3f46-4402-a094-6a7c9c26db17'; // Guepardo Delivery
const ifoodMerchantId = '5810f9ac-c56e-41e3-82cc-f803f66c4529'; // ID de teste do iFood

const body = JSON.stringify({
  ifood_merchant_id: ifoodMerchantId
});

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: `/rest/v1/stores?id=eq.${storeId}`,
  method: 'PATCH',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("STATUS DA ATUALIZAÇÃO:", res.statusCode);
    console.log("RETORNO:", data);
  });
});

req.on('error', (e) => { console.error(e); });
req.write(body);
req.end();
