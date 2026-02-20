const DB_NAME = "overload-db";
const DB_VERSION = 1;

let dbPromise;

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

// Exercises
export async function addExercise(exercise) {
    return tx(["exercises"], "readwrite", (store) => store.add(exercise));
}

export async function updateExercise(exercise) {
    return tx(["exercises"], "readwrite", (store) => store.put(exercise));
}

export async function deleteExercise(exerciseId) {
    return tx(["exercises", "templates", "sets"], "readwrite", (exStore, tmplStore, setStore) => {
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
}

export async function getExercises() {
    return tx(["exercises"], "readonly", (store) => requestToPromise(store.getAll()));
}

// Templates
export async function addTemplate(template) {
    return tx(["templates"], "readwrite", (store) => store.add(normalizeTemplate(template)));
}

export async function updateTemplate(template) {
    return tx(["templates"], "readwrite", (store) => store.put(normalizeTemplate(template)));
}

export async function deleteTemplate(templateId) {
    return tx(["templates"], "readwrite", (store) => store.delete(templateId));
}

export async function getTemplates() {
    return tx(["templates"], "readonly", (store) => requestToPromise(store.getAll()));
}

// Sessions
export async function addSession(session) {
    return tx(["sessions"], "readwrite", (store) => store.add(session));
}

export async function updateSession(session) {
    return tx(["sessions"], "readwrite", (store) => store.put(session));
}

export async function deleteSession(sessionId) {
    return tx(["sessions", "sets"], "readwrite", (sessionStore, setStore) => {
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
    return tx(["sets"], "readwrite", (store) => store.add(set));
}

export async function updateSet(set) {
    return tx(["sets"], "readwrite", (store) => store.put(set));
}

export async function deleteSet(setId) {
    return tx(["sets"], "readwrite", (store) => store.delete(setId));
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
}

export async function clearAll() {
    await tx(["exercises", "templates", "sessions", "sets"], "readwrite", (exStore, tmplStore, sessionStore, setStore) => {
        exStore.clear();
        tmplStore.clear();
        sessionStore.clear();
        setStore.clear();
    });
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

    return { addedTemplates: templatesToAdd.length };
}
