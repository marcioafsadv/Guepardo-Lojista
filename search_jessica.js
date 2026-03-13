import https from 'https';

const supabaseUrl = 'eviukbluwrwcblwhkzwz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3R3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E';

async function query(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: supabaseUrl,
      path: `/rest/v1/${path}`,
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
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- Searching in stores (recent) ---');
  // Get last 5 stores
  const recentStores = await query('stores?select=*&order=created_at.desc&limit=5');
  console.log('Recent stores:', JSON.stringify(recentStores, null, 2));

  console.log('--- Searching in stores for Jessica/Crochê ---');
  const stores = await query('stores?or=(name.ilike.%25Jessica%25,fantasy_name.ilike.%25Jessica%25,company_name.ilike.%25Jessica%25,name.ilike.%25Croch%25,fantasy_name.ilike.%25Croch%25)&select=*');
  console.log(JSON.stringify(stores, null, 2));

  console.log('\n--- Searching in profiles ---');
  const profiles = await query('profiles?full_name=ilike.%25Jessica%25&select=*');
  console.log(JSON.stringify(profiles, null, 2));

  console.log('\n--- Searching in deliveries ---');
  const deliveries = await query('deliveries?customer_name=ilike.%25Jessica%25&select=*');
  console.log(JSON.stringify(deliveries, null, 2));
}

run();
