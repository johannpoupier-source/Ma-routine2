(() => {
  'use strict';

  const HABITS_KEY = 'ma-routine-habits';
  const CHECKS_KEY = 'ma-routine-checks';
  const PLAN_KEY = 'ma-routine-plan';
  const SUNDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

  const DAYS_FR = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

  const EMOJIS = ['📚', '🏃', '💧', '🧘', '💪', '🥗', '😴', '✍️', '🎸', '🧹', '💊', '🌞'];
  const COLORS = ['#7c5cfc', '#4dd9a6', '#ff9f43', '#ff6b7a', '#4db8ff', '#f472b6'];

  let habits = load(HABITS_KEY, []);
  let checks = load(CHECKS_KEY, {});
  let plan = load(PLAN_KEY, { avec: {}, sans: {} });
  let weekMode = 'avec';
  let view = 'today';
  let editingId = null;
  let draftEmoji = EMOJIS[0];
  let draftColor = COLORS[0];

  const main = document.getElementById('main');
  const viewTitle = document.getElementById('viewTitle');
  const viewSubtitle = document.getElementById('viewSubtitle');
  const addBtn = document.getElementById('addBtn');
  const dialog = document.getElementById('habitDialog');
  const dialogTitle = document.getElementById('dialogTitle');
  const habitForm = document.getElementById('habitForm');
  const habitName = document.getElementById('habitName');
  const deleteBtn = document.getElementById('deleteBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const toast = document.getElementById('toast');

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function save() {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
    localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  function todayKey() { return dateKey(new Date()); }

  function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function isChecked(habitId, key) {
    return Boolean(checks[key] && checks[key][habitId]);
  }

  function toggle(habitId, key) {
    if (!checks[key]) checks[key] = {};
    if (checks[key][habitId]) {
      delete checks[key][habitId];
      if (Object.keys(checks[key]).length === 0) delete checks[key];
    } else {
      checks[key][habitId] = 1;
    }
    save();
  }

  function streakOf(habitId, refKey = todayKey()) {
    const d = keyToDate(refKey);
    let streak = 0;
    if (!isChecked(habitId, dateKey(d))) d.setDate(d.getDate() - 1);
    while (isChecked(habitId, dateKey(d))) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function rateOver(habitId, days) {
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    let done = 0;
    const end = new Date();
    for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      if (isChecked(habitId, dateKey(d))) done += 1;
    }
    return done / days;
  }

  function bestStreak() {
    return habits.reduce((max, h) => Math.max(max, streakOf(h.id)), 0);
  }

  function todayDoneCount() {
    return habits.filter((h) => isChecked(h.id, todayKey())).length;
  }

  /* ===== Rendu ===== */

  function render() {
    const titles = { today: "Aujourd'hui", habits: 'Mes habitudes', week: 'Ma semaine', stats: 'Statistiques' };
    if (view === 'week') viewTitle.textContent = weekMode === 'avec' ? 'Semaine avec enfants' : 'Semaine sans enfants';
    else viewTitle.textContent = titles[view];

    viewSubtitle.textContent = '';

    if (view === 'today') renderToday();
    else if (view === 'habits') renderManage();
    else if (view === 'week') renderWeek();
    else renderStats();

    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.view === view);
    });
  }

  function renderWeek() {
    if (habits.length === 0) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="big">🗓️</div>
          <h2>Planifiez votre semaine</h2>
          <p>Créez d'abord des habitudes dans l'onglet <strong>Habitudes</strong>, puis composez ici vos journées types.</p>
        </div>`;
      return;
    }
    const modePlan = plan[weekMode] || {};
    const headCells = WEEK_DAYS.map((d) =>
      `<div class="wk-head-cell">${DAYS_FR[d]}</div>`).join('');

    const rows = habits.map((h) => {
      const count = WEEK_DAYS.filter((d) => modePlan[d] && modePlan[d][h.id]).length;
      const cells = WEEK_DAYS.map((d) => {
        const on = Boolean(modePlan[d] && modePlan[d][h.id]);
        return `<div class="wk-cell ${on ? 'on' : ''}" data-h="${h.id}" data-d="${d}" data-m="${weekMode}" role="button" aria-label="${esc(h.name)} le ${DAYS_FR[d]}"></div>`;
      }).join('');
      return `
      <div class="wk-row" style="--habit-color:${h.color}">
        <div class="wk-name">
          <span class="nm">${h.emoji} ${esc(h.name)}</span>
          <span class="cnt">${count}/7</span>
        </div>
        ${cells}
      </div>`;
    }).join('');

    main.innerHTML = `
      <div class="seg">
        <button type="button" class="seg-btn ${weekMode === 'avec' ? 'active' : ''}" data-week-mode="avec">Avec les enfants</button>
        <button type="button" class="seg-btn ${weekMode === 'sans' ? 'active' : ''}" data-week-mode="sans">Sans les enfants</button>
      </div>
      <div class="week-table">
        <div class="wk-row wk-header">
          <div class="wk-head-cell name-col">Habitude</div>
          ${headCells}
        </div>
        ${rows}
      </div>
      <p class="wk-help">Touchez une case pour placer cette habitude dans la journée (recto = programmée). Ce planning s'applique à toutes les semaines ${weekMode === 'avec' ? 'avec' : 'sans'} les enfants, sans date ni calendrier.</p>`;
  }

  function renderToday() {
    if (habits.length === 0) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="big">🌱</div>
          <h2>Commencez votre routine</h2>
          <p>Appuyez sur <strong>+</strong> pour créer votre première habitude.</p>
        </div>`;
      return;
    }
    const done = habits.filter((h) => isChecked(h.id, todayKey())).length;
    const pct = Math.round((done / habits.length) * 100);
    const cards = habits.map((h) => {
      const checked = isChecked(h.id, todayKey());
      const streak = streakOf(h.id);
      const meta = `<span class="streak-flame">🔥 ${streak} jour${streak > 1 ? 's' : ''}</span>`;
      return `
        <div class="habit-card ${checked ? 'done' : ''}" data-id="${h.id}" style="--habit-color:${h.color}">
          <div class="check-circle">${checked ? '✓' : h.emoji}</div>
          <div class="habit-info">
            <div class="habit-name"><span class="habit-emoji">${h.emoji}</span>${esc(h.name)}</div>
            <div class="habit-meta">${meta}</div>
          </div>
        </div>`;
    }).join('');
    main.innerHTML = `
      <div class="progress-wrap">
        <div class="progress-label">${done} / ${habits.length} habitude${habits.length > 1 ? 's' : ''} complétée${done > 1 ? 's' : ''} · ${pct}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${cards}`;
  }

  function renderManage() {
    if (habits.length === 0) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="big">🎯</div>
          <h2>Aucune habitude</h2>
          <p>Créez-en une avec le bouton <strong>+</strong> en haut à droite.</p>
        </div>`;
      return;
    }
    main.innerHTML = habits.map((h) => {
      const streak = streakOf(h.id);
      const planned = WEEK_DAYS.filter((d) =>
        (plan.avec[d] && plan.avec[d][h.id]) || (plan.sans[d] && plan.sans[d][h.id])).length;
      return `
      <div class="manage-card">
        <div class="swatch" style="background:${h.color}"></div>
        <div class="habit-info">
          <div class="habit-name"><span class="habit-emoji">${h.emoji}</span>${esc(h.name)}</div>
          <div class="habit-meta">
            <span class="streak-flame">🔥 ${streak} jour${streak > 1 ? 's' : ''}</span>
            <span>${planned} jour${planned > 1 ? 's' : ''} par semaine</span>
          </div>
        </div>
        <div class="manage-actions">
          <button class="icon-btn" data-edit="${h.id}" aria-label="Modifier">✏️</button>
          <button class="icon-btn" data-del="${h.id}" aria-label="Supprimer">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderStats() {
    if (habits.length === 0) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="big">📊</div>
          <h2>Pas encore de données</h2>
          <p>Créez une habitude et cochez-la quelques jours pour voir vos statistiques.</p>
        </div>`;
      return;
    }
    const grid = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      grid.push(d);
    }
    const dayColumns = [...grid].sort(
      (a, b) => (a.getDay() === 0 ? 7 : a.getDay()) - (b.getDay() === 0 ? 7 : b.getDay()),
    );

    const habitBlocks = habits.map((h) => {
      const rate = Math.round(rateOver(h.id, 30) * 100);
      const streak = streakOf(h.id);
      const cells = dayColumns.map((d) => {
        const on = isChecked(h.id, dateKey(d));
        return `<div class="week-day">
            <div class="dot ${on ? 'on' : ''}" style="${on ? `background:${h.color};border-color:${h.color}` : ''}">${on ? '✓' : ''}</div>
            <div class="lbl">${DAYS_FR[d.getDay()]}</div>
          </div>`;
      }).join('');
      return `
        <div class="stat-habit">
          <div class="stat-habit-head">
            <span class="name">${h.emoji} ${esc(h.name)}</span>
            <span class="rate">${rate}% sur 30 jours · 🔥 ${streak}</span>
          </div>
          <div class="week-grid">${cells}</div>
        </div>`;
    }).join('');

    main.innerHTML = `
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">${todayDoneCount()}/${habits.length}</div>
          <div class="stat-label">Aujourd'hui</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">🔥 ${bestStreak()}</div>
          <div class="stat-label">Meilleure série</div>
        </div>
      </div>
      ${habitBlocks}`;
  }

  /* ===== Dialog ===== */

  function buildEmojiPicker() {
    document.getElementById('emojiPicker').innerHTML = EMOJIS.map((e) => `
      <button type="button" class="emoji-opt ${e === draftEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
    `).join('');
  }

  function buildColorPicker() {
    document.getElementById('colorPicker').innerHTML = COLORS.map((c) => `
      <button type="button" class="color-opt ${c === draftColor ? 'selected' : ''}" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>
    `).join('');
  }

  function openDialog(habit) {
    editingId = habit ? habit.id : null;
    dialogTitle.textContent = habit ? "Modifier l'habitude" : 'Nouvelle habitude';
    document.getElementById('saveBtn').textContent = habit ? 'Enregistrer' : 'Ajouter';
    habitName.value = habit ? habit.name : '';
    draftEmoji = habit ? habit.emoji : EMOJIS[0];
    draftColor = habit ? habit.color : COLORS[0];
    deleteBtn.classList.toggle('hidden', !habit);
    buildEmojiPicker();
    buildColorPicker();
    dialog.showModal();
    habitName.focus();
  }

  function closeDialog() {
    dialog.close();
    editingId = null;
  }

  /* ===== Événements ===== */

  addBtn.addEventListener('click', () => openDialog(null));
  cancelBtn.addEventListener('click', closeDialog);

  habitForm.addEventListener('click', (e) => {
    const emojiBtn = e.target.closest('[data-emoji]');
    if (emojiBtn) {
      draftEmoji = emojiBtn.dataset.emoji;
      buildEmojiPicker();
      return;
    }
    const colorBtn = e.target.closest('[data-color]');
    if (colorBtn) {
      draftColor = colorBtn.dataset.color;
      buildColorPicker();
    }
  });

  habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = habitName.value.trim();
    if (!name) return;
    if (editingId) {
      const habit = habits.find((h) => h.id === editingId);
      if (habit) Object.assign(habit, { name, emoji: draftEmoji, color: draftColor });
      showToast('Habitude mise à jour');
    } else {
      habits.push({
        id: `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name,
        emoji: draftEmoji,
        color: draftColor,
        createdAt: todayKey(),
      });
      showToast('Habitude ajoutée 🎉');
    }
    save();
    closeDialog();
    render();
  });

  deleteBtn.addEventListener('click', () => {
    if (!editingId) return;
    habits = habits.filter((h) => h.id !== editingId);
    Object.values(checks).forEach((day) => delete day[editingId]);
    save();
    closeDialog();
    render();
  });

  main.addEventListener('click', (e) => {
    const cell = e.target.closest('.wk-cell');
    if (cell) {
      const mode = cell.dataset.m || weekMode;
      const day = cell.dataset.d;
      if (!plan[mode]) plan[mode] = {};
      if (!plan[mode][day]) plan[mode][day] = {};
      if (plan[mode][day][cell.dataset.h]) {
        delete plan[mode][day][cell.dataset.h];
        if (Object.keys(plan[mode][day]).length === 0) delete plan[mode][day];
      } else {
        plan[mode][day][cell.dataset.h] = 1;
      }
      save();
      render();
      return;
    }
    const segBtn = e.target.closest('[data-week-mode]');
    if (segBtn) {
      weekMode = segBtn.dataset.weekMode;
      render();
      return;
    }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      openDialog(habits.find((h) => h.id === editBtn.dataset.edit));
      return;
    }
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      const habit = habits.find((h) => h.id === delBtn.dataset.del);
      if (habit && confirm(`Supprimer « ${habit.name} » et son historique ?`)) {
        habits = habits.filter((h) => h.id !== habit.id);
        Object.values(checks).forEach((day) => delete day[habit.id]);
        save();
        render();
      }
      return;
    }
    const card = e.target.closest('.habit-card');
    if (card) {
      toggle(card.dataset.id, todayKey());
      render();
    }
  });

  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) {
      view = tab.dataset.view;
      render();
      window.scrollTo({ top: 0 });
    }
  });

  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
  }

  render();
})();
