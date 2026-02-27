# Migration Plan: Blob → Normalized Schema

## Phase 1: Create New Supabase Tables (You do this)
1. Open Supabase dashboard
2. Go to SQL Editor
3. Copy the entire SQL from `SUPABASE_SCHEMA.sql`
4. Run it
5. Your new tables are created

**Time: 2 minutes**

## Phase 2: Update App Code (I do this)
- Import new sync functions into db.js
- Replace `pushLocalSnapshotToCloud()` with `syncAllToCloud()`
- Replace hydration logic with normalized hydration
- Add one-time migration logic

**Time: 30 minutes**

## Phase 3: One-Time Migration (Automatic on next login)
When you log in after Phase 2:
1. App checks if migration has run
2. If not, it reads your old blob data
3. Converts it to individual rows in new tables
4. Marks migration as complete
5. Next sync uses the new tables

**Time: Automatic, ~10 seconds**

## Phase 4: Cleanup (Optional, later)
Delete `user_snapshots` table and `localExportData`/`localImportData` functions
For now, we keep them for safety

## Risk Assessment

**Why this is safe:**
- New tables are isolated, can't affect existing blob
- Migration reads blob, doesn't delete it
- If migration fails, you still have blob as backup
- Can rollback by deleting new tables and running Phase 2 again

**What could go wrong:**
- SQL has syntax error (easily fixed)
- Migration script fails (would warn in console)
- Network issue mid-migration (retries automatically)

## What You Need to Do

1. **Run the SQL** from `SUPABASE_SCHEMA.sql` in your Supabase dashboard
2. **Tell me when it's done**
3. I implement Phase 2
4. You test by logging in and checking console logs

Want to proceed?
