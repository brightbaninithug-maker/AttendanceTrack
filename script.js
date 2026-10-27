/* ============================================================
   SUPABASE CONFIG  (paste your own values)
   Project Settings -> API: "Project URL" and the anon/publishable key.
   NEVER put the service_role key here.
   ============================================================ */
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   TABLE OF CONTENTS
   ------------------------------------------------------------
   1.  Application State
   2.  DOM Element References
   3.  Utility Helpers
   4.  Navigation (Home / Auth / Dashboard / Student Portal)
   5.  Admin Auth: Login
   6.  Admin Auth: Register
   7.  Admin Dashboard: Data + Rendering
   8.  Admin Dashboard: Student Table Actions
   9.  Admin Dashboard: Add / Search / Logout
   10. Student Auth: Login / Logout
   11. Student Portal: Rendering
   12. Init
   ============================================================ */


/* ============================================================
   1. APPLICATION STATE
   ============================================================ */
const APP = {
  students: [],        // loaded from Supabase (with today's attendance merged in)
  currentUser: null,   // { id, email, name, role }
  searchFilter: ''
};


/* ============================================================
   2. DOM ELEMENT REFERENCES
   ============================================================ */

/* --- Home --- */
const homePage       = document.getElementById('homePage');
const homeAdminBtn   = document.getElementById('homeAdminBtn');
const homeStudentBtn = document.getElementById('homeStudentBtn');

/* --- Admin Auth --- */
const authWrapper      = document.getElementById('authWrapper');
const loginCard        = document.getElementById('loginCard');
const registerCard     = document.getElementById('registerCard');
const loginForm        = document.getElementById('loginForm');
const registerForm     = document.getElementById('registerForm');
const loginError       = document.getElementById('loginError');
const registerError    = document.getElementById('registerError');
const registerSuccess  = document.getElementById('registerSuccess');
const goRegister       = document.getElementById('goRegister');
const goLogin          = document.getElementById('goLogin');
const backFromLogin    = document.getElementById('backFromLogin');
const backFromRegister = document.getElementById('backFromRegister');

/* --- Admin Dashboard --- */
const dashboard        = document.getElementById('dashboard');
const currentUserName  = document.getElementById('currentUserName');
const currentUserRole  = document.getElementById('currentUserRole');
const logoutBtn        = document.getElementById('logoutBtn');
const statTotal        = document.getElementById('statTotal');
const statPresent      = document.getElementById('statPresent');
const statAbsent       = document.getElementById('statAbsent');
const statRate         = document.getElementById('statRate');
const addStudentForm   = document.getElementById('addStudentForm');
const addSuccess       = document.getElementById('addSuccess');
const addError         = document.getElementById('addError');
const studentTableBody = document.getElementById('studentTableBody');
const studentSearch    = document.getElementById('studentSearch');

/* --- Student Auth --- */
const studentAuthWrapper = document.getElementById('studentAuthWrapper');
const studentLoginForm   = document.getElementById('studentLoginForm');
const studentLoginError  = document.getElementById('studentLoginError');
const backFromStudent    = document.getElementById('backFromStudent');

/* --- Student Portal --- */
const studentPortal    = document.getElementById('studentPortal');
const studentLogoutBtn = document.getElementById('studentLogoutBtn');
const spAvatar         = document.getElementById('spAvatar');
const spName           = document.getElementById('spName');
const spId             = document.getElementById('spId');
const spClass          = document.getElementById('spClass');
const spStatusBox      = document.getElementById('spStatusBox');
const spStatusValue    = document.getElementById('spStatusValue');
const spTotalDays      = document.getElementById('spTotalDays');
const spDaysPresent    = document.getElementById('spDaysPresent');
const spPercentage     = document.getElementById('spPercentage');


/* ============================================================
   3. UTILITY HELPERS
   ============================================================ */
function showAlert(el, message, ms = 4000) {
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
}

function getInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Today's date as YYYY-MM-DD in the visitor's local time. */
function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function setBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = busy;
}


/* ============================================================
   4. NAVIGATION
   ============================================================ */
function showHome() {
  homePage.classList.add('active');
  authWrapper.classList.remove('active');
  studentAuthWrapper.classList.remove('active');
  dashboard.classList.remove('active');
  studentPortal.classList.remove('active');
  APP.currentUser = null;
}

function showAdminAuth(view = 'login') {
  homePage.classList.remove('active');
  studentAuthWrapper.classList.remove('active');
  dashboard.classList.remove('active');
  studentPortal.classList.remove('active');
  authWrapper.classList.add('active');

  if (view === 'register') {
    loginCard.classList.remove('active');
    registerCard.classList.add('active');
  } else {
    registerCard.classList.remove('active');
    loginCard.classList.add('active');
  }
}

function showStudentAuth() {
  homePage.classList.remove('active');
  authWrapper.classList.remove('active');
  dashboard.classList.remove('active');
  studentPortal.classList.remove('active');
  studentAuthWrapper.classList.add('active');
}

function showDashboard() {
  homePage.classList.remove('active');
  authWrapper.classList.remove('active');
  studentAuthWrapper.classList.remove('active');
  studentPortal.classList.remove('active');
  dashboard.classList.add('active');

  currentUserName.textContent = APP.currentUser.name;
  currentUserRole.textContent = APP.currentUser.role;

  addStudentForm.reset();
  studentSearch.value = '';
  APP.searchFilter = '';
}

function showStudentPortal(data) {
  studentAuthWrapper.classList.remove('active');
  studentPortal.classList.add('active');
  renderStudentPortal(data);
}

/* --- Navigation button bindings --- */
homeAdminBtn.addEventListener('click', async () => {
  // If an approved admin session already exists, go straight in
  const { data: { session } } = await sb.auth.getSession();
  if (session && await enterDashboard()) return;
  showAdminAuth('login');
});
homeStudentBtn.addEventListener('click', showStudentAuth);

goRegister.addEventListener('click', () => showAdminAuth('register'));
goLogin.addEventListener('click', () => showAdminAuth('login'));
backFromLogin.addEventListener('click', showHome);
backFromRegister.addEventListener('click', showHome);
backFromStudent.addEventListener('click', showHome);


/* ============================================================
   5. ADMIN AUTH: LOGIN
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

/**
 * Loads the signed-in user's profile, checks approval, then shows the
 * dashboard. Returns true on success.
 */
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
    showAdminAuth('login');
    showAlert(loginError, '❌ Could not load your profile. Please contact an administrator.');
    return false;
  }

  if (!profile.approved) {
    await sb.auth.signOut();
    showAdminAuth('login');
    showAlert(loginError, '⏳ Your account is awaiting approval by an administrator.', 6000);
    return false;
  }

  APP.currentUser = { id: user.id, email: user.email, name: profile.name, role: profile.role };
  showDashboard();
  await loadStudents();
  return true;
}


/* ============================================================
   6. ADMIN AUTH: REGISTER
   ============================================================ */
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBusy(registerForm, true);

  const name      = document.getElementById('regName').value.trim();
  const email     = document.getElementById('regEmail').value.trim().toLowerCase();
  const role      = document.getElementById('regRole').value;
  const password  = document.getElementById('regPassword').value;
  const confirmPw = document.getElementById('regConfirm').value;

  if (password !== confirmPw) {
    showAlert(registerError, '❌ Passwords do not match.');
    setBusy(registerForm, false);
    return;
  }

  // name + role are picked up by a database trigger that creates the profile
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

  // If email confirmation is off, signUp may log the user in; sign out so
  // they have to be approved first.
  await sb.auth.signOut();

  registerError.classList.remove('show');
  showAlert(
    registerSuccess,
    '✅ Account created. Confirm your email if asked, then wait for an administrator to approve it before signing in.',
    7000
  );
  registerForm.reset();
  setBusy(registerForm, false);

  setTimeout(() => {
    showAdminAuth('login');
    document.getElementById('loginEmail').value = email;
  }, 4500);
});


/* ============================================================
   7. ADMIN DASHBOARD: DATA + RENDERING
   ============================================================ */
async function loadStudents() {
  const [studentsRes, attendanceRes] = await Promise.all([
    sb.from('students')
      .select('id, student_id, name, class_name')
      .order('name', { ascending: true }),
    sb.from('attendance')
      .select('student_uuid, present')
      .eq('date', todayStr())
  ]);

  if (studentsRes.error || attendanceRes.error) {
    const msg = (studentsRes.error || attendanceRes.error).message;
    showAlert(addError, '❌ Could not load data: ' + msg);
    return;
  }

  const presentToday = new Map(
    attendanceRes.data.map(a => [a.student_uuid, a.present])
  );

  APP.students = studentsRes.data.map(r => ({
    uuid: r.id,
    id: r.student_id,
    name: r.name,
    className: r.class_name,
    present: presentToday.get(r.id) === true   // not marked yet = absent
  }));

  renderDashboard();
}

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
   8. ADMIN DASHBOARD: STUDENT TABLE ACTIONS
   ============================================================ */
studentTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const student = APP.students.find(s => s.uuid === btn.dataset.uuid);
  if (!student) return;

  if (btn.dataset.action === 'toggle') {
    btn.disabled = true;
    const newValue = !student.present;

    // One attendance row per student per day; upsert creates or updates it
    const { error } = await sb.from('attendance').upsert(
      { student_uuid: student.uuid, date: todayStr(), present: newValue },
      { onConflict: 'student_uuid,date' }
    );

    if (error) {
      showAlert(addError, '❌ ' + error.message);
      btn.disabled = false;
      return;
    }
    student.present = newValue;
    renderDashboard();
  }

  if (btn.dataset.action === 'remove') {
    if (!confirm(`Remove "${student.name}" from the register? Their attendance history will be deleted too.`)) return;

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
   9. ADMIN DASHBOARD: ADD / SEARCH / LOGOUT
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
    class_name: className
  });

  if (error) {
    const msg = error.code === '23505'
      ? `A student with ID "${id}" already exists.`
      : error.message;
    showAlert(addError, '❌ ' + msg);
    setBusy(addStudentForm, false);
    return;
  }

  addError.classList.remove('show');
  showAlert(addSuccess, `✅ "${name}" added successfully.`);
  addStudentForm.reset();
  await loadStudents();
  setBusy(addStudentForm, false);
});

studentSearch.addEventListener('input', (e) => {
  APP.searchFilter = e.target.value.trim();
  renderStudentTable();
});

logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  APP.currentUser = null;
  APP.students = [];
  showHome();
});


/* ============================================================
   10. STUDENT AUTH: LOGIN / LOGOUT
   The student never touches the tables directly. A database
   function checks the school code and returns only their record.
   ============================================================ */
studentLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setBusy(studentLoginForm, true);

  const id   = document.getElementById('studentLoginId').value.trim();
  const code = document.getElementById('studentLoginCode').value.trim();

  const { data, error } = await sb.rpc('get_student_attendance', {
    p_student_id: id,
    p_code: code,
    p_today: todayStr()
  });

  setBusy(studentLoginForm, false);

  if (error) {
    showAlert(studentLoginError, '❌ ' + error.message);
    return;
  }

  if (!data) {
    showAlert(studentLoginError, '❌ Invalid Student ID or school code.');
    return;
  }

  studentLoginForm.reset();
  studentLoginError.classList.remove('show');
  showStudentPortal(data);
});

studentLogoutBtn.addEventListener('click', () => {
  studentPortal.classList.remove('active');
  showHome();
});


/* ============================================================
   11. STUDENT PORTAL: RENDERING
   ============================================================ */
function renderStudentPortal(d) {
  spAvatar.textContent = getInitials(d.name);
  spName.textContent   = d.name;
  spId.textContent     = d.student_id;
  spClass.textContent  = d.class_name;

  if (d.today_present) {
    spStatusBox.classList.add('present');
    spStatusBox.classList.remove('absent');
    spStatusValue.textContent = 'Present';
  } else {
    spStatusBox.classList.add('absent');
    spStatusBox.classList.remove('present');
    spStatusValue.textContent = 'Absent';
  }

  spTotalDays.textContent   = d.total_days;
  spDaysPresent.textContent = d.days_present;
  spPercentage.textContent  = d.total_days === 0
    ? '—'
    : Math.round((d.days_present / d.total_days) * 100) + '%';
}


/* ============================================================
   12. INIT
   ============================================================ */
// Always start on the home page. If an approved admin session is
// still valid, the "Admin Portal" button takes them straight in.
showHome();
