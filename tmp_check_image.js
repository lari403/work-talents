const http = require('http');
const url = process.argv[2] || 'http://127.0.0.1:8080/images/excel.jpg';
http.get(url, res => {
  console.log('STATUS', res.statusCode);
  console.log('CONTENT-TYPE', res.headers['content-type']);
  let size = 0;
  res.on('data', c => size += c.length);
  res.on('end', () => console.log('BYTES:', size));
}).on('error', err => { console.error('ERROR', err.message); process.exit(1); });
