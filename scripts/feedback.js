(function(){
  const API_FEEDBACK = 'http://localhost:3000/feedback';

  function el(id){ return document.getElementById(id); }

  function validateEmail(v){ return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // accept optional course title to provide context
  function openModal(course){ const modal = el('feedbackModal'); if(!modal) return; modal.classList.remove('hidden'); modal.dataset.course = course || ''; el('fbMsg').textContent='';
    const h = modal.querySelector('h3'); if(h) h.textContent = 'Enviar Feedback' + (course ? ' — ' + course : ''); }
  function closeModal(){ el('feedbackModal').classList.add('hidden'); }

  async function submitFeedback(){
    const name = el('fbName').value.trim();
    const email = el('fbEmail').value.trim();
    const message = el('fbMessage').value.trim();
    const rating = el('fbRating').value;
    const msgEl = el('fbMsg');

    msgEl.textContent=''; msgEl.className='feedback-msg';
    if(!message || message.length < 10){ msgEl.textContent='A mensagem deve ter ao menos 10 caracteres.'; msgEl.classList.add('error'); return; }
    if(email && !validateEmail(email)){ msgEl.textContent='Email inválido.'; msgEl.classList.add('error'); return; }

  const payload = { name: name||null, email: email||null, message, rating: Number(rating), createdAt: new Date().toISOString(), course: el('feedbackModal')?.dataset?.course || null };

    // try API
    try{
      const res = await fetch(API_FEEDBACK, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      if(res.ok){ msgEl.textContent='Obrigado! Feedback enviado.'; msgEl.classList.add('success'); clearForm(); setTimeout(closeModal,1200); return; }
      throw new Error('api');
    }catch(e){
      // fallback to localStorage
      try{
        const list = JSON.parse(localStorage.getItem('cm_feedbacks') || '[]');
        list.push(payload);
        localStorage.setItem('cm_feedbacks', JSON.stringify(list));
        msgEl.textContent='Feedback salvo localmente e será enviado quando a API ficar disponível.'; msgEl.classList.add('success'); clearForm(); setTimeout(closeModal,1400); return;
      }catch(err){ msgEl.textContent='Falha ao registrar feedback.'; msgEl.classList.add('error'); }
    }
  }

  function clearForm(){ el('fbName').value=''; el('fbEmail').value=''; el('fbMessage').value=''; el('fbRating').value='5'; }

  document.addEventListener('DOMContentLoaded', ()=>{
    const cancel = el('fbCancel');
    if(cancel) cancel.addEventListener('click', closeModal);
    // support Escape to close
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ closeModal(); } });
    // expose for manual call
    window.__CM_feedback = { submitFeedback, openModal, closeModal };
  });
})();
