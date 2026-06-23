/* ============================================================
   router.js — tiny hash-based router for the SPA
   ============================================================ */

const Router = {
  routes: {
    feed: { render: (el) => Feed.render(el), label: 'Feed', icon: '🏠', requiresAuth: false },
    classroom: { render: (el) => Classroom.render(el), label: 'Classrooms', icon: '🏫', requiresAuth: true },
    quiz: { render: (el) => Quiz.render(el), label: 'Quizzes', icon: '📝', requiresAuth: true },
    profile: { render: (el) => Profile.render(el), label: 'Profile', icon: '👤', requiresAuth: true },
    auth: { render: (el) => AuthView.render(el), label: 'Login', icon: '🔑', requiresAuth: false, hideNav: true }
  },

  current: 'feed',

  init() {
    window.addEventListener('hashchange', () => this.handleHash());
    this.handleHash();
  },

  handleHash() {
    const hash = location.hash.replace('#', '') || 'feed';
    const route = hash.split('/')[0];
    this.go(this.routes[route] ? route : 'feed', false);
  },

  go(route, updateHash = true) {
    if (!this.routes[route]) route = 'feed';
    if (this.routes[route].requiresAuth && !Auth.isLoggedIn()) route = 'auth';

    this.current = route;
    if (updateHash) location.hash = route;

    const view = document.getElementById('view-root');
    view.classList.add('fade-out');
    setTimeout(() => {
      this.routes[route].render(view);
      view.classList.remove('fade-out');
    }, 120);

    this.renderNav();
  },

  renderNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === this.current);
    });
    const loggedIn = Auth.isLoggedIn();
    document.querySelectorAll('.nav-auth-only').forEach(el => {
      el.style.display = loggedIn ? '' : 'none';
    });
    const authNav = document.querySelector('[data-route="auth"]');
    if (authNav) authNav.style.display = loggedIn ? 'none' : '';
  }
};
