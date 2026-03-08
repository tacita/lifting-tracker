<script lang="ts">
	import { onMount } from 'svelte';
	import { exercises as exStore, refreshExercises } from '$lib/stores/data.js';
	import { deleteExercise, getExerciseHistory } from '$lib/db/exercises.js';
	import { getDB } from '$lib/db/index.js';
	import type { Exercise, WorkoutSet } from '$lib/db/schema.js';
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';
	import ConfirmModal from '$lib/components/shared/ConfirmModal.svelte';
	import HistoryChart from '$lib/components/shared/HistoryChart.svelte';
	import { showToast } from '$lib/stores/toasts.js';

	let search = '';
	let editingExercise: Exercise | null = null;
	let showForm = false;
	let historyEx: { id: string; name: string; sets: WorkoutSet[] } | null = null;
	let deleteTarget: Exercise | null = null;
	let idsWithHistory = new Set<string>();
	let namesWithHistory = new Set<string>();
	let historyVisibleIds = new Set<string>();

	$: filtered = $exStore.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
	$: historyVisibleIds = new Set(
		$exStore
			.filter((e) => idsWithHistory.has(e.id) || namesWithHistory.has(normName(e.name)))
			.map((e) => e.id)
	);

	function normName(value: string | undefined): string {
		return String(value ?? '').trim().toLowerCase();
	}

	async function loadHistoryAvailability() {
		const db = await getDB();
		const sets = await db.getAll('sets');
		const idSet = new Set<string>();
		const nameSet = new Set<string>();
		for (const s of sets) {
			if (s.reps <= 0) continue;
			idSet.add(s.exerciseId);
			nameSet.add(normName(s.exerciseName));
		}
		idsWithHistory = idSet;
		namesWithHistory = nameSet;
	}

	onMount(() => {
		void loadHistoryAvailability();
	});

	async function openHistory(ex: Exercise) {
		const sets = await getExerciseHistory(ex.id, ex.name);
		historyEx = { id: ex.id, name: ex.name, sets };
	}

	function openEdit(ex: Exercise) {
		editingExercise = ex;
		showForm = true;
	}

	function openNew() {
		editingExercise = null;
		showForm = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		await deleteExercise(deleteTarget.id);
		await refreshExercises();
		showToast('Exercise deleted', 'info');
		deleteTarget = null;
	}
</script>

{#if showForm}
	<div class="modal-overlay" on:click|self={() => (showForm = false)} role="dialog" aria-modal="true">
		<div class="modal-sheet">
			<div class="modal-header">
				<h2 class="modal-title">{editingExercise ? 'Edit Exercise' : 'New Exercise'}</h2>
				<button class="modal-close btn-ghost" on:click={() => (showForm = false)}>✕</button>
			</div>
			<ExerciseForm
				exercise={editingExercise}
				on:saved={() => (showForm = false)}
				on:cancel={() => (showForm = false)}
			/>
		</div>
	</div>
{/if}

{#if historyEx}
	<div class="modal-overlay" on:click|self={() => (historyEx = null)} role="dialog" aria-modal="true">
		<div class="modal-sheet">
			<div class="modal-header">
				<h2 class="modal-title">{historyEx.name}</h2>
				<button class="modal-close btn-ghost" on:click={() => (historyEx = null)}>✕</button>
			</div>
			<HistoryChart sets={historyEx.sets} exerciseName={historyEx.name} />
		</div>
	</div>
{/if}

{#if deleteTarget}
	<ConfirmModal
		title="Delete exercise?"
		message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
		danger={true}
		confirmLabel="Delete"
		onConfirm={confirmDelete}
		onCancel={() => (deleteTarget = null)}
	/>
{/if}

<div class="page">
	<div class="page-header">
		<h1 class="page-title">Library</h1>
		<button class="btn btn-primary" on:click={openNew}>+ New</button>
	</div>

	<input type="search" placeholder="Search exercises…" bind:value={search} style="margin-bottom:14px" />

	{#if filtered.length === 0}
		<div class="empty-state">
			<p style="font-size:1.5rem">📚</p>
			<p>{search ? `No results for "${search}"` : 'No exercises yet'}</p>
		</div>
	{:else}
		<div class="ex-list">
			{#each filtered as ex (ex.id)}
				<div class="ex-card card">
					<div class="ex-top">
						<div class="ex-info">
							<span class="ex-name">{ex.name}</span>
							{#if ex.note}<span class="ex-note">{ex.note}</span>{/if}
							<div class="ex-meta">
								{#if ex.defaultSets}<span>{ex.defaultSets} sets</span>{/if}
								{#if ex.defaultReps}<span>· {ex.defaultReps} reps</span>{/if}
								{#if ex.defaultRestSeconds}<span>· {ex.defaultRestSeconds}s rest</span>{/if}
								{#if ex.defaultWeight}<span>· {ex.defaultWeight} lbs</span>{/if}
							</div>
						</div>
						<div class="ex-actions">
							{#if historyVisibleIds.has(ex.id)}
								<button class="btn btn-ghost" style="font-size:0.9rem;padding:4px 8px" on:click={() => openHistory(ex)} title="History">📈</button>
							{/if}
							<button class="btn btn-ghost" style="font-size:0.85rem;padding:4px 8px" on:click={() => openEdit(ex)}>Edit</button>
							<button class="btn btn-ghost" style="font-size:0.85rem;padding:4px 8px;color:var(--danger)" on:click={() => (deleteTarget = ex)}>✕</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.ex-list { display: flex; flex-direction: column; gap: 8px; }
	.ex-card { padding: 12px 14px; }
	.ex-top { display: flex; align-items: flex-start; gap: 8px; }
	.ex-info { flex: 1; min-width: 0; }
	.ex-name { font-size: 0.95rem; font-weight: 600; display: block; }
	.ex-note { font-size: 0.78rem; color: var(--text-3); display: block; margin-top: 2px; }
	.ex-meta { display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.75rem; color: var(--text-3); margin-top: 4px; }
	.ex-actions { display: flex; gap: 2px; flex-shrink: 0; }
</style>
