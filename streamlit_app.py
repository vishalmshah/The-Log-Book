import streamlit as st

# Define the page
dashboard = st.Page("pages/dashboard.py", title="Main Page", icon="🎈")
log_session = st.Page("pages/log_session.py", title="Session Page", icon="📝")
log_week = st.Page("pages/log_week.py", title="Week Log", icon="📆")
edit_focus_and_exercises = st.Page("pages/edit_focus_and_exercises.py", title="Edit Focus and Exercises", icon="✏️")
# TODO: create a page for past practices -- use data editor

st.logo("🎸")

# Set up navigation
pg = st.navigation([dashboard, log_session, log_week, edit_focus_and_exercises])

# Run the selected page
pg.run()