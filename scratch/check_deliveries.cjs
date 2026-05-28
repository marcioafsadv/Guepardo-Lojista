const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: '/rest/v1/deliveries?external_source=eq.IFOOD&select=*',
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
      const deliveries = JSON.parse(data);
      console.log("PEDIDOS IFOOD NO BANCO:");
      console.log(JSON.stringify(deliveries, null, 2));
    } catch (e) {
      console.log("Erro ao parsear:", data);
    }
  });
});

req.on('error', (e) => { console.error(e); });
req.end();
