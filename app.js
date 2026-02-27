import * as db from "./db.js";

const views = document.querySelectorAll(".view");
const tabButtons = document.querySelectorAll(".tab-bar button");
const toastEl = document.getElementById("toast");
const appEl = document.getElementById("app");
const authGateEl = document.getElementById("auth-gate");
const authGateStatusEl = document.getElementById("auth-gate-status");
const gateSignInGoogleBtn = document.getElementById("gate-sign-in-google");
const gateAuthEmailInput = document.getElementById("gate-auth-email");
const gateSendMagicLinkBtn = document.getElementById("gate-send-magic-link");

// Workout view refs
const workoutLauncherEl = document.getElementById("workout-launcher");
const startEmptyWorkoutBtn = document.getElementById("start-empty-workout");
const workoutTemplatesBrowserEl = document.getElementById("workout-templates-browser");
const workoutElapsedEl = document.getElementById("workout-elapsed");
const workoutSection = document.getElementById("workout-session");
const sessionExercisePickerEl = document.getElementById("session-exercise-picker");
const sessionAddExerciseSelect = document.getElementById("session-add-exercise");
const sessionAddExerciseBtn = document.getElementById("session-add-exercise-btn");
const workoutExercisesEl = document.getElementById("workout-exercises");
const workoutNotesEl = document.getElementById("workout-notes");
const finishWorkoutBtn = document.getElementById("finish-workout");
const pauseWorkoutBtn = document.getElementById("pause-workout");
const cancelWorkoutBtn = document.getElementById("cancel-workout");
const sessionTemplateLabel = document.getElementById("session-template-label");

// Floating widget refs
const workoutFloatingWidget = document.getElementById("workout-floating-widget");
const widgetExerciseEl = document.getElementById("widget-exercise");
const widgetSetEl = document.getElementById("widget-set");
const widgetRestControls = document.getElementById("widget-rest-controls");
const widgetRestDisplay = document.getElementById("widget-rest-display");
const widgetRestLessBtn = document.getElementById("widget-rest-less");
const widgetRestMoreBtn = document.getElementById("widget-rest-more");
const widgetRestEndBtn = document.getElementById("widget-rest-end");
const expandWorkoutBtn = document.getElementById("expand-workout-btn");

// Select exercise modal refs
const selectExerciseModal = document.getElementById("select-exercise-modal");
const selectExerciseSearchInput = document.getElementById("select-exercise-search");
const selectExerciseList = document.getElementById("select-exercise-list");
const selectExerciseCancelTopBtn = document.getElementById("select-exercise-cancel-top");

// Create exercise modal refs
const createExerciseModal = document.getElementById("create-exercise-modal");
const createExerciseNameInput = document.getElementById("create-exercise-name");
const createExerciseRepFloorInput = document.getElementById("create-exercise-rep-floor");
const createExerciseRepCeilingInput = document.getElementById("create-exercise-rep-ceiling");
const createExerciseRestSecondsInput = document.getElementById("create-exercise-rest-seconds");
const createExerciseSubmitBtn = document.getElementById("create-exercise-submit");
const createExerciseCancelBtn = document.getElementById("create-exercise-cancel");
const createExerciseCancelTopBtn = document.getElementById("create-exercise-cancel-top");

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
const templateFolderInput = document.getElementById("template-folder");
const createTemplateBtn = document.getElementById("create-template");
const createFolderBtn = document.getElementById("create-folder-btn");
const templatesListEl = document.getElementById("templates-list");
const templateEditorEmptyEl = document.getElementById("template-editor-empty");
const templateEditorPanelEl = document.getElementById("template-editor-panel");
const templateEditorNameInput = document.getElementById("template-editor-name");
const templateEditorFolderInput = document.getElementById("template-editor-folder");
const saveTemplateNameBtn = document.getElementById("save-template-name");
const templateAddExerciseSelect = document.getElementById("template-add-exercise");
const addTemplateExerciseBtn = document.getElementById("add-template-exercise");
const templateCancelChangesBtn = document.getElementById("template-cancel-changes");
const templateSaveChangesBtn = document.getElementById("template-save-changes");
const makeSupersetBtn = document.getElementById("make-superset");
const clearSupersetBtn = document.getElementById("clear-superset");
const templateExercisePickerEl = document.getElementById("template-exercise-picker");
const CREATE_NEW_FOLDER_OPTION = "__create_new_folder__";

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

const manageFoldersModal = document.getElementById("manage-folders-modal");
const manageFoldersBtn = document.getElementById("manage-folders-btn");
const closeFoldersModalBtn = document.getElementById("close-folders-modal");
const foldersListEl = document.getElementById("folders-list");
const deleteFolderModal = document.getElementById("delete-folder-modal");
const deleteFolderMessageEl = document.getElementById("delete-folder-message");
const closeDeleteFolderModalBtn = document.getElementById("close-delete-folder-modal");
const deleteFolderMoveBtn = document.getElementById("delete-folder-move-btn");
const deleteFolderDeleteAllBtn = document.getElementById("delete-folder-delete-all-btn");
const confirmModal = document.getElementById("confirm-modal");
const confirmModalTitleEl = document.getElementById("confirm-modal-title");
const confirmModalMessageEl = document.getElementById("confirm-modal-message");
const confirmModalCancelTopBtn = document.getElementById("confirm-modal-cancel-top");
const confirmModalCancelBtn = document.getElementById("confirm-modal-cancel");
const confirmModalConfirmBtn = document.getElementById("confirm-modal-confirm");

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
const syncStatusEl = document.getElementById("sync-status");
const themeModeSelect = document.getElementById("theme-mode");
const THEME_MODE_KEY = "overload-theme-mode";

const state = {
    exercises: [],
    templates: [],
    folders: [],
    sessions: [],
    sets: [],
    activeSession: null,
    activeExercises: [],
    selectedTemplateId: null,
    templateEditorDraft: null,
    templateEditorDirty: false,
    selectedTemplateExerciseIds: new Set(),
    supersetDraftMode: false,
    expandedFolders: new Set(),
    pendingDeleteFolder: null,
    hasInitializedFolderExpansion: false,
    workoutTimer: {
        intervalId: null,
    },
    sync: {
        status: "idle",
        error: "",
        lastSyncedAt: "",
    },
    hasShownSyncFailureToast: false,
    restTimer: {
        remainingSeconds: 0,
        running: false,
        intervalId: null,
        lastDurationSeconds: 90,
        startTimeMs: null,
        targetEndTimeMs: null,
    },
};

// Utilities
function showToast(message, type = "info") {
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    toastEl.classList.remove("hidden");
    setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function formatClockTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

let confirmResolver = null;
function bindConfirmModal() {
    if (!confirmModal) return;
    const onCancel = () => confirmModal.close();
    const onConfirm = () => {
        confirmModal.dataset.confirmed = "1";
        confirmModal.close();
    };
    confirmModalCancelTopBtn?.addEventListener("click", onCancel);
    confirmModalCancelBtn?.addEventListener("click", onCancel);
    confirmModalConfirmBtn?.addEventListener("click", onConfirm);
    confirmModal.addEventListener("close", () => {
        const confirmed = confirmModal.dataset.confirmed === "1";
        confirmModal.dataset.confirmed = "";
        if (confirmResolver) {
            confirmResolver(confirmed);
            confirmResolver = null;
        }
    });
}

async function confirmAction({ title = "Confirm action", message = "Are you sure?", confirmLabel = "Confirm", danger = false } = {}) {
    if (!confirmModal || !confirmModalTitleEl || !confirmModalMessageEl || !confirmModalConfirmBtn) {
        return window.confirm(message);
    }
    if (confirmModal.open) confirmModal.close();
    confirmModal.dataset.confirmed = "";
    confirmModalTitleEl.textContent = title;
    confirmModalMessageEl.textContent = message;
    confirmModalConfirmBtn.textContent = confirmLabel;
    confirmModalConfirmBtn.classList.toggle("danger", Boolean(danger));
    confirmModal.showModal();
    return new Promise((resolve) => {
        confirmResolver = resolve;
    });
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatWeight(value) {
    return Number(value).toFixed(1).replace(/\.0$/, "");
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

function applyThemeMode(mode) {
    const nextMode = mode === "light" ? "light" : "dark";
    document.body.dataset.theme = nextMode;
    localStorage.setItem(THEME_MODE_KEY, nextMode);
    if (themeModeSelect) {
        themeModeSelect.value = nextMode;
    }
}

function initThemeMode() {
    const savedMode = localStorage.getItem(THEME_MODE_KEY) || "dark";
    applyThemeMode(savedMode);
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
        renderSyncState(state.sync);
        return;
    }
    if (auth.loading) {
        authStatusEl.textContent = "Loading account...";
        signInGoogleBtn.classList.remove("hidden");
        sendMagicLinkBtn.classList.remove("hidden");
        authEmailInput.closest(".field")?.classList.remove("hidden");
        signOutBtn.disabled = true;
        renderSyncState(state.sync);
        return;
    }
    if (!auth.user) {
        authStatusEl.textContent = "Not signed in";
        signInGoogleBtn.classList.remove("hidden");
        sendMagicLinkBtn.classList.remove("hidden");
        authEmailInput.closest(".field")?.classList.remove("hidden");
        signOutBtn.disabled = true;
        renderSyncState(state.sync);
        return;
    }
    authStatusEl.textContent = auth.user.email || auth.user.id;
    signInGoogleBtn.classList.add("hidden");
    sendMagicLinkBtn.classList.add("hidden");
    authEmailInput.closest(".field")?.classList.add("hidden");
    signOutBtn.disabled = false;
    renderSyncState(state.sync);
}

function renderSyncState(syncState) {
    if (!syncNowBtn || !syncStatusEl) return;
    const auth = db.getAuthState();
    if (!auth?.configured) {
        syncStatusEl.textContent = "Sign-in unavailable.";
        syncNowBtn.textContent = "Sync now";
        syncNowBtn.disabled = true;
        return;
    }
    if (auth.loading) {
        syncStatusEl.textContent = "Checking account...";
        syncNowBtn.textContent = "Sync now";
        syncNowBtn.disabled = true;
        return;
    }
    if (!auth?.user) {
        syncStatusEl.textContent = "Sign in to sync.";
        syncNowBtn.textContent = "Sync now";
        syncNowBtn.disabled = true;
        return;
    }

    const sync = syncState || state.sync;
    if (sync.status === "syncing") {
        syncStatusEl.textContent = "Syncing...";
        syncNowBtn.textContent = "Syncing...";
        syncNowBtn.disabled = true;
        return;
    }
    if (sync.status === "failed") {
        syncStatusEl.textContent = sync.error || "Sync failed.";
        syncNowBtn.textContent = "Retry sync";
        syncNowBtn.disabled = false;
        return;
    }

    if (sync.lastSyncedAt) {
        syncStatusEl.textContent = `Last synced ${formatClockTime(sync.lastSyncedAt)}`;
    } else {
        syncStatusEl.textContent = "Ready to sync.";
    }
    syncNowBtn.textContent = "Sync now";
    syncNowBtn.disabled = false;
}

function handleSyncStateChange(nextSyncState) {
    const prevStatus = state.sync.status;
    state.sync = {
        status: String(nextSyncState?.status || "idle"),
        error: String(nextSyncState?.error || ""),
        lastSyncedAt: String(nextSyncState?.lastSyncedAt || ""),
    };
    renderSyncState(state.sync);
    if (state.sync.status === "failed") {
        if (!state.hasShownSyncFailureToast || prevStatus !== "failed") {
            state.hasShownSyncFailureToast = true;
            showToast(state.sync.error || "Cloud sync failed", "error");
        }
    } else {
        state.hasShownSyncFailureToast = false;
    }
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
        await db.forceSyncToCloud();
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

function celebrateWithConfetti() {
    const confettiEmojis = ["🎉", "🎊", "⭐", "✨", "🌟"];
    const count = 40;
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti";
        confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
        confetti.style.left = Math.random() * 100 + "%";
        confetti.style.delay = Math.random() * 0.2 + "s";
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 1600);
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
        workoutElapsedEl.textContent = "Workout time: 0:00";
        renderWorkoutControls();
        return;
    }
    const duration = formatDuration(getSessionDurationSeconds(state.activeSession));
    workoutElapsedEl.textContent = `Workout time: ${duration}`;
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
    // Calculate remaining time from wall-clock time if running
    if (state.restTimer.running && state.restTimer.targetEndTimeMs) {
        const nowMs = Date.now();
        state.restTimer.remainingSeconds = Math.max(0, Math.ceil((state.restTimer.targetEndTimeMs - nowMs) / 1000));
        if (state.restTimer.remainingSeconds <= 0) {
            stopRestTimer();
            notifyRestComplete();
            return;
        }
    }
    
    updateWorkoutFloatingWidget();
}

function stopRestTimer() {
    if (state.restTimer.intervalId) {
        clearInterval(state.restTimer.intervalId);
    }
    state.restTimer.intervalId = null;
    state.restTimer.running = false;
    state.restTimer.startTimeMs = null;
    state.restTimer.targetEndTimeMs = null;
    renderRestTimer();
}

function stopAndResetRestTimer() {
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    state.restTimer.startTimeMs = null;
    state.restTimer.targetEndTimeMs = null;
    renderRestTimer();
}

function startRestTimer(seconds) {
    stopRestTimer();
    const totalSeconds = Math.max(0, Number.parseInt(seconds, 10) || 0);
    if (totalSeconds <= 0) {
        state.restTimer.remainingSeconds = 0;
        renderRestTimer();
        return;
    }
    
    const nowMs = Date.now();
    state.restTimer.startTimeMs = nowMs;
    state.restTimer.targetEndTimeMs = nowMs + (totalSeconds * 1000);
    state.restTimer.remainingSeconds = totalSeconds;
    state.restTimer.lastDurationSeconds = totalSeconds;
    state.restTimer.running = true;
    renderRestTimer();
    
    // Update display every 100ms to catch quick changes and ensure accuracy
    state.restTimer.intervalId = setInterval(() => {
        renderRestTimer();
    }, 100);
}

function adjustRestTimer(deltaSeconds) {
    if (!state.restTimer.running || !state.restTimer.targetEndTimeMs) return;
    state.restTimer.targetEndTimeMs += deltaSeconds * 1000;
    const nowMs = Date.now();
    if (state.restTimer.targetEndTimeMs <= nowMs) {
        state.restTimer.targetEndTimeMs = nowMs;
        stopRestTimer();
        notifyRestComplete();
        return;
    }
    renderRestTimer();
}

function updateWorkoutFloatingWidget() {
    if (!state.activeSession || !state.activeExercises.length) {
        workoutFloatingWidget.classList.add("hidden");
        return;
    }

    workoutFloatingWidget.classList.remove("hidden");

    const activeTemplate = state.activeSession?.templateId
        ? state.templates.find((template) => String(template.id) === String(state.activeSession.templateId))
        : null;
    const templateItemByExerciseId = new Map(
        getTemplateItems(activeTemplate).map((item) => [String(item.exerciseId), item])
    );
    const sessionId = state.activeSession.id;
    const sessionSets = state.sets.filter((set) => String(set.sessionId) === String(sessionId));

    const getProgress = (exercise) => {
        const exerciseId = String(exercise.id);
        const card = workoutExercisesEl.querySelector(`.exercise-card[data-exercise-id="${exerciseId}"]`);
        if (card) {
            const rows = Array.from(card.querySelectorAll(".set-row"));
            const totalSets = rows.length;
            const nextIncompleteIndex = rows.findIndex((row) => !row.classList.contains("set-complete"));
            const completeSets = rows.reduce((count, row) => count + (row.classList.contains("set-complete") ? 1 : 0), 0);
            return { totalSets, nextIncompleteIndex, completeSets };
        }

        const setsForExercise = sessionSets
            .filter((set) => String(set.exerciseId) === exerciseId)
            .slice()
            .sort((a, b) => a.setNumber - b.setNumber);
        const plannedSets = Math.max(1, Number.parseInt(templateItemByExerciseId.get(exerciseId)?.sets, 10) || setsForExercise.length || 1);
        const completeSets = setsForExercise.filter((set) => Boolean(set.isComplete)).length;
        const nextIncompleteIndex = completeSets < plannedSets ? completeSets : -1;
        return { totalSets: plannedSets, nextIncompleteIndex, completeSets };
    };

    let currentExercise = null;
    let currentProgress = null;
    for (const exercise of state.activeExercises) {
        const progress = getProgress(exercise);
        if (progress.nextIncompleteIndex !== -1) {
            currentExercise = exercise;
            currentProgress = progress;
            break;
        }
    }
    if (!currentExercise) {
        currentExercise = state.activeExercises[state.activeExercises.length - 1];
        currentProgress = getProgress(currentExercise);
    }
    if (!currentExercise || !currentProgress) return;

    const nextSetNumber = currentProgress.nextIncompleteIndex !== -1
        ? currentProgress.nextIncompleteIndex + 1
        : currentProgress.totalSets + 1;

    widgetExerciseEl.textContent = currentExercise.name;
    widgetSetEl.textContent = `Set ${nextSetNumber}`;

    if (state.restTimer.running) {
        widgetRestControls.classList.remove("hidden");
        widgetRestDisplay.textContent = formatTimer(state.restTimer.remainingSeconds);
    } else {
        widgetRestControls.classList.add("hidden");
    }

    if (expandWorkoutBtn) {
        const onWorkoutView = Boolean(document.querySelector("#view-workout.active"));
        expandWorkoutBtn.classList.toggle("hidden", onWorkoutView);
    }
}

function toggleRestTimer() {
    if (state.restTimer.running) {
        stopAndResetRestTimer();
        return;
    }
    const seconds = Math.max(5, Number.parseInt(state.restTimer.lastDurationSeconds, 10) || 90);
    startRestTimer(seconds);
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
    updateWorkoutFloatingWidget();
    if (viewId === "view-templates") {
        state.expandedFolders.clear();
        renderTemplatesList();
    }
}

// Data loading
async function refreshData() {
    state.exercises = (await db.getExercises()).sort((a, b) => a.name.localeCompare(b.name));
    state.templates = await db.getTemplates();
    state.folders = await db.getFolders();
    state.sessions = await db.getSessions({ includeDraft: true });
    state.sets = await db.getAllSets();
}

async function refreshUI() {
    await refreshData();
    renderFolderSuggestions();
    renderWorkoutLauncher();
    renderExercises();
    renderTemplatesList();
    renderTemplateEditor();
    renderHistory();
    maybeResumeDraft();
}

function getTemplateFolderName(template) {
    return String(template?.folder || "").trim();
}

function getFolderNames() {
    const namesByLower = new Map();
    const collect = (name) => {
        const trimmed = String(name || "").trim();
        if (!trimmed) return;
        const lower = trimmed.toLowerCase();
        if (!namesByLower.has(lower)) {
            namesByLower.set(lower, trimmed);
        }
    };
    state.folders.forEach((folder) => collect(folder?.name));
    state.templates.forEach((template) => collect(getTemplateFolderName(template)));
    return Array.from(namesByLower.values()).sort((a, b) => a.localeCompare(b));
}

function renderFolderSuggestions() {
    const folderNames = getFolderNames();

    if (templateFolderInput && templateFolderInput.tagName === "SELECT") {
        const current = String(templateFolderInput.value || "").trim();
        templateFolderInput.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Folder (optional)";
        templateFolderInput.appendChild(placeholder);

        folderNames.forEach((folderName) => {
            const option = document.createElement("option");
            option.value = folderName;
            option.textContent = folderName;
            templateFolderInput.appendChild(option);
        });

        const createOption = document.createElement("option");
        createOption.value = CREATE_NEW_FOLDER_OPTION;
        createOption.textContent = "+ Create new folder...";
        templateFolderInput.appendChild(createOption);

        if (current && current !== CREATE_NEW_FOLDER_OPTION) {
            const hasCurrent = folderNames.some((name) => name.toLowerCase() === current.toLowerCase());
            if (!hasCurrent) {
                const custom = document.createElement("option");
                custom.value = current;
                custom.textContent = current;
                templateFolderInput.appendChild(custom);
            }
            templateFolderInput.value = current;
        } else {
            templateFolderInput.value = "";
        }
    }
}

async function handleCreateTemplateFolderSelectChange() {
    if (!templateFolderInput || templateFolderInput.tagName !== "SELECT") return;
    if (templateFolderInput.value !== CREATE_NEW_FOLDER_OPTION) return;

    const raw = prompt("Folder name:");
    const name = raw == null ? "" : String(raw).trim();
    if (!name) {
        templateFolderInput.value = "";
        return;
    }
    if (name.toLowerCase() === "unfiled" || name.toLowerCase() === "unorganized") {
        showToast("Use a different folder name", "error");
        templateFolderInput.value = "";
        return;
    }

    const exists = getFolderNames().some((folderName) => folderName.toLowerCase() === name.toLowerCase());
    if (!exists) {
        await db.addFolder({ id: uuid(), name });
        state.folders = await db.getFolders();
    }
    renderFolderSuggestions();
    templateFolderInput.value = name;
}

function renderTemplateEditorFolderOptions(selectedFolder = "") {
    if (!templateEditorFolderInput) return;
    const current = String(selectedFolder || "").trim();
    const folderNames = getFolderNames();
    templateEditorFolderInput.innerHTML = "";

    const unorganizedOption = document.createElement("option");
    unorganizedOption.value = "";
    unorganizedOption.textContent = "Unorganized";
    templateEditorFolderInput.appendChild(unorganizedOption);

    folderNames.forEach((folderName) => {
        const option = document.createElement("option");
        option.value = folderName;
        option.textContent = folderName;
        templateEditorFolderInput.appendChild(option);
    });

    if (current && !folderNames.some((name) => name.toLowerCase() === current.toLowerCase())) {
        const custom = document.createElement("option");
        custom.value = current;
        custom.textContent = current;
        templateEditorFolderInput.appendChild(custom);
    }

    const createOption = document.createElement("option");
    createOption.value = CREATE_NEW_FOLDER_OPTION;
    createOption.textContent = "+ Create new folder...";
    templateEditorFolderInput.appendChild(createOption);

    templateEditorFolderInput.value = current;
}

function getTemplatesGroupedByFolder({ includeEmpty = false } = {}) {
    const groups = new Map();
    if (includeEmpty) {
        groups.set("__unfiled__", { label: "Unfiled", templates: [] });
        getFolderNames().forEach((folderName) => {
            const key = folderName || "__unfiled__";
            if (!groups.has(key)) {
                groups.set(key, { label: folderName || "Unfiled", templates: [] });
            }
        });
    }
    state.templates.forEach((template) => {
        const folder = getTemplateFolderName(template);
        const key = folder || "__unfiled__";
        if (!groups.has(key)) {
            groups.set(key, { label: folder || "Unfiled", templates: [] });
        }
        groups.get(key).templates.push(template);
    });

    const grouped = Array.from(groups.values());
    grouped.forEach((group) => group.templates.sort((a, b) => a.name.localeCompare(b.name)));
    grouped.sort((a, b) => {
        if (a.label === "Unfiled") return -1;
        if (b.label === "Unfiled") return 1;
        return a.label.localeCompare(b.label);
    });
    return grouped;
}

function getExercisesForSession(session) {
    if (!session) return [];
    if (Array.isArray(session.exerciseIds) && session.exerciseIds.length > 0) {
        return session.exerciseIds
            .map((exerciseId) => state.exercises.find((exercise) => String(exercise.id) === String(exerciseId)))
            .filter(Boolean);
    }
    return getExercisesForTemplate(session.templateId);
}

function renderWorkoutLauncher() {
    workoutTemplatesBrowserEl.innerHTML = "";
    if (state.templates.length === 0) {
        workoutTemplatesBrowserEl.innerHTML = `<div class="empty">No templates yet. Create one in Templates.</div>`;
        return;
    }

    getTemplatesGroupedByFolder().forEach((group) => {
        if (group.templates.length === 0) return;
        const section = document.createElement("div");
        section.className = "launcher-folder";
        section.innerHTML = `<p class="label">${escapeHtml(group.label)} (${group.templates.length})</p><div class="launcher-template-grid"></div>`;
        const grid = section.querySelector(".launcher-template-grid");
        group.templates.forEach((template) => {
            const exerciseNames = getTemplateItems(template)
                .map((item) => state.exercises.find((exercise) => String(exercise.id) === String(item.exerciseId))?.name)
                .filter(Boolean);
            const subtitle = exerciseNames.slice(0, 3).join(", ") || "No exercises yet";
            const card = document.createElement("button");
            card.type = "button";
            card.className = "launcher-template-card";
            card.innerHTML = `
                <p class="label">${escapeHtml(template.name)}</p>
                <p class="sub">${escapeHtml(subtitle)}</p>
            `;
            card.addEventListener("click", async () => startWorkout(template.id));
            grid.appendChild(card);
        });
        workoutTemplatesBrowserEl.appendChild(section);
    });
}

function getTemplateRestSecondsForExercise(exerciseId) {
    // Try template first
    if (state.activeSession?.templateId) {
        const activeTemplate = state.templates.find((template) => String(template.id) === String(state.activeSession.templateId));
        const item = getTemplateItems(activeTemplate).find((entry) => String(entry.exerciseId) === String(exerciseId));
        if (item?.restSeconds) return item.restSeconds;
    }
    
    // Fall back to exercise's rest seconds
    const exercise = state.exercises.find((ex) => String(ex.id) === String(exerciseId));
    if (exercise?.restSeconds) return exercise.restSeconds;
    
    // Final fallback
    return 90;
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
    const approved = await confirmAction({
        title: "Delete all exercises",
        message: "Delete all exercises? This also removes related sets.",
        confirmLabel: "Delete all",
        danger: true,
    });
    if (!approved) return;
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
        if (result.addedExercises === 0) {
            showToast("Default library already installed", "info");
            return;
        }
        showToast(`Added ${result.addedExercises} exercises`, "success");
    } catch (err) {
        console.error(err);
        showToast(`Could not load defaults: ${err?.message || "unknown error"}`, "error");
    }
}

async function createTemplate() {
    const name = templateNameInput.value.trim();
    const rawFolder = templateFolderInput.value.trim();
    const folder = rawFolder === CREATE_NEW_FOLDER_OPTION ? "" : rawFolder;
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
        folder,
        items: [],
        exerciseIds: [],
    });
    templateNameInput.value = "";
    templateFolderInput.value = "";
    showToast("Template created", "success");
    await refreshUI();
    const created = state.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (created) {
        state.selectedTemplateId = created.id;
        resetTemplateDraftFromSelected();
        renderTemplatesList();
        renderTemplateEditor();
    }
}

async function createTemplateFolder() {
    const raw = prompt("Folder name:");
    const name = raw == null ? "" : String(raw).trim();
    if (!name) {
        if (raw !== null) showToast("Enter a folder name", "error");
        return;
    }
    if (name.toLowerCase() === "unfiled") {
        showToast('Use a different folder name than "Unfiled"', "error");
        return;
    }
    const exists = getFolderNames().some((folderName) => folderName.toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast("Folder already exists", "info");
        return;
    }
    await db.addFolder({ id: uuid(), name });
    await refreshUI();
    showToast("Folder created", "success");
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
            const approved = await confirmAction({
                title: "Delete exercise",
                message: `Delete ${ex.name}?`,
                confirmLabel: "Delete",
                danger: true,
            });
            if (!approved) return;
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

function cloneTemplateDraft(template) {
    if (!template) return null;
    return applyTemplateItems({ ...template }, getTemplateItems(template));
}

function ensureTemplateDraft() {
    const selected = getSelectedTemplate();
    if (!selected) return null;
    if (!state.templateEditorDraft || String(state.templateEditorDraft.id) !== String(selected.id)) {
        state.templateEditorDraft = cloneTemplateDraft(selected);
        state.templateEditorDirty = false;
    }
    return state.templateEditorDraft;
}

function applyTemplateDraft(nextDraft, { dirty = true } = {}) {
    state.templateEditorDraft = applyTemplateItems(nextDraft, getTemplateItems(nextDraft));
    if (dirty) {
        state.templateEditorDirty = true;
    }
    renderTemplateEditor();
}

function markTemplateEditorDirty() {
    if (!ensureTemplateDraft()) return;
    if (!state.templateEditorDirty) {
        state.templateEditorDirty = true;
        if (templateSaveChangesBtn) templateSaveChangesBtn.disabled = false;
        if (templateCancelChangesBtn) templateCancelChangesBtn.disabled = false;
    }
}

async function handleTemplateEditorFolderChange() {
    const draft = ensureTemplateDraft();
    if (!draft || !templateEditorFolderInput) return;

    const selectedValue = String(templateEditorFolderInput.value || "").trim();
    if (selectedValue === CREATE_NEW_FOLDER_OPTION) {
        const raw = prompt("Folder name:");
        const name = raw == null ? "" : String(raw).trim();
        if (!name) {
            renderTemplateEditorFolderOptions(getTemplateFolderName(draft));
            return;
        }
        if (name.toLowerCase() === "unfiled" || name.toLowerCase() === "unorganized") {
            showToast("Use a different folder name", "error");
            renderTemplateEditorFolderOptions(getTemplateFolderName(draft));
            return;
        }
        const exists = getFolderNames().some((folderName) => folderName.toLowerCase() === name.toLowerCase());
        if (!exists) {
            await db.addFolder({ id: uuid(), name });
            state.folders = await db.getFolders();
            renderFolderSuggestions();
        }
        applyTemplateDraft({ ...draft, folder: name });
        return;
    }

    applyTemplateDraft({ ...draft, folder: selectedValue });
}

function resetTemplateDraftFromSelected() {
    const selected = getSelectedTemplate();
    state.templateEditorDraft = cloneTemplateDraft(selected);
    state.templateEditorDirty = false;
}

async function saveTemplate(updatedTemplate, successMessage = "Template updated", { silent = false } = {}) {
    const normalizedTemplate = applyTemplateItems(updatedTemplate, getTemplateItems(updatedTemplate));
    await db.updateTemplate(normalizedTemplate);
    state.templates = state.templates.map((template) => (String(template.id) === String(normalizedTemplate.id) ? normalizedTemplate : template));
    renderWorkoutLauncher();
    renderTemplatesList();
    renderTemplateEditor();
    if (!silent) {
        showToast(successMessage, "success");
    }
}

async function saveTemplateName() {
    await saveTemplateEditorChanges();
}

function renderTemplateExerciseOptions(template) {
    templateAddExerciseSelect.innerHTML = "";
    const inTemplate = new Set(getTemplateItems(template).map((item) => String(item.exerciseId)));
    const available = state.exercises.filter((exercise) => !inTemplate.has(String(exercise.id)));

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Add exercise...";
    placeholder.selected = true;
    templateAddExerciseSelect.appendChild(placeholder);

    if (available.length === 0) {
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
    addTemplateExerciseBtn.disabled = true;
}

async function addExerciseToTemplate() {
    const template = ensureTemplateDraft();
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
    applyTemplateDraft(
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
        ])
    );
}

function handleTemplateExerciseSelectChange() {
    if (!templateAddExerciseSelect || !addTemplateExerciseBtn) return;
    addTemplateExerciseBtn.disabled = !templateAddExerciseSelect.value;
}

async function removeExerciseFromTemplate(exerciseId) {
    const template = ensureTemplateDraft();
    if (!template) return;
    state.selectedTemplateExerciseIds.delete(String(exerciseId));
    const nextItems = getTemplateItems(template).filter((item) => String(item.exerciseId) !== String(exerciseId));
    applyTemplateDraft(applyTemplateItems(template, nextItems));
}

async function reorderTemplateExercise(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const template = ensureTemplateDraft();
    if (!template) return;
    const nextItems = [...getTemplateItems(template)];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved);
    applyTemplateDraft(applyTemplateItems(template, nextItems));
}

async function updateTemplateItemConfig(index, patch) {
    const template = ensureTemplateDraft();
    if (!template) return;
    const currentItems = getTemplateItems(template);
    const current = currentItems[index];
    if (!current) return;
    currentItems[index] = { ...current, ...patch };
    applyTemplateDraft(applyTemplateItems(template, currentItems));
}

async function createSupersetFromSelection() {
    const template = ensureTemplateDraft();
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
    applyTemplateDraft(applyTemplateItems(template, nextItems));
    setSupersetDraftMode(false);
}

async function clearSupersetFromSelection() {
    const template = ensureTemplateDraft();
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
    applyTemplateDraft(applyTemplateItems(template, nextItems));
    setSupersetDraftMode(false);
}

function renderTemplateEditor() {
    const selectedTemplate = getSelectedTemplate();
    if (!selectedTemplate) {
        templateEditorPanelEl.classList.add("hidden");
        templateEditorEmptyEl.classList.remove("hidden");
        templateExercisePickerEl.innerHTML = "";
        state.templateEditorDraft = null;
        state.templateEditorDirty = false;
        clearTemplateSelection();
        setSupersetDraftMode(false);
        return;
    }
    const template = ensureTemplateDraft();

    templateEditorEmptyEl.classList.add("hidden");
    templateEditorPanelEl.classList.remove("hidden");
    templateEditorNameInput.value = template.name;
    renderTemplateEditorFolderOptions(getTemplateFolderName(template));
    if (templateSaveChangesBtn) {
        templateSaveChangesBtn.disabled = !state.templateEditorDirty;
    }
    if (templateCancelChangesBtn) {
        templateCancelChangesBtn.disabled = !state.templateEditorDirty;
    }
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
        if (supersetMeta?.supersetId) {
            row.dataset.supersetId = supersetMeta.supersetId;
        }
        row.classList.toggle("selected", state.selectedTemplateExerciseIds.has(String(templateItem.exerciseId)));
        row.innerHTML = `
            <span class="drag-handle">::</span>
            <input type="checkbox" data-action="select-item" ${state.selectedTemplateExerciseIds.has(String(templateItem.exerciseId)) ? "checked" : ""} aria-label="Select for superset">
            <div class="picker-main">
                <div class="picker-top-row">
                    <div class="picker-title">
                        <div>${escapeHtml(exercise.name)}</div>
                        ${supersetMeta ? `<div class="template-superset-label">Superset ${supersetMeta.label} (A${supersetMeta.order})</div>` : ""}
                    </div>
                    <button class="danger ghost small" data-action="remove">Remove</button>
                </div>
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

async function saveTemplateEditorChanges() {
    const selected = getSelectedTemplate();
    const draft = ensureTemplateDraft();
    if (!selected || !draft) return;
    const name = templateEditorNameInput.value.trim();
    const folder = templateEditorFolderInput.value.trim();
    if (!name) {
        showToast("Enter a template name", "error");
        return;
    }
    const duplicate = state.templates.find((item) => String(item.id) !== String(selected.id) && item.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        showToast("Template name already exists", "error");
        return;
    }
    const payload = applyTemplateItems({ ...draft, name, folder }, getTemplateItems(draft));
    await saveTemplate(payload, "Template updated");
    resetTemplateDraftFromSelected();
    renderTemplateEditor();
}

function cancelTemplateEditorChanges() {
    if (!state.templateEditorDirty) return;
    resetTemplateDraftFromSelected();
    clearTemplateSelection();
    setSupersetDraftMode(false);
    renderTemplateEditor();
    showToast("Template changes discarded", "info");
}

function focusTemplateEditor() {
    const target = templateEditorPanelEl?.closest(".card") || templateEditorPanelEl;
    if (!target) return;
    requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("focus-pulse");
        setTimeout(() => target.classList.remove("focus-pulse"), 900);
    });
}

function renderTemplatesList() {
    templatesListEl.innerHTML = "";
    const groupedList = getTemplatesGroupedByFolder({ includeEmpty: true });
    const hasTemplates = groupedList.some((group) => group.templates.length > 0);
    if (!hasTemplates && getFolderNames().length === 0) {
        templatesListEl.innerHTML = `<div class="empty">No templates yet</div>`;
        return;
    }

    if (!state.hasInitializedFolderExpansion) {
        groupedList
            .filter((group) => group.templates.length > 0)
            .forEach((group) => {
                const key = group.label === "Unfiled" ? "" : group.label;
                state.expandedFolders.add(key);
            });
        state.hasInitializedFolderExpansion = true;
    }

    groupedList.forEach((group) => {
        const folderName = group.label;
        const displayName = folderName === "Unfiled" ? "Unorganized" : folderName;
        const folderKey = folderName === "Unfiled" ? "" : folderName;
        const isExpanded = state.expandedFolders.has(folderKey);
        
        const folderSection = document.createElement("section");
        folderSection.className = "templates-folder";
        folderSection.dataset.folder = folderKey;
        folderSection.classList.toggle("collapsed", !isExpanded);
        
        folderSection.innerHTML = `
            <div class="templates-folder-header">
                <div class="folder-header-left">
                    <span class="folder-chevron">${isExpanded ? '▼' : '▶'}</span>
                    <p class="label">${escapeHtml(displayName)}</p>
                </div>
                <p class="sub small">${group.templates.length} template${group.templates.length === 1 ? "" : "s"}</p>
            </div>
            <div class="templates-folder-list"></div>
        `;

        const header = folderSection.querySelector(".templates-folder-header");
        header.addEventListener("click", () => {
            if (isExpanded) {
                state.expandedFolders.delete(folderKey);
            } else {
                state.expandedFolders.add(folderKey);
            }
            renderTemplatesList();
        });

        folderSection.addEventListener("dragover", (event) => {
            event.preventDefault();
            folderSection.classList.add("drag-over");
            if (!isExpanded) {
                state.expandedFolders.add(folderKey);
                setTimeout(() => renderTemplatesList(), 300);
            }
        });
        folderSection.addEventListener("dragleave", () => folderSection.classList.remove("drag-over"));
        folderSection.addEventListener("drop", async (event) => {
            event.preventDefault();
            folderSection.classList.remove("drag-over");
            const templateId = event.dataTransfer?.getData("text/template-id");
            if (!templateId) return;
            const targetFolder = folderSection.dataset.folder || "";
            await moveTemplateToFolder(templateId, targetFolder);
        });

        const listEl = folderSection.querySelector(".templates-folder-list");
        
        if (!isExpanded) {
            templatesListEl.appendChild(folderSection);
            return;
        }
        
        group.templates
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((template) => {
                const card = document.createElement("div");
                card.className = "list-card template-list-card";
                card.draggable = true;
                card.dataset.templateId = String(template.id);
                card.innerHTML = `
                    <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                    <span class="template-name">${escapeHtml(template.name)}</span>
                    <button type="button" class="ghost icon-btn template-action" data-action="edit-template" aria-label="${String(template.id) === String(state.selectedTemplateId) ? "Editing" : "Edit template"}">✎</button>
                    <button type="button" class="danger ghost icon-btn template-action" data-action="delete-template" aria-label="Delete template">🗑</button>
                `;

                card.addEventListener("dragstart", (event) => {
                    event.dataTransfer?.setData("text/template-id", String(template.id));
                    card.classList.add("dragging");
                });
                card.addEventListener("dragend", () => card.classList.remove("dragging"));

                card.querySelector('[data-action="edit-template"]').addEventListener("click", async () => {
                    if (state.templateEditorDirty && String(state.selectedTemplateId) !== String(template.id)) {
                        const discard = await confirmAction({
                            title: "Discard changes",
                            message: "Discard unsaved template changes?",
                            confirmLabel: "Discard",
                            danger: true,
                        });
                        if (!discard) return;
                    }
                    state.selectedTemplateId = template.id;
                    resetTemplateDraftFromSelected();
                    clearTemplateSelection();
                    setSupersetDraftMode(false);
                    renderTemplatesList();
                    renderTemplateEditor();
                    focusTemplateEditor();
                });

                card.querySelector('[data-action="delete-template"]').addEventListener("click", async () => {
                    const approved = await confirmAction({
                        title: "Delete template",
                        message: `Delete template "${template.name}"?`,
                        confirmLabel: "Delete",
                        danger: true,
                    });
                    if (!approved) return;
                    await db.deleteTemplate(template.id);
                    if (String(state.selectedTemplateId) === String(template.id)) {
                        state.selectedTemplateId = null;
                    }
                    clearTemplateSelection();
                    setSupersetDraftMode(false);
                    await refreshUI();
                    showToast("Template deleted", "success");
                });

                listEl.appendChild(card);
            });

        templatesListEl.appendChild(folderSection);
    });
}

async function moveTemplateToFolder(templateId, folderName) {
    const template = state.templates.find((item) => String(item.id) === String(templateId));
    if (!template) return;
    const nextFolder = String(folderName || "").trim();
    if (getTemplateFolderName(template) === nextFolder) return;
    if (nextFolder) {
        await db.addFolder({ id: uuid(), name: nextFolder });
    }
    await db.updateTemplate({ ...template, folder: nextFolder });
    await refreshUI();
    showToast(nextFolder ? `Moved to ${nextFolder}` : "Moved to Unorganized", "success");
}

function openManageFoldersModal() {
    if (!foldersListEl || !manageFoldersModal) return;
    
    foldersListEl.innerHTML = "";
    const folders = state.folders.filter((f) => f.name);
    
    if (folders.length === 0) {
        foldersListEl.innerHTML = '<div class="empty">No folders yet</div>';
    } else {
        folders.forEach((folder) => {
            const templatesInFolder = state.templates.filter((t) => 
                String(t.folder || "").toLowerCase() === String(folder.name || "").toLowerCase()
            );
            
            const folderItem = document.createElement("div");
            folderItem.className = "folder-item";
            folderItem.innerHTML = `
                <div class="folder-item-info">
                    <p class="label">${escapeHtml(folder.name)}</p>
                    <p class="sub small">${templatesInFolder.length} template${templatesInFolder.length === 1 ? '' : 's'}</p>
                </div>
                <div class="folder-item-actions">
                    <button class="ghost small rename-folder" data-folder-id="${folder.id}">Rename</button>
                    <button class="danger ghost small delete-folder" data-folder-id="${folder.id}">Delete</button>
                </div>
            `;
            
            folderItem.querySelector(".rename-folder").addEventListener("click", async () => {
                const newName = prompt("Enter new folder name:", folder.name);
                if (!newName || newName.trim() === "" || newName.trim().toLowerCase() === folder.name.toLowerCase()) return;
                
                await db.updateFolder(folder.id, { name: newName.trim() });
                
                const templatesToUpdate = state.templates.filter((t) => 
                    String(t.folder || "").toLowerCase() === String(folder.name || "").toLowerCase()
                );
                for (const template of templatesToUpdate) {
                    await db.updateTemplate({ ...template, folder: newName.trim() });
                }
                
                await refreshUI();
                openManageFoldersModal();
                showToast("Folder renamed", "success");
            });
            
            folderItem.querySelector(".delete-folder").addEventListener("click", async () => {
                const templatesInFolder = state.templates.filter((t) =>
                    String(t.folder || "").toLowerCase() === String(folder.name || "").toLowerCase()
                );
                if (templatesInFolder.length === 0) {
                    const approved = await confirmAction({
                        title: "Delete folder",
                        message: `Delete folder "${folder.name}"?`,
                        confirmLabel: "Delete",
                        danger: true,
                    });
                    if (!approved) return;
                    await db.deleteFolder(folder.id);
                    await refreshUI();
                    openManageFoldersModal();
                    showToast("Folder deleted", "success");
                    return;
                }
                const n = templatesInFolder.length;
                state.pendingDeleteFolder = { folder, templatesInFolder };
                deleteFolderMessageEl.textContent = `"${folder.name}" has ${n} template${n === 1 ? "" : "s"}. Move them to Unorganized or delete them?`;
                manageFoldersModal.close();
                deleteFolderModal.showModal();
            });
            
            foldersListEl.appendChild(folderItem);
        });
    }
    
    if (closeFoldersModalBtn) {
        closeFoldersModalBtn.onclick = () => manageFoldersModal.close();
    }
    manageFoldersModal.showModal();
}

async function finishDeleteFolder() {
    state.pendingDeleteFolder = null;
    deleteFolderModal.close();
    await refreshUI();
    openManageFoldersModal();
    showToast("Folder deleted", "success");
}

function wireDeleteFolderModal() {
    if (!deleteFolderModal) return;
    closeDeleteFolderModalBtn.onclick = () => {
        state.pendingDeleteFolder = null;
        deleteFolderModal.close();
        openManageFoldersModal();
    };
    deleteFolderMoveBtn.onclick = async () => {
        const pending = state.pendingDeleteFolder;
        if (!pending) return;
        for (const template of pending.templatesInFolder) {
            await db.updateTemplate({ ...template, folder: "" });
        }
        await db.deleteFolder(pending.folder.id);
        await finishDeleteFolder();
    };
    deleteFolderDeleteAllBtn.onclick = async () => {
        const pending = state.pendingDeleteFolder;
        if (!pending) return;
        for (const template of pending.templatesInFolder) {
            await db.deleteTemplate(template.id);
        }
        await db.deleteFolder(pending.folder.id);
        await finishDeleteFolder();
    };
}

// Workout logic
function getExercisesForTemplate(templateId) {
    if (!templateId) return [];
    const tmpl = state.templates.find((t) => String(t.id) === String(templateId));
    if (!tmpl) return [];
    return getTemplateItems(tmpl)
        .map((item) => state.exercises.find((exercise) => String(exercise.id) === String(item.exerciseId)))
        .filter(Boolean);
}

async function startWorkout(templateId = null) {
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    renderRestTimer();
    const exercises = getExercisesForTemplate(templateId);
    if (templateId && exercises.length === 0) {
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
            exerciseIds: exercises.map((exercise) => exercise.id),
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
            return startWorkout(templateId); // retry with fresh session
        }
    }

    if (!state.activeSession.startedAt) {
        state.activeSession = {
            ...state.activeSession,
            startedAt: state.activeSession.date || new Date().toISOString(),
            isPaused: false,
            pausedAt: null,
            pausedAccumulatedSeconds: Number.parseInt(state.activeSession.pausedAccumulatedSeconds, 10) || 0,
            exerciseIds: Array.isArray(state.activeSession.exerciseIds) ? state.activeSession.exerciseIds : exercises.map((exercise) => exercise.id),
        };
        await db.updateSession(state.activeSession);
        state.sessions = state.sessions.map((item) => (String(item.id) === String(state.activeSession.id) ? state.activeSession : item));
    }

    state.activeExercises = exercises;
    if (state.activeSession.exerciseIds?.length) {
        state.activeExercises = getExercisesForSession(state.activeSession);
    }
    workoutNotesEl.value = state.activeSession.notes || "";
    sessionTemplateLabel.textContent = templateId ? state.templates.find((t) => String(t.id) === String(templateId))?.name || "Workout" : "Empty Workout";
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
        state.activeExercises = getExercisesForSession(draft);
        sessionTemplateLabel.textContent = draft.templateId ? state.templates.find((t) => String(t.id) === String(draft.templateId))?.name || "Workout" : "Empty Workout";
        workoutNotesEl.value = draft.notes || "";
        workoutSection.classList.remove("hidden");
        startWorkoutElapsedTimer();
        renderSessionExercisePicker();
        renderWorkoutExercises();
    } else {
        stopWorkoutElapsedTimer();
    }
}

function renderSessionExercisePicker() {
    if (!state.activeSession) {
        sessionExercisePickerEl.classList.add("hidden");
        return;
    }
    sessionExercisePickerEl.classList.remove("hidden");
    sessionAddExerciseBtn.disabled = false;
}

async function addExerciseToActiveSession() {
    if (!state.activeSession) return;
    const exerciseId = sessionAddExerciseSelect.value;
    if (!exerciseId) return;
    const exercise = state.exercises.find((item) => String(item.id) === String(exerciseId));
    if (!exercise) return;
    if (state.activeExercises.some((item) => String(item.id) === String(exercise.id))) return;

    state.activeExercises.push(exercise);
    const updatedSession = {
        ...state.activeSession,
        exerciseIds: state.activeExercises.map((item) => item.id),
        notes: workoutNotesEl.value,
    };
    await db.updateSession(updatedSession);
    state.activeSession = updatedSession;
    state.sessions = state.sessions.map((session) => (String(session.id) === String(updatedSession.id) ? updatedSession : session));
    renderSessionExercisePicker();
    renderWorkoutExercises();
}

function openSelectExerciseModal() {
    selectExerciseSearchInput.value = "";
    renderSelectExerciseList("");
    selectExerciseSearchInput.focus();
    selectExerciseModal.showModal();
}

function renderSelectExerciseList(searchTerm = "") {
    const inSession = new Set(state.activeExercises.map((exercise) => String(exercise.id)));
    let available = state.exercises.filter((exercise) => !inSession.has(String(exercise.id)));
    
    if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        available = available.filter((exercise) => exercise.name.toLowerCase().includes(lowerTerm));
    }
    
    selectExerciseList.innerHTML = "";
    
    if (available.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = searchTerm.trim() ? "No exercises found" : "All exercises already added";
        selectExerciseList.appendChild(empty);
        
        const createBtn = document.createElement("button");
        createBtn.className = "primary";
        createBtn.textContent = "+ Create new exercise";
        createBtn.style.marginTop = "12px";
        createBtn.addEventListener("click", () => {
            selectExerciseModal.close();
            openCreateExerciseModal();
        });
        selectExerciseList.appendChild(createBtn);
        return;
    }
    
    available.forEach((exercise) => {
        const item = document.createElement("div");
        item.className = "exercise-select-item";
        item.innerHTML = `
            <p class="exercise-select-item-name">${escapeHtml(exercise.name)}</p>
            <p class="exercise-select-item-meta">${exercise.repFloor}–${exercise.repCeiling} reps • +${formatWeight(exercise.weightIncrement)} lbs</p>
        `;
        item.addEventListener("click", () => selectAndAddExercise(exercise));
        selectExerciseList.appendChild(item);
    });
}

async function selectAndAddExercise(exercise) {
    if (!state.activeSession) return;
    if (state.activeExercises.some((item) => String(item.id) === String(exercise.id))) return;
    
    state.activeExercises.push(exercise);
    const updatedSession = {
        ...state.activeSession,
        exerciseIds: state.activeExercises.map((item) => item.id),
        notes: workoutNotesEl.value,
    };
    await db.updateSession(updatedSession);
    state.activeSession = updatedSession;
    state.sessions = state.sessions.map((session) => (String(session.id) === String(updatedSession.id) ? updatedSession : session));
    
    selectExerciseModal.close();
    renderSessionExercisePicker();
    renderWorkoutExercises();
}

function openCreateExerciseModal() {
    createExerciseNameInput.value = "";
    createExerciseRepFloorInput.value = "8";
    createExerciseRepCeilingInput.value = "12";
    createExerciseWeightIncrementInput.value = "5";
    createExerciseNameInput.focus();
    createExerciseModal.showModal();
}

async function submitCreateExercise() {
    const name = createExerciseNameInput.value.trim();
    const repFloor = parseInt(createExerciseRepFloorInput.value, 10);
    const repCeiling = parseInt(createExerciseRepCeilingInput.value, 10);
    const restSeconds = parseInt(createExerciseRestSecondsInput.value, 10);

    if (!name || Number.isNaN(repFloor) || Number.isNaN(repCeiling) || repFloor >= repCeiling || Number.isNaN(restSeconds) || restSeconds < 0) {
        showToast("Enter valid exercise details", "error");
        return;
    }

    const newExercise = { id: uuid(), name, repFloor, repCeiling, restSeconds };
    try {
        await db.addExercise(newExercise);
        state.exercises.push(newExercise);
        
        // Add the new exercise to the active session
        state.activeExercises.push(newExercise);
        const updatedSession = {
            ...state.activeSession,
            exerciseIds: state.activeExercises.map((item) => item.id),
            notes: workoutNotesEl.value,
        };
        await db.updateSession(updatedSession);
        state.activeSession = updatedSession;
        state.sessions = state.sessions.map((session) => (String(session.id) === String(updatedSession.id) ? updatedSession : session));
        
        createExerciseModal.close();
        renderSessionExercisePicker();
        renderWorkoutExercises();
        showToast(`"${name}" created and added`, "success");
    } catch (err) {
        console.error(err);
        showToast("Could not create exercise", "error");
    }
}

function renderWorkoutExercises() {
    workoutExercisesEl.innerHTML = "";
    renderSessionExercisePicker();
    if (!state.activeExercises.length) {
        workoutExercisesEl.innerHTML = `<div class="empty">No exercises yet. Add one above.</div>`;
        return;
    }
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
        const templateItem = itemByExerciseId.get(String(ex.id));
        const supersetMeta = supersetMetaByExerciseId.get(String(ex.id));
        
        const card = document.createElement("div");
        card.className = "exercise-card";
        card.draggable = true;
        card.dataset.exerciseId = String(ex.id);
        if (supersetMeta?.supersetId) {
            card.dataset.supersetId = supersetMeta.supersetId;
        }
        const planText = templateItem
            ? `${templateItem.sets} sets • ${templateItem.reps} reps • ${templateItem.restSeconds}s rest`
            : `${ex.repFloor}–${ex.repCeiling} reps • +${formatWeight(ex.weightIncrement)} lbs`;
        card.innerHTML = `
            <div class="exercise-header">
                <div class="exercise-title-row">
                    <span class="exercise-drag-handle" aria-label="Drag to reorder">⋮⋮</span>
                    <p class="label">${escapeHtml(ex.name)}</p>
                </div>
                <div class="exercise-meta-row">
                    <p class="sub">${escapeHtml(planText)}</p>
                    <div class="exercise-header-actions">
                        ${supersetMeta ? `<div class="superset-badge">Superset ${supersetMeta.label} (A${supersetMeta.order})</div>` : ""}
                        <button class="ghost small history-chip" type="button">History</button>
                    </div>
                </div>
            </div>
            <div class="sets-container" data-exercise-id="${ex.id}"></div>
            <button class="ghost add-set">+ Add set</button>
        `;

        card.addEventListener("dragstart", (e) => {
            // Allow drag from exercise header, but not from buttons
            if (!e.target.closest(".exercise-header")) {
                e.preventDefault();
                return;
            }
            if (e.target.closest("button")) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData("text/plain", String(ex.id));
            e.dataTransfer.effectAllowed = "move";
            card.classList.add("exercise-card-dragging");
        });
        card.addEventListener("dragend", () => {
            card.classList.remove("exercise-card-dragging");
            workoutExercisesEl.querySelectorAll(".exercise-card").forEach((c) => c.classList.remove("exercise-card-drag-over"));
        });
        card.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const dragging = workoutExercisesEl.querySelector(".exercise-card-dragging");
            if (dragging && dragging !== card) {
                card.classList.add("exercise-card-drag-over");
            }
        });
        card.addEventListener("dragleave", () => card.classList.remove("exercise-card-drag-over"));
        card.addEventListener("drop", async (e) => {
            e.preventDefault();
            card.classList.remove("exercise-card-drag-over");
            const draggedId = e.dataTransfer.getData("text/plain");
            if (!draggedId || draggedId === card.dataset.exerciseId) return;
            const fromIndex = state.activeExercises.findIndex((ex) => String(ex.id) === String(draggedId));
            const toIndex = Array.from(workoutExercisesEl.querySelectorAll(".exercise-card")).indexOf(card);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
            const reordered = [...state.activeExercises];
            const [removed] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, removed);
            state.activeExercises = reordered;
            const updatedSession = {
                ...state.activeSession,
                exerciseIds: reordered.map((ex) => ex.id),
                notes: workoutNotesEl.value,
            };
            await db.updateSession(updatedSession);
            state.activeSession = updatedSession;
            state.sessions = state.sessions.map((s) => (String(s.id) === String(updatedSession.id) ? updatedSession : s));
            renderWorkoutExercises();
        });

        card.querySelector(".history-chip").addEventListener("click", () => openExerciseModal(ex));

        const setsContainer = card.querySelector(".sets-container");
        setsContainer.innerHTML = `
            <div class="set-row-header" aria-hidden="true">
                <span class="weight-label">lbs</span>
                <span class="reps-label">reps</span>
            </div>
        `;
        setsContainer.dataset.previousSetDisplays = JSON.stringify(previousSetDisplays);
        const plannedSetCount = Math.max(1, Number.parseInt(templateItem?.sets, 10) || 1);
        setsContainer.dataset.plannedSetCount = plannedSetCount;
        const rowCount = Math.max(plannedSetCount, exSets.length || 0);
        const previousSets = getPreviousSetData(ex.id);
        for (let i = 0; i < rowCount; i += 1) {
            let setData = exSets[i] || null;
            if (!setData && previousSets.length > i) {
                setData = {
                    weight: previousSets[i].weight,
                    reps: previousSets[i].reps,
                };
            }
            addSetRow(setsContainer, ex, setData, i + 1, previousSetDisplays[i] || "", supersetMeta);
        }

        card.querySelector(".add-set").addEventListener("click", () => {
            const nextSetNumber = setsContainer.querySelectorAll(".set-row").length + 1;
            const previousDisplay = previousSetDisplays[nextSetNumber - 1] || "";
            const previousSets = getPreviousSetData(ex.id);
            let setData = null;
            if (previousSets.length >= nextSetNumber) {
                setData = {
                    weight: previousSets[nextSetNumber - 1].weight,
                    reps: previousSets[nextSetNumber - 1].reps,
                };
            }
            addSetRow(setsContainer, ex, setData, nextSetNumber, previousDisplay, supersetMeta);
        });
        workoutExercisesEl.appendChild(card);
    });
    updateWorkoutFloatingWidget();
}

function attachSwipeToDelete(row, content, onDelete) {
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let currentX = 0;
    let swipeArmed = false;
    let open = false;
    let deleteArmed = false;
    const maxSwipe = 112;
    const openThreshold = 52;
    const intentThreshold = 14;

    const interactiveSelector = "button, select, textarea, label, input";
    const setOffset = (x) => {
        content.style.transform = `translateX(${x}px)`;
        row.classList.toggle("swiping", x < 0);
        row.classList.toggle("swipe-delete-ready", Math.abs(x) >= openThreshold);
    };

    const closeSwipe = () => {
        open = false;
        deleteArmed = false;
        currentX = 0;
        setOffset(0);
        row.classList.remove("swipe-open");
    };

    const openSwipe = () => {
        open = true;
        deleteArmed = false;
        currentX = -maxSwipe;
        setOffset(currentX);
        row.classList.add("swipe-open");
    };

    const settleSwipe = () => {
        if (currentX <= -openThreshold) {
            openSwipe();
            return;
        }
        closeSwipe();
    };

    row.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest(interactiveSelector)) return;
        dragging = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        baseX = open ? -maxSwipe : 0;
        currentX = baseX;
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
                settleSwipe();
                return;
            }
            swipeArmed = true;
        }

        currentX = Math.max(-maxSwipe, Math.min(0, baseX + delta));
        setOffset(currentX);
    });

    const endSwipe = async (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false;
        if (row.hasPointerCapture(pointerId)) {
            row.releasePointerCapture(pointerId);
        }
        settleSwipe();
        if (open) {
            deleteArmed = true;
        }
    };

    row.addEventListener("pointerup", endSwipe);
    row.addEventListener("pointercancel", (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false;
        if (row.hasPointerCapture(pointerId)) {
            row.releasePointerCapture(pointerId);
        }
        settleSwipe();
        if (open) {
            deleteArmed = true;
        }
    });
    row.addEventListener("lostpointercapture", () => {
        if (dragging) {
            dragging = false;
            settleSwipe();
        }
    });

    const deleteAction = row.querySelector(".set-delete-action");
    if (deleteAction) {
        deleteAction.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!deleteArmed) {
                return;
            }
            await onDelete();
        });
    }
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
        return sets.map((set) => {
            if (set.isSkipped) return "Skipped";
            return `${formatWeight(set.weight)} x ${set.reps}`;
        });
    }
    return [];
}

function getPreviousSetData(exerciseId) {
    const completedSessions = state.sessions
        .filter((session) => session.status !== "draft")
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const session of completedSessions) {
        const sets = state.sets
            .filter((set) => String(set.sessionId) === String(session.id) && String(set.exerciseId) === String(exerciseId) && !set.isSkipped)
            .slice()
            .sort((a, b) => a.setNumber - b.setNumber);
        if (!sets.length) continue;
        return sets;
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
        <button type="button" class="set-delete-btn ghost small" aria-label="Delete set">✕</button>
        <div class="set-row-content">
            <span class="set-index">${setNumber}</span>
            <span class="previous-set">${previousDisplay || "-"}</span>
            <input type="number" aria-label="Weight" inputmode="decimal" step="0.5" value="${formatWeightInput(existingSet?.weight || "")}">
            <span class="x">×</span>
            <input type="number" aria-label="Reps" inputmode="numeric" min="1" value="${existingSet?.reps || ""}">
            <button class="ghost small mark-set ${existingSet?.isComplete ? "done" : ""}" aria-label="Mark set complete">✓</button>
        </div>
    `;
    row.classList.toggle("set-complete", Boolean(existingSet?.isComplete));
    
    // Wire up delete button
    const deleteBtn = row.querySelector(".set-delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await deleteSetRow(row);
    });

    const [weightInput, repsInput] = row.querySelectorAll("input");
    
    // Mark as auto-populated if this row is a placeholder (no persisted set yet)
    const isAutoPopulated = !existingSet?.id && existingSet?.weight && existingSet?.reps;
    if (isAutoPopulated) {
        weightInput.classList.add("auto-populated");
        repsInput.classList.add("auto-populated");
        row.dataset.prefilledWeight = String(existingSet.weight);
        row.dataset.prefilledReps = String(existingSet.reps);
    }
    
    const removeAutoPopulatedClass = () => {
        weightInput.classList.remove("auto-populated");
        repsInput.classList.remove("auto-populated");
    };
    
    const save = () => {
        removeAutoPopulatedClass();
        return saveSetRow(container, exercise, row, weightInput, repsInput);
    };
    
    weightInput.addEventListener("input", () => {
        removeAutoPopulatedClass();
        save();
    });
    repsInput.addEventListener("input", () => {
        removeAutoPopulatedClass();
        save();
    });
    weightInput.addEventListener("focus", () => {
        if (weightInput.classList.contains("auto-populated")) {
            weightInput.value = "";
            weightInput.classList.remove("auto-populated");
        }
    });
    repsInput.addEventListener("focus", () => {
        if (repsInput.classList.contains("auto-populated")) {
            repsInput.value = "";
            repsInput.classList.remove("auto-populated");
        }
    });

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
        } else {
            const inputWeight = parseFloat(weightInput.value);
            const inputReps = parseInt(repsInput.value, 10);
            if (Number.isFinite(inputWeight) && Number.isFinite(inputReps)
                && (setRecord.weight !== inputWeight || setRecord.reps !== inputReps)) {
                const refreshed = {
                    ...setRecord,
                    weight: inputWeight,
                    reps: inputReps,
                };
                await db.updateSet(refreshed);
                state.sets = state.sets.map((item) => (String(item.id) === String(refreshed.id) ? refreshed : item));
                setRecord = refreshed;
            }
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
        
        // Sync immediately when marking set complete (don't wait for debounce)
        if (nextComplete) {
            db.ensureCloudSyncComplete().catch((err) => console.error("Failed to sync set completion:", err));
        }
        
        // Remove auto-populated styling when marking complete
        if (nextComplete) {
            removeAutoPopulatedClass();
        }
        if (nextComplete) {
            const hadPrefillBaseline = row.dataset.prefilledWeight != null && row.dataset.prefilledReps != null;
            const prefillWeight = hadPrefillBaseline ? parseFloat(row.dataset.prefilledWeight) : null;
            const prefillReps = hadPrefillBaseline ? parseInt(row.dataset.prefilledReps, 10) : null;
            const changedPrefilledValues = hadPrefillBaseline
                && Number.isFinite(prefillWeight)
                && Number.isFinite(prefillReps)
                && (prefillWeight !== updated.weight || prefillReps !== updated.reps);

            applyCompletionPrefillRules(container, row, updated.weight, updated.reps, changedPrefilledValues);
            const nextSetRow = row.nextElementSibling;
            if (!nextSetRow) {
                // Only create next set if we haven't reached planned set count
                const setRowCount = container.querySelectorAll(".set-row").length;
                const plannedSetCount = Number.parseInt(container.dataset.plannedSetCount, 10) || 1;
                if (setRowCount < plannedSetCount) {
                    const newSetNumber = setRowCount + 1;
                    const previousDisplay = getPreviousSetDisplays(exercise.id)[newSetNumber - 1] || "";
                    const newSetData = {
                        weight: updated.weight,
                        reps: updated.reps,
                    };
                    addSetRow(container, exercise, newSetData, newSetNumber, previousDisplay, supersetMeta);
                    const newRow = container.querySelector(".set-row:last-of-type");
                    const newWeightInput = newRow.querySelector("input[inputmode='decimal']");
                    const newRepsInput = newRow.querySelector("input[inputmode='numeric']");
                    if (newWeightInput && newRepsInput) {
                        newWeightInput.focus();
                    }
                }
            }

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

function applyCompletionPrefillRules(container, sourceRow, weight, reps, forceOverride = false) {
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return;
    const rows = Array.from(container.querySelectorAll(".set-row"));
    const sourceIndex = rows.indexOf(sourceRow);
    if (sourceIndex === -1) return;

    const remainingRows = rows.slice(sourceIndex + 1).filter((row) => !row.classList.contains("set-complete"));
    if (!remainingRows.length) return;

    if (!forceOverride) {
        const hasAnyPrefilledNextRow = remainingRows.some((row) => {
            const nextWeightInput = row.querySelector("input[inputmode='decimal']");
            const nextRepsInput = row.querySelector("input[inputmode='numeric']");
            return nextWeightInput?.classList.contains("auto-populated") && nextRepsInput?.classList.contains("auto-populated");
        });
        if (hasAnyPrefilledNextRow) {
            return;
        }
    }

    remainingRows.forEach((row) => {
        const nextWeightInput = row.querySelector("input[inputmode='decimal']");
        const nextRepsInput = row.querySelector("input[inputmode='numeric']");
        if (!nextWeightInput || !nextRepsInput) return;

        if (!forceOverride) {
            const hasValue = String(nextWeightInput.value || "").trim().length > 0 || String(nextRepsInput.value || "").trim().length > 0;
            if (hasValue) return;
        }

        nextWeightInput.value = formatWeightInput(weight);
        nextRepsInput.value = String(reps);
        nextWeightInput.classList.add("auto-populated");
        nextRepsInput.classList.add("auto-populated");
        row.dataset.prefilledWeight = String(weight);
        row.dataset.prefilledReps = String(reps);
    });
}

async function saveSetRow(container, exercise, row, weightInput, repsInput) {
    if (!state.activeSession) return null;
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;

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

function buildRepsTextForTemplate(exercise, setsForExercise) {
    const repValues = setsForExercise
        .filter((set) => !set.isSkipped)
        .map((set) => Number.parseInt(set.reps, 10))
        .filter((value) => Number.isFinite(value) && value > 0);
    if (repValues.length === 0) {
        return `${exercise.repFloor}-${exercise.repCeiling}`;
    }
    const min = Math.min(...repValues);
    const max = Math.max(...repValues);
    return min === max ? String(min) : `${min}-${max}`;
}

async function maybeSaveEmptyWorkoutAsTemplate(sessionSets) {
    if (!state.activeSession || state.activeSession.templateId || state.activeExercises.length === 0) {
        return null;
    }

    const shouldSaveTemplate = await confirmAction({
        title: "Save as template",
        message: "Save this empty workout as a new template?",
        confirmLabel: "Save template",
    });
    if (!shouldSaveTemplate) {
        return null;
    }

    let templateName = "";
    while (!templateName) {
        const suggested = `Workout ${formatDate(state.activeSession.date || new Date().toISOString())}`;
        const entered = prompt("Template name", suggested);
        if (entered === null) return null;
        const trimmed = entered.trim();
        if (!trimmed) {
            showToast("Template name is required", "error");
            continue;
        }
        const duplicate = state.templates.find((template) => template.name.toLowerCase() === trimmed.toLowerCase());
        if (duplicate) {
            showToast("Template name already exists", "error");
            continue;
        }
        templateName = trimmed;
    }

    const folderInput = prompt("Template folder (optional)", "");
    if (folderInput === null) return null;
    const folderName = folderInput.trim();

    const items = state.activeExercises.map((exercise) => {
        const setsForExercise = sessionSets.filter((set) => String(set.exerciseId) === String(exercise.id));
        const setNumbers = setsForExercise
            .map((set) => Number.parseInt(set.setNumber, 10))
            .filter((value) => Number.isFinite(value) && value > 0);
        return {
            exerciseId: exercise.id,
            sets: Math.max(1, setNumbers.length ? Math.max(...setNumbers) : 1),
            reps: buildRepsTextForTemplate(exercise, setsForExercise),
            restSeconds: getTemplateRestSecondsForExercise(exercise.id),
            supersetId: null,
            supersetOrder: 0,
        };
    });

    await db.addTemplate({
        id: uuid(),
        name: templateName,
        folder: folderName,
        items,
        exerciseIds: items.map((item) => item.exerciseId),
    });
    return templateName;
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

    const createdTemplateName = await maybeSaveEmptyWorkoutAsTemplate(sessionSets);

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
    
    // Ensure workout is synced to cloud before clearing local state
    const syncSuccess = await db.ensureCloudSyncComplete();
    if (!syncSuccess) {
        showToast("⚠️ Sync to cloud failed. Your data is saved locally.", "warning");
    }
    
    state.activeSession = null;
    state.activeExercises = [];
    stopWorkoutElapsedTimer();
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    state.restTimer.lastDurationSeconds = 90;
    renderRestTimer();
    workoutNotesEl.value = "";
    workoutSection.classList.add("hidden");
    sessionExercisePickerEl.classList.add("hidden");
    showToast(
        createdTemplateName ? `Workout saved • Template "${createdTemplateName}" created` : "Workout saved",
        "success"
    );
    celebrateWithConfetti();
    await refreshUI();
}

async function cancelWorkout() {
    if (!state.activeSession) return;
    const approved = await confirmAction({
        title: "Cancel workout",
        message: "Cancel current workout? This removes draft sets.",
        confirmLabel: "Cancel workout",
        danger: true,
    });
    if (!approved) return;
    await db.deleteSession(state.activeSession.id);
    state.sessions = state.sessions.filter((s) => s.id !== state.activeSession.id);
    state.sets = state.sets.filter((s) => s.sessionId !== state.activeSession.id);
    state.activeSession = null;
    state.activeExercises = [];
    stopWorkoutElapsedTimer();
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    state.restTimer.lastDurationSeconds = 90;
    renderRestTimer();
    workoutNotesEl.value = "";
    workoutSection.classList.add("hidden");
    sessionExercisePickerEl.classList.add("hidden");
    try {
        await db.forceSyncToCloud();
    } catch (err) {
        console.error(err);
    }
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
            const approved = await confirmAction({
                title: "Delete session",
                message: "Delete this session?",
                confirmLabel: "Delete",
                danger: true,
            });
            if (!approved) return;
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
                <p class="sub">${exSets.map((s, i) => {
                    if (s.isSkipped) return `Set ${i + 1}: Skipped`;
                    return `Set ${i + 1}: ${formatWeight(s.weight)} × ${s.reps}`;
                }).join(" • ")}</p>
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
            const validSets = exSets.filter((s) => !s.isSkipped && s.weight > 0);
            const topSet = validSets.length > 0 
                ? validSets.slice().sort((a, b) => (b.weight === a.weight ? b.reps - a.reps : b.weight - a.weight))[0]
                : null;
            const block = document.createElement("div");
            block.className = "history-block";
            block.innerHTML = `
                <p class="label">${formatDate(session.date)}</p>
                <p class="sub">${exSets.map((s, i) => {
                    if (s.isSkipped) return `Set ${i + 1}: Skipped`;
                    return `Set ${i + 1}: ${formatWeight(s.weight)} × ${s.reps}`;
                }).join(" • ")}</p>
                ${topSet ? `<p class="sub small">Top set: ${formatWeight(topSet.weight)} × ${topSet.reps}</p>` : ''}
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
        const validSets = sets.filter((s) => !s.isSkipped && s.weight > 0);
        if (validSets.length === 0) return;
        const topSet = validSets.slice().sort((a, b) => (b.weight === a.weight ? b.reps - a.reps : b.weight - a.weight))[0];
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
        const approved = await confirmAction({
            title: "Import data",
            message: "Import data and overwrite current records?",
            confirmLabel: "Import",
            danger: true,
        });
        if (!approved) return;
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
    const approved = await confirmAction({
        title: "Clear all data",
        message: "Clear all data? This cannot be undone.",
        confirmLabel: "Clear data",
        danger: true,
    });
    if (!approved) return;
    await db.clearAll();
    state.activeSession = null;
    state.activeExercises = [];
    stopWorkoutElapsedTimer();
    stopRestTimer();
    state.restTimer.remainingSeconds = 0;
    state.restTimer.lastDurationSeconds = 90;
    renderRestTimer();
    workoutSection.classList.add("hidden");
    sessionExercisePickerEl.classList.add("hidden");
    await refreshUI();
    showToast("Data cleared", "success");
}

// PWA registration
function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Event bindings
function bindEvents() {
    bindConfirmModal();
    
    // Create exercise modal
    createExerciseSubmitBtn.addEventListener("click", submitCreateExercise);
    createExerciseCancelBtn.addEventListener("click", () => createExerciseModal.close());
    createExerciseCancelTopBtn.addEventListener("click", () => createExerciseModal.close());
    createExerciseNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitCreateExercise();
    });
    
    tabButtons.forEach((btn) =>
        btn.addEventListener("click", () => {
            setView(btn.dataset.view);
            if (btn.dataset.view === "view-history") {
                renderHistory();
            }
        })
    );
    startEmptyWorkoutBtn.addEventListener("click", () => startWorkout(null));
    sessionAddExerciseBtn.addEventListener("click", openSelectExerciseModal);
    selectExerciseCancelTopBtn.addEventListener("click", () => selectExerciseModal.close());
    selectExerciseSearchInput.addEventListener("input", (e) => {
        renderSelectExerciseList(e.target.value);
    });
    
    // Widget rest timer controls
    widgetRestLessBtn.addEventListener("click", () => adjustRestTimer(-10));
    widgetRestMoreBtn.addEventListener("click", () => adjustRestTimer(10));
    widgetRestEndBtn.addEventListener("click", toggleRestTimer);
    expandWorkoutBtn?.addEventListener("click", () => setView("view-workout"));
    
    pauseWorkoutBtn.addEventListener("click", pauseOrResumeWorkout);
    finishWorkoutBtn.addEventListener("click", finishWorkout);
    cancelWorkoutBtn.addEventListener("click", cancelWorkout);
    addExerciseBtn.addEventListener("click", addExercise);
    loadDefaultLibraryBtn.addEventListener("click", loadDefaultLibrary);
    clearExercisesBtn.addEventListener("click", clearExercises);
    createTemplateBtn.addEventListener("click", createTemplate);
    createFolderBtn.addEventListener("click", createTemplateFolder);
    templateFolderInput?.addEventListener("change", () => {
        handleCreateTemplateFolderSelectChange().catch((err) => {
            console.error(err);
            showToast("Could not create folder", "error");
            renderFolderSuggestions();
        });
    });
    saveTemplateNameBtn.addEventListener("click", saveTemplateName);
    templateEditorNameInput.addEventListener("input", markTemplateEditorDirty);
    templateEditorFolderInput.addEventListener("change", handleTemplateEditorFolderChange);
    addTemplateExerciseBtn.addEventListener("click", addExerciseToTemplate);
    templateAddExerciseSelect.addEventListener("change", handleTemplateExerciseSelectChange);
    templateSaveChangesBtn.addEventListener("click", saveTemplateEditorChanges);
    templateCancelChangesBtn.addEventListener("click", cancelTemplateEditorChanges);
    makeSupersetBtn.addEventListener("click", createSupersetFromSelection);
    clearSupersetBtn.addEventListener("click", clearSupersetFromSelection);
    if (manageFoldersBtn) {
        manageFoldersBtn.addEventListener("click", openManageFoldersModal);
    }
    wireDeleteFolderModal();
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
    if (themeModeSelect) {
        themeModeSelect.addEventListener("change", (event) => applyThemeMode(event.target.value));
    }
}

async function init() {
    initThemeMode();
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
    db.onSyncStateChange((nextSyncState) => {
        handleSyncStateChange(nextSyncState);
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
