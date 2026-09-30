const https = require('https');
const fs = require('fs');

// قرا .env مباشرة
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', url);
console.log('KEY:', key ? key.substring(0, 20) + '...' : 'MISSING');

if (!url || !key) {
  console.log('❌ مفاتيح ناقصة');
  process.exit(1);
}

const data = JSON.stringify({
  email: 'test' + Date.now() + '@gmail.com',
  password: 'Youssef@2026!',
  data: { username: 'test' + Date.now() }
});

const options = {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
  },
};

const req = https.request(url + '/auth/v1/signup', options, (res) => {
  let body = '';
  res.on('data', (c) => (body += c));
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body.substring(0, 800));
  });
});

req.on('error', (e) => console.log('ERROR:', e.message));
req.write(data);
req.end();
