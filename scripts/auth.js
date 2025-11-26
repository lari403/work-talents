(function(global){
  // Lightweight auth helpers (local fallback)
  const utils = (typeof global !== 'undefined' && global.__CM_utils) ? global.__CM_utils : null;
  const _hasRequire = (typeof require !== 'undefined') && (typeof module !== 'undefined') && module.exports;
  let nodeUtils = null;
  if(_hasRequire){ try{ nodeUtils = require('./utils'); }catch(e){} }

  async function hashPassword(password){
    if(typeof crypto !== 'undefined' && crypto.subtle){
      const enc = new TextEncoder(); const data = enc.encode(password); const hashBuffer = await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    return 'noop-'+password;
  }

  function _ls_get(key, def){ if(utils && utils.ls_get) return utils.ls_get(key, def); if(nodeUtils && nodeUtils.ls_get) return nodeUtils.ls_get(key, def); try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }catch(e){ return def } }
  function _ls_set(key, val){ if(utils && utils.ls_set) return utils.ls_set(key, val); if(nodeUtils && nodeUtils.ls_set) return nodeUtils.ls_set(key, val); try{ return localStorage.setItem(key, JSON.stringify(val)); }catch(e){ return; } }

  function getUsersLocal(){ return _ls_get('cm_users', []); }
  function saveUsersLocal(list){ _ls_set('cm_users', list); }

  function setCurrentUser(user){ _ls_set('cm_current', user); if(typeof renderUserState === 'function') renderUserState(); }
  function getCurrentUser(){ return _ls_get('cm_current', null); }
  function logout(){ _ls_set('cm_current', null); if(typeof renderUserState === 'function') renderUserState(); }

  async function registerLocal({ name, email, password, gestorCode }){
    const users = getUsersLocal();
    const hashed = await hashPassword(password);
    const role = (gestorCode && gestorCode === 'CODIGO-GESTOR-2025') ? 'gestor' : 'user';
    if(users.find(u=>u.email===email)) throw new Error('Email já cadastrado');
    const newUser = { id: Date.now(), name, email, role, passwordHash: hashed };
    users.push(newUser); saveUsersLocal(users); setCurrentUser({ name, email, role }); return newUser;
  }

  async function loginLocal({ email, password }){
    const users = getUsersLocal();
    const user = users.find(u=>u.email===email);
    if(!user) throw new Error('Usuário não encontrado');
    const hashed = await hashPassword(password);
    if(hashed !== user.passwordHash) throw new Error('Senha incorreta');
    setCurrentUser({ name: user.name, email: user.email, role: user.role });
    return user;
  }

  global.__CM_auth = global.__CM_auth || {};
  global.__CM_auth.hashPassword = hashPassword;
  global.__CM_auth.getUsersLocal = getUsersLocal;
  global.__CM_auth.saveUsersLocal = saveUsersLocal;
  global.__CM_auth.registerLocal = registerLocal;
  global.__CM_auth.loginLocal = loginLocal;
  global.__CM_auth.setCurrentUser = setCurrentUser;
  global.__CM_auth.getCurrentUser = getCurrentUser;
  global.__CM_auth.logout = logout;

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { hashPassword, getUsersLocal, saveUsersLocal, registerLocal, loginLocal, setCurrentUser, getCurrentUser, logout };
  }
})(typeof window !== 'undefined' ? window : global);
