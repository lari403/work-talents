// UI augmentation for course items: adds Edit/Delete buttons and handlers
// Temporariamente desativa a UI de editar/remover cursos
(function(){
  const ENABLE_EDIT = false;
  if(!ENABLE_EDIT){
    console.info('Course edit UI disabled');
    return;
  }
  function ensureActions(li){
    if(!li) return;
    const id = li.dataset.id;
    if(!id) return;
    // don't add twice
    if(li.querySelector('.btn-edit')) return;

    const actions = li.querySelector('.course-actions') || (function(){ const a=document.createElement('div'); a.className='course-actions'; li.appendChild(a); return a; })();

    const editBtn = document.createElement('button'); editBtn.textContent='Editar'; editBtn.className='btn-small btn-ghost btn-edit';
    editBtn.onclick = function(){
      // open modal and populate
      const modal = document.getElementById('courseModal');
      const titleEl = document.getElementById('modalCourseTitle');
      const inputTitle = document.getElementById('modalCourseTitle') ? document.getElementById('modalCourseTitle') : null;
      const fieldTitle = document.getElementById('modalCourseTitle');
      const fieldInput = document.getElementById('modalCourseTitle');
      // populate values
      const currentTitle = li.querySelector('.course-item-title')?.textContent || '';
      const currentDesc = li.querySelector('div[style]')?.textContent || '';
      const currentStatus = li.querySelector('.course-item-meta')?.textContent.includes('published') ? 'published' : (li.querySelector('.course-item-meta')?.textContent.includes('draft') ? 'draft' : 'published');
      document.getElementById('modalCourseTitle').value = currentTitle;
      document.getElementById('modalCourseDesc').value = currentDesc;
      document.getElementById('modalCourseStatus').value = currentStatus;
      document.getElementById('modalCourseId').value = id;
      modal.classList.remove('hidden');

      const saveBtn = document.getElementById('modalSave');
      const cancelBtn = document.getElementById('modalCancel');

      // ensure previous handlers removed
      saveBtn.onclick = null;
      cancelBtn.onclick = null;

      saveBtn.onclick = async function(){
        const title = document.getElementById('modalCourseTitle').value.trim();
        const desc = document.getElementById('modalCourseDesc').value.trim();
        const status = document.getElementById('modalCourseStatus').value;
        try{
          if(window.__CM_courses && typeof window.__CM_courses.updateLocalCourse === 'function'){
            window.__CM_courses.updateLocalCourse(id, { title, description: desc, status });
          } else {
            const list = JSON.parse(localStorage.getItem('cm_demo_courses')||'[]');
            const idx = list.findIndex(c=>String(c.id) === String(id)); if(idx!==-1){ list[idx] = Object.assign({}, list[idx], { title, description: desc, status }); localStorage.setItem('cm_demo_courses', JSON.stringify(list)); }
          }
          modal.classList.add('hidden');
          if(typeof loadCourses === 'function') loadCourses();
        }catch(e){ alert('Erro ao editar: '+e.message) }
      };

      cancelBtn.onclick = function(){ modal.classList.add('hidden'); };
    };

    const delBtn = document.createElement('button'); delBtn.textContent='Remover'; delBtn.className='btn-small delete';
    delBtn.onclick = function(){
      if(!confirm('Remover este curso?')) return;
      try{
        if(window.__CM_courses && typeof window.__CM_courses.deleteLocalCourse === 'function'){
          window.__CM_courses.deleteLocalCourse(id);
        } else {
          const list = JSON.parse(localStorage.getItem('cm_demo_courses')||'[]');
          const idx = list.findIndex(c=>String(c.id) === String(id)); if(idx!==-1){ list.splice(idx,1); localStorage.setItem('cm_demo_courses', JSON.stringify(list)); }
        }
        if(typeof loadCourses === 'function') loadCourses();
      }catch(e){ alert('Erro ao remover: '+e.message) }
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
  }

  function observeList(){
    const ul = document.getElementById('coursesList');
    if(!ul) return;
    // augment existing items
    ul.querySelectorAll('li').forEach(ensureActions);
    // observe future additions
    const obs = new MutationObserver((mut)=>{ mut.forEach(m=>{ m.addedNodes.forEach(n=>{ if(n.nodeType===1 && n.tagName==='LI') ensureActions(n); }) }) });
    obs.observe(ul, { childList:true, subtree:false });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeList);
  else observeList();
})();
