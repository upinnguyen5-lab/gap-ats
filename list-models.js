const https = require('https');
const apiKey = process.env.GEMINI_API_KEY || process.argv[2];
const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models?key=' + apiKey,
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).models.map(m => m.name)));
});
req.end();
