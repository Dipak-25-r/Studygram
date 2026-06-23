/* ============================================================
   filter.js — advanced multi-criteria filter panel
   Filters combine with AND logic; updates feed instantly.
   ============================================================ */

const FilterPanel = {
  mount(container, onChange) {
    const posts = DB.all(DB_KEYS.posts);
    const subjects = [...new Set(posts.map(p => p.subject))].sort();
    const types = [...new Set(posts.map(p => p.type))].sort();

    container.innerHTML = `
      <div class="filter-bar glass-card">
        <div class="filter-row">
          <select id="f-stream"><option value="">All Streams</option>
            <option>Science</option><option>Commerce</option><option>Arts</option>
          </select>
          <select id="f-standard"><option value="">All Standards</option>
            <option value="11">Standard 11</option><option value="12">Standard 12</option>
          </select>
          <select id="f-subject"><option value="">All Subjects</option>
            ${subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('')}
          </select>
          <select id="f-type"><option value="">All Types</option>
            ${types.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-row">
          <input id="f-topic" type="text" placeholder="Search topic… (e.g. limits, WWII)">
          <button id="f-clear" class="btn btn-ghost btn-sm">Clear filters</button>
        </div>
        <div id="f-active-chips" class="active-chips"></div>
      </div>
    `;

    const inputs = {
      stream: container.querySelector('#f-stream'),
      standard: container.querySelector('#f-standard'),
      subject: container.querySelector('#f-subject'),
      type: container.querySelector('#f-type'),
      topic: container.querySelector('#f-topic')
    };

    const emit = () => {
      const filters = {};
      Object.entries(inputs).forEach(([k, el]) => { if (el.value) filters[k] = el.value; });
      this.renderChips(container, filters, inputs, emit);
      onChange(filters);
    };

    inputs.stream.addEventListener('change', emit);
    inputs.standard.addEventListener('change', emit);
    inputs.subject.addEventListener('change', emit);
    inputs.type.addEventListener('change', emit);
    inputs.topic.addEventListener('input', debounce(emit, 300));

    container.querySelector('#f-clear').addEventListener('click', () => {
      Object.values(inputs).forEach(el => el.value = '');
      emit();
    });

    emit();
  },

  renderChips(container, filters, inputs, emit) {
    const chipsHost = container.querySelector('#f-active-chips');
    const labels = { stream: 'Stream', standard: 'Standard', subject: 'Subject', type: 'Type', topic: 'Topic' };
    chipsHost.innerHTML = Object.entries(filters).map(([k, v]) => `
      <span class="chip" data-key="${k}">${labels[k]}: ${escapeHTML(v)} <button aria-label="remove">×</button></span>
    `).join('');
    chipsHost.querySelectorAll('.chip button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.closest('.chip').dataset.key;
        inputs[key].value = '';
        emit();
      });
    });
  }
};
