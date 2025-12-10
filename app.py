import streamlit as st
import pandas as pd
import json
import os
import time
from datetime import datetime

# ==========================================
# ⚙️ CONFIGURATION & SETUP
# ==========================================
st.set_page_config(page_title="SRMS Portal", layout="wide", page_icon="🎓")

# Define paths to your existing JSON files
BASE_DIR = "backend"
FILES = {
    "students": os.path.join(BASE_DIR, "students.json"),
    "marks": os.path.join(BASE_DIR, "marks.json"),
    "attendance": os.path.join(BASE_DIR, "attendance.json"),
    "timetable": os.path.join(BASE_DIR, "timetable.json")
}

# Ensure backend directory exists
if not os.path.exists(BASE_DIR):
    os.makedirs(BASE_DIR)

# ==========================================
# 📂 DATA HANDLING (Replaces server.js)
# ==========================================
def load_data(key):
    """Loads JSON data safely. If file missing, returns empty list."""
    path = FILES[key]
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_data(key, data):
    """Saves data back to JSON."""
    with open(FILES[key], "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ==========================================
# 🔐 AUTHENTICATION (Replaces login.html)
# ==========================================
def check_login(username, password):
    # 1. Hardcoded Admin/Teacher
    users = [
        {"u": "admin", "p": "admin123", "role": "admin"},
        {"u": "teacher1", "p": "t123", "role": "teacher"},
        {"u": "teacher2", "p": "t123", "role": "teacher"},
    ]
    for u in users:
        if username == u["u"] and password == u["p"]:
            return {"role": u["role"], "data": None}

    # 2. Student Login (RollNo == Password)
    if username == password:
        students = load_data("students")
        # Find student where rollNo matches username
        student = next((s for s in students if str(s.get("rollNo", "")).strip() == username), None)
        if student:
            return {"role": "student", "data": student}
    
    return None

def logout():
    st.session_state.user_session = None
    st.rerun()

# Initialize Session State
if "user_session" not in st.session_state:
    st.session_state.user_session = None

# ==========================================
# 🖥️ MAIN APPLICATION INTERFACE
# ==========================================

# --- 1. LOGIN SCREEN ---
if st.session_state.user_session is None:
    st.markdown("<h1 style='text-align: center;'>🎓 SRMS Login</h1>", unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        with st.form("login_form"):
            st.info("ℹ️ **Students:** Use your Roll No as both Username and Password.")
            user = st.text_input("Username / Roll No")
            pw = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login", use_container_width=True)
            
            if submitted:
                result = check_login(user.strip(), pw.strip())
                if result:
                    st.session_state.user_session = result
                    st.toast("Login Successful!", icon="✅")
                    time.sleep(0.5)
                    st.rerun()
                else:
                    st.error("Invalid Credentials. Please try again.")

# --- 2. DASHBOARD ---
else:
    session = st.session_state.user_session
    role = session["role"]
    user_data = session["data"]

    # Sidebar
    with st.sidebar:
        st.title(f"👤 {role.capitalize()}")
        if role == "student":
            st.write(f"**Name:** {user_data.get('name')}")
            st.write(f"**Roll No:** {user_data.get('rollNo')}")
        
        if st.button("Logout", type="primary"):
            logout()

    # --- STUDENT VIEW ---
    if role == "student":
        st.title(f"Welcome, {user_data.get('name')} 👋")
        
        # Tabs matching your index.html structure
        tab1, tab2, tab3, tab4 = st.tabs(["📋 Profile", "📊 Marks", "📅 Attendance", "🕒 Timetable"])

        with tab1:
            st.subheader("Student Profile")
            # Display student data as a clean table
            profile_df = pd.DataFrame([user_data]).T
            profile_df.columns = ["Details"]
            st.table(profile_df)

        with tab2:
            st.subheader("My Marks")
            all_marks = load_data("marks")
            # Filter marks for this student (using ID)
            my_marks = [m for m in all_marks if str(m.get('studentId')) == str(user_data.get('id'))]
            
            if my_marks:
                st.dataframe(pd.DataFrame(my_marks)[['subject', 'exam', 'marks']], use_container_width=True)
            else:
                st.info("No marks uploaded yet.")

        with tab3:
            st.subheader("Attendance Record")
            all_att = load_data("attendance")
            my_att = [a for a in all_att if str(a.get('studentId')) == str(user_data.get('id'))]
            
            if my_att:
                df_att = pd.DataFrame(my_att)
                st.dataframe(df_att[['date', 'status']], use_container_width=True)
                
                # Simple stats
                present = len([x for x in my_att if x['status'] == 'P'])
                total = len(my_att)
                st.metric("Attendance Percentage", f"{int((present/total)*100)}%")
            else:
                st.info("No attendance records found.")

        with tab4:
            st.subheader("Class Timetable")
            timetable = load_data("timetable")
            if timetable:
                st.dataframe(pd.DataFrame(timetable)[['day', 'startTime', 'endTime', 'subject', 'room']], use_container_width=True)
            else:
                st.info("Timetable not available.")

    # --- ADMIN / TEACHER VIEW ---
    else:
        st.title("🛠️ Admin Dashboard")
        
        tab_students, tab_marks, tab_att = st.tabs(["👥 Manage Students", "📊 All Marks", "📅 All Attendance"])

        with tab_students:
            st.subheader("Student Database")
            
            # Load current students
            students_list = load_data("students")
            
            # --- ADD NEW STUDENT FORM ---
            with st.expander("➕ Add New Student"):
                with st.form("add_student"):
                    c1, c2 = st.columns(2)
                    new_roll = c1.text_input("Roll No")
                    new_name = c2.text_input("Name")
                    new_dept = c1.text_input("Department")
                    new_sem = c2.text_input("Semester")
                    new_phone = c1.text_input("Phone")
                    
                    if st.form_submit_button("Save Student"):
                        if new_roll and new_name:
                            new_entry = {
                                "id": int(time.time() * 1000), # Generate ID like JS Date.now()
                                "rollNo": new_roll,
                                "name": new_name,
                                "department": new_dept,
                                "semester": new_sem,
                                "phone": new_phone
                            }
                            students_list.append(new_entry)
                            save_data("students", students_list)
                            st.success(f"Added {new_name}!")
                            time.sleep(1)
                            st.rerun()
                        else:
                            st.error("Roll No and Name are required.")

            # --- DISPLAY STUDENTS ---
            if students_list:
                df_students = pd.DataFrame(students_list)
                
                # Display simply first, allow delete via ID selection
                st.dataframe(df_students, use_container_width=True)
                
                # Delete logic
                st.write("---")
                col_del, _ = st.columns([1, 3])
                with col_del:
                    id_to_delete = st.selectbox("Select Student to Delete", options=[s['id'] for s in students_list], format_func=lambda x: next((s['name'] for s in students_list if s['id'] == x), "Unknown"))
                    if st.button("🗑️ Delete Selected Student"):
                        students_list = [s for s in students_list if s['id'] != id_to_delete]
                        save_data("students", students_list)
                        st.warning("Student Deleted.")
                        time.sleep(1)
                        st.rerun()
            else:
                st.info("No students found in database.")

        with tab_marks:
            st.subheader("Master Marks Sheet")
            all_marks = load_data("marks")
            if all_marks:
                st.dataframe(pd.DataFrame(all_marks), use_container_width=True)
            else:
                st.info("No marks data.")

        with tab_att:
            st.subheader("Master Attendance Sheet")
            all_att = load_data("attendance")
            if all_att:
                st.dataframe(pd.DataFrame(all_att), use_container_width=True)
            else:
                st.info("No attendance data.")
