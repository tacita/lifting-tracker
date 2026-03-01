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
let syncListeners = [];
let hydrationComplete = false;
let hydrationError = null;
let hydrationListeners = [];
let syncState = {
    status: "idle",
    error: "",
    lastSyncedAt: "",
};
const cloudColumnSupport = {
    exerciseNote: true,
    templateNote: true,
    templateFolder: true,
    templateSortOrder: true,
    folderSortOrder: true,
};

const SUPABASE_URL_KEY = "overload-supabase-url";
const SUPABASE_ANON_KEY = "overload-supabase-anon-key";
const SEEDED_USERS_KEY = "overload-cloud-seeded-users";
const MIGRATION_FLAG = "overload-migrated-to-normalized";
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

function normalizeExercise(exercise) {
    return {
        ...exercise,
        note: String(exercise?.note || "").trim(),
    };
}

function parseTemplateReps(value, fallback = 8) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(1, Math.floor(value));
    }
    const match = String(value || "").match(/(\d+)/);
    if (match) {
        return Math.max(1, Number.parseInt(match[1], 10));
    }
    return Math.max(1, Number.parseInt(fallback, 10) || 8);
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
            reps: parseTemplateReps(item.reps, 8),
            restSeconds: Math.max(0, Number.parseInt(item.restSeconds, 10) || 90),
            supersetId: item.supersetId ? String(item.supersetId) : null,
            supersetOrder: Number.parseInt(item.supersetOrder, 10) || 0,
        }))
        .filter((item) => item.exerciseId !== undefined && item.exerciseId !== null && item.reps > 0);

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
            reps: 8,
            restSeconds: 90,
            supersetId: null,
            supersetOrder: 0,
        }));
    return {
        ...template,
        folder: String(template.folder || "").trim(),
        note: String(template.note || "").trim(),
        sortOrder: Math.max(0, Number.parseInt(template.sortOrder, 10) || 0),
        items,
        exerciseIds: items.map((item) => item.exerciseId),
    };
}

function normalizeFolder(folder) {
    const name = String(folder?.name || "").trim();
    return {
        id: folder?.id ?? Date.now() + Math.floor(Math.random() * 1000000),
        name,
        sortOrder: Math.max(0, Number.parseInt(folder?.sortOrder, 10) || 0),
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
            if (!session?.user) {
                setSyncState({ status: "idle", error: "", lastSyncedAt: "" });
            }
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
    return pushLocalSnapshotToCloud();
}

function notifyAuthListeners() {
    authListeners.forEach((listener) => listener({ ...authState }));
}

function notifySyncListeners() {
    const snapshot = { ...syncState };
    syncListeners.forEach((listener) => listener(snapshot));
}

function setSyncState(next) {
    syncState = {
        ...syncState,
        ...next,
    };
    notifySyncListeners();
}

export function getSyncState() {
    return { ...syncState };
}

export function onSyncStateChange(listener) {
    if (typeof listener !== "function") return () => {};
    syncListeners.push(listener);
    listener({ ...syncState });
    return () => {
        syncListeners = syncListeners.filter((item) => item !== listener);
    };
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

// ============ Normalized Table Sync ============

async function syncTableToCloud(tableName, data, userId) {
    const missingColumn = (message, columnName) => {
        const escaped = String(columnName).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        return new RegExp(`(column.*${escaped}|${escaped}.*column)`, "i").test(message);
    };
    // Deduplicate by ID to avoid "ON CONFLICT DO UPDATE" errors
    const seen = new Set();
    const dedupedData = [];
    
    for (const item of data) {
        if (!seen.has(item.id)) {
            seen.add(item.id);
            dedupedData.push(item);
        }
    }
    
    const rows = dedupedData.map(item => {
        const row = { user_id: userId, updated_at: new Date().toISOString() };
        
        if (tableName === "exercises") {
            row.id = item.id;
            row.name = item.name;
            row.rep_floor = item.repFloor;
            row.rep_ceiling = item.repCeiling;
            row.rest_seconds = item.restSeconds || null;
            if (cloudColumnSupport.exerciseNote) {
                row.note = item.note || null;
            }
        } else if (tableName === "sessions") {
            row.id = item.id;
            row.date = item.date;
            row.status = item.status || "draft";
            row.notes = item.notes || null;
            row.template_id = item.templateId || null;
            row.started_at = item.startedAt || null;
            row.finished_at = item.finishedAt || null;
            row.is_paused = item.isPaused || false;
            row.paused_at = item.pausedAt || null;
            row.paused_accumulated_seconds = parseInt(item.pausedAccumulatedSeconds || 0, 10);
        } else if (tableName === "sets") {
            row.id = item.id;
            row.session_id = item.sessionId;
            row.exercise_id = item.exerciseId;
            row.set_number = item.setNumber;
            row.weight = item.weight || null;
            row.reps = item.reps || null;
            row.is_skipped = item.isSkipped || false;
        } else if (tableName === "templates") {
            row.id = item.id;
            row.name = item.name;
            if (cloudColumnSupport.templateFolder) {
                row.folder = item.folder || null;
            }
            if (cloudColumnSupport.templateNote) {
                row.note = item.note || null;
            }
            if (cloudColumnSupport.templateSortOrder) {
                row.sort_order = Math.max(0, Number.parseInt(item.sortOrder, 10) || 0);
            }
        } else if (tableName === "template_items") {
            row.id = item.id;
            row.template_id = item.templateId;
            row.exercise_id = item.exerciseId;
            row.sets = Math.max(1, Number.parseInt(item.sets, 10) || 3);
            row.reps = parseTemplateReps(item.reps, 8);
            row.rest_seconds = Math.max(0, Number.parseInt(item.restSeconds, 10) || 90);
            row.superset_id = item.supersetId || null;
            row.superset_order = item.supersetOrder || null;
        } else if (tableName === "folders") {
            row.id = item.id;
            row.name = item.name;
            if (cloudColumnSupport.folderSortOrder) {
                row.sort_order = Math.max(0, Number.parseInt(item.sortOrder, 10) || 0);
            }
        }
        
        return row;
    });
    
    if (rows.length === 0) return true;
    
    const { error } = await supabaseClient
        .from(tableName)
        .upsert(rows, { onConflict: "id" });
    
    if (error) {
        const message = String(error.message || "");
        const missingNoteColumn = missingColumn(message, "note");
        if (tableName === "exercises" && cloudColumnSupport.exerciseNote && missingNoteColumn) {
            cloudColumnSupport.exerciseNote = false;
            return syncTableToCloud(tableName, data, userId);
        }
        if (tableName === "templates" && cloudColumnSupport.templateNote && missingNoteColumn) {
            cloudColumnSupport.templateNote = false;
            return syncTableToCloud(tableName, data, userId);
        }
        if (tableName === "templates" && cloudColumnSupport.templateFolder && missingColumn(message, "folder")) {
            cloudColumnSupport.templateFolder = false;
            return syncTableToCloud(tableName, data, userId);
        }
        if (tableName === "templates" && cloudColumnSupport.templateSortOrder && missingColumn(message, "sort_order")) {
            cloudColumnSupport.templateSortOrder = false;
            return syncTableToCloud(tableName, data, userId);
        }
        if (tableName === "folders" && cloudColumnSupport.folderSortOrder && missingColumn(message, "sort_order")) {
            cloudColumnSupport.folderSortOrder = false;
            return syncTableToCloud(tableName, data, userId);
        }
        throw error;
    }
    return true;
}

async function deleteStaleCloudRecords(tableName, localIds, userId) {
    try {
        if (localIds.length === 0) {
            const { error } = await supabaseClient
                .from(tableName)
                .delete()
                .eq("user_id", userId);
            if (error) console.error(`Failed to clean stale ${tableName}:`, error);
            return;
        }
        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .eq("user_id", userId)
            .not("id", "in", `(${localIds.join(",")})`);
        if (error) console.error(`Failed to clean stale ${tableName}:`, error);
    } catch (err) {
        console.error(`Failed to clean stale ${tableName}:`, err);
    }
}

async function pushLocalSnapshotToCloud() {
    if (!useCloudSync() || syncInFlight) return false;
    syncInFlight = true;
    setSyncState({ status: "syncing", error: "" });
    try {
        const userId = authState.user.id;
        
        const exercises = await tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll()));
        const sessions = await tx(["sessions"], "readonly", (store) => requestToPromise(store.getAll()));
        const sets = await tx(["sets"], "readonly", (store) => requestToPromise(store.getAll()));
        const templates = await tx(["templates"], "readonly", (store) => requestToPromise(store.getAll()));
        const folders = await tx(["folders"], "readonly", (store) => requestToPromise(store.getAll()));
        
        console.log("Syncing to cloud:", {
            exercises: exercises?.length || 0,
            sessions: sessions?.length || 0,
            sets: sets?.length || 0,
            templates: templates?.length || 0,
            folders: folders?.length || 0,
        });
        
        // Build template items from templates.items, removing duplicates and generating IDs if missing
        const templateItemsMap = new Map();
        templates?.forEach((t, templateIdx) => {
            if (Array.isArray(t.items)) {
                t.items.forEach((item, itemIdx) => {
                    // Generate ID if missing (same as migration does)
                    const itemId = item.id || `${t.id}-${item.exerciseId}-${itemIdx}`;
                    // Deduplicate by generated ID
                    if (!templateItemsMap.has(itemId)) {
                        templateItemsMap.set(itemId, { ...item, id: itemId, templateId: t.id });
                    }
                });
            }
        });
        const templateItems = Array.from(templateItemsMap.values());
        
        // Sync tables in dependency order to respect foreign key constraints:
        // 1. Parent tables first (no FK dependencies)
        await Promise.all([
            syncTableToCloud("exercises", exercises || [], userId),
            syncTableToCloud("folders", folders || [], userId),
        ]);
        // 2. Tables that reference parents
        await Promise.all([
            syncTableToCloud("sessions", sessions || [], userId),
            syncTableToCloud("templates", templates || [], userId),
        ]);
        // 3. Child tables that reference the above
        await Promise.all([
            syncTableToCloud("sets", sets || [], userId),
            syncTableToCloud("template_items", templateItems, userId),
        ]);

        // Delete stale cloud records in reverse dependency order (children first)
        await Promise.all([
            deleteStaleCloudRecords("sets", (sets || []).map(s => s.id), userId),
            deleteStaleCloudRecords("template_items", templateItems.map(ti => ti.id), userId),
        ]);
        await Promise.all([
            deleteStaleCloudRecords("sessions", (sessions || []).map(s => s.id), userId),
            deleteStaleCloudRecords("templates", (templates || []).map(t => t.id), userId),
        ]);
        await Promise.all([
            deleteStaleCloudRecords("exercises", (exercises || []).map(e => e.id), userId),
            deleteStaleCloudRecords("folders", (folders || []).map(f => f.id), userId),
        ]);

        console.log("✓ Cloud sync successful");
        setSyncState({
            status: "idle",
            error: "",
            lastSyncedAt: new Date().toISOString(),
        });
        return true;
    } catch (err) {
        console.error("✗ Cloud sync failed:", err);
        setSyncState({
            status: "failed",
            error: parseSupabaseError(err, "Failed to sync to cloud"),
        });
        throw err;
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
        pushLocalSnapshotToCloud().catch((err) => console.error("Background sync failed:", err));
    }, 500);
}

// For critical operations that must complete before app state changes
export async function ensureCloudSyncComplete() {
    if (!useCloudSync()) return true;
    
    // Cancel pending debounced sync
    if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
    }
    
    // Sync immediately and await
    try {
        await pushLocalSnapshotToCloud();
        return true;
    } catch (err) {
        console.error("Critical sync failed:", err);
        // Still return true but log — don't block the operation
        // The sync will retry on next operation
        return false;
    }
}

// For operations that need immediate cloud persistence guarantees for a specific template field.
export async function saveTemplatePlacementToCloud(templateId, folder, sortOrder = 0) {
    if (!useCloudSync()) return true;
    const payload = { updated_at: new Date().toISOString() };
    if (cloudColumnSupport.templateFolder) {
        payload.folder = String(folder || "").trim() || null;
    }
    if (cloudColumnSupport.templateSortOrder) {
        payload.sort_order = Math.max(0, Number.parseInt(sortOrder, 10) || 0);
    }
    const { error } = await supabaseClient
        .from("templates")
        .update(payload)
        .eq("id", templateId)
        .eq("user_id", authState.user.id);
    if (error) {
        const message = String(error.message || "");
        const missingColumn = (columnName) => {
            const escaped = String(columnName).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
            return new RegExp(`(column.*${escaped}|${escaped}.*column)`, "i").test(message);
        };
        if (cloudColumnSupport.templateSortOrder && missingColumn("sort_order")) {
            cloudColumnSupport.templateSortOrder = false;
            return saveTemplatePlacementToCloud(templateId, folder, sortOrder);
        }
        if (cloudColumnSupport.templateFolder && missingColumn("folder")) {
            cloudColumnSupport.templateFolder = false;
            return saveTemplatePlacementToCloud(templateId, folder, sortOrder);
        }
        console.error("Failed to persist template placement to cloud:", error);
        setSyncState({
            status: "failed",
            error: parseSupabaseError(error, "Failed to save template placement"),
        });
        return false;
    }
    return true;
}

async function hydrateLocalFromCloudIfAvailable() {
    if (!useCloudSync()) return { loaded: false, hasCloudData: false, failed: false };
    const userId = authState.user.id;
    
    try {
        console.log("Loading data from normalized cloud tables...");
        
        const [exercisesData, sessionsData, setsData, templatesData, itemsData] = await Promise.all([
            supabaseClient.from("exercises").select("*").eq("user_id", userId),
            supabaseClient.from("sessions").select("*").eq("user_id", userId),
            supabaseClient.from("sets").select("*").eq("user_id", userId),
            supabaseClient.from("templates").select("*").eq("user_id", userId),
            supabaseClient.from("template_items").select("*").eq("user_id", userId),
        ]);
        
        // Folders table might not exist yet (optional)
        let foldersData = { data: null, error: null };
        try {
            foldersData = await supabaseClient.from("folders").select("*").eq("user_id", userId);
        } catch (err) {
            console.log("Folders table not available");
        }
        
        // Check for errors (folders table might not exist yet, so we don't throw if it errors)
        if (exercisesData.error) throw exercisesData.error;
        if (sessionsData.error) throw sessionsData.error;
        if (setsData.error) throw setsData.error;
        if (templatesData.error) throw templatesData.error;
        if (itemsData.error) throw itemsData.error;
        
        const hasData = (exercisesData.data?.length || 0) > 0 ||
                        (sessionsData.data?.length || 0) > 0 ||
                        (setsData.data?.length || 0) > 0 ||
                        (templatesData.data?.length || 0) > 0 ||
                        (itemsData.data?.length || 0) > 0 ||
                        (foldersData.data?.length || 0) > 0;
        
        if (!hasData) {
            console.log("No data in cloud normalized tables");
            return { loaded: false, hasCloudData: false, failed: false };
        }
        
        console.log("Loading from cloud:", {
            exercises: exercisesData.data?.length || 0,
            sessions: sessionsData.data?.length || 0,
            sets: setsData.data?.length || 0,
            templates: templatesData.data?.length || 0,
            items: itemsData.data?.length || 0,
            folders: foldersData.data?.length || 0,
        });
        
        // Import to local IndexedDB
        // Note: templateItems store doesn't exist yet in local IndexedDB, storing as template.items for now
        await tx(
            ["exercises", "sessions", "sets", "templates", "folders"],
            "readwrite",
            (exStore, sessStore, setStore, tmplStore, folderStore) => {
                // Replace local snapshot with cloud snapshot to avoid stale leftovers.
                exStore.clear();
                sessStore.clear();
                setStore.clear();
                tmplStore.clear();
                folderStore.clear();

                // Convert snake_case to camelCase
                exercisesData.data?.forEach(row => {
                    exStore.put({
                        id: row.id,
                        name: row.name,
                        repFloor: row.rep_floor,
                        repCeiling: row.rep_ceiling,
                        restSeconds: row.rest_seconds,
                        note: row.note || "",
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
                        exerciseIds: [],
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
                        folder: row.folder || "",
                        note: row.note || "",
                        sortOrder: Math.max(0, Number.parseInt(row.sort_order, 10) || 0),
                        items: itemsData.data?.filter(item => String(item.template_id) === String(row.id)).map(item => ({
                            id: item.id,
                            templateId: item.template_id,
                            exerciseId: item.exercise_id,
                            sets: item.sets,
                            reps: item.reps,
                            restSeconds: item.rest_seconds,
                            supersetId: item.superset_id,
                            supersetOrder: item.superset_order,
                        })) || [],
                    });
                });
                
                foldersData.data?.forEach(row => {
                    folderStore.put({
                        id: row.id,
                        name: row.name,
                        sortOrder: Math.max(0, Number.parseInt(row.sort_order, 10) || 0),
                    });
                });
            }
        );
        
        console.log("✓ Cloud data imported successfully");
        return { loaded: true, hasCloudData: true, failed: false };
    } catch (err) {
        console.error("Hydration error:", err);
        return { loaded: false, hasCloudData: false, failed: true };
    }
}

/**
 * Pull latest data from Supabase and replace local IndexedDB.
 * Safe to call mid-session — skips if cloud sync is not configured or no user is logged in.
 * Returns true if local data was refreshed from cloud.
 */
export async function pullFromCloud() {
    if (!useCloudSync()) return false;
    try {
        const result = await hydrateLocalFromCloudIfAvailable();
        return result.loaded;
    } catch (err) {
        console.error("pullFromCloud failed:", err);
        return false;
    }
}

// Check if user has migrated from blob to normalized schema
function hasMigrated() {
    return localStorage.getItem(MIGRATION_FLAG) === "true";
}

function markMigrated() {
    localStorage.setItem(MIGRATION_FLAG, "true");
}

// One-time migration from blob to normalized tables
async function migrateToNormalizedSchema() {
    if (hasMigrated()) {
        console.log("Already migrated to normalized schema");
        return true;
    }
    
    console.log("=== Checking for blob data to migrate ===");
    
    try {
        const { data: blobData, error } = await supabaseClient
            .from(SNAPSHOT_TABLE)
            .select("payload")
            .eq("user_id", authState.user.id)
            .maybeSingle();
        
        if (error) {
            console.log("No blob data found");
            markMigrated();
            return true;
        }
        
        if (!blobData?.payload) {
            console.log("Blob data is empty");
            markMigrated();
            return true;
        }
        
        const payload = blobData.payload;
        console.log("Found blob data to migrate:", {
            exercises: payload.exercises?.length || 0,
            sessions: payload.sessions?.length || 0,
            sets: payload.sets?.length || 0,
            templates: payload.templates?.length || 0,
        });
        
        const userId = authState.user.id;
        
        // Migrate each data type
        if (payload.exercises?.length > 0) {
            const rows = payload.exercises.map(ex => ({
                id: ex.id,
                user_id: userId,
                name: ex.name,
                rep_floor: ex.repFloor,
                rep_ceiling: ex.repCeiling,
                rest_seconds: ex.restSeconds || null,
            }));
            
            const { error: e } = await supabaseClient
                .from("exercises")
                .upsert(rows, { onConflict: "id" });
            if (e) throw e;
            console.log("✓ Migrated exercises");
        }
        
        if (payload.sessions?.length > 0) {
            const rows = payload.sessions.map(s => ({
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
            
            const { error: e } = await supabaseClient
                .from("sessions")
                .upsert(rows, { onConflict: "id" });
            if (e) throw e;
            console.log("✓ Migrated sessions");
        }
        
        if (payload.sets?.length > 0) {
            const rows = payload.sets.map(s => ({
                id: s.id,
                user_id: userId,
                session_id: s.sessionId,
                exercise_id: s.exerciseId,
                set_number: s.setNumber,
                weight: s.weight || null,
                reps: s.reps || null,
                is_skipped: s.isSkipped || false,
            }));
            
            const { error: e } = await supabaseClient
                .from("sets")
                .upsert(rows, { onConflict: "id" });
            if (e) throw e;
            console.log("✓ Migrated sets");
        }
        
        if (payload.templates?.length > 0) {
            const rows = payload.templates.map(t => ({
                id: t.id,
                user_id: userId,
                name: t.name,
            }));
            
            const { error: e } = await supabaseClient
                .from("templates")
                .upsert(rows, { onConflict: "id" });
            if (e) throw e;
            console.log("✓ Migrated templates");
        }
        
        // Extract template items from templates.items (embedded format), deduplicating by ID
        const itemsSeen = new Set();
        const allTemplateItems = [];
        if (payload.templates?.length > 0) {
            payload.templates.forEach(template => {
                if (Array.isArray(template.items)) {
                    template.items.forEach((item, idx) => {
                        // Skip items without exerciseId
                        if (!item.exerciseId) {
                            console.log("Skipping template item without exerciseId");
                            return;
                        }
                        
                        const itemId = item.id || `${template.id}-${item.exerciseId}-${idx}`;
                        
                        // Skip if we've already seen this item ID
                        if (itemsSeen.has(itemId)) {
                            console.log("Skipping duplicate template item:", itemId);
                            return;
                        }
                        itemsSeen.add(itemId);
                        
                        // Parse ranges like "6-8" to integers (take first number)
                        const parseSets = (val) => {
                            if (typeof val === "number") return val;
                            if (typeof val === "string") {
                                const match = val.match(/(\d+)/);
                                return match ? parseInt(match[1], 10) : 6;
                            }
                            return 6;
                        };
                        
                        const parseReps = (val) => {
                            if (typeof val === "number") return val;
                            if (typeof val === "string") {
                                const match = val.match(/(\d+)/);
                                return match ? parseInt(match[1], 10) : 8;
                            }
                            return 8;
                        };
                        
                        allTemplateItems.push({
                            id: itemId,
                            user_id: userId,
                            template_id: template.id,
                            exercise_id: item.exerciseId,
                            sets: parseSets(item.sets),
                            reps: parseReps(item.reps),
                            rest_seconds: item.restSeconds || 90,
                            superset_id: item.supersetId || null,
                            superset_order: item.supersetOrder || null,
                        });
                    });
                }
            });
        }
        
        if (allTemplateItems.length > 0) {
            const { error: e } = await supabaseClient
                .from("template_items")
                .upsert(allTemplateItems, { onConflict: "id" });
            if (e) throw e;
            console.log(`✓ Migrated ${allTemplateItems.length} template items`);
        }
        
        // Migrate folders
        if (payload.folders?.length > 0) {
            const rows = payload.folders.map(f => ({
                id: f.id,
                user_id: userId,
                name: f.name,
            }));
            
            const { error: e } = await supabaseClient
                .from("folders")
                .upsert(rows, { onConflict: "id" })
                .catch(() => ({ error: null })); // Ignore if table doesn't exist yet
            
            if (e) throw e;
            console.log(`✓ Migrated ${rows.length} folders`);
        }
        
        markMigrated();
        console.log("=== Migration complete ===");
        return true;
    } catch (err) {
        console.error("Migration failed:", err);
        markMigrated(); // Mark as migrated anyway to avoid infinite loops
        return false;
    }
}

async function ensureInitialCloudSeedForUser() {
    if (!useCloudSync()) return;
    const userId = String(authState.user.id);
    
    // Check if local data exists
    const localExercises = await tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll()));
    const localSessions = await tx(["sessions"], "readonly", (store) => requestToPromise(store.getAll()));
    const localTemplates = await tx(["templates"], "readonly", (store) => requestToPromise(store.getAll()));
    
    const hasLocalData = (localExercises?.length || 0) > 0 || (localSessions?.length || 0) > 0 || (localTemplates?.length || 0) > 0;
    
    console.log("=== Starting cloud hydration for user ===");
    
    // Step 1: Check if needs migration from blob
    if (!hasMigrated()) {
        console.log("Running one-time migration...");
        await migrateToNormalizedSchema();
    }
    
    // Step 2: Try to hydrate from new normalized tables
    console.log("Attempting to load from normalized cloud tables...");
    const hydrated = await hydrateLocalFromCloudIfAvailable();
    if (hydrated.loaded) {
        console.log("✓ Hydration successful");
        markUserSeeded(userId);
        return;
    }

    if (hydrated.failed) {
        console.log("Hydration failed; skipping bootstrap push to avoid bad overwrite");
        return;
    }
    
    console.log("No cloud data found in normalized tables");
    
    console.log("Local data check:", {
        templates: localTemplates?.length || 0,
        exercises: localExercises?.length || 0,
        sessions: localSessions?.length || 0,
    });
    
    if (hasLocalData && !isUserSeeded(userId)) {
        // One-time bootstrap only: cloud is empty and user has local data.
        console.log("Cloud empty and local data found, doing one-time bootstrap push...");
        try {
            await pushLocalSnapshotToCloud();
            markUserSeeded(userId);
            console.log("✓ Pushed local data to cloud");
        } catch (err) {
            console.error("Failed to push local data to cloud:", err);
        }
        return;
    }
    
    if (hasLocalData) {
        console.log("Cloud empty but user already seeded; skipping auto-push to avoid overwrite");
        return;
    }

    // Empty everywhere.
    console.log("No data in cloud or local");
}

// Exercises
export async function addExercise(exercise) {
    const nextName = normalizeName(exercise?.name);
    if (!nextName) {
        throw new Error("Exercise name is required");
    }
    const existing = await getExercises();
    const duplicate = existing.find((item) => normalizeName(item.name) === nextName);
    if (duplicate) {
        throw new Error("Exercise already exists");
    }
    const normalizedExercise = normalizeExercise(exercise);
    const result = await tx(["exercises"], "readwrite", (store) => store.add(normalizedExercise));
    scheduleCloudSync();
    return result;
}

export async function updateExercise(exercise) {
    const normalizedExercise = normalizeExercise(exercise);
    const result = await tx(["exercises"], "readwrite", (store) => store.put(normalizedExercise));
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
    const exercises = await tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll()));
    return (exercises || []).map((exercise) => normalizeExercise(exercise));
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
                    const nextSortOrder = existing.reduce((max, item) => Math.max(max, Math.max(0, Number.parseInt(item.sortOrder, 10) || 0)), 0) + 1;
                    folderStore.add({ id: Date.now() + Math.floor(Math.random() * 1000000), name: normalizedTemplate.folder, sortOrder: nextSortOrder });
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
                    const nextSortOrder = existing.reduce((max, item) => Math.max(max, Math.max(0, Number.parseInt(item.sortOrder, 10) || 0)), 0) + 1;
                    folderStore.add({ id: Date.now() + Math.floor(Math.random() * 1000000), name: normalizedTemplate.folder, sortOrder: nextSortOrder });
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
    const templates = await tx(["templates"], "readonly", (store) => requestToPromise(store.getAll()));
    return (templates || []).map((template) => normalizeTemplate(template));
}

export async function addFolder(folder) {
    const incoming = normalizeFolder(folder);
    if (!incoming.name) {
        throw new Error("Folder name is required");
    }
    const lower = incoming.name.toLowerCase();
    const result = await tx(["folders"], "readwrite", (store) => {
        store.getAll().onsuccess = (event) => {
            const existing = event.target.result || [];
            if (existing.some((item) => String(item.name || "").trim().toLowerCase() === lower)) {
                return;
            }
            const nextSortOrder = incoming.sortOrder > 0
                ? incoming.sortOrder
                : ((existing.reduce((max, item) => Math.max(max, Math.max(0, Number.parseInt(item.sortOrder, 10) || 0)), 0)) + 1);
            const normalized = { ...incoming, sortOrder: nextSortOrder };
            store.add(normalized);
        };
    });
    scheduleCloudSync();
    return result;
}

export async function getFolders() {
    const folders = await tx(["folders"], "readonly", (store) => requestToPromise(store.getAll()));
    return (folders || []).map((folder) => normalizeFolder(folder));
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

        data.exercises.forEach((item) => exStore.add(normalizeExercise(item)));
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
        // Strip weightIncrement (not used, only restSeconds matters)
        const { weightIncrement, ...cleanItem } = item;
        const exercise = { id: createId(allExerciseIds), ...cleanItem };
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

export async function dedupeExercisesByName() {
    const [exercises, templates, sets] = await Promise.all([
        getExercises(),
        getTemplates(),
        getAllSets(),
    ]);

    const canonicalByName = new Map();
    const duplicateIdToCanonicalId = new Map();
    const sortedExercises = exercises.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));

    sortedExercises.forEach((exercise) => {
        const key = normalizeName(exercise?.name);
        if (!key) return;
        if (!canonicalByName.has(key)) {
            canonicalByName.set(key, exercise.id);
            return;
        }
        duplicateIdToCanonicalId.set(String(exercise.id), canonicalByName.get(key));
    });

    if (duplicateIdToCanonicalId.size === 0) {
        return { removedExercises: 0, updatedTemplates: 0, updatedSets: 0 };
    }

    let updatedTemplates = 0;
    let updatedSets = 0;

    const remapExerciseId = (exerciseId) => {
        const mapped = duplicateIdToCanonicalId.get(String(exerciseId));
        return mapped == null ? exerciseId : mapped;
    };

    const nextTemplates = templates.map((template) => {
        let changed = false;
        const originalItems = Array.isArray(template.items) ? template.items : [];
        const items = originalItems.map((item) => {
            const nextExerciseId = remapExerciseId(item.exerciseId);
            if (String(nextExerciseId) !== String(item.exerciseId)) {
                changed = true;
            }
            return {
                ...item,
                exerciseId: nextExerciseId,
            };
        });

        const originalExerciseIds = Array.isArray(template.exerciseIds) ? template.exerciseIds : items.map((item) => item.exerciseId);
        const nextExerciseIds = originalExerciseIds.map((exerciseId) => remapExerciseId(exerciseId));
        if (nextExerciseIds.some((exerciseId, index) => String(exerciseId) !== String(originalExerciseIds[index]))) {
            changed = true;
        }

        if (!changed) return template;
        updatedTemplates += 1;
        return normalizeTemplate({
            ...template,
            items,
            exerciseIds: nextExerciseIds,
        });
    });

    const nextSets = sets.map((set) => {
        const nextExerciseId = remapExerciseId(set.exerciseId);
        if (String(nextExerciseId) === String(set.exerciseId)) return set;
        updatedSets += 1;
        return {
            ...set,
            exerciseId: nextExerciseId,
        };
    });

    await tx(["exercises", "templates", "sets"], "readwrite", (exerciseStore, templateStore, setStore) => {
        duplicateIdToCanonicalId.forEach((_canonicalId, duplicateId) => {
            exerciseStore.delete(duplicateId);
        });
        nextTemplates.forEach((template) => templateStore.put(template));
        nextSets.forEach((set) => setStore.put(set));
    });
    scheduleCloudSync();

    return {
        removedExercises: duplicateIdToCanonicalId.size,
        updatedTemplates,
        updatedSets,
    };
}
