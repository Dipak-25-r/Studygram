/* ============================================================
   app.js — application bootstrap
   ============================================================ */

(async function bootstrap() {
 async function retryPendingSync() {
  const pending = DB.all("pendingSync") || [];

  for (let item of pending) {
    try {
      if (item.type === "user") {
        await CloudSync.syncUserUp(item.data);
      }
      DB.remove("pendingSync", item.id);
    } catch (e) {
      console.log("Retry failed:", e);
    }
  }
}

await retryPendingSync();
await Seed.run();
  // Build nav (sidebar on desktop, bottom bar on mobile — same markup, CSS handles layout)
  const navItems = Object.entries(Router.routes).filter(([, r]) => !r.hideNav);
  const navHTML = navItems.map(([key, r]) => `
    <button class="nav-item" data-route="${key}">
      <span class="nav-icon">${r.icon}</span><span class="nav-label">${r.label}</span>
    </button>
  `).join('');

  document.getElementById('sidebar-nav').innerHTML = navHTML;
  document.getElementById('bottom-nav').innerHTML = navHTML;

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => Router.go(btn.dataset.route));
  });

  // Auth/profile shortcut button in top bar
  const authBtn = document.getElementById('top-auth-btn');
  function refreshTopBar() {
    const user = Auth.currentUser();
    if (user) {
      authBtn.innerHTML = `<div class="avatar-sm" style="background:${user.avatarColor}">${user.name[0].toUpperCase()}</div>`;
      authBtn.onclick = () => Router.go('profile');
    } else {
      authBtn.innerHTML = `<span>Login</span>`;
      authBtn.onclick = () => Router.go('auth');
    }
  }
  refreshTopBar();
  window.addEventListener('hashchange', refreshTopBar);

  // Offline/online indicator
  const offlineBadge = document.getElementById('offline-badge');
  function updateNetworkStatus() {
    offlineBadge.classList.toggle('hidden', navigator.onLine);
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  Router.init();

  // Patch refreshTopBar into router.go so avatar updates after login/logout
  const originalGo = Router.go.bind(Router);
  Router.go = (route, updateHash) => { originalGo(route, updateHash); refreshTopBar(); };
})();
