import streamlit as st
import pandas as pd
import json
import os
import time

# ==========================================
# ⚙️ CONFIGURATION & SETUP
# ==========================================
st.set_page_config(page_title="SRMS Portal", layout="wide", page_icon="🎓")

# Define paths
BASE_DIR = "backend"
FILES = {
    "students": os.path.join(BASE_DIR, "students.json"),
    "marks": os.path.join(BASE_DIR, "marks.json"),
    "attendance": os.path.join(BASE_DIR, "attendance.json"),
    "timetable": os.path.join(BASE_DIR, "timetable.json")
}

if not os.path.exists(BASE_DIR):
    os.makedirs(BASE_DIR)

# ==========================================
# 📂 DATA HANDLING
# ==========================================
def load_data(key):
    path = FILES[key]
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_data(key, data):
    with open(FILES[key], "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ==========================================
# 🔐 AUTHENTICATION
# ==========================================
def check_login(username, password):
    # 1. Hardcoded Admin
    if username == "admin" and password == "admin123":
        return {"role": "admin", "data": {"name": "Administrator"}}

    # 2. Hardcoded Teachers (Added 'name' for profile)
    teachers = [
        {"u": "teacher1", "p": "t123", "name": "Mr. Teacher One", "dept": "CSE"},
        {"u": "teacher2", "p": "t123", "name": "Ms. Teacher Two", "dept": "ECE"},
    ]
    for t in teachers:
        if username == t["u"] and password == t["p"]:
            return {"role": "teacher", "data": t}

    # 3. Student Login
    if username == password:
        students = load_data("students")
        student = next((s for s in students if str(s.get("rollNo", "")).strip() == username), None)
        if student:
            return {"role": "student", "data": student}
    
    return None

def logout():
    st.session_state.user_session = None
    st.rerun()

if "user_session" not in st.session_state:
    st.session_state.user_session = None

# ==========================================
# 🖥️ MAIN APPLICATION INTERFACE
# ==========================================

# --- LOGIN SCREEN ---
if st.session_state.user_session is None:
    st.markdown("<h1 style='text-align: center;'>🎓 SRMS Login</h1>", unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        with st.form("login_form"):
            st.info("ℹ️ **Students:** Use Roll No as Username & Password.")
            user = st.text_input("Username / Roll No")
            pw = st.text_input("Password", type="password")
            if st.form_submit_button("Login", use_container_width=True):
                result = check_login(user.strip(), pw.strip())
                if result:
                    st.session_state.user_session = result
                    st.rerun()
                else:
                    st.error("Invalid Credentials.")

# --- DASHBOARD ---
else:
    session = st.session_state.user_session
    role = session["role"]
    user_data = session["data"]

    # Sidebar
    with st.sidebar:
        st.title(f"👤 {role.capitalize()}")
        st.write(f"**User:** {user_data.get('name')}")
        if st.button("Logout", type="primary"):
            logout()

    # ==========================
    # 👨‍🎓 STUDENT VIEW
    # ==========================
    if role == "student":
        st.title(f"Welcome, {user_data.get('name')}")
        tab1, tab2, tab3, tab4 = st.tabs(["📋 Profile", "📊 Marks", "📅 Attendance", "🕒 Timetable"])

        with tab1: # Profile
            st.subheader("My Profile")
            c1, c2 = st.columns(2)
            c1.text_input("Name", user_data.get('name'), disabled=True)
            c1.text_input("Roll No", user_data.get('rollNo'), disabled=True)
            c1.text_input("Dept", user_data.get('department'), disabled=True)
            c2.text_input("CGPA", user_data.get('cgpa'), disabled=True)
            c2.text_input("Phone", user_data.get('phone'), disabled=True)
            c2.text_input("Father's Name", user_data.get('fatherName'), disabled=True)

        with tab2: # Marks
            st.subheader("My Marks")
            all_marks = load_data("marks")
            my_marks = [m for m in all_marks if str(m.get('studentId')) == str(user_data.get('id'))]
            if my_marks:
                st.dataframe(pd.DataFrame(my_marks)[['subject', 'exam', 'marks']], use_container_width=True)
            else:
                st.info("No marks found.")

        with tab3: # Attendance
            st.subheader("My Attendance")
            all_att = load_data("attendance")
            my_att = [a for a in all_att if str(a.get('studentId')) == str(user_data.get('id'))]
            if my_att:
                df = pd.DataFrame(my_att)
                st.dataframe(df[['date', 'status']], use_container_width=True)
                present = len([x for x in my_att if x['status'] == 'P'])
                st.metric("Attendance %", f"{int((present/len(my_att))*100)}%")
            else:
                st.info("No attendance found.")

        with tab4: # Timetable
            st.subheader("Class Schedule")
            tt = load_data("timetable")
            if tt: st.dataframe(pd.DataFrame(tt)[['day', 'startTime', 'subject', 'room']], use_container_width=True)
            else: st.info("No timetable.")

    # ==========================
    # 👨‍🏫 TEACHER VIEW
    # ==========================
    elif role == "teacher":
        st.title("Teacher Dashboard")
        tab1, tab2, tab3, tab4 = st.tabs(["📋 My Profile", "🕒 Timetable", "📊 Student Marks", "📅 Attendance"])

        with tab1: # Teacher Profile
            st.subheader("Faculty Profile")
            st.write("Since teachers are hardcoded, here are your details:")
            c1, c2 = st.columns(2)
            c1.text_input("Name", user_data.get('name'), disabled=True)
            c2.text_input("Role", "Faculty / Teacher", disabled=True)
            c1.text_input("Department", user_data.get('dept', 'General'), disabled=True)
            c2.text_input("Username", user_data.get('u'), disabled=True)

        with tab2: # Timetable
            st.subheader("Timetable")
            tt = load_data("timetable")
            if tt:
                df = pd.DataFrame(tt)
                # Try to filter by teacher name if possible, otherwise show all
                st.dataframe(df[['day', 'startTime', 'endTime', 'subject', 'room']], use_container_width=True)
            else:
                st.info("No timetable data found.")

        with tab3: # Marks
            st.subheader("Student Marks Registry")
            marks = load_data("marks")
            if marks:
                st.dataframe(pd.DataFrame(marks), use_container_width=True)
            else:
                st.info("No marks recorded yet.")

        with tab4: # Attendance
            st.subheader("Student Attendance Registry")
            att = load_data("attendance")
            if att:
                st.dataframe(pd.DataFrame(att), use_container_width=True)
            else:
                st.info("No attendance recorded yet.")

    # ==========================
    # 🛠️ ADMIN VIEW
    # ==========================
    elif role == "admin":
        st.title("Admin Dashboard")
        tab1, tab2, tab3, tab4 = st.tabs(["👥 Manage Students", "📊 Marks", "📅 Attendance", "🕒 Timetable"])

        with tab1:
            st.subheader("Student Database")
            students = load_data("students")
            
            with st.expander("➕ Add Student"):
                with st.form("add_s"):
                    c1, c2 = st.columns(2)
                    r = c1.text_input("Roll No *")
                    n = c2.text_input("Name *")
                    d = c1.text_input("Dept")
                    s = c2.text_input("Sem")
                    cg = c1.text_input("CGPA")
                    ph = c2.text_input("Phone")
                    fn = c1.text_input("Father Name")
                    mn = c2.text_input("Mother Name")
                    dob = c1.date_input("DOB")
                    
                    if st.form_submit_button("Save"):
                        if r and n:
                            students.append({
                                "id": int(time.time()*1000), "rollNo": r, "name": n,
                                "department": d, "semester": s, "cgpa": cg, "phone": ph,
                                "fatherName": fn, "motherName": mn, "dob": str(dob)
                            })
                            save_data("students", students)
                            st.rerun()
                        else: st.error("Name & Roll No required")

            if students:
                st.dataframe(pd.DataFrame(students), use_container_width=True)
                # Delete
                del_id = st.selectbox("Delete Student", [s['id'] for s in students], format_func=lambda x: next(s['name'] for s in students if s['id']==x))
                if st.button("🗑️ Delete"):
                    save_data("students", [s for s in students if s['id'] != del_id])
                    st.rerun()
            else: st.info("No students.")

        with tab2:
            st.subheader("All Marks")
            m = load_data("marks")
            if m: st.dataframe(pd.DataFrame(m), use_container_width=True)

        with tab3:
            st.subheader("All Attendance")
            a = load_data("attendance")
            if a: st.dataframe(pd.DataFrame(a), use_container_width=True)

        with tab4:
            st.subheader("Master Timetable")
            t = load_data("timetable")
            if t: st.dataframe(pd.DataFrame(t), use_container_width=True)
