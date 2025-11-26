(function(){
  const API = 'http://localhost:3000';
  let lastUp = false;

  async function checkApi(){
    try{
      const res = await fetch(API + '/users?_limit=1');
      if(!res.ok) throw new Error('bad');
      setStatus(true);
    }catch(e){ setStatus(false); }
  }

  function setStatus(up){
    const el = document.getElementById('apiStatus');
    if(!el) return;
    lastUp = !!up;
    el.classList.toggle('up', !!up);
    el.classList.toggle('down', !up);
    el.querySelector('.label').textContent = up ? 'API: online' : 'API: offline';
    // when API becomes available, try to sync local items
    if(up) trySync();
  }

  async function trySync(){
    // demo course sync removed (demo courses were removed by user)

    // sync feedbacks
    try{
      const fb = JSON.parse(localStorage.getItem('cm_feedbacks')||'[]');
      if(Array.isArray(fb) && fb.length){
        for(const f of fb){
          try{ await fetch(API + '/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(f) }); }
          catch(e){ console.warn('feedback sync item failed', e); }
        }
        // clear local store after attempting
        localStorage.removeItem('cm_feedbacks');
      }
    }catch(e){ console.warn('sync feedbacks failed', e) }

    // sync users (only minimal: post users that don't exist by email)
    try{
      const localUsers = JSON.parse(localStorage.getItem('cm_users')||'[]');
      if(Array.isArray(localUsers) && localUsers.length){
        const res = await fetch(API + '/users');
        if(!res.ok) return;
        const remote = await res.json();
        const remoteEmails = new Set((remote||[]).map(r=>r.email));
        for(const u of localUsers){
          if(!remoteEmails.has(u.email)){
            await fetch(API + '/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(u) });
          }
        }
      }
    }catch(e){ console.warn('sync users failed', e) }

    // sync enrollments: push local-only enrollments to server and merge server state locally
    try{
      const localEnrolls = JSON.parse(localStorage.getItem('cm_enrollments')||'[]');
      // fetch remote enrollments
      const remRes = await fetch(API + '/enrollments');
      if(!remRes.ok) throw new Error('could not fetch remote enrollments');
      const remoteEnrolls = await remRes.json();

      // for each local-only enrollment, try to POST it
      for(const le of (localEnrolls||[])){
        try{
          if(le._localOnly){
            // avoid duplicate: check if remote has same courseId+email
            const exists = (remoteEnrolls||[]).some(r => r.courseId == le.courseId && r.user && le.user && r.user.email === le.user.email);
            if(!exists){
              const postRes = await fetch(API + '/enrollments', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ courseId: le.courseId, title: le.title, at: le.at, user: le.user }) });
              if(postRes.ok){ const saved = await postRes.json(); remoteEnrolls.push(saved); }
            }
          }
        }catch(pe){ console.warn('failed to push enrollment', pe) }
      }

      // merge remoteEnrolls into local store (overwrite local with remote canonical set)
      try{ localStorage.setItem('cm_enrollments', JSON.stringify(remoteEnrolls || [])); }catch(e){ console.warn('failed to write local enrollments', e) }
    }catch(e){ console.warn('sync enrollments failed', e) }

  }

  // initial and periodic check
  document.addEventListener('DOMContentLoaded', ()=>{
    checkApi();
    setInterval(checkApi, 5000);
  });
})();
