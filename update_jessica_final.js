import https from 'https';

const supabaseUrl = 'eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY';
const correctId = 'fac5a0c7-8761-4c17-9913-6f8d92369545';

const body = JSON.stringify({
  address: {
    zip_code: "13313-005",
    street: "Rua Carlos Scalet",
    number: "58",
    complement: "",
    district: "Jardim Padre Bento",
    city: "Itu",
    state: "SP"
  },
  lat: -23.277685,
  lng: -47.284687
});

const options = {
  hostname: supabaseUrl,
  path: `/rest/v1/stores?id=eq.${correctId}`,
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
    console.log('Status code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(body);
req.end();
