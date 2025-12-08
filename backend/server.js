const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- FILE PATHS ----------
const DATA_FILE = path.join(__dirname, "students.json");
const ATTENDANCE_FILE = path.join(__dirname, "attendance.json");
const MARKS_FILE = path.join(__dirname, "marks.json");
const TIMETABLE_FILE = path.join(__dirname, "timetable.json");
const PUBLIC_DIR = path.join(__dirname, "..", "src");
const UPLOAD_DIR = path.join(__dirname, "uploads");

// ---------- HELPERS ----------
function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }
}

function safeLoad(filePath) {
  try {
    ensureFile(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading", filePath, err.message);
    return [];
  }
}

function save(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing", filePath, err.message);
  }
}

// create JSON files & uploads dir if missing
ensureFile(DATA_FILE);
ensureFile(ATTENDANCE_FILE);
ensureFile(MARKS_FILE);
ensureFile(TIMETABLE_FILE);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// ---------- MULTER CONFIG ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, base + "_" + Date.now() + ext);
  },
});

const upload = multer({ storage });

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));     // serve frontend
app.use("/uploads", express.static(UPLOAD_DIR)); // serve photos

// ==================================================
//                  STUDENTS API
// ==================================================

// GET all students
app.get("/api/students", (req, res) => {
  const students = safeLoad(DATA_FILE);
  res.json(students);
});

// POST new student
app.post("/api/students", (req, res) => {
  const students = safeLoad(DATA_FILE);

  const {
    rollNo,
    name,
    department,
    semester,
    cgpa,
    phone,
    fatherName,
    motherName,
    dob,
  } = req.body;

  if (!rollNo || !name) {
    return res
      .status(400)
      .json({ message: "rollNo and name are required fields." });
  }

  const existing = students.find((s) => s.rollNo === rollNo);
  if (existing) {
    return res
      .status(409)
      .json({ message: "A student with this roll number already exists." });
  }

  const newStudent = {
    id: Date.now(),
    rollNo,
    name,
    department: department || "",
    semester: semester || "",
    cgpa: cgpa || "",
    phone: phone || "",
    fatherName: fatherName || "",
    motherName: motherName || "",
    dob: dob || "",
    photo: "", // photo URL (if uploaded)
  };

  students.push(newStudent);
  save(DATA_FILE, students);

  res.status(201).json(newStudent);
});

// PUT update student
app.put("/api/students/:id", (req, res) => {
  const students = safeLoad(DATA_FILE);
  const id = parseInt(req.params.id, 10);

  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Student not found." });
  }

  const {
    rollNo,
    name,
    department,
    semester,
    cgpa,
    phone,
    fatherName,
    motherName,
    dob,
  } = req.body;

  if (rollNo && rollNo !== students[idx].rollNo) {
    const clash = students.find((s) => s.rollNo === rollNo);
    if (clash) {
      return res
        .status(409)
        .json({ message: "Another student already has this roll number." });
    }
  }

  students[idx] = {
    ...students[idx],
    rollNo: rollNo ?? students[idx].rollNo,
    name: name ?? students[idx].name,
    department: department ?? students[idx].department,
    semester: semester ?? students[idx].semester,
    cgpa: cgpa ?? students[idx].cgpa,
    phone: phone ?? students[idx].phone,
    fatherName: fatherName ?? students[idx].fatherName,
    motherName: motherName ?? students[idx].motherName,
    dob: dob ?? students[idx].dob,
  };

  save(DATA_FILE, students);
  res.json(students[idx]);
});

// DELETE student
app.delete("/api/students/:id", (req, res) => {
  const students = safeLoad(DATA_FILE);
  const id = parseInt(req.params.id, 10);

  const idx = students.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Student not found." });
  }

  const removed = students.splice(idx, 1)[0];
  save(DATA_FILE, students);

  res.json({ message: "Student deleted.", removed });
});

// UPLOAD / UPDATE STUDENT PHOTO
app.post("/api/students/:id/photo", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const students = safeLoad(DATA_FILE);
  const id = parseInt(req.params.id, 10);
  const idx = students.findIndex((s) => s.id === id);

  if (idx === -1) {
    return res.status(404).json({ message: "Student not found." });
  }

  students[idx].photo = "/uploads/" + req.file.filename;
  save(DATA_FILE, students);
  res.json(students[idx]);
});

// ==================================================
//                  ATTENDANCE API
// ==================================================

app.get("/api/attendance", (req, res) => {
  const data = safeLoad(ATTENDANCE_FILE);
  res.json(data);
});

app.post("/api/attendance", (req, res) => {
  const data = safeLoad(ATTENDANCE_FILE);
  const { date, studentId, status } = req.body;

  if (!studentId || !status) {
    return res
      .status(400)
      .json({ message: "studentId and status are required." });
  }

  const record = {
    id: Date.now(),
    date: date || new Date().toISOString().slice(0, 10),
    studentId,
    status, // "P" or "A"
  };

  data.push(record);
  save(ATTENDANCE_FILE, data);

  res.status(201).json(record);
});

// ==================================================
//                    MARKS API
// ==================================================

app.get("/api/marks", (req, res) => {
  const data = safeLoad(MARKS_FILE);
  res.json(data);
});

app.post("/api/marks", (req, res) => {
  const data = safeLoad(MARKS_FILE);
  const { studentId, subject, exam, marks } = req.body;

  if (!studentId || !subject || !exam) {
    return res
      .status(400)
      .json({ message: "studentId, subject and exam are required." });
  }

  const record = {
    id: Date.now(),
    studentId,
    subject,
    exam,
    marks,
  };

  data.push(record);
  save(MARKS_FILE, data);

  res.status(201).json(record);
});

// ==================================================
//                TIMETABLE / CLASSROOM API
// ==================================================

app.get("/api/timetable", (req, res) => {
  const data = safeLoad(TIMETABLE_FILE);
  res.json(data);
});

app.post("/api/timetable", (req, res) => {
  const data = safeLoad(TIMETABLE_FILE);
  const { day, startTime, endTime, subject, teacherName, room, section } =
    req.body;

  if (!day || !startTime || !endTime || !subject) {
    return res
      .status(400)
      .json({ message: "day, startTime, endTime and subject are required." });
  }

  const record = {
    id: Date.now(),
    day,
    startTime,
    endTime,
    subject,
    teacherName: teacherName || "",
    room: room || "",
    section: section || "",
  };

  data.push(record);
  save(TIMETABLE_FILE, data);

  res.status(201).json(record);
});

app.put("/api/timetable/:id", (req, res) => {
  const data = safeLoad(TIMETABLE_FILE);
  const id = parseInt(req.params.id, 10);
  const idx = data.findIndex((r) => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ message: "Timetable entry not found." });
  }

  const { day, startTime, endTime, subject, teacherName, room, section } =
    req.body;

  data[idx] = {
    ...data[idx],
    day: day ?? data[idx].day,
    startTime: startTime ?? data[idx].startTime,
    endTime: endTime ?? data[idx].endTime,
    subject: subject ?? data[idx].subject,
    teacherName: teacherName ?? data[idx].teacherName,
    room: room ?? data[idx].room,
    section: section ?? data[idx].section,
  };

  save(TIMETABLE_FILE, data);
  res.json(data[idx]);
});

app.delete("/api/timetable/:id", (req, res) => {
  const data = safeLoad(TIMETABLE_FILE);
  const id = parseInt(req.params.id, 10);
  const idx = data.findIndex((r) => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ message: "Timetable entry not found." });
  }

  const removed = data.splice(idx, 1)[0];
  save(TIMETABLE_FILE, data);
  res.json({ message: "Timetable entry deleted.", removed });
});

// ==================================================
//                FRONTEND FALLBACK
// ==================================================
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ==================================================
//                  START SERVER
// ==================================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
