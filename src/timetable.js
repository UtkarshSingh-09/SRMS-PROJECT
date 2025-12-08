const TIMETABLE_API = "/api/timetable";

const DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

async function renderTimetable() {
  const container = document.getElementById("timetableContainer");
  if (!container) return;

  const role = localStorage.getItem("role") || "admin";

  const res = await fetch(TIMETABLE_API);
  let entries = await res.json();

  // sort by day + time
  entries.sort((a, b) => {
    const da = DAY_ORDER[a.day] || 99;
    const db = DAY_ORDER[b.day] || 99;
    if (da !== db) return da - db;
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  let html = "";

  // ---------- ADMIN / TEACHER: show form + table ----------
  if (role === "admin" || role === "teacher") {
    html += `
      <form id="timetableForm" style="margin-bottom:14px;">
        <div class="grid">
          <div class="field">
            <label>Day</label>
            <select id="ttDay">
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
              <option>Saturday</option>
            </select>
          </div>
          <div class="field">
            <label>Start Time</label>
            <input type="time" id="ttStart" />
          </div>
          <div class="field">
            <label>End Time</label>
            <input type="time" id="ttEnd" />
          </div>
          <div class="field">
            <label>Subject</label>
            <input type="text" id="ttSubject" placeholder="e.g. DSA" />
          </div>
          <div class="field">
            <label>Teacher</label>
            <input type="text" id="ttTeacher" placeholder="e.g. Bhaumik Sir" />
          </div>
          <div class="field">
            <label>Room / Lab</label>
            <input type="text" id="ttRoom" placeholder="e.g. C-205" />
          </div>
          <div class="field">
            <label>Section / Batch</label>
            <input type="text" id="ttSection" placeholder="e.g. CSE-A" />
          </div>
        </div>
        <div class="form-actions" style="margin-top:10px;">
          <button type="submit" class="btn primary">Add Slot</button>
        </div>
      </form>
    `;
  }

  // ---------- Timetable table (visible to everyone) ----------
  html += `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Room</th>
            <th>Section</th>
            ${role === "admin" || role === "teacher" ? "<th>Actions</th>" : ""}
          </tr>
        </thead>
        <tbody>
  `;

  if (!entries.length) {
    html += `<tr><td colspan="${
      role === "admin" || role === "teacher" ? 7 : 6
    }" class="empty">No timetable slots defined yet.</td></tr>`;
  } else {
    entries.forEach((e) => {
      html += `
        <tr>
          <td>${e.day}</td>
          <td>${(e.startTime || "")} - ${(e.endTime || "")}</td>
          <td>${e.subject}</td>
          <td>${e.teacherName || "-"}</td>
          <td>${e.room || "-"}</td>
          <td>${e.section || "-"}</td>
          ${
            role === "admin" || role === "teacher"
              ? `<td><button class="btn btn-xs btn-danger" data-tt-delete="${e.id}">Delete</button></td>`
              : ""
          }
        </tr>
      `;
    });
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // ---------- FORM HANDLER ----------
  if (role === "admin" || role === "teacher") {
    const form = document.getElementById("timetableForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const day = document.getElementById("ttDay").value;
        const startTime = document.getElementById("ttStart").value;
        const endTime = document.getElementById("ttEnd").value;
        const subject = document.getElementById("ttSubject").value.trim();
        const teacherName = document.getElementById("ttTeacher").value.trim();
        const room = document.getElementById("ttRoom").value.trim();
        const section = document
          .getElementById("ttSection")
          .value.trim();

        if (!day || !startTime || !endTime || !subject) {
          window.showToast?.("Day, time and subject are required.", true);
          return;
        }

        await fetch(TIMETABLE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day,
            startTime,
            endTime,
            subject,
            teacherName,
            room,
            section,
          }),
        });

        window.showToast?.("Timetable slot added.");
        renderTimetable();
      });
    }

    // delete buttons
    container.querySelectorAll("[data-tt-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.getAttribute("data-tt-delete"), 10);
        if (!confirm("Delete this timetable slot?")) return;
        await fetch(`${TIMETABLE_API}/${id}`, { method: "DELETE" });
        window.showToast?.("Timetable slot deleted.");
        renderTimetable();
      });
    });
  }
}
