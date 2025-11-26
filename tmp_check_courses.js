const http = require('http');
http.get('http://127.0.0.1:3000/courses', res => {
  let data='';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try{ const json = JSON.parse(data); console.log('COURSES_COUNT:', Array.isArray(json)?json.length:'not-array'); if(Array.isArray(json) && json.length>0) console.log('FIRST:', json[0].title); else console.log(JSON.stringify(json, null, 2)); }catch(e){ console.error('Invalid JSON', e.message); console.log(data); }
  });
}).on('error', err => { console.error('ERROR', err.message); process.exit(1); });
