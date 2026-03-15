<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ActiveExercise } from '$lib/stores/workout.js';
	import type { WorkoutSet } from '$lib/db/schema.js';
	import { workout } from '$lib/stores/workout.js';
	import SetRow from './SetRow.svelte';
	import { addSet, deleteSet, updateSet } from '$lib/db/sessions.js';
	import { getPreviousSetForExercise } from '$lib/db/exercises.js';
	import { now } from '$lib/db/index.js';
	import { showToast } from '$lib/stores/toasts.js';

	export let exercise: ActiveExercise;
	export let exerciseIndex: number;
	export let sessionId: string;
	export let supersetLabel: string | null = null;
	export let onSwap: (exerciseId: string) => void;
	export let onShowHistory: (exerciseId: string, name: string) => void;

	const dispatch = createEventDispatcher<{ reorderStart: { index: number; mode: 'touch' | 'pointer'; pointerType?: string } }>();

	function autoFocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	let previousSets: Record<number, WorkoutSet | null> = {};
	let savingSetIndexes = new Set<number>();
	let carryForwardSuggestion: { setIndex: number; weight?: number; reps: number } | null = null;
	let editingRest = false;
	let restInput = '';

	function startEditRest() {
		restInput = String(restSeconds);
		editingRest = true;
	}

	function commitRestEdit() {
		const val = Math.max(1, Math.trunc(Number(restInput)));
		if (Number.isFinite(val)) {
			workout.update((w) => {
				const exs = [...w.exercises];
				const ex = exs[exerciseIndex];
				if (!ex) return w;
				exs[exerciseIndex] = {
					...ex,
					templateItem: ex.templateItem
						? { ...ex.templateItem, restSeconds: val }
						: undefined
				};
				return { ...w, exercises: exs };
			});
		}
		editingRest = false;
	}

	function handleRestKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitRestEdit();
		if (e.key === 'Escape') editingRest = false;
	}

	async function loadPrevious() {
		const count = Math.max(exercise.sets.length + 1, exercise.templateItem?.sets ?? 0);
		for (let i = 1; i <= count; i++) {
			previousSets[i] = await getPreviousSetForExercise(exercise.exerciseId, i, exercise.exerciseName);
		}
		previousSets = previousSets;
	}

	$: exercise, loadPrevious();

	$: restSeconds = (() => {
		const raw = Number(exercise.templateItem?.restSeconds);
		if (!Number.isFinite(raw) || raw <= 0) return 90;
		return Math.floor(raw);
	})();
	$: suggestedSets = exercise.templateItem?.sets;
	$: suggestedReps = exercise.templateItem?.reps;

	$: isLastInSuperset = (() => {
		const w = $workout;
		const supersetId = exercise.templateItem?.supersetId;
		if (!supersetId) return true;
		const inSuperset = w.exercises
			.map((ex, i) => ({ i }))
			.filter(({ i }) => w.exercises[i].templateItem?.supersetId === supersetId);
		const maxIdx = inSuperset.length ? Math.max(...inSuperset.map(({ i }) => i)) : -1;
		return exerciseIndex === maxIdx;
	})();

	function addSetRow() {
		const nextNum = exercise.sets.length + 1;
		workout.update((w) => {
			const exs = [...w.exercises];
			exs[exerciseIndex] = { ...exs[exerciseIndex], sets: [...exs[exerciseIndex].sets, { setNumber: nextNum, completed: false }] };
			return { ...w, exercises: exs };
		});
	}

	async function handleComplete(setIndex: number, detail: { weight: number | undefined; reps: number }) {
		if (savingSetIndexes.has(setIndex)) return;
		const completedAt = now();
		const existingSet = exercise.sets[setIndex];
		const setNumber = existingSet.setNumber;
		const isEdit = Boolean(existingSet?.id);
		const normalizedWeight = Number.isFinite(detail.weight) ? detail.weight : undefined;
		const normalizedReps = Math.max(1, Math.trunc(detail.reps));

		savingSetIndexes = new Set([...savingSetIndexes, setIndex]);
		try {
			const saved = isEdit && existingSet?.id
				? await updateSet(existingSet.id, {
					weight: normalizedWeight,
					reps: normalizedReps,
					completedAt: existingSet.completedAt ?? completedAt
				})
				: await addSet({
					sessionId,
					exerciseId: exercise.exerciseId,
					exerciseName: exercise.exerciseName,
					setNumber,
					weight: normalizedWeight,
					reps: normalizedReps,
					completedAt
				});
			workout.update((w) => {
				const exs = [...w.exercises];
				const targetExercise = exs[exerciseIndex];
				if (!targetExercise) return w;
				const sets = [...targetExercise.sets];
				const currentSet = sets[setIndex];
				if (!currentSet) return w;
				sets[setIndex] = {
					...currentSet,
					id: saved.id,
					weight: normalizedWeight,
					reps: normalizedReps,
					completed: true,
					completedAt: saved.completedAt
				};
				exs[exerciseIndex] = { ...targetExercise, sets };
				carryForwardSuggestion = {
					setIndex,
					weight: normalizedWeight,
					reps: normalizedReps
				};

				if (isEdit) {
					return {
						...w,
						exercises: exs
					};
				}

				const supersetId = exercise.templateItem?.supersetId;
				const isLastInSuperset = !supersetId || (() => {
					const inSuperset = w.exercises
						.map((ex, i) => ({ i }))
						.filter(({ i }) => w.exercises[i].templateItem?.supersetId === supersetId);
					const maxIdx = inSuperset.length ? Math.max(...inSuperset.map(({ i }) => i)) : -1;
					return exerciseIndex === maxIdx;
				})();
				const restTimer = isLastInSuperset
					? { active: true, targetEndMs: Date.now() + restSeconds * 1000, durationSeconds: restSeconds }
					: w.restTimer;

				const allSetsComplete = sets.every((s) => s.completed);
				const nextBannerIndex =
					allSetsComplete && exerciseIndex < exs.length - 1 ? exerciseIndex + 1 : exerciseIndex;

				return {
					...w,
					exercises: exs,
					currentExerciseIndex: nextBannerIndex,
					restTimer
				};
			});
			showToast(isEdit ? 'Set updated ✓' : 'Set saved locally ✓', 'success');
		} catch (err) {
			console.error('Failed to save set', err);
			const message = err instanceof Error ? err.message : String(err);
			showToast(`Could not save set: ${message}`, 'error', 4500);
		} finally {
			const next = new Set(savingSetIndexes);
			next.delete(setIndex);
			savingSetIndexes = next;
		}
	}

	async function handleDelete(setIndex: number) {
		const s = exercise.sets[setIndex];
		if (s.id) await deleteSet(s.id);
		workout.update((w) => {
			const exs = [...w.exercises];
			const sets = exs[exerciseIndex].sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
			exs[exerciseIndex] = { ...exs[exerciseIndex], sets };
			return { ...w, exercises: exs };
		});
	}
</script>

<div class="ex-block" class:superset={supersetLabel !== null}>
	{#if supersetLabel}
		<span class="ss-badge badge badge-accent">{supersetLabel}</span>
	{/if}

	<div class="ex-header">
		<button
			class="drag-handle"
			on:pointerdown={(e) => dispatch('reorderStart', { index: exerciseIndex, mode: 'pointer', pointerType: e.pointerType })}
			on:touchstart|preventDefault|nonpassive={(e) => dispatch('reorderStart', { index: exerciseIndex, mode: 'touch' })}
			title="Drag to reorder"
		>⠿</button>
		<div class="ex-info">
			<h3 class="ex-name">{exercise.exerciseName}</h3>
			<div class="ex-meta">
				{#if suggestedSets}<span>{suggestedSets} sets</span>{/if}
				{#if suggestedReps}<span>· {suggestedReps} reps</span>{/if}
				{#if restSeconds}
					<span>·</span>
					{#if editingRest}
						<span class="rest-edit" on:click|stopPropagation>
							<input
								class="rest-input"
								type="number"
								inputmode="numeric"
								bind:value={restInput}
								on:blur={commitRestEdit}
								on:keydown={handleRestKeydown}
								use:autoFocus
							/>
							<span class="rest-unit">s</span>
						</span>
					{:else}
						<button class="rest-btn" on:click={startEditRest}>{restSeconds}s rest</button>
					{/if}
				{/if}
			</div>
		</div>
		<div class="ex-actions">
			<button class="btn btn-ghost ex-action-btn" on:click={() => onSwap(exercise.exerciseId)}>Swap</button>
			<button class="btn-hist" on:click={() => onShowHistory(exercise.exerciseId, exercise.exerciseName)} title="View history">History</button>
		</div>
	</div>
	{#if exercise.note}
		<p class="ex-note">{exercise.note}</p>
	{/if}

	<div class="sets-list">
		{#each exercise.sets as set, i (set.setNumber)}
			{@const carryForwardWeight = carryForwardSuggestion && i > carryForwardSuggestion.setIndex ? carryForwardSuggestion.weight : undefined}
			{@const carryForwardReps = carryForwardSuggestion && i > carryForwardSuggestion.setIndex ? carryForwardSuggestion.reps : undefined}
			<SetRow
				{set}
				previousWeight={previousSets[set.setNumber]?.weight}
				previousReps={previousSets[set.setNumber]?.reps}
				suggestedWeight={set.completed ? undefined : (carryForwardWeight ?? previousSets[set.setNumber]?.weight)}
				suggestedReps={set.completed ? undefined : (carryForwardReps ?? previousSets[set.setNumber]?.reps)}
				showCompleteAsArrow={!isLastInSuperset}
				on:complete={(e) => handleComplete(i, e.detail)}
				on:delete={() => handleDelete(i)}
			/>
		{/each}
	</div>

	<button class="add-set btn btn-secondary" on:click={addSetRow}>+ Add Set</button>
</div>

<style>
	.ex-block {
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 14px;
		margin-bottom: 12px;
		position: relative;
	}
	.ex-block.superset { border-left: 3px solid var(--accent); }
	.ss-badge { position: absolute; top: -10px; left: 12px; }
	.ex-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 2px; }
	.ex-info { flex: 1; min-width: 0; }
	.ex-name { font-size: 1rem; font-weight: 600; line-height: 1.25; }
	.ex-note { font-size: 0.78rem; color: var(--text-3); margin: 0; width: 100%; line-height: 1.3; }
	.ex-meta { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; font-size: 0.76rem; color: var(--text-3); margin-top: 2px; line-height: 1.2; }
	.ex-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
	.ex-action-btn { font-size: 0.82rem; padding: 4px 8px; line-height: 1.2; }
	.btn-hist {
		font-size: 0.74rem;
		padding: 2px 8px;
		line-height: 1.2;
		border: 1px solid var(--border);
		border-radius: 999px;
		color: var(--text-2);
		background: var(--bg-3);
	}
	.sets-list { margin-bottom: 10px; }
	.add-set { width: 100%; padding: 8px; font-size: 0.85rem; }
	.rest-btn {
		background: none;
		border: none;
		border-bottom: 1px dashed var(--text-3);
		color: var(--text-3);
		font-size: inherit;
		padding: 0;
		cursor: pointer;
		line-height: inherit;
	}
	.rest-edit {
		display: inline-flex;
		align-items: center;
		gap: 1px;
	}
	.rest-input {
		width: 3.2em;
		font-size: inherit;
		padding: 1px 3px;
		border: 1px solid var(--accent);
		border-radius: 4px;
		background: var(--bg-1);
		color: var(--text-1);
		text-align: center;
		-moz-appearance: textfield;
	}
	.rest-input::-webkit-inner-spin-button,
	.rest-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
	.rest-unit { color: var(--text-3); }
	.drag-handle {
		touch-action: none;
		padding: 6px 10px;
		font-size: 1.1rem;
		line-height: 1;
		margin-right: 6px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg-3);
	}
</style>
