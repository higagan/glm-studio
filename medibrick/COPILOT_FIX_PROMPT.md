# Medibrick Streamlit App — Fix Prompt for VS Code Copilot

**Date:** 2026-06-01
**File to Fix:** `/Users/gagandeep/medibrick-leads/app.py` (889 lines)
**Current URL:** https://medibrick-outreach.streamlit.app/

---

## 🎯 Task

Fix **3 critical UI/UX issues** in the Medibrick Streamlit app:

1. **Migrate table from CSS hacks to `st.data_editor`** (currently using fragile CSS with `:has()` selector)
2. **Add mobile responsiveness** (currently 11 columns overflow on mobile)
3. **Fix export to respect filters** (currently exports ALL data, not filtered view)

**Bonus:** Convert "Add Lead" inline form to `st.dialog` modal for better UX.

---

## 📁 Current File Location

```
/Users/gagandeep/medibrick-leads/app.py
```

**Dependencies:**
- `daily_leads.csv` — data file (created by scraper)
- `requirements.txt` — should have `streamlit>=1.28.0` (for `st.dialog`)

---

## 🔴 Issue 1: Table Rendering (Lines 780-830 area)

### Current Approach (BROKEN)

Uses 11 `st.columns()` with heavy CSS hacks:

```python
header_ratios = [0.015, 0.028, 0.19, 0.10, 0.08, 0.075, 0.085, 0.065, 0.065, 0.075, 0.065]
ca, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9 = st.columns(header_ratios)
```

CSS relies on `:has(> .stColumn:nth-child(11):last-child)` which:
- Breaks on older browsers
- Breaks if column count changes
- Breaks on Streamlit updates
- Completely fails on mobile

### Required Fix

Replace with **`st.data_editor`**:

```python
# Define which columns are editable
column_config = {
    "hospital": st.column_config.TextColumn("Hospital", width="medium"),
    "role": st.column_config.TextColumn("Role", width="small"),
    "city": st.column_config.TextColumn("City", width="small"),
    "salary": st.column_config.TextColumn("Salary", width="small"),
    "contacted": st.column_config.SelectboxColumn("Contacted", options=["No", "Yes"]),
    "response_status": st.column_config.SelectboxColumn("Response", options=["", "Interested", "Follow-up", "No Response", "Not Interested"]),
    "recruiter_notes": st.column_config.TextColumn("Notes", width="large"),
}

# Display editable table
edited_df = st.data_editor(
    filtered_df,
    column_config=column_config,
    hide_index=True,
    use_container_width=True,
    num_rows="fixed"
)

# Auto-save changes
if edited_df is not None and not edited_df.equals(filtered_df):
    # Update original df with edited values
    save_data(edited_df)
    st.toast("Changes saved!", icon="💾")
```

**Requirements:**
- Show same columns as current table
- Keep color-coded priority badges (HIGH/MEDIUM/LOW)
- Keep "Last updated" timestamp
- Keep link to source URL
- Allow inline editing of Contacted/Response/Notes
- Auto-save on change

---

## 🔴 Issue 2: Mobile Responsiveness

### Current Problem

- 11 columns don't fit on mobile screens
- Filter bar (7 columns) overlaps
- Metric cards (5 in row) overflow
- Table requires horizontal scroll

### Required Fix

Add responsive CSS:

```css
/* Desktop (default) */
.metrics-container { grid-template-columns: repeat(5, 1fr); }

/* Tablet */
@media (max-width: 1024px) {
    .metrics-container { grid-template-columns: repeat(3, 1fr); }
}

/* Mobile */
@media (max-width: 768px) {
    .metrics-container { grid-template-columns: repeat(2, 1fr); }
    .filter-bar { flex-direction: column; }
    /* Show only essential columns in table */
}
```

**Alternative for data_editor:** Use `st.dataframe` on mobile with fewer columns, or add column visibility toggle.

---

## 🔴 Issue 3: Export Respects Filters

### Current Code (Line 888-889)

```python
csv_data = df.to_csv(index=False).encode("utf-8")  # Exports ALL data
st.download_button("📥 Export CSV", csv_data, ...)
```

### Required Fix

```python
# Export only filtered data, not entire df
csv_data = filtered.to_csv(index=False).encode("utf-8")
st.download_button("📥 Export Filtered CSV", csv_data, ...)
```

**Also add:**
- Show count of exported records: "Exporting 14 of 54 leads"
- Option to export all: "Export All (54)" vs "Export Filtered (14)"

---

## 🟡 Bonus: Add Lead Form → Modal Dialog

### Current (Lines 680-750 area)

Form appears inline below toolbar, stays open after save.

### Required Fix

```python
@st.dialog("Add New Lead", width="large")
def add_lead_form():
    new_hospital = st.text_input("Hospital *", placeholder="Apollo Hospital")
    new_role = st.text_input("Role *", placeholder="Duty Doctor")
    new_dept = st.text_input("Department", placeholder="Emergency")
    new_city = st.text_input("City *", placeholder="Bengaluru")
    new_salary = st.text_input("Salary", placeholder="₹40,000/month")
    new_url = st.text_input("Source URL", placeholder="https://...")
    
    if st.button("Save Lead", type="primary"):
        if new_hospital and new_role and new_city:
            # Add to df
            st.success("Lead added!")
            st.rerun()
        else:
            st.error("Please fill required fields")

if st.button("➕ Add Lead"):
    add_lead_form()
```

---

## 📊 Current Data Structure (daily_leads.csv)

```csv
hospital,role,department,city,salary,hiring_type,phone,email,contact,notes,date_posted,source_url,contacted,response_status,recruiter_notes,last_updated
```

**Editable columns:** `contacted`, `response_status`, `recruiter_notes`
**Auto-generated:** `last_updated` (timestamp)

---

## 🎨 Visual Design Requirements

Keep current design language:
- Clean white background
- Blue accent (#2563eb)
- Metric cards with hover effects
- Color-coded badges (HIGH=red, MEDIUM=orange, LOW=green)
- Professional SaaS aesthetic

---

## ✅ Acceptance Criteria

1. **Table renders correctly** on Chrome, Safari, Firefox (no CSS hacks)
2. **Table is editable inline** — changes auto-save
3. **Mobile view** shows table without horizontal scroll
4. **Export button** exports only currently filtered results
5. **Add Lead** opens in modal dialog, auto-closes on save
6. **All existing features preserved:** filters, sorting, pagination, toast notifications

---

## 🚀 How to Test

```bash
cd /Users/gagandeep/medibrick-leads
source venv/bin/activate
streamlit run app.py
```

Then check:
- [ ] http://localhost:8501 on desktop
- [ ] http://localhost:8501 on mobile (or resize browser to 375px width)
- [ ] Apply filters → Export → Verify only filtered rows export
- [ ] Edit contacted/response in table → Verify CSV updates
- [ ] Click Add Lead → Verify modal opens

---

**Context:** This is a recruiter operations dashboard for Medibrick (healthcare staffing startup). The app displays scraped job leads from hospitals/clinics. Recruiters view, filter, edit status, and export leads for outreach.

**Tech Stack:** Streamlit + Pandas + custom CSS
**Current Streamlit Version:** Check `requirements.txt` or `pip show streamlit`
**Data Source:** `daily_leads.csv` (updated by scraper.py cron job)

---

*Prepared by: Star (Medibrick AI Assistant)*
*Date: 2026-06-01*
