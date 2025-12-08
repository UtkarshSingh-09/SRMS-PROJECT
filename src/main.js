// ---------- LOGIN GUARD ----------
if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
}

const userRole = localStorage.getItem("role") || "admin";
const studentIdStored = localStorage.getItem("studentId");

// show role label
const roleDisplay = document.getElementById("roleDisplay");
if (roleDisplay) {
  roleDisplay.textContent =
    userRole === "admin"
      ? "Admin"
      : userRole === "teacher"
      ? "Teacher"
      : "Student";
}

// logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});

// ---------- CSV HELPER ----------
function downloadCSV(filename, headers, rows) {
  const escape = (val) =>
    `"${String(val ?? "").replace(/"/g, '""')}"`;

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.downloadCSV = downloadCSV;

// ---------- STUDENT MODULE (ADMIN ONLY) ----------
const API_BASE = "/api/students";

const tableBody = document.getElementById("studentsTableBody");
const form = document.getElementById("studentForm");
const resetBtn = document.getElementById("resetBtn");
const searchInput = document.getElementById("searchInput");
const toast = document.getElementById("toast");
const exportStudentsBtn = document.getElementById("exportStudentsBtn");
const adminPhotoInput = document.getElementById("adminPhotoInput");

let students = [];
let currentEditingId = null;

function showToast(message, isError = false) {
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => {
    toast.className = "toast";
  }, 2200);
}
window.showToast = showToast;
window.getStudentsCached = () => students.slice();

// fetch all students
async function fetchStudents() {
  try {
    const res = await fetch(API_BASE);
    students = await res.json();
    renderTable();
  } catch (err) {
    console.error(err);
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="empty">Error loading student data.</td></tr>';
    }
  }
}

function renderTable() {
  if (!tableBody) return;

  const q = (searchInput?.value || "").toLowerCase().trim();

  const filtered = students.filter((s) => {
    const t =
      (s.rollNo || "") +
      " " +
      (s.name || "") +
      " " +
      (s.department || "");
    return t.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" class="empty">No records found.</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered
    .map(
      (s) => `
    <tr>
      <td>${s.rollNo}</td>
      <td>${s.name}</td>
      <td>${s.department || "-"}</td>
      <td>${s.semester || "-"}</td>
      <td>${s.cgpa || "-"}</td>
      <td>${s.phone || "-"}</td>
      <td>
        <div class="actions">
          <button class="btn btn-xs btn-warning" data-edit="${s.id}">Edit</button>
          <button class="btn btn-xs btn-danger" data-delete="${s.id}">Delete</button>
          <button class="btn btn-xs" data-photo="${s.id}">Photo</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  // Edit + Delete handlers
  tableBody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () =>
      startEdit(parseInt(btn.getAttribute("data-edit"), 10))
    );
  });

  tableBody.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () =>
      deleteStudent(parseInt(btn.getAttribute("data-delete"), 10))
    );
  });

  // Photo upload handlers (Admin)
  if (adminPhotoInput) {
    tableBody.querySelectorAll("[data-photo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-photo"), 10);
        adminPhotoInput.dataset.studentId = String(id);
        adminPhotoInput.click();
      });
    });

    if (!adminPhotoInput._handlerAttached) {
      adminPhotoInput._handlerAttached = true;
      adminPhotoInput.addEventListener("change", async () => {
        const file = adminPhotoInput.files[0];
        const id = parseInt(adminPhotoInput.dataset.studentId || "0", 10);
        if (!file || !id) return;

        const formData = new FormData();
        formData.append("photo", file);

        try {
          const res = await fetch(`/api/students/${id}/photo`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            showToast("Photo upload failed.", true);
            return;
          }
          const updated = await res.json();
          const idx = students.findIndex((s) => s.id === updated.id);
          if (idx >= 0) students[idx] = updated;
          showToast("Photo uploaded.");
          renderTable();
        } catch (e) {
          console.error(e);
          showToast("Error uploading photo.", true);
        } finally {
          adminPhotoInput.value = "";
          delete adminPhotoInput.dataset.studentId;
        }
      });
    }
  }
}

function clearForm() {
  currentEditingId = null;
  form?.reset();
}

function startEdit(id) {
  const s = students.find((x) => x.id === id);
  if (!s) return;
  currentEditingId = id;

  document.getElementById("rollNo").value = s.rollNo || "";
  document.getElementById("name").value = s.name || "";
  document.getElementById("department").value = s.department || "";
  document.getElementById("semester").value = s.semester || "";
  document.getElementById("cgpa").value = s.cgpa || "";
  document.getElementById("phone").value = s.phone || "";
  document.getElementById("fatherName").value = s.fatherName || "";
  document.getElementById("motherName").value = s.motherName || "";
  document.getElementById("dob").value = s.dob || "";

  showToast("Loaded student for editing");
}

async function deleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) return showToast("Delete failed", true);

    students = students.filter((s) => s.id !== id);
    renderTable();
    showToast("Student deleted");
  } catch (err) {
    console.error(err);
    showToast("Error deleting student", true);
  }
}

async function handleStudentSubmit(e) {
  e.preventDefault();

  const rollNo = document.getElementById("rollNo").value.trim();
  const name = document.getElementById("name").value.trim();
  const department = document.getElementById("department").value.trim();
  const semester = document.getElementById("semester").value.trim();
  const cgpa = document.getElementById("cgpa").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const fatherName = document.getElementById("fatherName").value.trim();
  const motherName = document.getElementById("motherName").value.trim();
  const dob = document.getElementById("dob").value;

  if (!rollNo || !name) {
    showToast("Roll No and Name are required.", true);
    return;
  }

  const payload = {
    rollNo,
    name,
    department,
    semester,
    cgpa,
    phone,
    fatherName,
    motherName,
    dob,
  };

  try {
    let res;
    if (currentEditingId) {
      res = await fetch(`${API_BASE}/${currentEditingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return showToast(d.message || "Save failed", true);
    }

    const saved = await res.json();

    if (currentEditingId) {
      const idx = students.findIndex((s) => s.id === currentEditingId);
      if (idx >= 0) students[idx] = saved;
      showToast("Student updated");
    } else {
      students.push(saved);
      showToast("Student added");
    }

    clearForm();
    renderTable();
  } catch (err) {
    console.error(err);
    showToast("Error saving student", true);
  }
}

// admin can manage students
if (userRole === "admin") {
  form?.addEventListener("submit", handleStudentSubmit);
  resetBtn?.addEventListener("click", clearForm);
  searchInput?.addEventListener("input", renderTable);

  if (exportStudentsBtn) {
    exportStudentsBtn.addEventListener("click", () => {
      if (!students.length) {
        showToast("No students to export.", true);
        return;
      }
      const rows = students.map((s) => [
        s.rollNo,
        s.name,
        s.department || "",
        s.semester || "",
        s.cgpa || "",
        s.phone || "",
      ]);
      downloadCSV(
        "students.csv",
        ["Roll No", "Name", "Department", "Semester", "CGPA", "Phone"],
        rows
      );
    });
  }
} else {
  // hide Students tab fully
  const studentsTabBtn = document.querySelector("[data-tab='studentsTab']");
  const studentsTabPage = document.getElementById("studentsTab");
  if (studentsTabBtn) studentsTabBtn.style.display = "none";
  if (studentsTabPage) studentsTabPage.style.display = "none";
}

// ---------- TABS + MODULE HOOKS ----------
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPages = document.querySelectorAll(".tab-page");

function showTab(id) {
  tabPages.forEach((p) => (p.style.display = "none"));
  const el = document.getElementById(id);
  if (el) el.style.display = "block";

  if (id === "attendanceTab" && typeof renderAttendance === "function") {
    renderAttendance();
  }
  if (id === "marksTab" && typeof renderMarks === "function") {
    renderMarks();
  }
  if (id === "timetableTab" && typeof renderTimetable === "function") {
    renderTimetable();
  }
  if (id === "profileTab" && typeof renderProfile === "function") {
    renderProfile();
  }
  if (id === "studentsTab") {
    renderTable();
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-tab");
    showTab(id);
  });
});

// show/hide tabs based on role
const studentsBtn = document.querySelector("[data-tab='studentsTab']");
const attBtn = document.querySelector("[data-tab='attendanceTab']");
const marksBtn = document.querySelector("[data-tab='marksTab']");
const timetableBtn = document.querySelector("[data-tab='timetableTab']");
const profileBtn = document.querySelector("[data-tab='profileTab']");

if (userRole === "admin") {
  // admin: Students + Attendance + Marks + Timetable (no Profile)
  if (profileBtn) profileBtn.style.display = "none";
} else if (userRole === "teacher") {
  // teacher: Attendance + Marks + Timetable + Profile
  if (studentsBtn) studentsBtn.style.display = "none";
} else if (userRole === "student") {
  // student: Timetable + Profile only
  if (studentsBtn) studentsBtn.style.display = "none";
  if (attBtn) attBtn.style.display = "none";
  if (marksBtn) marksBtn.style.display = "none";
  if (timetableBtn) timetableBtn.style.display = "inline-block";
  if (profileBtn) profileBtn.style.display = "inline-block";
}

// default tab based on role
if (userRole === "student") {
  showTab("profileTab");
} else if (userRole === "teacher") {
  showTab("attendanceTab");
} else {
  showTab("studentsTab");
}

// initial load
fetchStudents();
