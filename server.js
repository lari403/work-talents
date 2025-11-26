require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
// allow browser requests from other origins (live-server on :5500 etc.)
app.use(cors());

// simple in-memory rate limiter per IP (basic)
const requests = {};
const RATE_LIMIT = 60; // max requests
const WINDOW_MS = 60 * 1000; // per minute

function rateLimit(req, res, next){
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if(!requests[ip]) requests[ip] = [];
  // remove old
  requests[ip] = requests[ip].filter(t => now - t < WINDOW_MS);
  if(requests[ip].length >= RATE_LIMIT) return res.status(429).json({ error: 'rate_limited' });
  requests[ip].push(now);
  next();
}

// load course catalog from db.json to provide context
function loadCatalog(){
  try{
    const raw = fs.readFileSync(path.join(__dirname,'db.json'),'utf8');
    const jd = JSON.parse(raw);
    return jd.courses || [];
  }catch(e){ return []; }
}

// Helper: create a short textual context from courses (titles + short desc)
function buildCatalogContext(courses){
  // include title and a short full description (trimmed) and any tags/prerequisites
  return courses.slice(0,40).map(c => {
    const title = c.title || 'Untitled Course';
    const desc = c.description ? c.description.replace(/\s+/g,' ').trim().slice(0,800) : '';
    const meta = [];
    if(c.prerequisites) meta.push(`Prerequisitos: ${c.prerequisites}`);
    if(c.duration) meta.push(`Duração: ${c.duration}`);
    if(c.keywords) meta.push(`Palavras-chave: ${Array.isArray(c.keywords)?c.keywords.join(', '):c.keywords}`);
    const metaText = meta.length ? ` (${meta.join(' | ')})` : '';
    return `- ${title}${metaText}${desc ? ' — ' + desc : ''}`;
  }).join('\n');
}

// --- Retrieval helpers (load precomputed vectors if available) ---
let VECTOR_STORE = null;
function loadVectors(){
  try{
    const p = path.join(__dirname, 'vectors.json');
    if(!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p,'utf8');
    const arr = JSON.parse(raw);
    VECTOR_STORE = arr.filter(x=> x.embedding && Array.isArray(x.embedding));
    console.log('Loaded', VECTOR_STORE.length, 'vector chunks');
    return VECTOR_STORE;
  }catch(e){ console.error('loadVectors error', e.message); return null; }
}

async function embedQuery(text){
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_API_URL = process.env.GEMINI_API_URL;
  const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'textembedding-gecko-001';
  if(!GEMINI_API_KEY || !GEMINI_API_URL) return null;
  let url = GEMINI_API_URL;
  if(url && !url.includes('/v')) url = url.replace(/\/+$/,'') + `/v1/models/${EMBED_MODEL}:embedText`;
  try{
    const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${GEMINI_API_KEY}` }, body: JSON.stringify({ input: text }) });
    if(!r.ok){ const t = await r.text(); console.error('embedQuery upstream error', r.status, t); return null; }
    const j = await r.json();
    if(j.data && Array.isArray(j.data) && j.data[0] && j.data[0].embedding) return j.data[0].embedding;
    if(j.embedding) return j.embedding;
    if(j.embeddings && j.embeddings[0]) return j.embeddings[0];
    return null;
  }catch(e){ console.error('embedQuery error', e.message); return null; }
}

function dot(a,b){ let s=0; for(let i=0;i<a.length;i++) s+= (a[i]||0)*(b[i]||0); return s; }
function norm(a){ return Math.sqrt(a.reduce((s,v)=>s+(v||0)*(v||0),0)); }
function cosine(a,b){ const n = norm(a)*norm(b) + 1e-12; return dot(a,b)/n; }

async function retrieveTopK(query, k=3){
  try{
    if(!VECTOR_STORE) loadVectors();
    if(!VECTOR_STORE || VECTOR_STORE.length===0) return [];
    const qEmb = await embedQuery(query);
    if(!qEmb) return [];
    const scored = VECTOR_STORE.map(v=> ({ score: cosine(qEmb, v.embedding), item: v }));
    scored.sort((a,b)=> b.score - a.score);
    return scored.slice(0,k).map(s=> s.item);
  }catch(e){ console.error('retrieveTopK error', e.message); return []; }
}

app.post('/api/ai/courses', rateLimit, async (req, res) => {
  const { message } = req.body || {};
  if(!message) return res.status(400).json({ error: 'missing_message' });

  const courses = loadCatalog();
  const query = (message || '').toLowerCase();
  // quick local matching: token match and keyword mapping (avoid unnecessary LLM calls)
  function findLocalMatches(q, courses){
    if(!q) return [];
    const kws = ['excel','informática','informatica','office','planilha','planilhas'];
    const related = {
      'excel': ['inform', 'informatica', 'informática', 'office', 'planilha', 'planilhas', 'software'],
      'informatica': ['inform', 'office', 'software', 'planilha']
    };
    const matches = [];
    const qWords = q.split(/\W+/).filter(w=>w.length>2);
    for(const c of courses){
      const title = (c.title||'').toLowerCase();
      const desc = (c.description||'').toLowerCase();
      // keyword direct match
      const hasKeyword = kws.some(k=> q.includes(k) && (title.includes(k) || desc.includes(k)) );
      // related keyword match: if query mentions 'excel' we may match courses about informática
      const relatedMatch = kws.some(k=> q.includes(k) && related[k] && related[k].some(r=> title.includes(r) || desc.includes(r)) );
      // word intersection
      const intersection = qWords.filter(w=> title.includes(w) || desc.includes(w));
      if(hasKeyword || relatedMatch || intersection.length>0){
        // one-line summary (first paragraph or first 120 chars)
        const summary = (c.description||'').split('\n\n')[0].slice(0,160);
        matches.push({ id: c.id, title: c.title, summary });
      }
    }
    return matches;
  }
  const localMatches = findLocalMatches(query, courses);
  if(localMatches.length){
    const lines = localMatches.map(m=> `• ${m.title}: ${m.summary}`);
    const reply = `Encontrei os seguintes cursos no catálogo:\n${lines.join('\n')}`;
    return res.json({ reply });
  }
  // Try retrieval from vector store (RAG)
  let retrievalContext = '';
  try{
    const hits = await retrieveTopK(message, 4);
    if(hits && hits.length){
      retrievalContext = hits.map((h, idx) => `[${idx+1}] ${h.title} (${h.courseId||'n/a'}): ${h.text.slice(0,400).replace(/\n/g,' ')} ...`).join('\n\n');
    }
  }catch(e){ console.error('retrieval failed', e.message); }

  const context = buildCatalogContext(courses);

  // Build prompt: prefer retrieved chunks if present, otherwise the catalog summary
  const prompt = `You are a Course Assistant for the Work Talents site. Use ONLY the provided context to answer user questions about courses, availability, prerequisites, duration, and descriptions. If the question asks for matching courses, list relevant course titles and a one-line summary for each. If the question is unrelated to the context, reply: "Desculpe, não tenho essa informação."\n\n` +
    (retrievalContext ? `Retrieved context:\n${retrievalContext}\n\n` : `Catalog:\n${context}\n\n`) +
    `User question: ${message}\n\nAnswer in Portuguese, be concise and reference course titles when appropriate.`;

  // The proxy requires GEMINI_API_URL and GEMINI_API_KEY to be set in env
  const GEMINI_API_URL = process.env.GEMINI_API_URL;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if(!GEMINI_API_URL || !GEMINI_API_KEY) return res.status(500).json({ error: 'server_not_configured', message: 'GEMINI_API_URL or GEMINI_API_KEY missing in environment' });

  try{
    // Prefer calling Google Generative Language (Gemini) endpoint if GEMINI_API_URL points to generativelanguage
    const model = process.env.GEMINI_MODEL || 'text-bison-001';
    let upstreamUrl = GEMINI_API_URL;
    // If user provided only base host like https://generativelanguage.googleapis.com, build full path
    if(GEMINI_API_URL && (GEMINI_API_URL.indexOf('/v') === -1)){
      upstreamUrl = GEMINI_API_URL.replace(/\/+$/, '') + `/v1/models/${model}:generateText`;
    }

    const payload = { prompt: { text: prompt }, maxOutputTokens: 512 };
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if(!response.ok){
      const txt = await response.text();
      console.error('Upstream returned non-ok:', response.status, txt);
      return res.status(502).json({ error: 'upstream_error', status: response.status, details: txt });
    }
    const data = await response.json();

    // Helper to extract text from several common response shapes
    function extractText(obj){
      if(obj == null) return '';
      if(typeof obj === 'string') return obj;
      if(typeof obj === 'object'){
        // Google Generative API: { candidates: [{ output: '...' }] } or { candidates: [{content: [{text: '...'}]}] }
        if(Array.isArray(obj.candidates) && obj.candidates[0]){
          const cand = obj.candidates[0];
          if(typeof cand.output === 'string') return cand.output;
          if(cand.content && Array.isArray(cand.content)){
            // join text pieces
            return cand.content.map(p=> typeof p === 'string' ? p : (p.text || '')).join(' ');
          }
        }
        // OpenAI-like
        if(Array.isArray(obj.choices) && obj.choices[0]){
          const c = obj.choices[0];
          if(c.message && c.message.content) return c.message.content;
          if(typeof c.text === 'string') return c.text;
        }
        // common: obj.output.text
        if(obj.output){ if(typeof obj.output === 'string') return obj.output; if(typeof obj.output.text === 'string') return obj.output.text; }
        // fallback: find first string leaf
        const stack = [obj];
        while(stack.length){
          const cur = stack.shift();
          if(typeof cur === 'string') return cur;
          if(typeof cur === 'object'){
            for(const k of Object.keys(cur)) stack.push(cur[k]);
          }
        }
      }
      return '';
    }

    const text = extractText(data) || JSON.stringify(data);
    return res.json({ reply: String(text) });
  }catch(err){
    console.error('AI proxy error', err);
    return res.status(502).json({ error: 'proxy_error', message: err.message });
  }
});

// Simple search endpoint for frontend consumption
app.get('/api/courses/search', (req, res) => {
  try{
    const q = (req.query.q || '').toLowerCase().trim();
    const courses = loadCatalog();
    if(!q) return res.json({ results: [] });

    // reuse local matching logic (lightweight)
    function localMatch(q, courses){
      const kws = ['excel','informática','informatica','office','planilha','planilhas','financeiro','logistica','liderança','lideranca'];
      const related = {
        'excel': ['inform', 'informatica', 'informática', 'office', 'planilha', 'planilhas', 'software'],
        'informatica': ['inform', 'office', 'software', 'planilha']
      };
      const qWords = q.split(/\W+/).filter(w=>w.length>2);
      const matches = [];
      for(const c of courses){
        const title = (c.title||'').toLowerCase();
        const desc = (c.description||'').toLowerCase();
        const hasKeyword = kws.some(k=> q.includes(k) && (title.includes(k) || desc.includes(k)) );
        const relatedMatch = kws.some(k=> q.includes(k) && related[k] && related[k].some(r=> title.includes(r) || desc.includes(r)) );
        const intersection = qWords.filter(w=> title.includes(w) || desc.includes(w));
        if(hasKeyword || relatedMatch || intersection.length>0){
          const summary = (c.description||'').split('\n\n')[0].slice(0,160);
          matches.push({ id: c.id, title: c.title, summary });
        }
      }
      return matches;
    }

    const results = localMatch(q, courses);
    return res.json({ results });
  }catch(err){
    console.error('search error', err);
    return res.status(500).json({ error: 'search_error' });
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, ()=>{
  console.log(`AI proxy listening on http://localhost:${PORT}`);
});
