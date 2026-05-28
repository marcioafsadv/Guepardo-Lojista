const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: '/rest/v1/deliveries?external_order_id=eq.8ba6d334-61c0-4894-be87-1b712b4c1c35&select=*',
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
      if (deliveries.length > 0) {
        const d = deliveries[0];
        const summary = {
          id: d.id,
          store_id: d.store_id,
          store_name: d.store_name,
          customer_name: d.customer_name,
          customer_address: d.customer_address,
          status: d.status,
          external_source: d.external_source,
          external_order_id: d.external_order_id,
          created_at: d.created_at,
          driver_id: d.driver_id,
          scheduled_at: d.items?.scheduledAt || null
        };
        console.log("PEDIDO ENCONTRADO NO BANCO:");
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log("Nenhum pedido encontrado com este external_order_id.");
      }
    } catch (e) {
      console.log("Erro ao parsear:", data);
    }
  });
});

req.on('error', (e) => { console.error(e); });
req.end();
