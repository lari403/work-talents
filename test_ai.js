const fetch = require('node-fetch');
(async ()=>{
  try{
    const res = await fetch('http://localhost:4000/api/ai/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Quais cursos sobre Excel existem?' })
    });
    const txt = await res.text();
    console.log(txt);
  }catch(e){
    console.error('Request failed', e);
    process.exit(1);
  }
})();
