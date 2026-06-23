/* ============================================================
   feed.js — the Instagram-style post feed
   ============================================================ */

const Feed = {
  activeFilters: {},

  render(container) {
    const user = Auth.currentUser();
    container.innerHTML = `
      ${Monetization.upgradeBannerHTML(user)}
      <div class="composer-trigger glass-card" id="composer-trigger">
        <div class="avatar-sm" id="composer-avatar"></div>
        <div class="composer-placeholder">Share a YouTube video or Drive link…</div>
        <button class="btn btn-primary btn-sm" id="composer-open-btn">+ New Post</button>
      </div>
      <div id="filter-mount"></div>
      <div id="post-list" class="post-list"></div>
      <div id="feed-empty" class="empty-state hidden">
        <div class="empty-icon">🔍</div>
        <h3>No posts match these filters</h3>
        <p>Try clearing a filter or check back later.</p>
      </div>
    `;

    Monetization.wireUpgradeBanner(container);
    document.getElementById('composer-avatar').style.background = user?.avatarColor || '#7c3aed';
    document.getElementById('composer-avatar').textContent = (user?.name || '?')[0].toUpperCase();
    document.getElementById('composer-trigger').addEventListener('click', () => Feed.openComposer());

    FilterPanel.mount(document.getElementById('filter-mount'), (filters) => {
      Feed.activeFilters = filters;
      Feed.renderList();
    });

    this.renderList();
  },

  getFilteredPosts() {
    const all = DB.all(DB_KEYS.posts).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const f = this.activeFilters || {};
    return all.filter(p => {
      if (f.stream && p.stream !== f.stream) return false;
      if (f.standard && p.standard !== f.standard) return false;
      if (f.subject && p.subject !== f.subject) return false;
      if (f.topic && !p.topic.toLowerCase().includes(f.topic.toLowerCase())) return false;
      if (f.type && p.type !== f.type) return false;
      return true;
    });
  },

  renderList() {
    const list = document.getElementById('post-list');
    const empty = document.getElementById('feed-empty');
    if (!list) return;
    const posts = this.getFilteredPosts();
    const user = Auth.currentUser();
    list.innerHTML = '';
    empty.classList.toggle('hidden', posts.length > 0);
    posts.forEach((p, i) => {
      list.appendChild(this.renderPostCard(p));
      // Show a simulated ad every 4 posts, only for non-premium users
      if (!Monetization.isPremium(user) && i > 0 && (i + 1) % 4 === 0) {
        const adWrap = document.createElement('div');
        adWrap.innerHTML = Monetization.adSlotHTML(i);
        list.appendChild(adWrap.firstElementChild);
      }
    });
  },

  renderPostCard(post) {
    const user = Auth.currentUser();
    const author = DB.find(DB_KEYS.users, post.author);
    const meta = { kind: post.linkKind, id: post.linkId, url: post.link };
    const liked = user && post.likes.includes(user.id);
    const saved = user && post.saves.includes(user.id);
    const unlocked = !post.paid || (user && (post.author === user.id || this.isUnlocked(post.id, user.id)));

    const card = document.createElement('article');
    card.className = 'post-card glass-card';
    card.innerHTML = `
      <header class="post-head">
        <div class="avatar-sm" style="background:${author?.avatarColor || '#444'}">${(author?.name || '?')[0].toUpperCase()}</div>
        <div class="post-head-meta">
          <div class="post-author">${escapeHTML(author?.name || 'Unknown')} ${author?.role === 'Teacher' ? '<span class="badge-teacher">Teacher</span>' : ''}${author?.premium ? '<span class="premium-badge">PREMIUM</span>' : ''}</div>
          <div class="post-time">${timeAgo(post.createdAt)}</div>
        </div>
        <div class="post-tags">
          <span class="tag tag-stream">${post.stream}</span>
          <span class="tag">Std ${post.standard}</span>
          <span class="tag">${post.type}</span>
        </div>
      </header>

      <div class="post-body">
        <h3 class="post-title">${escapeHTML(post.title)}</h3>
        <p class="post-desc">${escapeHTML(post.description)}</p>
        <div class="post-meta-line">📘 ${escapeHTML(post.subject)} &nbsp;•&nbsp; 🏷️ ${escapeHTML(post.topic)}</div>

        <div class="post-media" data-post="${post.id}">
          ${this.renderMedia(post, meta, unlocked)}
        </div>
      </div>

      <footer class="post-actions">
        <button class="act-btn ${liked ? 'active-like' : ''}" data-action="like">❤️ <span>${post.likes.length}</span></button>
        <button class="act-btn" data-action="comment">💬 <span>${DB.all(DB_KEYS.comments).filter(c => c.postId === post.id).length}</span></button>
        <button class="act-btn ${saved ? 'active-save' : ''}" data-action="save">📌 ${saved ? 'Saved' : 'Save'}</button>
        <button class="act-btn" data-action="share">🔗 Share</button>
      </footer>

      <div class="comment-section hidden" data-comments-for="${post.id}"></div>
    `;

    card.querySelector('[data-action="like"]').addEventListener('click', () => this.toggleLike(post.id));
    card.querySelector('[data-action="save"]').addEventListener('click', () => this.toggleSave(post.id));
    card.querySelector('[data-action="share"]').addEventListener('click', () => this.share(post));
    card.querySelector('[data-action="comment"]').addEventListener('click', () => this.toggleComments(post.id, card));

    const unlockBtn = card.querySelector('.unlock-btn');
    if (unlockBtn) unlockBtn.addEventListener('click', () => this.unlockPost(post));

    return card;
  },

  renderMedia(post, meta, unlocked) {
    if (!unlocked) {
      return `
        <div class="paid-lock">
          <div class="lock-icon">🔒</div>
          <div class="lock-title">Premium content</div>
          <div class="lock-price">${post.price} coins</div>
          <button class="btn btn-primary btn-sm unlock-btn">Unlock</button>
        </div>`;
    }

    if (meta.kind === 'youtube') {
      const src = LinkUtils.embedSrc(meta);
      return `<div class="embed-wrap"><iframe src="${src}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
    }
    if (meta.kind === 'drive') {
      const src = LinkUtils.embedSrc(meta);
      return `<div class="embed-wrap drive-embed"><iframe src="${src}" frameborder="0" loading="lazy"></iframe></div>
              <a class="open-link" href="${meta.url}" target="_blank" rel="noopener">Open in Google Drive ↗</a>`;
    }
    return `<a class="open-link external" href="${meta.url}" target="_blank" rel="noopener">🔗 Open external resource</a>`;
  },

  isUnlocked(postId, userId) {
    return DB.all(DB_KEYS.unlocks).some(u => u.postId === postId && u.userId === userId);
  },

  unlockPost(post) {
    if (!Auth.requireLogin()) return;
    const user = Auth.currentUser();
    if (user.xp < post.price) {
      toast(`Not enough coins. You need ${post.price}, you have ${user.xp}.`, 'error');
      return;
    }
    Modal.confirm(
      `Unlock "${post.title}" for ${post.price} coins?`,
      () => {
        DB.update(DB_KEYS.users, user.id, { xp: user.xp - post.price });
        DB.insert(DB_KEYS.unlocks, { id: uid('unlock'), postId: post.id, userId: user.id, createdAt: nowISO() });
        toast('Unlocked! Enjoy the content.', 'success');
        this.renderList();
      }
    );
  },

  toggleLike(postId) {
    if (!Auth.requireLogin()) return;
    const user = Auth.currentUser();
    const post = DB.find(DB_KEYS.posts, postId);
    const has = post.likes.includes(user.id);
    const likes = has ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id];
    DB.update(DB_KEYS.posts, postId, { likes });
    if (!has) Auth.awardXP(2, 'liked a post');
    this.renderList();
  },

  toggleSave(postId) {
    if (!Auth.requireLogin()) return;
    const user = Auth.currentUser();
    const post = DB.find(DB_KEYS.posts, postId);
    const has = post.saves.includes(user.id);
    const saves = has ? post.saves.filter(id => id !== user.id) : [...post.saves, user.id];
    DB.update(DB_KEYS.posts, postId, { saves });
    toast(has ? 'Removed from saved' : 'Saved for later 📌', 'info', 1500);
    this.renderList();
  },

  share(post) {
    const shareUrl = `${location.origin}${location.pathname}#post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, text: post.description, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast('Link copied to clipboard 🔗', 'success');
    } else {
      toast(shareUrl, 'info', 5000);
    }
  },

  toggleComments(postId, card) {
    const section = card.querySelector(`[data-comments-for="${postId}"]`);
    const isHidden = section.classList.contains('hidden');
    section.classList.toggle('hidden');
    if (isHidden) this.renderComments(postId, section);
  },

  renderComments(postId, section) {
    const comments = DB.all(DB_KEYS.comments).filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    section.innerHTML = `
      <div class="comment-list">
        ${comments.map(c => {
          const u = DB.find(DB_KEYS.users, c.userId);
          return `<div class="comment-item">
            <span class="comment-author">${escapeHTML(u?.name || 'User')}</span>
            <span class="comment-text">${escapeHTML(c.text)}</span>
          </div>`;
        }).join('') || '<div class="comment-empty">No comments yet — be the first!</div>'}
      </div>
      <form class="comment-form">
        <input type="text" maxlength="240" placeholder="Write a comment…" required />
        <button type="submit" class="btn btn-primary btn-sm">Post</button>
      </form>
    `;
    section.querySelector('.comment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Auth.requireLogin()) return;
      const input = e.target.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      const user = Auth.currentUser();
      DB.insert(DB_KEYS.comments, { id: uid('cmt'), postId, userId: user.id, text, createdAt: nowISO() });
      Auth.awardXP(1, 'added a comment');
      this.renderComments(postId, section);
      this.renderList();
    });
  },

  openComposer() {
    if (!Auth.requireLogin()) return;
    Modal.open(this.composerTemplate(), () => this.wireComposer());
  },

  composerTemplate() {
    return `
      <h2>Share Study Material</h2>
      <form id="post-form" class="form-grid">
        <label>Title<input name="title" required maxlength="120" placeholder="e.g. Thermodynamics Full Revision"></label>
        <label>Description<textarea name="description" required maxlength="400" rows="3" placeholder="What does this resource cover?"></textarea></label>
        <div class="form-row">
          <label>Stream
            <select name="stream" required>
              <option value="">Select</option>
              <option>Science</option><option>Commerce</option><option>Arts</option>
            </select>
          </label>
          <label>Standard
            <select name="standard" required>
              <option value="">Select</option>
              <option value="11">11</option><option value="12">12</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>Subject<input name="subject" required placeholder="e.g. Physics"></label>
          <label>Topic<input name="topic" required placeholder="e.g. Laws of Motion"></label>
        </div>
        <label>External link (YouTube or Google Drive)
          <input name="link" required placeholder="https://youtube.com/... or https://drive.google.com/...">
        </label>
        <div id="link-preview" class="link-preview"></div>
        <div class="form-row align-center">
          <label class="checkbox-label"><input type="checkbox" name="paid"> Paid content</label>
          <label id="price-wrap" class="hidden">Price (coins)<input name="price" type="number" min="10" step="10" value="20"></label>
        </div>
        <button type="submit" class="btn btn-primary">Publish Post</button>
      </form>
    `;
  },

  wireComposer() {
    const form = document.getElementById('post-form');
    const linkInput = form.querySelector('[name="link"]');
    const preview = document.getElementById('link-preview');
    const paidCheckbox = form.querySelector('[name="paid"]');
    const priceWrap = document.getElementById('price-wrap');

    paidCheckbox.addEventListener('change', () => priceWrap.classList.toggle('hidden', !paidCheckbox.checked));

    linkInput.addEventListener('input', debounce(() => {
      const meta = LinkUtils.analyze(linkInput.value);
      if (meta.kind === 'invalid') {
        preview.innerHTML = linkInput.value ? `<div class="preview-error">⚠️ Not a valid URL</div>` : '';
      } else if (meta.kind === 'unknown') {
        preview.innerHTML = `<div class="preview-warn">⚠️ Link accepted, but only YouTube/Drive links get an embedded preview.</div>`;
      } else {
        const thumb = LinkUtils.thumbnail(meta);
        preview.innerHTML = `
          <div class="preview-ok">
            ✅ Detected: <strong>${meta.kind === 'youtube' ? 'YouTube Video' : 'Google Drive — ' + meta.type}</strong>
            ${thumb ? `<img src="${thumb}" alt="thumbnail">` : ''}
          </div>`;
      }
    }, 350));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const meta = LinkUtils.analyze(data.get('link'));
      if (meta.kind === 'invalid') {
        toast('Please enter a valid link.', 'error');
        return;
      }
      const user = Auth.currentUser();
      const post = {
        id: uid('post'),
        title: data.get('title').trim(),
        description: data.get('description').trim(),
        stream: data.get('stream'),
        standard: data.get('standard'),
        subject: data.get('subject').trim(),
        topic: data.get('topic').trim(),
        type: meta.type || 'Link',
        linkKind: meta.kind,
        linkId: meta.id || null,
        link: meta.url,
        paid: paidCheckbox.checked,
        price: paidCheckbox.checked ? Number(data.get('price') || 20) : 0,
        author: user.id,
        likes: [], saves: [],
        createdAt: nowISO()
      };
      DB.insert(DB_KEYS.posts, post);
      CloudSync.pullPostsDown()
      Auth.awardXP(10, 'published a post');
      Modal.close();
      Router.go('feed');
      toast('Post published! 🎉', 'success');
    });
  }
};

/* ---------- small shared helpers ---------- */
function escapeHTML(str = '') {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
