const https = require('https');

const supabaseUrl = 'https://eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: '/rest/v1/stores?limit=1',
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
      console.log("CAMPOS DA TABELA STORES:");
      if (stores.length > 0) {
        console.log(Object.keys(stores[0]));
        console.log("EXEMPLO DE REGISTRO:");
        console.log(stores[0]);
      } else {
        console.log("Nenhuma loja encontrada.");
      }
    } catch (e) {
      console.log("Erro ao parsear dados:", data);
    }
  });
});

req.on('error', (e) => {
  console.error("Erro na requisição:", e);
});

req.end();
