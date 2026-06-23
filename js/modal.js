/* ============================================================
   modal.js — generic modal dialog used by composer/classroom/quiz
   ============================================================ */

const Modal = {
  open(innerHTML, onMount) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-box glass-card" id="modal-body">
          <button class="modal-close" id="modal-close-btn" aria-label="Close">×</button>
          ${innerHTML}
        </div>
      </div>
    `;
    root.classList.add('open');
    document.getElementById('modal-close-btn').addEventListener('click', () => this.close());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') this.close();
    });
    if (onMount) onMount();
  },

  close() {
    const root = document.getElementById('modal-root');
    root.classList.remove('open');
    setTimeout(() => { root.innerHTML = ''; }, 200);
  },

  confirm(message, onConfirm) {
    this.open(`
      <h2>Confirm</h2>
      <p>${message}</p>
      <div class="form-row">
        <button id="confirm-yes" class="btn btn-primary">Yes, continue</button>
        <button id="confirm-no" class="btn btn-ghost">Cancel</button>
      </div>
    `, () => {
      document.getElementById('confirm-yes').addEventListener('click', () => { this.close(); onConfirm(); });
      document.getElementById('confirm-no').addEventListener('click', () => this.close());
    });
  }
};
