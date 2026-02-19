import * as db from "./db.js";

const views = document.querySelectorAll(".view");
const tabButtons = document.querySelectorAll(".tab-bar button");
const toastEl = document.getElementById("toast");
const headerStatus = document.getElementById("header-status");

// Workout view refs
const templateSelect = document.getElementById("workout-template");
const startWorkoutBtn = document.getElementById("start-workout");
const workoutSection = document.getElementById("workout-session");
const workoutExercisesEl = document.getElementById("workout-exercises");
const workoutNotesEl = document.getElementById("workout-notes");
const finishWorkoutBtn = document.getElementById("finish-workout");
const cancelWorkoutBtn = document.getElementById("cancel-workout");
const sessionTemplateLabel = document.getElementById("session-template-label");

// Exercises view refs
const addExerciseBtn = document.getElementById("add-exercise");
const clearExercisesBtn = document.getElementById("clear-exercises");
const exercisesListEl = document.getElementById("exercises-list");
const exerciseNameInput = document.getElementById("exercise-name");
const repFloorInput = document.getElementById("rep-floor");
const repCeilingInput = document.getElementById("rep-ceiling");
const weightIncrementInput = document.getElementById("weight-increment");

// History view refs
const sessionsListEl = document.getElementById("sessions-list");
const historyExercisesEl = document.getElementById("history-exercises");
const refreshHistoryBtn = document.getElementById("refresh-history");
const modal = document.getElementById("history-modal");
const modalTitle = document.getElementById("modal-title");
const modalHistoryList = document.getElementById("modal-history-list");
const closeModalBtn = document.getElementById("close-modal");
const modalChartCanvas = document.getElementById("history-chart");
let modalChart = null;

// Settings refs
const exportBtn = document.getElementById("export-data");
const importBtn = document.getElementById("import-data");
const importInput = document.getElementById("import-file");
const clearDataBtn = document.getElementById("clear-data");

const state = {
    exercises: [],
    templates: [],
    sessions: [],
    sets: [],
    activeSession: null,
    activeExercises: [],
};

// Utilities
function showToast(message, type = "info") {
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    toastEl.classList.remove("hidden");
    setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatWeight(value) {
    return Number(value).toFixed(1).replace(/\\.0$/, "");
}

function uuid() {
    return Date.now() + Math.floor(Math.random() * 100000);
}

// Navigation
function setView(viewId) {
    views.forEach((v) => v.classList.toggle("active", v.id === viewId));
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
}

// Data loading
async function refreshData() {
    state.exercises = (await db.getExercises()).sort((a, b) => a.name.localeCompare(b.name));
    state.templates = await db.getTemplates();
    state.sessions = await db.getSessions({ includeDraft: true });
    state.sets = await db.getAllSets();
}

async function refreshUI() {
    await refreshData();
    renderTemplateSelect();
    renderExercises();
    renderHistory();
    maybeResumeDraft();
}

function renderTemplateSelect() {
    templateSelect.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "All exercises";
    templateSelect.appendChild(defaultOpt);
    state.templates.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        templateSelect.appendChild(opt);
    });
}

// Exercises
async function addExercise() {
    const name = exerciseNameInput.value.trim();
    const repFloor = parseInt(repFloorInput.value, 10);
    const repCeiling = parseInt(repCeilingInput.value, 10);
    const weightIncrement = parseFloat(weightIncrementInput.value);

    if (!name || Number.isNaN(repFloor) || Number.isNaN(repCeiling) || repFloor >= repCeiling || Number.isNaN(weightIncrement)) {
        showToast("Enter valid exercise details", "error");
        return;
    }

    await db.addExercise({ id: uuid(), name, repFloor, repCeiling, weightIncrement });
    exerciseNameInput.value = "";
    showToast("Exercise added", "success");
    await refreshUI();
}

async function clearExercises() {
    if (!confirm("Delete all exercises? This also removes related sets.")) return;
    const ids = state.exercises.map((e) => e.id);
    for (const id of ids) {
        await db.deleteExercise(id);
    }
    await refreshUI();
    showToast("Exercises cleared", "success");
}

function renderExercises() {
    exercisesListEl.innerHTML = "";
    if (state.exercises.length === 0) {
        exercisesListEl.innerHTML = `<div class="empty">No exercises yet. Add one.</div>`;
        return;
    }
    state.exercises.forEach((ex) => {
        const card = document.createElement("div");
        card.className = "list-card";
        card.innerHTML = `
            <div>
                <p class="label">${ex.name}</p>
                <p class="sub">${ex.repFloor}–${ex.repCeiling} reps • +${formatWeight(ex.weightIncrement)} lbs</p>
            </div>
            <div class="list-actions">
                <button class="ghost small" data-action="edit">Edit</button>
                <button class="danger ghost small" data-action="delete">Delete</button>
            </div>
        `;
        card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
            if (!confirm(`Delete ${ex.name}?`)) return;
            await db.deleteExercise(ex.id);
            await refreshUI();
            showToast("Exercise deleted", "success");
        });
        card.querySelector('[data-action="edit"]').addEventListener("click", async () => {
            const newName = prompt("Exercise name", ex.name);
            if (!newName) return;
            const newFloor = parseInt(prompt("Rep floor", ex.repFloor) || ex.repFloor, 10);
            const newCeil = parseInt(prompt("Rep ceiling", ex.repCeiling) || ex.repCeiling, 10);
            const newInc = parseFloat(prompt("Weight increment", ex.weightIncrement) || ex.weightIncrement);
            if (Number.isNaN(newFloor) || Number.isNaN(newCeil) || newFloor >= newCeil || Number.isNaN(newInc)) {
                showToast("Invalid values", "error");
                return;
            }
            await db.updateExercise({ ...ex, name: newName.trim(), repFloor: newFloor, repCeiling: newCeil, weightIncrement: newInc });
            await refreshUI();
            showToast("Exercise updated", "success");
        });
        exercisesListEl.appendChild(card);
    });
}

// Workout logic
function getExercisesForTemplate(templateId) {
    if (!templateId) return state.exercises;
    const tmpl = state.templates.find((t) => String(t.id) === String(templateId));
    if (!tmpl) return state.exercises;
    return state.exercises.filter((ex) => tmpl.exerciseIds.includes(ex.id));
}

async function startWorkout() {
    const templateId = templateSelect.value ? Number(templateSelect.value) : null;
    const exercises = getExercisesForTemplate(templateId);
    if (exercises.length === 0) {
        showToast("Add exercises first", "error");
        return;
    }

    // If a draft exists, reuse it; otherwise create new
    if (!state.activeSession) {
        const session = {
            id: uuid(),
            date: new Date().toISOString(),
            templateId,
            notes: "",
            status: "draft",
        };
        await db.addSession(session);
        state.sessions.unshift(session);
        state.activeSession = session;
    } else {
        // If active session template differs, confirm restart
        if (state.activeSession.templateId !== templateId) {
            const prevId = state.activeSession.id;
            await db.deleteSession(prevId);
            state.sets = state.sets.filter((s) => s.sessionId !== prevId);
            state.sessions = state.sessions.filter((s) => s.id !== prevId);
            state.activeSession = null;
            return startWorkout(); // retry with fresh session
        }
    }

    state.activeExercises = exercises;
    workoutNotesEl.value = state.activeSession.notes || "";
    sessionTemplateLabel.textContent = templateId ? state.templates.find((t) => t.id === templateId)?.name || "Workout" : "Workout";
    workoutSection.classList.remove("hidden");
    renderWorkoutExercises();
    setView("view-workout");
}

function maybeResumeDraft() {
    if (state.activeSession) return;
    const draft = state.sessions.find((s) => s.status === "draft");
    if (draft) {
        state.activeSession = draft;
        state.activeExercises = getExercisesForTemplate(draft.templateId);
        sessionTemplateLabel.textContent = draft.templateId ? state.templates.find((t) => t.id === draft.templateId)?.name || "Workout" : "Workout";
        workoutNotesEl.value = draft.notes || "";
        workoutSection.classList.remove("hidden");
        renderWorkoutExercises();
    }
}

function renderWorkoutExercises() {
    workoutExercisesEl.innerHTML = "";
    const sessionId = state.activeSession?.id;
    const sessionSets = state.sets.filter((s) => s.sessionId === sessionId);

    state.activeExercises.forEach((ex) => {
        const exSets = sessionSets.filter((s) => s.exerciseId === ex.id).sort((a, b) => a.setNumber - b.setNumber);
        const card = document.createElement("div");
        card.className = "exercise-card";

        const target = computeNextTarget(ex);
        card.innerHTML = `
            <div class="exercise-header">
                <div>
                    <p class="label">${ex.name}</p>
                    <p class="sub">${ex.repFloor}–${ex.repCeiling} reps • +${formatWeight(ex.weightIncrement)} lbs</p>
                </div>
                <div class="target-chip">${target}</div>
            </div>
            <div class="sets-container" data-exercise-id="${ex.id}"></div>
            <button class="ghost add-set">+ Add set</button>
        `;

        const setsContainer = card.querySelector(".sets-container");
        exSets.forEach((set) => addSetRow(setsContainer, ex, set));
        if (exSets.length === 0) {
            addSetRow(setsContainer, ex, null);
        }

        card.querySelector(".add-set").addEventListener("click", () => addSetRow(setsContainer, ex, null));
        workoutExercisesEl.appendChild(card);
    });
}

function addSetRow(container, exercise, existingSet) {
    const row = document.createElement("div");
    row.className = "set-row";
    if (existingSet) {
        row.dataset.setId = existingSet.id;
    }
    row.innerHTML = `
        <input type="number" placeholder="Weight" inputmode="decimal" step="0.5" value="${existingSet ? existingSet.weight : ""}">
        <span class="x">×</span>
        <input type="number" placeholder="Reps" inputmode="numeric" min="1" value="${existingSet ? existingSet.reps : ""}">
        <button class="ghost small remove-set">Remove</button>
    `;

    const [weightInput, repsInput] = row.querySelectorAll("input");
    const save = () => saveSetRow(container, exercise, row, weightInput, repsInput);
    weightInput.addEventListener("input", save);
    repsInput.addEventListener("input", save);

    row.querySelector(".remove-set").addEventListener("click", async () => {
        if (row.dataset.setId) {
            await db.deleteSet(Number(row.dataset.setId));
            state.sets = state.sets.filter((s) => String(s.id) !== row.dataset.setId);
        }
        row.remove();
    });

    container.appendChild(row);
}

async function saveSetRow(container, exercise, row, weightInput, repsInput) {
    if (!state.activeSession) return;
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (!weight || !reps) return;

    const setNumber = Array.from(container.querySelectorAll(".set-row")).indexOf(row) + 1;
    const payload = {
        id: row.dataset.setId ? Number(row.dataset.setId) : uuid(),
        sessionId: state.activeSession.id,
        exerciseId: exercise.id,
        setNumber,
        weight,
        reps,
    };

    if (row.dataset.setId) {
        await db.updateSet(payload);
        state.sets = state.sets.map((s) => (s.id === payload.id ? payload : s));
    } else {
        await db.addSet(payload);
        row.dataset.setId = payload.id;
        state.sets.push(payload);
    }
}

async function finishWorkout() {
    if (!state.activeSession) {
        showToast("No active workout", "error");
        return;
    }
    const sessionId = state.activeSession.id;
    const sessionSets = state.sets.filter((s) => s.sessionId === sessionId);
    if (sessionSets.length === 0) {
        showToast("Log at least one set", "error");
        return;
    }

    const updated = { ...state.activeSession, notes: workoutNotesEl.value, status: "complete" };
    await db.updateSession(updated);
    state.sessions = state.sessions.map((s) => (s.id === updated.id ? updated : s));
    state.activeSession = null;
    state.activeExercises = [];
    workoutNotesEl.value = "";
    workoutSection.classList.add("hidden");
    showToast("Workout saved", "success");
    await refreshUI();
}

async function cancelWorkout() {
    if (!state.activeSession) return;
    if (!confirm("Cancel current workout? This removes draft sets.")) return;
    await db.deleteSession(state.activeSession.id);
    state.sessions = state.sessions.filter((s) => s.id !== state.activeSession.id);
    state.sets = state.sets.filter((s) => s.sessionId !== state.activeSession.id);
    state.activeSession = null;
    state.activeExercises = [];
    workoutNotesEl.value = "";
    workoutSection.classList.add("hidden");
    showToast("Workout canceled", "info");
    await refreshUI();
}

// History
function renderHistory() {
    renderSessionsList();
    renderExerciseHistoryCards();
}

function renderSessionsList() {
    sessionsListEl.innerHTML = "";
    const completed = state.sessions.filter((s) => s.status !== "draft").sort((a, b) => new Date(b.date) - new Date(a.date));
    if (completed.length === 0) {
        sessionsListEl.innerHTML = `<div class="empty">No sessions yet</div>`;
        return;
    }

    completed.forEach((session) => {
        const card = document.createElement("div");
        card.className = "list-card";
        const sessionSets = state.sets.filter((s) => s.sessionId === session.id);
        const exerciseNames = [...new Set(sessionSets.map((s) => s.exerciseId))]
            .map((id) => state.exercises.find((ex) => ex.id === id)?.name)
            .filter(Boolean)
            .join(", ");
        card.innerHTML = `
            <div>
                <p class="label">${formatDate(session.date)}</p>
                <p class="sub">${session.templateId ? state.templates.find((t) => t.id === session.templateId)?.name || "Workout" : "Workout"}</p>
                <p class="sub small">${exerciseNames || "No sets recorded"}</p>
            </div>
            <div class="list-actions">
                <button class="ghost small" data-action="view">View</button>
                <button class="danger ghost small" data-action="delete">Delete</button>
            </div>
        `;
        card.querySelector('[data-action="view"]').addEventListener("click", () => openSessionModal(session));
        card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
            if (!confirm("Delete this session?")) return;
            await db.deleteSession(session.id);
            await refreshUI();
            showToast("Session deleted", "success");
        });
        sessionsListEl.appendChild(card);
    });
}

function renderExerciseHistoryCards() {
    historyExercisesEl.innerHTML = "";
    if (state.exercises.length === 0) {
        historyExercisesEl.innerHTML = `<div class="empty">Add exercises to see history</div>`;
        return;
    }
    state.exercises.forEach((ex) => {
        const target = computeNextTarget(ex);
        const card = document.createElement("div");
        card.className = "list-card";
        card.innerHTML = `
            <div>
                <p class="label">${ex.name}</p>
                <p class="sub">Next: ${target}</p>
            </div>
            <div class="list-actions">
                <button class="ghost small" data-action="history">History</button>
            </div>
        `;
        card.querySelector('[data-action="history"]').addEventListener("click", () => openExerciseModal(ex));
        historyExercisesEl.appendChild(card);
    });
}

function computeNextTarget(exercise) {
    const completedSessions = state.sessions.filter((s) => s.status !== "draft").sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const session of completedSessions) {
        const sets = state.sets.filter((s) => s.sessionId === session.id && s.exerciseId === exercise.id);
        if (sets.length === 0) continue;
        const topSet = sets.slice().sort((a, b) => (b.weight === a.weight ? b.reps - a.reps : b.weight - a.weight))[0];
        if (!topSet) continue;
        if (topSet.reps >= exercise.repCeiling) {
            return `${formatWeight(topSet.weight + exercise.weightIncrement)} × ${exercise.repFloor}`;
        }
        return `${formatWeight(topSet.weight)} × ${topSet.reps + 1}–${exercise.repCeiling}`;
    }
    return "Start tracking";
}

function openSessionModal(session) {
    const sets = state.sets.filter((s) => s.sessionId === session.id);
    modalTitle.textContent = `Session — ${formatDate(session.date)}`;
    modalHistoryList.innerHTML = "";
    if (sets.length === 0) {
        modalHistoryList.innerHTML = `<div class="empty">No sets logged</div>`;
    } else {
        const grouped = groupSetsByExercise(sets);
        Object.keys(grouped).forEach((exerciseId) => {
            const ex = state.exercises.find((e) => e.id === Number(exerciseId));
            const exSets = grouped[exerciseId];
            const block = document.createElement("div");
            block.className = "history-block";
            block.innerHTML = `
                <p class="label">${ex ? ex.name : "Exercise"}</p>
                <p class="sub">${exSets.map((s, i) => `Set ${i + 1}: ${formatWeight(s.weight)} × ${s.reps}`).join(" • ")}</p>
            `;
            modalHistoryList.appendChild(block);
        });
    }
    closeModalBtn.onclick = () => modal.close();
    modal.showModal();
}

function openExerciseModal(exercise) {
    const sets = state.sets.filter((s) => s.exerciseId === exercise.id);
    const bySession = groupSetsBySession(sets);
    const sessionsWithExercise = state.sessions
        .filter((s) => bySession[s.id])
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // ascending for chart

    modalTitle.textContent = `${exercise.name} — History`;
    modalHistoryList.innerHTML = "";

    if (sessionsWithExercise.length === 0) {
        modalHistoryList.innerHTML = `<div class="empty">No history yet</div>`;
    } else {
        sessionsWithExercise.forEach((session) => {
            const exSets = bySession[session.id].sort((a, b) => a.setNumber - b.setNumber);
            const topSet = exSets.slice().sort((a, b) => (b.weight === a.weight ? b.reps - a.reps : b.weight - a.weight))[0];
            const block = document.createElement("div");
            block.className = "history-block";
            block.innerHTML = `
                <p class="label">${formatDate(session.date)}</p>
                <p class="sub">${exSets.map((s, i) => `Set ${i + 1}: ${formatWeight(s.weight)} × ${s.reps}`).join(" • ")}</p>
                <p class="sub small">Top set: ${formatWeight(topSet.weight)} × ${topSet.reps}</p>
            `;
            modalHistoryList.appendChild(block);
        });
    }

    renderChart(exercise, sessionsWithExercise, bySession);
    closeModalBtn.onclick = () => modal.close();
    modal.showModal();
}

function groupSetsByExercise(sets) {
    return sets.reduce((acc, set) => {
        acc[set.exerciseId] = acc[set.exerciseId] || [];
        acc[set.exerciseId].push(set);
        return acc;
    }, {});
}

function groupSetsBySession(sets) {
    return sets.reduce((acc, set) => {
        acc[set.sessionId] = acc[set.sessionId] || [];
        acc[set.sessionId].push(set);
        return acc;
    }, {});
}

function renderChart(exercise, sessionsWithExercise, bySession) {
    if (modalChart) {
        modalChart.destroy();
        modalChart = null;
    }
    if (!sessionsWithExercise.length || typeof Chart === "undefined") return;

    const labels = [];
    const data = [];
    sessionsWithExercise.forEach((session) => {
        const sets = bySession[session.id];
        const topSet = sets.slice().sort((a, b) => (b.weight === a.weight ? b.reps - a.reps : b.weight - a.weight))[0];
        labels.push(formatDate(session.date));
        data.push(topSet.weight);
    });

    modalChart = new Chart(modalChartCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: `${exercise.name} top set`,
                    data,
                    borderColor: "#6ee7b7",
                    backgroundColor: "rgba(110,231,183,0.15)",
                    tension: 0.3,
                    pointRadius: 3,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { title: { display: true, text: "Weight" } },
            },
        },
    });
}

// Settings: export/import/clear
async function exportData() {
    const data = await db.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overload-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported data", "success");
}

function triggerImport() {
    importInput.click();
}

async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
        const parsed = JSON.parse(text);
        if (!confirm("Import data and overwrite current records?")) return;
        await db.importData(parsed);
        await refreshUI();
        showToast("Data imported", "success");
    } catch (err) {
        console.error(err);
        showToast("Invalid import file", "error");
    } finally {
        importInput.value = "";
    }
}

async function clearData() {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    await db.clearAll();
    state.activeSession = null;
    state.activeExercises = [];
    workoutSection.classList.add("hidden");
    await refreshUI();
    showToast("Data cleared", "success");
}

// PWA registration
function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").then(() => {
        headerStatus.textContent = "Offline-ready";
    }).catch(() => {
        headerStatus.textContent = "Online";
    });
}

// Event bindings
function bindEvents() {
    tabButtons.forEach((btn) =>
        btn.addEventListener("click", () => {
            setView(btn.dataset.view);
            if (btn.dataset.view === "view-history") {
                renderHistory();
            }
        })
    );
    startWorkoutBtn.addEventListener("click", startWorkout);
    finishWorkoutBtn.addEventListener("click", finishWorkout);
    cancelWorkoutBtn.addEventListener("click", cancelWorkout);
    addExerciseBtn.addEventListener("click", addExercise);
    clearExercisesBtn.addEventListener("click", clearExercises);
    refreshHistoryBtn.addEventListener("click", renderHistory);
    exportBtn.addEventListener("click", exportData);
    importBtn.addEventListener("click", triggerImport);
    importInput.addEventListener("change", handleImport);
    clearDataBtn.addEventListener("click", clearData);
}

async function init() {
    bindEvents();
    registerServiceWorker();
    await refreshUI();
    // Default to workout view
    setView("view-workout");
}

init();
