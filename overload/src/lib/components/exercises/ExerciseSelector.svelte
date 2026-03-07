<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { exercises as exercisesStore } from '$lib/stores/data.js';
	import ExerciseForm from './ExerciseForm.svelte';

	export let title = 'Select Exercises';
	export let allowMultiple = true;
	export let supersetMode = false;

	const dispatch = createEventDispatcher<{
		select: { ids: string[]; asSuperset: boolean };
		close: void;
	}>();

	let search = '';
	let creating = false;
	let selected = new Set<string>();
	let asSuperset = false;

	$: filtered = $exercisesStore.filter((e) =>
		e.name.toLowerCase().includes(search.toLowerCase())
	);

	function toggle(id: string) {
		if (!allowMultiple) { dispatch('select', { ids: [id], asSuperset: false }); return; }
		const next = new Set(selected);
		if (next.has(id)) next.delete(id); else next.add(id);
		selected = next;
	}

	function handleDone() {
		dispatch('select', { ids: [...selected], asSuperset: asSuperset && selected.size > 1 });
	}
</script>

<div class="modal-overlay" on:click|self={() => dispatch('close')} role="dialog" aria-modal="true">
	<div class="modal-sheet">
		{#if creating}
			<div class="modal-header">
				<h2 class="modal-title">New Exercise</h2>
				<button class="modal-close btn-ghost" on:click={() => (creating = false)}>✕</button>
			</div>
			<ExerciseForm on:saved={() => (creating = false)} on:cancel={() => (creating = false)} />
		{:else}
			<div class="modal-header">
				<h2 class="modal-title">{title}</h2>
				<button class="modal-close btn-ghost" on:click={() => dispatch('close')}>✕</button>
			</div>

			<div class="search-row">
				<input type="search" placeholder="Search exercises…" bind:value={search} autocomplete="off" />
				<button class="btn btn-secondary" on:click={() => (creating = true)}>+ New</button>
			</div>

			{#if allowMultiple && supersetMode}
				<label class="ss-toggle">
					<input type="checkbox" bind:checked={asSuperset} />
					<span>Add selected as superset</span>
				</label>
			{/if}

			<div class="ex-list">
				{#each filtered as ex (ex.id)}
					<button class="ex-row" class:sel={selected.has(ex.id)} on:click={() => toggle(ex.id)}>
						<span class="check">{selected.has(ex.id) ? '✓' : ''}</span>
						<span class="exname">{ex.name}</span>
						{#if ex.defaultReps || ex.defaultSets}
							<span class="exmeta">{ex.defaultSets ? ex.defaultSets + '×' : ''}{ex.defaultReps ?? ''}</span>
						{/if}
					</button>
				{:else}
					<p class="empty-state" style="padding:32px">No exercises found</p>
				{/each}
			</div>

			{#if allowMultiple && selected.size > 0}
				<div class="footer">
					<button class="btn btn-primary" on:click={handleDone}>
						Add {selected.size} exercise{selected.size > 1 ? 's' : ''}{asSuperset && selected.size > 1 ? ' (superset)' : ''}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.search-row { display: flex; gap: 8px; margin-bottom: 12px; }
	.search-row input { flex: 1; }
	.ss-toggle { display: flex; align-items: center; gap: 8px; padding: 8px 4px; font-size: 0.9rem; color: var(--text-2); margin-bottom: 8px; cursor: pointer; }
	.ex-list { overflow-y: auto; max-height: 55dvh; }
	.ex-row { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 8px; border-bottom: 1px solid var(--border); text-align: left; }
	.ex-row:active, .ex-row.sel { background: var(--accent-bg); }
	.check { width: 20px; color: var(--accent); font-weight: 700; flex-shrink: 0; }
	.exname { flex: 1; font-size: 0.95rem; }
	.exmeta { font-size: 0.78rem; color: var(--text-3); }
	.footer { padding-top: 14px; }
	.footer .btn { width: 100%; }
</style>
