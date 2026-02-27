/**
 * One-time migration from blob-based to normalized schema
 * Converts existing user_snapshots blob data to individual tables
 */

const MIGRATION_FLAG = "overload-migrated-to-normalized";

export function hasMigrated() {
    return localStorage.getItem(MIGRATION_FLAG) === "true";
}

export function markMigrated() {
    localStorage.setItem(MIGRATION_FLAG, "true");
}

/**
 * Migrate existing blob data to normalized tables
 * Call this once per user after creating new tables
 */
export async function migrateToNormalizedSchema() {
    if (hasMigrated()) {
        console.log("Already migrated");
        return true;
    }
    
    console.log("=== Starting migration to normalized schema ===");
    
    try {
        // 1. Get existing blob from old table
        const { data: blobData, error: blobError } = await supabaseClient
            .from("user_snapshots")
            .select("payload")
            .eq("user_id", authState.user.id)
            .maybeSingle();
        
        if (blobError) {
            console.warn("No blob data found, starting fresh");
            markMigrated();
            return true;
        }
        
        if (!blobData?.payload) {
            console.log("Blob is empty, marking as migrated");
            markMigrated();
            return true;
        }
        
        const payload = blobData.payload;
        console.log("Found blob data:", {
            exercises: payload.exercises?.length || 0,
            sessions: payload.sessions?.length || 0,
            sets: payload.sets?.length || 0,
            templates: payload.templates?.length || 0,
            items: payload.templateItems?.length || 0,
        });
        
        const userId = authState.user.id;
        
        // 2. Insert exercises
        if (payload.exercises?.length > 0) {
            const exerciseRows = payload.exercises.map(ex => ({
                id: ex.id,
                user_id: userId,
                name: ex.name,
                rep_floor: ex.repFloor,
                rep_ceiling: ex.repCeiling,
                rest_seconds: ex.restSeconds || null,
            }));
            
            const { error } = await supabaseClient
                .from("exercises")
                .upsert(exerciseRows, { onConflict: "id" });
            
            if (error) throw new Error(`Failed to migrate exercises: ${error.message}`);
            console.log("✓ Migrated exercises");
        }
        
        // 3. Insert sessions
        if (payload.sessions?.length > 0) {
            const sessionRows = payload.sessions.map(s => ({
                id: s.id,
                user_id: userId,
                date: s.date,
                status: s.status || "draft",
                notes: s.notes || null,
                template_id: s.templateId || null,
                started_at: s.startedAt || null,
                finished_at: s.finishedAt || null,
                is_paused: s.isPaused || false,
                paused_at: s.pausedAt || null,
                paused_accumulated_seconds: parseInt(s.pausedAccumulatedSeconds || 0, 10),
            }));
            
            const { error } = await supabaseClient
                .from("sessions")
                .upsert(sessionRows, { onConflict: "id" });
            
            if (error) throw new Error(`Failed to migrate sessions: ${error.message}`);
            console.log("✓ Migrated sessions");
        }
        
        // 4. Insert sets
        if (payload.sets?.length > 0) {
            const setRows = payload.sets.map(s => ({
                id: s.id,
                user_id: userId,
                session_id: s.sessionId,
                exercise_id: s.exerciseId,
                set_number: s.setNumber,
                weight: s.weight || null,
                reps: s.reps || null,
                is_skipped: s.isSkipped || false,
            }));
            
            const { error } = await supabaseClient
                .from("sets")
                .upsert(setRows, { onConflict: "id" });
            
            if (error) throw new Error(`Failed to migrate sets: ${error.message}`);
            console.log("✓ Migrated sets");
        }
        
        // 5. Insert templates
        if (payload.templates?.length > 0) {
            const templateRows = payload.templates.map(t => ({
                id: t.id,
                user_id: userId,
                name: t.name,
            }));
            
            const { error } = await supabaseClient
                .from("templates")
                .upsert(templateRows, { onConflict: "id" });
            
            if (error) throw new Error(`Failed to migrate templates: ${error.message}`);
            console.log("✓ Migrated templates");
        }
        
        // 6. Insert template items
        if (payload.templateItems?.length > 0) {
            const itemRows = payload.templateItems.map(item => ({
                id: item.id,
                user_id: userId,
                template_id: item.templateId,
                exercise_id: item.exerciseId,
                sets: item.sets,
                reps: item.reps,
                rest_seconds: item.restSeconds,
                superset_id: item.supersetId || null,
                superset_order: item.supersetOrder || null,
            }));
            
            const { error } = await supabaseClient
                .from("template_items")
                .upsert(itemRows, { onConflict: "id" });
            
            if (error) throw new Error(`Failed to migrate template items: ${error.message}`);
            console.log("✓ Migrated template items");
        }
        
        markMigrated();
        console.log("=== Migration complete ===");
        return true;
    } catch (err) {
        console.error("Migration failed:", err);
        throw err;
    }
}
