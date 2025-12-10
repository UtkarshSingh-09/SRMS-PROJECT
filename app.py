import streamlit as st
import pandas as pd
import json
import os

# --- PAGE CONFIG ---
st.set_page_config(page_title="SRMS Portal", layout="centered")

# --- LOAD DATA FUNCTION ---
def load_json(filename):
    # Adjust path if your folder structure is different (e.g. just "students.json")
    path = os.path.join("backend", filename)
    if not os.path.exists(path):
        # Fallback: try loading from root if backend folder doesn't exist
        if os.path.exists(filename):
            path = filename
        else:
            return []
    with open(path, "r") as f:
        return json.load(f)

# --- LOGIN LOGIC (MATCHING YOUR HTML) ---
def check_login(username, password):
    # 1. Check Hardcoded Admin/Teacher Credentials
    fixed_users = [
        {"u": "admin",    "p": "admin123", "role": "admin"},
        {"u": "teacher1", "p": "t123",     "role": "teacher"},
        {"u": "teacher2", "p": "t123",     "role": "teacher"}
    ]
    
    for user in fixed_users:
        if username == user["u"] and password == user["p"]:
            return {"role": user["role"], "data": None}

    # 2. Check Student (Logic: Username == Password)
    if username == password:
        students = load_json("students.json")
        # Search for student with matching rollNo
        for student in students:
            # We use .get() to avoid errors if key is missing
            # checking 'rollNo' because that's what your JS used
            roll_no = str(student.get("rollNo", "")).strip() 
            if roll_no == username:
                return {"role": "student", "data": student}
    
    return None

# --- SESSION STATE SETUP ---
if "user_session" not in st.session_state:
    st.session_state.user_session = None

# --- MAIN APP ---

if st.session_state.user_session is None:
    # === LOGIN SCREEN ===
    st.title("🎓 SRMS Login")
    
    with st.form("login_form"):
        st.info("💡 Student Login: Use Roll No for BOTH username & password.")
        username = st.text_input("Username / Roll No")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")
        
        if submitted:
            result = check_login(username.strip(), password.strip())
            
            if result:
                st.session_state.user_session = result
                st.rerun()
            else:
                st.error("Invalid Credentials. (For students: Ensure Username matches Password)")

else:
    # === DASHBOARD (LOGGED IN) ===
    session = st.session_state.user_session
    role = session["role"]
    
    # Sidebar
    st.sidebar.title(f"Role: {role.capitalize()}")
    if st.sidebar.button("Logout"):
        st.session_state.user_session = None
        st.rerun()

    # --- STUDENT VIEW ---
    if role == "student":
        student = session["data"]
        st.title(f"Welcome, {student.get('name', 'Student')}")
        
        tab1, tab2, tab3 = st.tabs(["📋 Profile", "📊 Marks", "📅 Attendance"])
        
        with tab1:
            st.subheader("Student Details")
            st.json(student)
            
        with tab2:
            st.subheader("Marks Sheet")
            all_marks = load_json("marks.json")
            # Filter marks by student ID (assuming 'id' connects them)
            my_marks = [m for m in all_marks if str(m.get('student_id')) == str(student.get('id'))]
            if my_marks:
                st.dataframe(pd.DataFrame(my_marks))
            else:
                st.info("No marks found.")

        with tab3:
            st.subheader("Attendance")
            all_att = load_json("attendance.json")
            # Filter attendance
            my_att = [a for a in all_att if str(a.get('student_id')) == str(student.get('id'))]
            if my_att:
                st.dataframe(pd.DataFrame(my_att))
            else:
                st.info("No attendance records found.")

    # --- ADMIN / TEACHER VIEW ---
    else:
        st.title("Teacher/Admin Dashboard")
        st.warning("⚠️ This view is currently under construction in Streamlit.")
        st.write("You are logged in as:", role)
        
        # Show raw data for teachers to debug
        if st.checkbox("Show All Students Data"):
            st.json(load_json("students.json"))
