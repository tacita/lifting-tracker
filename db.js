const DB_NAME = "overload-db";
const DB_VERSION = 2;

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

const FOUR_DAY_PROGRAM_EXERCISES = [
    { name: "Smith Machine Incline Press", repFloor: 8, repCeiling: 10, weightIncrement: 5 },
    { name: "Seated Dumbbell Shoulder Press", repFloor: 8, repCeiling: 10, weightIncrement: 5 },
    { name: "Cable Chest Fly", repFloor: 12, repCeiling: 15, weightIncrement: 5 },
    { name: "Cable Triceps Pushdown", repFloor: 12, repCeiling: 15, weightIncrement: 5 },
    { name: "Dumbbell Lateral Raise", repFloor: 12, repCeiling: 15, weightIncrement: 2.5 },
    { name: "Cable Lateral Raise (Single Arm)", repFloor: 12, repCeiling: 15, weightIncrement: 2.5 },
    { name: "Bench Plank", repFloor: 30, repCeiling: 45, weightIncrement: 0 },
    { name: "Smith Machine Squat", repFloor: 6, repCeiling: 8, weightIncrement: 10 },
    { name: "Leg Press (Narrow, Controlled)", repFloor: 10, repCeiling: 10, weightIncrement: 10 },
    { name: "Bulgarian Split Squat", repFloor: 8, repCeiling: 8, weightIncrement: 5 },
    { name: "Leg Extension", repFloor: 15, repCeiling: 20, weightIncrement: 5 },
    { name: "Dead Bug", repFloor: 6, repCeiling: 8, weightIncrement: 0 },
    { name: "Assisted Pull-Up", repFloor: 6, repCeiling: 8, weightIncrement: 5 },
    { name: "Single-Arm Cable Row (Split Stance)", repFloor: 10, repCeiling: 10, weightIncrement: 5 },
    { name: "Lat Pulldown (Neutral or Underhand)", repFloor: 8, repCeiling: 10, weightIncrement: 5 },
    { name: "Hammer Curl (Dumbbell)", repFloor: 10, repCeiling: 12, weightIncrement: 5 },
    { name: "Face Pull (Cable)", repFloor: 12, repCeiling: 15, weightIncrement: 5 },
    { name: "Reverse Pec Deck", repFloor: 12, repCeiling: 15, weightIncrement: 5 },
    { name: "Unassisted Pull-Up", repFloor: 1, repCeiling: 3, weightIncrement: 0 },
    { name: "Dumbbell Bench Press", repFloor: 8, repCeiling: 10, weightIncrement: 5 },
    { name: "Chest-Supported Dumbbell Row", repFloor: 10, repCeiling: 10, weightIncrement: 5 },
    { name: "Assisted Dips", repFloor: 5, repCeiling: 8, weightIncrement: 5 },
    { name: "Farmer Carry", repFloor: 30, repCeiling: 40, weightIncrement: 10 },
    { name: "Hip Thrust (Smith or Barbell)", repFloor: 6, repCeiling: 8, weightIncrement: 10 },
    { name: "Romanian Deadlift (DB or Smith)", repFloor: 8, repCeiling: 10, weightIncrement: 5 },
    { name: "Cable Pull-Through", repFloor: 12, repCeiling: 15, weightIncrement: 5 },
    { name: "Seated Hamstring Curl", repFloor: 10, repCeiling: 12, weightIncrement: 5 },
    { name: "Single-Leg Glute Bridge", repFloor: 10, repCeiling: 10, weightIncrement: 0 },
    { name: "Incline Walking", repFloor: 25, repCeiling: 35, weightIncrement: 0 },
    { name: "Stairmaster", repFloor: 20, repCeiling: 25, weightIncrement: 0 },
    { name: "Mobility Stretches", repFloor: 8, repCeiling: 12, weightIncrement: 0 },
];

const FOUR_DAY_PROGRAM_TEMPLATES = [
    {
        name: "Day 1 - Upper Push + Delts",
        exercises: [
            { name: "Smith Machine Incline Press", sets: 4, reps: "8-10", restSeconds: 90 },
            { name: "Seated Dumbbell Shoulder Press", sets: 3, reps: "8-10", restSeconds: 90 },
            { name: "Cable Chest Fly", sets: 3, reps: "12-15", restSeconds: 60 },
            { name: "Cable Triceps Pushdown", sets: 3, reps: "12-15", restSeconds: 60 },
            { name: "Dumbbell Lateral Raise", sets: 3, reps: "12-15", restSeconds: 45 },
            { name: "Cable Lateral Raise (Single Arm)", sets: 2, reps: "12-15 / side", restSeconds: 45 },
            { name: "Bench Plank", sets: 3, reps: "30-45s", restSeconds: 45 },
        ],
    },
    {
        name: "Day 2A - Quad Shape + Definition",
        exercises: [
            { name: "Smith Machine Squat", sets: 4, reps: "6 (3s down + 1s pause)", restSeconds: 90 },
            { name: "Leg Press (Narrow, Controlled)", sets: 3, reps: "10 (3s down)", restSeconds: 75 },
            { name: "Bulgarian Split Squat", sets: 2, reps: "8 / side", restSeconds: 75 },
            { name: "Leg Extension", sets: 3, reps: "15-20 (4s down)", restSeconds: 60 },
            { name: "Dead Bug", sets: 3, reps: "6-8 / side", restSeconds: 45 },
        ],
    },
    {
        name: "Day 2B - Glute + Posterior Chain",
        exercises: [
            { name: "Hip Thrust (Smith or Barbell)", sets: 4, reps: "6-8 (1-2s pause)", restSeconds: 90 },
            { name: "Romanian Deadlift (DB or Smith)", sets: 3, reps: "8-10 (3s down)", restSeconds: 75 },
            { name: "Cable Pull-Through", sets: 3, reps: "12-15", restSeconds: 60 },
            { name: "Seated Hamstring Curl", sets: 3, reps: "10-12", restSeconds: 60 },
            { name: "Single-Leg Glute Bridge", sets: 2, reps: "10 / side", restSeconds: 45 },
        ],
    },
    {
        name: "Day 3 - Upper Pull",
        exercises: [
            { name: "Assisted Pull-Up", sets: 4, reps: "6-8", restSeconds: 90 },
            { name: "Single-Arm Cable Row (Split Stance)", sets: 3, reps: "10 / side", restSeconds: 75 },
            { name: "Lat Pulldown (Neutral or Underhand)", sets: 3, reps: "8-10", restSeconds: 75 },
            { name: "Hammer Curl (Dumbbell)", sets: 3, reps: "10-12", restSeconds: 60, supersetKey: "pull-a" },
            { name: "Face Pull (Cable)", sets: 3, reps: "12-15", restSeconds: 60, supersetKey: "pull-a" },
            { name: "Reverse Pec Deck", sets: 2, reps: "12-15", restSeconds: 60 },
            { name: "Unassisted Pull-Up", sets: 3, reps: "1-3 (optional)", restSeconds: 120 },
        ],
    },
    {
        name: "Day 4 - Full Body + Carries",
        exercises: [
            { name: "Smith Machine Squat", sets: 4, reps: "6-8", restSeconds: 90 },
            { name: "Dumbbell Bench Press", sets: 3, reps: "8-10", restSeconds: 75 },
            { name: "Chest-Supported Dumbbell Row", sets: 3, reps: "10", restSeconds: 75 },
            { name: "Assisted Dips", sets: 3, reps: "5-8", restSeconds: 75 },
            { name: "Farmer Carry", sets: 4, reps: "30-40s carry", restSeconds: 90 },
        ],
    },
    {
        name: "Optional - Conditioning + Mobility",
        exercises: [
            { name: "Incline Walking", sets: 1, reps: "25-35 min (Zone 2)", restSeconds: 0 },
            { name: "Stairmaster", sets: 1, reps: "20-25 min steady", restSeconds: 0 },
            { name: "Mobility Stretches", sets: 1, reps: "Hip flexor, hamstring, quad, thoracic", restSeconds: 0 },
        ],
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
    const sanitized = (items || [])
        .map((item) => ({
            exerciseId: item.exerciseId,
            sets: Math.max(1, Number.parseInt(item.sets, 10) || 3),
            reps: String(item.reps || "8-12").trim(),
            restSeconds: Math.max(0, Number.parseInt(item.restSeconds, 10) || 90),
            supersetId: item.supersetId ? String(item.supersetId) : null,
            supersetOrder: Number.parseInt(item.supersetOrder, 10) || 0,
        }))
        .filter((item) => item.exerciseId !== undefined && item.exerciseId !== null && item.reps);

    const orderByGroup = new Map();
    sanitized.forEach((item) => {
        if (!item.supersetId) {
            item.supersetOrder = 0;
            return;
        }
        const nextOrder = (orderByGroup.get(item.supersetId) || 0) + 1;
        orderByGroup.set(item.supersetId, nextOrder);
        item.supersetOrder = nextOrder;
    });

    return sanitized;
}

function normalizeTemplate(template) {
    const items = Array.isArray(template.items)
        ? sanitizeTemplateItems(template.items)
        : (template.exerciseIds || []).map((exerciseId) => ({
            exerciseId,
            sets: 3,
            reps: "8-12",
            restSeconds: 90,
            supersetId: null,
            supersetOrder: 0,
        }));
    return {
        ...template,
        folder: String(template.folder || "").trim(),
        items,
        exerciseIds: items.map((item) => item.exerciseId),
    };
}

function normalizeFolder(folder) {
    const name = String(folder?.name || "").trim();
    return {
        id: folder?.id ?? Date.now() + Math.floor(Math.random() * 1000000),
        name,
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
                    supersetId: entry.supersetKey ? `ss-${normalizeName(entry.supersetKey)}` : null,
                    supersetOrder: 0,
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
            if (event.oldVersion < 2) {
                const folders = db.createObjectStore("folders", { keyPath: "id" });
                folders.createIndex("name", "name", { unique: false });
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
    const hardcodedUrl = String(window.__OVERLOAD_SUPABASE_URL || "").trim();
    const hardcodedAnonKey = String(window.__OVERLOAD_SUPABASE_ANON_KEY || "").trim();
    if (hardcodedUrl && hardcodedAnonKey) {
        return { url: hardcodedUrl, anonKey: hardcodedAnonKey };
    }
    return {
        url: localStorage.getItem(SUPABASE_URL_KEY) || "",
        anonKey: localStorage.getItem(SUPABASE_ANON_KEY) || "",
    };
}

export function isSupabaseConfigHardcoded() {
    const hardcodedUrl = String(window.__OVERLOAD_SUPABASE_URL || "").trim();
    const hardcodedAnonKey = String(window.__OVERLOAD_SUPABASE_ANON_KEY || "").trim();
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

    let { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) {
        const stamp = Date.now();
        const candidates = [
            `./config.js?t=${stamp}`,
            `/lifting-tracker/config.js?t=${stamp}`,
        ];

        for (const candidate of candidates) {
            try {
                await import(candidate);
                ({ url, anonKey } = getSupabaseConfig());
                if (url && anonKey) break;
            } catch {
                // Try next candidate.
            }
        }

        if (!url || !anonKey) {
            for (const candidate of candidates) {
                try {
                    const response = await fetch(candidate, { cache: "no-store" });
                    if (!response.ok) continue;
                    const text = await response.text();
                    const urlMatch = text.match(/__OVERLOAD_SUPABASE_URL\s*=\s*"([^"]*)"/);
                    const keyMatch = text.match(/__OVERLOAD_SUPABASE_ANON_KEY\s*=\s*"([^"]*)"/);
                    if (urlMatch?.[1] && keyMatch?.[1]) {
                        window.__OVERLOAD_SUPABASE_URL = urlMatch[1];
                        window.__OVERLOAD_SUPABASE_ANON_KEY = keyMatch[1];
                        ({ url, anonKey } = getSupabaseConfig());
                        if (url && anonKey) break;
                    }
                } catch {
                    // Try next candidate.
                }
            }
        }
    }
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
        options: {
            redirectTo,
            queryParams: {
                prompt: "select_account",
            },
        },
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
    const [exercises, templates, folders, sessions, sets] = await Promise.all([
        tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll())),
        tx(["templates"], "readonly", (store) => requestToPromise(store.getAll())),
        tx(["folders"], "readonly", (store) => requestToPromise(store.getAll())),
        getSessions({ includeDraft: true }),
        tx(["sets"], "readonly", (store) => requestToPromise(store.getAll())),
    ]);
    return { exportedAt: new Date().toISOString(), exercises, templates, folders, sessions, sets };
}

async function localImportData(data) {
    if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.templates) || !Array.isArray(data.sessions) || !Array.isArray(data.sets)) {
        throw new Error("Invalid import data");
    }
    const folderNames = new Set();
    const folders = Array.isArray(data.folders) ? data.folders : [];
    await tx(["exercises", "templates", "folders", "sessions", "sets"], "readwrite", (exStore, tmplStore, folderStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        folderStore.clear();
        sessionStore.clear();
        setStore.clear();

        data.exercises.forEach((item) => exStore.add(item));
        data.templates.forEach((item) => {
            const normalized = normalizeTemplate(item);
            tmplStore.add(normalized);
            if (normalized.folder) {
                folderNames.add(normalized.folder.toLowerCase());
            }
        });
        folders.forEach((item) => {
            const normalized = normalizeFolder(item);
            if (!normalized.name) return;
            const key = normalized.name.toLowerCase();
            if (folderNames.has(key)) return;
            folderNames.add(key);
            folderStore.add(normalized);
        });
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
    const normalizedTemplate = normalizeTemplate(template);
    const result = await tx(["templates", "folders"], "readwrite", (templateStore, folderStore) => {
        const req = templateStore.add(normalizedTemplate);
        if (normalizedTemplate.folder) {
            folderStore.getAll().onsuccess = (event) => {
                const existing = event.target.result || [];
                const match = existing.some((folder) => String(folder.name || "").trim().toLowerCase() === normalizedTemplate.folder.toLowerCase());
                if (!match) {
                    folderStore.add({ id: Date.now() + Math.floor(Math.random() * 1000000), name: normalizedTemplate.folder });
                }
            };
        }
        return req;
    });
    scheduleCloudSync();
    return result;
}

export async function updateTemplate(template) {
    const normalizedTemplate = normalizeTemplate(template);
    const result = await tx(["templates", "folders"], "readwrite", (templateStore, folderStore) => {
        const req = templateStore.put(normalizedTemplate);
        if (normalizedTemplate.folder) {
            folderStore.getAll().onsuccess = (event) => {
                const existing = event.target.result || [];
                const match = existing.some((folder) => String(folder.name || "").trim().toLowerCase() === normalizedTemplate.folder.toLowerCase());
                if (!match) {
                    folderStore.add({ id: Date.now() + Math.floor(Math.random() * 1000000), name: normalizedTemplate.folder });
                }
            };
        }
        return req;
    });
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

export async function addFolder(folder) {
    const normalized = normalizeFolder(folder);
    if (!normalized.name) {
        throw new Error("Folder name is required");
    }
    const lower = normalized.name.toLowerCase();
    const result = await tx(["folders"], "readwrite", (store) => {
        store.getAll().onsuccess = (event) => {
            const existing = event.target.result || [];
            if (existing.some((item) => String(item.name || "").trim().toLowerCase() === lower)) {
                return;
            }
            store.add(normalized);
        };
    });
    scheduleCloudSync();
    return result;
}

export async function getFolders() {
    return tx(["folders"], "readonly", (store) => requestToPromise(store.getAll()));
}

export async function updateFolder(folderId, updates) {
    const result = await tx(["folders"], "readwrite", (store) => {
        const getReq = store.get(folderId);
        getReq.onsuccess = () => {
            const folder = getReq.result;
            if (folder) {
                const updated = { ...folder, ...updates };
                store.put(updated);
            }
        };
    });
    scheduleCloudSync();
    return result;
}

export async function deleteFolder(folderId) {
    const result = await tx(["folders"], "readwrite", (store) => store.delete(folderId));
    scheduleCloudSync();
    return result;
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
    const [exercises, templates, folders, sessions, sets] = await Promise.all([
        getExercises(),
        getTemplates(),
        getFolders(),
        getSessions({ includeDraft: true }),
        getAllSets(),
    ]);
    return { exportedAt: new Date().toISOString(), exercises, templates, folders, sessions, sets };
}

export async function importData(data) {
    if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.templates) || !Array.isArray(data.sessions) || !Array.isArray(data.sets)) {
        throw new Error("Invalid import data");
    }
    const folderNames = new Set();
    const folders = Array.isArray(data.folders) ? data.folders : [];
    await tx(["exercises", "templates", "folders", "sessions", "sets"], "readwrite", (exStore, tmplStore, folderStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        folderStore.clear();
        sessionStore.clear();
        setStore.clear();

        data.exercises.forEach((item) => exStore.add(item));
        data.templates.forEach((item) => {
            const normalized = normalizeTemplate(item);
            tmplStore.add(normalized);
            if (normalized.folder) {
                folderNames.add(normalized.folder.toLowerCase());
            }
        });
        folders.forEach((item) => {
            const normalized = normalizeFolder(item);
            if (!normalized.name) return;
            const key = normalized.name.toLowerCase();
            if (folderNames.has(key)) return;
            folderNames.add(key);
            folderStore.add(normalized);
        });
        data.sessions.forEach((item) => sessionStore.add(item));
        data.sets.forEach((item) => setStore.add(item));
    });
    scheduleCloudSync();
}

export async function clearAll() {
    await tx(["exercises", "templates", "folders", "sessions", "sets"], "readwrite", (exStore, tmplStore, folderStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        folderStore.clear();
        sessionStore.clear();
        setStore.clear();
    });
    scheduleCloudSync();
}

export async function installDefaultLibrary({ onlyIfEmpty = false } = {}) {
    const existingExercises = await getExercises();
    const summary = { addedExercises: 0, skipped: false };

    if (onlyIfEmpty && existingExercises.length > 0) {
        summary.skipped = true;
        return summary;
    }

    const existingExerciseNames = new Set(existingExercises.map((item) => normalizeName(item.name)));
    const allExerciseIds = new Set(existingExercises.map((item) => String(item.id)));
    const exercisesToAdd = [];

    DEFAULT_EXERCISES.forEach((item) => {
        const normalized = normalizeName(item.name);
        if (existingExerciseNames.has(normalized)) return;
        const exercise = { id: createId(allExerciseIds), ...item };
        exercisesToAdd.push(exercise);
        existingExerciseNames.add(normalized);
    });

    if (exercisesToAdd.length === 0) {
        return summary;
    }

    await tx(["exercises"], "readwrite", (exerciseStore) => {
        exercisesToAdd.forEach((item) => exerciseStore.add(item));
    });
    scheduleCloudSync();

    summary.addedExercises = exercisesToAdd.length;
    return summary;
}

export async function resetTemplatesToFourDayProgram() {
    const existingExercises = await getExercises();
    const existingExerciseNames = new Set(existingExercises.map((item) => normalizeName(item.name)));
    const allExerciseIds = new Set(existingExercises.map((item) => String(item.id)));
    const allExercises = existingExercises.slice();
    const exercisesToAdd = [];

    FOUR_DAY_PROGRAM_EXERCISES.forEach((item) => {
        const normalized = normalizeName(item.name);
        if (existingExerciseNames.has(normalized)) return;
        const exercise = { id: createId(allExerciseIds), ...item };
        exercisesToAdd.push(exercise);
        allExercises.push(exercise);
        existingExerciseNames.add(normalized);
    });

    const exerciseIdByName = new Map(allExercises.map((item) => [normalizeName(item.name), item.id]));
    const templateIds = new Set();
    const templatesToAdd = [];

    FOUR_DAY_PROGRAM_TEMPLATES.forEach((item) => {
        const items = buildTemplateItemsFromDefinitions(item.exercises, exerciseIdByName);
        if (item.exercises.length > 0 && items.length === 0) return;
        templatesToAdd.push({
            id: createId(templateIds),
            name: item.name,
            items,
            exerciseIds: items.map((entry) => entry.exerciseId),
        });
    });

    await tx(["exercises", "templates", "folders"], "readwrite", (exerciseStore, templateStore, folderStore) => {
        templateStore.clear();
        folderStore.clear();
        exercisesToAdd.forEach((item) => exerciseStore.add(item));
        templatesToAdd.forEach((item) => templateStore.add(item));
    });
    scheduleCloudSync();

    return {
        addedTemplates: templatesToAdd.length,
        addedExercises: exercisesToAdd.length,
    };
}
