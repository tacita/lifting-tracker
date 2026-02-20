import { SUPABASE_URL as HARDCODED_SUPABASE_URL, SUPABASE_ANON_KEY as HARDCODED_SUPABASE_ANON_KEY } from "./supabase-config.js";

const DB_NAME = "overload-db";
const DB_VERSION = 1;

let dbPromise;
let supabaseClient = null;
let authState = {
    configured: false,
    user: null,
    loading: true,
};
let authListeners = [];
let authSubscription = null;
let syncTimer = null;
let syncInFlight = false;

const SUPABASE_URL_KEY = "overload-supabase-url";
const SUPABASE_ANON_KEY = "overload-supabase-anon-key";
const SEEDED_USERS_KEY = "overload-cloud-seeded-users";
const SNAPSHOT_TABLE = "user_snapshots";

const DEFAULT_EXERCISES = [
    { name: "Smith Machine Squat", repFloor: 6, repCeiling: 10, weightIncrement: 10 },
    { name: "Leg Press", repFloor: 8, repCeiling: 12, weightIncrement: 10 },
    { name: "Leg Extension", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Seated Leg Curl", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Hip Thrust (Smith)", repFloor: 8, repCeiling: 12, weightIncrement: 10 },
    { name: "Standing Calf Raise", repFloor: 10, repCeiling: 15, weightIncrement: 10 },
    { name: "Machine Chest Press", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "Incline Dumbbell Press", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "Pec Deck", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Cable Fly", repFloor: 12, repCeiling: 15, weightIncrement: 5 },
    { name: "Shoulder Press Machine", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "Dumbbell Lateral Raise", repFloor: 12, repCeiling: 20, weightIncrement: 2.5 },
    { name: "Triceps Pressdown", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Overhead Triceps Extension (Cable)", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Lat Pulldown", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "Seated Cable Row", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "Chest-Supported Row Machine", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "Rear Delt Fly Machine", repFloor: 12, repCeiling: 20, weightIncrement: 5 },
    { name: "Dumbbell Romanian Deadlift", repFloor: 8, repCeiling: 12, weightIncrement: 5 },
    { name: "EZ-Bar Curl", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Hammer Curl", repFloor: 10, repCeiling: 15, weightIncrement: 5 },
    { name: "Wrist Curl (Dumbbell)", repFloor: 12, repCeiling: 20, weightIncrement: 2.5 },
    { name: "Cable Crunch", repFloor: 12, repCeiling: 20, weightIncrement: 5 },
    { name: "Hanging Knee Raise", repFloor: 10, repCeiling: 15, weightIncrement: 0 },
];

const DEFAULT_TEMPLATES = [
    {
        name: "Chest and Back",
        exercises: [
            { name: "Machine Chest Press", sets: 4, reps: "6-10", restSeconds: 120 },
            { name: "Incline Dumbbell Press", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Pec Deck", sets: 3, reps: "10-15", restSeconds: 75 },
            { name: "Lat Pulldown", sets: 4, reps: "8-12", restSeconds: 90 },
            { name: "Seated Cable Row", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Chest-Supported Row Machine", sets: 3, reps: "10-12", restSeconds: 75 },
        ],
    },
    {
        name: "Shoulders and Arms",
        exercises: [
            { name: "Shoulder Press Machine", sets: 4, reps: "6-10", restSeconds: 120 },
            { name: "Dumbbell Lateral Raise", sets: 4, reps: "12-20", restSeconds: 60 },
            { name: "Rear Delt Fly Machine", sets: 3, reps: "12-20", restSeconds: 60 },
            { name: "Triceps Pressdown", sets: 3, reps: "10-15", restSeconds: 75 },
            { name: "Overhead Triceps Extension (Cable)", sets: 3, reps: "10-15", restSeconds: 75 },
            { name: "EZ-Bar Curl", sets: 3, reps: "10-15", restSeconds: 75 },
            { name: "Hammer Curl", sets: 3, reps: "10-15", restSeconds: 75 },
        ],
    },
    {
        name: "Legs, Forearms and Abs",
        exercises: [
            { name: "Smith Machine Squat", sets: 4, reps: "6-10", restSeconds: 120 },
            { name: "Leg Press", sets: 4, reps: "10-12", restSeconds: 120 },
            { name: "Leg Extension", sets: 3, reps: "12-15", restSeconds: 75 },
            { name: "Seated Leg Curl", sets: 3, reps: "10-15", restSeconds: 75 },
            { name: "Standing Calf Raise", sets: 4, reps: "12-20", restSeconds: 60 },
            { name: "Wrist Curl (Dumbbell)", sets: 3, reps: "12-20", restSeconds: 60 },
            { name: "Cable Crunch", sets: 3, reps: "12-20", restSeconds: 60 },
            { name: "Hanging Knee Raise", sets: 3, reps: "10-15", restSeconds: 60 },
        ],
    },
    {
        name: "Rest (Day 4)",
        exercises: [],
    },
    {
        name: "Upper",
        exercises: [
            { name: "Machine Chest Press", sets: 3, reps: "6-10", restSeconds: 120 },
            { name: "Incline Dumbbell Press", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Lat Pulldown", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Seated Cable Row", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Shoulder Press Machine", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Triceps Pressdown", sets: 2, reps: "10-15", restSeconds: 60 },
            { name: "EZ-Bar Curl", sets: 2, reps: "10-15", restSeconds: 60 },
        ],
    },
    {
        name: "Lower",
        exercises: [
            { name: "Smith Machine Squat", sets: 3, reps: "6-10", restSeconds: 120 },
            { name: "Leg Press", sets: 3, reps: "10-12", restSeconds: 120 },
            { name: "Leg Extension", sets: 3, reps: "12-15", restSeconds: 75 },
            { name: "Seated Leg Curl", sets: 3, reps: "10-15", restSeconds: 75 },
            { name: "Hip Thrust (Smith)", sets: 3, reps: "8-12", restSeconds: 90 },
            { name: "Standing Calf Raise", sets: 4, reps: "12-20", restSeconds: 60 },
            { name: "Cable Crunch", sets: 3, reps: "12-20", restSeconds: 60 },
        ],
    },
    {
        name: "Rest (Day 7)",
        exercises: [],
    },
];

function normalizeName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function createId(existingIds) {
    let nextId;
    do {
        nextId = Date.now() + Math.floor(Math.random() * 1000000);
    } while (existingIds.has(String(nextId)));
    existingIds.add(String(nextId));
    return nextId;
}

function sanitizeTemplateItems(items) {
    return (items || [])
        .map((item) => ({
            exerciseId: item.exerciseId,
            sets: Math.max(1, Number.parseInt(item.sets, 10) || 3),
            reps: String(item.reps || "8-12").trim(),
            restSeconds: Math.max(0, Number.parseInt(item.restSeconds, 10) || 90),
        }))
        .filter((item) => item.exerciseId !== undefined && item.exerciseId !== null && item.reps);
}

function normalizeTemplate(template) {
    const items = Array.isArray(template.items)
        ? sanitizeTemplateItems(template.items)
        : (template.exerciseIds || []).map((exerciseId) => ({
            exerciseId,
            sets: 3,
            reps: "8-12",
            restSeconds: 90,
        }));
    return {
        ...template,
        items,
        exerciseIds: items.map((item) => item.exerciseId),
    };
}

function buildTemplateItemsFromDefinitions(definitions, exerciseIdByName) {
    return sanitizeTemplateItems(
        definitions
            .map((entry) => {
                const exerciseId = exerciseIdByName.get(normalizeName(entry.name));
                if (exerciseId === undefined || exerciseId === null) return null;
                return {
                    exerciseId,
                    sets: entry.sets,
                    reps: entry.reps,
                    restSeconds: entry.restSeconds,
                };
            })
            .filter(Boolean)
    );
}

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
            const db = req.result;
            if (event.oldVersion < 1) {
                const exercises = db.createObjectStore("exercises", { keyPath: "id" });
                exercises.createIndex("name", "name", { unique: false });

                const templates = db.createObjectStore("templates", { keyPath: "id" });

                const sessions = db.createObjectStore("sessions", { keyPath: "id" });
                sessions.createIndex("date", "date", { unique: false });
                sessions.createIndex("status", "status", { unique: false });

                const sets = db.createObjectStore("sets", { keyPath: "id" });
                sets.createIndex("sessionId", "sessionId", { unique: false });
                sets.createIndex("exerciseId", "exerciseId", { unique: false });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

async function tx(storeNames, mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode);
        const stores = storeNames.map((name) => transaction.objectStore(name));
        const result = fn(...stores);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
    });
}

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    });
}

export function getSupabaseConfig() {
    const hardcodedUrl = String(HARDCODED_SUPABASE_URL || "").trim();
    const hardcodedAnonKey = String(HARDCODED_SUPABASE_ANON_KEY || "").trim();
    if (hardcodedUrl && hardcodedAnonKey) {
        return { url: hardcodedUrl, anonKey: hardcodedAnonKey };
    }
    return {
        url: localStorage.getItem(SUPABASE_URL_KEY) || "",
        anonKey: localStorage.getItem(SUPABASE_ANON_KEY) || "",
    };
}

export function isSupabaseConfigHardcoded() {
    const hardcodedUrl = String(HARDCODED_SUPABASE_URL || "").trim();
    const hardcodedAnonKey = String(HARDCODED_SUPABASE_ANON_KEY || "").trim();
    return Boolean(hardcodedUrl && hardcodedAnonKey);
}

export async function setSupabaseConfig({ url, anonKey }) {
    const normalizedUrl = String(url || "").trim();
    const normalizedAnonKey = String(anonKey || "").trim();
    if (!normalizedUrl || !normalizedAnonKey) {
        throw new Error("Supabase URL and anon key are required");
    }
    localStorage.setItem(SUPABASE_URL_KEY, normalizedUrl);
    localStorage.setItem(SUPABASE_ANON_KEY, normalizedAnonKey);
    await initAuth();
}

export async function initAuth() {
    authState.loading = true;
    notifyAuthListeners();

    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) {
        authState = { configured: false, user: null, loading: false };
        notifyAuthListeners();
        return authState;
    }

    if (!supabaseClient) {
        const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        supabaseClient = module.createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }

    if (!authSubscription) {
        const listener = async (event, session) => {
            authState = {
                configured: true,
                user: session?.user || null,
                loading: false,
            };
            notifyAuthListeners();
            if (session?.user) {
                try {
                    await ensureInitialCloudSeedForUser();
                    notifyAuthListeners();
                } catch (err) {
                    console.error(err);
                }
            }
        };
        const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
            listener(event, session).catch((err) => console.error(err));
        });
        authSubscription = data.subscription;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        throw new Error(parseSupabaseError(error, "Could not initialize auth"));
    }

    authState = {
        configured: true,
        user: data.session?.user || null,
        loading: false,
    };
    notifyAuthListeners();

    if (authState.user) {
        await ensureInitialCloudSeedForUser();
        notifyAuthListeners();
    }

    return { ...authState };
}

export function getAuthState() {
    return { ...authState };
}

export function onAuthStateChange(listener) {
    if (typeof listener !== "function") return () => {};
    authListeners.push(listener);
    listener({ ...authState });
    return () => {
        authListeners = authListeners.filter((item) => item !== listener);
    };
}

export async function signInWithGoogle() {
    if (!supabaseClient) throw new Error("Configure Supabase first");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
    });
    if (error) {
        throw new Error(parseSupabaseError(error, "Google sign-in failed"));
    }
}

export async function signInWithMagicLink(email) {
    if (!supabaseClient) throw new Error("Configure Supabase first");
    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) throw new Error("Email is required");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: redirectTo },
    });
    if (error) {
        throw new Error(parseSupabaseError(error, "Magic link sign-in failed"));
    }
}

export async function signOutCloud() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        throw new Error(parseSupabaseError(error, "Sign out failed"));
    }
}

export async function forceSyncToCloud() {
    await pushLocalSnapshotToCloud();
}

function notifyAuthListeners() {
    authListeners.forEach((listener) => listener({ ...authState }));
}

function parseSupabaseError(error, fallback) {
    if (!error) return fallback;
    return error.message || String(error) || fallback;
}

function getSeededUsers() {
    try {
        const value = JSON.parse(localStorage.getItem(SEEDED_USERS_KEY) || "[]");
        return new Set(Array.isArray(value) ? value : []);
    } catch {
        return new Set();
    }
}

function markUserSeeded(userId) {
    const users = getSeededUsers();
    users.add(String(userId));
    localStorage.setItem(SEEDED_USERS_KEY, JSON.stringify(Array.from(users)));
}

function isUserSeeded(userId) {
    return getSeededUsers().has(String(userId));
}

function useCloudSync() {
    return Boolean(supabaseClient && authState.user);
}

async function localExportData() {
    const [exercises, templates, sessions, sets] = await Promise.all([
        tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll())),
        tx(["templates"], "readonly", (store) => requestToPromise(store.getAll())),
        getSessions({ includeDraft: true }),
        tx(["sets"], "readonly", (store) => requestToPromise(store.getAll())),
    ]);
    return { exportedAt: new Date().toISOString(), exercises, templates, sessions, sets };
}

async function localImportData(data) {
    if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.templates) || !Array.isArray(data.sessions) || !Array.isArray(data.sets)) {
        throw new Error("Invalid import data");
    }
    await tx(["exercises", "templates", "sessions", "sets"], "readwrite", (exStore, tmplStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        sessionStore.clear();
        setStore.clear();

        data.exercises.forEach((item) => exStore.add(item));
        data.templates.forEach((item) => tmplStore.add(item));
        data.sessions.forEach((item) => sessionStore.add(item));
        data.sets.forEach((item) => setStore.add(item));
    });
}

async function pushLocalSnapshotToCloud() {
    if (!useCloudSync() || syncInFlight) return;
    syncInFlight = true;
    try {
        const payload = await localExportData();
        const userId = authState.user.id;
        const { error } = await supabaseClient
            .from(SNAPSHOT_TABLE)
            .upsert(
                {
                    user_id: userId,
                    payload,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            );
        if (error) {
            throw new Error(parseSupabaseError(error, "Failed to sync to cloud"));
        }
    } finally {
        syncInFlight = false;
    }
}

function scheduleCloudSync() {
    if (!useCloudSync()) return;
    if (syncTimer) {
        clearTimeout(syncTimer);
    }
    syncTimer = setTimeout(() => {
        pushLocalSnapshotToCloud().catch((err) => console.error(err));
    }, 500);
}

async function hydrateLocalFromCloudIfAvailable() {
    if (!useCloudSync()) return { loaded: false };
    const userId = authState.user.id;
    const { data, error } = await supabaseClient
        .from(SNAPSHOT_TABLE)
        .select("payload")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) {
        throw new Error(parseSupabaseError(error, "Failed to load cloud data"));
    }
    if (!data || !data.payload) {
        return { loaded: false };
    }
    await localImportData(data.payload);
    return { loaded: true };
}

async function ensureInitialCloudSeedForUser() {
    if (!useCloudSync()) return;
    const userId = String(authState.user.id);
    const hydrated = await hydrateLocalFromCloudIfAvailable();
    if (hydrated.loaded) {
        markUserSeeded(userId);
        return;
    }
    if (isUserSeeded(userId)) return;
    await pushLocalSnapshotToCloud();
    markUserSeeded(userId);
}

// Exercises
export async function addExercise(exercise) {
    const result = await tx(["exercises"], "readwrite", (store) => store.add(exercise));
    scheduleCloudSync();
    return result;
}

export async function updateExercise(exercise) {
    const result = await tx(["exercises"], "readwrite", (store) => store.put(exercise));
    scheduleCloudSync();
    return result;
}

export async function deleteExercise(exerciseId) {
    const result = await tx(["exercises", "templates", "sets"], "readwrite", (exStore, tmplStore, setStore) => {
        exStore.delete(exerciseId);

        // Remove exercise from templates
        tmplStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const tmpl = cursor.value;
                const currentIds = tmpl.exerciseIds || [];
                const nextIds = currentIds.filter((id) => String(id) !== String(exerciseId));
                const currentItems = Array.isArray(tmpl.items) ? tmpl.items : [];
                const nextItems = currentItems.filter((item) => String(item.exerciseId) !== String(exerciseId));
                if (nextIds.length !== currentIds.length || nextItems.length !== currentItems.length) {
                    cursor.update({
                        ...tmpl,
                        exerciseIds: nextIds,
                        items: nextItems,
                    });
                }
                cursor.continue();
            }
        };

        // Delete sets for this exercise
        const index = setStore.index("exerciseId");
        index.openCursor(IDBKeyRange.only(exerciseId)).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    });
    scheduleCloudSync();
    return result;
}

export async function getExercises() {
    return tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll()));
}

// Templates
export async function addTemplate(template) {
    const result = await tx(["templates"], "readwrite", (store) => store.add(normalizeTemplate(template)));
    scheduleCloudSync();
    return result;
}

export async function updateTemplate(template) {
    const result = await tx(["templates"], "readwrite", (store) => store.put(normalizeTemplate(template)));
    scheduleCloudSync();
    return result;
}

export async function deleteTemplate(templateId) {
    const result = await tx(["templates"], "readwrite", (store) => store.delete(templateId));
    scheduleCloudSync();
    return result;
}

export async function getTemplates() {
    return tx(["templates"], "readonly", (store) => requestToPromise(store.getAll()));
}

// Sessions
export async function addSession(session) {
    const result = await tx(["sessions"], "readwrite", (store) => store.add(session));
    scheduleCloudSync();
    return result;
}

export async function updateSession(session) {
    const result = await tx(["sessions"], "readwrite", (store) => store.put(session));
    scheduleCloudSync();
    return result;
}

export async function deleteSession(sessionId) {
    const result = await tx(["sessions", "sets"], "readwrite", (sessionStore, setStore) => {
        sessionStore.delete(sessionId);
        const index = setStore.index("sessionId");
        index.openCursor(IDBKeyRange.only(sessionId)).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    });
    scheduleCloudSync();
    return result;
}

export async function getSessions({ includeDraft = false } = {}) {
    return tx(["sessions"], "readonly", (store) => {
        return new Promise((resolve) => {
            const sessions = [];
            const index = store.index("date");
            index.openCursor(null, "prev").onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const value = cursor.value;
                    if (includeDraft || value.status !== "draft") {
                        sessions.push(value);
                    }
                    cursor.continue();
                } else {
                    resolve(sessions);
                }
            };
        });
    });
}

// Sets
export async function addSet(set) {
    const result = await tx(["sets"], "readwrite", (store) => store.add(set));
    scheduleCloudSync();
    return result;
}

export async function updateSet(set) {
    const result = await tx(["sets"], "readwrite", (store) => store.put(set));
    scheduleCloudSync();
    return result;
}

export async function deleteSet(setId) {
    const result = await tx(["sets"], "readwrite", (store) => store.delete(setId));
    scheduleCloudSync();
    return result;
}

export async function getSetsForSession(sessionId) {
    return tx(["sets"], "readonly", (store) => {
        return new Promise((resolve) => {
            const sets = [];
            const index = store.index("sessionId");
            index.openCursor(IDBKeyRange.only(sessionId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    sets.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(sets);
                }
            };
        });
    });
}

export async function getSetsForExercise(exerciseId) {
    return tx(["sets"], "readonly", (store) => {
        return new Promise((resolve) => {
            const sets = [];
            const index = store.index("exerciseId");
            index.openCursor(IDBKeyRange.only(exerciseId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    sets.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(sets);
                }
            };
        });
    });
}

export async function getAllSets() {
    return tx(["sets"], "readonly", (store) => requestToPromise(store.getAll()));
}

// Export / Import
export async function exportData() {
    const [exercises, templates, sessions, sets] = await Promise.all([
        getExercises(),
        getTemplates(),
        getSessions({ includeDraft: true }),
        getAllSets(),
    ]);
    return { exportedAt: new Date().toISOString(), exercises, templates, sessions, sets };
}

export async function importData(data) {
    if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.templates) || !Array.isArray(data.sessions) || !Array.isArray(data.sets)) {
        throw new Error("Invalid import data");
    }
    await tx(["exercises", "templates", "sessions", "sets"], "readwrite", (exStore, tmplStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        sessionStore.clear();
        setStore.clear();

        data.exercises.forEach((item) => exStore.add(item));
        data.templates.forEach((item) => tmplStore.add(item));
        data.sessions.forEach((item) => sessionStore.add(item));
        data.sets.forEach((item) => setStore.add(item));
    });
    scheduleCloudSync();
}

export async function clearAll() {
    await tx(["exercises", "templates", "sessions", "sets"], "readwrite", (exStore, tmplStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        sessionStore.clear();
        setStore.clear();
    });
    scheduleCloudSync();
}

export async function installDefaultLibrary({ onlyIfEmpty = false } = {}) {
    const existingExercises = await getExercises();
    const existingTemplates = await getTemplates();
    const summary = { addedExercises: 0, addedTemplates: 0, skipped: false };

    if (onlyIfEmpty && existingExercises.length > 0) {
        summary.skipped = true;
        return summary;
    }

    const existingExerciseNames = new Set(existingExercises.map((item) => normalizeName(item.name)));
    const allExerciseIds = new Set(existingExercises.map((item) => String(item.id)));
    const allExercises = existingExercises.slice();
    const exercisesToAdd = [];

    DEFAULT_EXERCISES.forEach((item) => {
        const normalized = normalizeName(item.name);
        if (existingExerciseNames.has(normalized)) return;
        const exercise = { id: createId(allExerciseIds), ...item };
        exercisesToAdd.push(exercise);
        allExercises.push(exercise);
        existingExerciseNames.add(normalized);
    });

    const exerciseIdByName = new Map(allExercises.map((item) => [normalizeName(item.name), item.id]));
    const existingTemplateNames = new Set(existingTemplates.map((item) => normalizeName(item.name)));
    const allTemplateIds = new Set(existingTemplates.map((item) => String(item.id)));
    const templatesToAdd = [];

    DEFAULT_TEMPLATES.forEach((item) => {
        const normalized = normalizeName(item.name);
        if (existingTemplateNames.has(normalized)) return;
        const items = buildTemplateItemsFromDefinitions(item.exercises, exerciseIdByName);
        if (item.exercises.length > 0 && items.length === 0) return;
        templatesToAdd.push({
            id: createId(allTemplateIds),
            name: item.name,
            items,
            exerciseIds: items.map((entry) => entry.exerciseId),
        });
        existingTemplateNames.add(normalized);
    });

    if (exercisesToAdd.length === 0 && templatesToAdd.length === 0) {
        return summary;
    }

    await tx(["exercises", "templates"], "readwrite", (exerciseStore, templateStore) => {
        exercisesToAdd.forEach((item) => exerciseStore.add(item));
        templatesToAdd.forEach((item) => templateStore.add(item));
    });
    scheduleCloudSync();

    summary.addedExercises = exercisesToAdd.length;
    summary.addedTemplates = templatesToAdd.length;
    return summary;
}

export async function resetTemplatesToDefaultSplit() {
    const existingExercises = await getExercises();
    const exerciseIdByName = new Map(existingExercises.map((item) => [normalizeName(item.name), item.id]));
    const templateIds = new Set();
    const templatesToAdd = [];

    DEFAULT_TEMPLATES.forEach((item) => {
        const items = buildTemplateItemsFromDefinitions(item.exercises, exerciseIdByName);
        if (item.exercises.length > 0 && items.length === 0) return;
        templatesToAdd.push({
            id: createId(templateIds),
            name: item.name,
            items,
            exerciseIds: items.map((entry) => entry.exerciseId),
        });
    });

    await tx(["templates"], "readwrite", (store) => {
        store.clear();
        templatesToAdd.forEach((item) => store.add(item));
    });
    scheduleCloudSync();

    return { addedTemplates: templatesToAdd.length };
}
