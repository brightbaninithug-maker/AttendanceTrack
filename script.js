/* ============================================================
   SUPABASE CONFIG  (paste your own values)
   Project Settings -> API: "Project URL" and the anon/publishable key.
   NEVER put the service_role key here.
   ============================================================ */
const SUPABASE_URL = 'https://itftrzhiosaksvngikwh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tsjOfM_rGn-VE3vqOMvElg_QDq_qrC4';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   APPLICATION STATE
   ============================================================ */
const APP = {
  students: [],        // loaded from Supabase
  currentUser: null,   // { id, email, name, role }
  searchFilter: ''
};

/* ============================================================
   ELEMENT REFERENCES
   ============================================================ */
const authWrapper       = document.getElementById('authWrapper');
const loginCard         = document.getElementById('loginCard');
const registerCard      = document.getElementById('registerCard');
const loginForm         = document.getElementById('loginForm');
const registerForm      = document.getElementById('registerForm');
const loginError        = document.getElementById('loginError');
const registerError     = document.getElementById('registerError');
const registerSuccess   = document.getElementById('registerSuccess');
const goRegister        = document.getElementById('goRegister');
const goLogin           = document.getElementById('goLogin');

const dashboard         = document.getElementById('dashboard');
const currentUserName   = document.getElementById('currentUserName');
const currentUserRole   = document.getElementById('currentUserRole');
const logoutBtn         = document.getElementById('logoutBtn');
const statTotal         = document.getElementById('statTotal');
const statPresent       = document.getElementById('statPresent');
const statAbsent        = document.getElementById('statAbsent');
const statRate          = document.getElementById('statRate');
const addStudentForm    = document.getElementById('addStudentForm');
const addSuccess        = document.getElementById('addSuccess');
const addError          = document.getElementById('addError');
const studentTableBody  = document.getElementById('studentTableBody');
const studentSearch     = document.getElementById('studentSearch');

/* ============================================================
   HELPERS
   ============================================================ */
function showAlert(el, message, ms = 4000) {
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function setBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = busy;
}

/* ============================================================
   AUTH: SWITCH BETWEEN LOGIN / REGISTER
   ============================================================ */
function showCard(which) {
  loginCard.classList.toggle('active', which === 'login');
  registerCard.classList.toggle('active', which === 'register');
  loginError.classList.remove('show');
  registerError.classList.remove('show');
  registerSuccess.classList.remove('show');
}

goRegister.addEventListener('click', () => showCard('register'));
goLogin.addEventListener('click', () => showCard('login'));

/* ============================================================
   AUTH: LOGIN
   ============================================================ */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBusy(loginForm, true);

  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    showAlert(loginError, '❌ ' + error.message);
    setBusy(loginForm, false);
    return;
  }

  const ok = await enterDashboard();
  if (ok) loginForm.reset();
  setBusy(loginForm, false);
});

/* ============================================================
   AUTH: REGISTER
   ============================================================ */
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBusy(registerForm, true);

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const role     = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;
  const confirmPw = document.getElementById('regConfirm').value;

  if (password !== confirmPw) {
    showAlert(registerError, '❌ Passwords do not match.');
    setBusy(registerForm, false);
    return;
  }

  // name + role are picked up by the database trigger to create the profile
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name, role } }
  });

  if (error) {
    showAlert(registerError, '❌ ' + error.message);
    setBusy(registerForm, false);
    return;
  }

  registerForm.reset();
  showAlert(
    registerSuccess,
    '✅ Account created. Confirm your email if asked, then wait for an administrator to approve your account before signing in.',
    7000
  );
  document.getElementById('loginEmail').value = email;
  setBusy(registerForm, false);
  setTimeout(() => showCard('login'), 4500);

  // If email confirmation is off, signUp logs the user in; sign out so
  // they must be approved first.
  await sb.auth.signOut();
});

/* ============================================================
   SESSION: ENTER / LEAVE DASHBOARD
   ============================================================ */
async function enterDashboard() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('name, role, approved')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    await sb.auth.signOut();
    showAlert(loginError, '❌ Could not load your profile. Please contact an administrator.');
    return false;
  }

  if (!profile.approved) {
    await sb.auth.signOut();
    showAlert(loginError, '⏳ Your account is awaiting approval by an administrator.', 6000);
    return false;
  }

  APP.currentUser = { id: user.id, email: user.email, name: profile.name, role: profile.role };

  authWrapper.style.display = 'none';
  dashboard.classList.add('active');
  currentUserName.textContent = profile.name;
  currentUserRole.textContent = profile.role;

  addStudentForm.reset();
  studentSearch.value = '';
  APP.searchFilter = '';

  await loadStudents();
  return true;
}

function leaveDashboard() {
  dashboard.classList.remove('active');
  authWrapper.style.display = 'block';
  showCard('login');
  APP.currentUser = null;
  APP.students = [];
}

logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  leaveDashboard();
});

/* ============================================================
   DATA: STUDENTS (Supabase)
   ============================================================ */
async function loadStudents() {
  const { data, error } = await sb
    .from('students')
    .select('id, student_id, name, class_name, present')
    .order('name', { ascending: true });

  if (error) {
    showAlert(addError, '❌ Could not load students: ' + error.message);
    return;
  }

  APP.students = data.map(r => ({
    uuid: r.id,
    id: r.student_id,
    name: r.name,
    className: r.class_name,
    present: r.present
  }));
  renderDashboard();
}

/* ============================================================
   DASHBOARD: RENDER
   ============================================================ */
function renderDashboard() {
  renderStats();
  renderStudentTable();
}

function renderStats() {
  const total   = APP.students.length;
  const present = APP.students.filter(s => s.present).length;
  const absent  = total - present;
  const rate    = total === 0 ? 0 : Math.round((present / total) * 100);

  statTotal.textContent   = total;
  statPresent.textContent = present;
  statAbsent.textContent  = absent;
  statRate.textContent    = rate + '%';
}

function renderStudentTable() {
  const filter = APP.searchFilter.toLowerCase();

  const filtered = APP.students.filter(s =>
    s.name.toLowerCase().includes(filter) ||
    s.id.toLowerCase().includes(filter) ||
    s.className.toLowerCase().includes(filter)
  );

  if (filtered.length === 0) {
    studentTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          ${APP.students.length === 0
            ? 'No students registered yet. Add your first student using the form on the left.'
            : 'No students match your search.'}
        </td>
      </tr>`;
    return;
  }

  let html = '';
  filtered.forEach(student => {
    const statusClass = student.present ? 'badge-present' : 'badge-absent';
    const statusText  = student.present ? 'Present' : 'Absent';
    const actionLabel = student.present ? 'Mark Absent' : 'Mark Present';

    html += `
      <tr>
        <td>
          <span class="avatar-sm">${escapeHtml(getInitials(student.name))}</span>
          ${escapeHtml(student.name)}
        </td>
        <td>${escapeHtml(student.id)}</td>
        <td>${escapeHtml(student.className)}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="btn-toggle" data-action="toggle" data-uuid="${student.uuid}">
            ${actionLabel}
          </button>
          <button class="btn-remove" data-action="remove" data-uuid="${student.uuid}" title="Remove student">
            🗑️
          </button>
        </td>
      </tr>`;
  });

  studentTableBody.innerHTML = html;
}

/* ============================================================
   DASHBOARD: TOGGLE / REMOVE
   ============================================================ */
studentTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const student = APP.students.find(s => s.uuid === btn.dataset.uuid);
  if (!student) return;

  if (action === 'toggle') {
    btn.disabled = true;
    const { error } = await sb
      .from('students')
      .update({ present: !student.present })
      .eq('id', student.uuid);

    if (error) {
      showAlert(addError, '❌ ' + error.message);
      btn.disabled = false;
      return;
    }
    student.present = !student.present;
    renderDashboard();
  }

  if (action === 'remove') {
    if (!confirm(`Remove "${student.name}" from the register?`)) return;

    const { error } = await sb.from('students').delete().eq('id', student.uuid);
    if (error) {
      showAlert(addError, '❌ ' + error.message);
      return;
    }
    APP.students = APP.students.filter(s => s.uuid !== student.uuid);
    renderDashboard();
  }
});

/* ============================================================
   DASHBOARD: SEARCH
   ============================================================ */
studentSearch.addEventListener('input', (e) => {
  APP.searchFilter = e.target.value.trim();
  renderStudentTable();
});

/* ============================================================
   DASHBOARD: ADD STUDENT
   ============================================================ */
addStudentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBusy(addStudentForm, true);

  const name      = document.getElementById('studentName').value.trim();
  const id        = document.getElementById('studentId').value.trim().toUpperCase();
  const className = document.getElementById('studentClass').value.trim();

  if (!name || !id || !className) {
    showAlert(addError, '❌ All fields are required.');
    setBusy(addStudentForm, false);
    return;
  }

  const { error } = await sb.from('students').insert({
    student_id: id,
    name,
    class_name: className,
    present: false
  });

  if (error) {
    const msg = error.code === '23505'
      ? `A student with ID "${id}" already exists.`
      : error.message;
    showAlert(addError, '❌ ' + msg);
    setBusy(addStudentForm, false);
    return;
  }

  showAlert(addSuccess, `✅ "${name}" added successfully.`);
  addStudentForm.reset();
  await loadStudents();
  setBusy(addStudentForm, false);
});

/* ============================================================
   INIT: restore an existing session on page load
   ============================================================ */
(async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enterDashboard();
})();
