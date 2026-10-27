/* ============================================================
   APPLICATION STATE
   ============================================================ */
const APP = {
  // Registered admin accounts (demo: stored in-memory)
  users: [
    {
      name: 'System Admin',
      email: 'admin@school.edu',
      password: 'admin123',
      role: 'admin'
    }
  ],

  // Student register (demo: stored in-memory)
  students: [
    { id: 'STU-001', name: 'Emma Johnson',     className: 'Form 1A', present: true  },
    { id: 'STU-002', name: 'Liam Chen',        className: 'Form 1A', present: false },
    { id: 'STU-003', name: 'Sophia Rodriguez', className: 'Form 1B', present: true  },
    { id: 'STU-004', name: 'Noah Williams',    className: 'Form 2A', present: false },
    { id: 'STU-005', name: 'Olivia Brown',     className: 'Form 2A', present: true  },
    { id: 'STU-006', name: 'Ethan Davis',      className: 'Form 2B', present: true  }
  ],

  // Currently logged-in user
  currentUser: null,

  // Search filter for student table
  searchFilter: ''
};

/* ============================================================
   ELEMENT REFERENCES
   ============================================================ */
// Auth
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

// Dashboard
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
   AUTH: SWITCH BETWEEN LOGIN / REGISTER
   ============================================================ */
goRegister.addEventListener('click', () => {
  loginCard.classList.remove('active');
  registerCard.classList.add('active');
  loginError.classList.remove('show');
  registerError.classList.remove('show');
  registerSuccess.classList.remove('show');
});

goLogin.addEventListener('click', () => {
  registerCard.classList.remove('active');
  loginCard.classList.add('active');
  loginError.classList.remove('show');
  registerError.classList.remove('show');
  registerSuccess.classList.remove('show');
});

/* ============================================================
   AUTH: LOGIN
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

  // Successful login
  APP.currentUser = user;
  loginError.classList.remove('show');
  loginForm.reset();

  showDashboard();
});

/* ============================================================
   AUTH: REGISTER
   ============================================================ */
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const role     = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  // Validation
  if (password !== confirm) {
    showAlert(registerError, '❌ Passwords do not match.');
    return;
  }

  if (APP.users.some(u => u.email.toLowerCase() === email)) {
    showAlert(registerError, '❌ An account with this email already exists.');
    return;
  }

  // Create account
  const newUser = { name, email, password, role };
  APP.users.push(newUser);

  registerError.classList.remove('show');
  showAlert(registerSuccess, '✅ Account created successfully! You can now sign in.');

  // Reset form and switch to login after a short delay
  registerForm.reset();
  setTimeout(() => {
    registerCard.classList.remove('active');
    loginCard.classList.add('active');
    registerSuccess.classList.remove('show');
    // Prefill the login email for convenience
    document.getElementById('loginEmail').value = email;
  }, 1800);
});

/* ============================================================
   DASHBOARD: SHOW / HIDE
   ============================================================ */
function showDashboard() {
  authWrapper.style.display = 'none';
  dashboard.classList.add('active');

  // Display user info
  currentUserName.textContent = APP.currentUser.name;
  currentUserRole.textContent = APP.currentUser.role;

  // Reset student form & search
  addStudentForm.reset();
  studentSearch.value = '';
  APP.searchFilter = '';

  renderDashboard();
}

function hideDashboard() {
  dashboard.classList.remove('active');
  authWrapper.style.display = 'block';
  loginCard.classList.add('active');
  registerCard.classList.remove('active');
  APP.currentUser = null;
}

logoutBtn.addEventListener('click', () => {
  hideDashboard();
});

/* ============================================================
   DASHBOARD: RENDER EVERYTHING
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
   DASHBOARD: EVENT DELEGATION (TOGGLE / REMOVE)
   ============================================================ */
studentTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
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
   DASHBOARD: SEARCH FILTER
   ============================================================ */
studentSearch.addEventListener('input', (e) => {
  APP.searchFilter = e.target.value.trim();
  renderStudentTable();
});

/* ============================================================
   DASHBOARD: ADD STUDENT
   ============================================================ */
addStudentForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name      = document.getElementById('studentName').value.trim();
  const id        = document.getElementById('studentId').value.trim().toUpperCase();
  const className = document.getElementById('studentClass').value.trim();

  // Validation
  if (!name || !id || !className) {
    showAlert(addError, '❌ All fields are required.');
    return;
  }

  if (APP.students.some(s => s.id === id)) {
    showAlert(addError, `❌ A student with ID "${id}" already exists.`);
    return;
  }

  // Add student (defaults to absent until marked)
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

/* ============================================================
   INIT
   ============================================================ */
// Pre-fill a demo hint on the login screen
document.getElementById('loginEmail').value = 'admin@school.edu';
document.getElementById('loginPassword').value = 'admin123';