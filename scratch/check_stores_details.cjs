const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: '/rest/v1/stores?select=*',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const stores = JSON.parse(data);
      console.log("DETALHES DE TODAS AS LOJAS:");
      stores.forEach(s => {
        console.log({
          id: s.id,
          name: s.fantasy_name,
          company: s.company_name,
          wallet_balance: s.wallet_balance,
          ifood_merchant_id: s.ifood_merchant_id,
          email: s.email,
          status: s.status,
          is_approved: s.is_approved
        });
      });
    } catch (e) {
      console.log("Erro ao parsear:", data);
    }
  });
});

req.on('error', (e) => { console.error(e); });
req.end();
