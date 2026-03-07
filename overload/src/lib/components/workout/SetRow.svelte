<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ActiveSet } from '$lib/stores/workout.js';
	import { formatWeight } from '$lib/utils/format.js';

	export let set: ActiveSet;
	export let previousWeight: number | undefined = undefined;
	export let previousReps: number | undefined = undefined;
	export let showWeight = true;

	const dispatch = createEventDispatcher<{
		complete: { weight: number | undefined; reps: number };
		delete: void;
	}>();

	let weightInput = set.completed ? formatWeight(set.weight) : '';
	let repsInput = set.completed ? (set.reps ? String(set.reps) : '') : '';
	let error = '';
	$: previousDisplay = (() => {
		const weight = previousWeight !== undefined ? formatWeight(previousWeight) : '-';
		const reps = previousReps !== undefined ? String(previousReps) : '-';
		return `${weight}×${reps}`;
	})();

	function focusSelect(e: FocusEvent) { (e.target as HTMLInputElement).select(); }

	function handleComplete() {
		error = '';
		const repsRaw = repsInput.trim();
		const repsVal = repsRaw !== '' ? parseInt(repsRaw) : previousReps;
		if (!repsVal || repsVal <= 0) { error = 'Enter reps'; return; }
		const weightVal = showWeight
			? (weightInput.trim() !== '' ? parseFloat(weightInput) : previousWeight)
			: undefined;
		dispatch('complete', { weight: weightVal, reps: repsVal });
	}
</script>

<div class="set-row" class:done={set.completed}>
	<span class="set-num">S{set.setNumber}</span>
	<span class="prev-val" title="Previous set">{previousDisplay}</span>

	{#if showWeight}
		<div class="inp-wrap">
			<input
				type="number" inputmode="decimal"
				placeholder={previousWeight !== undefined ? formatWeight(previousWeight) : '—'}
				bind:value={weightInput}
				on:focus={focusSelect}
				disabled={set.completed}
				aria-label="Weight lbs"
			/>
			<span class="unit">lbs</span>
		</div>
	{/if}

	<div class="inp-wrap">
		<input
			type="number" inputmode="numeric"
			placeholder={previousReps !== undefined ? String(previousReps) : '—'}
			bind:value={repsInput}
			on:focus={focusSelect}
			disabled={set.completed}
			aria-label="Reps"
		/>
		<span class="unit">reps</span>
	</div>

	{#if !set.completed}
		<button class="btn-check" on:click={handleComplete} aria-label="Complete set">✓</button>
	{:else}
		<span class="check-done">✓</span>
	{/if}

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
	.set-row.done { opacity: 0.5; }
	.set-num { font-size: 0.78rem; color: var(--text-3); font-variant-numeric: tabular-nums; }
	.prev-val {
		font-size: 0.72rem;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.inp-wrap { position: relative; }
	.inp-wrap input { padding: 8px 26px 8px 8px; text-align: center; font-variant-numeric: tabular-nums; }
	.inp-wrap input:disabled { background: var(--bg-3); color: var(--text-2); }
	.unit { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); font-size: 0.65rem; color: var(--text-3); pointer-events: none; }
	.btn-check { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-dim); font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; }
	.check-done { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--success); }
	.btn-del { color: var(--text-3); font-size: 0.7rem; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
	.set-err { grid-column: 1 / -1; font-size: 0.78rem; color: var(--danger); padding-top: 2px; }

	@media (max-width: 390px) {
		.set-row {
			grid-template-columns: 24px 56px minmax(0, 1fr) minmax(0, 1fr) 30px 20px;
			gap: 4px;
		}
		.inp-wrap input {
			padding: 7px 22px 7px 6px;
			font-size: 0.92rem;
		}
		.unit { font-size: 0.62rem; }
	}
</style>
