// Small utility helpers used by the page and tests
(function(global){
  function validateEmail(v){ return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // Provide a safe localStorage wrapper that falls back to an in-memory store when running in Node/Jest
  const _inMemoryStore = {};
  const _hasLocalStorage = (typeof localStorage !== 'undefined');
  function ls_get(key, def){
    try{
      if(_hasLocalStorage) return JSON.parse(localStorage.getItem(key) || JSON.stringify(def));
      const v = _inMemoryStore[key];
      return (typeof v === 'undefined') ? def : JSON.parse(v);
    }catch(e){ return def }
  }
  function ls_set(key, val){
    if(_hasLocalStorage) return localStorage.setItem(key, JSON.stringify(val));
    _inMemoryStore[key] = JSON.stringify(val);
  }

  // Export to window for browser
  global.__CM_utils = global.__CM_utils || {};
  global.__CM_utils.validateEmail = validateEmail;
  global.__CM_utils.ls_get = ls_get;
  global.__CM_utils.ls_set = ls_set;

  // Support CommonJS require in Jest/node
  if(typeof module !== 'undefined' && module.exports){
    module.exports = { validateEmail, ls_get, ls_set };
  }
})(typeof window !== 'undefined' ? window : global);
