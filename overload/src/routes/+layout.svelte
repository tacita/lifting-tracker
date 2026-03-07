<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { currentUser, authLoading } from '$lib/stores/auth.js';
	import { syncStatus } from '$lib/stores/sync.js';
	import { getCurrentUser, onAuthChange } from '$lib/sync/auth.js';
	import { pullFromCloud, syncNow } from '$lib/sync/engine.js';
	import { refreshAll } from '$lib/stores/data.js';
	import { workout } from '$lib/stores/workout.js';
	import { getDraftSession, getSetsForSession } from '$lib/db/sessions.js';
	import { getTemplateItems } from '$lib/db/templates.js';
	import { getExercises } from '$lib/db/exercises.js';
	import FloatingWidget from '$lib/components/workout/FloatingWidget.svelte';
	import Toast from '$lib/components/shared/Toast.svelte';

	let hydrating = true;

	onMount(() => {
		let authSub: { unsubscribe: () => void } | null = null;

		async function init() {
			await refreshAll();
			hydrating = false;

			// Restore any in-progress workout from IndexedDB (survives refresh + logout)
			const draft = await getDraftSession();
			if (draft && $workout.session === null) {
				const [items, exList, savedSets] = await Promise.all([
					getTemplateItems(draft.templateId ?? ''),
					getExercises(),
					getSetsForSession(draft.id)
				]);
				const exMap = new Map(exList.map((e) => [e.id, e]));
				const exIds = [...new Set(items.map((ti) => ti.exerciseId))];

				workout.set({
					session: draft,
					exercises: exIds.map((exId) => {
						const ex = exMap.get(exId);
						const item = items.find((ti) => ti.exerciseId === exId);
						const mySets = savedSets.filter((s) => s.exerciseId === exId);
						const totalRows = Math.max(mySets.length + 1, item?.sets ?? 1);
						return {
							exerciseId: exId,
							exerciseName: ex?.name ?? exId,
							note: ex?.note,
							templateItem: item,
							sets: Array.from({ length: totalRows }, (_, idx) => {
								const saved = mySets.find((s) => s.setNumber === idx + 1);
								return saved
									? { id: saved.id, setNumber: idx + 1, weight: saved.weight, reps: saved.reps, completed: true, completedAt: saved.completedAt }
									: { setNumber: idx + 1, completed: false };
							})
						};
					}),
					currentExerciseIndex: 0,
					restTimer: { active: false, targetEndMs: null, durationSeconds: 90 },
					timerPausedAt: null,
					pausedDurationMs: (draft.pausedDurationSeconds ?? 0) * 1000
				});
			}

			// Resolve current user first to avoid auth flicker/redirect loops on mobile Safari.
			const initialUser = await getCurrentUser();
			currentUser.set(initialUser);
			authLoading.set(false);
			if (initialUser) {
				pullFromCloud(initialUser.id).then(() => refreshAll()).catch(console.warn);
			}

			// Auth subscription
			authSub = onAuthChange((user, event) => {
				if (event === 'SIGNED_OUT') {
					currentUser.set(null);
					return;
				}

				if (user) {
					currentUser.set(user);
					pullFromCloud(user.id).then(() => refreshAll()).catch(console.warn);
					return;
				}

				// Ignore transient null callbacks if we already have a logged-in user.
				if (get(currentUser)) return;
				currentUser.set(null);
			});
		}

		init().catch(console.error);

		// Register service worker
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register(`${base}/service-worker.js`, { type: 'module' }).catch(console.warn);
		}

		return () => authSub?.unsubscribe();
	});

	$: path = $page.url.pathname;
	$: sync = $syncStatus;
	$: syncIcon = sync.status === 'syncing' ? '⟳' : sync.status === 'error' ? '✗' : sync.status === 'ok' ? '✓' : '';
	$: syncColor = sync.status === 'error' ? 'var(--danger)' : sync.status === 'ok' ? 'var(--success)' : 'var(--text-3)';

	const nav = [
		{ href: `${base}/`,         label: 'Workouts', icon: '🏋️' },
		{ href: `${base}/library`,  label: 'Library',  icon: '📚' },
		{ href: `${base}/history`,  label: 'History',  icon: '📈' },
		{ href: `${base}/settings`, label: 'Settings', icon: '⚙️' }
	];
</script>

{#if hydrating}
	<div class="splash">
		<div class="splash-title">Overload</div>
		<div class="spinner"></div>
	</div>
{:else}
	<FloatingWidget />

	<header class="app-header">
		<span class="app-name">Overload</span>
		<div class="header-right">
			{#if syncIcon}
				<button class="sync-btn" style="color:{syncColor}" title={sync.error ?? 'Sync'} on:click={syncNow}>
					{syncIcon}
				</button>
			{/if}
			{#if $workout.session}
				<a href={`${base}/workout`} class="btn btn-primary" style="padding:6px 12px;font-size:0.82rem">Active Workout</a>
			{/if}
		</div>
	</header>

	<main>
		<slot />
	</main>

	<nav class="bottom-nav" aria-label="Main navigation">
		{#each nav as item}
			<a href={item.href} class="nav-item" class:active={path === item.href} aria-label={item.label}>
				<span class="nav-icon">{item.icon}</span>
				<span class="nav-label">{item.label}</span>
			</a>
		{/each}
	</nav>

	<Toast />
{/if}

<style>
	.splash { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100dvh; gap: 20px; }
	.splash-title { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; }
	.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.app-header { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; padding-top: calc(10px + var(--safe-top)); background: var(--bg); border-bottom: 1px solid var(--border); }
	.app-name { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; }
	.header-right { display: flex; align-items: center; gap: 10px; }
	.sync-btn { font-size: 1rem; padding: 4px; min-width: 24px; text-align: center; cursor: pointer; }

	main { min-height: calc(100dvh - 60px - var(--nav-height)); }

	.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--nav-height) + var(--safe-bottom)); padding-bottom: var(--safe-bottom); background: var(--bg); border-top: 1px solid var(--border); display: flex; align-items: center; z-index: 40; }
	.nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px 4px; color: var(--text-3); text-decoration: none; transition: color 0.15s; }
	.nav-item.active { color: var(--accent); }
	.nav-icon { font-size: 1.3rem; line-height: 1; }
	.nav-label { font-size: 0.65rem; font-weight: 500; }
</style>
