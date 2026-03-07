<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Folder, Template } from '$lib/db/schema.js';

	export let folder: Folder | null;
	export let templates: Template[];
	export let open = false;

	const dispatch = createEventDispatcher<{
		start: { templateId: string };
		edit: { template: Template };
		delete: { template: Template };
	}>();
</script>

<div class="accordion" class:open>
	<button class="header" on:click={() => (open = !open)} aria-expanded={open}>
		<span class="name">{folder?.name ?? 'No Program'}</span>
		<span class="count">{templates.length} workout{templates.length !== 1 ? 's' : ''}</span>
		<span class="chevron" class:rot={open}>›</span>
	</button>

	{#if open}
		<div class="body">
			{#each templates as tpl (tpl.id)}
				<div class="row">
					<button class="row-main" on:click={() => dispatch('start', { templateId: tpl.id })}>
						<span class="tpl-name">{tpl.name}</span>
						{#if tpl.note}<span class="tpl-note">{tpl.note}</span>{/if}
					</button>
					<div class="row-actions">
						<button class="btn btn-ghost" style="font-size:0.8rem;padding:4px 8px" on:click={() => dispatch('edit', { template: tpl })}>Edit</button>
						<button class="btn btn-ghost" style="font-size:0.8rem;padding:4px 8px;color:var(--danger)" on:click={() => dispatch('delete', { template: tpl })}>Delete</button>
					</div>
				</div>
			{:else}
				<p class="empty-folder">No workouts in this program</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	.accordion { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 10px; }
	.header { width: 100%; display: flex; align-items: center; padding: 14px 16px; gap: 8px; text-align: left; }
	.name { flex: 1; font-size: 1rem; font-weight: 600; }
	.count { font-size: 0.78rem; color: var(--text-3); }
	.chevron { color: var(--text-3); font-size: 1.1rem; transition: transform 0.2s; }
	.chevron.rot { transform: rotate(90deg); }
	.body { border-top: 1px solid var(--border); }
	.row { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); gap: 8px; }
	.row:last-child { border-bottom: none; }
	.row-main { flex: 1; text-align: left; padding: 2px 0; }
	.tpl-name { display: block; font-size: 0.95rem; font-weight: 500; }
	.tpl-note { display: block; font-size: 0.78rem; color: var(--text-3); margin-top: 2px; }
	.row-actions { display: flex; gap: 4px; flex-shrink: 0; }
	.empty-folder { padding: 16px; font-size: 0.85rem; color: var(--text-3); text-align: center; }
</style>
