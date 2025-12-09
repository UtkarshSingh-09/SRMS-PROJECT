# 🎓 SRMS - Student Result Management System

A web-based Student Result Management System built with **Python** and **Streamlit**. This application allows students to log in, view their academic profile, check marks, and monitor attendance records using a lightweight JSON-based backend.

🔗 **[Live Demo](https://srms-project.streamlit.app/)** 

---

## 🚀 Features

* **Student Login:** Secure authentication using Student ID and Password.
* **Dashboard:** Personalized welcome screen for students.
* **Profile View:** View student details (Name, Roll No, Branch, etc.).
* **Marksheet:** Check marks for different subjects.
* **Attendance Tracker:** View attendance records and percentages.
* **Data Handling:** Uses JSON files as a lightweight database (No SQL setup required).

---

## 🛠️ Tech Stack

* **Frontend & Logic:** [Streamlit](https://streamlit.io/) (Python)
* **Data Processing:** Pandas
* **Database:** JSON (File-based storage)

---

## 📂 Project Structure

```text
SRMS-PROJECT/
├── app.py                  # Main Streamlit application entry point
├── requirements.txt        # List of Python dependencies
├── README.md               # Project documentation
├── backend/                # JSON Data Storage
│   ├── students.json       # Student credentials and profiles
│   ├── marks.json          # Academic results
│   ├── attendance.json     # Attendance records
│   └── ...
└── src/                    # (Legacy frontend files - optional)
