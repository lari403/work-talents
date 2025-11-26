(function(){
  // Simple floating chat widget for Course Assistant
  const css = `
  .ai-widget-btn{position:fixed;right:18px;bottom:18px;background:linear-gradient(90deg,#8b2bb7,#351240);color:#fff;border:none;border-radius:999px;padding:14px 18px;cursor:pointer;box-shadow:0 18px 40px rgba(55,15,70,0.18);z-index:2000}
  .ai-panel{position:fixed;right:18px;bottom:80px;width:360px;max-width:92%;height:480px;background:#fff;border-radius:12px;box-shadow:0 30px 80px rgba(15,23,42,0.18);z-index:2000;display:flex;flex-direction:column;overflow:hidden}
  .ai-panel .header{padding:12px 14px;background:linear-gradient(90deg,#ec3a8a,#8b2bb7);color:#fff;font-weight:700}
  .ai-panel .messages{flex:1;padding:12px;overflow:auto;background:#fff}
  .ai-panel .composer{padding:10px;border-top:1px solid #f3f3f6;display:flex;gap:8px}
  .ai-panel textarea{flex:1;padding:10px;border-radius:8px;border:1px solid #e8e8ef}
  .ai-msg{margin-bottom:10px}
  .ai-msg.user{text-align:right}
  .ai-msg .bubble{display:inline-block;padding:8px 12px;border-radius:10px;max-width:80%}
  .ai-msg.user .bubble{background:linear-gradient(90deg,#8b2bb7,#351240);color:#fff}
  .ai-msg.bot .bubble{background:#f3f0fb;color:#1f2937}
  .ai-search-result{border:1px solid #eee;border-radius:8px;padding:10px;margin:8px 0;background:#fff}
  .ai-search-result .title{font-weight:700;color:#5b1071;margin-bottom:6px}
  .ai-search-result .summary{color:#444;font-size:13px}
  .ai-search-actions{margin-top:8px;display:flex;gap:8px}
  .ai-search-actions button{background:linear-gradient(90deg,#8b2bb7,#ec3a8a);color:#fff;border:none;padding:6px 10px;border-radius:8px;cursor:pointer}
  .ai-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:10px;box-shadow:0 30px 80px rgba(15,23,42,0.2);z-index:3000;max-width:600px;width:90%;max-height:80%;overflow:auto}
  .ai-modal .head{padding:12px 16px;background:linear-gradient(90deg,#ec3a8a,#8b2bb7);color:#fff;font-weight:700;border-top-left-radius:10px;border-top-right-radius:10px}
  .ai-modal .body{padding:12px 16px;color:#222}
  .ai-modal .close{position:absolute;right:12px;top:12px;background:transparent;border:none;color:#fff;font-weight:700;cursor:pointer}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // API base: use localhost when developing locally, otherwise use the production backend
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:4000' : 'https://worktalents-backend.onrender.com';

  const btn = document.createElement('button'); btn.className='ai-widget-btn'; btn.textContent='Assistente'; document.body.appendChild(btn);
  const panel = document.createElement('div'); panel.className='ai-panel'; panel.style.display='none';
  panel.innerHTML = `<div class="header">Assistente de Cursos</div><div class="messages" id="aiMessages"></div><div class="composer"><textarea id="aiInput" rows="2" placeholder="Pergunte sobre cursos..."></textarea><button id="aiSend">Enviar</button></div>`;
  document.body.appendChild(panel);

  btn.addEventListener('click', ()=>{ panel.style.display = panel.style.display==='none' ? 'flex' : 'none'; document.getElementById('aiInput').focus(); });
  const messagesEl = panel.querySelector('#aiMessages');
  const input = panel.querySelector('#aiInput');
  const send = panel.querySelector('#aiSend');

  function appendMsg(who, text){ const div = document.createElement('div'); div.className = 'ai-msg '+(who==='user'?'user':'bot'); const b = document.createElement('div'); b.className='bubble'; b.textContent = text; div.appendChild(b); messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight; }

  function findAndScrollToCourse(title){
    if(!title) return false;
    const norm = title.trim().toLowerCase();
    // try to find elements that match course title
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span'));
    for(const el of candidates){
      if(!el.textContent) continue;
      const txt = el.textContent.trim().toLowerCase();
      if(txt === norm || txt.includes(norm) || norm.includes(txt)){
        try{ el.scrollIntoView({behavior:'smooth', block:'center'}); el.style.outline = '3px solid rgba(139,43,183,0.25)'; setTimeout(()=>{ el.style.outline=''; },3000); return true; }catch(e){}
      }
    }
    return false;
  }

  function showModal(title, body){
    const prev = document.querySelector('.ai-modal'); if(prev) prev.remove();
    const modal = document.createElement('div'); modal.className='ai-modal';
    const head = document.createElement('div'); head.className='head'; head.textContent = title || 'Detalhes';
    const close = document.createElement('button'); close.className='close'; close.textContent='×'; close.addEventListener('click', ()=> modal.remove()); head.appendChild(close);
    const b = document.createElement('div'); b.className='body'; b.textContent = body || '';
    modal.appendChild(head); modal.appendChild(b); document.body.appendChild(modal);
  }

  function isSearchQuery(text){
    if(!text) return false;
    const s = text.toLowerCase();
    const patterns = ['quais cursos','quais os cursos','tem curso','existe curso','tem cursos','quais cursos existem','curso de','tem curso de','onde tem curso','buscar curso'];
    for(const p of patterns) if(s.includes(p)) return true;
    // if it mentions common keywords, treat as search
    const kws = ['excel','informática','informatica','office','planilha','finanças','financas','logistica','liderança','lideranca','comunicação'];
    for(const k of kws) if(s.includes(k)) return true;
    return false;
  }

  async function sendMessage(){ const text = input.value.trim(); if(!text) return; appendMsg('user', text); input.value=''; appendMsg('bot','...');
    try{
      // If this looks like a user search (e.g. "Quais cursos sobre Excel?"), call the lightweight search endpoint first
      if(isSearchQuery(text)){
        try{
          const sr = await fetch(API_BASE + '/api/courses/search?q='+encodeURIComponent(text));
          const sj = await sr.json();
          const last = Array.from(messagesEl.querySelectorAll('.ai-msg.bot')).pop();
          if(!sr.ok){ if(last) last.querySelector('.bubble').textContent = 'Erro: ' + (sj.error || 'falha na busca'); return; }
          if(sj.results && sj.results.length){
            if(last) last.querySelector('.bubble').style.display='none';
            for(const r of sj.results){
              const res = document.createElement('div'); res.className='ai-search-result';
              const t = document.createElement('div'); t.className='title'; t.textContent = r.title; res.appendChild(t);
              const s = document.createElement('div'); s.className='summary'; s.textContent = r.summary; res.appendChild(s);
              const actions = document.createElement('div'); actions.className='ai-search-actions';
              const more = document.createElement('button'); more.textContent='Saber mais';
              more.addEventListener('click', ()=>{
                if(!findAndScrollToCourse(r.title)){
                  showModal(r.title, r.summary);
                }
              });
              const enroll = document.createElement('button'); enroll.textContent='Saber e inscrever';
              enroll.addEventListener('click', ()=>{
                if(!findAndScrollToCourse(r.title)){
                  showModal(r.title, r.summary);
                }
              });
              actions.appendChild(more); actions.appendChild(enroll);
              res.appendChild(actions);
              messagesEl.appendChild(res);
            }
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return;
          } else {
            if(last) last.querySelector('.bubble').textContent = 'Nenhum curso encontrado no catálogo.';
            return;
          }
        }catch(err){ const last = Array.from(messagesEl.querySelectorAll('.ai-msg.bot')).pop(); if(last) last.querySelector('.bubble').textContent = 'Erro de conexão (busca)'; return; }
      }

      // Fallback: send to AI proxy
      const r = await fetch(API_BASE + '/api/ai/courses', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: text }) });
      const j = await r.json(); const last = Array.from(messagesEl.querySelectorAll('.ai-msg.bot')).pop(); if(!r.ok){ if(last) last.querySelector('.bubble').textContent = 'Erro: ' + (j.error || 'falha'); return; } if(last) last.querySelector('.bubble').textContent = j.reply || 'Sem resposta';
    }catch(e){ const last = Array.from(messagesEl.querySelectorAll('.ai-msg.bot')).pop(); if(last) last.querySelector('.bubble').textContent = 'Erro de conexão'; }
  }
  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } });
})();
