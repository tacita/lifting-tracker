<script lang="ts">
	export let templateChanged: boolean;
	export let onSave: () => void;
	export let onSaveAndUpdate: () => void;
	export let onCancel: () => void;
</script>

<div class="modal-overlay" on:click|self={onCancel} role="dialog" aria-modal="true">
	<div class="modal-centered">
		<h2 class="modal-title">Finish workout?</h2>
		{#if templateChanged}
			<p class="msg">Your exercises have changed from the template.</p>
			<div class="modal-actions stacked">
				<button class="btn btn-primary" on:click={onSaveAndUpdate}>Save & Update Template</button>
				<button class="btn btn-secondary" on:click={onSave}>Just Save Workout</button>
				<button class="btn btn-ghost" on:click={onCancel}>Cancel</button>
			</div>
		{:else}
			<p class="msg">Great work! This will save your workout and end the session.</p>
			<div class="modal-actions">
				<button class="btn btn-secondary" on:click={onCancel}>Cancel</button>
				<button class="btn btn-primary" on:click={onSave}>Finish</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.msg { color: var(--text-2); font-size: 0.9rem; margin-top: 8px; line-height: 1.5; }
	.stacked { flex-direction: column; }
</style>
