// Course utilities: filtering and seeding helpers
(function(global){
  // helpers to access ls_get/ls_set from utils in both browser and Node
  const _hasRequire = (typeof require !== 'undefined') && (typeof module !== 'undefined') && module.exports;
  let _nodeUtils = null;
  if(_hasRequire){
    try{ _nodeUtils = require('./utils'); }catch(e){ /* ignore */ }
  }
  function _ls_get(key, def){
    if(typeof global !== 'undefined' && global.__CM_utils && typeof global.__CM_utils.ls_get === 'function') return global.__CM_utils.ls_get(key, def);
    if(_nodeUtils && typeof _nodeUtils.ls_get === 'function') return _nodeUtils.ls_get(key, def);
    if(typeof localStorage !== 'undefined'){
      try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }catch(e){}
    }
    return def;
  }
  function _ls_set(key, val){
    if(typeof global !== 'undefined' && global.__CM_utils && typeof global.__CM_utils.ls_set === 'function') return global.__CM_utils.ls_set(key, val);
    if(_nodeUtils && typeof _nodeUtils.ls_set === 'function') return _nodeUtils.ls_set(key, val);
    if(typeof localStorage !== 'undefined'){
      try{ return localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
    }
    // fallback: store in in-memory if available on node utils
    return;
  }
  function filterCourses(list, query, status){
    const q = (query||'').toLowerCase();
    const s = status || 'all';
    return (list||[]).filter(c=>{
      if(s !== 'all' && ( (c.status||'draft') !== s)) return false;
      if(!q) return true;
      return ((c.title||'') + ' ' + (c.description||'')).toLowerCase().includes(q);
    });
  }

  // seedGestorIfMissing(users, hashFn) => returns new array with gestor added if not present
  // hashFn should be async and accept a password string
  async function seedGestorIfMissing(users, hashFn){
    users = Array.isArray(users) ? users.slice() : [];
    if(users.find(u=>u.role==='gestor')) return users;
    const pw = 'Gestor@123';
    const hash = (typeof hashFn === 'function') ? await hashFn(pw) : 'seeded-hash';
  const gestor = { id: Date.now(), name: 'Gestor Exemplo', email: 'gestor@worktalents', role: 'gestor', passwordHash: hash };
    users.push(gestor);
    return users;
  }

  // Local CRUD for demo courses (used when API unavailable)
  function _getLocalCourses(){
    return _ls_get('cm_demo_courses', []);
  }
  function _saveLocalCourses(list){
    _ls_set('cm_demo_courses', list || []);
  }

  function createLocalCourse(payload){
    const list = _getLocalCourses();
    const item = Object.assign({ id: Date.now() }, payload);
    list.push(item);
    _saveLocalCourses(list);
    return item;
  }

  function updateLocalCourse(id, payload){
    const list = _getLocalCourses();
    const idx = list.findIndex(c=>String(c.id) === String(id));
    if(idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], payload);
    _saveLocalCourses(list);
    return list[idx];
  }

  function deleteLocalCourse(id){
    const list = _getLocalCourses();
    const idx = list.findIndex(c=>String(c.id) === String(id));
    if(idx === -1) return false;
    list.splice(idx,1);
    _saveLocalCourses(list);
    return true;
  }

  // export
  global.__CM_courses = global.__CM_courses || {};
  global.__CM_courses.filterCourses = filterCourses;
  global.__CM_courses.seedGestorIfMissing = seedGestorIfMissing;

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { filterCourses, seedGestorIfMissing, createLocalCourse, updateLocalCourse, deleteLocalCourse };
  }
})(typeof window !== 'undefined' ? window : global);
