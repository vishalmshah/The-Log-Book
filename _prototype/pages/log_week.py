import pandas as pd
import streamlit as st
from st_supabase_connection import SupabaseConnection
# from datetime import datetime
import datetime as dt

# Connect to databases
username = "new_default"
week_start = 'mon' # Can either be sun or mon

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

def update_weekly_db(updates, week_num, text="Updating exercises..."):
    response = conn.table('weekly_logs').upsert(
        updates,
        on_conflict="username, week_num, year"
    ).execute()
    if response.data:
        st.success(text)
    else:
        st.error("Error: Could not find or update the practice log.")
    # return response


# Parse data
weekly_focus_areas = user_rows.data[0]['weekly_focus']
weekly_focus_selections = {}
focus_A = weekly_focus_areas['weekly_A']
focus_B = weekly_focus_areas['weekly_B']
focus_C = weekly_focus_areas['weekly_C']


# Start creating the form

# Date picker
header_placeholder = st.empty()
d = st.date_input("Select any day in the target week", dt.date.today())

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

header_placeholder.markdown(f"# Focus for Week {week_num} ({year})")
st.write(f"**Range:** {start_date.strftime('%b %d')} — {end_date.strftime('%b %d')}")

# Connect to this week's db entry
weekly_rows = connect_to_weekly_db()
# st.write(weekly_rows.data)
# st.write(weekly_focus_areas)
if(len(weekly_rows.data) > 0):
    focus_init = weekly_rows.data[0]['focus_info']
    # st.write(focus_init)
else:
    focus_init = {
        focus_A: "",
        focus_B: "",
        focus_C: ""
    }
    # st.write(focus_init)

# Rest of form. this will also send info from above to server
with st.form('weekly_log_form', clear_on_submit=False):

    st.markdown("### This Week's Focus")

    if(focus_A):
        st.markdown(f"##### {focus_A}")
        weekly_focus_selections[focus_A] = st.text_input('Focus 1', label_visibility="collapsed", value=focus_init.get(focus_A, ""))

    focus_B = weekly_focus_areas['weekly_B']
    if(focus_B):
        st.markdown(f"##### {focus_B}")
        weekly_focus_selections[focus_B] = st.text_input('Focus 2', label_visibility="collapsed", value=focus_init.get(focus_B, ""))

    focus_C = weekly_focus_areas['weekly_C']
    if(focus_C):
        st.markdown(f"#### {focus_C}")
        weekly_focus_selections[focus_C] = st.text_input('Focus 3', label_visibility="collapsed", value=focus_init.get(focus_C, ""))

    submitted = st.form_submit_button("Save Week", key="week_submit")
    if submitted:
        update_data = {
            "username": username,
            "week_num": week_num,
            "year": year,
            "focus_info": weekly_focus_selections
        }
        update_weekly_db(update_data, week_num, f"Week {week_num} log updated! ({dt.datetime.now().strftime('%H:%M:%S')})")
        st.write(weekly_focus_selections)



# TODO: Sidebar stuff
st.sidebar.markdown("# Week Log")

# TODO:
# Create new database with weekly logs
# Create forms to select weekly criteria
# Show summary of weekly logs at bottom for reference



# Search database for any weeks that we are in right now
# If yes, paste that week in
# If no, enter empty form
# Give option to create a new week or to edit previous week

