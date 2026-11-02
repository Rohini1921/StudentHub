// STUDENT HUB - APPLICATION LOGIC

const $ = (id) => document.getElementById(id);

const DEMO_EMAIL = "teacher@school.edu";
const DEMO_PASSWORD = "teacher123";

let students = JSON.parse(localStorage.getItem("studentHubRecords") || "[]");
let pendingDelete = null;

function saveStudents() {
  localStorage.setItem("studentHubRecords", JSON.stringify(students));
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// LOGIN

$("loginForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    $("loginPage").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("loginError").textContent = "";
    renderAll();
    showPage("dashboard");
  } else {
    $("loginError").textContent = "Incorrect email or password. Please try again.";
  }
});

$("logoutButton").addEventListener("click", function() {
  $("app").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
  $("loginForm").reset();
  showToast("You have logged out.");
});

// NAVIGATION

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  const selectedPage = $("page-" + pageName);

  if (selectedPage) {
    selectedPage.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  const titles = {
    dashboard: "Dashboard",
    students: "All Students",
    add: "Add Student",
    search: "Search Student",
    update: "Update Student",
    delete: "Delete Student",
    linkedlist: "Linked List",
    guide: "About Project"
  };

  $("topbarTitle").textContent = titles[pageName] || "Student Hub";
  renderAll();
}

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

// DASHBOARD AND TABLE

function renderDashboard() {
  $("totalStudents").textContent = students.length;

  const average = students.length
    ? students.reduce((sum, student) => sum + student.marks, 0) / students.length
    : 0;

  $("averageMarks").textContent = average.toFixed(1);

  const top = students.length
    ? students.reduce((best, student) => student.marks > best.marks ? student : best)
    : null;

  $("topPerformer").textContent = top ? top.name : "—";
  $("topPerformerMarks").textContent = top ? top.marks + " marks" : "No records";

  const recent = $("recentStudents");

  if (students.length === 0) {
    recent.textContent = "No students added yet.";
  } else {
    recent.innerHTML = students.slice(-5).reverse().map(student => `
      <div class="student-result">
        <strong>${escapeHTML(student.name)}</strong><br>
        Registration: ${escapeHTML(student.reg)}<br>
        Marks: ${student.marks}
      </div>
    `).join("");
  }
}

function renderTable() {
  const search = $("tableSearch").value.trim().toLowerCase();

  const filtered = students.filter(student =>
    student.name.toLowerCase().includes(search) ||
    student.reg.toLowerCase().includes(search)
  );

  $("recordCount").textContent = filtered.length + " record(s)";
  $("studentTableBody").innerHTML = filtered.map(student => `
    <tr>
      <td>${escapeHTML(student.reg)}</td>
      <td>${escapeHTML(student.name)}</td>
      <td>${student.marks}</td>
    </tr>
  `).join("");

  $("emptyStudents").classList.toggle("hidden", filtered.length > 0);
}

$("tableSearch").addEventListener("input", renderTable);

// ADD STUDENT

$("addStudentForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const reg = $("addReg").value.trim();
  const name = $("addName").value.trim();
  const marks = Number($("addMarks").value);

  if (!reg || !name || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    $("addMessage").textContent = "Please enter valid student details.";
    return;
  }

  if (students.some(student => student.reg.toLowerCase() === reg.toLowerCase())) {
    $("addMessage").textContent = "This registration number already exists.";
    return;
  }

  students.push({ reg, name, marks });
  saveStudents();
  renderAll();

  $("addStudentForm").reset();
  $("addMessage").textContent = "Student added successfully!";
  $("addMessage").className = "success-message";
  showToast("Student added successfully.");
});

// SEARCH STUDENT

$("searchStudentForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const reg = $("searchReg").value.trim().toLowerCase();
  const student = students.find(item => item.reg.toLowerCase() === reg);

  if (!student) {
    $("searchResult").textContent = "Student not found.";
    return;
  }

  $("searchResult").innerHTML = `
    <div class="student-result">
      <strong>Student Found</strong><br>
      Registration: ${escapeHTML(student.reg)}<br>
      Name: ${escapeHTML(student.name)}<br>
      Marks: ${student.marks}
    </div>
  `;
});

// UPDATE STUDENT

$("updateLookupForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const reg = $("updateLookupReg").value.trim().toLowerCase();
  const student = students.find(item => item.reg.toLowerCase() === reg);

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

$("updateStudentForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const originalReg = $("updateOriginalReg").value;
  const reg = $("updateReg").value.trim();
  const name = $("updateName").value.trim();
  const marks = Number($("updateMarks").value);

  if (!reg || !name || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    $("updateMessage").textContent = "Please enter valid details.";
    return;
  }

  const duplicate = students.some(student =>
    student.reg.toLowerCase() === reg.toLowerCase() &&
    student.reg !== originalReg
  );

  if (duplicate) {
    $("updateMessage").textContent = "That registration number is already used.";
    return;
  }

  const index = students.findIndex(student => student.reg === originalReg);

  if (index === -1) return;

  students[index] = { reg, name, marks };
  saveStudents();
  renderAll();

  $("updateEditor").classList.add("hidden");
  $("updateLookupForm").reset();
  $("updateMessage").textContent = "";
  showToast("Student updated successfully.");
});

$("cancelUpdate").addEventListener("click", function() {
  $("updateEditor").classList.add("hidden");
  $("updateStudentForm").reset();
});

// DELETE STUDENT

$("deleteLookupForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const reg = $("deleteLookupReg").value.trim().toLowerCase();
  const student = students.find(item => item.reg.toLowerCase() === reg);

  if (!student) {
    $("deleteResult").textContent = "Student not found.";
    pendingDelete = null;
    return;
  }

  pendingDelete = student.reg;

  $("deleteResult").innerHTML = `
    <div class="student-result">
      <strong>${escapeHTML(student.name)}</strong><br>
      Registration: ${escapeHTML(student.reg)}<br>
      Marks: ${student.marks}<br><br>
      <button type="button" id="confirmDelete" class="danger-button">
        Delete Student
      </button>
    </div>
  `;

  $("confirmDelete").addEventListener("click", function() {
    if (!pendingDelete) return;

    if (confirm("Are you sure you want to delete this student?")) {
      students = students.filter(item => item.reg !== pendingDelete);
      saveStudents();
      renderAll();
      $("deleteLookupForm").reset();
      $("deleteResult").textContent = "Student deleted successfully.";
      pendingDelete = null;
      showToast("Student deleted.");
    }
  });
});

// LINKED LIST VISUALIZATION

function renderLinkedList() {
  const canvas = $("linkedListCanvas");

  $("listNodeCount").textContent = students.length;
  $("listHead").textContent = students.length ? students[0].reg : "NULL";

  if (students.length === 0) {
    canvas.textContent = "The linked list is empty.";
    return;
  }

  canvas.innerHTML = students.map((student, index) => `
    <div class="list-node">
      <strong>${escapeHTML(student.reg)}</strong><br>
      ${escapeHTML(student.name)}<br>
      Marks: ${student.marks}
    </div>
    <span class="list-arrow">${index === students.length - 1 ? "→ NULL" : "→"}</span>
  `).join("");
}

// SAFE TEXT DISPLAY

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// RENDER EVERYTHING

function renderAll() {
  renderDashboard();
  renderTable();
  renderLinkedList();
}

// INITIAL DISPLAY

$("app").classList.add("hidden");
$("loginPage").classList.remove("hidden");
renderAll();

