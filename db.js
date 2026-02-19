const DB_NAME = "overload-db";
const DB_VERSION = 1;

let dbPromise;

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
                const filtered = tmpl.exerciseIds.filter((id) => id !== exerciseId);
                if (filtered.length !== tmpl.exerciseIds.length) {
                    cursor.update({ ...tmpl, exerciseIds: filtered });
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
    return tx(["exercises"], "readonly", (store) => store.getAll());
}

// Templates
export async function addTemplate(template) {
    return tx(["templates"], "readwrite", (store) => store.add(template));
}

export async function deleteTemplate(templateId) {
    return tx(["templates"], "readwrite", (store) => store.delete(templateId));
}

export async function getTemplates() {
    return tx(["templates"], "readonly", (store) => store.getAll());
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
    return tx(["sets"], "readonly", (store) => store.getAll());
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
