import pandas as pd
import streamlit as st
from st_supabase_connection import SupabaseConnection
# from datetime import datetime
import datetime as dt
import time

# Set variables
d = dt.datetime.today()
date = dt.datetime.now().strftime('%a %b %d')
username = "new_default"
week_start = 'mon' # Can either be sun or mon

# Select week number
if week_start == 'mon':
    # --- ISO Standard (Monday Start) ---
    start_date = d - dt.timedelta(days=d.weekday())
    end_date = start_date + dt.timedelta(days=6)
    year, week_num, _ = d.isocalendar()
elif week_start == 'sun':
    # --- US Standard (Sunday Start) ---
    days_to_subtract = (d.weekday() + 1) % 7
    start_date = d - dt.timedelta(days=days_to_subtract)
    end_date = start_date + dt.timedelta(days=6)
    # Extract week number starting on Sunday (%U)
    week_num = int(start_date.strftime("%U"))
    year = start_date.year

# Set up connection to database
conn = st.connection("supabase",type=SupabaseConnection)
# Connect function
def connect_to_user_db():
    # Perform query.
    # TODO: Everyone has access to this, we need to set up some sort of auth!
    rows = conn.table('user_focus_and_exercises').select("*").eq("username", username).execute() # ttl is for caching time
    return rows
user_rows = connect_to_user_db()

def connect_to_weekly_db():
    # Perform query.
    # TODO: Everyone has access to this, we need to set up some sort of auth!
    rows = conn.table('weekly_logs').select("*").eq("username", username).eq("week_num", week_num).eq("year", year).execute() # ttl is for caching time
    return rows
weekly_rows = connect_to_weekly_db()

def connect_to_session_db(session_date):
    # Perform query.
    # TODO: Everyone has access to this, we need to set up some sort of auth!
    rows = conn.table('session_logs').select("*").eq("username", username).eq("date", session_date.strftime('%Y-%m-%d')).execute() # ttl is for caching time
    return rows

def update_session_db(updates, text="Updating exercises..."):
    response = conn.table('session_logs').upsert(
        updates,
        on_conflict="username, date"
    ).execute()
    if response.data:
        st.success(text)
    else:
        st.error("Error: Could not find or update the practice log.")
    # return response

# st.write(user_rows.data[0])
# st.write(weekly_rows.data[0])

# First, get all valid workouts for each focus
# Spine
spine_exercises = user_rows.data[0]['spine']['focus_ex']
spine_ex_notes = user_rows.data[0]['spine']['notes']
# Focus 1
focus_1_exercises = user_rows.data[0]['focus_1']['focus_ex']
focus_1_notes = user_rows.data[0]['focus_1']['notes']
focus_1_name = user_rows.data[0]['focus_1']['name']
focus_2_exercises = user_rows.data[0]['focus_2']['focus_ex']
focus_2_notes = user_rows.data[0]['focus_2']['notes']
focus_2_name = user_rows.data[0]['focus_2']['name']
focus_3_exercises = user_rows.data[0]['focus_3']['focus_ex']
focus_3_notes = user_rows.data[0]['focus_3']['notes']
focus_3_name = user_rows.data[0]['focus_3']['name']
# Weekly Focus Areas (as a note)
weekly_focus_areas = weekly_rows.data[0]['focus_info']


# Main page content
header_placeholder = st.empty()
date = st.date_input("Today's date", value=dt.datetime.now())
header_placeholder.markdown(f"# Practice Log for {date.strftime('%a %b %d')}")

st.markdown("### This week's focus areas:")
weekly_focus_df = pd.DataFrame(weekly_focus_areas.items(), 
                                columns=['Focus Area', 'Details'])
st.dataframe(
    weekly_focus_df,
    column_config={
        "Focus Area": st.column_config.Column(width="medium"),
        "Details": st.column_config.Column(width="large")
    },
    use_container_width=True, # Forces the table to stretch to the edges of the app
    hide_index=True           # Removes the ugly 0, 1, 2 row numbers on the left
)

st.markdown("### Today's Focus:")
todays_focus = st.selectbox('Select focus mode', [focus_1_name, focus_2_name, focus_3_name, 'Skipped'])

# Stopwatch
st.markdown("### Practice Timer")

# 1. Initialize session state variables
if 'start_time' not in st.session_state:
    st.session_state.start_time = None
if 'elapsed_time' not in st.session_state:
    st.session_state.elapsed_time = 0
if 'is_running' not in st.session_state:
    st.session_state.is_running = False

# 2. Layout the buttons
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Start", use_container_width=True):
        if not st.session_state.is_running:
            # Record the exact moment they clicked start, adjusting for previously elapsed time
            st.session_state.start_time = time.time() - st.session_state.elapsed_time
            st.session_state.is_running = True
            st.rerun()

with col2:
    if st.button("Stop", use_container_width=True):
        if st.session_state.is_running:
            # Calculate exactly how much time passed
            st.session_state.elapsed_time = time.time() - st.session_state.start_time
            st.session_state.is_running = False
            st.rerun()

with col3:
    if st.button("Reset", use_container_width=True):
        st.session_state.start_time = None
        st.session_state.elapsed_time = 0
        st.session_state.is_running = False
        st.rerun()

# 3. Calculate current display time
if st.session_state.is_running:
    current_elapsed = time.time() - st.session_state.start_time
else:
    current_elapsed = st.session_state.elapsed_time

# 4. Format and Display
mins, secs = divmod(int(current_elapsed), 60)
st.metric("Total Practice Time", f"{mins:02d}:{secs:02d}")

# (Optional) A button to save this exact time to your database
if not st.session_state.is_running and st.session_state.elapsed_time > 0:
    if st.button("Save to Log"):
        # You can access st.session_state.elapsed_time here to send to Supabase
        st.success(f"Saved {mins} minutes and {secs} seconds to database!")


with st.form('practice_log_form'):

    st.markdown('## Spine')
    # st.write(spine_exercises)
    spine_logs = []
    for i, ex in enumerate(spine_exercises):
        is_checked = st.checkbox(ex, key=f"spine_{i}")
        spine_logs.append(is_checked)
        # Render the note slightly indented underneath
        note = spine_ex_notes[i]
        if note: 
            st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp; ↳ *{note}*")

    
    # Only render the sub-bullet if there is actually a note written
    if note: 
        # Using non-breaking spaces (&nbsp;) and italics to create a clean sub-bullet look
        st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp; ↳ *{note}*")
    st.text_area("Spine notes")
    # st.write(spine_logs)
    
    st.divider()
    st.markdown(f'## Focus Mode: {todays_focus}')
    
    if todays_focus == 'Skipped':
        st.info("No worries! Try to get some practice in later this week.")
    elif todays_focus == focus_1_name:
        focus_1_logs = []
        for i, ex in enumerate(focus_1_exercises):
            is_checked = st.checkbox(ex, key=f"focus_1_{i}")
            focus_1_logs.append(is_checked)
            # Render the note slightly indented underneath
            note = focus_1_notes[i]
            if note: 
                st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp; ↳ *{note}*")
    elif todays_focus == focus_2_name:
        focus_2_logs = []
        for i, ex in enumerate(focus_2_exercises):
            is_checked = st.checkbox(ex, key=f"focus_2_{i}")
            focus_2_logs.append(is_checked)
            # Render the note slightly indented underneath
            note = focus_2_notes[i]
            if note: 
                st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp; ↳ *{note}*")
    elif todays_focus == focus_3_name:
        focus_3_logs = []
        for i, ex in enumerate(focus_3_exercises):
            is_checked = st.checkbox(ex, key=f"focus_3_{i}")
            focus_3_logs.append(is_checked)
            # Render the note slightly indented underneath
            note = focus_3_notes[i]
            if note: 
                st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp; ↳ *{note}*")
    else:
        st.error("Error: Invalid focus mode selected.")

    recordings = st.audio_input("Record your practice session")
    focus_notes = st.text_area("Focus Area notes")

    st.divider()
    st.markdown('## Notes')
    st.markdown('How focused were you?')
    focus_stars = st.feedback("stars", key='focus')
    st.markdown('What was your mood?')
    mood_stars = st.feedback("stars", key='mood')

    additional_notes = st.text_area("Additional notes")

    practice_duration = st.time_input('Total practice duration', value=dt.datetime.strptime("00:30:00", "%H:%M:%S"))

    submitted = st.form_submit_button("Save Log")

    if submitted:
        update = {
            "username": username,
            "date": date.strftime('%Y-%m-%d'),
            "week": week_num,
            "year": year,
            "todays_focus": todays_focus,
            "exercises_finished": {
                "spine_finished": [spine_exercises[i] for i in range(len(spine_exercises)) if spine_logs[i]],
                "spine_notes": spine_ex_notes,
                "focus_1_finished": [focus_1_exercises[i] for i in range(len(focus_1_exercises)) if todays_focus == focus_1_name and focus_1_logs[i]],
                "focus_1_notes": focus_1_notes,
                "focus_2_finished": [focus_2_exercises[i] for i in range(len(focus_2_exercises)) if todays_focus == focus_2_name and focus_2_logs[i]],
                "focus_2_notes": focus_2_notes,
                "focus_3_finished": [focus_3_exercises[i] for i in range(len(focus_3_exercises)) if todays_focus == focus_3_name and focus_3_logs[i]],
                "focus_3_notes": focus_3_notes
            },
            "additional_notes": {
                "additional_notes": additional_notes,
                "mood_stars": mood_stars,
                "focus_stars": focus_stars,
                "practice_duration": practice_duration.strftime("%H:%M:%S")
            }
        }
        update_session_db(update, "Practice session log updated!")
        st.write(update)

    
    # TODO TODO: on submit, save this to the database!





st.page_link("pages/dashboard.py", label="Back to Dashboard")


# Sidebar
st.sidebar.markdown("# Daily Practice Log")
st.sidebar.markdown(f"**{date}**")
st.sidebar.markdown(f"## Spine")
st.sidebar.markdown(f"## Focus Mode")
# TODO: finish sidebar