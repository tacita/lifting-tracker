<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ActiveSet } from '$lib/stores/workout.js';
	import { formatWeight } from '$lib/utils/format.js';

	export let set: ActiveSet;
	export let previousWeight: number | undefined = undefined;
	export let previousReps: number | undefined = undefined;
	export let suggestedWeight: number | undefined = undefined;
	export let suggestedReps: number | undefined = undefined;
	export let showWeight = true;
	/** When true, show → instead of ✓ on the complete button (e.g. next exercise in superset before rest) */
	export let showCompleteAsArrow = false;

	const dispatch = createEventDispatcher<{
		complete: { weight: number | undefined; reps: number };
		delete: void;
	}>();

	let lastSetStateKey = '';
	let weightInput: string | number = '';
	let repsInput: string | number = '';
	let error = '';

	$: currentSetStateKey = `${set.id ?? 'new'}|${set.completed ? '1' : '0'}|${set.weight ?? ''}|${set.reps ?? ''}`;
	$: if (currentSetStateKey !== lastSetStateKey) {
		lastSetStateKey = currentSetStateKey;
		error = '';
		if (set.completed) {
			weightInput = formatWeight(set.weight);
			repsInput = set.reps ? String(set.reps) : '';
		} else {
			weightInput = '';
			repsInput = '';
		}
	}

	$: suggestedWeightDisplay = suggestedWeight !== undefined ? formatWeight(suggestedWeight) : '';
	$: suggestedRepsDisplay = suggestedReps !== undefined ? String(suggestedReps) : '';

	$: previousDisplay = (() => {
		const weight = previousWeight !== undefined ? formatWeight(previousWeight) : '-';
		const reps = previousReps !== undefined ? String(previousReps) : '-';
		return `${weight} × ${reps}`;
	})();

	function focusSelect(e: FocusEvent) {
		(e.target as HTMLInputElement).select();
	}

	function handleWeightFocus(e: FocusEvent) {
		const raw = String(weightInput ?? '').trim();
		if (!set.completed && showWeight && raw === '' && suggestedWeightDisplay) {
			weightInput = suggestedWeightDisplay;
		}
		focusSelect(e);
	}

	function handleRepsFocus(e: FocusEvent) {
		const raw = String(repsInput ?? '').trim();
		if (!set.completed && raw === '' && suggestedRepsDisplay) {
			repsInput = suggestedRepsDisplay;
		}
		focusSelect(e);
	}

	function handleComplete() {
		error = '';
		const repsRaw = String(repsInput ?? '').trim();
		const repsTyped = repsRaw !== '' ? parseInt(repsRaw, 10) : undefined;
		const repsFallback = set.completed ? set.reps : (suggestedReps ?? previousReps);
		const repsVal = repsTyped ?? repsFallback;
		if (!repsVal || repsVal <= 0) {
			error = previousReps && previousReps > 0 ? 'Enter reps' : 'Enter reps (no previous value)';
			return;
		}

		const weightRaw = String(weightInput ?? '').trim();
		const weightTyped = showWeight && weightRaw !== '' ? parseFloat(weightRaw) : undefined;
		const weightFallback = set.completed ? set.weight : (suggestedWeight ?? previousWeight);
		const weightVal = showWeight ? (weightTyped ?? weightFallback) : undefined;
		dispatch('complete', { weight: weightVal, reps: repsVal });
	}

</script>

<div class="set-row" class:done={set.completed} class:no-weight={!showWeight}>
	<span class="set-num">{set.setNumber}:</span>
	<span class="prev-val" title="Previous set">{previousDisplay}</span>

	{#if showWeight}
		<div class="inp-wrap">
			<input
				type="text" inputmode="decimal" autocomplete="off"
				placeholder={suggestedWeightDisplay}
				bind:value={weightInput}
				on:focus={handleWeightFocus}
				aria-label="Weight lbs"
			/>
			<span class="unit">lbs</span>
		</div>
	{/if}

	<div class="inp-wrap">
		<input
			type="text" inputmode="numeric" autocomplete="off"
			placeholder={suggestedRepsDisplay}
			bind:value={repsInput}
			on:focus={handleRepsFocus}
			aria-label="Reps"
		/>
		<span class="unit">reps</span>
	</div>

	<button class="btn-check" class:btn-check-arrow={!set.completed && showCompleteAsArrow} class:btn-check-done={set.completed} on:click={handleComplete} aria-label={set.completed ? 'Update set' : (showCompleteAsArrow ? 'Complete set, go to next' : 'Complete set')}>
		{!set.completed && showCompleteAsArrow ? '→' : '✓'}
	</button>

	<button class="btn-del" on:click={() => dispatch('delete')} aria-label="Delete set">✕</button>

	{#if error}<p class="set-err">{error}</p>{/if}
</div>

<style>
	.set-row {
		display: grid;
		grid-template-columns: 28px 64px minmax(0, 1fr) minmax(0, 1fr) 34px 22px;
		align-items: center;
		gap: 6px;
		padding: 8px 0;
		border-bottom: 1px solid var(--border);
	}
	.set-row.done {
		opacity: 0.95;
		background: rgba(74, 222, 128, 0.08);
		border-radius: var(--radius-sm);
	}
	.set-num { font-size: 0.78rem; color: var(--text-3); font-variant-numeric: tabular-nums; }
	.prev-val {
		font-size: 0.82rem;
		color: var(--text-2);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.inp-wrap { position: relative; }
	.inp-wrap input { padding: 8px 26px 8px 8px; text-align: center; font-variant-numeric: tabular-nums; }
	.inp-wrap input::placeholder {
		color: var(--text-2);
		-webkit-text-fill-color: var(--text-2);
		font-style: italic;
		opacity: 1;
	}
	.unit { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); font-size: 0.65rem; color: var(--text-3); pointer-events: none; }
	.btn-check { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-dim); font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; }
	.btn-check.btn-check-arrow {
		color: #5dd9c8;
		border-color: rgba(93, 217, 200, 0.6);
		background: rgba(93, 217, 200, 0.12);
	}
	.btn-check.btn-check-done {
		color: #fff;
		background: var(--success);
		border-color: var(--success);
		font-weight: 700;
		cursor: pointer;
		border: none;
	}
	.btn-del { color: var(--text-3); font-size: 0.7rem; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
	.set-err { grid-column: 1 / -1; font-size: 0.78rem; color: var(--danger); padding-top: 2px; }

	@media (max-width: 430px) {
		.set-row {
			grid-template-columns: 24px minmax(0, 1fr) 63px 63px 30px 20px;
			gap: 4px;
			padding: 5px 0;
		}
		.set-row.no-weight {
			grid-template-columns: 24px minmax(0, 1fr) 130px 30px 20px;
		}
		.inp-wrap input {
			padding: 5px 22px 5px 6px;
			font-size: 0.92rem;
		}
		.unit { font-size: 0.62rem; }
	}
</style>
