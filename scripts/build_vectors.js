const fs = require('fs');
const path = require('path');
// We'll dynamically import `node-fetch` when needed so this script works
// across Node versions (some have global `fetch`, while node-fetch v3 is ESM-only).

require('dotenv').config();

const DB = path.join(__dirname, '..', 'db.json');
const OUT = path.join(__dirname, '..', 'vectors.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'textembedding-gecko-001';

if(!GEMINI_API_KEY || !GEMINI_API_URL){
  console.error('Missing GEMINI_API_KEY or GEMINI_API_URL in .env');
  process.exit(1);
}

function chunkText(text, maxLen = 800){
  const words = text.split(/\s+/);
  const chunks = [];
  let cur = [];
  let curLen = 0;
  for(const w of words){
    cur.push(w); curLen += w.length + 1;
    if(curLen > maxLen){ chunks.push(cur.join(' ')); cur = []; curLen = 0; }
  }
  if(cur.length) chunks.push(cur.join(' '));
  return chunks;
}

async function embedText(text){
  // ensure we have a fetch function (global in newer node, otherwise import node-fetch)
  let fetchFn = global.fetch;
  if(!fetchFn){
    try{
      const nf = await import('node-fetch');
      fetchFn = nf.default || nf;
    }catch(e){
      console.error('embedText error: could not load node-fetch', e.message);
      return null;
    }
  }

  // Build an embeddings endpoint from GEMINI_API_URL
  let url = GEMINI_API_URL;
  if(url && !url.includes('/v')) url = url.replace(/\/+$/,'') + `/v1/models/${EMBED_MODEL}:embedText`;
  try{
    // If the target is Google Generative Language, use API key query param instead of Bearer header
    let headers = { 'Content-Type': 'application/json' };
    let fetchUrl = url;
    if(fetchUrl.includes('generativelanguage.googleapis.com')){
      const joiner = fetchUrl.includes('?') ? '&' : '?';
      fetchUrl = fetchUrl + `${joiner}key=${encodeURIComponent(GEMINI_API_KEY)}`;
    }else{
      headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
    }

    // choose payload shape: Google Generative Language expects { text: '...' }
    const payload = fetchUrl.includes('generativelanguage.googleapis.com') ? { text: text } : { input: text };
    const res = await fetchFn(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if(!res.ok){ const t = await res.text(); console.error('embedText upstream', res.status, t); throw new Error('upstream_error: ' + t); }
    const j = await res.json();
    // try multiple possible shapes
    if(j.data && Array.isArray(j.data) && j.data[0] && j.data[0].embedding) return j.data[0].embedding;
    if(j.embedding) return j.embedding;
    if(j.embeddings && j.embeddings[0]) return j.embeddings[0];
    // fallback: return null
    return null;
  }catch(err){ console.error('embedText error', err.message); return null; }
}

async function main(){
  if(!fs.existsSync(DB)){ console.error('db.json not found'); process.exit(1); }
  const raw = fs.readFileSync(DB,'utf8');
  const jd = JSON.parse(raw);
  const courses = jd.courses || [];
  const store = [];
  for(const c of courses){
    const baseText = `${c.title || ''}\n\n${(c.description||'')}`;
    const lessons = Array.isArray(c.lessons) ? c.lessons.map(l=> l.title + '\n' + (l.content||'')).join('\n\n') : '';
    const full = [baseText, lessons].filter(Boolean).join('\n\n');
    const chunks = chunkText(full, 700);
    for(let i=0;i<chunks.length;i++){
      const txt = chunks[i];
      console.log(`Embedding course:${c.id||c.title} chunk ${i+1}/${chunks.length}`);
      const emb = await embedText(txt);
      store.push({ id: `${c.id||c.title}-chunk-${i+1}`, courseId: c.id||null, title: c.title||'', text: txt, embedding: emb });
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(store, null, 2), 'utf8');
  console.log('Wrote', OUT);
}

main();
