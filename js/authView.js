/* ============================================================
   authView.js — login / register screen rendering student@demo.com,teacher@demo.com, demo1234
   ============================================================================================================================================================================================================*/

const AuthView = {
  mode: 'login',

  render(container) {
    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card glass-card">
          <div class="auth-brand">
            <span class="brand-icon">🎓</span>
            <h1>StudyGram</h1>
            <p class="muted">Share & discover study material — videos, notes, slides.</p>
          </div>
          <div class="auth-tabs">
            <button class="tab-btn ${this.mode === 'login' ? 'active' : ''}" data-mode="login">Login</button>
            <button class="tab-btn ${this.mode === 'register' ? 'active' : ''}" data-mode="register">Register</button>
          </div>
          <div id="auth-form-mount"></div>  
        </div>
      </div>
    `;
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { this.mode = btn.dataset.mode; this.render(container); });
    });
    this.renderForm(container.querySelector('#auth-form-mount'));
  },

  renderForm(mount) {
    if (this.mode === 'login') {
      mount.innerHTML = `
        <form id="login-form" class="form-grid">
          <label>Email<input type="email" name="email" required placeholder="you@example.com"></label>
          <label>Password<input type="password" name="password" required placeholder="••••••••"></label>
          <button type="submit" class="btn btn-primary">Log In</button>
        </form>`;
      mount.querySelector('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        try {
          await Auth.login({ email: data.get('email'), password: data.get('password') });
          toast('Welcome back! 👋', 'success');
          Router.go('feed');
        } catch (err) { toast(err.message, 'error'); }
      });
    } else {
      mount.innerHTML = `
        <form id="register-form" class="form-grid">
          <label>Full name<input name="name" required placeholder="Your name"></label>
          <label>Email<input type="email" name="email" required placeholder="you@example.com"></label>
          <label>Password<input type="password" name="password" required minlength="6" placeholder="At least 6 characters"></label>
          <label>I am a…
            <select name="role" required>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>
          </label>
          <button type="submit" class="btn btn-primary">Create Account</button>
        </form>`;
      mount.querySelector('#register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        try {
          await Auth.register({
            name: data.get('name').trim(), email: data.get('email').trim(),
            password: data.get('password'), role: data.get('role')
          });
          Auth.awardXP(20, 'created your account');
          toast('Account created! Welcome to StudyGram 🎉', 'success');
          Router.go('feed');
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  }
};
