(function(){
  // Simple placement test: 5 questions, multiple choice. Stores result in localStorage key 'cm_placement'
  const KEY = 'cm_placement';
  const el = id => document.getElementById(id);

  const questions = [
    { q: 'Você já trabalhou com ferramentas digitais básicas (e-mail, navegação, copiar/colar)?',
      choices: ['Não conhece', 'Conhece o básico', 'Sou confortável usando'], points: [0,1,2] },
    { q: 'Você consegue interpretar instruções escritas e seguir passos técnicos simples?',
      choices: ['Tenho dificuldade', 'Consigo com alguma ajuda', 'Consigo sozinho'], points: [0,1,2] },
    { q: 'Ao aprender algo novo, você prefere: ',
      choices: ['Que mostrem passo a passo', 'Um breve guia e praticar', 'Ler documentação/experimentar sozinho'], points: [0,1,2] },
    { q: 'Como avalia sua leitura e escrita formal (emails, relatórios simples)?',
      choices: ['Preciso melhorar bastante', 'Funciona para tarefas básicas', 'Sou confiante e claro'], points: [0,1,2] },
    { q: 'Você já participou de cursos online (vídeo + exercícios)?',
      choices: ['Nunca', 'Algumas vezes', 'Frequentemente'], points: [0,1,2] }
  ];

  // accept optional course title to provide context
  function openModal(course){ const modal = el('placementModal'); if(!modal) return; modal.classList.remove('hidden'); modal.dataset.course = course || ''; renderStart(); }
  function closeModal(){ const modal = el('placementModal'); if(modal) modal.classList.add('hidden'); }

  function renderStart(){ const c = el('placementContent'); c.innerHTML = '';
    const p = document.createElement('p'); p.textContent = 'Este teste rápido ajuda a identificar um nível sugerido para os cursos. São 5 perguntas.'; c.appendChild(p);
    // show which course this placement is for, if any
    const modal = el('placementModal'); if(modal && modal.dataset && modal.dataset.course){ const info = document.createElement('div'); info.style.marginTop='8px'; info.innerHTML = `<strong>Curso:</strong> ${modal.dataset.course}`; c.appendChild(info); }
    // show any previous result
    const prev = loadResult(); if(prev){ const s=document.createElement('div'); s.style.marginTop='8px'; s.innerHTML = `<strong>Último resultado:</strong> ${prev.level} (pontuação ${prev.score}) — ${new Date(prev.at).toLocaleString()}`; c.appendChild(s); }
    // hide result area
    el('placementResult').classList.add('hidden');
    // start button visible
    el('placementStart').classList.remove('hidden');
  }

  function renderQuestions(){ const c = el('placementContent'); c.innerHTML='';
    const form = document.createElement('form'); form.id='placementForm';
    questions.forEach((it,idx)=>{
      const div = document.createElement('div'); div.style.marginBottom='12px';
      const q = document.createElement('div'); q.style.fontWeight='600'; q.textContent = `${idx+1}. ${it.q}`; div.appendChild(q);
      const ul = document.createElement('div'); ul.style.display='grid'; ul.style.gap='6px'; ul.style.marginTop='6px';
      it.choices.forEach((choice,i)=>{
        const label = document.createElement('label'); label.style.display='flex'; label.style.alignItems='center'; label.style.gap='8px';
        const input = document.createElement('input'); input.type='radio'; input.name = 'q'+idx; input.value = i; label.appendChild(input);
        const span = document.createElement('span'); span.textContent = choice; label.appendChild(span);
        ul.appendChild(label);
      });
      div.appendChild(ul);
      form.appendChild(div);
    });
    // submit button
    const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='flex-end'; row.style.gap='8px';
    const cancel = document.createElement('button'); cancel.type='button'; cancel.className='btn-ghost'; cancel.textContent='Cancelar'; cancel.addEventListener('click', closeModal);
    const submit = document.createElement('button'); submit.type='submit'; submit.className='btn-small'; submit.textContent='Enviar';
    row.appendChild(cancel); row.appendChild(submit);
    form.appendChild(row);
    form.addEventListener('submit', onSubmit);
    c.appendChild(form);
    // hide start button
    el('placementStart').classList.add('hidden');
  }

  function onSubmit(e){ e.preventDefault(); const fm = document.getElementById('placementForm');
    let total = 0; for(let i=0;i<questions.length;i++){ const v = fm['q'+i].value; if(v==null || v===''){ alert('Por favor responda todas as perguntas.'); return; } const p = questions[i].points[Number(v)] || 0; total += p; }
    // score: 0-10
    let level = 'Iniciante'; if(total <= 3) level='Iniciante'; else if(total <= 7) level='Intermediário'; else level='Avançado';
    const result = { score: total, level, at: new Date().toISOString() };
    saveResult(result);
    showResult(result);
  }

  function showResult(res){ const out = el('placementResult'); out.classList.remove('hidden'); out.innerHTML = `<div><strong>Nível sugerido:</strong> ${res.level}</div><div style="margin-top:6px">Pontuação: ${res.score} de ${questions.length*2}</div><div style="margin-top:6px">Salvo localmente em seu navegador.</div>`;
    // offer quick filter: if user wants to filter courses by level, provide buttons
    const btnRow = document.createElement('div'); btnRow.style.display='flex'; btnRow.style.gap='8px'; btnRow.style.marginTop='8px';
    const apply = document.createElement('button'); apply.className='btn-small'; apply.textContent='Mostrar cursos sugeridos'; apply.addEventListener('click', ()=>applySuggestion(res.level));
    btnRow.appendChild(apply);
    out.appendChild(btnRow);
  }

  function applySuggestion(level){ // naive mapping: try to filter course titles by keywords
    // set a global level filter (index.html uses CURRENT_LEVEL_FILTER when rendering)
    try{ window.CURRENT_LEVEL_FILTER = level; }catch(e){}
    // call applyCourseFilters to refresh course list
    try{ if(typeof applyCourseFilters === 'function'){ applyCourseFilters(); } }
    catch(e){}
    alert(`Aplicado filtro por sugestão: ${level}. Use o campo de busca ou clique em 'Mostrar cursos sugeridos' novamente para ajustar.`);
  }

  function saveResult(r){ try{ localStorage.setItem(KEY, JSON.stringify(r)); }catch(e){} }
  function loadResult(){ try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){return null} }

  document.addEventListener('DOMContentLoaded', ()=>{
    const start = el('placementStart'); const cancel = el('placementCancel');
    if(start) start.addEventListener('click', renderQuestions);
    if(cancel) cancel.addEventListener('click', closeModal);
    // expose API
    window.__CM_placement = { openModal, closeModal, loadResult };
    // on init, if there is a saved result, show it near courses list
    const prev = loadResult(); if(prev){ // inject display above course list
      const container = document.querySelector('#cursos'); if(container){ const badge = document.createElement('div'); badge.id='placementSummary'; badge.className='card'; badge.style.marginBottom='12px'; badge.innerHTML = `<strong>Último teste:</strong> ${prev.level} (pontuação ${prev.score}) — ${new Date(prev.at).toLocaleString()}`; container.insertBefore(badge, container.querySelector('.card').nextSibling); }
    }
  });
})();
