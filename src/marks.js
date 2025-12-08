const MARKS_API = "/api/marks";

async function renderMarks() {
  const container = document.getElementById("marksContainer");
  if (!container) return;

  const [studentsRes, marksRes] = await Promise.all([
    fetch("/api/students"),
    fetch(MARKS_API),
  ]);

  const students = await studentsRes.json();
  const marks = await marksRes.json();

  let html = `
    <h3 style="font-size:15px; margin-bottom:8px;">Add Marks</h3>
    <p class="subtitle">Enter subject, exam type and marks for each student, then click Save.</p>
    <div class="table-wrapper" style="margin-bottom:16px;">
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Subject</th>
            <th>Exam</th>
            <th>Marks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;

  students.forEach((s) => {
    html += `
      <tr>
        <td>${s.rollNo}</td>
        <td>${s.name}</td>
        <td><input type="text" id="sub_${s.id}" placeholder="e.g. Maths" style="width:100px;"></td>
        <td><input type="text" id="exam_${s.id}" placeholder="e.g. Mid-1" style="width:90px;"></td>
        <td><input type="number" id="mark_${s.id}" placeholder="Marks" style="width:80px;"></td>
        <td><button class="btn btn-xs btn-warning" data-save-mark="${s.id}">Save</button></td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <h3 style="font-size:15px; margin-bottom:8px;">Marks Summary</h3>
    <p class="subtitle">All marks recorded so far.</p>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Subject</th>
            <th>Exam</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
  `;

  marks.forEach((m) => {
    const s = students.find((st) => st.id === m.studentId);
    html += `
      <tr>
        <td>${s ? s.rollNo : "-"}</td>
        <td>${s ? s.name : "-"}</td>
        <td>${m.subject}</td>
        <td>${m.exam}</td>
        <td>${m.marks}</td>
      </tr>
    `;
  });

  if (!marks.length) {
    html += `<tr><td colspan="5" class="empty">No marks recorded yet.</td></tr>`;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // Save buttons
  container.querySelectorAll("[data-save-mark]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-save-mark"), 10);
      const sub = document.getElementById(`sub_${id}`).value.trim();
      const exam = document.getElementById(`exam_${id}`).value.trim();
      const mark = document.getElementById(`mark_${id}`).value.trim();

      if (!sub || !exam || !mark) {
        window.showToast?.("Fill subject, exam and marks.", true);
        return;
      }

      await fetch(MARKS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          subject: sub,
          exam,
          marks: mark,
        }),
      });

      window.showToast?.("Marks saved.");
      renderMarks();
    });
  });

  // Export CSV
  const exportBtn = document.getElementById("exportMarksBtn");
  if (exportBtn) {
    exportBtn.onclick = () => {
      if (!marks.length) {
        window.showToast?.("No marks to export.", true);
        return;
      }
      const rows = marks.map((m) => {
        const s = students.find((st) => st.id === m.studentId);
        return [
          s ? s.rollNo : "",
          s ? s.name : "",
          m.subject,
          m.exam,
          m.marks,
        ];
      });
      window.downloadCSV(
        "marks.csv",
        ["Roll No", "Name", "Subject", "Exam", "Marks"],
        rows
      );
    };
  }
}
