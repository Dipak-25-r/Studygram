/* ============================================================
   storage.js — tiny offline "database" on top of localStorage
   Every collection is a JSON array stored under one key.
   This is the ONLY file that touches localStorage directly.
   ============================================================ */

const DB_KEYS = {
  users: 'sh_users',
  session: 'sh_session',
  posts: 'sh_posts',
  comments: 'sh_comments',
  classrooms: 'sh_classrooms',
  classroomMembers: 'sh_classroom_members',
  quizzes: 'sh_quizzes',
  quizAttempts: 'sh_quiz_attempts',
  chats: 'sh_chats',
  unlocks: 'sh_unlocks', // paid-content unlock records
  seeded: 'sh_seeded_v1'
};

const DB = {
  _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('DB read failed for', key, e);
      return [];
    }
  },
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB write failed for', key, e);
      toast('Storage full or unavailable. Free up space and retry.', 'error');
      return false;
    }
  },

  // Generic collection helpers
  all(key) { return this._read(key); },
  save(key, arr) { return this._write(key, arr); },

  insert(key, item) {
    const arr = this._read(key);
    arr.push(item);
    this._write(key, arr);
    return item;
  },
  update(key, id, patch) {
    const arr = this._read(key);
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return null;
    arr[idx] = { ...arr[idx], ...patch };
    this._write(key, arr);
    return arr[idx];
  },
  remove(key, id) {
    const arr = this._read(key).filter(x => x.id !== id);
    this._write(key, arr);
  },
  find(key, id) {
    return this._read(key).find(x => x.id === id) || null;
  },

  // Session (single object, not array)
  getSession() {
    try {
      const raw = localStorage.getItem(DB_KEYS.session);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setSession(userId) {
    localStorage.setItem(DB_KEYS.session, JSON.stringify({ userId, since: Date.now() }));
  },
  clearSession() {
    localStorage.removeItem(DB_KEYS.session);
  }
};

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO() { return new Date().toISOString(); }

/* Small global toast/notification utility used across all modules */
function toast(message, type = 'info', duration = 3000) {
  const host = document.getElementById('toast-host');
  if (!host) { console.log(`[${type}] ${message}`); return; }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
