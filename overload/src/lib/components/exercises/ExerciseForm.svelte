<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Exercise } from '$lib/db/schema.js';
	import { addExercise, updateExercise } from '$lib/db/exercises.js';
	import { refreshExercises } from '$lib/stores/data.js';
	import { showToast } from '$lib/stores/toasts.js';

	export let exercise: Exercise | null = null;

	const dispatch = createEventDispatcher<{ saved: Exercise; cancel: void }>();

	let name = exercise?.name ?? '';
	let note = exercise?.note ?? '';
	let defaultReps = exercise?.defaultReps ?? '';
	let defaultWeight = exercise?.defaultWeight != null ? String(exercise.defaultWeight) : '';
	let defaultRestSeconds = exercise?.defaultRestSeconds != null ? String(exercise.defaultRestSeconds) : '90';
	let defaultSets = exercise?.defaultSets != null ? String(exercise.defaultSets) : '';
	let saving = false;
	let nameError = '';

	async function handleSave() {
		nameError = '';
		if (!name.trim()) { nameError = 'Name is required'; return; }
		saving = true;
		try {
			const data = {
				name: name.trim(),
				note: note.trim() || undefined,
				defaultReps: defaultReps.trim() || undefined,
				defaultWeight: defaultWeight ? parseFloat(defaultWeight) : undefined,
				defaultRestSeconds: defaultRestSeconds ? parseInt(defaultRestSeconds) : 90,
				defaultSets: defaultSets ? parseInt(defaultSets) : undefined
			};
			const saved = exercise ? await updateExercise(exercise.id, data) : await addExercise(data);
			await refreshExercises();
			showToast(exercise ? 'Exercise updated' : 'Exercise added', 'success');
			dispatch('saved', saved);
		} catch { showToast('Error saving exercise', 'error'); }
		finally { saving = false; }
	}
</script>

<form on:submit|preventDefault={handleSave}>
	<div class="form-row">
		<label class="label" for="ex-name">Exercise Name *</label>
		<input id="ex-name" type="text" bind:value={name} placeholder="e.g. Squat" autocomplete="off" />
		{#if nameError}<p class="hint" style="color:var(--danger)">{nameError}</p>{/if}
	</div>
	<div class="form-row">
		<label class="label" for="ex-note">Note</label>
		<textarea id="ex-note" bind:value={note} rows="2" placeholder="Optional cue or description"></textarea>
	</div>
	<div class="form-row-inline">
		<div>
			<label class="label" for="ex-sets">Default Sets</label>
			<input id="ex-sets" type="number" inputmode="numeric" bind:value={defaultSets} placeholder="3" />
		</div>
		<div>
			<label class="label" for="ex-reps">Default Reps</label>
			<input id="ex-reps" type="text" bind:value={defaultReps} placeholder="15" />
		</div>
	</div>
	<div class="form-row-inline">
		<div>
			<label class="label" for="ex-weight">Default Weight (lbs)</label>
			<input id="ex-weight" type="number" inputmode="decimal" bind:value={defaultWeight} placeholder="0" />
		</div>
		<div>
			<label class="label" for="ex-rest">Rest Time (s)</label>
			<input id="ex-rest" type="number" inputmode="numeric" bind:value={defaultRestSeconds} placeholder="90" />
		</div>
	</div>
	<div class="modal-actions">
		<button type="button" class="btn btn-secondary" on:click={() => dispatch('cancel')}>Cancel</button>
		<button type="submit" class="btn btn-primary" disabled={saving}>
			{saving ? 'Saving…' : exercise ? 'Save Changes' : 'Add Exercise'}
		</button>
	</div>
</form>
