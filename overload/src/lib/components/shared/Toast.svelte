<script lang="ts" context="module">
	export { showToast } from '$lib/stores/toasts.js';
</script>

<script lang="ts">
	import { toasts } from '$lib/stores/toasts.js';
</script>

<div class="toast-container" aria-live="polite">
	{#each $toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}">{toast.message}</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: calc(var(--nav-height) + var(--safe-bottom) + 12px);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 200;
		pointer-events: none;
		width: calc(100% - 32px);
		max-width: 380px;
	}
	.toast {
		padding: 12px 16px;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		font-weight: 500;
		text-align: center;
		animation: toastIn 0.2s ease;
	}
	.toast-info    { background: var(--bg-4); border: 1px solid var(--border); color: var(--text); }
	.toast-success { background: var(--success-bg); border: 1px solid var(--success); color: var(--success); }
	.toast-error   { background: var(--danger-bg); border: 1px solid var(--danger); color: var(--danger); }
	.toast-warn    { background: var(--warn-bg); border: 1px solid var(--warn); color: var(--warn); }
	@keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
