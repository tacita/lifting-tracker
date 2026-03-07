<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Template, TemplateItem } from '$lib/db/schema.js';
	import { addTemplate, updateTemplate, setTemplateItems, addFolder } from '$lib/db/templates.js';
	import { exercises as exStore, folders as foldersStore, refreshFolders, refreshTemplates, refreshTemplateItems } from '$lib/stores/data.js';
	import ExerciseSelector from '$lib/components/exercises/ExerciseSelector.svelte';
	import { showToast } from '$lib/stores/toasts.js';
	import { createId } from '$lib/db/index.js';

	export let template: Template | null = null;
	export let initialItems: TemplateItem[] = [];

	const dispatch = createEventDispatcher<{ saved: Template; cancel: void }>();

	interface DraftItem {
		exerciseId: string;
		exerciseName: string;
		sets: string;
		reps: string;
		restSeconds: string;
		supersetId?: string;
		supersetOrder?: number;
	}

	let name = template?.name ?? '';
	let note = template?.note ?? '';
	let folderId = template?.folderId ?? '';
	let newFolderName = '';
	let showNewFolder = false;
	let items: DraftItem[] = initialItems.map((ti) => ({
		exerciseId: ti.exerciseId,
		exerciseName: $exStore.find((e) => e.id === ti.exerciseId)?.name ?? ti.exerciseId,
		sets: ti.sets ? String(ti.sets) : '',
		reps: ti.reps ?? '',
		restSeconds: ti.restSeconds ? String(ti.restSeconds) : '90',
		supersetId: ti.supersetId,
		supersetOrder: ti.supersetOrder
	}));

	let showSelector = false;
	let swapIndex: number | null = null;
	let saving = false;
	let nameError = '';
	let dragIdx: number | null = null;

	function dragStart(i: number) { dragIdx = i; }
	function dragOver(i: number) {
		if (dragIdx === null || dragIdx === i) return;
		const next = [...items];
		const [moved] = next.splice(dragIdx, 1);
		next.splice(i, 0, moved);
		items = next; dragIdx = i;
	}
	function dragEnd() { dragIdx = null; }

	function handleSelect(detail: { ids: string[]; asSuperset: boolean }) {
		const { ids, asSuperset } = detail;

		if (swapIndex !== null) {
			const [newId] = ids;
			if (newId) {
				const ex = $exStore.find((e) => e.id === newId);
				items = items.map((it, j) =>
					j === swapIndex
						? { ...it, exerciseId: newId, exerciseName: ex?.name ?? newId }
						: it
				);
			}
			swapIndex = null;
			showSelector = false;
			return;
		}

		const ssId = asSuperset && ids.length > 1 ? createId() : undefined;
		const newItems: DraftItem[] = ids.map((id, i) => ({
			exerciseId: id,
			exerciseName: $exStore.find((e) => e.id === id)?.name ?? id,
			sets: '', reps: '', restSeconds: '90',
			...(ssId ? { supersetId: ssId, supersetOrder: i } : {})
		}));
		items = [...items, ...newItems];
		showSelector = false;
	}

	function openSwap(index: number) {
		swapIndex = index;
		showSelector = true;
	}

	$: groupedItems = (() => {
		const seen = new Map<string, string>();
		let code = 65;
		return items.map((it) => {
			let label: string | null = null;
			if (it.supersetId) {
				if (!seen.has(it.supersetId)) seen.set(it.supersetId, `SS ${String.fromCharCode(code++)}`);
				label = seen.get(it.supersetId) ?? null;
			}
			return { ...it, supersetLabel: label };
		});
	})();

	async function handleSave() {
		nameError = '';
		if (!name.trim()) { nameError = 'Name is required'; return; }
		saving = true;
		try {
			let fId = folderId || undefined;
			if (showNewFolder && newFolderName.trim()) {
				const f = await addFolder({ name: newFolderName.trim() });
				fId = f.id;
				await refreshFolders();
			}
			const saved = template
				? await updateTemplate(template.id, { name: name.trim(), note: note.trim() || undefined, folderId: fId })
				: await addTemplate({ name: name.trim(), note: note.trim() || undefined, folderId: fId });

			await setTemplateItems(saved.id, items.map((it, i) => ({
				exerciseId: it.exerciseId,
				sortOrder: i,
				sets: it.sets ? parseInt(it.sets) : undefined,
				reps: it.reps.trim() || undefined,
				restSeconds: it.restSeconds ? parseInt(it.restSeconds) : 90,
				supersetId: it.supersetId,
				supersetOrder: it.supersetOrder
			})));

			await refreshTemplates();
			await refreshTemplateItems(saved.id);
			showToast(template ? 'Workout updated' : 'Workout created', 'success');
			dispatch('saved', saved);
		} catch { showToast('Error saving workout', 'error'); }
		finally { saving = false; }
	}
</script>

{#if showSelector}
	<ExerciseSelector
		allowMultiple={swapIndex === null}
		supersetMode={swapIndex === null}
		title={swapIndex !== null ? 'Swap Exercise' : 'Add Exercises'}
		on:select={(e) => handleSelect(e.detail)}
		on:close={() => { showSelector = false; swapIndex = null; }}
	/>
{/if}

<form on:submit|preventDefault={handleSave}>
	<div class="form-row">
		<label class="label" for="tpl-name">Workout Name *</label>
		<input id="tpl-name" type="text" bind:value={name} placeholder="e.g. Upper Push" autocomplete="off" />
		{#if nameError}<p class="hint" style="color:var(--danger)">{nameError}</p>{/if}
	</div>
	<div class="form-row">
		<label class="label" for="tpl-note">Note</label>
		<textarea id="tpl-note" bind:value={note} rows="2" placeholder="Optional notes"></textarea>
	</div>
	<div class="form-row">
		<label class="label" for="tpl-folder">Program (Folder)</label>
		{#if !showNewFolder}
			<div style="display:flex;gap:8px">
				<select id="tpl-folder" bind:value={folderId} style="flex:1">
					<option value="">No program</option>
					{#each $foldersStore as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
				</select>
				<button type="button" class="btn btn-secondary" on:click={() => (showNewFolder = true)}>+ New</button>
			</div>
		{:else}
			<div style="display:flex;gap:8px">
				<input type="text" bind:value={newFolderName} placeholder="New program name" style="flex:1" />
				<button type="button" class="btn btn-ghost" on:click={() => (showNewFolder = false)}>✕</button>
			</div>
		{/if}
	</div>

	<div class="items-section">
		<div class="items-header">
			<span class="label" style="margin-bottom:0">Exercises</span>
			<button type="button" class="btn btn-secondary" style="padding:6px 12px;font-size:0.85rem" on:click={() => (showSelector = true)}>+ Add</button>
		</div>

		{#each groupedItems as item, i (i)}
			<div class="item" class:ss={item.supersetId}
				draggable="true"
				on:dragstart={() => dragStart(i)}
				on:dragover|preventDefault={() => dragOver(i)}
				on:dragend={dragEnd}
			>
				{#if item.supersetLabel}<span class="ss-lbl badge badge-accent">{item.supersetLabel}</span>{/if}
				<div class="item-row">
					<span class="drag-handle">⠿</span>
					<span class="item-name">{item.exerciseName}</span>
					<button type="button" class="swap-btn" on:click={() => openSwap(i)} title="Swap exercise">⇄</button>
					<button type="button" class="del-btn" on:click={() => (items = items.filter((_, j) => j !== i))}>✕</button>
				</div>
				<div class="item-fields">
					<div><label class="label">Sets</label><input type="number" inputmode="numeric" bind:value={item.sets} placeholder="3" /></div>
					<div><label class="label">Reps</label><input type="text" bind:value={item.reps} placeholder="8–10" /></div>
					<div><label class="label">Rest (s)</label><input type="number" inputmode="numeric" bind:value={item.restSeconds} placeholder="90" /></div>
				</div>
			</div>
		{:else}
			<p style="padding:24px;text-align:center;color:var(--text-3);font-size:0.9rem">No exercises yet — tap + Add</p>
		{/each}
	</div>

	<div class="modal-actions">
		<button type="button" class="btn btn-secondary" on:click={() => dispatch('cancel')}>Cancel</button>
		<button type="submit" class="btn btn-primary" disabled={saving}>
			{saving ? 'Saving…' : template ? 'Save Workout' : 'Create Workout'}
		</button>
	</div>
</form>

<style>
	.items-section { margin-top: 4px; }
	.items-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
	.item { background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 8px; }
	.item.ss { border-left: 3px solid var(--accent); }
	.ss-lbl { display: block; margin-bottom: 6px; }
	.item-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
	.item-name { flex: 1; font-size: 0.9rem; font-weight: 500; }
	.swap-btn { color: var(--text-3); font-size: 0.9rem; padding: 2px 6px; cursor: pointer; }
	.swap-btn:hover { color: var(--accent); }
	.del-btn { color: var(--text-3); font-size: 0.8rem; padding: 2px 4px; cursor: pointer; }
	.item-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
	.item-fields input { font-size: 0.85rem; padding: 6px 8px; }
</style>
