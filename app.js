// STUDENT HUB - APPLICATION LOGIC

const $ = (id) => document.getElementById(id);
const DEMO_EMAIL = "teacher@school.edu";
const DEMO_PASSWORD = "teacher123";
const STORAGE_KEY = "studentHubRecords";

function loadStudents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(item => item && typeof item === "object").map(item => ({
      ...item,
      reg: String(item.reg || ""),
      name: String(item.name || ""),
      marks: Number(item.marks) || 0,
      mobile: String(item.mobile || ""),
      email: String(item.email || ""),
      guardian: String(item.guardian || ""),
      guardianPhone: String(item.guardianPhone || ""),
      fee: item.fee && typeof item.fee === "object" ? { total: Number(item.fee.total) || 0, paid: Number(item.fee.paid) || 0 } : null,
      attendance: Array.isArray(item.attendance) ? item.attendance.filter(record => record && record.date && ["Present", "Absent"].includes(record.status)) : []
    }));
  } catch (error) {
    console.error("Could not load Student Hub records", error);
    return [];
  }
}

let students = loadStudents();
let pendingDelete = null;
let toastTimer;

function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (error) {
    showToast("Could not save: browser storage may be full or disabled.");
    console.error("Could not save Student Hub records", error);
    return false;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function getStudent(reg) {
  return students.find(student => student.reg.toLowerCase() === String(reg).toLowerCase());
}

function feePending(student) {
  return student.fee ? Math.max(0, Number(student.fee.total) - Number(student.fee.paid)) : 0;
}

function feeStatus(student) {
  if (!student.fee) return "Not set";
  if (Number(student.fee.total) === 0 || Number(student.fee.paid) <= 0) return "Pending";
  return Number(student.fee.paid) >= Number(student.fee.total) ? "Paid" : "Partially Paid";
}

function feeClass(status) {
  return status === "Paid" ? "status-paid" : status === "Partially Paid" ? "status-partial" : "status-pending";
}

function attendanceStats(student) {
  const records = student.attendance || [];
  const present = records.filter(record => record.status === "Present").length;
  const absent = records.filter(record => record.status === "Absent").length;
  const working = present + absent;
  return { working, present, absent, percent: working ? Math.round((present / working) * 100) : 0 };
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// LOGIN
$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  if ($("loginEmail").value.trim() === DEMO_EMAIL && $("loginPassword").value === DEMO_PASSWORD) {
    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("loginError").textContent = "";
    renderAll();
    showPage("dashboard");
  } else {
    $("loginError").textContent = "Incorrect email or password. Please try again.";
  }
});

$("logoutButton").addEventListener("click", () => {
  $("app").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
  $("loginForm").reset();
  showToast("You have logged out.");
});

// NAVIGATION
const pageTitles = {
  dashboard: "Dashboard", students: "All Students", add: "Add Student", search: "Search Student",
  update: "Update Student", delete: "Delete Student", contacts: "Contact Management",
  fees: "Fee Management", attendance: "Attendance", linkedlist: "Linked List", guide: "About Project"
};

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
  const selectedPage = $("page-" + pageName);
  if (selectedPage) selectedPage.classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.page === pageName));
  $("topbarTitle").textContent = pageTitles[pageName] || "Student Hub";
  renderAll();
}

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.go)));

function renderDashboard() {
  $("totalStudents").textContent = students.length;
  const average = students.length ? students.reduce((sum, student) => sum + Number(student.marks || 0), 0) / students.length : 0;
  $("averageMarks").textContent = average.toFixed(1);
  const top = students.length ? students.reduce((best, student) => Number(student.marks) > Number(best.marks) ? student : best) : null;
  $("topPerformer").textContent = top ? top.name : "—";
  $("topPerformerMarks").textContent = top ? `${top.marks} marks` : "No records";
  const withAttendance = students.map(attendanceStats).filter(stats => stats.working > 0);
  const overall = withAttendance.length ? withAttendance.reduce((sum, stats) => sum + stats.percent, 0) / withAttendance.length : 0;
  $("averageAttendance").textContent = `${Math.round(overall)}%`;
  $("recentStudents").innerHTML = students.length ? students.slice(-5).reverse().map(student => `
    <article class="student-card"><div class="card-heading"><strong>${escapeHTML(student.name)}</strong><span class="mini-tag">${escapeHTML(student.reg)}</span></div>
    <p>Marks: ${Number(student.marks)} · Attendance: ${attendanceStats(student).percent}%</p><button type="button" class="text-button" data-profile="${escapeHTML(student.reg)}">View profile →</button></article>`).join("") : '<p class="empty-state">No students added yet.</p>';
}

function renderTable() {
  const search = $("tableSearch").value.trim().toLowerCase();
  const filtered = students.filter(student => student.name.toLowerCase().includes(search) || student.reg.toLowerCase().includes(search));
  $("recordCount").textContent = `${filtered.length} record(s)`;
  $("studentTableBody").innerHTML = filtered.map(student => {
    const attendance = attendanceStats(student);
    const status = feeStatus(student);
    return `<tr><td>${escapeHTML(student.reg)}</td><td><strong>${escapeHTML(student.name)}</strong></td><td>${Number(student.marks)}</td>
      <td>${escapeHTML(student.mobile || "—")}<br><span class="muted">${escapeHTML(student.email || "")}</span></td>
      <td>${escapeHTML(student.guardian || "—")}<br><span class="muted">${escapeHTML(student.guardianPhone || "")}</span></td>
      <td><span class="status-pill ${feeClass(status)}">${status}</span></td><td>${attendance.percent}% <span class="muted">(${attendance.present}/${attendance.working})</span></td></tr>`;
  }).join("");
  $("emptyStudents").classList.toggle("hidden", filtered.length > 0);
}

$("tableSearch").addEventListener("input", renderTable);

// STUDENT CREATION
$("addStudentForm").addEventListener("submit", event => {
  event.preventDefault();
  const reg = $("addReg").value.trim();
  const name = $("addName").value.trim();
  const marks = Number($("addMarks").value);
  const message = $("addMessage");
  if (!reg || !name || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    message.textContent = "Please enter valid student details.";
    return;
  }
  if (students.some(student => student.reg.toLowerCase() === reg.toLowerCase())) {
    message.textContent = "This registration number already exists.";
    return;
  }
  students.push({ reg, name, marks, mobile: $("addMobile").value.trim(), email: $("addEmail").value.trim(), guardian: $("addGuardian").value.trim(), guardianPhone: $("addGuardianPhone").value.trim(), fee: null, attendance: [] });
  if (!saveStudents()) return;
  renderAll();
  $("addStudentForm").reset();
  message.textContent = "Student added successfully!";
  message.className = "form-message success-message";
  showToast("Student added successfully.");
});

// STUDENT PROFILE SEARCH
function profileMarkup(student) {
  const attendance = attendanceStats(student);
  const status = feeStatus(student);
  return `<article class="profile-card"><div class="card-heading"><div><span class="eyebrow">STUDENT PROFILE</span><h2>${escapeHTML(student.name)}</h2></div><span class="mini-tag">${escapeHTML(student.reg)}</span></div>
    <div class="profile-grid"><p><strong>Marks</strong><span>${Number(student.marks)}</span></p><p><strong>Mobile</strong><span>${escapeHTML(student.mobile || "Not provided")}</span></p><p><strong>Email</strong><span>${escapeHTML(student.email || "Not provided")}</span></p><p><strong>Parent / Guardian</strong><span>${escapeHTML(student.guardian || "Not provided")}</span></p><p><strong>Guardian contact</strong><span>${escapeHTML(student.guardianPhone || "Not provided")}</span></p><p><strong>Fee status</strong><span>${status}${student.fee ? ` · ${formatAmount(student.fee.paid)} paid / ${formatAmount(feePending(student))} pending` : ""}</span></p><p><strong>Attendance</strong><span>${attendance.percent}% · ${attendance.present} present / ${attendance.absent} absent of ${attendance.working} days</span></p></div></article>`;
}

$("searchStudentForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("searchReg").value.trim());
  $("searchResult").innerHTML = student ? profileMarkup(student) : '<p class="empty-state">Student not found.</p>';
});

// UPDATE ACADEMIC STUDENT DETAILS
$("updateLookupForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("updateLookupReg").value.trim());
  if (!student) {
    $("updateLookupMessage").textContent = "Student not found.";
    $("updateEditor").classList.add("hidden");
    return;
  }
  $("updateOriginalReg").value = student.reg;
  $("updateReg").value = student.reg;
  $("updateName").value = student.name;
  $("updateMarks").value = student.marks;
  $("updateLookupMessage").textContent = "Student found. Edit the details below.";
  $("updateEditor").classList.remove("hidden");
});

$("updateStudentForm").addEventListener("submit", event => {
  event.preventDefault();
  const originalReg = $("updateOriginalReg").value;
  const reg = $("updateReg").value.trim();
  const name = $("updateName").value.trim();
  const marks = Number($("updateMarks").value);
  if (!reg || !name || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    $("updateMessage").textContent = "Please enter valid details.";
    return;
  }
  if (students.some(student => student.reg.toLowerCase() === reg.toLowerCase() && student.reg !== originalReg)) {
    $("updateMessage").textContent = "That registration number is already used.";
    return;
  }
  const student = students.find(item => item.reg === originalReg);
  if (!student) return;
  student.reg = reg;
  student.name = name;
  student.marks = marks;
  if (!saveStudents()) return;
  renderAll();
  $("updateEditor").classList.add("hidden");
  $("updateLookupForm").reset();
  $("updateMessage").textContent = "";
  showToast("Student updated successfully.");
});

$("cancelUpdate").addEventListener("click", () => {
  $("updateEditor").classList.add("hidden");
  $("updateStudentForm").reset();
});

// DELETE STUDENT
$("deleteLookupForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("deleteLookupReg").value.trim());
  if (!student) {
    $("deleteResult").innerHTML = '<p class="empty-state">Student not found.</p>';
    pendingDelete = null;
    return;
  }
  pendingDelete = student.reg;
  $("deleteResult").innerHTML = `<article class="student-result"><strong>${escapeHTML(student.name)}</strong><br>Registration: ${escapeHTML(student.reg)}<br>Marks: ${Number(student.marks)}<br><br><button type="button" id="confirmDelete" class="danger-button">Delete Student</button></article>`;
  $("confirmDelete").addEventListener("click", () => {
    if (!pendingDelete || !confirm("Are you sure you want to delete this student and their associated records?")) return;
    students = students.filter(item => item.reg !== pendingDelete);
    if (!saveStudents()) return;
    renderAll();
    $("deleteLookupForm").reset();
    $("deleteResult").innerHTML = '<p class="success-message">Student deleted successfully.</p>';
    pendingDelete = null;
    showToast("Student and associated records deleted.");
  });
});

// CONTACT MANAGEMENT
function renderContacts() {
  $("contactDirectory").innerHTML = students.length ? students.map(student => `
    <article class="student-card"><div class="card-heading"><strong>${escapeHTML(student.name)}</strong><span class="mini-tag">${escapeHTML(student.reg)}</span></div>
    <p><strong>Student</strong><br>${escapeHTML(student.mobile || "Mobile not provided")}<br>${escapeHTML(student.email || "Email not provided")}</p>
    <p><strong>Parent / Guardian</strong><br>${escapeHTML(student.guardian || "Not provided")}<br>${escapeHTML(student.guardianPhone || "Contact not provided")}</p>
    <button type="button" class="text-button" data-edit-contact="${escapeHTML(student.reg)}">Edit contact →</button></article>`).join("") : '<p class="empty-state">Add students to build your contact directory.</p>';
}

function openContactEditor(student) {
  $("contactOriginalReg").value = student.reg;
  $("contactStudentHeading").textContent = `${student.name} · ${student.reg}`;
  $("contactMobile").value = student.mobile;
  $("contactEmail").value = student.email;
  $("contactGuardian").value = student.guardian;
  $("contactGuardianPhone").value = student.guardianPhone;
  $("contactMessage").textContent = "";
  $("contactEditor").classList.remove("hidden");
}

$("contactLookupForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("contactLookupReg").value.trim());
  if (!student) {
    $("contactLookupMessage").textContent = "Student not found.";
    $("contactEditor").classList.add("hidden");
    return;
  }
  $("contactLookupMessage").textContent = "Student found. Update the contact details below.";
  openContactEditor(student);
});

$("contactDirectory").addEventListener("click", event => {
  const button = event.target.closest("[data-edit-contact]");
  if (!button) return;
  const student = getStudent(button.dataset.editContact);
  if (student) openContactEditor(student);
});

$("contactForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("contactOriginalReg").value);
  if (!student) return;
  student.mobile = $("contactMobile").value.trim();
  student.email = $("contactEmail").value.trim();
  student.guardian = $("contactGuardian").value.trim();
  student.guardianPhone = $("contactGuardianPhone").value.trim();
  if (!saveStudents()) return;
  renderAll();
  openContactEditor(student);
  $("contactMessage").textContent = "Contact details saved.";
  $("contactMessage").className = "form-message success-message";
  showToast("Contact details saved.");
});

// FEE MANAGEMENT
function updateStudentSelect(select, emptyLabel) {
  const previous = select.value;
  select.innerHTML = students.length ? students.map(student => `<option value="${escapeHTML(student.reg)}">${escapeHTML(student.name)} (${escapeHTML(student.reg)})</option>`).join("") : `<option value="">${emptyLabel}</option>`;
  if (students.some(student => student.reg === previous)) select.value = previous;
  select.disabled = students.length === 0;
}

function renderFees() {
  const feeStudents = students.filter(student => student.fee);
  const total = feeStudents.reduce((sum, student) => sum + Number(student.fee.total), 0);
  const paid = feeStudents.reduce((sum, student) => sum + Number(student.fee.paid), 0);
  $("feeTotalAll").textContent = formatAmount(total);
  $("feePaidAll").textContent = formatAmount(paid);
  $("feePendingAll").textContent = formatAmount(feeStudents.reduce((sum, student) => sum + feePending(student), 0));
  $("feeTableBody").innerHTML = feeStudents.map(student => {
    const status = feeStatus(student);
    return `<tr><td>${escapeHTML(student.reg)}</td><td>${escapeHTML(student.name)}</td><td>${formatAmount(student.fee.total)}</td><td>${formatAmount(student.fee.paid)}</td><td>${formatAmount(feePending(student))}</td><td><span class="status-pill ${feeClass(status)}">${status}</span></td></tr>`;
  }).join("");
  $("emptyFees").classList.toggle("hidden", feeStudents.length > 0);
}

updateStudentSelect($("feeStudent"), "No students available");
$("feeStudent").addEventListener("change", () => {
  const student = getStudent($("feeStudent").value);
  $("feeTotal").value = student?.fee ? student.fee.total : "";
  $("feePaid").value = student?.fee ? student.fee.paid : "";
});

$("feeForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("feeStudent").value);
  const total = Number($("feeTotal").value);
  const paid = Number($("feePaid").value);
  if (!student || !Number.isFinite(total) || !Number.isFinite(paid) || total < 0 || paid < 0 || paid > total) {
    $("feeMessage").textContent = "Enter valid amounts; paid fee cannot exceed total course fee.";
    return;
  }
  student.fee = { total, paid };
  if (!saveStudents()) return;
  renderAll();
  $("feeStudent").value = student.reg;
  $("feeTotal").value = total;
  $("feePaid").value = paid;
  $("feeMessage").textContent = `Saved. Pending fee: ${formatAmount(total - paid)}.`;
  $("feeMessage").className = "form-message success-message";
  showToast("Fee record saved.");
});

// ATTENDANCE MANAGEMENT
function renderAttendanceHistory() {
  const student = getStudent($("historyStudent").value);
  const records = student ? [...student.attendance].sort((a, b) => b.date.localeCompare(a.date)) : [];
  const stats = student ? attendanceStats(student) : { working: 0, present: 0, absent: 0, percent: 0 };
  $("workingDays").textContent = stats.working;
  $("presentDays").textContent = stats.present;
  $("absentDays").textContent = stats.absent;
  $("studentAttendancePercent").textContent = `${stats.percent}%`;
  $("attendanceHistoryBody").innerHTML = records.map(record => `<tr><td>${escapeHTML(record.date)}</td><td><span class="status-pill ${record.status === "Present" ? "status-paid" : "status-pending"}">${record.status}</span></td></tr>`).join("");
  $("emptyAttendance").classList.toggle("hidden", records.length > 0);
}

updateStudentSelect($("attendanceStudent"), "No students available");
updateStudentSelect($("historyStudent"), "No students available");
$("attendanceDate").value = new Date().toISOString().slice(0, 10);
$("historyStudent").addEventListener("change", renderAttendanceHistory);

$("attendanceForm").addEventListener("submit", event => {
  event.preventDefault();
  const student = getStudent($("attendanceStudent").value);
  const date = $("attendanceDate").value;
  const status = $("attendanceStatus").value;
  if (!student || !date || !["Present", "Absent"].includes(status)) {
    $("attendanceMessage").textContent = "Choose a student, date and valid attendance status.";
    return;
  }
  const existing = student.attendance.find(record => record.date === date);
  if (existing) existing.status = status;
  else student.attendance.push({ date, status });
  if (!saveStudents()) return;
  renderAll();
  $("historyStudent").value = student.reg;
  renderAttendanceHistory();
  $("attendanceMessage").textContent = `Attendance saved: ${student.name} marked ${status} on ${date}.`;
  $("attendanceMessage").className = "form-message success-message";
  showToast("Attendance saved.");
});

// LINKED LIST VISUALIZATION
function renderLinkedList() {
  const canvas = $("linkedListCanvas");
  $("listNodeCount").textContent = students.length;
  $("listHead").textContent = students.length ? students[0].reg : "NULL";
  canvas.innerHTML = students.length ? students.map((student, index) => `
    <div class="list-node"><strong>${escapeHTML(student.reg)}</strong><br>${escapeHTML(student.name)}<br>Marks: ${Number(student.marks)}</div>
    <span class="list-arrow">${index === students.length - 1 ? "→ NULL" : "→"}</span>`).join("") : '<p class="empty-state">The linked list is empty.</p>';
}

// Profile shortcut buttons use event delegation because dashboard cards are rendered dynamically.
document.addEventListener("click", event => {
  const profileButton = event.target.closest("[data-profile]");
  if (!profileButton) return;
  const student = getStudent(profileButton.dataset.profile);
  if (student) {
    $("searchReg").value = student.reg;
    $("searchResult").innerHTML = profileMarkup(student);
    showPage("search");
  }
});

function renderAll() {
  renderDashboard();
  renderTable();
  renderContacts();
  renderFees();
  updateStudentSelect($("feeStudent"), "No students available");
  updateStudentSelect($("attendanceStudent"), "No students available");
  updateStudentSelect($("historyStudent"), "No students available");
  renderAttendanceHistory();
  renderLinkedList();
}

// INITIAL DISPLAY
$("app").classList.add("hidden");
$("loginPage").classList.remove("hidden");
renderAll();
