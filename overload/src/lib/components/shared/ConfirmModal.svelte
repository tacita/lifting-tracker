<script lang="ts">
	export let title = 'Are you sure?';
	export let message = '';
	export let confirmLabel = 'Confirm';
	export let cancelLabel = 'Cancel';
	export let danger = false;
	export let onConfirm: () => void;
	export let onCancel: () => void;
</script>

<div class="modal-overlay" on:click|self={onCancel} role="dialog" aria-modal="true">
	<div class="modal-centered">
		<h2 class="modal-title">{title}</h2>
		{#if message}<p class="msg">{message}</p>{/if}
		<div class="modal-actions">
			<button class="btn btn-secondary" on:click={onCancel}>{cancelLabel}</button>
			<button class="btn" class:btn-danger={danger} class:btn-primary={!danger} on:click={onConfirm}>
				{confirmLabel}
			</button>
		</div>
	</div>
</div>

<style>
	.msg { color: var(--text-2); font-size: 0.9rem; margin-top: 8px; line-height: 1.5; }
</style>
