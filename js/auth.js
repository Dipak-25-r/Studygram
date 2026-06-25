/* ============================================================
   auth.js — registration, login, session, XP & levels
   Passwords are hashed with a simple SHA-256 (Web Crypto) before
   storage. This is a demo app, not a security product — for a
   real deployment, use a real backend with proper auth.
   ============================================================ */

const Auth = {
  async hash(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  currentUser() {
    const session = DB.getSession();
    if (!session) return null;
    return DB.find(DB_KEYS.users, session.userId);
  },

  isLoggedIn() { return !!this.currentUser(); },

  async register({ name, email, password, role, location= "India" }) {
    const users = DB.all(DB_KEYS.users);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const passwordHash = await this.hash(password);
    const user = {
      id: uid('user'),
      name, email, role, location, passwordHash,
      avatarColor: ['#7c3aed', '#06b6d4', '#ec4899', '#22c55e', '#f59e0b'][Math.floor(Math.random() * 5)],
      followers: [],
      following: [],
      saved: [],
      xp: 0,
      level: 1,
      createdAt: nowISO()
    };
    DB.insert(DB_KEYS.users, user);

try {
  await CloudSync.syncUserUp(user);
} catch (e) {
  console.log("Sync failed:", e);
}

DB.setSession(user.id);
     // fire-and-forget; local registration already succeeded
    return user;
  },

  async login({ email, password }) {
    const users = DB.all(DB_KEYS.users);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No account found with that email.');
    const passwordHash = await this.hash(password);
    if (passwordHash !== user.passwordHash) throw new Error('Incorrect password.');
    DB.setSession(user.id);
    await CloudSync.pullUserDown(user.id);
    CloudSync.pullPostsDown();
    return user;
  },

  logout() {
    DB.clearSession();
  },

  /** Award XP and auto level-up. 100 XP per level, scaling. */
  awardXP(amount, reason = '') {
    const user = this.currentUser();
    if (!user) return;
    const newXP = user.xp + amount;
    const newLevel = Math.floor(newXP / 100) + 1;
    const leveledUp = newLevel > user.level;
    DB.update(DB_KEYS.users, user.id, { xp: newXP, level: newLevel });
    if (leveledUp) {
      toast(`🎉 Level up! You're now Level ${newLevel}`, 'success', 4000);
    } else if (reason) {
      toast(`+${amount} XP — ${reason}`, 'success', 1800);
    }
  },

  requireLogin() {
    if (!this.isLoggedIn()) {
      Router.go('auth');
      toast('Please log in to continue.', 'error');
      return false;
    }
    return true;
  }
};
