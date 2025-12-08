const PROFILE_ATT_API = "/api/attendance";
const PROFILE_MARKS_API = "/api/marks";

async function renderProfile() {
  const container = document.getElementById("profileContainer");
  if (!container) return;

  const role = localStorage.getItem("role") || "admin";
  const studentIdStr = localStorage.getItem("studentId");

  const [students, attendance, marks] = await Promise.all([
    fetch("/api/students").then((r) => r.json()),
    fetch(PROFILE_ATT_API).then((r) => r.json()),
    fetch(PROFILE_MARKS_API).then((r) => r.json()),
  ]);

  if (role === "teacher") {
    if (!students.length) {
      container.innerHTML =
        '<p class="subtitle">No students found. Ask admin to add some records.</p>';
      return;
    }

    let html = `
      <div class="profile-top-bar">
        <label for="profileStudentSelect" style="font-size:13px;">Select Student:</label>
        <select id="profileStudentSelect">
    `;

    students.forEach((s) => {
      html += `<option value="${s.id}">${s.rollNo} - ${s.name}</option>`;
    });

    html += `</select></div><div id="profileDetails"></div>`;
    container.innerHTML = html;

    const selectEl = document.getElementById("profileStudentSelect");

    const renderForId = (id) => {
      const stu = students.find((s) => s.id === id);
      if (stu) renderProfileDetails(stu, attendance, marks);
    };

    renderForId(parseInt(selectEl.value, 10));

    selectEl.addEventListener("change", () => {
      renderForId(parseInt(selectEl.value, 10));
    });
  } else if (role === "student") {
    if (!studentIdStr) {
      container.innerHTML =
        '<p class="subtitle">Student info not found. Please log in again.</p>';
      return;
    }
    const id = parseInt(studentIdStr, 10);
    const stu = students.find((s) => s.id === id);
    if (!stu) {
      container.innerHTML =
        '<p class="subtitle">Your record is not present in the system. Contact admin.</p>';
      return;
    }
    container.innerHTML = `<div id="profileDetails"></div>`;
    renderProfileDetails(stu, attendance, marks);
  } else {
    container.innerHTML =
      '<p class="subtitle">Profile is only for Teacher and Student roles.</p>';
  }
}

function renderProfileDetails(student, attendance, marksAll) {
  const detailsDiv = document.getElementById("profileDetails");
  if (!detailsDiv) return;

  const role = localStorage.getItem("role") || "admin";

  // Attendance stats
  const recs = attendance.filter((a) => a.studentId === student.id);
  const total = recs.length;
  const present = recs.filter((a) => a.status === "P").length;
  const absent = total - present;
  const pct =
    total === 0 ? "-" : ((present / total) * 100).toFixed(1) + "%";

  // Marks
  const marks = marksAll.filter((m) => m.studentId === student.id);
  let marksRows = "";
  let totalMarks = 0;

  marks.forEach((m) => {
    const val = parseFloat(m.marks || "0") || 0;
    totalMarks += val;
    marksRows += `
      <tr>
        <td>${m.subject}</td>
        <td>${m.exam}</td>
        <td>${m.marks}</td>
      </tr>
    `;
  });

  if (!marksRows) {
    marksRows = `<tr><td colspan="3" class="empty">No marks recorded yet.</td></tr>`;
  }

  let grade = "-";
  if (marks.length > 0) {
    const avg = totalMarks / marks.length;
    if (avg >= 90) grade = "O";
    else if (avg >= 80) grade = "A+";
    else if (avg >= 70) grade = "A";
    else if (avg >= 60) grade = "B";
    else if (avg >= 50) grade = "C";
    else grade = "F";
  }

  const fatherName = student.fatherName || "-";
  const motherName = student.motherName || "-";
  const dob = student.dob || "-";

  const photoUrl = student.photo || "";
  const initials = (student.name || "?").trim().charAt(0).toUpperCase();

  const photoBlock = photoUrl
    ? `<img src="${photoUrl}" class="profile-photo" alt="Photo of ${student.name}">`
    : `<div class="profile-photo placeholder">${initials}</div>`;

  const uploadBlock =
    role === "student"
      ? `
      <div style="margin-top:10px;">
        <label style="font-size:13px;">Update Profile Photo:</label>
        <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
          <input type="file" id="profilePhotoInput" accept="image/*" />
          <button class="btn btn-xs primary" id="profilePhotoBtn">Upload</button>
        </div>
      </div>
    `
      : "";

  detailsDiv.innerHTML = `
    <div id="printArea">
      <div class="profile-card">
        <div class="profile-header-row">
          <div class="profile-photo-wrapper">
            ${photoBlock}
          </div>
          <div>
            <h3>${student.name}</h3>
            <p>Roll No: <b>${student.rollNo}</b></p>
            <p>Department: <b>${student.department || "-"}</b></p>
            <p>Semester: <b>${student.semester || "-"}</b></p>
          </div>
          <div class="profile-meta">
            <p>CGPA: <b>${student.cgpa || "-"}</b></p>
            <p>Phone: <b>${student.phone || "-"}</b></p>
            <p>Father Name: <b>${fatherName}</b></p>
            <p>Mother Name: <b>${motherName}</b></p>
            <p>DOB: <b>${dob}</b></p>
          </div>
        </div>

        <hr class="profile-divider" />

        <div class="profile-section">
          <h4>Attendance Summary</h4>
          <table class="profile-table">
            <thead>
              <tr>
                <th>Total Classes</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${total}</td>
                <td>${present}</td>
                <td>${absent}</td>
                <td>${pct}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="profile-section">
          <h4>Marks Summary</h4>
          <table class="profile-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Exam</th>
                <th>Marks</th>
              </tr>
            </thead>
            <tbody>
              ${marksRows}
            </tbody>
          </table>
          <p style="margin-top:6px; font-size:13px;">
            Overall Grade: <b>${grade}</b>
          </p>
        </div>

        ${uploadBlock}
      </div>
    </div>

    <button class="btn primary" id="printBtn" style="margin-top:14px;">
      Print Report Card
    </button>
  `;

  const printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  if (role === "student") {
    const input = document.getElementById("profilePhotoInput");
    const btn = document.getElementById("profilePhotoBtn");
    if (input && btn) {
      btn.addEventListener("click", async () => {
        const file = input.files[0];
        if (!file) {
          window.showToast?.("Please choose a photo file.", true);
          return;
        }
        const id = student.id;
        const formData = new FormData();
        formData.append("photo", file);

        try {
          const res = await fetch(`/api/students/${id}/photo`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            window.showToast?.("Photo upload failed.", true);
            return;
          }
          window.showToast?.("Photo updated.");
          renderProfile();
        } catch (e) {
          console.error(e);
          window.showToast?.("Error uploading photo.", true);
        }
      });
    }
  }
}
