/* ============================================================
   quiz.js — MCQ quiz creation & offline attempt with instant scoring
   ============================================================ */

const Quiz = {
  render(container) {
    const user = Auth.currentUser();
    if (!user) { Router.go('auth'); return; }

    const myQuizzes = DB.all(DB_KEYS.quizzes).filter(q => q.author === user.id);
    const attempts = DB.all(DB_KEYS.quizAttempts).filter(a => a.userId === user.id);

    container.innerHTML = `
      <div class="page-header">
        <h2>📝 Quizzes</h2>
        <div class="header-actions">
          ${user.role === 'Teacher' ? `<button id="create-quiz-btn" class="btn btn-primary btn-sm">+ Create Quiz</button>` : ''}
          <button id="attempt-quiz-btn" class="btn btn-ghost btn-sm">Attempt with code</button>
        </div>
      </div>

      ${user.role === 'Teacher' ? `
        <h3 class="section-sub">Your quizzes</h3>
        <div class="quiz-grid" id="my-quiz-list"></div>
      ` : ''}

      <h3 class="section-sub">Your attempt history</h3>
      <div class="quiz-grid" id="attempt-list">
        ${attempts.length === 0 ? '<p class="muted">No attempts yet.</p>' : attempts.slice().reverse().map(a => {
          const q = DB.find(DB_KEYS.quizzes, a.quizId);
          return `<div class="glass-card quiz-card">
            <h4>${escapeHTML(q?.title || 'Deleted quiz')}</h4>
            <div class="quiz-score">${a.score}/${a.total} correct</div>
            <div class="muted">${timeAgo(a.createdAt)}</div>
          </div>`;
        }).join('')}
      </div>
    `;

    const myList = container.querySelector('#my-quiz-list');
    if (myList) {
      if (myQuizzes.length === 0) {
        myList.innerHTML = '<p class="muted">You haven\'t created any quizzes yet.</p>';
      } else {
        myQuizzes.forEach(q => {
          const card = document.createElement('div');
          card.className = 'glass-card quiz-card';
          const attemptCount = DB.all(DB_KEYS.quizAttempts).filter(a => a.quizId === q.id).length;
          card.innerHTML = `
            <h4>${escapeHTML(q.title)}</h4>
            <div class="quiz-code">Code: <strong>${q.code}</strong></div>
            <div class="muted">${q.questions.length} questions • ${attemptCount} attempts</div>
          `;
          myList.appendChild(card);
        });
      }
    }

    const createBtn = container.querySelector('#create-quiz-btn');
    if (createBtn) createBtn.addEventListener('click', () => this.openCreate());
    container.querySelector('#attempt-quiz-btn').addEventListener('click', () => this.openCodeEntry());
  },

  openCreate() {
    Modal.open(`
      <h2>Create Quiz</h2>
      <form id="quiz-form" class="form-grid">
        <label>Quiz title<input name="title" required placeholder="e.g. Cell Biology — Unit 1"></label>
        <div id="question-builder"></div>
        <button type="button" id="add-q-btn" class="btn btn-ghost btn-sm">+ Add Question</button>
        <button type="submit" class="btn btn-primary">Publish Quiz</button>
      </form>
    `, () => {
      const builder = document.getElementById('question-builder');
      let qCount = 0;

      const addQuestion = () => {
        qCount++;
        const block = document.createElement('div');
        block.className = 'question-block glass-card';
        block.dataset.qIndex = qCount;
        block.innerHTML = `
          <label>Question ${qCount}<input name="q${qCount}-text" required placeholder="Question text"></label>
          <div class="options-grid">
            ${[0, 1, 2, 3].map(i => `
              <label class="option-row">
                <input type="radio" name="q${qCount}-correct" value="${i}" ${i === 0 ? 'checked' : ''}>
                <input type="text" name="q${qCount}-opt${i}" required placeholder="Option ${i + 1}">
              </label>
            `).join('')}
          </div>
          <button type="button" class="btn btn-ghost btn-sm remove-q-btn">Remove</button>
        `;
        block.querySelector('.remove-q-btn').addEventListener('click', () => block.remove());
        builder.appendChild(block);
      };
      addQuestion();
      document.getElementById('add-q-btn').addEventListener('click', addQuestion);

      document.getElementById('quiz-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const blocks = builder.querySelectorAll('.question-block');
        if (blocks.length === 0) { toast('Add at least one question.', 'error'); return; }

        const questions = Array.from(blocks).map(block => {
          const idx = block.dataset.qIndex;
          const text = data.get(`q${idx}-text`);
          const options = [0, 1, 2, 3].map(i => data.get(`q${idx}-opt${i}`));
          const correct = Number(data.get(`q${idx}-correct`));
          return { id: uid('q'), text, options, correct };
        });

        const user = Auth.currentUser();
        const quiz = {
          id: uid('quiz'), code: this.generateCode(), classroomId: null, author: user.id,
          title: data.get('title').trim(), questions, createdAt: nowISO()
        };
        DB.insert(DB_KEYS.quizzes, quiz);
        Auth.awardXP(15, 'created a quiz');
        Modal.close();
        Router.go('quiz');
        toast(`Quiz published! Share code: ${quiz.code}`, 'success', 5000);
      });
    });
  },

  generateCode() {
    return Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  },

  openCodeEntry() {
    Modal.open(`
      <h2>Attempt a Quiz</h2>
      <form id="quiz-code-form" class="form-grid">
        <label>Quiz code<input name="code" required maxlength="10" style="text-transform:uppercase" placeholder="e.g. PHY101"></label>
        <button class="btn btn-primary">Start Quiz</button>
      </form>
    `, () => {
      document.getElementById('quiz-code-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!Auth.requireLogin()) return;
        const code = e.target.querySelector('[name="code"]').value.trim().toUpperCase();
        const quiz = DB.all(DB_KEYS.quizzes).find(q => q.code === code);
        if (!quiz) { toast('Invalid quiz code.', 'error'); return; }
        this.openAttempt(quiz);
      });
    });
  },

  openAttempt(quiz) {
    Modal.open(`
      <h2>${escapeHTML(quiz.title)}</h2>
      <form id="attempt-form" class="form-grid">
        ${quiz.questions.map((q, i) => `
          <div class="question-block glass-card">
            <div class="attempt-question">${i + 1}. ${escapeHTML(q.text)}</div>
            <div class="options-grid">
              ${q.options.map((opt, oi) => `
                <label class="option-row">
                  <input type="radio" name="ans${i}" value="${oi}" required>
                  <span>${escapeHTML(opt)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <button type="submit" class="btn btn-primary">Submit Quiz</button>
      </form>
    `, () => {
      document.getElementById('attempt-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        let score = 0;
        quiz.questions.forEach((q, i) => {
          if (Number(data.get(`ans${i}`)) === q.correct) score++;
        });
        const user = Auth.currentUser();
        DB.insert(DB_KEYS.quizAttempts, {
          id: uid('attempt'), quizId: quiz.id, userId: user.id, score, total: quiz.questions.length, createdAt: nowISO()
        });
        Auth.awardXP(score * 5, `scored ${score}/${quiz.questions.length} on a quiz`);
        this.showResult(quiz, score);
      });
    });
  },

  showResult(quiz, score) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚';
    Modal.open(`
      <div class="result-screen">
        <div class="result-emoji">${emoji}</div>
        <h2>${score} / ${quiz.questions.length} correct</h2>
        <div class="result-pct">${pct}%</div>
        <p class="muted">${pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort — review and try again.' : 'Keep practicing, you\'ll get there!'}</p>
        <button class="btn btn-primary" id="result-close-btn">Done</button>
      </div>
    `, () => {
      document.getElementById('result-close-btn').addEventListener('click', () => {
        Modal.close();
        Router.go('quiz');
      });
    });
  }
};
