/* ============================================================
   firebase-sync.js — OPTIONAL cloud backend starter (DISABLED by default)
   ------------------------------------------------------------
   The app is fully functional offline using storage.js (localStorage).
   This file shows exactly how to layer Firebase on top for:
     - real multi-device user accounts (Firebase Auth)
     - cloud-synced posts/classrooms/quizzes (Firestore)
   It does NOT run unless you:
     1. Create a Firebase project → console.firebase.google.com
     2. Enable Authentication (Email/Password) + Firestore
     3. Paste your config below
     4. Set FIREBASE_ENABLED = true
     5. Add the Firebase SDK <script> tags in index.html (see README)
   ============================================================ */

const FIREBASE_ENABLED = true; // flip to true once configured

const firebaseConfig = {
    apiKey: "AIzaSyCKT_FT3GLzDVExG1GA-PKAwhsmQhHTzEo",
    authDomain: "studyhub-25.firebaseapp.com",
    projectId: "studyhub-25",
    storageBucket: "studyhub-25.firebasestorage.app",
    messagingSenderId: "706963807276",
    appId: "1:706963807276:web:a33567d3e9e0edfe258589",
    measurementId: "G-77L1810320"
  };
const CloudSync = {
  db: null,
  auth: null,

  init() {
    if (!FIREBASE_ENABLED) {
      console.log('CloudSync disabled — running fully offline (localStorage only).');
      return;
    }
    // Requires firebase-app, firebase-auth, firebase-firestore compat SDK scripts loaded first
    firebase.initializeApp(firebaseConfig);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    console.log('CloudSync enabled — Firebase connected.');
  },

  /** Push every local post up to Firestore (call after creating a post) */
  async syncPostUp(post) {
    if (!FIREBASE_ENABLED) return;
    await this.db.collection('posts').doc(post.id).set(post);
  },

  /** Push a user profile up to Firestore (call right after DB.insert in Auth.register) */
  async syncUserUp(user) {
    if (!FIREBASE_ENABLED) return;
    // Never write the password hash to the cloud — strip it before sending.
    const { passwordHash, ...safeUser } = user;
    try {
      await this.db.collection('users').doc(user.id).set(safeUser, { merge: true });
    } catch (e) {
      console.error('syncUserUp failed:', e);
      // Don't throw — local registration already succeeded, cloud sync is best-effort.
    }
  },

  /** Pull a single user's cloud doc down and merge into local storage (call on login) */
  async pullUserDown(userId) {
    if (!FIREBASE_ENABLED || !navigator.onLine) return;
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      if (!doc.exists) return;
      const cloudUser = doc.data();
      const local = DB.find(DB_KEYS.users, userId);
      // Keep the local passwordHash (never stored in the cloud), merge everything else.
      DB.update(DB_KEYS.users, userId, { ...cloudUser, passwordHash: local?.passwordHash });
    } catch (e) {
      console.error('pullUserDown failed:', e);
    }
  },

  /** Pull all cloud posts down and merge into local storage (call on login / app start when online) */
  async pullPostsDown() {
    if (!FIREBASE_ENABLED || !navigator.onLine) return;
    const snapshot = await this.db.collection('posts').get();
    const cloudPosts = snapshot.docs.map(d => d.data());
    const localPosts = DB.all(DB_KEYS.posts);
    const localIds = new Set(localPosts.map(p => p.id));
    const merged = [...localPosts, ...cloudPosts.filter(p => !localIds.has(p.id))];
    DB.save(DB_KEYS.posts, merged);
  },

  /** Example: real email/password auth instead of the local SHA-256 system in auth.js */
  async registerCloud(email, password) {
    if (!FIREBASE_ENABLED) throw new Error('Enable Firebase first.');
    return this.auth.createUserWithEmailAndPassword(email, password);
  },
  async loginCloud(email, password) {
    if (!FIREBASE_ENABLED) throw new Error('Enable Firebase first.');
    return this.auth.signInWithEmailAndPassword(email, password);
  }
};

// Auto-init (no-ops while disabled)
CloudSync.init();
