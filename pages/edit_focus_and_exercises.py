import pandas as pd
import streamlit as st
from st_supabase_connection import SupabaseConnection
from datetime import datetime

# TODO: fix this
username = "new_default"

# Connect function
def connect_to_user_db():
    # Set up connection to database
    conn = st.connection("supabase",type=SupabaseConnection)
    # Perform query.
    # TODO: Everyone has access to this, we need to set up some sort of auth!
    rows = conn.table('user_focus_and_exercises').select("*").eq("username", username).execute() # ttl is for caching time
    return conn,rows
conn,rows = connect_to_user_db()

# Parse out data
spine = rows.data[0]['spine']
focus_1 = rows.data[0]['focus_1']
focus_1_name_init = rows.data[0]['focus_1']['name']
focus_2 = rows.data[0]['focus_2']
focus_2_name_init = rows.data[0]['focus_2']['name']
focus_3 = rows.data[0]['focus_3']
focus_3_name_init = rows.data[0]['focus_3']['name']
weekly_A_init = rows.data[0]['weekly_focus']['weekly_A']
weekly_B_init = rows.data[0]['weekly_focus']['weekly_B']
weekly_C_init = rows.data[0]['weekly_focus']['weekly_C']

def update_user_db(updates, text="Updating exercises..."):
    response = conn.table('user_focus_and_exercises').update(updates).eq("username", username).execute()
    if response.data:
        st.success(text)
    else:
        st.error("Error: Could not find or update the practice log.")
    # return response

# Sidebar
st.sidebar.markdown("# Edit Focus and Exercises")
st.sidebar.markdown("### Weekly Focus")
st.sidebar.markdown("### Spine Exercises")
st.sidebar.markdown("### Focus 1 Exercises")
st.sidebar.markdown("### Focus 2 Exercises")
st.sidebar.markdown("### Focus 3 Exercises")
# TODO: finish sidebars -- maybe link to page section

# Content Starts Here
st.markdown("# Set focus and exercises")

# Focus areas
with st.form('edit_focus_form', clear_on_submit=False):
    st.markdown('## Session Focus Areas')
    focus_1_name = st.text_input("Focus 1 name", value=focus_1_name_init)
    focus_2_name = st.text_input("Focus 2 name", value=focus_2_name_init)
    focus_3_name = st.text_input("Focus 3 name", value=focus_3_name_init)

    submitted = st.form_submit_button("Save Focuses")
    if submitted:
        focus_1['name'] = focus_1_name
        focus_2['name'] = focus_2_name
        focus_3['name'] = focus_3_name
        update_focus_names = {
            "focus_1": focus_1,
            "focus_2": focus_2,
            "focus_3": focus_3
        }
        update_user_db(update_focus_names, "Focus areas updated!")

# Edit exercises for each focus area
# TODO: add this to cache or form or something so it doesn't update on every change
def exercise_editor(category, field_name):
    cat_name = category['name']
    # st.write(category)
    cat_df = pd.DataFrame({
        "Focused?": pd.Series(category['focus_bool'], dtype='bool'),
        f"{cat_name} Exercise": pd.Series(category['all_ex'], dtype='string'),
        "Notes": pd.Series(category['notes'], dtype='string')
    })
    edited_cat = st.data_editor(cat_df, 
                                num_rows="dynamic", 
                                key=f"{cat_name}_editor",
                                height='content',
                                column_config={
                                    "Focused?": st.column_config.CheckboxColumn("Focused?", width="auto"),
                                    f"{cat_name} Exercise": st.column_config.TextColumn(f"{cat_name} Exercise", width="medium"),
                                    "Notes": st.column_config.TextColumn("Notes", width="large")
                                })
    
    submitted = st.form_submit_button("Save Exercises", key=f"{cat_name}_submit")
    if submitted:
        update_data = {
            f"{field_name}": {
                "name": cat_name,
                "focus_bool": edited_cat["Focused?"].replace({pd.NA: False}).tolist(),
                "all_ex": edited_cat[f"{cat_name} Exercise"].replace({pd.NA: False}).tolist(),
                "notes": edited_cat["Notes"].replace({pd.NA: False}).tolist(),
                "focus_ex": [ex for ex, focused in zip(edited_cat[f"{cat_name} Exercise"], edited_cat["Focused?"]) if focused]
            }
        }
        update_user_db(update_data, f"{cat_name} exercises updated! ({datetime.now().strftime('%H:%M:%S')})")

# Spine exercises
with st.form('spine_exercises_form', clear_on_submit=False):
    st.markdown('## Spine Exercises')
    st.write("These exercises should be done every day regardless of focus areas.")
    exercise_editor(spine, "spine")

# TODO: limit to only 4 exercises. do not allow any more to be added
# Focus 1 exercises
with st.form('focus_1_exercises_form', clear_on_submit=False):
    st.markdown(f'## Focus 1: {focus_1_name} Exercises')
    st.write("Select at maximum 3 exercises to ensure focus in practice sessions.")
    exercise_editor(focus_1, "focus_1")

# Focus 2 exercises
with st.form('focus_2_exercises_form', clear_on_submit=False):
    st.markdown(f'## Focus 2: {focus_2_name} Exercises')
    st.write("Select at maximum 3 exercises to ensure focus in practice sessions.")
    exercise_editor(focus_2, "focus_2")

# Focus 3 exercises
with st.form('focus_3_exercises_form', clear_on_submit=False):
    st.markdown(f'## Focus 3: {focus_3_name} Exercises')
    st.write("Select at maximum 3 exercises to ensure focus in practice sessions.")
    exercise_editor(focus_3, "focus_3")


# Weekly focus areas
with st.form('weekly_focus_form', clear_on_submit=False):
    st.markdown('## Weekly Focus Areas')
    weekly_A = st.text_input("Weekly Focus Area 1 Name", value=weekly_A_init)
    weekly_B = st.text_input("Weekly Focus Area 2 Name", value=weekly_B_init)
    weekly_C = st.text_input("Weekly Focus Area 3 Name", value=weekly_C_init)

    submitted_weekly = st.form_submit_button("Save Weekly Focuses")
    if submitted_weekly:
        update_weekly_names = {
            "weekly_focus": {
                "weekly_A": weekly_A,
                "weekly_B": weekly_B,
                "weekly_C": weekly_C
            }
        }
        update_user_db(update_weekly_names, "Weekly focus areas updated!")
