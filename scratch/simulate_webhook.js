const https = require('https');

const payload = [
  {
    "id": "event-6027d83e-c65e-4fb6-a898-11780e52ac62",
    "code": "PLACED",
    "correlationId": "6027d83e-c65e-4fb6-a898-11780e52ac62",
    "merchantId": "5810f9ac-c56e-41e3-82cc-f803f66c4529",
    "createdAt": new Date().toISOString()
  }
];

const postData = JSON.stringify(payload);

const options = {
  hostname: 'eviukbluwrwcblwhkzwz.supabase.co',
  path: '/functions/v1/ifood-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log("🚀 Invoking Edge Function with simulated webhook payload...");
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    try {
      const responseObj = JSON.parse(data);
      console.log("RESPONSE BODY:");
      console.log(JSON.stringify(responseObj, null, 2));
    } catch (e) {
      console.log("Raw Response Data:", data);
    }
  });
});

req.on('error', (e) => {
  console.error("Connection error:", e);
});

req.write(postData);
req.end();
