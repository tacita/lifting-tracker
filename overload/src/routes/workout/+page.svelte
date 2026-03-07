<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { workout, resetWorkout } from '$lib/stores/workout.js';
	import type { ActiveExercise } from '$lib/stores/workout.js';
	import type { WorkoutSet, TemplateItem } from '$lib/db/schema.js';
	import { updateSession, deleteSession } from '$lib/db/sessions.js';
	import { getExercises } from '$lib/db/exercises.js';
	import { getTemplateItems } from '$lib/db/templates.js';
	import { getExerciseHistory } from '$lib/db/exercises.js';
	import { now } from '$lib/db/index.js';
	import { formatTimer, formatDuration, elapsedSeconds } from '$lib/utils/format.js';
	import { showToast } from '$lib/stores/toasts.js';
	import ExerciseBlock from '$lib/components/workout/ExerciseBlock.svelte';
	import RestTimer from '$lib/components/workout/RestTimer.svelte';
	import ExerciseSelector from '$lib/components/exercises/ExerciseSelector.svelte';
	import ConfirmModal from '$lib/components/shared/ConfirmModal.svelte';
	import HistoryChart from '$lib/components/shared/HistoryChart.svelte';
	import { exercises as exStore } from '$lib/stores/data.js';
	import { onDestroy } from 'svelte';
	import { createId } from '$lib/db/index.js';

	$: session = $workout.session;
	$: exercises = $workout.exercises;

	// Elapsed timer
	let elapsed = 0;
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	$: if (session && session.status === 'draft') {
		if (!timerInterval) timerInterval = setInterval(tickTimer, 1000);
	} else {
		if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
	}

	function tickTimer() {
		if (!session) return;
		elapsed = elapsedSeconds(session.startedAt, session.pausedDurationSeconds);
	}

	onDestroy(() => { if (timerInterval) clearInterval(timerInterval); });

	// Pausing
	async function togglePause() {
		if (!session) return;
		if (session.pausedAt) {
			const pausedMs = Date.now() - new Date(session.pausedAt).getTime();
			const extra = Math.floor(pausedMs / 1000);
			const updated = await updateSession(session.id, {
				pausedAt: undefined,
				pausedDurationSeconds: (session.pausedDurationSeconds ?? 0) + extra
			});
			workout.update((w) => ({ ...w, session: updated }));
		} else {
			const updated = await updateSession(session.id, { pausedAt: now() });
			workout.update((w) => ({ ...w, session: updated }));
		}
	}

	// Superset labeling
	$: supersetLabels = (() => {
		const map = new Map<string, string>();
		let code = 65;
		for (const ex of exercises) {
			const ssId = ex.templateItem?.supersetId;
			if (ssId && !map.has(ssId)) map.set(ssId, `Superset ${String.fromCharCode(code++)}`);
		}
		return exercises.map((ex) => ex.templateItem?.supersetId ? (map.get(ex.templateItem.supersetId) ?? null) : null);
	})();

	// Add exercise
	let showAddExercise = false;
	async function handleAddExercise(detail: { ids: string[]; asSuperset: boolean }) {
		const { ids, asSuperset } = detail;
		const exList = await getExercises();
		const exMap = new Map(exList.map((e) => [e.id, e]));
		const ssId = asSuperset && ids.length > 1 ? createId() : undefined;

		const newExercises: ActiveExercise[] = ids.map((id, i) => {
			const ex = exMap.get(id);
			const fakeItem: TemplateItem | undefined = ssId
				? { id: '', templateId: '', exerciseId: id, sortOrder: i, supersetId: ssId, supersetOrder: i, createdAt: '', updatedAt: '', synced: false }
				: undefined;
			return {
				exerciseId: id,
				exerciseName: ex?.name ?? id,
				note: ex?.note,
				templateItem: fakeItem,
				sets: [{ setNumber: 1, completed: false }]
			};
		});

		workout.update((w) => ({ ...w, exercises: [...w.exercises, ...newExercises] }));
		showAddExercise = false;
	}

	// Swap exercise
	let swapExerciseId = '';
	let showSwap = false;
	function openSwap(exerciseId: string) {
		swapExerciseId = exerciseId;
		showSwap = true;
	}
	function handleSwap(detail: { ids: string[] }) {
		const [newId] = detail.ids;
		if (!newId) return;
		const ex = $exStore.find((e) => e.id === newId);
		workout.update((w) => ({
			...w,
			exercises: w.exercises.map((e) =>
				e.exerciseId === swapExerciseId
					? { ...e, exerciseId: newId, exerciseName: ex?.name ?? newId, note: ex?.note }
					: e
			)
		}));
		showSwap = false;
	}

	// History modal
	let historyExerciseId = '';
	let historyName = '';
	let historySets: WorkoutSet[] = [];
	let showHistory = false;
	async function openHistory(exerciseId: string, name: string) {
		historyExerciseId = exerciseId;
		historyName = name;
		historySets = await getExerciseHistory(exerciseId, name);
		showHistory = true;
	}

	// Finish workout
	let showFinishConfirm = false;
	async function finishWorkout() {
		if (!session) return;
		const finishedAt = now();
		const durationSeconds = elapsedSeconds(session.startedAt, session.pausedDurationSeconds);
		await updateSession(session.id, { status: 'complete', finishedAt, durationSeconds });
		workout.update((w) => ({ ...w, session: { ...w.session!, status: 'complete', finishedAt, durationSeconds } }));
		showCelebration = true;
	}

	// Cancel workout
	let showCancelConfirm = false;
	async function cancelWorkout() {
		if (!session) return;
		await deleteSession(session.id);
		resetWorkout();
		goto(`${base}/`);
	}

	// Celebration
	let showCelebration = false;
	$: completedSets = exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0);

	function closeCelebration() {
		showCelebration = false;
		resetWorkout();
		goto(`${base}/history`);
	}

	$: paused = !!session?.pausedAt;
	$: isPaused = paused;
</script>

{#if !session}
	<div class="page">
		<div class="empty-state">
			<p style="font-size:1.5rem">🏋️</p>
			<p>No active workout</p>
			<a href={`${base}/`} class="btn btn-primary" style="margin-top:16px">Go to Workouts</a>
		</div>
	</div>
{:else}
	<!-- Modals -->
	{#if showAddExercise}
		<ExerciseSelector title="Add Exercise" allowMultiple={true} supersetMode={true}
			on:select={(e) => handleAddExercise(e.detail)}
			on:close={() => (showAddExercise = false)}
		/>
	{/if}

	{#if showSwap}
		<ExerciseSelector title="Swap Exercise" allowMultiple={false}
			on:select={(e) => handleSwap(e.detail)}
			on:close={() => (showSwap = false)}
		/>
	{/if}

	{#if showHistory}
		<div class="modal-overlay" on:click|self={() => (showHistory = false)} role="dialog" aria-modal="true">
			<div class="modal-sheet">
				<div class="modal-header">
					<h2 class="modal-title">{historyName}</h2>
					<button class="modal-close btn-ghost" on:click={() => (showHistory = false)}>✕</button>
				</div>
				<HistoryChart sets={historySets} exerciseName={historyName} />
			</div>
		</div>
	{/if}

	{#if showFinishConfirm}
		<ConfirmModal
			title="Finish workout?"
			message="Great work! This will save your workout and end the session."
			confirmLabel="Finish"
			onConfirm={() => { showFinishConfirm = false; finishWorkout(); }}
			onCancel={() => (showFinishConfirm = false)}
		/>
	{/if}

	{#if showCancelConfirm}
		<ConfirmModal
			title="Cancel workout?"
			message="This will delete this session and all sets logged so far."
			confirmLabel="Cancel Workout"
			danger={true}
			onConfirm={() => { showCancelConfirm = false; cancelWorkout(); }}
			onCancel={() => (showCancelConfirm = false)}
		/>
	{/if}

	{#if showCelebration}
		<div class="modal-overlay" role="dialog" aria-modal="true">
			<div class="modal-centered celebrate">
				<div class="celebrate-emoji">🎉</div>
				<h2 class="celebrate-title">Workout Complete!</h2>
				<p class="celebrate-sub">
					{completedSets} set{completedSets !== 1 ? 's' : ''} logged ·
					{formatDuration(session.durationSeconds ?? 0)}
				</p>
				<button class="btn btn-primary" style="width:100%;margin-top:16px" on:click={closeCelebration}>
					View History
				</button>
			</div>
		</div>
	{/if}

	<div class="page">
		<!-- Header -->
		<div class="workout-header">
			<div class="workout-title-row">
				<h1 class="workout-name">{session.templateName ?? 'Workout'}</h1>
				<div class="timer" class:paused={isPaused}>{formatTimer(elapsed)}</div>
			</div>
		<div class="workout-controls">
			<button class="btn btn-secondary" on:click={togglePause}>
				{isPaused ? '▶ Resume' : '⏸ Pause'}
			</button>
			<button class="btn btn-secondary" on:click={() => (showCancelConfirm = true)}>✕ Cancel</button>
		</div>
		</div>

		<RestTimer />

		<!-- Exercises -->
		{#each exercises as exercise, i (exercise.exerciseId)}
			<ExerciseBlock
				{exercise}
				exerciseIndex={i}
				sessionId={session.id}
				supersetLabel={supersetLabels[i]}
				onSwap={openSwap}
				onShowHistory={openHistory}
			/>
		{/each}

		<button class="btn btn-secondary add-ex" on:click={() => (showAddExercise = true)}>
			+ Add Exercise
		</button>

		<button class="btn btn-primary finish-btn" on:click={() => (showFinishConfirm = true)}>
			✓ Finish Workout
		</button>
	</div>
{/if}

<style>
	.workout-header { margin-bottom: 16px; }
	.workout-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
	.workout-name { font-size: 1.3rem; font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.timer { font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--accent); flex-shrink: 0; padding-left: 12px; }
	.timer.paused { color: var(--text-3); }
	.workout-controls { display: flex; gap: 8px; }
	.workout-controls .btn { flex: 1; padding: 8px 10px; font-size: 0.82rem; }
	.add-ex { width: 100%; margin-top: 4px; }
	.finish-btn { width: 100%; margin-top: 24px; padding: 14px; font-size: 1rem; }

	.celebrate { text-align: center; }
	.celebrate-emoji { font-size: 3rem; margin-bottom: 8px; }
	.celebrate-title { font-size: 1.4rem; font-weight: 700; }
	.celebrate-sub { color: var(--text-2); margin-top: 6px; }
</style>
