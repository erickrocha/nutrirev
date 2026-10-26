const http = require('http');

const data = JSON.stringify({
  email: 'financeiro@nucleocasa.com.br',
  password: 'password123'
});

const req = http.request({
  hostname: 'localhost',
  port: 8080,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    const response = JSON.parse(body);
    const token = response.token;
    
    if (!token) {
      console.error('No token received');
      return;
    }

    const req2 = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/daily-meal',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', (chunk) => { body2 += chunk; });
      res2.on('end', () => {
        console.log('Daily Meals response:', body2);
      });
    });
    
    req2.on('error', (e) => {
      console.error(`Problem with req2: ${e.message}`);
    });
    
    req2.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with req: ${e.message}`);
});

req.write(data);
req.end();
