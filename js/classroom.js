/* ============================================================
   classroom.js — teacher-created classrooms with join codes
   ============================================================ */

const Classroom = {
  render(container) {
    const user = Auth.currentUser();
    if (!user) { Router.go('auth'); return; }

    const myMemberships = DB.all(DB_KEYS.classroomMembers).filter(m => m.userId === user.id);
    const myClassrooms = myMemberships.map(m => DB.find(DB_KEYS.classrooms, m.classroomId)).filter(Boolean);

    container.innerHTML = `
      <div class="page-header">
        <h2>🏫 Classrooms</h2>
        <div class="header-actions">
          ${user.role === 'Teacher' ? `<button id="create-class-btn" class="btn btn-primary btn-sm">+ Create Classroom</button>` : ''}
          <button id="join-class-btn" class="btn btn-ghost btn-sm">Join with code</button>
        </div>
      </div>
      <div id="classroom-list" class="classroom-grid"></div>
    `;

    const list = container.querySelector('#classroom-list');
    if (myClassrooms.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏫</div><h3>No classrooms yet</h3>
        <p>${user.role === 'Teacher' ? 'Create one to get started.' : 'Ask your teacher for a join code.'}</p></div>`;
    } else {
      myClassrooms.forEach(c => list.appendChild(this.classCard(c, user)));
    }

    const createBtn = container.querySelector('#create-class-btn');
    if (createBtn) createBtn.addEventListener('click', () => this.openCreate());
    container.querySelector('#join-class-btn').addEventListener('click', () => this.openJoin());
  },

  classCard(classroom, user) {
    const members = DB.all(DB_KEYS.classroomMembers).filter(m => m.classroomId === classroom.id);
    const card = document.createElement('div');
    card.className = 'glass-card classroom-card';
    card.innerHTML = `
      <h3>${escapeHTML(classroom.name)}</h3>
      <div class="classroom-code">Code: <strong>${classroom.code}</strong></div>
      <div class="classroom-stat">👥 ${members.length} members</div>
      <button class="btn btn-secondary btn-sm open-class-btn">Open Classroom</button>
    `;
    card.querySelector('.open-class-btn').addEventListener('click', () => this.openClassroomDetail(classroom));
    return card;
  },

  openCreate() {
    Modal.open(`
      <h2>Create Classroom</h2>
      <form id="create-class-form" class="form-grid">
        <label>Classroom name<input name="name" required placeholder="e.g. Class 11 Commerce — Batch B"></label>
        <button type="submit" class="btn btn-primary">Create</button>
      </form>
    `, () => {
      document.getElementById('create-class-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = Auth.currentUser();
        const name = e.target.querySelector('[name="name"]').value.trim();
        const code = this.generateCode();
        const classroom = { id: uid('class'), name, code, teacher: user.id, announcements: [], createdAt: nowISO() };
        DB.insert(DB_KEYS.classrooms, classroom);
        DB.insert(DB_KEYS.classroomMembers, { id: uid('mem'), classroomId: classroom.id, userId: user.id, roleInClass: 'Teacher' });
        Auth.awardXP(15, 'created a classroom');
        Modal.close();
        Router.go('classroom');
        toast(`Classroom created! Join code: ${code}`, 'success', 5000);
      });
    });
  },

  generateCode() {
    return Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  },

  openJoin() {
    Modal.open(`
      <h2>Join Classroom</h2>
      <form id="join-class-form" class="form-grid">
        <label>Classroom code<input name="code" required maxlength="10" placeholder="e.g. SCI12A" style="text-transform:uppercase"></label>
        <button type="submit" class="btn btn-primary">Join</button>
      </form>
    `, () => {
      document.getElementById('join-class-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!Auth.requireLogin()) return;
        const user = Auth.currentUser();
        const code = e.target.querySelector('[name="code"]').value.trim().toUpperCase();
        const classroom = DB.all(DB_KEYS.classrooms).find(c => c.code === code);
        if (!classroom) { toast('Invalid classroom code.', 'error'); return; }
        const already = DB.all(DB_KEYS.classroomMembers).some(m => m.classroomId === classroom.id && m.userId === user.id);
        if (already) { toast('You are already a member of this classroom.', 'info'); Modal.close(); return; }
        DB.insert(DB_KEYS.classroomMembers, { id: uid('mem'), classroomId: classroom.id, userId: user.id, roleInClass: 'Student' });
        Auth.awardXP(5, 'joined a classroom');
        Modal.close();
        Router.go('classroom');
        toast(`Joined "${classroom.name}"!`, 'success');
      });
    });
  },

  openClassroomDetail(classroom) {
    const user = Auth.currentUser();
    const isTeacher = classroom.teacher === user.id;
    const members = DB.all(DB_KEYS.classroomMembers).filter(m => m.classroomId === classroom.id)
      .map(m => ({ ...m, user: DB.find(DB_KEYS.users, m.userId) }));

    Modal.open(`
      <h2>${escapeHTML(classroom.name)}</h2>
      <div class="classroom-tabs">
        <button class="tab-btn active" data-tab="announce">📢 Announcements</button>
        <button class="tab-btn" data-tab="members">👥 Members (${members.length})</button>
        <button class="tab-btn" data-tab="chat">💬 Chat</button>
      </div>
      <div data-tab-panel="announce" class="tab-panel">
        ${isTeacher ? `
          <form id="announce-form" class="form-row">
            <input name="text" maxlength="200" placeholder="Post an announcement…" required>
            <button class="btn btn-primary btn-sm">Post</button>
          </form>` : ''}
        <div class="announcement-list">
          ${classroom.announcements.slice().reverse().map(a => `
            <div class="announcement-item">
              <div class="ann-text">${escapeHTML(a.text)}</div>
              <div class="ann-time">${timeAgo(a.createdAt)}</div>
            </div>`).join('') || '<p class="muted">No announcements yet.</p>'}
        </div>
      </div>
      <div data-tab-panel="members" class="tab-panel hidden">
        <div class="member-list">
          ${members.map(m => `
            <div class="member-row">
              <div class="avatar-sm" style="background:${m.user?.avatarColor || '#444'}">${(m.user?.name || '?')[0].toUpperCase()}</div>
              <div>${escapeHTML(m.user?.name || 'Unknown')}</div>
              <span class="tag">${m.roleInClass}</span>
            </div>`).join('')}
        </div>
      </div>
      <div data-tab-panel="chat" class="tab-panel hidden" id="classroom-chat-panel"></div>
    `, () => {
      this.wireTabs(classroom, isTeacher);
    });
  },

  wireTabs(classroom, isTeacher) {
    const modal = document.getElementById('modal-body');
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        const panel = modal.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`);
        panel.classList.remove('hidden');
        if (btn.dataset.tab === 'chat') Chat.mount(panel, classroom.id);
      });
    });

    const announceForm = document.getElementById('announce-form');
    if (announceForm) {
      announceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = e.target.querySelector('[name="text"]').value.trim();
        if (!text) return;
        const ann = { id: uid('ann'), text, createdAt: nowISO() };
        DB.update(DB_KEYS.classrooms, classroom.id, { announcements: [...classroom.announcements, ann] });
        classroom.announcements.push(ann);
        toast('Announcement posted', 'success');
        Modal.close();
        this.openClassroomDetail(DB.find(DB_KEYS.classrooms, classroom.id));
      });
    }
  }
};
