/* ============================================================
   chat.js — basic offline group chat (per classroom)
   Messages persist in localStorage; no real-time server.
   ============================================================ */

const Chat = {
  mount(panel, classroomId) {
    panel.innerHTML = `
      <div class="chat-messages" id="chat-messages"></div>
      <form class="chat-form" id="chat-form">
        <input type="text" maxlength="300" placeholder="Type a message…" required autocomplete="off">
        <button class="btn btn-primary btn-sm">Send</button>
      </form>
    `;
    this.renderMessages(classroomId);
    panel.querySelector('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = e.target.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      const user = Auth.currentUser();
      DB.insert(DB_KEYS.chats, { id: uid('msg'), classroomId, userId: user.id, text, createdAt: nowISO() });
      input.value = '';
      this.renderMessages(classroomId);
    });
  },

  renderMessages(classroomId) {
    const host = document.getElementById('chat-messages');
    if (!host) return;
    const user = Auth.currentUser();
    const msgs = DB.all(DB_KEYS.chats).filter(m => m.classroomId === classroomId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    host.innerHTML = msgs.map(m => {
      const sender = DB.find(DB_KEYS.users, m.userId);
      const mine = user && m.userId === user.id;
      return `
        <div class="chat-msg ${mine ? 'mine' : ''}">
          <div class="chat-bubble">
            ${!mine ? `<div class="chat-sender">${escapeHTML(sender?.name || 'User')}</div>` : ''}
            <div class="chat-text">${escapeHTML(m.text)}</div>
            <div class="chat-time">${timeAgo(m.createdAt)}</div>
          </div>
        </div>`;
    }).join('') || '<p class="muted">No messages yet. Say hi! 👋</p>';
    host.scrollTop = host.scrollHeight;
  }
};
