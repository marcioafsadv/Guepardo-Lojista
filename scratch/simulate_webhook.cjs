const https = require('https');

const payload = [
  {
    "id": "event-b664a9cf-9494-4dc4-b9fc-6a6527b896fa",
    "code": "PLACED",
    "correlationId": "b664a9cf-9494-4dc4-b9fc-6a6527b896fa",
    "merchantId": "5810F9AC-C56E-41E3-82CC-F803F66C4529", // UPPERCASE!
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
