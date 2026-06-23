/* ============================================================
   profile.js — profile page: stats, XP/level, saved posts
   ============================================================ */

const Profile = {
  render(container) {
    const user = Auth.currentUser();
    if (!user) { Router.go('auth'); return; }

    const posts = DB.all(DB_KEYS.posts);
    const myPosts = posts.filter(p => p.author === user.id);
    const savedPosts = posts.filter(p => p.saves.includes(user.id));
    const xpIntoLevel = user.xp % 100;

    container.innerHTML = `
      ${Monetization.upgradeBannerHTML(user)}
      <div class="profile-header glass-card">
        <div class="avatar-lg" style="background:${user.avatarColor}">${user.name[0].toUpperCase()}</div>
        <div class="profile-info">
          <h2>${escapeHTML(user.name)} ${user.role === 'Teacher' ? '<span class="badge-teacher">Teacher</span>' : ''}${user.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}</h2>
          <div class="muted">${escapeHTML(user.email)}</div>
          <div class="profile-stats">
            <div><strong>${myPosts.length}</strong><span>Posts</span></div>
            <div><strong>${user.followers.length}</strong><span>Followers</span></div>
            <div><strong>${user.following.length}</strong><span>Following</span></div>
          </div>
        </div>
        <button id="logout-btn" class="btn btn-ghost btn-sm">Logout</button>
      </div>

      <div class="glass-card xp-card">
        <div class="xp-row">
          <div>Level <strong>${user.level}</strong></div>
          <div>${user.xp} XP total — ${xpIntoLevel}/100 to next level</div>
        </div>
        <div class="xp-bar"><div class="xp-bar-fill" style="width:${xpIntoLevel}%"></div></div>
        <div class="muted small">💰 Wallet: ${user.xp} coins (your XP doubles as coins for unlocking paid content)</div>
      </div>

      <h3 class="section-sub">📌 Saved Posts (${savedPosts.length})</h3>
      <div class="post-list" id="saved-list"></div>

      <h3 class="section-sub">✍️ Your Posts (${myPosts.length})</h3>
      <div class="post-list" id="mine-list"></div>
    `;

    const savedList = container.querySelector('#saved-list');
    if (savedPosts.length === 0) savedList.innerHTML = '<p class="muted">Nothing saved yet — tap 📌 on a post to save it.</p>';
    else savedPosts.forEach(p => savedList.appendChild(Feed.renderPostCard(p)));

    const mineList = container.querySelector('#mine-list');
    if (myPosts.length === 0) mineList.innerHTML = '<p class="muted">You haven\'t posted anything yet.</p>';
    else myPosts.forEach(p => mineList.appendChild(Feed.renderPostCard(p)));

    container.querySelector('#logout-btn').addEventListener('click', () => {
      Auth.logout();
      Router.go('auth');
      toast('Logged out.', 'info');
    });
    Monetization.wireUpgradeBanner(container);
  }
};
