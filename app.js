import * as db from "./db.js";

const views = document.querySelectorAll(".view");
const tabButtons = document.querySelectorAll(".tab-bar button");
const toastEl = document.getElementById("toast");
const headerStatus = document.getElementById("header-status");
const appEl = document.getElementById("app");
const authGateEl = document.getElementById("auth-gate");
const authGateStatusEl = document.getElementById("auth-gate-status");
const gateSignInGoogleBtn = document.getElementById("gate-sign-in-google");
const gateAuthEmailInput = document.getElementById("gate-auth-email");
const gateSendMagicLinkBtn = document.getElementById("gate-send-magic-link");

// Workout view refs
const workoutLauncherEl = document.getElementById("workout-launcher");
const templateSelect = document.getElementById("workout-template");
const startWorkoutBtn = document.getElementById("start-workout");
const workoutElapsedEl = document.getElementById("workout-elapsed");
const workoutSection = document.getElementById("workout-session");
const workoutExercisesEl = document.getElementById("workout-exercises");
const workoutNotesEl = document.getElementById("workout-notes");
const finishWorkoutBtn = document.getElementById("finish-workout");
const pauseWorkoutBtn = document.getElementById("pause-workout");
const cancelWorkoutBtn = document.getElementById("cancel-workout");
const sessionTemplateLabel = document.getElementById("session-template-label");
const restLessBtn = document.getElementById("rest-less");
const restMoreBtn = document.getElementById("rest-more");
const restStopBtn = document.getElementById("rest-stop");
const restDisplayEl = document.getElementById("rest-display");

// Exercises view refs
const addExerciseBtn = document.getElementById("add-exercise");
const loadDefaultLibraryBtn = document.getElementById("load-default-library");
const clearExercisesBtn = document.getElementById("clear-exercises");
const exercisesListEl = document.getElementById("exercises-list");
const exerciseNameInput = document.getElementById("exercise-name");
const repFloorInput = document.getElementById("rep-floor");
const repCeilingInput = document.getElementById("rep-ceiling");
const weightIncrementInput = document.getElementById("weight-increment");
const templateNameInput = document.getElementById("template-name");
const createTemplateBtn = document.getElementById("create-template");
const resetTemplatesBtn = document.getElementById("reset-templates");
const templatesListEl = document.getElementById("templates-list");
const templateEditorEmptyEl = document.getElementById("template-editor-empty");
const templateEditorPanelEl = document.getElementById("template-editor-panel");
const templateEditorNameInput = document.getElementById("template-editor-name");
const saveTemplateNameBtn = document.getElementById("save-template-name");
const templateAddExerciseSelect = document.getElementById("template-add-exercise");
const addTemplateExerciseBtn = document.getElementById("add-template-exercise");
const makeSupersetBtn = document.getElementById("make-superset");
const clearSupersetBtn = document.getElementById("clear-superset");
const templateExercisePickerEl = document.getElementById("template-exercise-picker");

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
const authEmailInput = document.getElementById("auth-email");
const signInGoogleBtn = document.getElementById("sign-in-google");
const sendMagicLinkBtn = document.getElementById("send-magic-link");
const signOutBtn = document.getElementById("sign-out");
const authStatusEl = document.getElementById("auth-status");
const syncNowBtn = document.getElementById("sync-now");

const state = {
    exercises: [],
    templates: [],
    sessions: [],
    sets: [],
    activeSession: null,
    activeExercises: [],
    selectedTemplateId: null,
    selectedTemplateExerciseIds: new Set(),
    supersetDraftMode: false,
    workoutTimer: {
        intervalId: null,
    },
    restTimer: {
        remainingSeconds: 0,
        running: false,
        intervalId: null,
    },
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

function formatWeightInput(value) {
    if (value === undefined || value === null || value === "") return "";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "";
    const rounded = Math.round(numeric * 2) / 2;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatTimer(seconds) {
    const clamped = Math.max(0, Number.parseInt(seconds, 10) || 0);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDuration(seconds) {
    const total = Math.max(0, Number.parseInt(seconds, 10) || 0);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
        return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function uuid() {
    return Date.now() + Math.floor(Math.random() * 100000);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderAuthState(auth) {
    const shouldGate = Boolean(!auth?.loading && !auth?.user);
    authGateEl.classList.toggle("hidden", !shouldGate);
    appEl.classList.toggle("hidden", shouldGate);

    if (authGateStatusEl) {
        if (!auth?.configured) {
            authGateStatusEl.textContent = "Sign-in is currently unavailable.";
        } else if (auth?.loading) {
            authGateStatusEl.textContent = "Loading account...";
        } else if (!auth?.user) {
            authGateStatusEl.textContent = "Use your account to load your data.";
        } else {
            authGateStatusEl.textContent = auth.user.email || "Signed in";
        }
    }

    if (!auth?.configured) {
        authStatusEl.textContent = "Sign-in unavailable";
        signInGoogleBtn.classList.remove("hidden");
        sendMagicLinkBtn.classList.remove("hidden");
        authEmailInput.closest(".field")?.classList.remove("hidden");
        signOutBtn.disabled = true;
        syncNowBtn.disabled = true;
        return;
    }
    if (auth.loading) {
        authStatusEl.textContent = "Loading account...";
        signInGoogleBtn.classList.remove("hidden");
        sendMagicLinkBtn.classList.remove("hidden");
        authEmailInput.closest(".field")?.classList.remove("hidden");
        signOutBtn.disabled = true;
        syncNowBtn.disabled = true;
        return;
    }
    if (!auth.user) {
        authStatusEl.textContent = "Not signed in";
        signInGoogleBtn.classList.remove("hidden");
        sendMagicLinkBtn.classList.remove("hidden");
        authEmailInput.closest(".field")?.classList.remove("hidden");
        signOutBtn.disabled = true;
        syncNowBtn.disabled = true;
        return;
    }
    authStatusEl.textContent = auth.user.email || auth.user.id;
    signInGoogleBtn.classList.add("hidden");
    sendMagicLinkBtn.classList.add("hidden");
    authEmailInput.closest(".field")?.classList.add("hidden");
    signOutBtn.disabled = false;
    syncNowBtn.disabled = false;
}

async function signInWithGoogle() {
    try {
        await db.signInWithGoogle();
    } catch (err) {
        console.error(err);
        showToast(err?.message || "Google sign-in failed", "error");
    }
}

async function sendMagicLink() {
    const email = (authEmailInput.value || gateAuthEmailInput.value || "").trim();
    if (!email) {
        showToast("Enter your email first", "error");
        return;
    }
    try {
        await db.signInWithMagicLink(email);
        authEmailInput.value = email;
        gateAuthEmailInput.value = email;
        showToast("Magic link sent", "success");
    } catch (err) {
        console.error(err);
        showToast(err?.message || "Could not send magic link", "error");
    }
}

async function signOut() {
    try {
        await db.signOutCloud();
        showToast("Signed out", "info");
    } catch (err) {
        console.error(err);
        showToast(err?.message || "Sign out failed", "error");
    }
}

async function syncNow() {
    try {
        await db.forceSyncToCloud();
        showToast("Cloud sync complete", "success");
    } catch (err) {
        console.error(err);
        showToast(err?.message || "Cloud sync failed", "error");
    }
}

function playTimerDing() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.35);
        oscillator.onended = () => ctx.close();
    } catch (err) {
        console.error(err);
    }
}

function triggerHaptic() {
    try {
        if (navigator.vibrate) {
            navigator.vibrate([120, 80, 140]);
        }
    } catch (err) {
        console.error(err);
    }
}

function notifyRestComplete() {
    playTimerDing();
    triggerHaptic();
    showToast("Rest complete", "success");
}

function getSessionStartIso(session) {
    return session?.startedAt || session?.date || null;
}

function getSessionDurationSeconds(session) {
    const startIso = getSessionStartIso(session);
    if (!startIso) return 0;
    const startMs = new Date(startIso).getTime();
    if (Number.isNaN(startMs)) return 0;
    const endIso = session?.finishedAt || (session?.isPaused && session?.pausedAt ? session.pausedAt : new Date().toISOString());
    const endMs = new Date(endIso).getTime();
    if (Number.isNaN(endMs) || endMs < startMs) return 0;
    const pausedSeconds = Math.max(0, Number.parseInt(session?.pausedAccumulatedSeconds, 10) || 0);
    return Math.max(0, Math.floor((endMs - startMs) / 1000) - pausedSeconds);
}

function renderWorkoutControls() {
    const hasSession = Boolean(state.activeSession);
    pauseWorkoutBtn.classList.toggle("hidden", !hasSession);
    if (!hasSession) return;
    const paused = Boolean(state.activeSession?.isPaused);
    pauseWorkoutBtn.textContent = paused ? "▶" : "⏸";
    pauseWorkoutBtn.title = paused ? "Resume workout" : "Pause workout";
    pauseWorkoutBtn.setAttribute("aria-label", paused ? "Resume workout" : "Pause workout");
}

function renderWorkoutElapsed() {
    const hasSession = Boolean(state.activeSession);
    workoutLauncherEl.classList.toggle("hidden", hasSession);
    workoutElapsedEl.classList.toggle("hidden", !hasSession);
    if (!hasSession) {
        workoutElapsedEl.textContent = "Elapsed 0:00";
        renderWorkoutControls();
        return;
    }
    const prefix = state.activeSession?.isPaused ? "Paused" : "Elapsed";
    workoutElapsedEl.textContent = `${prefix} ${formatDuration(getSessionDurationSeconds(state.activeSession))}`;
    renderWorkoutControls();
}

function stopWorkoutElapsedTimer() {
    if (state.workoutTimer.intervalId) {
        clearInterval(state.workoutTimer.intervalId);
    }
    state.workoutTimer.intervalId = null;
    renderWorkoutElapsed();
}

function startWorkoutElapsedTimer() {
    stopWorkoutElapsedTimer();
    if (!state.activeSession) return;
    renderWorkoutElapsed();
    if (state.activeSession.isPaused) return;
    state.workoutTimer.intervalId = setInterval(renderWorkoutElapsed, 1000);
}

async function pauseOrResumeWorkout() {
    if (!state.activeSession) return;
    const now = new Date();
    const currentlyPaused = Boolean(state.activeSession.isPaused);
    let nextSession = { ...state.activeSession };

    if (!currentlyPaused) {
        nextSession = {
            ...nextSession,
            isPaused: true,
            pausedAt: now.toISOString(),
            notes: workoutNotesEl.value,
        };
        showToast("Workout paused", "info");
    } else {
        const pausedAtMs = new Date(nextSession.pausedAt || now.toISOString()).getTime();
        const pausedDelta = Number.isFinite(pausedAtMs) ? Math.max(0, Math.floor((now.getTime() - pausedAtMs) / 1000)) : 0;
        nextSession = {
            ...nextSession,
            isPaused: false,
            pausedAt: null,
            pausedAccumulatedSeconds: (Number.parseInt(nextSession.pausedAccumulatedSeconds, 10) || 0) + pausedDelta,
            notes: workoutNotesEl.value,
        };
        showToast("Workout resumed", "success");
    }

    await db.updateSession(nextSession);
    state.activeSession = nextSession;
    state.sessions = state.sessions.map((session) => (String(session.id) === String(nextSession.id) ? nextSession : session));
    startWorkoutElapsedTimer();
    renderWorkoutElapsed();
}

function renderRestTimer() {
    restDisplayEl.textContent = formatTimer(state.restTimer.remainingSeconds);
    const controlsDisabled = !state.restTimer.running;
    restLessBtn.disabled = controlsDisabled;
    restMoreBtn.disabled = controlsDisabled;
    restStopBtn.disabled = controlsDisabled;
}

function stopRestTimer() {
    if (state.restTimer.intervalId) {
        clearInterval(state.restTimer.intervalId);
    }
    state.restTimer.intervalId = null;
    state.restTimer.running = false;
    renderRestTimer();
}

function startRestTimer(seconds) {
    stopRestTimer();
    state.restTimer.remainingSeconds = Math.max(0, Number.parseInt(seconds, 10) || 0);
    if (state.restTimer.remainingSeconds <= 0) {
        renderRestTimer();
        return;
    }
    state.restTimer.running = true;
    renderRestTimer();
    state.restTimer.intervalId = setInterval(() => {
        state.restTimer.remainingSeconds -= 1;
        if (state.restTimer.remainingSeconds <= 0) {
            state.restTimer.remainingSeconds = 0;
            stopRestTimer();
            notifyRestComplete();
            return;
        }
        renderRestTimer();
    }, 1000);
}

function adjustRestTimer(deltaSeconds) {
    if (!state.restTimer.running) return;
    state.restTimer.remainingSeconds = Math.max(0, state.restTimer.remainingSeconds + deltaSeconds);
    if (state.restTimer.remainingSeconds === 0) {
        stopRestTimer();
        notifyRestComplete();
        return;
    }
    renderRestTimer();
}

function getTemplateItems(template) {
    if (!template) return [];
    if (Array.isArray(template.items)) {
        return template.items.map((item) => ({
            exerciseId: item.exerciseId,
            sets: Math.max(1, Number.parseInt(item.sets, 10) || 3),
            reps: String(item.reps || "8-12").trim(),
            restSeconds: Math.max(0, Number.parseInt(item.restSeconds, 10) || 90),
            supersetId: item.supersetId ? String(item.supersetId) : null,
            supersetOrder: Number.parseInt(item.supersetOrder, 10) || 0,
        }));
    }
    return (template.exerciseIds || []).map((exerciseId) => ({
        exerciseId,
        sets: 3,
        reps: "8-12",
        restSeconds: 90,
        supersetId: null,
        supersetOrder: 0,
    }));
}

function applyTemplateItems(template, items) {
    const normalizedItems = (items || [])
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
    normalizedItems.forEach((item) => {
        if (!item.supersetId) {
            item.supersetOrder = 0;
            return;
        }
        const nextOrder = (orderByGroup.get(item.supersetId) || 0) + 1;
        orderByGroup.set(item.supersetId, nextOrder);
        item.supersetOrder = nextOrder;
    });

    return {
        ...template,
        items: normalizedItems,
        exerciseIds: normalizedItems.map((item) => item.exerciseId),
    };
}

function clearTemplateSelection() {
    state.selectedTemplateExerciseIds = new Set();
}

function setSupersetDraftMode(enabled) {
    state.supersetDraftMode = Boolean(enabled);
    if (makeSupersetBtn) {
        makeSupersetBtn.textContent = state.supersetDraftMode ? "Save superset" : "Make superset";
    }
}

function getSupersetMetaByExercise(templateItems) {
    const groupOrder = [];
    const groups = new Map();
    templateItems.forEach((item, index) => {
        if (!item.supersetId) return;
        if (!groups.has(item.supersetId)) {
            groups.set(item.supersetId, []);
            groupOrder.push(item.supersetId);
        }
        groups.get(item.supersetId).push({ ...item, index });
    });

    const metaByExerciseId = new Map();
    groupOrder.forEach((supersetId, idx) => {
        const members = groups.get(supersetId) || [];
        if (members.length < 2) return;
        members.sort((a, b) => a.index - b.index);
        const label = idx < 26 ? String.fromCharCode(65 + idx) : String(idx + 1);
        const memberExerciseIds = members.map((member) => member.exerciseId);
        const restSeconds = Math.max(...members.map((member) => Number.parseInt(member.restSeconds, 10) || 0), 0);
        members.forEach((member) => {
            metaByExerciseId.set(String(member.exerciseId), {
                supersetId,
                label,
                memberExerciseIds,
                restSeconds,
                order: member.supersetOrder || memberExerciseIds.indexOf(member.exerciseId) + 1,
            });
        });
    });

    return metaByExerciseId;
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
    renderTemplatesList();
    renderTemplateEditor();
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

function getTemplateRestSecondsForExercise(exerciseId) {
    if (!state.activeSession?.templateId) return 90;
    const activeTemplate = state.templates.find((template) => String(template.id) === String(state.activeSession.templateId));
    const item = getTemplateItems(activeTemplate).find((entry) => String(entry.exerciseId) === String(exerciseId));
    return item?.restSeconds ?? 90;
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

async function loadDefaultLibrary() {
    try {
        const result = await db.installDefaultLibrary();
        await refreshUI();
        if (result.addedExercises === 0 && result.addedTemplates === 0) {
            showToast("Default library already installed", "info");
            return;
        }
        showToast(`Added ${result.addedExercises} exercises, ${result.addedTemplates} templates`, "success");
    } catch (err) {
        console.error(err);
        showToast(`Could not load defaults: ${err?.message || "unknown error"}`, "error");
    }
}

async function createTemplate() {
    const name = templateNameInput.value.trim();
    if (!name) {
        showToast("Enter a template name", "error");
        return;
    }

    const duplicate = state.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        showToast("Template name already exists", "error");
        return;
    }

    await db.addTemplate({
        id: uuid(),
        name,
        items: [],
        exerciseIds: [],
    });
    templateNameInput.value = "";
    showToast("Template created", "success");
    await refreshUI();
    const created = state.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (created) {
        state.selectedTemplateId = created.id;
        renderTemplatesList();
        renderTemplateEditor();
    }
}

async function resetTemplatesToDefaultSplit() {
    if (!confirm("Replace all current templates with the default 7-day split examples?")) return;
    try {
        const result = await db.resetTemplatesToDefaultSplit();
        state.selectedTemplateId = null;
        await refreshUI();
        showToast(`Loaded ${result.addedTemplates} split templates`, "success");
    } catch (err) {
        console.error(err);
        showToast(`Could not reset templates: ${err?.message || "unknown error"}`, "error");
    }
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
                <p class="label">${escapeHtml(ex.name)}</p>
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

function getSelectedTemplate() {
    return state.templates.find((template) => String(template.id) === String(state.selectedTemplateId)) || null;
}

async function saveTemplate(updatedTemplate, successMessage = "Template updated", { silent = false } = {}) {
    const normalizedTemplate = applyTemplateItems(updatedTemplate, getTemplateItems(updatedTemplate));
    await db.updateTemplate(normalizedTemplate);
    state.templates = state.templates.map((template) => (String(template.id) === String(normalizedTemplate.id) ? normalizedTemplate : template));
    renderTemplateSelect();
    renderTemplatesList();
    renderTemplateEditor();
    if (!silent) {
        showToast(successMessage, "success");
    }
}

async function saveTemplateName() {
    const template = getSelectedTemplate();
    if (!template) return;
    const name = templateEditorNameInput.value.trim();
    if (!name) {
        showToast("Enter a template name", "error");
        return;
    }
    const duplicate = state.templates.find((item) => String(item.id) !== String(template.id) && item.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        showToast("Template name already exists", "error");
        return;
    }
    await saveTemplate({ ...template, name }, "Template renamed");
}

function renderTemplateExerciseOptions(template) {
    templateAddExerciseSelect.innerHTML = "";
    const inTemplate = new Set(getTemplateItems(template).map((item) => String(item.exerciseId)));
    const available = state.exercises.filter((exercise) => !inTemplate.has(String(exercise.id)));

    if (available.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No more exercises to add";
        templateAddExerciseSelect.appendChild(option);
        templateAddExerciseSelect.disabled = true;
        addTemplateExerciseBtn.disabled = true;
        return;
    }

    available.forEach((exercise) => {
        const option = document.createElement("option");
        option.value = exercise.id;
        option.textContent = exercise.name;
        templateAddExerciseSelect.appendChild(option);
    });
    templateAddExerciseSelect.disabled = false;
    addTemplateExerciseBtn.disabled = false;
}

async function addExerciseToTemplate() {
    const template = getSelectedTemplate();
    if (!template) return;
    const selectedId = templateAddExerciseSelect.value;
    if (!selectedId) return;
    const exercise = state.exercises.find((item) => String(item.id) === String(selectedId));
    if (!exercise) {
        showToast("Exercise not found", "error");
        return;
    }
    const currentItems = getTemplateItems(template);
    if (currentItems.some((item) => String(item.exerciseId) === String(exercise.id))) {
        showToast("Exercise already in template", "info");
        return;
    }
    const repsDefault = `${exercise.repFloor}-${exercise.repCeiling}`;
    await saveTemplate(
        applyTemplateItems(template, [
            ...currentItems,
            {
                exerciseId: exercise.id,
                sets: 3,
                reps: repsDefault,
                restSeconds: 90,
                supersetId: null,
                supersetOrder: 0,
            },
        ]),
        "Exercise added to template"
    );
}

async function removeExerciseFromTemplate(exerciseId) {
    const template = getSelectedTemplate();
    if (!template) return;
    state.selectedTemplateExerciseIds.delete(String(exerciseId));
    const nextItems = getTemplateItems(template).filter((item) => String(item.exerciseId) !== String(exerciseId));
    await saveTemplate(applyTemplateItems(template, nextItems), "Exercise removed from template");
}

async function reorderTemplateExercise(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const template = getSelectedTemplate();
    if (!template) return;
    const nextItems = [...getTemplateItems(template)];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved);
    await saveTemplate(applyTemplateItems(template, nextItems), "Template order updated");
}

async function updateTemplateItemConfig(index, patch) {
    const template = getSelectedTemplate();
    if (!template) return;
    const currentItems = getTemplateItems(template);
    const current = currentItems[index];
    if (!current) return;
    currentItems[index] = { ...current, ...patch };
    await saveTemplate(applyTemplateItems(template, currentItems), "Template updated", { silent: true });
}

async function createSupersetFromSelection() {
    const template = getSelectedTemplate();
    if (!template) return;
    if (!state.supersetDraftMode) {
        setSupersetDraftMode(true);
        showToast("Select exercises, then tap Save superset", "info");
        return;
    }
    const currentItems = getTemplateItems(template);
    const selected = currentItems.filter((item) => state.selectedTemplateExerciseIds.has(String(item.exerciseId)));
    if (selected.length < 2) {
        showToast("Select at least 2 exercises", "error");
        return;
    }

    const supersetId = `ss-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const targetSets = selected[0].sets;
    let supersetOrder = 1;
    const nextItems = currentItems.map((item) => {
        if (!state.selectedTemplateExerciseIds.has(String(item.exerciseId))) return item;
        return {
            ...item,
            sets: targetSets,
            supersetId,
            supersetOrder: supersetOrder++,
        };
    });

    clearTemplateSelection();
    await saveTemplate(applyTemplateItems(template, nextItems), "Superset created");
    setSupersetDraftMode(false);
}

async function clearSupersetFromSelection() {
    const template = getSelectedTemplate();
    if (!template) return;
    const currentItems = getTemplateItems(template);
    const hasSelection = currentItems.some((item) => state.selectedTemplateExerciseIds.has(String(item.exerciseId)));
    if (!hasSelection) {
        showToast("Select one or more exercises", "error");
        return;
    }

    const nextItems = currentItems.map((item) => {
        if (!state.selectedTemplateExerciseIds.has(String(item.exerciseId))) return item;
        return {
            ...item,
            supersetId: null,
            supersetOrder: 0,
        };
    });

    clearTemplateSelection();
    await saveTemplate(applyTemplateItems(template, nextItems), "Superset cleared");
    setSupersetDraftMode(false);
}

function renderTemplateEditor() {
    const template = getSelectedTemplate();
    if (!template) {
        templateEditorPanelEl.classList.add("hidden");
        templateEditorEmptyEl.classList.remove("hidden");
        templateExercisePickerEl.innerHTML = "";
        clearTemplateSelection();
        setSupersetDraftMode(false);
        return;
    }

    templateEditorEmptyEl.classList.add("hidden");
    templateEditorPanelEl.classList.remove("hidden");
    templateEditorNameInput.value = template.name;
    renderTemplateExerciseOptions(template);

    const templateItems = getTemplateItems(template);
    const supersetMetaByExercise = getSupersetMetaByExercise(templateItems);
    const templateExerciseIds = new Set(templateItems.map((item) => String(item.exerciseId)));
    state.selectedTemplateExerciseIds.forEach((exerciseId) => {
        if (!templateExerciseIds.has(exerciseId)) {
            state.selectedTemplateExerciseIds.delete(exerciseId);
        }
    });
    templateExercisePickerEl.innerHTML = "";
    if (templateItems.length === 0) {
        templateExercisePickerEl.innerHTML = `<div class="empty">No exercises yet. Add one above.</div>`;
        clearTemplateSelection();
        setSupersetDraftMode(false);
        return;
    }

    templateItems.forEach((templateItem, index) => {
        const exercise = state.exercises.find((item) => String(item.id) === String(templateItem.exerciseId));
        if (!exercise) return;
        const supersetMeta = supersetMetaByExercise.get(String(templateItem.exerciseId));
        const row = document.createElement("div");
        row.className = "picker-item draggable";
        row.draggable = true;
        row.dataset.index = String(index);
        row.classList.toggle("selected", state.selectedTemplateExerciseIds.has(String(templateItem.exerciseId)));
        row.innerHTML = `
            <span class="drag-handle">::</span>
            <input type="checkbox" data-action="select-item" ${state.selectedTemplateExerciseIds.has(String(templateItem.exerciseId)) ? "checked" : ""} aria-label="Select for superset">
            <div class="picker-title">
                <div>${escapeHtml(exercise.name)}</div>
                ${supersetMeta ? `<div class="template-superset-label">Superset ${supersetMeta.label} (A${supersetMeta.order})</div>` : ""}
                <div class="template-config-grid">
                    <label>
                        <span class="sub small">Sets</span>
                        <input type="number" min="1" value="${templateItem.sets}" data-field="sets">
                    </label>
                    <label>
                        <span class="sub small">Reps</span>
                        <input type="text" value="${templateItem.reps}" data-field="reps">
                    </label>
                    <label>
                        <span class="sub small">Rest (sec)</span>
                        <input type="number" min="0" step="5" value="${templateItem.restSeconds}" data-field="restSeconds">
                    </label>
                </div>
            </div>
            <button class="danger ghost small" data-action="remove">Remove</button>
        `;

        row.addEventListener("dragstart", (event) => {
            event.dataTransfer?.setData("text/plain", row.dataset.index || "0");
            row.classList.add("dragging");
        });
        row.addEventListener("dragend", () => {
            row.classList.remove("dragging");
            row.classList.remove("drag-over");
        });
        row.addEventListener("dragover", (event) => {
            event.preventDefault();
            row.classList.add("drag-over");
        });
        row.addEventListener("dragleave", () => {
            row.classList.remove("drag-over");
        });
        row.addEventListener("drop", async (event) => {
            event.preventDefault();
            row.classList.remove("drag-over");
            const fromIndex = Number(event.dataTransfer?.getData("text/plain"));
            const toIndex = Number(row.dataset.index);
            if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
            await reorderTemplateExercise(fromIndex, toIndex);
        });

        row.querySelector('[data-action="remove"]').addEventListener("click", async () => {
            await removeExerciseFromTemplate(templateItem.exerciseId);
        });
        row.querySelector('[data-action="select-item"]').addEventListener("change", (event) => {
            if (event.target.checked) {
                state.selectedTemplateExerciseIds.add(String(templateItem.exerciseId));
            } else {
                state.selectedTemplateExerciseIds.delete(String(templateItem.exerciseId));
            }
            row.classList.toggle("selected", event.target.checked);
            if (state.selectedTemplateExerciseIds.size > 0) {
                setSupersetDraftMode(true);
            }
        });

        row.querySelectorAll("input[data-field]").forEach((input) => {
            input.addEventListener("change", async () => {
                const field = input.dataset.field;
                if (!field) return;
                const value = field === "reps" ? input.value.trim() : Number.parseInt(input.value, 10);
                if (field === "reps" && !value) {
                    showToast("Reps cannot be empty", "error");
                    return;
                }
                await updateTemplateItemConfig(index, { [field]: value });
            });
        });

        templateExercisePickerEl.appendChild(row);
    });
}

function renderTemplatesList() {
    templatesListEl.innerHTML = "";
    if (state.templates.length === 0) {
        templatesListEl.innerHTML = `<div class="empty">No templates yet</div>`;
        return;
    }

    state.templates
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((template) => {
            const exerciseNames = getTemplateItems(template)
                .map((item) => state.exercises.find((exercise) => String(exercise.id) === String(item.exerciseId))?.name)
                .filter(Boolean);
            const safeExerciseNames = exerciseNames.map((name) => escapeHtml(name)).join(", ");

            const card = document.createElement("div");
            card.className = "list-card";
            card.innerHTML = `
                <div>
                    <p class="label">${escapeHtml(template.name)}</p>
                    <p class="sub">${safeExerciseNames || "No exercises"}</p>
                </div>
                <div class="list-actions">
                    <button class="ghost small" data-action="edit-template">${String(template.id) === String(state.selectedTemplateId) ? "Editing" : "Edit"}</button>
                    <button class="danger ghost small" data-action="delete-template">Delete</button>
                </div>
            `;

            card.querySelector('[data-action="edit-template"]').addEventListener("click", () => {
                state.selectedTemplateId = template.id;
                clearTemplateSelection();
                setSupersetDraftMode(false);
                renderTemplatesList();
                renderTemplateEditor();
            });

            card.querySelector('[data-action="delete-template"]').addEventListener("click", async () => {
                if (!confirm(`Delete template "${template.name}"?`)) return;
                await db.deleteTemplate(template.id);
                if (String(state.selectedTemplateId) === String(template.id)) {
                    state.selectedTemplateId = null;
                }
                clearTemplateSelection();
                setSupersetDraftMode(false);
                await refreshUI();
                showToast("Template deleted", "success");
            });

            templatesListEl.appendChild(card);
        });
}

// Workout logic
function getExercisesForTemplate(templateId) {
    if (!templateId) return state.exercises;
    const tmpl = state.templates.find((t) => String(t.id) === String(templateId));
    if (!tmpl) return state.exercises;
    return getTemplateItems(tmpl)
        .map((item) => state.exercises.find((exercise) => String(exercise.id) === String(item.exerciseId)))
        .filter(Boolean);
}

async function startWorkout() {
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    renderRestTimer();

    const templateId = templateSelect.value || null;
    const exercises = getExercisesForTemplate(templateId);
    if (exercises.length === 0) {
        showToast("Add exercises first", "error");
        return;
    }

    // If a draft exists, reuse it; otherwise create new
    if (!state.activeSession) {
        const nowIso = new Date().toISOString();
        const session = {
            id: uuid(),
            date: nowIso,
            startedAt: nowIso,
            finishedAt: null,
            isPaused: false,
            pausedAt: null,
            pausedAccumulatedSeconds: 0,
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

    if (!state.activeSession.startedAt) {
        state.activeSession = {
            ...state.activeSession,
            startedAt: state.activeSession.date || new Date().toISOString(),
            isPaused: false,
            pausedAt: null,
            pausedAccumulatedSeconds: Number.parseInt(state.activeSession.pausedAccumulatedSeconds, 10) || 0,
        };
        await db.updateSession(state.activeSession);
        state.sessions = state.sessions.map((item) => (String(item.id) === String(state.activeSession.id) ? state.activeSession : item));
    }

    state.activeExercises = exercises;
    workoutNotesEl.value = state.activeSession.notes || "";
    sessionTemplateLabel.textContent = templateId ? state.templates.find((t) => String(t.id) === String(templateId))?.name || "Workout" : "Workout";
    workoutSection.classList.remove("hidden");
    startWorkoutElapsedTimer();
    renderWorkoutExercises();
    setView("view-workout");
}

function maybeResumeDraft() {
    if (state.activeSession) return;
    const draft = state.sessions.find((s) => s.status === "draft");
    if (draft) {
        state.activeSession = draft;
        state.activeExercises = getExercisesForTemplate(draft.templateId);
        sessionTemplateLabel.textContent = draft.templateId ? state.templates.find((t) => String(t.id) === String(draft.templateId))?.name || "Workout" : "Workout";
        workoutNotesEl.value = draft.notes || "";
        workoutSection.classList.remove("hidden");
        startWorkoutElapsedTimer();
        renderWorkoutExercises();
    } else {
        stopWorkoutElapsedTimer();
    }
}

function renderWorkoutExercises() {
    workoutExercisesEl.innerHTML = "";
    const sessionId = state.activeSession?.id;
    const sessionSets = state.sets.filter((s) => s.sessionId === sessionId);
    const activeTemplate = state.activeSession?.templateId
        ? state.templates.find((template) => String(template.id) === String(state.activeSession.templateId))
        : null;
    const templateItems = getTemplateItems(activeTemplate);
    const itemByExerciseId = new Map(templateItems.map((item) => [String(item.exerciseId), item]));
    const supersetMetaByExerciseId = getSupersetMetaByExercise(templateItems);

    state.activeExercises.forEach((ex) => {
        const exSets = sessionSets.filter((s) => s.exerciseId === ex.id).sort((a, b) => a.setNumber - b.setNumber);
        const previousSetDisplays = getPreviousSetDisplays(ex.id);
        const card = document.createElement("div");
        card.className = "exercise-card";

        const templateItem = itemByExerciseId.get(String(ex.id));
        const supersetMeta = supersetMetaByExerciseId.get(String(ex.id));
        const planText = templateItem
            ? `${templateItem.sets} sets • ${templateItem.reps} reps • ${templateItem.restSeconds}s rest`
            : `${ex.repFloor}–${ex.repCeiling} reps • +${formatWeight(ex.weightIncrement)} lbs`;
        card.innerHTML = `
            <div class="exercise-header">
                <div>
                    <p class="label">${escapeHtml(ex.name)}</p>
                    <p class="sub">${escapeHtml(planText)}</p>
                </div>
                <div class="exercise-header-actions">
                    ${supersetMeta ? `<div class="superset-badge">Superset ${supersetMeta.label} (A${supersetMeta.order})</div>` : ""}
                    <button class="ghost small history-chip" type="button">History</button>
                </div>
            </div>
            <div class="sets-container" data-exercise-id="${ex.id}"></div>
            <button class="ghost add-set">+ Add set</button>
        `;

        card.querySelector(".history-chip").addEventListener("click", () => openExerciseModal(ex));

        const setsContainer = card.querySelector(".sets-container");
        setsContainer.dataset.previousSetDisplays = JSON.stringify(previousSetDisplays);
        const plannedSetCount = Math.max(1, Number.parseInt(templateItem?.sets, 10) || 1);
        const rowCount = Math.max(plannedSetCount, exSets.length || 0);
        for (let i = 0; i < rowCount; i += 1) {
            addSetRow(setsContainer, ex, exSets[i] || null, i + 1, previousSetDisplays[i] || "", supersetMeta);
        }

        card.querySelector(".add-set").addEventListener("click", () => {
            const nextSetNumber = setsContainer.querySelectorAll(".set-row").length + 1;
            const previousDisplay = previousSetDisplays[nextSetNumber - 1] || "";
            addSetRow(setsContainer, ex, null, nextSetNumber, previousDisplay, supersetMeta);
        });
        workoutExercisesEl.appendChild(card);
    });
}

function attachSwipeToDelete(row, content, onDelete) {
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let swipeArmed = false;
    const maxSwipe = 120;
    const deleteThreshold = 108;
    const intentThreshold = 14;

    const interactiveSelector = "input, button, select, textarea, label";
    const setOffset = (x) => {
        content.style.transform = `translateX(${x}px)`;
        row.classList.toggle("swiping", x < 0);
        row.classList.toggle("swipe-delete-ready", Math.abs(x) >= deleteThreshold);
    };

    const reset = () => {
        currentX = 0;
        setOffset(0);
    };

    row.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest(interactiveSelector)) return;
        dragging = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        currentX = 0;
        swipeArmed = false;
        row.setPointerCapture(pointerId);
    });

    row.addEventListener("pointermove", (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        const delta = event.clientX - startX;
        const deltaY = event.clientY - startY;
        const absX = Math.abs(delta);
        const absY = Math.abs(deltaY);

        if (!swipeArmed) {
            if (absX < intentThreshold && absY < intentThreshold) return;
            if (absY > absX) {
                dragging = false;
                if (row.hasPointerCapture(pointerId)) {
                    row.releasePointerCapture(pointerId);
                }
                reset();
                return;
            }
            swipeArmed = true;
        }

        if (delta >= 0) {
            currentX = 0;
            setOffset(0);
            return;
        }
        currentX = Math.max(-maxSwipe, delta);
        setOffset(currentX);
    });

    const endSwipe = async (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false;
        if (row.hasPointerCapture(pointerId)) {
            row.releasePointerCapture(pointerId);
        }
        const shouldDelete = event.type === "pointerup" && Math.abs(currentX) >= deleteThreshold;
        if (shouldDelete) {
            await onDelete();
            return;
        }
        reset();
    };

    row.addEventListener("pointerup", endSwipe);
    row.addEventListener("pointercancel", (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false;
        if (row.hasPointerCapture(pointerId)) {
            row.releasePointerCapture(pointerId);
        }
        reset();
    });
    row.addEventListener("lostpointercapture", () => {
        if (dragging) {
            dragging = false;
            reset();
        }
    });
}

async function deleteSetRow(row) {
    const container = row.parentElement;
    if (row.dataset.setId) {
        const existing = state.sets.find((item) => String(item.id) === row.dataset.setId);
        if (existing) {
            await db.deleteSet(existing.id);
            state.sets = state.sets.filter((item) => String(item.id) !== row.dataset.setId);
        }
    }
    row.remove();
    if (container) {
        renumberSetRows(container);
    }
}

function getPreviousSetDisplays(exerciseId) {
    const completedSessions = state.sessions
        .filter((session) => session.status !== "draft")
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const session of completedSessions) {
        const sets = state.sets
            .filter((set) => String(set.sessionId) === String(session.id) && String(set.exerciseId) === String(exerciseId))
            .slice()
            .sort((a, b) => a.setNumber - b.setNumber);
        if (!sets.length) continue;
        return sets.map((set) => `${formatWeight(set.weight)}x${set.reps}`);
    }
    return [];
}

function renumberSetRows(container) {
    let previousSetDisplays = [];
    try {
        previousSetDisplays = JSON.parse(container.dataset.previousSetDisplays || "[]");
        if (!Array.isArray(previousSetDisplays)) {
            previousSetDisplays = [];
        }
    } catch {
        previousSetDisplays = [];
    }

    container.querySelectorAll(".set-row").forEach((row, index) => {
        const setNumber = index + 1;
        const setIndexEl = row.querySelector(".set-index");
        if (setIndexEl) {
            setIndexEl.textContent = String(setNumber);
        }
        const previousEl = row.querySelector(".previous-set");
        if (previousEl) {
            previousEl.textContent = previousSetDisplays[index] || "-";
        }
    });
}

function isSupersetRoundComplete(supersetMeta, setNumber) {
    if (!state.activeSession || !supersetMeta?.memberExerciseIds?.length) return false;
    return supersetMeta.memberExerciseIds.every((exerciseId) => state.sets.some((set) => (
        String(set.sessionId) === String(state.activeSession.id)
        && String(set.exerciseId) === String(exerciseId)
        && Number(set.setNumber) === Number(setNumber)
        && Boolean(set.isComplete)
    )));
}

function addSetRow(container, exercise, existingSet, setNumber = 1, previousDisplay = "", supersetMeta = null) {
    const row = document.createElement("div");
    row.className = "set-row";
    if (existingSet) {
        row.dataset.setId = existingSet.id;
    }
    row.innerHTML = `
        <div class="set-delete-bg">Delete</div>
        <div class="set-row-content">
            <span class="set-index">${setNumber}</span>
            <span class="previous-set">${previousDisplay || "-"}</span>
            <input type="number" placeholder="lbs" aria-label="Weight" inputmode="decimal" step="0.5" value="${formatWeightInput(existingSet?.weight)}">
            <span class="x">×</span>
            <input type="number" placeholder="Reps" aria-label="Reps" inputmode="numeric" min="1" value="${existingSet ? existingSet.reps : ""}">
            <button class="ghost small mark-set ${existingSet?.isComplete ? "done" : ""}" aria-label="Mark set complete">✓</button>
        </div>
    `;
    row.classList.toggle("set-complete", Boolean(existingSet?.isComplete));
    attachSwipeToDelete(row, row.querySelector(".set-row-content"), async () => deleteSetRow(row));

    const [weightInput, repsInput] = row.querySelectorAll("input");
    const save = () => saveSetRow(container, exercise, row, weightInput, repsInput);
    weightInput.addEventListener("input", save);
    repsInput.addEventListener("input", save);

    row.querySelector(".mark-set").addEventListener("click", async () => {
        let setRecord = null;
        if (row.dataset.setId) {
            setRecord = state.sets.find((item) => String(item.id) === row.dataset.setId) || null;
        }
        if (!setRecord) {
            const saved = await saveSetRow(container, exercise, row, weightInput, repsInput);
            if (!saved) {
                showToast("Enter weight and reps before marking done", "error");
                return;
            }
            setRecord = saved;
        }

        const nextComplete = !setRecord.isComplete;
        const updated = {
            ...setRecord,
            isComplete: nextComplete,
            completedAt: nextComplete ? new Date().toISOString() : null,
        };
        await db.updateSet(updated);
        state.sets = state.sets.map((item) => (String(item.id) === String(updated.id) ? updated : item));
        row.classList.toggle("set-complete", nextComplete);
        row.querySelector(".mark-set").classList.toggle("done", nextComplete);
        if (nextComplete) {
            if (supersetMeta?.memberExerciseIds?.length > 1) {
                if (isSupersetRoundComplete(supersetMeta, updated.setNumber)) {
                    startRestTimer(supersetMeta.restSeconds);
                    showToast(`Superset ${supersetMeta.label} round ${updated.setNumber} complete`, "success");
                }
            } else {
                startRestTimer(getTemplateRestSecondsForExercise(exercise.id));
            }
        }
    });

    container.appendChild(row);
}

async function saveSetRow(container, exercise, row, weightInput, repsInput) {
    if (!state.activeSession) return;
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (!weight || !reps) return null;

    const setNumber = Array.from(container.querySelectorAll(".set-row")).indexOf(row) + 1;
    const existing = row.dataset.setId ? state.sets.find((item) => String(item.id) === row.dataset.setId) : null;
    const payload = {
        ...(existing || {}),
        id: existing ? existing.id : uuid(),
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
    return payload;
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

    const updated = {
        ...state.activeSession,
        startedAt: state.activeSession.startedAt || state.activeSession.date || new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        isPaused: false,
        pausedAt: null,
        pausedAccumulatedSeconds: (() => {
            const pausedSoFar = Number.parseInt(state.activeSession.pausedAccumulatedSeconds, 10) || 0;
            if (!state.activeSession.isPaused || !state.activeSession.pausedAt) return pausedSoFar;
            const pausedAtMs = new Date(state.activeSession.pausedAt).getTime();
            const finishedMs = new Date().getTime();
            const extra = Number.isFinite(pausedAtMs) ? Math.max(0, Math.floor((finishedMs - pausedAtMs) / 1000)) : 0;
            return pausedSoFar + extra;
        })(),
        notes: workoutNotesEl.value,
        status: "complete",
    };
    await db.updateSession(updated);
    state.sessions = state.sessions.map((s) => (s.id === updated.id ? updated : s));
    state.activeSession = null;
    state.activeExercises = [];
    stopWorkoutElapsedTimer();
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    renderRestTimer();
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
    stopWorkoutElapsedTimer();
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    renderRestTimer();
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
            .map((name) => escapeHtml(name))
            .join(", ");
        const duration = formatDuration(getSessionDurationSeconds(session));
        card.innerHTML = `
            <div>
                <p class="label">${formatDate(session.date)}</p>
                <p class="sub">${escapeHtml(session.templateId ? state.templates.find((t) => String(t.id) === String(session.templateId))?.name || "Workout" : "Workout")}</p>
                <p class="sub small">Duration: ${duration}</p>
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
                <p class="label">${escapeHtml(ex.name)}</p>
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
    return "No history yet";
}

function openSessionModal(session) {
    const sets = state.sets.filter((s) => s.sessionId === session.id);
    modalTitle.textContent = `Session — ${formatDate(session.date)}`;
    modalHistoryList.innerHTML = "";
    const summary = document.createElement("div");
    summary.className = "history-block";
    summary.innerHTML = `
        <p class="sub small">Start: ${escapeHtml(formatDateTime(getSessionStartIso(session)))}</p>
        <p class="sub small">Finish: ${escapeHtml(formatDateTime(session.finishedAt))}</p>
        <p class="sub small">Duration: ${escapeHtml(formatDuration(getSessionDurationSeconds(session)))}</p>
    `;
    modalHistoryList.appendChild(summary);
    if (sets.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No sets logged";
        modalHistoryList.appendChild(empty);
    } else {
        const grouped = groupSetsByExercise(sets);
        Object.keys(grouped).forEach((exerciseId) => {
            const ex = state.exercises.find((e) => e.id === Number(exerciseId));
            const exSets = grouped[exerciseId];
            const block = document.createElement("div");
            block.className = "history-block";
            block.innerHTML = `
                <p class="label">${escapeHtml(ex ? ex.name : "Exercise")}</p>
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
    stopWorkoutElapsedTimer();
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    renderRestTimer();
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
    pauseWorkoutBtn.addEventListener("click", pauseOrResumeWorkout);
    finishWorkoutBtn.addEventListener("click", finishWorkout);
    cancelWorkoutBtn.addEventListener("click", cancelWorkout);
    addExerciseBtn.addEventListener("click", addExercise);
    loadDefaultLibraryBtn.addEventListener("click", loadDefaultLibrary);
    clearExercisesBtn.addEventListener("click", clearExercises);
    createTemplateBtn.addEventListener("click", createTemplate);
    resetTemplatesBtn.addEventListener("click", resetTemplatesToDefaultSplit);
    saveTemplateNameBtn.addEventListener("click", saveTemplateName);
    addTemplateExerciseBtn.addEventListener("click", addExerciseToTemplate);
    makeSupersetBtn.addEventListener("click", createSupersetFromSelection);
    clearSupersetBtn.addEventListener("click", clearSupersetFromSelection);
    restLessBtn.addEventListener("click", () => adjustRestTimer(-10));
    restMoreBtn.addEventListener("click", () => adjustRestTimer(10));
    restStopBtn.addEventListener("click", stopRestTimer);
    refreshHistoryBtn.addEventListener("click", renderHistory);
    exportBtn.addEventListener("click", exportData);
    importBtn.addEventListener("click", triggerImport);
    importInput.addEventListener("change", handleImport);
    clearDataBtn.addEventListener("click", clearData);
    signInGoogleBtn.addEventListener("click", signInWithGoogle);
    sendMagicLinkBtn.addEventListener("click", sendMagicLink);
    gateSignInGoogleBtn.addEventListener("click", signInWithGoogle);
    gateSendMagicLinkBtn.addEventListener("click", sendMagicLink);
    signOutBtn.addEventListener("click", signOut);
    syncNowBtn.addEventListener("click", syncNow);
}

async function init() {
    bindEvents();
    registerServiceWorker();
    renderWorkoutElapsed();
    renderRestTimer();
    db.onAuthStateChange(async (auth) => {
        renderAuthState(auth);
        if (auth?.user && !auth.loading) {
            await refreshUI();
        }
    });
    try {
        await db.initAuth();
    } catch (err) {
        console.error(err);
        showToast(err?.message || "Auth init failed", "error");
    }
    try {
        await db.installDefaultLibrary({ onlyIfEmpty: true });
    } catch (err) {
        console.error(err);
    }
    await refreshUI();
    // Default to workout view
    setView("view-workout");
}

init();
