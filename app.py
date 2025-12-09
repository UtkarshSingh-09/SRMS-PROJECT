import streamlit as st
import pandas as pd
import json
import os

# --- PAGE CONFIG ---
st.set_page_config(page_title="SRMS Student Portal", layout="centered")

# --- LOAD DATA FUNCTIONS ---
# We read directly from your existing 'backend' folder
def load_json(filename):
    path = os.path.join("backend", filename)
    if not os.path.exists(path):
        st.error(f"File not found: {path}")
        return []
    with open(path, "r") as f:
        return json.load(f)

# --- AUTHENTICATION LOGIC ---
if 'user' not in st.session_state:
    st.session_state.user = None

def login(username, password):
    students = load_json("students.json")
    # This logic assumes your JSON is a list of student objects
    # Adjust key names 'username'/'id' and 'password' based on your actual JSON structure
    for student in students:
        # Check if username matches (assuming 'id' or 'username' key exists)
        if str(student.get('id', '')) == username and student.get('password', '') == password:
            st.session_state.user = student
            st.rerun()
    st.error("Invalid Login Credentials")

def logout():
    st.session_state.user = None
    st.rerun()

# --- MAIN APP INTERFACE ---
if st.session_state.user is None:
    # === LOGIN SCREEN ===
    st.title("🎓 Student Login")
    
    # Simple styling to mimic your login.html
    with st.form("login_form"):
        username = st.text_input("Student ID")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Login")
        
        if submitted:
            login(username, password)

else:
    # === DASHBOARD SCREEN (Replaces index.html) ===
    student = st.session_state.user
    st.sidebar.title(f"Welcome, {student.get('name', 'Student')}")
    if st.sidebar.button("Logout"):
        logout()

    st.title("Student Dashboard")
    
    # Create Tabs for your different sections
    tab1, tab2, tab3 = st.tabs(["📋 Profile", "📊 Marks", "📅 Attendance"])

    with tab1:
        st.header("Student Profile")
        st.json(student) # Displays the student info nicely

    with tab2:
        st.header("Your Marks")
        all_marks = load_json("marks.json")
        # Filter marks for the logged-in student (assuming marks.json has 'student_id')
        student_marks = [m for m in all_marks if str(m.get('student_id')) == str(student.get('id'))]
        
        if student_marks:
            df = pd.DataFrame(student_marks)
            st.dataframe(df)
        else:
            st.info("No marks found for this student.")

    with tab3:
        st.header("Attendance Record")
        attendance_data = load_json("attendance.json")
        # Filter attendance (assuming attendance.json has 'student_id')
        my_attendance = [a for a in attendance_data if str(a.get('student_id')) == str(student.get('id'))]
        
        if my_attendance:
            df_att = pd.DataFrame(my_attendance)
            st.dataframe(df_att)
        else:
            st.info("No attendance records found.")