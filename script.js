/* ============================================================
   TABLE OF CONTENTS
   ------------------------------------------------------------
   1.  Application State (users, students, currentUser)
   2.  DOM Element References
   3.  Utility Helpers
   4.  Navigation (Home ↔ Auth ↔ Dashboard ↔ Student Portal)
   5.  Admin Auth — Login
   6.  Admin Auth — Register
   7.  Admin Dashboard — Rendering
   8.  Admin Dashboard — Student Table Actions
   9.  Admin Dashboard — Add / Search / Logout
   10. Student Auth — Login / Logout
   11. Student Portal — Rendering
   12. Init
   ============================================================ */


/* ============================================================
   1. APPLICATION STATE
   ============================================================ */
const APP = {
  // Registered admin accounts (demo: in-memory)
  users: [
    {
      name: 'System Admin',
      email: 'admin@school.edu',
      password: 'admin123',
      role: 'admin'
    }
  ],

  // Student register (demo: in-memory)
  students: [
    { id: 'STU-001', name: 'Emma Johnson',     className: 'Form 1A', present: true  },
    { id: 'STU-002', name: 'Liam Chen',        className: 'Form 1A', present: false },
    { id: 'STU-003', name: 'Sophia Rodriguez', className: 'Form 1B', present: true  },
    { id: 'STU-004', name: 'Noah Williams',    className: 'Form 2A', present: false },
    { id: 'STU-005', name: 'Olivia Brown',     className: 'Form 2A', present: true  },
    { id: 'STU-006', name: 'Ethan Davis',      className: 'Form 2B', present: true  }
  ],

  // Shared school code for student login
  schoolCode: 'SCHOOL2024',

  // Currently logged-in admin
  currentUser: null,

  // Search filter for admin student table
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
const studentPortal   = document.getElementById('studentPortal');
const studentLogoutBtn = document.getElementById('studentLogoutBtn');
const spAvatar        = document.getElementById('spAvatar');
const spName          = document.getElementById('spName');
const spId            = document.getElementById('spId');
const spClass         = document.getElementById('spClass');
const spStatusBox     = document.getElementById('spStatusBox');
const spStatusValue   = document.getElementById('spStatusValue');
const spTotalDays     = document.getElementById('spTotalDays');
const spDaysPresent   = document.getElementById('spDaysPresent');
const spPercentage    = document.getElementById('spPercentage');


/* ============================================================
   3. UTILITY HELPERS
   ============================================================ */
function showAlert(el, message) {
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
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


/* ============================================================
   4. NAVIGATION
   ============================================================ */

/** Show the home/landing page. */
function showHome() {
  homePage.classList.add('active');
  authWrapper.classList.remove('active');
  studentAuthWrapper.classList.remove('active');
  dashboard.classList.remove('active');
  studentPortal.classList.remove('active');
  APP.currentUser = null;
}

/** Show admin login or register. */
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

/** Show student login. */
function showStudentAuth() {
  homePage.classList.remove('active');
  authWrapper.classList.remove('active');
  dashboard.classList.remove('active');
  studentPortal.classList.remove('active');
  studentAuthWrapper.classList.add('active');
}

/** Show the admin dashboard. */
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

  renderDashboard();
}

/** Show the student portal. */
function showStudentPortal(student) {
  studentAuthWrapper.classList.remove('active');
  studentPortal.classList.add('active');
  renderStudentPortal(student);
}

/* --- Navigation button bindings --- */
homeAdminBtn.addEventListener('click', () => showAdminAuth('login'));
homeStudentBtn.addEventListener('click', showStudentAuth);

goRegister.addEventListener('click', () => showAdminAuth('register'));
goLogin.addEventListener('click', () => showAdminAuth('login'));
backFromLogin.addEventListener('click', showHome);
backFromRegister.addEventListener('click', showHome);
backFromStudent.addEventListener('click', showHome);


/* ============================================================
   5. ADMIN AUTH — LOGIN
   ============================================================ */
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const user = APP.users.find(
    u => u.email.toLowerCase() === email && u.password === password
  );

  if (!user) {
    showAlert(loginError, '❌ Invalid email or password. Please try again.');
    return;
  }

  APP.currentUser = user;
  loginError.classList.remove('show');
  loginForm.reset();

  showDashboard();
});


/* ============================================================
   6. ADMIN AUTH — REGISTER
   ============================================================ */
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const role     = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  if (password !== confirm) {
    showAlert(registerError, '❌ Passwords do not match.');
    return;
  }

  if (APP.users.some(u => u.email.toLowerCase() === email)) {
    showAlert(registerError, '❌ An account with this email already exists.');
    return;
  }

  APP.users.push({ name, email, password, role });

  registerError.classList.remove('show');
  showAlert(registerSuccess, '✅ Account created successfully! You can now sign in.');

  registerForm.reset();

  setTimeout(() => {
    showAdminAuth('login');
    document.getElementById('loginEmail').value = email;
  }, 1800);
});


/* ============================================================
   7. ADMIN DASHBOARD — RENDERING
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
          <span class="avatar-sm">${getInitials(student.name)}</span>
          ${escapeHtml(student.name)}
        </td>
        <td>${escapeHtml(student.id)}</td>
        <td>${escapeHtml(student.className)}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="btn-toggle" data-action="toggle" data-id="${student.id}">
            ${actionLabel}
          </button>
          <button class="btn-remove" data-action="remove" data-id="${student.id}" title="Remove student">
            🗑️
          </button>
        </td>
      </tr>`;
  });

  studentTableBody.innerHTML = html;
}


/* ============================================================
   8. ADMIN DASHBOARD — STUDENT TABLE ACTIONS
   ============================================================ */
studentTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action    = btn.dataset.action;
  const studentId = btn.dataset.id;

  if (action === 'toggle') {
    const student = APP.students.find(s => s.id === studentId);
    if (student) {
      student.present = !student.present;
      renderDashboard();
    }
  }

  if (action === 'remove') {
    const student = APP.students.find(s => s.id === studentId);
    if (student && confirm(`Remove "${student.name}" from the register?`)) {
      APP.students = APP.students.filter(s => s.id !== studentId);
      renderDashboard();
    }
  }
});


/* ============================================================
   9. ADMIN DASHBOARD — ADD / SEARCH / LOGOUT
   ============================================================ */
addStudentForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name      = document.getElementById('studentName').value.trim();
  const id        = document.getElementById('studentId').value.trim().toUpperCase();
  const className = document.getElementById('studentClass').value.trim();

  if (!name || !id || !className) {
    showAlert(addError, '❌ All fields are required.');
    return;
  }

  if (APP.students.some(s => s.id === id)) {
    showAlert(addError, `❌ A student with ID "${id}" already exists.`);
    return;
  }

  APP.students.push({
    id,
    name,
    className,
    present: false
  });

  addError.classList.remove('show');
  showAlert(addSuccess, `✅ "${name}" added successfully.`);
  addStudentForm.reset();

  renderDashboard();
});

studentSearch.addEventListener('input', (e) => {
  APP.searchFilter = e.target.value.trim();
  renderStudentTable();
});

logoutBtn.addEventListener('click', () => {
  APP.currentUser = null;
  showHome();
});


/* ============================================================
   10. STUDENT AUTH — LOGIN / LOGOUT
   ============================================================ */
studentLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id   = document.getElementById('studentLoginId').value.trim().toUpperCase();
  const code = document.getElementById('studentLoginCode').value.trim();

  if (code !== APP.schoolCode) {
    showAlert(studentLoginError, '❌ Invalid school code.');
    return;
  }

  const student = APP.students.find(s => s.id.toUpperCase() === id);
  if (!student) {
    showAlert(studentLoginError, '❌ No student found with that ID.');
    return;
  }

  studentLoginForm.reset();
  studentLoginError.classList.remove('show');

  showStudentPortal(student);
});

studentLogoutBtn.addEventListener('click', () => {
  studentPortal.classList.remove('active');
  showHome();
});


/* ============================================================
   11. STUDENT PORTAL — RENDERING
   ============================================================ */
function renderStudentPortal(student) {
  spAvatar.textContent = getInitials(student.name);
  spName.textContent   = student.name;
  spId.textContent     = student.id;
  spClass.textContent  = student.className;

  if (student.present) {
    spStatusBox.classList.add('present');
    spStatusBox.classList.remove('absent');
    spStatusValue.textContent = 'Present';
  } else {
    spStatusBox.classList.add('absent');
    spStatusBox.classList.remove('present');
    spStatusValue.textContent = 'Absent';
  }

  // Demo stats (real app would pull historical data)
  spTotalDays.textContent   = 30;
  spDaysPresent.textContent = student.present ? 27 : 26;
  spPercentage.textContent  = student.present ? '90%' : '87%';
}


/* ============================================================
   12. INIT
   ============================================================ */
// Pre-fill demo credentials on the admin login form
document.getElementById('loginEmail').value    = 'admin@school.edu';
document.getElementById('loginPassword').value = 'admin123';