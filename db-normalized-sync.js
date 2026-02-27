/**
 * Normalized Supabase Sync
 * Replaces blob-based syncing with row-by-row syncing
 * Much more efficient, scalable, and conflict-safe
 */

// ============ Sync Functions for Individual Tables ============

export async function syncExercisesToCloud() {
    if (!useCloudSync() || syncInFlight) return true;
    const exercises = await tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll()));
    if (!exercises?.length) return true;
    
    try {
        const userId = authState.user.id;
        const rows = exercises.map(ex => ({
            id: ex.id,
            user_id: userId,
            name: ex.name,
            rep_floor: ex.repFloor,
            rep_ceiling: ex.repCeiling,
            rest_seconds: ex.restSeconds || null,
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabaseClient
            .from("exercises")
            .upsert(rows, { onConflict: "id" });
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to sync exercises:", err);
        return false;
    }
}

export async function syncSessionsToCloud() {
    if (!useCloudSync() || syncInFlight) return true;
    const sessions = await tx(["sessions"], "readonly", (store) => requestToPromise(store.getAll()));
    if (!sessions?.length) return true;
    
    try {
        const userId = authState.user.id;
        const rows = sessions.map(s => ({
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
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabaseClient
            .from("sessions")
            .upsert(rows, { onConflict: "id" });
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to sync sessions:", err);
        return false;
    }
}

export async function syncSetsToCloud() {
    if (!useCloudSync() || syncInFlight) return true;
    const sets = await tx(["sets"], "readonly", (store) => requestToPromise(store.getAll()));
    if (!sets?.length) return true;
    
    try {
        const userId = authState.user.id;
        const rows = sets.map(s => ({
            id: s.id,
            user_id: userId,
            session_id: s.sessionId,
            exercise_id: s.exerciseId,
            set_number: s.setNumber,
            weight: s.weight || null,
            reps: s.reps || null,
            is_skipped: s.isSkipped || false,
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabaseClient
            .from("sets")
            .upsert(rows, { onConflict: "id" });
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to sync sets:", err);
        return false;
    }
}

export async function syncTemplatesToCloud() {
    if (!useCloudSync() || syncInFlight) return true;
    const templates = await tx(["templates"], "readonly", (store) => requestToPromise(store.getAll()));
    if (!templates?.length) return true;
    
    try {
        const userId = authState.user.id;
        const rows = templates.map(t => ({
            id: t.id,
            user_id: userId,
            name: t.name,
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabaseClient
            .from("templates")
            .upsert(rows, { onConflict: "id" });
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to sync templates:", err);
        return false;
    }
}

export async function syncTemplateItemsToCloud() {
    if (!useCloudSync() || syncInFlight) return true;
    const items = await tx(["templateItems"], "readonly", (store) => requestToPromise(store.getAll()));
    if (!items?.length) return true;
    
    try {
        const userId = authState.user.id;
        const rows = items.map(item => ({
            id: item.id,
            user_id: userId,
            template_id: item.templateId,
            exercise_id: item.exerciseId,
            sets: item.sets,
            reps: item.reps,
            rest_seconds: item.restSeconds,
            superset_id: item.supersetId || null,
            superset_order: item.supersetOrder || null,
            updated_at: new Date().toISOString(),
        }));
        
        const { error } = await supabaseClient
            .from("template_items")
            .upsert(rows, { onConflict: "id" });
        
        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to sync template items:", err);
        return false;
    }
}

// ============ Sync Everything ============

export async function syncAllToCloud() {
    if (!useCloudSync()) return true;
    console.log("Starting comprehensive cloud sync...");
    
    try {
        await Promise.all([
            syncExercisesToCloud(),
            syncSessionsToCloud(),
            syncSetsToCloud(),
            syncTemplatesToCloud(),
            syncTemplateItemsToCloud(),
        ]);
        
        console.log("✓ All data synced to cloud");
        setSyncState({
            status: "idle",
            error: "",
            lastSyncedAt: new Date().toISOString(),
        });
        return true;
    } catch (err) {
        console.error("Sync failed:", err);
        setSyncState({
            status: "failed",
            error: parseSupabaseError(err, "Cloud sync failed"),
        });
        return false;
    }
}

// ============ Hydration from Cloud (Load All) ============

export async function hydrateAllFromCloud() {
    if (!useCloudSync()) return { loaded: false };
    const userId = authState.user.id;
    
    try {
        console.log("Loading all data from cloud...");
        
        const [exercisesData, sessionsData, setsData, templatesData, itemsData] = await Promise.all([
            supabaseClient
                .from("exercises")
                .select("*")
                .eq("user_id", userId),
            supabaseClient
                .from("sessions")
                .select("*")
                .eq("user_id", userId),
            supabaseClient
                .from("sets")
                .select("*")
                .eq("user_id", userId),
            supabaseClient
                .from("templates")
                .select("*")
                .eq("user_id", userId),
            supabaseClient
                .from("template_items")
                .select("*")
                .eq("user_id", userId),
        ]);
        
        // Check for errors
        if (exercisesData.error) throw exercisesData.error;
        if (sessionsData.error) throw sessionsData.error;
        if (setsData.error) throw setsData.error;
        if (templatesData.error) throw templatesData.error;
        if (itemsData.error) throw itemsData.error;
        
        const hasData = (exercisesData.data?.length || 0) > 0 ||
                        (sessionsData.data?.length || 0) > 0 ||
                        (setsData.data?.length || 0) > 0;
        
        if (!hasData) {
            console.log("No data in cloud");
            return { loaded: false };
        }
        
        // Import to local IndexedDB
        await tx(
            ["exercises", "sessions", "sets", "templates", "templateItems"],
            "readwrite",
            (exStore, sessStore, setStore, tmplStore, itemStore) => {
                // Convert snake_case to camelCase and import
                exercisesData.data?.forEach(row => {
                    exStore.put({
                        id: row.id,
                        name: row.name,
                        repFloor: row.rep_floor,
                        repCeiling: row.rep_ceiling,
                        restSeconds: row.rest_seconds,
                    });
                });
                
                sessionsData.data?.forEach(row => {
                    sessStore.put({
                        id: row.id,
                        date: row.date,
                        status: row.status,
                        notes: row.notes,
                        templateId: row.template_id,
                        startedAt: row.started_at,
                        finishedAt: row.finished_at,
                        isPaused: row.is_paused,
                        pausedAt: row.paused_at,
                        pausedAccumulatedSeconds: row.paused_accumulated_seconds,
                        exerciseIds: [], // Will be hydrated from sets
                    });
                });
                
                setsData.data?.forEach(row => {
                    setStore.put({
                        id: row.id,
                        sessionId: row.session_id,
                        exerciseId: row.exercise_id,
                        setNumber: row.set_number,
                        weight: row.weight,
                        reps: row.reps,
                        isSkipped: row.is_skipped,
                    });
                });
                
                templatesData.data?.forEach(row => {
                    tmplStore.put({
                        id: row.id,
                        name: row.name,
                    });
                });
                
                itemsData.data?.forEach(row => {
                    itemStore.put({
                        id: row.id,
                        templateId: row.template_id,
                        exerciseId: row.exercise_id,
                        sets: row.sets,
                        reps: row.reps,
                        restSeconds: row.rest_seconds,
                        supersetId: row.superset_id,
                        supersetOrder: row.superset_order,
                    });
                });
            }
        );
        
        console.log("✓ Cloud data imported:", {
            exercises: exercisesData.data?.length || 0,
            sessions: sessionsData.data?.length || 0,
            sets: setsData.data?.length || 0,
            templates: templatesData.data?.length || 0,
            items: itemsData.data?.length || 0,
        });
        
        return { loaded: true };
    } catch (err) {
        console.error("Hydration failed:", err);
        return { loaded: false };
    }
}
