# Import Teen Strength Program (nico.p.morway@gmail.com only)

**Do not run these steps while logged in as tacita.om@gmail.com.** These steps only affect the account you are logged in as (for step 2) and the account targeted in the SQL (step 1).

## 1. Clear all of nico’s data in the cloud

- Open **Supabase Dashboard** → **SQL Editor**.
- Open `supabase/clear_programs_and_workouts_nico_only.sql` and copy its contents.
- Run the script. It deletes only **nico.p.morway@gmail.com**’s data: sets, sessions, template_items, templates, exercises, and folders (it looks up that user by email). If that user doesn’t exist, it errors and deletes nothing.

## 2. Clear nico’s local data (recommended)

- In the app, **log in as nico.p.morway@gmail.com** (the device/browser that will use this account).
- Go to **Settings** → **Clear all local data**.  
  This clears that browser’s IndexedDB for the **currently logged-in user** (nico). Do **not** do this while logged in as tacita.om@gmail.com.

## 3. Import the teen strength program as nico

- Still logged in as **nico.p.morway@gmail.com**.
- Go to **Settings** → **Import** (workout programs).
- Choose the file **`data/teen-strength-program.json`** (or copy it to your device if the app reads from disk).
- Complete the import. This creates the program “5-Day Teen Muscle & Strength Program” and the 5 workouts (Day 1–5) with exercises and sets/reps/rest from the JSON. Any missing exercises are created in the library.

## 4. Sync

- Trigger a sync (or wait for the next one) so nico’s cloud data matches the new program and workouts.

---

**Files**

- `supabase/clear_programs_and_workouts_nico_only.sql` — run once in Supabase to clear only nico’s programs/workouts.
- `data/teen-strength-program.json` — import this in the app while logged in as nico.
