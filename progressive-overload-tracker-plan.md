# Progressive Overload Tracker — App Plan

## Overview

A PWA (Progressive Web App) for tracking gym progress over time using progressive overload principles. The app tracks exercises, sets, reps, and weights, then automatically calculates what the user should lift next session.

---

## Core Features

### 1. Exercise Management
- User can create custom exercises (e.g., "Bench Press", "Squat", "Lat Pulldown")
- Each exercise has its own configurable settings:
  - **Rep range** (floor and ceiling) — e.g., 8–12, 5–8, 12–15 (varies per exercise)
  - **Weight increment** — how much to increase when rep ceiling is hit (varies per exercise, e.g., 5 lbs for bench, 10 lbs for squat)

### 2. Workout Templates
- User can create named workout groups (e.g., "Push Day", "Leg Day", "Pull Day")
- Each template contains a list of exercises
- Templates are reusable — user selects a template to start logging

### 3. Logging a Session
- User selects a workout template (or logs individual exercises)
- For each exercise, user logs **all sets**: weight × reps for each set
- Each session is automatically date-stamped
- User can add **free-text notes** to any session (e.g., "felt easy", "tweaked shoulder", "low energy today")

### 4. Progressive Overload Logic
- The app calculates the **next session target** based on the **top set only** (heaviest weight × most reps at that weight)
- Logic:
  1. If the user has NOT hit their rep ceiling on the top set → **Target: same weight, +1-2 reps**
  2. If the user HAS hit their rep ceiling on the top set → **Target: increase weight by the exercise's configured increment, drop reps back to the rep floor**
- Example with 8–12 rep range, 5 lb increment:
  - Session 1: 135 lbs × 10 reps → Next target: 135 lbs × 11-12 reps
  - Session 2: 135 lbs × 12 reps → Next target: 140 lbs × 8 reps
  - Session 3: 140 lbs × 8 reps → Next target: 140 lbs × 9-10 reps
- Target is displayed prominently when the user opens an exercise to log

### 5. Exercise History View
- Main screen shows a **list of all exercises**
- Tapping an exercise shows **full history** for that exercise:
  - Chronologically ordered (newest first or oldest first — user preference)
  - Each entry shows: **date, all sets (weight × reps), and any notes**
  - Top set for each session should be visually highlighted or indicated

### 6. Progress Graph
- Each exercise has a **graph view** showing weight progression over time
- X-axis: date
- Y-axis: weight (top set)
- Simple line chart showing the trend

### 7. Notes
- Notes can be attached to individual workout sessions
- Notes are visible in the exercise history view

---

## Technical Requirements

### Platform
- **PWA** (Progressive Web App) — installable on phone home screen, works offline
- Mobile-first design, but should work on desktop too

### Data Persistence
- Data must be **persistent** — survives browser cache clearing
- Should sync or be accessible across devices if possible
- Options to consider (in order of preference):
  1. Cloud sync with user accounts (e.g., Firebase, Supabase)
  2. Export/import backup functionality at minimum
  3. IndexedDB as local fallback

### Tech Stack (Suggested)
- **Frontend:** React or Next.js with Tailwind CSS
- **Backend/Storage:** Supabase (free tier) or Firebase for persistence + sync
- **PWA:** Service worker for offline support, manifest for installability
- **Charting:** Recharts or Chart.js for the progress graphs

### Free
- Must be hostable for free (Vercel, Netlify, or similar)
- No paid dependencies

---

## Data Model

### Exercise
- `id` (unique)
- `name` (string)
- `rep_floor` (integer) — e.g., 8
- `rep_ceiling` (integer) — e.g., 12
- `weight_increment` (number) — e.g., 5

### Workout Template
- `id` (unique)
- `name` (string) — e.g., "Push Day"
- `exercise_ids` (array of exercise IDs)

### Workout Session
- `id` (unique)
- `date` (auto-stamped)
- `template_id` (optional — which template was used)
- `notes` (string, optional)

### Set Log
- `id` (unique)
- `session_id` (FK to workout session)
- `exercise_id` (FK to exercise)
- `set_number` (integer — order within the exercise for that session)
- `weight` (number)
- `reps` (integer)

---

## User Flow

1. **Open app** → See list of workout templates OR list of exercises
2. **Start workout** → Select template → App loads exercises in that template
3. **Log exercise** → App shows last session's top set + the next target → User enters weight and reps for each set
4. **Add notes** → Optional free-text note for the session
5. **Finish workout** → Session saved with date
6. **View history** → Tap any exercise → See chronological list of all sessions with date, sets, and notes
7. **View graph** → From exercise history, toggle to graph view showing weight over time

---

## UI Priorities
- **Speed of entry** — logging a set should be minimal taps (number pad for weight + reps, confirm)
- **Clear targets** — the next session target should be the first thing you see when opening an exercise
- **Clean history** — easy to scroll through past sessions
- **Mobile-first** — thumb-friendly, large tap targets
